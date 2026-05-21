from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import requests
import json
from datetime import datetime
from src.config import Config

whatsapp_bp = Blueprint('whatsapp', __name__)

# Configurações do Authentic API (simulado)
AUTHENTIC_API_URL = "https://api.authentic.com.br"
AUTHENTIC_TOKEN = Config.AUTHENTIC_API_KEY

@whatsapp_bp.route('/enviar-mensagem', methods=['POST'])
@jwt_required()
def enviar_mensagem():
    """Enviar mensagem via WhatsApp usando Authentic API"""
    try:
        data = request.get_json()
        
        telefone = data.get('telefone', '')
        mensagem = data.get('mensagem', '')
        tipo = data.get('tipo', 'texto')  # texto, imagem, documento
        
        # Limpar telefone (remover caracteres especiais)
        telefone_limpo = ''.join(filter(str.isdigit, telefone))
        
        if not telefone_limpo or not mensagem:
            return jsonify({"error": "Telefone e mensagem são obrigatórios"}), 400
        
        # Payload para Authentic API (simulado)
        payload = {
            "phone": telefone_limpo,
            "message": mensagem,
            "type": tipo
        }
        
        headers = {
            "Authorization": f"Bearer {AUTHENTIC_TOKEN}",
            "Content-Type": "application/json"
        }
        
        # Simular envio (em produção, fazer requisição real)
        if not AUTHENTIC_TOKEN:
            # Modo simulação
            return jsonify({
                "success": True,
                "message": "Mensagem enviada (simulação)",
                "telefone": telefone_limpo,
                "status": "delivered",
                "timestamp": datetime.now().isoformat()
            }), 200
        
        try:
            # Em produção, fazer requisição real para Authentic API
            # response = requests.post(f"{AUTHENTIC_API_URL}/send", json=payload, headers=headers)
            # result = response.json()
            
            # Simulação de resposta
            result = {
                "success": True,
                "message_id": f"msg_{datetime.now().timestamp()}",
                "status": "sent"
            }
            
            return jsonify({
                "success": True,
                "message": "Mensagem enviada com sucesso",
                "telefone": telefone_limpo,
                "message_id": result.get("message_id"),
                "status": result.get("status"),
                "timestamp": datetime.now().isoformat()
            }), 200
            
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Erro na API Authentic: {str(e)}"
            }), 500
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@whatsapp_bp.route('/enviar-template', methods=['POST'])
@jwt_required()
def enviar_template():
    """Enviar template personalizado via WhatsApp"""
    try:
        data = request.get_json()
        
        telefone = data.get('telefone', '')
        template_tipo = data.get('template', 'boas_vindas')
        variaveis = data.get('variaveis', {})
        
        # Templates predefinidos
        templates = {
            'boas_vindas': """
Olá {nome}! 👋

Bem-vindo à VIP Mudanças! 

Recebemos seu contato e nossa equipe entrará em contato em breve para agendar uma visita técnica gratuita.

📞 Contato: (11) 99999-9999
🌐 Site: vipmudancas.com.br

Obrigado pela confiança! 🚚
            """,
            'agendamento_visita': """
Olá {nome}! 📅

Sua visita técnica foi agendada:

📍 Endereço: {endereco}
🕐 Data/Hora: {data_hora}
👨‍💼 Consultor: {consultor}

Estaremos no local no horário combinado.

Dúvidas? Entre em contato: (11) 99999-9999
            """,
            'orcamento_pronto': """
Olá {nome}! 💰

Seu orçamento está pronto!

💵 Valor: R$ {valor}
📋 Serviços: {servicos}
⏰ Validade: {validade}

Para confirmar, responda este WhatsApp ou ligue:
📞 (11) 99999-9999

Aguardamos seu retorno! 🚚
            """,
            'lembrete_pagamento': """
Olá {nome}! 💳

Lembramos que o vencimento do seu pagamento é amanhã:

💰 Valor: R$ {valor}
📅 Vencimento: {vencimento}
🏦 Forma: {forma_pagamento}

Para evitar atrasos, efetue o pagamento hoje.

Dúvidas? (11) 99999-9999
            """
        }
        
        # Obter template
        template = templates.get(template_tipo, templates['boas_vindas'])
        
        # Substituir variáveis
        try:
            mensagem = template.format(**variaveis)
        except KeyError as e:
            return jsonify({"error": f"Variável obrigatória não fornecida: {e}"}), 400
        
        # Enviar mensagem
        telefone_limpo = ''.join(filter(str.isdigit, telefone))
        
        # Simular envio
        return jsonify({
            "success": True,
            "message": "Template enviado com sucesso",
            "telefone": telefone_limpo,
            "template": template_tipo,
            "preview": mensagem[:100] + "...",
            "timestamp": datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@whatsapp_bp.route('/webhook', methods=['POST'])
def webhook_whatsapp():
    """Webhook para receber mensagens do WhatsApp"""
    try:
        data = request.get_json()
        
        # Processar mensagem recebida
        telefone = data.get('from', '')
        mensagem = data.get('message', '')
        timestamp = data.get('timestamp', datetime.now().isoformat())
        
        # Log da mensagem recebida
        print(f"Mensagem recebida de {telefone}: {mensagem}")
        
        # Aqui você pode implementar lógica de resposta automática
        # Por exemplo, responder com menu de opções
        
        resposta_automatica = """
Olá! Obrigado por entrar em contato com a VIP Mudanças! 🚚

Escolha uma opção:
1️⃣ Solicitar orçamento
2️⃣ Agendar visita
3️⃣ Falar com consultor
4️⃣ Acompanhar mudança

Digite o número da opção desejada.
        """
        
        # Em produção, enviar resposta automática
        # enviar_mensagem_automatica(telefone, resposta_automatica)
        
        return jsonify({
            "success": True,
            "message": "Webhook processado",
            "action": "auto_response_sent"
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@whatsapp_bp.route('/status-mensagem/<message_id>', methods=['GET'])
@jwt_required()
def status_mensagem(message_id):
    """Verificar status de uma mensagem enviada"""
    try:
        # Em produção, consultar API Authentic
        # Simulação de status
        status_simulado = {
            "message_id": message_id,
            "status": "delivered",
            "timestamp": datetime.now().isoformat(),
            "read": True,
            "delivered_at": datetime.now().isoformat()
        }
        
        return jsonify(status_simulado), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@whatsapp_bp.route('/campanhas', methods=['POST'])
@jwt_required()
def criar_campanha():
    """Criar campanha de WhatsApp para múltiplos contatos"""
    try:
        data = request.get_json()
        
        nome_campanha = data.get('nome', '')
        contatos = data.get('contatos', [])  # Lista de telefones
        template = data.get('template', '')
        variaveis_globais = data.get('variaveis', {})
        agendamento = data.get('agendamento', None)  # Para envio futuro
        
        if not contatos:
            return jsonify({"error": "Lista de contatos é obrigatória"}), 400
        
        # Simular criação de campanha
        campanha_id = f"camp_{datetime.now().timestamp()}"
        
        # Em produção, processar envios em background
        resultados = []
        for contato in contatos:
            telefone = contato.get('telefone', '')
            variaveis_personalizadas = {**variaveis_globais, **contato.get('variaveis', {})}
            
            # Simular envio
            resultado = {
                "telefone": telefone,
                "status": "agendado" if agendamento else "enviado",
                "timestamp": datetime.now().isoformat()
            }
            resultados.append(resultado)
        
        return jsonify({
            "success": True,
            "campanha_id": campanha_id,
            "nome": nome_campanha,
            "total_contatos": len(contatos),
            "status": "criada",
            "resultados": resultados
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@whatsapp_bp.route('/bot-config', methods=['GET', 'POST'])
@jwt_required()
def bot_config():
    """Configurar bot de atendimento automático"""
    try:
        if request.method == 'GET':
            # Retornar configuração atual
            config_atual = {
                "ativo": True,
                "horario_funcionamento": {
                    "inicio": "08:00",
                    "fim": "18:00",
                    "dias": ["segunda", "terca", "quarta", "quinta", "sexta"]
                },
                "mensagem_fora_horario": "Olá! Nosso atendimento funciona de segunda a sexta, das 8h às 18h. Deixe sua mensagem que retornaremos em breve!",
                "menu_principal": [
                    {"opcao": "1", "texto": "Solicitar orçamento", "acao": "orcamento"},
                    {"opcao": "2", "texto": "Agendar visita", "acao": "agendamento"},
                    {"opcao": "3", "texto": "Falar com consultor", "acao": "humano"},
                    {"opcao": "4", "texto": "Acompanhar mudança", "acao": "acompanhamento"}
                ]
            }
            
            return jsonify(config_atual), 200
        
        else:  # POST
            # Atualizar configuração
            nova_config = request.get_json()
            
            # Em produção, salvar no banco de dados
            return jsonify({
                "success": True,
                "message": "Configuração do bot atualizada",
                "config": nova_config
            }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

