from flask import Blueprint, request, jsonify
from datetime import datetime
from src.database import db

os_estoque_bp = Blueprint('os_estoque', __name__, url_prefix='/api/os')

@os_estoque_bp.route('/', methods=['GET'])
def listar_os():
    """Listar ordens de serviço"""
    status = request.args.get('status', 'todos')
    
    os_list = db.ordens_servico.find()
    
    if status != 'todos':
        os_list = [o for o in os_list if o.get('status') == status]
    
    return jsonify(os_list)

@os_estoque_bp.route('/', methods=['POST'])
def criar_os():
    """Criar nova O.S."""
    data = request.json
    
    os_data = {
        'numero': f"OS-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        'cliente': data.get('cliente'),
        'orcamento_id': data.get('orcamento_id'),
        'data_programada': data.get('data_programada'),
        'equipe': data.get('equipe', []),
        'materiais': data.get('materiais', []),
        'status': 'pendente',
        'data_criacao': datetime.now().isoformat(),
        'valor_total': 0,
        'custos': {
            'caminhao': 0,
            'ajudantes': 0,
            'materiais': 0,
            'combustivel': 0,
            'pedagio': 0,
            'extras': 0
        }
    }
    
    result = db.ordens_servico.insert_one(os_data)
    os_data['_id'] = result.inserted_id
    
    return jsonify(os_data), 201

@os_estoque_bp.route('/<os_id>/iniciar', methods=['POST'])
def iniciar_os(os_id):
    """Iniciar O.S. - dar baixa no estoque"""
    data = request.json
    materiais_usados = data.get('materiais', [])
    
    # Dar baixa no estoque
    for material in materiais_usados:
        estoque = db.estoque.find_one({'material_id': material.get('id')})
        if estoque:
            nova_quantidade = estoque.get('quantidade', 0) - material.get('quantidade', 0)
            
            # Verificar estoque mínimo
            estoque_minimo = estoque.get('estoque_minimo', 0)
            alerta = nova_quantidade < estoque_minimo
            
            update = {'$set': {
                'quantidade': nova_quantidade,
                'alerta_critico': alerta,
                'ultima_atualizacao': datetime.now().isoformat()
            }}
            db.estoque.update_one({'material_id': material.get('id')}, update)
    
    # Atualizar O.S.
    update = {'$set': {
        'status': 'em_andamento',
        'data_inicio': datetime.now().isoformat(),
        'materiais_usados': materiais_usados
    }}
    db.ordens_servico.update_one({'_id': os_id}, update)
    
    return jsonify({'status': 'iniciada', 'estoque_atualizado': True})

@os_estoque_bp.route('/<os_id>/finalizar', methods=['POST'])
def finalizar_os(os_id):
    """Finalizar O.S. - registrar custos e gerar recibo"""
    data = request.json
    custos = data.get('custos', {})
    materiais_retorno = data.get('materiais_retorno', [])
    
    # Registrar retorno de materiais
    for material in materiais_retorno:
        estoque = db.estoque.find_one({'material_id': material.get('id')})
        if estoque:
            nova_quantidade = estoque.get('quantidade', 0) + material.get('quantidade', 0)
            update = {'$set': {
                'quantidade': nova_quantidade,
                'ultima_atualizacao': datetime.now().isoformat()
            }}
            db.estoque.update_one({'material_id': material.get('id')}, update)
    
    # Calcular valor total
    valor_total = sum(custos.values())
    
    # Atualizar O.S.
    update = {'$set': {
        'status': 'finalizada',
        'data_fim': datetime.now().isoformat(),
        'custos': custos,
        'valor_total': valor_total
    }}
    db.ordens_servico.update_one({'_id': os_id}, update)
    
    # Registrar no financeiro
    financeiro = {
        'os_id': os_id,
        'tipo': 'despesa_operacional',
        'valor': valor_total,
        'categoria': 'O.S.',
        'data': datetime.now().isoformat(),
        'detalhes': custos
    }
    db.financeiro.insert_one(financeiro)
    
    return jsonify({'status': 'finalizada', 'valor_total': valor_total})

@os_estoque_bp.route('/estoque', methods=['GET'])
def listar_estoque():
    """Listar estoque"""
    estoque = db.estoque.find()
    return jsonify(estoque)

@os_estoque_bp.route('/estoque', methods=['POST'])
def adicionar_estoque():
    """Adicionar item ao estoque"""
    data = request.json
    
    item = {
        'material': data.get('material'),
        'quantidade': int(data.get('quantidade', 0)),
        'estoque_minimo': int(data.get('estoque_minimo', 10)),
        'valor_unitario': float(data.get('valor_unitario', 0)),
        'alerta_critico': False,
        'data_criacao': datetime.now().isoformat()
    }
    
    result = db.estoque.insert_one(item)
    item['_id'] = result.inserted_id
    
    return jsonify(item), 201

@os_estoque_bp.route('/estoque/<estoque_id>', methods=['PUT'])
def atualizar_estoque(estoque_id):
    """Atualizar quantidade no estoque"""
    data = request.json
    
    update = {'$set': {
        'quantidade': int(data.get('quantidade', 0)),
        'ultima_atualizacao': datetime.now().isoformat()
    }}
    result = db.estoque.update_one({'_id': estoque_id}, update)
    
    if result.modified_count:
        return jsonify({'status': 'atualizado'})
    return jsonify({'erro': 'não encontrado'}), 404

@os_estoque_bp.route('/estoque/alertas', methods=['GET'])
def alertas_estoque():
    """Listar alertas de estoque baixo/crítico"""
    estoque = db.estoque.find()
    alertas = []
    
    for item in estoque:
        if item.get('quantidade', 0) < item.get('estoque_minimo', 10):
            alertas.append({
                'material': item.get('material'),
                'quantidade': item.get('quantidade'),
                'minimo': item.get('estoque_minimo'),
                'tipo': 'critico' if item.get('quantidade', 0) == 0 else 'baixo'
            })
    
    return jsonify(alertas)
