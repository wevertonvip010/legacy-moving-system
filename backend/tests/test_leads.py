def test_criar_lead(client, auth_headers):
    resp = client.post('/api/leads', headers=auth_headers, json={
        'nome': 'Fernanda Costa', 'telefone': '(11) 99999-0001',
        'email': 'fernanda@test.com', 'origem': 'instagram',
        'tipo_servico': 'residencial',
        'bairro_origem': 'Pinheiros', 'cidade_origem': 'São Paulo',
        'bairro_destino': 'Moema', 'cidade_destino': 'São Paulo',
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert data['nome'] == 'Fernanda Costa'
    assert data['status'] == 'novo'
    return data['id']


def test_criar_lead_sem_nome(client, auth_headers):
    resp = client.post('/api/leads', headers=auth_headers, json={'telefone': '11 99999-0000'})
    assert resp.status_code == 400


def test_listar_leads(client, auth_headers):
    client.post('/api/leads', headers=auth_headers, json={
        'nome': 'Lead Lista', 'telefone': '11 99999-0002'
    })
    resp = client.get('/api/leads', headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.get_json(), list)
    assert len(resp.get_json()) >= 1


def test_classificar_lead(client, auth_headers):
    r = client.post('/api/leads', headers=auth_headers, json={
        'nome': 'Lead Classificar', 'telefone': '11 99999-0003'
    })
    lead_id = r.get_json()['id']
    resp = client.post(f'/api/leads/{lead_id}/classificar', headers=auth_headers, json={
        'classificacao': 'AA',
        'justificativa': 'Cliente com alta renda e mudança complexa'
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['classificacao'] == 'AA'
    assert data['status'] == 'classificado'


def test_classificacao_invalida(client, auth_headers):
    r = client.post('/api/leads', headers=auth_headers, json={
        'nome': 'Lead Invalido', 'telefone': '11 99999-0004'
    })
    lead_id = r.get_json()['id']
    resp = client.post(f'/api/leads/{lead_id}/classificar', headers=auth_headers, json={
        'classificacao': 'XPTO'
    })
    assert resp.status_code == 400


def test_converter_lead_sem_classificacao(client, auth_headers):
    r = client.post('/api/leads', headers=auth_headers, json={
        'nome': 'Lead Sem Class', 'telefone': '11 99999-0005'
    })
    lead_id = r.get_json()['id']
    resp = client.post(f'/api/leads/{lead_id}/converter', headers=auth_headers)
    assert resp.status_code == 400


def test_converter_lead_classificado(client, auth_headers):
    r = client.post('/api/leads', headers=auth_headers, json={
        'nome': 'Lead Converter', 'telefone': '11 99999-0006',
        'tipo_servico': 'residencial',
        'bairro_origem': 'Jardins', 'cidade_origem': 'SP',
    })
    lead_id = r.get_json()['id']
    client.post(f'/api/leads/{lead_id}/classificar', headers=auth_headers,
                json={'classificacao': 'A', 'justificativa': 'Boa aderência'})
    resp = client.post(f'/api/leads/{lead_id}/converter', headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['lead']['status'] == 'convertido'
    assert 'orcamento' in data
    assert data['orcamento']['numero'].startswith('ORC-')


def test_numeracao_sequencial_orcamento(client, auth_headers):
    resp1 = client.post('/api/orcamentos', headers=auth_headers,
                        json={'cliente': 'Seq1', 'valor_servico': 100})
    resp2 = client.post('/api/orcamentos', headers=auth_headers,
                        json={'cliente': 'Seq2', 'valor_servico': 100})
    n1 = resp1.get_json()['numero']
    n2 = resp2.get_json()['numero']
    assert n1.startswith('ORC-')
    assert n2.startswith('ORC-')
    seq1 = int(n1.split('-')[2])
    seq2 = int(n2.split('-')[2])
    assert seq2 == seq1 + 1
