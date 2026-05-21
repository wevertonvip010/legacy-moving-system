from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from src.models_simple import Licitacao
from datetime import datetime

licitacoes_bp = Blueprint('licitacoes', __name__)

@licitacoes_bp.route('/', methods=['GET'])
@jwt_required()
def get_licitacoes():
    """Listar todas as licitações"""
    try:
        licitacoes = Licitacao.get_all()
        return jsonify({"licitacoes": licitacoes}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@licitacoes_bp.route('/buscar', methods=['POST'])
@jwt_required()
def buscar_licitacoes():
    """Simular busca automática de licitações"""
    try:
        data = request.get_json()
        palavras_chave = data.get('palavras_chave', ['mudança', 'remoção', 'transporte'])
        
        # Simular busca em portais (em produção, faria scraping real)
        licitacoes_simuladas = [
            {
                "titulo": "Contratação de serviços de mudança para órgão público",
                "orgao": "Prefeitura Municipal de São Paulo",
                "numero": "001/2025",
                "valor_estimado": 150000.00,
                "data_abertura": datetime(2025, 7, 15),
                "data_limite": datetime(2025, 7, 30),
                "status": "Aberta",
                "portal": "ComprasNet",
                "url": "https://comprasnet.gov.br/licitacao/001-2025",
                "palavras_encontradas": ["mudança", "transporte"],
                "descricao": "Serviços de mudança e transporte de móveis e equipamentos"
            },
            {
                "titulo": "Remoção de móveis e equipamentos - Hospital Regional",
                "orgao": "Secretaria de Saúde - RJ",
                "numero": "002/2025",
                "valor_estimado": 85000.00,
                "data_abertura": datetime(2025, 7, 20),
                "data_limite": datetime(2025, 8, 5),
                "status": "Aberta",
                "portal": "SIGA-RJ",
                "url": "https://siga.rj.gov.br/licitacao/002-2025",
                "palavras_encontradas": ["remoção"],
                "descricao": "Serviços de remoção e transporte de equipamentos hospitalares"
            }
        ]
        
        licitacoes_criadas = []
        for licitacao_data in licitacoes_simuladas:
            licitacao_id = Licitacao.create(licitacao_data)
            licitacoes_criadas.append(licitacao_id)
        
        return jsonify({
            "message": f"{len(licitacoes_criadas)} licitações encontradas",
            "licitacoes_ids": licitacoes_criadas,
            "palavras_chave_usadas": palavras_chave
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@licitacoes_bp.route('/monitorar', methods=['POST'])
@jwt_required()
def configurar_monitoramento():
    """Configurar monitoramento automático"""
    try:
        data = request.get_json()
        palavras_chave = data.get('palavras_chave', [])
        portais = data.get('portais', [])
        email_alertas = data.get('email_alertas', True)
        
        # Simular configuração de monitoramento
        config_monitoramento = {
            "palavras_chave": palavras_chave,
            "portais": portais,
            "email_alertas": email_alertas,
            "ativo": True,
            "ultima_busca": datetime.utcnow(),
            "configurado_em": datetime.utcnow()
        }
        
        return jsonify({
            "message": "Monitoramento configurado com sucesso",
            "configuracao": config_monitoramento
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@licitacoes_bp.route('/estatisticas', methods=['GET'])
@jwt_required()
def get_estatisticas():
    """Obter estatísticas das licitações"""
    try:
        todas_licitacoes = Licitacao.get_all()
        
        # Calcular estatísticas
        total = len(todas_licitacoes)
        abertas = len([l for l in todas_licitacoes if l.get('status') == 'Aberta'])
        urgentes = len([l for l in todas_licitacoes if l.get('data_limite') and 
                       (l['data_limite'] - datetime.utcnow()).days <= 7])
        
        valor_total = sum([l.get('valor_estimado', 0) for l in todas_licitacoes])
        
        return jsonify({
            "estatisticas": {
                "total": total,
                "abertas": abertas,
                "urgentes": urgentes,
                "valor_total": valor_total
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

