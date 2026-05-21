"""
Sprint 5 — Ordens de Serviço + Estoque
Nomes exatos conforme spec do projeto.
"""
import json


def _fluxo_ate_os(client, auth_headers, cliente='S5 Cliente', tel='11 98000-0001'):
    """Helper: lead → classifica → converte → aprova ORC → completa cadastro → gera CON → confirma → gera OS."""
    # Lead
    r = client.post('/api/leads', headers=auth_headers, json={
        'nome': cliente, 'telefone': tel,
        'tipo_servico': 'residencial',
        'bairro_origem': 'Lapa', 'cidade_origem': 'São Paulo',
        'bairro_destino': 'Moema', 'cidade_destino': 'São Paulo',
    })
    lid = r.get_json()['id']
    client.post(f'/api/leads/{lid}/classificar', headers=auth_headers,
                json={'classificacao': 'A', 'justificativa': 'Bom perfil'})
    conv = client.post(f'/api/leads/{lid}/converter', headers=auth_headers)
    oid = conv.get_json()['orcamento']['id']

    # Preenche e aprova orçamento
    client.put(f'/api/orcamentos/{oid}', headers=auth_headers, json={
        'orig_rua': 'Rua Lapa', 'orig_numero': '50',
        'orig_bairro': 'Lapa', 'orig_cidade': 'São Paulo',
        'orig_estado': 'SP', 'orig_cep': '05073-000',
        'dest_rua': 'Av. Ibirapuera', 'dest_numero': '500',
        'dest_bairro': 'Moema', 'dest_cidade': 'São Paulo',
        'dest_estado': 'SP', 'dest_cep': '04029-000',
        'valor_servico': 7000.0, 'valor_seguro': 600.0,
    })
    apr = client.post(f'/api/orcamentos/{oid}/aprovar', headers=auth_headers)
    cad_id = apr.get_json()['cadastro']['id']

    # Completa cadastro
    client.put(f'/api/cadastro-complementar/{cad_id}', headers=auth_headers, json={
        'cpf_cnpj': '444.555.666-77',
        'data_confirmada': '2026-09-20T08:00:00',
    })
    # Gera e confirma contrato
    con = client.post(f'/api/cadastro-complementar/{cad_id}/gerar-contrato', headers=auth_headers)
    con_id = con.get_json()['id']
    client.put(f'/api/contratos/{con_id}', headers=auth_headers, json={'status': 'enviado'})

    # Gera OS
    os_r = client.post(f'/api/contratos/{con_id}/gerar-os', headers=auth_headers)
    os_id = os_r.get_json()['id']
    return os_id, con_id


def test_os_campos_completos(client, auth_headers):
    """OS aceita todos os campos operacionais: motorista, veículo, equipe, materiais, checklist."""
    resp = client.post('/api/os', headers=auth_headers, json={
        'cliente': 'S5 CamposOS',
        'tipo_servico': 'residencial',
        'endereco_origem': 'Rua A, 100, Lapa, São Paulo',
        'endereco_destino': 'Rua B, 200, Moema, São Paulo',
        'data_mudanca': '2026-10-05T08:00:00',
        'hora_inicio': '08:00',
        'hora_fim_estimada': '17:00',
        'motorista': 'Carlos Silva',
        'veiculo': 'Caminhão 3/4',
        'equipe': 'João, Pedro, André',
        'quantidade_ajudantes': 3,
        'quantidade_dias': 1,
        'materiais_previstos': json.dumps([
            {'material': 'Caixa P', 'quantidade': 20},
            {'material': 'Caixa M', 'quantidade': 15},
            {'material': 'Fita Adesiva', 'quantidade': 5},
        ]),
        'checklist': json.dumps([
            {'item': 'Carregar caminhão', 'feito': False},
            {'item': 'Montar móveis', 'feito': False},
        ]),
        'observacoes_operacionais': 'Apartamento no 10° andar — elevador disponível',
        'valor_total': 7600.0,
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert data['numero'].startswith('OS-')
    assert data['motorista'] == 'Carlos Silva'
    assert data['veiculo'] == 'Caminhão 3/4'
    assert data['equipe'] == 'João, Pedro, André'
    assert data['quantidade_ajudantes'] == 3
    assert data['status'] == 'agendada'
    assert data['valor_total'] == 7600.0


def test_os_herda_dados_contrato(client, auth_headers):
    """OS criada via /contratos/<id>/gerar-os herda cliente, endereços e valor do contrato."""
    os_id, con_id = _fluxo_ate_os(client, auth_headers, 'S5 Heranca', '11 98001-0001')
    os_data = client.get(f'/api/os/{os_id}', headers=auth_headers).get_json()
    assert os_data['cliente'] == 'S5 Heranca'
    assert os_data['status'] == 'agendada'
    assert os_data['contrato_id'] == con_id
    assert os_data['valor_total'] == 7600.0   # 7000 + 600
    assert 'Lapa' in os_data['endereco_origem']
    assert 'Moema' in os_data['endereco_destino']


def test_iniciar_os_registra_hora(client, auth_headers):
    """Iniciar OS muda status para em_andamento e registra hora de início real."""
    r = client.post('/api/os', headers=auth_headers, json={
        'cliente': 'S5 Iniciar', 'valor_total': 3000
    })
    os_id = r.get_json()['id']

    resp = client.post(f'/api/os/{os_id}/iniciar', headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['status'] == 'em_andamento'
    assert data['hora_inicio_real'] is not None
    assert ':' in data['hora_inicio_real']   # formato HH:MM

    # Não pode iniciar novamente
    resp2 = client.post(f'/api/os/{os_id}/iniciar', headers=auth_headers)
    assert resp2.status_code == 400


def test_concluir_desconta_estoque(client, auth_headers):
    """Concluir OS com materiais_usados desconta quantidades do estoque automaticamente."""
    # Cria item no estoque
    e = client.post('/api/estoque', headers=auth_headers, json={
        'material': 'Caixa Grande S5', 'unidade': 'un',
        'quantidade': 50, 'estoque_minimo': 10, 'estoque_critico': 5
    })
    eid = e.get_json()['id']

    # Cria e executa OS com materiais usados
    r = client.post('/api/os', headers=auth_headers, json={
        'cliente': 'S5 Desconto', 'valor_total': 4000,
        'materiais_usados': json.dumps([
            {'material': 'Caixa Grande S5', 'quantidade': 12},
        ]),
    })
    os_id = r.get_json()['id']
    client.post(f'/api/os/{os_id}/iniciar', headers=auth_headers)
    resp = client.post(f'/api/os/{os_id}/concluir', headers=auth_headers, json={
        'materiais_usados': json.dumps([
            {'material': 'Caixa Grande S5', 'quantidade': 12},
        ]),
    })
    assert resp.status_code == 200

    # Verifica que estoque foi descontado
    estoque_atual = client.get('/api/estoque', headers=auth_headers).get_json()
    item = next((x for x in estoque_atual['items'] if x['id'] == eid), None)
    assert item is not None
    assert item['quantidade'] == 38  # 50 - 12


def test_concluir_gera_recibo_automatico(client, auth_headers):
    """Concluir OS cria recibo pendente automaticamente com valor e cliente corretos."""
    r = client.post('/api/os', headers=auth_headers, json={
        'cliente': 'S5 RecibAuto',
        'valor_total': 5500.0,
        'tipo_servico': 'comercial',
        'endereco_origem': 'Rua X, 10',
        'endereco_destino': 'Rua Y, 20',
    })
    os_id = r.get_json()['id']
    client.post(f'/api/os/{os_id}/iniciar', headers=auth_headers)
    resp = client.post(f'/api/os/{os_id}/concluir', headers=auth_headers,
                       json={'valor_total': 5500.0})
    assert resp.status_code == 200
    data = resp.get_json()

    # OS concluída
    assert data['os']['status'] == 'concluida'
    assert data['os']['hora_fim_real'] is not None

    # Recibo criado automaticamente
    rec = data['recibo']
    assert rec['numero'].startswith('REC-')
    assert rec['status'] == 'pendente'
    assert rec['cliente'] == 'S5 RecibAuto'
    assert rec['valor_cobrado'] == 5500.0
    assert rec['os_id'] == os_id


def test_estoque_historico_movimentacoes(client, auth_headers):
    """Cada entrada/saída registra movimentação no histórico do item."""
    e = client.post('/api/estoque', headers=auth_headers, json={
        'material': 'Plástico Bolha S5', 'unidade': 'rolo', 'quantidade': 20
    })
    eid = e.get_json()['id']

    client.post(f'/api/estoque/{eid}/entrada', headers=auth_headers,
                json={'quantidade': 30, 'observacao': 'Compra fornecedor'})
    client.post(f'/api/estoque/{eid}/saida', headers=auth_headers,
                json={'quantidade': 10, 'observacao': 'Uso em obra'})

    resp = client.get(f'/api/estoque/{eid}/movimentacoes', headers=auth_headers)
    assert resp.status_code == 200
    movs = resp.get_json()
    assert len(movs) == 2
    tipos = {m['tipo'] for m in movs}
    assert 'entrada' in tipos
    assert 'saida' in tipos
    qtds = {m['quantidade'] for m in movs}
    assert 30 in qtds
    assert 10 in qtds


def test_estoque_alertas_niveis(client, auth_headers):
    """Alertas retornados separados: crítico (qty <= critico) e baixo (qty <= minimo)."""
    client.post('/api/estoque', headers=auth_headers, json={
        'material': 'Item Critico S5', 'quantidade': 3,
        'estoque_minimo': 10, 'estoque_critico': 5
    })
    client.post('/api/estoque', headers=auth_headers, json={
        'material': 'Item Baixo S5', 'quantidade': 8,
        'estoque_minimo': 10, 'estoque_critico': 5
    })
    client.post('/api/estoque', headers=auth_headers, json={
        'material': 'Item OK S5', 'quantidade': 50,
        'estoque_minimo': 10, 'estoque_critico': 5
    })

    resp = client.get('/api/estoque', headers=auth_headers)
    data = resp.get_json()

    criticos = [e['material'] for e in data['alertas_criticos']]
    baixos = [e['material'] for e in data['alertas_baixo']]
    ok_items = [e['material'] for e in data['items'] if e['alerta'] is None]

    assert 'Item Critico S5' in criticos
    assert 'Item Baixo S5' in baixos
    assert 'Item OK S5' in ok_items
    # Crítico não aparece em baixo
    assert 'Item Critico S5' not in baixos
