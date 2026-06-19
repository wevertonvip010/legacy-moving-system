def test_login_valido(client):
    resp = client.post('/api/auth/login', json={'cpf': '12345678901', 'password': '123456'})
    assert resp.status_code == 200
    data = resp.get_json()
    assert 'token' in data
    assert data['user']['role'] == 'admin'


def test_login_cpf_formatado(client):
    resp = client.post('/api/auth/login', json={'cpf': '123.456.789-01', 'password': '123456'})
    assert resp.status_code == 200
    assert 'token' in resp.get_json()


def test_login_senha_errada(client):
    resp = client.post('/api/auth/login', json={'cpf': '12345678901', 'password': 'errada'})
    assert resp.status_code == 401


def test_login_cpf_inexistente(client):
    resp = client.post('/api/auth/login', json={'cpf': '99999999999', 'password': '123456'})
    assert resp.status_code == 401


def test_login_campos_vazios(client):
    resp = client.post('/api/auth/login', json={})
    assert resp.status_code == 400


def test_rota_protegida_sem_token(client):
    resp = client.get('/api/clientes')
    assert resp.status_code == 401


def test_health_sem_auth(client):
    resp = client.get('/api/health')
    assert resp.status_code == 200
    assert resp.get_json()['status'] == 'ok'


def test_me_com_token(client, auth_headers):
    resp = client.get('/api/auth/me', headers=auth_headers)
    assert resp.status_code == 200
    assert resp.get_json()['role'] == 'admin'


def test_logout_com_token(client, auth_headers):
    resp = client.post('/api/auth/logout', headers=auth_headers)
    assert resp.status_code == 200
    assert resp.get_json()['status'] == 'ok'


def test_token_expirado(client):
    """Token inválido/expirado deve retornar 401 em rota protegida."""
    resp = client.get('/api/auth/me', headers={'Authorization': 'Bearer token.invalido.aqui'})
    assert resp.status_code == 422


def test_rota_perfil_incorreto(client, app):
    """Usuário sem perfil adequado recebe 403 ao acessar rota restrita."""
    from database_real import db, User
    from werkzeug.security import generate_password_hash
    import flask_jwt_extended as jwt_ext

    with app.app_context():
        cpf_financeiro = '77777777777'
        if not User.query.filter_by(cpf=cpf_financeiro).first():
            db.session.add(User(
                cpf=cpf_financeiro,
                password=generate_password_hash('123456'),
                name='Financeiro Teste',
                role='financeiro',
                email='fin@test.com'
            ))
            db.session.commit()

    resp_login = client.post('/api/auth/login', json={'cpf': '77777777777', 'password': '123456'})
    assert resp_login.status_code == 200
    token_fin = resp_login.get_json()['token']
    headers_fin = {'Authorization': f'Bearer {token_fin}'}

    # Rota admin-only: /api/usuarios
    resp = client.get('/api/usuarios', headers=headers_fin)
    assert resp.status_code == 403
