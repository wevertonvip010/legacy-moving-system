def test_criar_os(client, auth_headers):
    resp = client.post('/api/os', headers=auth_headers, json={
        'cliente': 'Rafael Lima',
        'endereco_origem': 'Av. Paulista, 500',
        'endereco_destino': 'Rua Augusta, 200',
        'data_mudanca': '2026-08-01T09:00:00',
        'equipe': 'João, Pedro',
        'veiculo': 'Caminhão',
        'valor_total': 2800.0
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert data['numero'].startswith('OS-')
    assert data['status'] == 'agendada'
    assert data['cliente'] == 'Rafael Lima'


def test_criar_os_sem_cliente(client, auth_headers):
    resp = client.post('/api/os', headers=auth_headers, json={'veiculo': 'Caminhão'})
    assert resp.status_code == 400


def test_listar_os(client, auth_headers):
    client.post('/api/os', headers=auth_headers, json={'cliente': 'Lista OS'})
    resp = client.get('/api/os', headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.get_json(), list)


def test_iniciar_os(client, auth_headers):
    r = client.post('/api/os', headers=auth_headers, json={'cliente': 'Iniciar OS'})
    id_ = r.get_json()['id']
    resp = client.post(f'/api/os/{id_}/iniciar', headers=auth_headers)
    assert resp.status_code == 200
    assert resp.get_json()['status'] == 'em_andamento'


def test_concluir_os_gera_recibo(client, auth_headers):
    r = client.post('/api/os', headers=auth_headers, json={
        'cliente': 'Concluir OS', 'valor_total': 3500
    })
    id_ = r.get_json()['id']
    client.post(f'/api/os/{id_}/iniciar', headers=auth_headers)
    resp = client.post(f'/api/os/{id_}/concluir', headers=auth_headers,
                       json={'valor_total': 3500})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['os']['status'] == 'concluida'
    assert 'recibo' in data
    assert data['recibo']['numero'].startswith('REC-')
    assert data['recibo']['status'] == 'pendente'


def test_numeracao_os_sequencial(client, auth_headers):
    r1 = client.post('/api/os', headers=auth_headers, json={'cliente': 'Seq OS 1'})
    r2 = client.post('/api/os', headers=auth_headers, json={'cliente': 'Seq OS 2'})
    n1 = r1.get_json()['numero']
    n2 = r2.get_json()['numero']
    seq1 = int(n1.split('-')[2])
    seq2 = int(n2.split('-')[2])
    assert seq2 == seq1 + 1


def test_cancelar_os(client, auth_headers):
    r = client.post('/api/os', headers=auth_headers, json={'cliente': 'Cancelar OS'})
    id_ = r.get_json()['id']
    resp = client.post(f'/api/os/{id_}/cancelar', headers=auth_headers)
    assert resp.status_code == 200
    assert resp.get_json()['status'] == 'cancelada'
