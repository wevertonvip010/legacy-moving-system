from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import json
from src.models import User
from src.database import Database

manychat_bp = Blueprint('manychat', __name__)
db = Database()

@manychat_bp.route('/webhook', methods=['POST'])
def webhook_manychat():
    """Webhook para receber leads do ManyChat"""
    try:
        data = request.get_json()
        
        # Extrair dados do lead do ManyChat
        lead_data = {
            'nome': data.get('first_name', '') + ' ' + data.get('last_name', ''),
            'telefone': data.get('phone', ''),
            'email': data.get('email', ''),
            'origem': 'ManyChat',
            'canal': data.get('source', 'WhatsApp'),  # WhatsApp, Instagram, etc.
            'mensagem_inicial': data.get('last_input_text', ''),
            'user_id': data.get('user_id', ''),
            'status': 'novo',
            'data_criacao': datetime.utcnow().isoformat(),
            'tags': data.get('tags', []),
            'custom_fields': data.get('custom_fields', {})
        }
        
        # Salvar lead no banco de dados
        collection = db.get_collection('leads')
        lead_id = collection.insert_one(lead_data).inserted_id
        
        # Log para debug
        print(f"Novo lead recebido do ManyChat: {lead_data['nome']} - {lead_data['telefone']}")
        
        return jsonify({
            "status": "success",
            "message": "Lead recebido com sucesso",
            "lead_id": str(lead_id)
        }), 200
        
    except Exception as e:
        print(f"Erro no webhook ManyChat: {e}")
        return jsonify({"error": str(e)}), 500

@manychat_bp.route('/leads', methods=['GET'])
@jwt_required()
def listar_leads():
    """Listar todos os leads do ManyChat"""
    try:
        collection = db.get_collection('leads')
        
        # Filtros opcionais
        status = request.args.get('status', None)
        canal = request.args.get('canal', None)
        data_inicio = request.args.get('data_inicio', None)
        data_fim = request.args.get('data_fim', None)
        
        # Construir query
        query = {}
        if status:
            query['status'] = status
        if canal:
            query['canal'] = canal
        if data_inicio and data_fim:
            query['data_criacao'] = {
                '$gte': data_inicio,
                '$lte': data_fim
            }
        
        # Buscar leads
        leads = list(collection.find(query).sort('data_criacao', -1))
        
        # Converter ObjectId para string
        for lead in leads:
            lead['_id'] = str(lead['_id'])
        
        return jsonify({
            "leads": leads,
            "total": len(leads)
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@manychat_bp.route('/leads/<lead_id>', methods=['PUT'])
@jwt_required()
def atualizar_lead(lead_id):
    """Atualizar status e informações de um lead"""
    try:
        user_id = get_jwt_identity()
        user = User.get_by_id(user_id)
        
        data = request.get_json()
        
        # Campos permitidos para atualização
        update_data = {}
        if 'status' in data:
            update_data['status'] = data['status']
        if 'observacoes' in data:
            update_data['observacoes'] = data['observacoes']
        if 'responsavel' in data:
            update_data['responsavel'] = data['responsavel']
        if 'valor_estimado' in data:
            update_data['valor_estimado'] = data['valor_estimado']
        if 'data_contato' in data:
            update_data['data_contato'] = data['data_contato']
        
        # Adicionar informações de auditoria
        update_data['ultima_atualizacao'] = datetime.utcnow().isoformat()
        update_data['atualizado_por'] = user['name']
        
        # Atualizar no banco
        collection = db.get_collection('leads')
        from bson import ObjectId
        result = collection.update_one(
            {'_id': ObjectId(lead_id)},
            {'$set': update_data}
        )
        
        if result.modified_count > 0:
            return jsonify({"message": "Lead atualizado com sucesso"}), 200
        else:
            return jsonify({"error": "Lead não encontrado"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@manychat_bp.route('/leads/<lead_id>/converter-cliente', methods=['POST'])
@jwt_required()
def converter_lead_cliente(lead_id):
    """Converter lead em cliente"""
    try:
        user_id = get_jwt_identity()
        user = User.get_by_id(user_id)
        
        # Buscar lead
        collection = db.get_collection('leads')
        from bson import ObjectId
        lead = collection.find_one({'_id': ObjectId(lead_id)})
        
        if not lead:
            return jsonify({"error": "Lead não encontrado"}), 404
        
        # Criar cliente baseado no lead
        cliente_data = {
            'nome': lead['nome'],
            'telefone': lead['telefone'],
            'email': lead['email'],
            'origem': 'Lead ManyChat',
            'canal_origem': lead['canal'],
            'data_criacao': datetime.utcnow().isoformat(),
            'criado_por': user['name'],
            'status': 'ativo',
            'observacoes': f"Convertido do lead ManyChat. Mensagem inicial: {lead.get('mensagem_inicial', '')}"
        }
        
        # Salvar cliente
        clientes_collection = db.get_collection('clientes')
        cliente_id = clientes_collection.insert_one(cliente_data).inserted_id
        
        # Atualizar status do lead
        collection.update_one(
            {'_id': ObjectId(lead_id)},
            {'$set': {
                'status': 'convertido',
                'cliente_id': str(cliente_id),
                'data_conversao': datetime.utcnow().isoformat(),
                'convertido_por': user['name']
            }}
        )
        
        return jsonify({
            "message": "Lead convertido em cliente com sucesso",
            "cliente_id": str(cliente_id)
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@manychat_bp.route('/estatisticas', methods=['GET'])
@jwt_required()
def estatisticas_leads():
    """Estatísticas dos leads do ManyChat"""
    try:
        collection = db.get_collection('leads')
        
        # Contar leads por status
        pipeline_status = [
            {'$group': {'_id': '$status', 'count': {'$sum': 1}}}
        ]
        stats_status = list(collection.aggregate(pipeline_status))
        
        # Contar leads por canal
        pipeline_canal = [
            {'$group': {'_id': '$canal', 'count': {'$sum': 1}}}
        ]
        stats_canal = list(collection.aggregate(pipeline_canal))
        
        # Leads por dia (últimos 30 dias)
        from datetime import timedelta
        data_limite = (datetime.utcnow() - timedelta(days=30)).isoformat()
        
        pipeline_diario = [
            {'$match': {'data_criacao': {'$gte': data_limite}}},
            {'$group': {
                '_id': {'$dateToString': {'format': '%Y-%m-%d', 'date': {'$dateFromString': {'dateString': '$data_criacao'}}}},
                'count': {'$sum': 1}
            }},
            {'$sort': {'_id': 1}}
        ]
        stats_diario = list(collection.aggregate(pipeline_diario))
        
        # Total de leads
        total_leads = collection.count_documents({})
        
        # Taxa de conversão
        leads_convertidos = collection.count_documents({'status': 'convertido'})
        taxa_conversao = (leads_convertidos / total_leads * 100) if total_leads > 0 else 0
        
        return jsonify({
            "total_leads": total_leads,
            "leads_convertidos": leads_convertidos,
            "taxa_conversao": round(taxa_conversao, 2),
            "por_status": stats_status,
            "por_canal": stats_canal,
            "por_dia": stats_diario
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@manychat_bp.route('/enviar-mensagem', methods=['POST'])
@jwt_required()
def enviar_mensagem_manychat():
    """Enviar mensagem via ManyChat (simulação)"""
    try:
        data = request.get_json()
        user_id_manychat = data.get('user_id')
        mensagem = data.get('mensagem')
        
        # Aqui seria a integração real com a API do ManyChat
        # Por enquanto, vamos simular o envio
        
        # Log da mensagem enviada
        collection = db.get_collection('mensagens_enviadas')
        mensagem_data = {
            'user_id_manychat': user_id_manychat,
            'mensagem': mensagem,
            'data_envio': datetime.utcnow().isoformat(),
            'status': 'enviada',
            'tipo': 'manychat'
        }
        
        collection.insert_one(mensagem_data)
        
        return jsonify({
            "message": "Mensagem enviada com sucesso",
            "status": "simulado"
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

