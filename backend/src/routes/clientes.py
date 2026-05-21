from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from src.models_simple import Cliente
from datetime import datetime

clientes_bp = Blueprint('clientes', __name__)

@clientes_bp.route('/', methods=['GET'])
@jwt_required()
def get_clientes():
    """Listar todos os clientes"""
    try:
        clientes = Cliente.get_all()
        return jsonify({"clientes": clientes}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@clientes_bp.route('/', methods=['POST'])
@jwt_required()
def create_cliente():
    """Criar novo cliente"""
    try:
        data = request.get_json()
        
        # Validações básicas
        required_fields = ['nome', 'email', 'telefone']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"Campo {field} é obrigatório"}), 400
        
        cliente_id = Cliente.create(data)
        return jsonify({
            "message": "Cliente criado com sucesso",
            "cliente_id": cliente_id
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@clientes_bp.route('/<cliente_id>', methods=['GET'])
@jwt_required()
def get_cliente(cliente_id):
    """Obter cliente por ID"""
    try:
        cliente = Cliente.get_by_id(cliente_id)
        if not cliente:
            return jsonify({"error": "Cliente não encontrado"}), 404
        
        return jsonify({"cliente": cliente}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@clientes_bp.route('/<cliente_id>', methods=['PUT'])
@jwt_required()
def update_cliente(cliente_id):
    """Atualizar cliente"""
    try:
        data = request.get_json()
        
        success = Cliente.update(cliente_id, data)
        if not success:
            return jsonify({"error": "Cliente não encontrado"}), 404
        
        return jsonify({"message": "Cliente atualizado com sucesso"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@clientes_bp.route('/<cliente_id>/status', methods=['PUT'])
@jwt_required()
def update_status_cliente(cliente_id):
    """Atualizar status do cliente"""
    try:
        data = request.get_json()
        status = data.get('status')
        justificativa = data.get('justificativa', '')
        
        if not status:
            return jsonify({"error": "Status é obrigatório"}), 400
        
        # Se status for "Perdido", justificativa é obrigatória
        if status == "Perdido" and not justificativa:
            return jsonify({"error": "Justificativa é obrigatória para status 'Perdido'"}), 400
        
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow()
        }
        
        if justificativa:
            update_data["justificativa"] = justificativa
        
        success = Cliente.update(cliente_id, update_data)
        if not success:
            return jsonify({"error": "Cliente não encontrado"}), 404
        
        return jsonify({"message": "Status atualizado com sucesso"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@clientes_bp.route('/pre-cadastro', methods=['POST'])
def pre_cadastro():
    """Endpoint para pré-cadastro de clientes (sem autenticação)"""
    try:
        data = request.get_json()
        
        # Validações básicas
        required_fields = ['nome', 'email']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"Campo {field} é obrigatório"}), 400
        
        # Adicionar dados padrão para pré-cadastro
        data['status'] = 'Novo'
        data['fonte'] = data.get('fonte', 'Site/Instagram')
        
        cliente_id = Cliente.create(data)
        return jsonify({
            "message": "Pré-cadastro realizado com sucesso",
            "cliente_id": cliente_id
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

