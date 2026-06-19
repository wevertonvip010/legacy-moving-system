from datetime import datetime


def test_fechamento_sem_dados(client, auth_headers):
    resp = client.get('/api/fechamento/resumo?mes=1&ano=2000', headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['receita_mudancas'] == 0
    assert data['total_despesas'] == 0
    assert data['lucro_liquido'] == 0


def test_receita_recibos_no_fechamento(client, auth_headers):
    mes = datetime.utcnow().month
    ano = datetime.utcnow().year
    r = client.post('/api/recibos', headers=auth_headers, json={
        'cliente': 'Fech Recibo', 'valor_cobrado': 4500
    })
    rid = r.get_json()['id']
    client.post(f'/api/recibos/{rid}/receber', headers=auth_headers, json={
        'forma_pagamento': 'pix',
        'data_pagamento': f'{ano}-{mes:02d}-10T00:00:00'
    })
    resp = client.get(f'/api/fechamento/resumo?mes={mes}&ano={ano}', headers=auth_headers)
    data = resp.get_json()
    assert data['receita_mudancas'] >= 4500


def test_despesas_no_fechamento(client, auth_headers):
    mes = datetime.utcnow().month
    ano = datetime.utcnow().year
    client.post('/api/financeiro/despesas', headers=auth_headers, json={
        'categoria': 'combustivel', 'valor': 800,
        'data': f'{ano}-{mes:02d}-15T00:00:00'
    })
    resp = client.get(f'/api/fechamento/resumo?mes={mes}&ano={ano}', headers=auth_headers)
    data = resp.get_json()
    assert data['total_despesas'] >= 800


def test_lucro_calculo(client, auth_headers):
    resp = client.get('/api/fechamento/resumo', headers=auth_headers)
    data = resp.get_json()
    assert data['lucro_liquido'] == data['receita_total'] - data['total_despesas']


def test_margem_percentual_valida(client, auth_headers):
    resp = client.get('/api/fechamento/resumo?mes=1&ano=2000', headers=auth_headers)
    data = resp.get_json()
    assert 0 <= data['margem_percentual'] <= 100


def test_ticket_medio(client, auth_headers):
    mes = datetime.utcnow().month
    ano = datetime.utcnow().year
    resp = client.get(f'/api/fechamento/resumo?mes={mes}&ano={ano}', headers=auth_headers)
    data = resp.get_json()
    assert 'ticket_medio' in data
    if data['mudancas_realizadas'] > 0:
        assert data['ticket_medio'] > 0
