"""
Sprint 3 — Orçamentos
Nomes exatos conforme spec do projeto.
"""


def _criar_lead_classificado(client, auth_headers, nome='Lead ORC S3', tel='11 94444-0001'):
    r = client.post('/api/leads', headers=auth_headers, json={
        'nome': nome, 'telefone': tel,
        'tipo_servico': 'residencial',
        'bairro_origem': 'Moema', 'cidade_origem': 'São Paulo',
        'bairro_destino': 'Pinheiros', 'cidade_destino': 'São Paulo',
    })
    lid = r.get_json()['id']
    client.post(f'/api/leads/{lid}/classificar', headers=auth_headers,
                json={'classificacao': 'A', 'justificativa': 'Boa aderência'})
    return lid


def test_criar_orcamento(client, auth_headers):
    """Cria orçamento com todos os campos e retorna numeração ORC-AAAA-NNN."""
    resp = client.post('/api/orcamentos', headers=auth_headers, json={
        'cliente': 'Sprint3 Cliente',
        'tipo_servico': 'residencial',
        'orig_rua': 'Rua das Flores', 'orig_numero': '100',
        'orig_bairro': 'Moema', 'orig_cidade': 'São Paulo',
        'orig_estado': 'SP', 'orig_cep': '04501-000',
        'dest_rua': 'Av. Paulista', 'dest_numero': '200',
        'dest_bairro': 'Bela Vista', 'dest_cidade': 'São Paulo',
        'dest_estado': 'SP', 'dest_cep': '01310-000',
        'valor_servico': 4800.0,
        'valor_seguro': 320.0,
        'condicoes_pagamento': '50% na aprovação, 50% na execução',
        'observacoes_comerciais': 'Mudança completa com montagem',
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert data['numero'].startswith('ORC-')
    assert data['cliente'] == 'Sprint3 Cliente'
    assert data['status'] == 'novo'
    assert data['valor_servico'] == 4800.0
    assert data['valor_seguro'] == 320.0
    assert data['orig_bairro'] == 'Moema'
    assert data['dest_bairro'] == 'Bela Vista'


def test_numeracao_orcamento(client, auth_headers):
    """Numeração ORC-AAAA-NNN é sequencial e única."""
    r1 = client.post('/api/orcamentos', headers=auth_headers,
                     json={'cliente': 'Num1'})
    r2 = client.post('/api/orcamentos', headers=auth_headers,
                     json={'cliente': 'Num2'})
    n1 = r1.get_json()['numero']
    n2 = r2.get_json()['numero']
    assert n1.startswith('ORC-')
    assert n2.startswith('ORC-')
    partes1 = n1.split('-')
    partes2 = n2.split('-')
    assert len(partes1) == 3
    assert partes1[1] == partes2[1]               # mesmo ano
    assert int(partes2[2]) == int(partes1[2]) + 1  # sequencial


def test_rejeitar_sem_justificativa_falha(client, auth_headers):
    """Rejeitar orçamento sem justificativa retorna 400."""
    r = client.post('/api/orcamentos', headers=auth_headers, json={'cliente': 'Rejeitar S3'})
    oid = r.get_json()['id']
    resp = client.put(f'/api/orcamentos/{oid}', headers=auth_headers,
                      json={'status': 'rejeitado'})
    assert resp.status_code == 400
    assert 'justificativa' in resp.get_json()['erro'].lower()


def test_rejeitar_com_justificativa_ok(client, auth_headers):
    """Rejeitar com justificativa funciona e muda status."""
    r = client.post('/api/orcamentos', headers=auth_headers, json={'cliente': 'Rejeitar JUS S3'})
    oid = r.get_json()['id']
    resp = client.put(f'/api/orcamentos/{oid}', headers=auth_headers, json={
        'status': 'rejeitado',
        'justificativa': 'Cliente optou por outro fornecedor'
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['status'] == 'rejeitado'
    assert data['justificativa']

    # Cancelado também exige justificativa
    r2 = client.post('/api/orcamentos', headers=auth_headers, json={'cliente': 'Cancelar S3'})
    oid2 = r2.get_json()['id']
    resp2 = client.put(f'/api/orcamentos/{oid2}', headers=auth_headers, json={
        'status': 'cancelado',
        'justificativa': 'Cancelado a pedido do cliente'
    })
    assert resp2.status_code == 200
    assert resp2.get_json()['status'] == 'cancelado'


def test_aprovar_abre_cadastro(client, auth_headers):
    """Aprovar orçamento cria automaticamente o Cadastro Complementar
    pré-preenchido com os dados de endereço do orçamento."""
    r = client.post('/api/orcamentos', headers=auth_headers, json={
        'cliente': 'Aprovar S3',
        'tipo_servico': 'residencial',
        'orig_rua': 'Rua Alameda', 'orig_numero': '55',
        'orig_bairro': 'Jardins', 'orig_cidade': 'São Paulo',
        'orig_estado': 'SP', 'orig_cep': '01403-000',
        'dest_rua': 'Rua Vergueiro', 'dest_numero': '300',
        'dest_bairro': 'Vila Mariana', 'dest_cidade': 'São Paulo',
        'dest_estado': 'SP', 'dest_cep': '04101-000',
        'valor_servico': 5500.0,
        'valor_seguro': 400.0,
    })
    oid = r.get_json()['id']

    resp = client.post(f'/api/orcamentos/{oid}/aprovar', headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['orcamento']['status'] == 'aprovado'

    cad = data['cadastro']
    assert cad is not None
    assert cad['status'] == 'pendente'
    assert cad['orcamento_id'] == oid

    # Cadastro pré-preenchido com endereço do orçamento
    assert cad['orig_bairro'] == 'Jardins'
    assert cad['dest_bairro'] == 'Vila Mariana'

    # Cadastro deve ser único por orçamento — segunda aprovação não cria outro
    resp2 = client.post(f'/api/orcamentos/{oid}/aprovar', headers=auth_headers)
    cad2_list = client.get('/api/cadastro-complementar', headers=auth_headers).get_json()
    cadastros_do_orc = [c for c in cad2_list if c['orcamento_id'] == oid]
    assert len(cadastros_do_orc) == 1


def test_dois_orcamentos_ativos_bloqueados(client, auth_headers):
    """Um lead convertido não pode gerar um segundo orçamento.
    A constraint é imposta no nível do lead (status=convertido)."""
    lid = _criar_lead_classificado(client, auth_headers, 'Lead Duplo S3', '11 93333-0001')

    # Primeira conversão — deve funcionar
    r1 = client.post(f'/api/leads/{lid}/converter', headers=auth_headers)
    assert r1.status_code == 200
    assert r1.get_json()['lead']['status'] == 'convertido'

    # Segunda tentativa de conversão do mesmo lead — deve falhar
    r2 = client.post(f'/api/leads/{lid}/converter', headers=auth_headers)
    assert r2.status_code == 400
    assert 'convertido' in r2.get_json()['erro'].lower()
