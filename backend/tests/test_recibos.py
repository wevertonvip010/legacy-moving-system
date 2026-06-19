def test_criar_recibo(client, auth_headers):
    resp = client.post('/api/recibos', headers=auth_headers, json={
        'cliente': 'Cliente Recibo',
        'servico_realizado': 'Mudança residencial Moema → Pinheiros',
        'valor_cobrado': 4500.0,
        'forma_pagamento': 'pix',
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert data['numero'].startswith('REC-')
    assert data['status'] == 'pendente'
    return data['id']


def test_criar_recibo_sem_cliente(client, auth_headers):
    resp = client.post('/api/recibos', headers=auth_headers, json={'valor_cobrado': 100})
    assert resp.status_code == 400


def test_listar_recibos(client, auth_headers):
    client.post('/api/recibos', headers=auth_headers, json={
        'cliente': 'Lista Recibo', 'valor_cobrado': 100
    })
    resp = client.get('/api/recibos', headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.get_json(), list)


def test_confirmar_recibo(client, auth_headers):
    r = client.post('/api/recibos', headers=auth_headers, json={
        'cliente': 'Confirmar Recibo', 'valor_cobrado': 3000
    })
    rid = r.get_json()['id']
    resp = client.post(f'/api/recibos/{rid}/receber', headers=auth_headers, json={
        'forma_pagamento': 'transferencia',
        'data_pagamento': '2026-05-15T10:00:00'
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['status'] == 'recebido'
    assert data['forma_pagamento'] == 'transferencia'


def test_recibo_numeracao_sequencial(client, auth_headers):
    r1 = client.post('/api/recibos', headers=auth_headers, json={
        'cliente': 'Seq Rec 1', 'valor_cobrado': 100
    })
    r2 = client.post('/api/recibos', headers=auth_headers, json={
        'cliente': 'Seq Rec 2', 'valor_cobrado': 200
    })
    n1 = r1.get_json()['numero']
    n2 = r2.get_json()['numero']
    assert n1.startswith('REC-')
    seq1 = int(n1.split('-')[2])
    seq2 = int(n2.split('-')[2])
    assert seq2 == seq1 + 1


def test_listar_recibos_por_status(client, auth_headers):
    r = client.post('/api/recibos', headers=auth_headers, json={
        'cliente': 'Filtro Status', 'valor_cobrado': 500
    })
    rid = r.get_json()['id']
    client.post(f'/api/recibos/{rid}/receber', headers=auth_headers, json={
        'forma_pagamento': 'dinheiro'
    })
    resp = client.get('/api/recibos?status=recebido', headers=auth_headers)
    assert resp.status_code == 200
    todos_recebidos = all(r['status'] == 'recebido' for r in resp.get_json())
    assert todos_recebidos
