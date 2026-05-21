def test_listar_clientes_vazio(client, auth_headers):
    resp = client.get('/api/clientes', headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.get_json(), list)


def test_criar_cliente(client, auth_headers):
    resp = client.post('/api/clientes', headers=auth_headers, json={
        'nome': 'Maria Oliveira', 'email': 'maria@test.com',
        'telefone': '(11) 98888-0000', 'origem': 'direto'
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert data['nome'] == 'Maria Oliveira'
    assert data['status'] == 'ativo'


def test_criar_cliente_sem_nome(client, auth_headers):
    resp = client.post('/api/clientes', headers=auth_headers, json={'email': 'x@x.com'})
    assert resp.status_code == 400


def test_listar_clientes_apos_criar(client, auth_headers):
    client.post('/api/clientes', headers=auth_headers, json={'nome': 'Lista Teste'})
    resp = client.get('/api/clientes', headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.get_json()) >= 1


def test_obter_perfil_cliente(client, auth_headers):
    r = client.post('/api/clientes', headers=auth_headers, json={'nome': 'Perfil Completo'})
    cid = r.get_json()['id']
    resp = client.get(f'/api/clientes/{cid}', headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert 'orcamentos' in data
    assert 'contratos' in data
    assert 'ordens_servico' in data
    assert 'recibos' in data
    assert 'valor_total_gasto' in data


def test_editar_cliente(client, auth_headers):
    r = client.post('/api/clientes', headers=auth_headers, json={'nome': 'Antes'})
    cid = r.get_json()['id']
    resp = client.put(f'/api/clientes/{cid}', headers=auth_headers, json={'nome': 'Depois'})
    assert resp.status_code == 200
    assert resp.get_json()['nome'] == 'Depois'


def test_arquivar_cliente(client, auth_headers):
    r = client.post('/api/clientes', headers=auth_headers, json={'nome': 'Arquivar Este'})
    cid = r.get_json()['id']
    resp = client.delete(f'/api/clientes/{cid}', headers=auth_headers)
    assert resp.status_code == 200
    assert resp.get_json()['status'] == 'arquivado'


def test_cliente_arquivado_nao_aparece(client, auth_headers):
    r = client.post('/api/clientes', headers=auth_headers, json={'nome': 'Invisivel'})
    cid = r.get_json()['id']
    client.delete(f'/api/clientes/{cid}', headers=auth_headers)
    resp = client.get('/api/clientes', headers=auth_headers)
    nomes = [c['nome'] for c in resp.get_json()]
    assert 'Invisivel' not in nomes
