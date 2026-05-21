"""Teste end-to-end: Lead → Classificação → Orçamento → Aprovação → Cadastro → Contrato → OS → Execução → Recibo."""


def test_fluxo_completo_lead_ate_recibo(client, auth_headers):
    # 1. Criar lead
    r = client.post('/api/leads', headers=auth_headers, json={
        'nome': 'Carlos Fluxo', 'telefone': '11 91111-0001',
        'email': 'carlos@fluxo.com', 'origem': 'instagram',
        'tipo_servico': 'residencial',
        'bairro_origem': 'Jardins', 'cidade_origem': 'SP',
        'bairro_destino': 'Vila Madalena', 'cidade_destino': 'SP',
    })
    assert r.status_code == 201
    lead = r.get_json()
    assert lead['status'] == 'novo'

    # 2. Classificar lead
    r = client.post(f'/api/leads/{lead["id"]}/classificar', headers=auth_headers, json={
        'classificacao': 'AA', 'justificativa': 'Alto valor, mudança complexa'
    })
    assert r.status_code == 200
    assert r.get_json()['classificacao'] == 'AA'

    # 3. Converter lead em orçamento
    r = client.post(f'/api/leads/{lead["id"]}/converter', headers=auth_headers)
    assert r.status_code == 200
    data = r.get_json()
    orc_id = data['orcamento']['id']
    assert data['orcamento']['numero'].startswith('ORC-')
    assert data['lead']['status'] == 'convertido'

    # 4. Atualizar valor do orçamento
    r = client.put(f'/api/orcamentos/{orc_id}', headers=auth_headers, json={
        'valor_servico': 8000, 'valor_seguro': 500,
        'condicoes_pagamento': '50% entrada, 50% na entrega',
        'status': 'em_negociacao'
    })
    assert r.status_code == 200

    # 5. Aprovar orçamento → cria cadastro complementar
    r = client.post(f'/api/orcamentos/{orc_id}/aprovar', headers=auth_headers)
    assert r.status_code == 200
    cadastro_id = r.get_json()['cadastro']['id']
    assert r.get_json()['orcamento']['status'] == 'aprovado'

    # 6. Completar cadastro complementar
    r = client.put(f'/api/cadastro-complementar/{cadastro_id}', headers=auth_headers, json={
        'cpf_cnpj': '987.654.321-00',
        'orig_rua': 'Alameda Santos', 'orig_numero': '1500', 'orig_bairro': 'Jardins',
        'orig_cidade': 'São Paulo', 'orig_estado': 'SP', 'orig_cep': '01419-001',
        'dest_rua': 'Rua Aspicuelta', 'dest_numero': '200', 'dest_bairro': 'Vila Madalena',
        'dest_cidade': 'São Paulo', 'dest_estado': 'SP', 'dest_cep': '05433-010',
        'data_confirmada': '2026-08-15T08:00:00',
        'dados_para_contrato': 'Mudança de apartamento, 3 quartos.',
    })
    assert r.status_code == 200
    assert r.get_json()['status'] == 'completo'

    # 7. Gerar contrato do cadastro
    r = client.post(f'/api/cadastro-complementar/{cadastro_id}/gerar-contrato',
                    headers=auth_headers)
    assert r.status_code == 201
    contrato = r.get_json()
    contrato_id = contrato['id']
    assert contrato['numero'].startswith('CON-')
    assert contrato['status'] == 'rascunho'

    # 8. Confirmar contrato (enviado)
    r = client.put(f'/api/contratos/{contrato_id}', headers=auth_headers,
                   json={'status': 'enviado'})
    assert r.status_code == 200

    # 9. Gerar OS do contrato
    r = client.post(f'/api/contratos/{contrato_id}/gerar-os', headers=auth_headers)
    assert r.status_code == 201
    os_ = r.get_json()
    os_id = os_['id']
    assert os_['numero'].startswith('OS-')
    assert os_['status'] == 'agendada'

    # 10. Iniciar OS
    r = client.post(f'/api/os/{os_id}/iniciar', headers=auth_headers)
    assert r.status_code == 200
    assert r.get_json()['status'] == 'em_andamento'

    # 11. Concluir OS → gera recibo automaticamente
    r = client.post(f'/api/os/{os_id}/concluir', headers=auth_headers, json={
        'valor_total': 8500,
        'ocorrencias': 'Nenhuma ocorrência.',
        'observacoes_finais': 'Mudança realizada com sucesso.'
    })
    assert r.status_code == 200
    data = r.get_json()
    assert data['os']['status'] == 'concluida'
    recibo = data['recibo']
    assert recibo['numero'].startswith('REC-')
    assert recibo['status'] == 'pendente'

    # 12. Confirmar recebimento do recibo
    r = client.post(f'/api/recibos/{recibo["id"]}/receber', headers=auth_headers, json={
        'forma_pagamento': 'pix', 'data_pagamento': '2026-08-15T18:00:00'
    })
    assert r.status_code == 200
    assert r.get_json()['status'] == 'recebido'

    # 13. Verificar perfil do cliente com histórico
    cliente_id = data['os']['cliente_id']
    if cliente_id:
        r = client.get(f'/api/clientes/{cliente_id}', headers=auth_headers)
        assert r.status_code == 200
        perfil = r.get_json()
        assert perfil['valor_total_gasto'] >= 8500


def test_nao_pode_gerar_os_de_contrato_rascunho(client, auth_headers):
    r = client.post('/api/orcamentos', headers=auth_headers, json={
        'cliente': 'Rascunho Test', 'valor_servico': 1000
    })
    orc_id = r.get_json()['id']
    r = client.post(f'/api/orcamentos/{orc_id}/aprovar', headers=auth_headers)
    cad_id = r.get_json()['cadastro']['id']
    client.put(f'/api/cadastro-complementar/{cad_id}', headers=auth_headers, json={
        'cpf_cnpj': '111.222.333-44', 'data_confirmada': '2026-09-01T08:00:00'
    })
    r = client.post(f'/api/cadastro-complementar/{cad_id}/gerar-contrato', headers=auth_headers)
    contrato_id = r.get_json()['id']
    # Tentar gerar OS de contrato ainda em rascunho
    resp = client.post(f'/api/contratos/{contrato_id}/gerar-os', headers=auth_headers)
    assert resp.status_code == 400
