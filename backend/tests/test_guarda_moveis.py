def test_listar_boxes(client, auth_headers):
    resp = client.get('/api/guarda-moveis', headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert 'boxes' in data
    assert data['total'] == 20
    assert data['livres'] + data['ocupados'] + data['manutencao'] == 20


def test_ocupar_box(client, auth_headers):
    resp = client.post('/api/guarda-moveis/1/ocupar', headers=auth_headers, json={
        'cliente_nome': 'Beatriz Souza', 'valor_mensal': 380.0
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['status'] == 'ocupado'
    assert data['cliente_nome'] == 'Beatriz Souza'
    assert data['valor_mensal'] == 380.0


def test_ocupar_box_ja_ocupado(client, auth_headers):
    client.post('/api/guarda-moveis/2/ocupar', headers=auth_headers,
                json={'cliente_nome': 'X', 'valor_mensal': 380})
    resp = client.post('/api/guarda-moveis/2/ocupar', headers=auth_headers,
                       json={'cliente_nome': 'Y', 'valor_mensal': 380})
    assert resp.status_code == 400


def test_liberar_box(client, auth_headers):
    client.post('/api/guarda-moveis/3/ocupar', headers=auth_headers,
                json={'cliente_nome': 'Para liberar', 'valor_mensal': 380})
    resp = client.post('/api/guarda-moveis/3/liberar', headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['status'] == 'livre'
    assert data['cliente_nome'] is None
    assert data['valor_mensal'] == 0


def test_receita_mensal_calculada(client, auth_headers):
    client.post('/api/guarda-moveis/4/ocupar', headers=auth_headers,
                json={'cliente_nome': 'R1', 'valor_mensal': 400})
    client.post('/api/guarda-moveis/5/ocupar', headers=auth_headers,
                json={'cliente_nome': 'R2', 'valor_mensal': 500})
    resp = client.get('/api/guarda-moveis', headers=auth_headers)
    data = resp.get_json()
    assert data['receita_mensal_total'] >= 900.0
    assert data['ocupados'] >= 2


def test_box_manutencao(client, auth_headers):
    resp = client.post('/api/guarda-moveis/6/manutencao', headers=auth_headers)
    assert resp.status_code == 200
    assert resp.get_json()['status'] == 'manutencao'


def test_taxa_ocupacao(client, auth_headers):
    resp = client.get('/api/guarda-moveis', headers=auth_headers)
    data = resp.get_json()
    assert 'taxa_ocupacao' in data
    assert 0 <= data['taxa_ocupacao'] <= 100
