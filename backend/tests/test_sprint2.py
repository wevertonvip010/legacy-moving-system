"""
Sprint 2 — Leads + Organizers
Nomes exatos conforme spec do projeto.
"""
import os
import pytest


def test_criar_lead(client, auth_headers):
    resp = client.post('/api/leads', headers=auth_headers, json={
        'nome': 'Sprint2 Lead', 'telefone': '(11) 91234-5678',
        'email': 'sprint2@test.com', 'origem': 'instagram',
        'tipo_servico': 'residencial',
        'bairro_origem': 'Moema', 'cidade_origem': 'São Paulo',
        'bairro_destino': 'Lapa', 'cidade_destino': 'São Paulo',
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert data['nome'] == 'Sprint2 Lead'
    assert data['status'] == 'novo'
    assert data['classificacao'] is None


def test_listar_leads(client, auth_headers):
    client.post('/api/leads', headers=auth_headers, json={
        'nome': 'Lead Lista S2', 'telefone': '11 90000-0001'
    })
    resp = client.get('/api/leads', headers=auth_headers)
    assert resp.status_code == 200
    leads = resp.get_json()
    assert isinstance(leads, list)
    assert len(leads) >= 1


def test_classificar_lead_ia(client, auth_headers):
    """Endpoint de classificação manual (IA valida, usuário confirma) funciona corretamente."""
    r = client.post('/api/leads', headers=auth_headers, json={
        'nome': 'Lead IA', 'telefone': '11 90000-0002',
        'tipo_servico': 'residencial', 'origem': 'instagram',
    })
    lead_id = r.get_json()['id']

    # Simula fluxo: usuário recebe sugestão da IA e confirma classificação
    resp = client.post(f'/api/leads/{lead_id}/classificar', headers=auth_headers, json={
        'classificacao': 'AA',
        'justificativa': 'Cliente premium confirmado pelo Mirante — mudança complexa, alto valor'
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['classificacao'] == 'AA'
    assert data['status'] == 'classificado'
    assert data['classificacao_justificativa']

    # Classificação inválida deve ser rejeitada
    resp_inv = client.post(f'/api/leads/{lead_id}/classificar', headers=auth_headers, json={
        'classificacao': 'INVALIDA'
    })
    assert resp_inv.status_code == 400


def test_criar_organizer(client, auth_headers):
    resp = client.post('/api/organizers', headers=auth_headers, json={
        'nome': 'Carla Organizer', 'instagram': '@carla.organizer', 'telefone': '(11) 98888-0001'
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert data['nome'] == 'Carla Organizer'

    # Sem nome deve falhar
    resp_inv = client.post('/api/organizers', headers=auth_headers, json={})
    assert resp_inv.status_code == 400

    # Listar traz o organizer criado
    lista = client.get('/api/organizers', headers=auth_headers)
    assert lista.status_code == 200
    nomes = [o['nome'] for o in lista.get_json()]
    assert 'Carla Organizer' in nomes


def test_metricas_organizer(client, auth_headers, app):
    """Organizer retorna métricas de leads indicados, convertidos e receita."""
    # Cria organizer
    r = client.post('/api/organizers', headers=auth_headers, json={
        'nome': 'Organizer Métricas', 'instagram': '@metricas', 'telefone': '11 97777-0001'
    })
    org_id = r.get_json()['id']

    # Cria 2 leads vinculados ao organizer
    r1 = client.post('/api/leads', headers=auth_headers, json={
        'nome': 'Lead M1', 'telefone': '11 96666-0001', 'organizer_id': org_id,
    })
    r2 = client.post('/api/leads', headers=auth_headers, json={
        'nome': 'Lead M2', 'telefone': '11 96666-0002', 'organizer_id': org_id,
    })
    lid2 = r2.get_json()['id']

    # Converte o segundo lead
    client.post(f'/api/leads/{lid2}/classificar', headers=auth_headers,
                json={'classificacao': 'A', 'justificativa': 'Boa aderência'})
    client.post(f'/api/leads/{lid2}/converter', headers=auth_headers)

    # Verifica métricas na listagem
    resp = client.get('/api/organizers', headers=auth_headers)
    assert resp.status_code == 200
    orgs = resp.get_json()
    org = next((o for o in orgs if o['id'] == org_id), None)
    assert org is not None
    assert org['total_leads'] >= 2
    assert org['convertidos'] >= 1
    assert 'taxa_conversao' in org
    assert org['taxa_conversao'] > 0


def test_lead_sem_classificacao_nao_avanca(client, auth_headers):
    """Lead sem classificação não pode ser convertido em orçamento."""
    r = client.post('/api/leads', headers=auth_headers, json={
        'nome': 'Lead Bloqueado', 'telefone': '11 95555-0001'
    })
    lead_id = r.get_json()['id']

    # Tenta converter sem classificar — deve falhar
    resp = client.post(f'/api/leads/{lead_id}/converter', headers=auth_headers)
    assert resp.status_code == 400
    assert 'classificado' in resp.get_json()['erro'].lower()

    # Verifica que status não mudou
    lead = client.get(f'/api/leads/{lead_id}', headers=auth_headers).get_json()
    assert lead['status'] == 'novo'
