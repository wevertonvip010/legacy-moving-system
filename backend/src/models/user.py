from bson import ObjectId
from database import db
import bcrypt
from datetime import datetime

class User:
    collection = db.users
    
    @staticmethod
    def create_user(cpf, password, name, role='colaborador'):
        """Criar novo usuário"""
        # Limpar CPF (remover pontos e traços)
        cpf_clean = ''.join(filter(str.isdigit, cpf))
        
        # Verificar se usuário já existe
        if User.collection.find_one({"cpf": cpf_clean}):
            return None
        
        # Hash da senha
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        user_data = {
            "cpf": cpf_clean,
            "password": password_hash,
            "name": name,
            "role": role,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "active": True
        }
        
        result = User.collection.insert_one(user_data)
        return str(result.inserted_id)
    
    @staticmethod
    def authenticate(cpf, password):
        """Autenticar usuário"""
        # Limpar CPF (remover pontos e traços)
        cpf_clean = ''.join(filter(str.isdigit, cpf))
        
        user = User.collection.find_one({"cpf": cpf_clean, "active": True})
        if user and bcrypt.checkpw(password.encode('utf-8'), user['password']):
            return User.to_dict(user)
        return None
    
    @staticmethod
    def find_by_cpf(cpf):
        """Buscar usuário por CPF"""
        cpf_clean = ''.join(filter(str.isdigit, cpf))
        user = User.collection.find_one({"cpf": cpf_clean})
        return User.to_dict(user) if user else None
    
    @staticmethod
    def find_by_id(user_id):
        """Buscar usuário por ID"""
        user = User.collection.find_one({"_id": ObjectId(user_id)})
        return User.to_dict(user) if user else None
    
    @staticmethod
    def verify_password(password, password_hash):
        """Verificar senha"""
        return bcrypt.checkpw(password.encode('utf-8'), password_hash)
    
    @staticmethod
    def to_dict(user_doc):
        """Converter documento do MongoDB para dict"""
        if not user_doc:
            return None
        
        return {
            'id': str(user_doc['_id']),
            'cpf': user_doc['cpf'],
            'name': user_doc['name'],
            'role': user_doc['role'],
            'active': user_doc.get('active', True),
            'created_at': user_doc.get('created_at'),
            'updated_at': user_doc.get('updated_at')
        }
