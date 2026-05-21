import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from main import app as flask_app
from database_real import db as _db


@pytest.fixture(scope='session')
def app():
    flask_app.config['TESTING'] = True
    flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    flask_app.config['JWT_SECRET_KEY'] = 'test-secret-32-chars-long-for-hmac'
    with flask_app.app_context():
        _db.create_all()
        _seed_admin()
        _seed_boxes()
        _seed_estoque()
        yield flask_app
        _db.drop_all()


def _seed_admin():
    from database_real import User
    from werkzeug.security import generate_password_hash
    if not User.query.filter_by(cpf='12345678901').first():
        admin = User(cpf='12345678901', password=generate_password_hash('123456'),
                     name='Admin Teste', role='admin', email='admin@test.com')
        _db.session.add(admin)
        _db.session.commit()


def _seed_boxes():
    from database_real import GuardaMovel
    if GuardaMovel.query.count() == 0:
        for i in range(1, 21):
            _db.session.add(GuardaMovel(numero=f'Box {str(i).zfill(2)}', status='livre'))
        _db.session.commit()


def _seed_estoque():
    from database_real import Estoque
    if Estoque.query.count() == 0:
        _db.session.add(Estoque(material='Caixa M', unidade='un', quantidade=50,
                                estoque_minimo=10, estoque_critico=5, valor_unitario=5.0))
        _db.session.commit()


@pytest.fixture(scope='session')
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def rollback_after_test(app):
    """Limpa sessão após cada teste para evitar PendingRollbackError em cascata."""
    yield
    with app.app_context():
        _db.session.rollback()
        _db.session.remove()


@pytest.fixture(scope='session')
def auth_headers(client):
    resp = client.post('/api/auth/login', json={'cpf': '12345678901', 'password': '123456'})
    assert resp.status_code == 200, f"Login falhou: {resp.get_data(as_text=True)}"
    token = resp.get_json()['token']
    return {'Authorization': f'Bearer {token}'}
