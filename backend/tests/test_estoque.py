def test_listar_estoque(client, auth_headers):
    resp = client.get('/api/estoque', headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert 'items' in data
    assert isinstance(data['items'], list)
    assert len(data['items']) >= 1


def test_criar_item_estoque(client, auth_headers):
    resp = client.post('/api/estoque', headers=auth_headers, json={
        'material': 'Caixa Teste', 'unidade': 'un',
        'quantidade': 30, 'estoque_minimo': 10, 'estoque_critico': 5,
        'valor_unitario': 4.50
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert data['material'] == 'Caixa Teste'
    assert data['quantidade'] == 30
    return data['id']


def test_criar_sem_material(client, auth_headers):
    resp = client.post('/api/estoque', headers=auth_headers, json={'quantidade': 10})
    assert resp.status_code == 400


def test_entrada_estoque(client, auth_headers):
    r = client.post('/api/estoque', headers=auth_headers, json={
        'material': 'Item Entrada', 'quantidade': 10
    })
    eid = r.get_json()['id']
    resp = client.post(f'/api/estoque/{eid}/entrada', headers=auth_headers, json={
        'quantidade': 20, 'observacao': 'Compra nova'
    })
    assert resp.status_code == 200
    assert resp.get_json()['quantidade'] == 30


def test_saida_estoque(client, auth_headers):
    r = client.post('/api/estoque', headers=auth_headers, json={
        'material': 'Item Saida', 'quantidade': 15
    })
    eid = r.get_json()['id']
    resp = client.post(f'/api/estoque/{eid}/saida', headers=auth_headers, json={
        'quantidade': 5, 'observacao': 'Uso em OS'
    })
    assert resp.status_code == 200
    assert resp.get_json()['quantidade'] == 10


def test_saida_insuficiente(client, auth_headers):
    r = client.post('/api/estoque', headers=auth_headers, json={
        'material': 'Item Insuf', 'quantidade': 3
    })
    eid = r.get_json()['id']
    resp = client.post(f'/api/estoque/{eid}/saida', headers=auth_headers, json={'quantidade': 10})
    assert resp.status_code == 400


def test_alerta_critico(client, auth_headers):
    client.post('/api/estoque', headers=auth_headers, json={
        'material': 'Item Critico', 'quantidade': 2,
        'estoque_minimo': 10, 'estoque_critico': 5
    })
    resp = client.get('/api/estoque', headers=auth_headers)
    data = resp.get_json()
    criticos = [e['material'] for e in data['alertas_criticos']]
    assert 'Item Critico' in criticos


def test_alerta_baixo(client, auth_headers):
    client.post('/api/estoque', headers=auth_headers, json={
        'material': 'Item Baixo', 'quantidade': 7,
        'estoque_minimo': 10, 'estoque_critico': 5
    })
    resp = client.get('/api/estoque', headers=auth_headers)
    data = resp.get_json()
    baixos = [e['material'] for e in data['alertas_baixo']]
    assert 'Item Baixo' in baixos
