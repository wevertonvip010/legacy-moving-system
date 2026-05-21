"""
Sprint 0 — Testes de Fundação
Nomes exatos conforme spec do projeto.
"""
import pytest
from sqlalchemy import inspect


def test_banco_criado(app):
    """Todas as tabelas obrigatórias existem no banco."""
    with app.app_context():
        from database_real import db
        inspector = inspect(db.engine)
        tabelas = set(inspector.get_table_names())
        obrigatorias = {
            'users', 'leads', 'organizers', 'orcamentos',
            'cadastros_complementares', 'contratos', 'ordens_servico',
            'programacoes', 'estoque', 'movimentacoes_estoque',
            'guarda_moveis', 'recibos', 'despesas', 'metas', 'contadores',
            'clientes',
        }
        faltando = obrigatorias - tabelas
        assert not faltando, f"Tabelas faltando: {faltando}"


def test_admin_criado(client):
    """Admin padrão CPF 123.456.789-01 / senha 123456 faz login com sucesso."""
    resp = client.post('/api/auth/login', json={'cpf': '12345678901', 'password': '123456'})
    assert resp.status_code == 200
    data = resp.get_json()
    assert 'token' in data
    assert data['user']['role'] == 'admin'
    assert data['user']['cpf'] == '12345678901'


def test_senha_com_hash(app):
    """Senha do admin não está em texto puro no banco."""
    with app.app_context():
        from database_real import User
        admin = User.query.filter_by(cpf='12345678901').first()
        assert admin is not None, "Admin não encontrado"
        assert admin.password != '123456', "Senha está em texto puro"
        assert admin.password.startswith('scrypt:') or admin.password.startswith('pbkdf2:'), \
            f"Hash não reconhecido: {admin.password[:20]}..."


def test_jwt_valido(client):
    """Token JWT é gerado no login e validado em rota protegida."""
    resp = client.post('/api/auth/login', json={'cpf': '12345678901', 'password': '123456'})
    assert resp.status_code == 200
    token = resp.get_json()['token']
    assert token and len(token) > 20

    me = client.get('/api/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert me.status_code == 200
    assert me.get_json()['role'] == 'admin'


def test_perfis_acesso(client, app):
    """Perfis admin/vendedor/operacional/financeiro existem e são criáveis."""
    with app.app_context():
        from database_real import db, User
        from werkzeug.security import generate_password_hash

        perfis = ['vendedor', 'operacional', 'financeiro']
        for perfil in perfis:
            cpf = f'00000000{perfis.index(perfil) + 1:03d}'
            if not User.query.filter_by(cpf=cpf).first():
                db.session.add(User(
                    cpf=cpf,
                    password=generate_password_hash('123456'),
                    name=f'Teste {perfil.title()}',
                    role=perfil,
                    email=f'{perfil}@test.com'
                ))
            db.session.commit()

        for perfil in perfis:
            cpf = f'00000000{perfis.index(perfil) + 1:03d}'
            u = User.query.filter_by(cpf=cpf).first()
            assert u is not None, f"Usuário {perfil} não encontrado"
            assert u.role == perfil

        admin = User.query.filter_by(cpf='12345678901').first()
        assert admin.role == 'admin'


def test_numeracao_sequencial(client, auth_headers):
    """Numeração ORC gera ORC-AAAA-001, ORC-AAAA-002 em sequência."""
    r1 = client.post('/api/orcamentos', json={'cliente': 'Cliente Numeração 1'}, headers=auth_headers)
    r2 = client.post('/api/orcamentos', json={'cliente': 'Cliente Numeração 2'}, headers=auth_headers)
    assert r1.status_code == 201
    assert r2.status_code == 201

    num1 = r1.get_json()['numero']
    num2 = r2.get_json()['numero']

    assert num1.startswith('ORC-'), f"Prefixo errado: {num1}"
    assert num2.startswith('ORC-'), f"Prefixo errado: {num2}"

    seq1 = int(num1.split('-')[2])
    seq2 = int(num2.split('-')[2])
    assert seq2 == seq1 + 1, f"Numeração não sequencial: {num1} → {num2}"


def test_20_boxes_criados(app):
    """Exatamente 20 boxes de guarda-móveis foram criados na inicialização."""
    with app.app_context():
        from database_real import GuardaMovel
        total = GuardaMovel.query.count()
        assert total == 20, f"Esperado 20 boxes, encontrado {total}"

        # Verifica que todos os 20 números existem (independente do status corrente)
        numeros = {b.numero for b in GuardaMovel.query.all()}
        for i in range(1, 21):
            esperado = f'Box {str(i).zfill(2)}'
            assert esperado in numeros, f"{esperado} não encontrado"


def test_health_endpoint(client):
    """/api/health retorna 200 sem autenticação."""
    resp = client.get('/api/health')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['status'] == 'ok'
    assert 'Legacy Moving' in data['sistema']
    assert 'timestamp' in data
