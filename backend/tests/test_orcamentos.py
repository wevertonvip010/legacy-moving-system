def test_criar_orcamento(client, auth_headers):
    resp = client.post('/api/orcamentos', headers=auth_headers, json={
        'cliente': 'Ana Pereira', 'valor_servico': 3500.0,
        'tipo_servico': 'residencial',
        'orig_bairro': 'Moema', 'orig_cidade': 'São Paulo',
        'dest_bairro': 'Pinheiros', 'dest_cidade': 'São Paulo',
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert data['numero'].startswith('ORC-')
    assert data['cliente'] == 'Ana Pereira'
    assert data['status'] == 'novo'
    return data['id']


def test_criar_orcamento_sem_cliente(client, auth_headers):
    resp = client.post('/api/orcamentos', headers=auth_headers, json={'valor_servico': 100})
    assert resp.status_code == 400


def test_listar_orcamentos(client, auth_headers):
    client.post('/api/orcamentos', headers=auth_headers, json={'cliente': 'Lista ORC'})
    resp = client.get('/api/orcamentos', headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.get_json(), list)
    assert len(resp.get_json()) >= 1


def test_atualizar_orcamento(client, auth_headers):
    r = client.post('/api/orcamentos', headers=auth_headers, json={'cliente': 'Editar ORC'})
    oid = r.get_json()['id']
    resp = client.put(f'/api/orcamentos/{oid}', headers=auth_headers,
                      json={'valor_servico': 5000, 'condicoes_pagamento': '50% entrada'})
    assert resp.status_code == 200
    assert resp.get_json()['valor_servico'] == 5000


def test_aprovar_orcamento_cria_cadastro(client, auth_headers):
    r = client.post('/api/orcamentos', headers=auth_headers, json={
        'cliente': 'Aprovar ORC', 'valor_servico': 2000
    })
    oid = r.get_json()['id']
    resp = client.post(f'/api/orcamentos/{oid}/aprovar', headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['orcamento']['status'] == 'aprovado'
    assert 'cadastro' in data
    assert data['cadastro']['status'] == 'pendente'


def test_rejeitar_sem_justificativa(client, auth_headers):
    r = client.post('/api/orcamentos', headers=auth_headers, json={'cliente': 'Rejeitar ORC'})
    oid = r.get_json()['id']
    resp = client.put(f'/api/orcamentos/{oid}', headers=auth_headers, json={'status': 'rejeitado'})
    assert resp.status_code == 400


def test_rejeitar_com_justificativa(client, auth_headers):
    r = client.post('/api/orcamentos', headers=auth_headers, json={'cliente': 'Rejeitar JUS'})
    oid = r.get_json()['id']
    resp = client.put(f'/api/orcamentos/{oid}', headers=auth_headers,
                      json={'status': 'rejeitado', 'justificativa': 'Cliente desistiu'})
    assert resp.status_code == 200
    assert resp.get_json()['status'] == 'rejeitado'


def test_deletar_orcamento(client, auth_headers):
    r = client.post('/api/orcamentos', headers=auth_headers, json={'cliente': 'Deletar ORC'})
    oid = r.get_json()['id']
    resp = client.delete(f'/api/orcamentos/{oid}', headers=auth_headers)
    assert resp.status_code == 200
