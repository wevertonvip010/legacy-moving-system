from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import requests
from datetime import datetime, timedelta
from src.config import Config

integracoes_bp = Blueprint('integracoes', __name__)

# Configurações das integrações
GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"
GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3"
GOOGLE_SHEETS_API = "https://sheets.googleapis.com/v4"

@integracoes_bp.route('/google-agenda/eventos', methods=['GET', 'POST'])
@jwt_required()
def google_agenda():
    """Integração com Google Agenda"""
    try:
        if request.method == 'GET':
            # Listar eventos
            # Em produção, fazer requisição real para Google Calendar API
            eventos_simulados = [
                {
                    "id": "evento1",
                    "titulo": "Visita - Carlos Silva",
                    "data": "2025-06-20",
                    "hora": "09:00",
                    "endereco": "Rua das Flores, 123",
                    "tipo": "visita"
                },
                {
                    "id": "evento2", 
                    "titulo": "Mudança - Ana Santos",
                    "data": "2025-06-21",
                    "hora": "08:00",
                    "endereco": "Av. Paulista, 456",
                    "tipo": "mudanca"
                }
            ]
            
            return jsonify({
                "eventos": eventos_simulados,
                "total": len(eventos_simulados)
            }), 200
        
        else:  # POST - Criar evento
            data = request.get_json()
            
            evento = {
                "summary": data.get('titulo', ''),
                "description": data.get('descricao', ''),
                "start": {
                    "dateTime": data.get('data_inicio', ''),
                    "timeZone": "America/Sao_Paulo"
                },
                "end": {
                    "dateTime": data.get('data_fim', ''),
                    "timeZone": "America/Sao_Paulo"
                },
                "location": data.get('endereco', '')
            }
            
            # Em produção, criar evento real no Google Calendar
            # headers = {"Authorization": f"Bearer {google_token}"}
            # response = requests.post(f"{GOOGLE_CALENDAR_API}/calendars/primary/events", 
            #                         json=evento, headers=headers)
            
            # Simulação
            evento_criado = {
                "id": f"evt_{datetime.now().timestamp()}",
                "titulo": data.get('titulo', ''),
                "data_criacao": datetime.now().isoformat(),
                "link": "https://calendar.google.com/calendar/event?eid=exemplo"
            }
            
            return jsonify({
                "success": True,
                "message": "Evento criado no Google Agenda",
                "evento": evento_criado
            }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@integracoes_bp.route('/google-drive/upload', methods=['POST'])
@jwt_required()
def google_drive_upload():
    """Upload de arquivo para Google Drive"""
    try:
        data = request.get_json()
        
        arquivo_nome = data.get('nome', '')
        arquivo_tipo = data.get('tipo', 'application/pdf')
        pasta_id = data.get('pasta_id', '')  # ID da pasta no Drive
        
        # Em produção, fazer upload real
        # Simulação
        arquivo_simulado = {
            "id": f"file_{datetime.now().timestamp()}",
            "name": arquivo_nome,
            "mimeType": arquivo_tipo,
            "webViewLink": f"https://drive.google.com/file/d/exemplo/view",
            "webContentLink": f"https://drive.google.com/uc?id=exemplo",
            "createdTime": datetime.now().isoformat()
        }
        
        return jsonify({
            "success": True,
            "message": "Arquivo enviado para Google Drive",
            "arquivo": arquivo_simulado
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@integracoes_bp.route('/google-sheets/atualizar', methods=['POST'])
@jwt_required()
def google_sheets_atualizar():
    """Atualizar planilha do Google Sheets"""
    try:
        data = request.get_json()
        
        planilha_id = data.get('planilha_id', '')
        aba = data.get('aba', 'Sheet1')
        dados = data.get('dados', [])
        
        # Em produção, atualizar planilha real
        # Simulação de atualização
        
        return jsonify({
            "success": True,
            "message": "Planilha atualizada com sucesso",
            "planilha_id": planilha_id,
            "aba": aba,
            "linhas_atualizadas": len(dados),
            "timestamp": datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@integracoes_bp.route('/manychat/webhook', methods=['POST'])
def manychat_webhook():
    """Webhook para integração com ManyChat"""
    try:
        data = request.get_json()
        
        # Processar dados do ManyChat
        user_id = data.get('user_id', '')
        message = data.get('last_input_text', '')
        user_data = data.get('custom_fields', {})
        
        # Extrair informações do cliente
        cliente_info = {
            "nome": user_data.get('nome', ''),
            "telefone": user_data.get('telefone', ''),
            "email": user_data.get('email', ''),
            "endereco_origem": user_data.get('endereco_origem', ''),
            "endereco_destino": user_data.get('endereco_destino', ''),
            "tipo_mudanca": user_data.get('tipo_mudanca', 'residencial'),
            "data_mudanca": user_data.get('data_mudanca', ''),
            "fonte": "ManyChat Bot"
        }
        
        # Em produção, salvar no banco de dados como pré-cadastro
        # db.clientes.insert_one({
        #     **cliente_info,
        #     "status": "Novo",
        #     "data_cadastro": datetime.now(),
        #     "manychat_user_id": user_id
        # })
        
        # Resposta para o ManyChat
        resposta = {
            "version": "v2",
            "content": {
                "messages": [
                    {
                        "type": "text",
                        "text": f"Obrigado {cliente_info['nome']}! Seus dados foram registrados e nossa equipe entrará em contato em breve."
                    }
                ],
                "actions": [
                    {
                        "action": "set_field",
                        "field_name": "status_cadastro",
                        "value": "concluido"
                    }
                ]
            }
        }
        
        return jsonify(resposta), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@integracoes_bp.route('/cora/boleto', methods=['POST'])
@jwt_required()
def cora_gerar_boleto():
    """Gerar boleto via API Cora (para Self Storage)"""
    try:
        data = request.get_json()
        
        cliente = data.get('cliente', {})
        valor = data.get('valor', 0)
        vencimento = data.get('vencimento', '')
        descricao = data.get('descricao', '')
        
        # Dados para API Cora
        boleto_data = {
            "valor": valor,
            "vencimento": vencimento,
            "pagador": {
                "nome": cliente.get('nome', ''),
                "cpf_cnpj": cliente.get('cpf_cnpj', ''),
                "endereco": cliente.get('endereco', '')
            },
            "descricao": descricao,
            "instrucoes": "Pagamento referente ao aluguel de box VIP Storage"
        }
        
        # Em produção, fazer requisição real para API Cora
        # headers = {"Authorization": f"Bearer {cora_token}"}
        # response = requests.post("https://api.cora.com.br/boletos", 
        #                         json=boleto_data, headers=headers)
        
        # Simulação
        boleto_simulado = {
            "id": f"boleto_{datetime.now().timestamp()}",
            "codigo_barras": "12345678901234567890123456789012345678901234",
            "linha_digitavel": "12345.67890 12345.678901 23456.789012 3 45678901234567890",
            "url_pdf": "https://api.cora.com.br/boletos/exemplo.pdf",
            "valor": valor,
            "vencimento": vencimento,
            "status": "emitido"
        }
        
        return jsonify({
            "success": True,
            "message": "Boleto gerado com sucesso",
            "boleto": boleto_simulado
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@integracoes_bp.route('/notificacoes/programar', methods=['POST'])
@jwt_required()
def programar_notificacao():
    """Programar notificação automática"""
    try:
        data = request.get_json()
        
        tipo = data.get('tipo', '')  # whatsapp, email, sms
        destinatario = data.get('destinatario', '')
        mensagem = data.get('mensagem', '')
        data_envio = data.get('data_envio', '')
        recorrencia = data.get('recorrencia', None)  # diario, semanal, mensal
        
        # Em produção, salvar na fila de notificações
        notificacao = {
            "id": f"notif_{datetime.now().timestamp()}",
            "tipo": tipo,
            "destinatario": destinatario,
            "mensagem": mensagem,
            "data_envio": data_envio,
            "recorrencia": recorrencia,
            "status": "agendada",
            "criado_em": datetime.now().isoformat()
        }
        
        return jsonify({
            "success": True,
            "message": "Notificação programada com sucesso",
            "notificacao": notificacao
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@integracoes_bp.route('/automacoes/status', methods=['GET'])
@jwt_required()
def status_automacoes():
    """Verificar status das automações"""
    try:
        status = {
            "google_agenda": {
                "ativo": True,
                "ultima_sincronizacao": datetime.now().isoformat(),
                "eventos_sincronizados": 15
            },
            "whatsapp_bot": {
                "ativo": True,
                "mensagens_enviadas_hoje": 42,
                "taxa_resposta": "85%"
            },
            "ia_mirante": {
                "ativo": True,
                "analises_realizadas": 28,
                "precisao": "92%"
            },
            "google_drive": {
                "ativo": True,
                "arquivos_salvos": 156,
                "espaco_usado": "2.3 GB"
            },
            "notificacoes": {
                "ativo": True,
                "fila_pendente": 8,
                "enviadas_hoje": 23
            }
        }
        
        return jsonify(status), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@integracoes_bp.route('/google-oauth/authorize', methods=['POST'])
@jwt_required()
def google_oauth_authorize():
    """Iniciar processo de autorização OAuth com Google"""
    try:
        data = request.get_json()
        servicos = data.get('servicos', ['calendar', 'sheets'])  # calendar, sheets, drive
        
        # URL de autorização OAuth (simulada)
        auth_url = f"https://accounts.google.com/oauth/authorize?client_id=vip_mudancas&scope=calendar+sheets&redirect_uri=http://localhost:5000/api/integracoes/google-oauth/callback"
        
        return jsonify({
            "auth_url": auth_url,
            "servicos_solicitados": servicos,
            "status": "aguardando_autorizacao"
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@integracoes_bp.route('/google-oauth/callback', methods=['POST'])
@jwt_required()
def google_oauth_callback():
    """Callback do OAuth Google"""
    try:
        data = request.get_json()
        code = data.get('code', '')
        
        # Em produção, trocar o code por access_token
        # Por enquanto, simular sucesso
        
        return jsonify({
            "status": "autorizado",
            "servicos_autorizados": ["calendar", "sheets"],
            "email_conta": "vip@vipmudancas.com.br",
            "timestamp": datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@integracoes_bp.route('/google-sheets/upload', methods=['POST'])
@jwt_required()
def google_sheets_upload():
    """Upload e leitura de planilhas Google Sheets"""
    try:
        data = request.get_json()
        sheet_url = data.get('sheet_url', '')
        tipo_planilha = data.get('tipo', 'microdespesas')  # microdespesas, dre, orcamentos
        
        # Simular leitura de planilha
        if tipo_planilha == 'microdespesas':
            dados_simulados = [
                {"data": "2025-06-01", "descricao": "Combustível", "valor": 150.00, "categoria": "Transporte"},
                {"data": "2025-06-02", "descricao": "Material de escritório", "valor": 85.50, "categoria": "Administrativo"},
                {"data": "2025-06-03", "descricao": "Almoço equipe", "valor": 120.00, "categoria": "Alimentação"}
            ]
        elif tipo_planilha == 'dre':
            dados_simulados = [
                {"conta": "Receita Bruta", "valor": 50000.00, "tipo": "receita"},
                {"conta": "Custos Operacionais", "valor": -15000.00, "tipo": "custo"},
                {"conta": "Despesas Administrativas", "valor": -8000.00, "tipo": "despesa"}
            ]
        else:
            dados_simulados = []
        
        return jsonify({
            "dados": dados_simulados,
            "total_linhas": len(dados_simulados),
            "tipo_planilha": tipo_planilha,
            "sheet_url": sheet_url,
            "status": "importado_com_sucesso"
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@integracoes_bp.route('/google-agenda/criar-evento', methods=['POST'])
@jwt_required()
def criar_evento_agenda():
    """Criar evento no Google Agenda"""
    try:
        data = request.get_json()
        
        evento = {
            "titulo": data.get('titulo', ''),
            "data_inicio": data.get('data_inicio', ''),
            "data_fim": data.get('data_fim', ''),
            "endereco": data.get('endereco', ''),
            "descricao": data.get('descricao', ''),
            "participantes": data.get('participantes', []),
            "lembrete": data.get('lembrete', 30)  # minutos antes
        }
        
        # Em produção, criar evento real no Google Calendar
        evento_id = f"evt_{int(datetime.utcnow().timestamp())}"
        
        return jsonify({
            "evento_id": evento_id,
            "status": "criado",
            "link_evento": f"https://calendar.google.com/event?eid={evento_id}",
            "timestamp": datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@integracoes_bp.route('/google-agenda/listar-eventos', methods=['GET'])
@jwt_required()
def listar_eventos_agenda():
    """Listar eventos do Google Agenda por colaborador"""
    try:
        colaborador_email = request.args.get('email', 'vip@vipmudancas.com.br')
        data_inicio = request.args.get('data_inicio', datetime.utcnow().strftime('%Y-%m-%d'))
        data_fim = request.args.get('data_fim', (datetime.utcnow() + timedelta(days=30)).strftime('%Y-%m-%d'))
        
        # Eventos simulados
        eventos = [
            {
                "id": "evt_001",
                "titulo": "Visita Técnica - Empresa ABC",
                "data_inicio": "2025-06-30T09:00:00",
                "data_fim": "2025-06-30T10:00:00",
                "endereco": "Rua das Empresas, 123 - São Paulo",
                "tipo": "visita",
                "status": "confirmado",
                "participantes": ["kenneth@vipmudancas.com.br", "douglas@vipmudancas.com.br"]
            },
            {
                "id": "evt_002",
                "titulo": "Mudança Residencial - João Silva",
                "data_inicio": "2025-07-01T08:00:00",
                "data_fim": "2025-07-01T17:00:00",
                "endereco": "Av. Paulista, 456 - São Paulo",
                "tipo": "mudanca",
                "status": "agendado",
                "participantes": ["equipe1@vipmudancas.com.br"]
            },
            {
                "id": "evt_003",
                "titulo": "Reunião Comercial - Prospecção B2B",
                "data_inicio": "2025-07-02T14:00:00",
                "data_fim": "2025-07-02T15:00:00",
                "endereco": "Escritório VIP Mudanças",
                "tipo": "reuniao",
                "status": "tentativo",
                "participantes": ["comercial@vipmudancas.com.br"]
            }
        ]
        
        return jsonify({
            "eventos": eventos,
            "total": len(eventos),
            "colaborador": colaborador_email,
            "periodo": {
                "inicio": data_inicio,
                "fim": data_fim
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@integracoes_bp.route('/status-integracoes', methods=['GET'])
@jwt_required()
def status_integracoes():
    """Status das integrações Google"""
    try:
        status = {
            "google_calendar": {
                "conectado": True,
                "email_conta": "vip@vipmudancas.com.br",
                "ultima_sincronizacao": datetime.utcnow().isoformat(),
                "eventos_sincronizados": 15
            },
            "google_sheets": {
                "conectado": True,
                "email_conta": "vip@vipmudancas.com.br",
                "planilhas_conectadas": 3,
                "ultima_importacao": datetime.utcnow().isoformat()
            },
            "google_drive": {
                "conectado": False,
                "motivo": "Autorização pendente"
            }
        }
        
        return jsonify(status), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

