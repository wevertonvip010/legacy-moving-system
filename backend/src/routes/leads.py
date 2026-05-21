from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from src.models_simple import Lead

leads_bp = Blueprint('leads', __name__)

@leads_bp.route('/', methods=['GET'])
@jwt_required()
def get_leads():
    """Listar todos os leads"""
    try:
        leads = Lead.get_all()
        return jsonify({"leads": leads}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@leads_bp.route('/', methods=['POST'])
@jwt_required()
def create_lead():
    """Criar novo lead"""
    try:
        data = request.get_json()
        
        # Validações básicas
        required_fields = ['nome', 'cargo', 'empresa']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"Campo {field} é obrigatório"}), 400
        
        lead_id = Lead.create(data)
        return jsonify({
            "message": "Lead criado com sucesso",
            "lead_id": lead_id
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@leads_bp.route('/capturar', methods=['POST'])
@jwt_required()
def capturar_leads():
    """Simular captura automática de leads do LinkedIn"""
    try:
        data = request.get_json()
        filtros = data.get('filtros', {})
        
        # Simular captura (em produção, integraria com LinkedIn API)
        leads_simulados = [
            {
                "nome": "João Silva",
                "cargo": "Gerente de Facilities",
                "empresa": "Tech Corp",
                "localizacao": "São Paulo, SP",
                "linkedin_url": "https://linkedin.com/in/joaosilva",
                "status": "Novo",
                "fonte": "LinkedIn"
            },
            {
                "nome": "Maria Santos",
                "cargo": "Coordenadora de Mudanças",
                "empresa": "Global Solutions",
                "localizacao": "Rio de Janeiro, RJ",
                "linkedin_url": "https://linkedin.com/in/mariasantos",
                "status": "Novo",
                "fonte": "LinkedIn"
            }
        ]
        
        leads_criados = []
        for lead_data in leads_simulados:
            lead_id = Lead.create(lead_data)
            leads_criados.append(lead_id)
        
        return jsonify({
            "message": f"{len(leads_criados)} leads capturados com sucesso",
            "leads_ids": leads_criados
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@leads_bp.route('/exportar', methods=['GET'])
@jwt_required()
def exportar_leads():
    """Exportar leads em formato CSV"""
    try:
        leads = Lead.get_all()
        
        # Simular exportação CSV (retornar dados estruturados)
        csv_data = []
        for lead in leads:
            csv_data.append({
                "Nome": lead.get("nome", ""),
                "Cargo": lead.get("cargo", ""),
                "Empresa": lead.get("empresa", ""),
                "Email": lead.get("email", ""),
                "Telefone": lead.get("telefone", ""),
                "Localização": lead.get("localizacao", ""),
                "Status": lead.get("status", ""),
                "Data Criação": lead.get("created_at", "").strftime("%d/%m/%Y %H:%M") if lead.get("created_at") else ""
            })
        
        return jsonify({
            "message": "Dados preparados para exportação",
            "data": csv_data,
            "total": len(csv_data)
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

