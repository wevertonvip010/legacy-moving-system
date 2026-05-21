from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from src.models_simple import Cliente, Orcamento, Financeiro, GuardaMoveis, Estoque
from datetime import datetime, timedelta

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/metricas', methods=['GET'])
@jwt_required()
def get_metricas():
    """Obter métricas principais do dashboard"""
    try:
        # Buscar dados dos últimos 30 dias
        data_limite = datetime.utcnow() - timedelta(days=30)
        
        # Contar mudanças agendadas (simulado)
        mudancas_agendadas = 24
        
        # Contar visitas pendentes
        clientes = Cliente.get_all()
        visitas_pendentes = len([c for c in clientes if c.get('status') == 'Visita Agendada'])
        
        # Contar boxes ocupados (simulado)
        boxes_ocupados = 42
        
        # Calcular faturamento mensal (simulado)
        faturamento_mensal = 45320.00
        
        return jsonify({
            "metricas": {
                "mudancas_agendadas": mudancas_agendadas,
                "visitas_pendentes": visitas_pendentes,
                "boxes_ocupados": boxes_ocupados,
                "faturamento_mensal": faturamento_mensal
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route('/atividades-recentes', methods=['GET'])
@jwt_required()
def get_atividades_recentes():
    """Obter atividades recentes"""
    try:
        # Simular atividades recentes
        atividades = [
            {
                "id": "1",
                "tipo": "mudanca",
                "titulo": "Mudança agendada",
                "descricao": "Cliente: Carlos Silva",
                "data": datetime.utcnow() - timedelta(hours=2),
                "status": "agendada",
                "icone": "truck"
            },
            {
                "id": "2",
                "tipo": "pagamento",
                "titulo": "Pagamento recebido",
                "descricao": "R$ 2.500,00 - Contrato #1082",
                "data": datetime.utcnow() - timedelta(hours=5),
                "status": "recebido",
                "icone": "dollar-sign"
            },
            {
                "id": "3",
                "tipo": "contrato",
                "titulo": "Novo contrato Self Storage",
                "descricao": "Box #15 - Cliente: Ana Paula",
                "data": datetime.utcnow() - timedelta(hours=8),
                "status": "novo",
                "icone": "file-text"
            }
        ]
        
        # Converter datetime para string
        for atividade in atividades:
            atividade['data'] = atividade['data'].isoformat()
        
        return jsonify({"atividades": atividades}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route('/calendario', methods=['GET'])
@jwt_required()
def get_calendario():
    """Obter eventos do calendário"""
    try:
        # Simular eventos do calendário
        eventos = [
            {
                "id": "1",
                "titulo": "Visita - Carlos Silva",
                "data": "2025-06-19",
                "tipo": "visita",
                "cor": "red"
            },
            {
                "id": "2",
                "titulo": "Pagamento Contrato #1082",
                "data": "2025-06-19",
                "tipo": "pagamento",
                "cor": "green"
            },
            {
                "id": "3",
                "titulo": "Mudança Família Oliveira",
                "data": "2025-06-20",
                "tipo": "mudanca",
                "cor": "blue"
            },
            {
                "id": "4",
                "titulo": "Contrato Storage Ana Paula",
                "data": "2025-06-21",
                "tipo": "contrato",
                "cor": "orange"
            },
            {
                "id": "5",
                "titulo": "Mudança Escritório",
                "data": "2025-06-25",
                "tipo": "mudanca",
                "cor": "blue"
            }
        ]
        
        return jsonify({"eventos": eventos}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route('/notificacoes', methods=['GET'])
@jwt_required()
def get_notificacoes():
    """Obter notificações do sistema"""
    try:
        # Simular notificações
        notificacoes = [
            {
                "id": "1",
                "titulo": "Nova licitação encontrada",
                "mensagem": "Licitação para mudança de órgão público - Valor: R$ 150.000",
                "tipo": "licitacao",
                "lida": False,
                "data": datetime.utcnow() - timedelta(minutes=30)
            },
            {
                "id": "2",
                "titulo": "Estoque baixo",
                "mensagem": "Caixas de papelão: apenas 15 unidades restantes",
                "tipo": "estoque",
                "lida": False,
                "data": datetime.utcnow() - timedelta(hours=2)
            },
            {
                "id": "3",
                "titulo": "Novo lead capturado",
                "mensagem": "João Silva - Gerente de Facilities na Tech Corp",
                "tipo": "lead",
                "lida": True,
                "data": datetime.utcnow() - timedelta(hours=4)
            }
        ]
        
        # Converter datetime para string
        for notificacao in notificacoes:
            notificacao['data'] = notificacao['data'].isoformat()
        
        return jsonify({"notificacoes": notificacoes}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route('/resumo-modulos', methods=['GET'])
@jwt_required()
def get_resumo_modulos():
    """Obter resumo dos módulos com badges de notificação"""
    try:
        # Contar itens pendentes em cada módulo
        clientes = Cliente.get_all()
        
        resumo = {
            "clientes": len([c for c in clientes if c.get('status') == 'Novo']),
            "visitas": len([c for c in clientes if c.get('status') == 'Visita Agendada']),
            "orcamentos": 4,  # Simulado
            "contratos": 5,   # Simulado
            "ordens_servico": 6,  # Simulado
            "self_storage": 7,    # Simulado
            "financeiro": 8,      # Simulado
            "marketing": 9,       # Simulado
            "vendas": 10,         # Simulado
            "estoque": 11,        # Simulado
            "programa_pontos": 12, # Simulado
            "calendario": 13,      # Simulado
            "graficos": 14,        # Simulado
            "configuracoes": 15,   # Simulado
            "leads_linkedin": 0    # Novo módulo
        }
        
        return jsonify({"resumo_modulos": resumo}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

