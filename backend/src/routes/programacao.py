from flask import Blueprint, request, jsonify
from datetime import datetime
from src.database import db

programacao_bp = Blueprint('programacao', __name__, url_prefix='/api/programacao')

@programacao_bp.route('/', methods=['GET'])
def listar_programacoes():
    """Listar programações da semana"""
    semana = request.args.get('semana', datetime.now().isocalendar()[1])
    ano = request.args.get('ano', datetime.now().year)
    
    programacoes = db.programacoes.find({'semana': int(semana), 'ano': int(ano)})
    return jsonify(programacoes)

@programacao_bp.route('/', methods=['POST'])
def criar_programacao():
    """Criar nova programação"""
    data = request.json
    
    programacao = {
        'cliente': data.get('cliente'),
        'dias': data.get('dias', []),
        'pessoas_por_dia': data.get('pessoas_por_dia', 1),
        'equipe': data.get('equipe', []),
        'caminhao': data.get('caminhao'),
        'valor_estimado': data.get('valor_estimado', 0),
        'status': 'pendente',
        'data_criacao': datetime.now().isoformat(),
        'semana': datetime.now().isocalendar()[1],
        'ano': datetime.now().year
    }
    
    result = db.programacoes.insert_one(programacao)
    programacao['_id'] = result.inserted_id
    
    return jsonify(programacao), 201

@programacao_bp.route('/<programa_id>', methods=['PUT'])
def atualizar_programacao(programa_id):
    """Atualizar programação"""
    data = request.json
    
    update = {'$set': data}
    result = db.programacoes.update_one({'_id': programa_id}, update)
    
    if result.modified_count:
        return jsonify({'status': 'atualizado'})
    return jsonify({'erro': 'não encontrado'}), 404

@programacao_bp.route('/<programa_id>/equipe', methods=['PUT'])
def atualizar_equipe_programacao(programa_id):
    """Atualizar equipe da programação"""
    data = request.json
    
    update = {'$set': {'equipe': data.get('equipe', [])}}
    result = db.programacoes.update_one({'_id': programa_id}, update)
    
    if result.modified_count:
        return jsonify({'status': 'equipe atualizada'})
    return jsonify({'erro': 'não encontrado'}), 404

@programacao_bp.route('/<programa_id>/confirmar', methods=['POST'])
def confirmar_programacao(programa_id):
    """Confirmar programação (programador conclui)"""
    update = {'$set': {'status': 'confirmada', 'data_confirmacao': datetime.now().isoformat()}}
    result = db.programacoes.update_one({'_id': programa_id}, update)
    
    if result.modified_count:
        return jsonify({'status': 'confirmada'})
    return jsonify({'erro': 'não encontrado'}), 404
