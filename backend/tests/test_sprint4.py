"""
Sprint 4 — Cadastro Complementar + Contrato
Nomes exatos conforme spec do projeto.
"""


def _fluxo_ate_cadastro(client, auth_headers, cliente='S4 Cliente', tel='11 92222-0001'):
    """Helper: cria lead → classifica → converte → aprova orçamento → retorna (oid, cad_id)."""
    r = client.post('/api/leads', headers=auth_headers, json={
        'nome': cliente, 'telefone': tel,
        'tipo_servico': 'residencial',
        'bairro_origem': 'Pinheiros', 'cidade_origem': 'São Paulo',
        'bairro_destino': 'Moema', 'cidade_destino': 'São Paulo',
    })
    lid = r.get_json()['id']
    client.post(f'/api/leads/{lid}/classificar', headers=auth_headers,
                json={'classificacao': 'A', 'justificativa': 'Boa aderência'})
    conv = client.post(f'/api/leads/{lid}/converter', headers=auth_headers)
    oid = conv.get_json()['orcamento']['id']

    client.put(f'/api/orcamentos/{oid}', headers=auth_headers, json={
        'orig_rua': 'Rua das Flores', 'orig_numero': '10',
        'orig_bairro': 'Pinheiros', 'orig_cidade': 'São Paulo',
        'orig_estado': 'SP', 'orig_cep': '05422-000',
        'dest_rua': 'Av. Ibirapuera', 'dest_numero': '200',
        'dest_bairro': 'Moema', 'dest_cidade': 'São Paulo',
        'dest_estado': 'SP', 'dest_cep': '04029-000',
        'valor_servico': 6000.0, 'valor_seguro': 500.0,
    })
    apr = client.post(f'/api/orcamentos/{oid}/aprovar', headers=auth_headers)
    cad_id = apr.get_json()['cadastro']['id']
    return oid, cad_id


def test_preencher_cadastro(client, auth_headers):
    """Preencher CPF e data confirmada muda status do cadastro para completo."""
    _, cad_id = _fluxo_ate_cadastro(client, auth_headers, 'S4 Preencher', '11 91111-0001')

    resp = client.put(f'/api/cadastro-complementar/{cad_id}', headers=auth_headers, json={
        'cpf_cnpj': '123.456.789-00',
        'rg_ie': 'MG-12.345.678',
        'data_confirmada': '2026-08-15T09:00:00',
        'dados_para_contrato': 'Mudança com piano — cuidado especial',
        'observacoes_finais': 'Confirmar acesso pelo portão lateral',
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['status'] == 'completo'
    assert data['cpf_cnpj'] == '123.456.789-00'
    assert data['dados_para_contrato'] == 'Mudança com piano — cuidado especial'


def test_cadastro_preserva_enderecos_orcamento(client, auth_headers):
    """Cadastro criado ao aprovar orçamento já vem com endereços pré-preenchidos."""
    r = client.post('/api/orcamentos', headers=auth_headers, json={
        'cliente': 'S4 EnderecoCheck',
        'orig_rua': 'Rua Vergueiro', 'orig_numero': '1500',
        'orig_bairro': 'Vila Mariana', 'orig_cidade': 'São Paulo',
        'orig_estado': 'SP', 'orig_cep': '04101-000',
        'dest_rua': 'Av. Paulista', 'dest_numero': '900',
        'dest_bairro': 'Bela Vista', 'dest_cidade': 'São Paulo',
        'dest_estado': 'SP', 'dest_cep': '01310-100',
    })
    oid = r.get_json()['id']
    apr = client.post(f'/api/orcamentos/{oid}/aprovar', headers=auth_headers)
    cad = apr.get_json()['cadastro']
    assert cad['orig_bairro'] == 'Vila Mariana'
    assert cad['orig_cidade'] == 'São Paulo'
    assert cad['dest_bairro'] == 'Bela Vista'
    assert cad['orig_cep'] == '04101-000'  # from orcamento orig_cep
    # Nested orcamento object returned
    assert cad['orcamento'] is not None
    assert cad['orcamento']['cliente'] == 'S4 EnderecoCheck'


def test_cadastro_incompleto_bloqueia_contrato(client, auth_headers):
    """Gerar contrato com cadastro ainda pendente retorna 400."""
    _, cad_id = _fluxo_ate_cadastro(client, auth_headers, 'S4 Bloqueio', '11 91111-0002')
    # Cadastro criado mas sem CPF/data — status pendente
    resp = client.post(f'/api/cadastro-complementar/{cad_id}/gerar-contrato',
                       headers=auth_headers)
    assert resp.status_code == 400
    assert 'completo' in resp.get_json()['erro'].lower()


def test_gerar_contrato(client, auth_headers):
    """Gerar contrato a partir de cadastro completo cria CON-AAAA-NNN com dados pré-preenchidos."""
    oid, cad_id = _fluxo_ate_cadastro(client, auth_headers, 'S4 GerarCon', '11 91111-0003')

    # Completa o cadastro
    client.put(f'/api/cadastro-complementar/{cad_id}', headers=auth_headers, json={
        'cpf_cnpj': '987.654.321-00',
        'data_confirmada': '2026-09-10T08:00:00',
    })

    resp = client.post(f'/api/cadastro-complementar/{cad_id}/gerar-contrato',
                       headers=auth_headers)
    assert resp.status_code == 201
    data = resp.get_json()
    assert data['numero'].startswith('CON-')
    partes = data['numero'].split('-')
    assert len(partes) == 3
    assert data['cliente'] == 'S4 GerarCon'
    assert data['status'] == 'rascunho'
    assert data['orcamento_id'] == oid
    assert data['valor_servico'] == 6000.0
    assert data['valor_seguro'] == 500.0

    # Segundo gerar-contrato no mesmo orçamento deve falhar
    resp2 = client.post(f'/api/cadastro-complementar/{cad_id}/gerar-contrato',
                        headers=auth_headers)
    assert resp2.status_code == 400


def test_numeracao_contrato(client, auth_headers):
    """Numeração CON-AAAA-NNN é sequencial."""
    def _criar_contrato(nome, tel):
        _, cad_id = _fluxo_ate_cadastro(client, auth_headers, nome, tel)
        client.put(f'/api/cadastro-complementar/{cad_id}', headers=auth_headers,
                   json={'cpf_cnpj': '111.222.333-44', 'data_confirmada': '2026-10-01T10:00:00'})
        r = client.post(f'/api/cadastro-complementar/{cad_id}/gerar-contrato',
                        headers=auth_headers)
        return r.get_json()['numero']

    n1 = _criar_contrato('S4 Num1', '11 90001-0001')
    n2 = _criar_contrato('S4 Num2', '11 90001-0002')
    assert n1.startswith('CON-')
    assert n2.startswith('CON-')
    p1 = n1.split('-')
    p2 = n2.split('-')
    assert p1[1] == p2[1]                    # mesmo ano
    assert int(p2[2]) == int(p1[2]) + 1      # sequencial


def test_contrato_rascunho_bloqueia_os(client, auth_headers):
    """Contrato em rascunho não permite gerar OS."""
    oid, cad_id = _fluxo_ate_cadastro(client, auth_headers, 'S4 RascOS', '11 90002-0001')
    client.put(f'/api/cadastro-complementar/{cad_id}', headers=auth_headers,
               json={'cpf_cnpj': '222.333.444-55', 'data_confirmada': '2026-11-01T08:00:00'})
    r = client.post(f'/api/cadastro-complementar/{cad_id}/gerar-contrato', headers=auth_headers)
    con_id = r.get_json()['id']

    # Status rascunho — OS bloqueada
    resp = client.post(f'/api/contratos/{con_id}/gerar-os', headers=auth_headers)
    assert resp.status_code == 400
    assert 'rascunho' in resp.get_json()['erro'].lower()


def test_contrato_confirmado_permite_os(client, auth_headers):
    """Contrato confirmado (status != rascunho) permite gerar OS."""
    oid, cad_id = _fluxo_ate_cadastro(client, auth_headers, 'S4 ConOS', '11 90002-0002')
    client.put(f'/api/cadastro-complementar/{cad_id}', headers=auth_headers,
               json={'cpf_cnpj': '333.444.555-66', 'data_confirmada': '2026-11-15T08:00:00'})
    r = client.post(f'/api/cadastro-complementar/{cad_id}/gerar-contrato', headers=auth_headers)
    con_id = r.get_json()['id']

    # Confirma contrato (vendedor revisou e enviou ao cliente)
    client.put(f'/api/contratos/{con_id}', headers=auth_headers, json={'status': 'enviado'})

    # Agora pode gerar OS
    resp = client.post(f'/api/contratos/{con_id}/gerar-os', headers=auth_headers)
    assert resp.status_code == 201
    data = resp.get_json()
    assert data['numero'].startswith('OS-')
    assert data['cliente'] == 'S4 ConOS'
    assert data['status'] == 'agendada'
