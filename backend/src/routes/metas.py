from flask import Blueprint, request, jsonify
from datetime import datetime
from src.database import db

metas_bp = Blueprint('metas', __name__, url_prefix='/api/metas')

@metas_bp.route('/', methods=['GET'])
def listar_metas():
    """Listar metas com filtros"""
    tipo = request.args.get('tipo', 'todos')
    periodo = request.args.get('periodo', 'todos')
    
    metas = db.metas.find()
    
    if tipo != 'todos':
        metas = [m for m in metas if m.get('tipo') == tipo]
    
    if periodo != 'todos':
        metas = [m for m in metas if m.get('periodo') == periodo]
    
    return jsonify(metas)

@metas_bp.route('/', methods=['POST'])
def criar_meta():
    """Criar nova meta"""
    data = request.json
    
    meta = {
        'titulo': data.get('titulo'),
        'tipo': data.get('tipo', 'global'),
        'periodo': data.get('periodo', 'mensal'),
        'meta': float(data.get('meta', 0)),
        'realizado': 0,
        'responsavel': data.get('responsavel', 'Todos'),
        'unidade': data.get('unidade', ''),
        'status': 'em_progresso',
        'data_inicio': data.get('data_inicio', datetime.now().isoformat()),
        'data_fim': data.get('data_fim'),
        'data_criacao': datetime.now().isoformat()
    }
    
    result = db.metas.insert_one(meta)
    meta['_id'] = result.inserted_id
    
    return jsonify(meta), 201

@metas_bp.route('/<meta_id>', methods=['PUT'])
def atualizar_meta(meta_id):
    """Atualizar meta (incluindo progresso)"""
    data = request.json
    
    update = {'$set': data}
    result = db.metas.update_one({'_id': meta_id}, update)
    
    if result.modified_count:
        return jsonify({'status': 'atualizado'})
    return jsonify({'erro': 'não encontrado'}), 404

@metas_bp.route('/<meta_id>/progresso', methods=['PUT'])
def atualizar_progresso_meta(meta_id):
    """Atualizar progresso da meta"""
    data = request.json
    realizado = float(data.get('realizado', 0))
    
    update = {'$set': {'realizado': realizado}}
    result = db.metas.update_one({'_id': meta_id}, update)
    
    if result.modified_count:
        return jsonify({'status': 'progresso atualizado'})
    return jsonify({'erro': 'não encontrado'}), 404

@metas_bp.route('/<meta_id>', methods=['DELETE'])
def deletar_meta(meta_id):
    """Deletar meta"""
    # Implementar delete se necessário
    return jsonify({'status': 'deletado'})

@metas_bp.route('/ranking', methods=['GET'])
def ranking_metas():
    """Ranking de metas por colaborador"""
    metas = db.metas.find({'tipo': 'colaborador'})
    
    ranking = []
    for meta in metas:
        progresso = (meta.get('realizado', 0) / meta.get('meta', 1)) * 100 if meta.get('meta') else 0
        ranking.append({
            'responsavel': meta.get('responsavel'),
            'titulo': meta.get('titulo'),
            'progresso': progresso,
            'realizado': meta.get('realizado'),
            'meta': meta.get('meta')
        })
    
    ranking.sort(key=lambda x: x['progresso'], reverse=True)
    return jsonify(ranking)
