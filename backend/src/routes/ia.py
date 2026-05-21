from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import openai
import os
from datetime import datetime, timedelta
from src.config import Config
from src.models import User

ia_bp = Blueprint('ia', __name__)

# Configurar OpenAI
openai.api_key = Config.OPENAI_API_KEY

@ia_bp.route('/feedback-desempenho', methods=['POST'])
@jwt_required()
def feedback_desempenho():
    """IA Mirante - Feedback personalizado sobre desempenho"""
    try:
        user_id = get_jwt_identity()
        user = User.get_by_id(user_id)
        
        data = request.get_json()
        orcamentos_mes = data.get('orcamentos_mes', 0)
        vendas_mes = data.get('vendas_mes', 0)
        meta_mensal = data.get('meta_mensal', 10)
        leads_convertidos = data.get('leads_convertidos', 0)
        
        # Calcular percentual da meta
        percentual_meta = (vendas_mes / meta_mensal * 100) if meta_mensal > 0 else 0
        
        prompt = f"""
        Analise o desempenho do colaborador {user['name']} da VIP Mudanças:
        
        Dados do mês:
        - Orçamentos realizados: {orcamentos_mes}
        - Vendas fechadas: {vendas_mes}
        - Meta mensal: {meta_mensal}
        - Percentual da meta: {percentual_meta:.1f}%
        - Leads convertidos: {leads_convertidos}
        
        Forneça um feedback construtivo e motivacional em até 150 palavras, incluindo:
        1. Análise do desempenho atual
        2. Pontos fortes identificados
        3. Áreas de melhoria
        4. Sugestão de ação específica
        """
        
        if not Config.OPENAI_API_KEY:
            if percentual_meta >= 100:
                feedback = f"Parabéns {user['name']}! Você atingiu {percentual_meta:.1f}% da meta. Excelente trabalho na conversão de leads. Continue focado na qualidade do atendimento e busque superar ainda mais suas metas."
            elif percentual_meta >= 70:
                feedback = f"{user['name']}, você está no caminho certo com {percentual_meta:.1f}% da meta. Foque em melhorar a taxa de conversão dos orçamentos. Considere fazer follow-up mais frequente com os clientes."
            else:
                feedback = f"{user['name']}, vamos acelerar! Você está em {percentual_meta:.1f}% da meta. Sugiro intensificar a prospecção e revisar sua abordagem de vendas. Cada orçamento é uma oportunidade!"
        else:
            try:
                response = openai.ChatCompletion.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": "Você é a IA Mirante, assistente motivacional especializada em vendas de mudanças. Seja positiva, construtiva e específica."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=200,
                    temperature=0.7
                )
                
                feedback = response.choices[0].message.content.strip()
                
            except Exception as e:
                print(f"Erro na API OpenAI: {e}")
                feedback = f"Olá {user['name']}! Continue focado em suas metas. Analise seus resultados e busque sempre melhorar sua abordagem com os clientes."
        
        return jsonify({
            "feedback": feedback,
            "percentual_meta": percentual_meta,
            "status_meta": "Atingida" if percentual_meta >= 100 else "Em andamento",
            "gerado_por": "IA Mirante",
            "timestamp": datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ia_bp.route('/sugestao-setor', methods=['POST'])
@jwt_required()
def sugestao_setor():
    """IA Mirante - Sugestões inteligentes por setor"""
    try:
        user_id = get_jwt_identity()
        user = User.get_by_id(user_id)
        
        data = request.get_json()
        setor = data.get('setor', 'comercial')  # comercial, operacional, financeiro
        contexto = data.get('contexto', '')
        
        prompts_setor = {
            'comercial': f"""
            Como IA Mirante, forneça 3 sugestões específicas para o setor comercial da VIP Mudanças:
            
            Colaborador: {user['name']}
            Contexto atual: {contexto}
            
            Foque em:
            - Estratégias de follow-up
            - Técnicas de fechamento
            - Prospecção de novos clientes
            
            Seja prática e específica. Máximo 120 palavras.
            """,
            'operacional': f"""
            Como IA Mirante, forneça 3 sugestões para otimizar as operações da VIP Mudanças:
            
            Colaborador: {user['name']}
            Contexto atual: {contexto}
            
            Foque em:
            - Eficiência logística
            - Gestão de equipes
            - Qualidade do serviço
            
            Seja prática e específica. Máximo 120 palavras.
            """,
            'financeiro': f"""
            Como IA Mirante, forneça 3 sugestões para o setor financeiro da VIP Mudanças:
            
            Colaborador: {user['name']}
            Contexto atual: {contexto}
            
            Foque em:
            - Controle de fluxo de caixa
            - Redução de custos
            - Análise de rentabilidade
            
            Seja prática e específica. Máximo 120 palavras.
            """
        }
        
        prompt = prompts_setor.get(setor, prompts_setor['comercial'])
        
        if not Config.OPENAI_API_KEY:
            sugestoes_simuladas = {
                'comercial': [
                    "Faça follow-up em 24h após envio do orçamento",
                    "Use WhatsApp para manter contato próximo com leads",
                    "Ofereça desconto progressivo para fechamento rápido"
                ],
                'operacional': [
                    "Otimize rotas de mudança para reduzir tempo",
                    "Implemente checklist digital para equipes",
                    "Monitore satisfação do cliente pós-mudança"
                ],
                'financeiro': [
                    "Analise margem de lucro por tipo de mudança",
                    "Negocie melhores condições com fornecedores",
                    "Implemente controle rigoroso de despesas"
                ]
            }
            sugestoes = sugestoes_simuladas.get(setor, sugestoes_simuladas['comercial'])
        else:
            try:
                response = openai.ChatCompletion.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": f"Você é a IA Mirante, especialista em gestão empresarial para mudanças. Foque no setor {setor}."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=150,
                    temperature=0.7
                )
                
                resultado = response.choices[0].message.content.strip()
                # Extrair sugestões (assumindo que vêm numeradas)
                sugestoes = [linha.strip() for linha in resultado.split('\n') if linha.strip() and any(char.isdigit() for char in linha[:3])]
                
            except Exception as e:
                print(f"Erro na API OpenAI: {e}")
                sugestoes = ["Mantenha foco na qualidade", "Busque sempre melhorar processos", "Monitore indicadores regularmente"]
        
        return jsonify({
            "setor": setor,
            "sugestoes": sugestoes,
            "colaborador": user['name'],
            "gerado_por": "IA Mirante",
            "timestamp": datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ia_bp.route('/mensagem-motivacional', methods=['POST'])
@jwt_required()
def mensagem_motivacional():
    """IA Mirante - Mensagens motivacionais personalizadas"""
    try:
        user_id = get_jwt_identity()
        user = User.get_by_id(user_id)
        
        data = request.get_json()
        meta_pessoal = data.get('meta_pessoal', '')  # ex: "carro novo", "casa própria"
        vendas_restantes = data.get('vendas_restantes', 5)
        contexto_atual = data.get('contexto_atual', '')
        
        prompt = f"""
        Crie uma mensagem motivacional personalizada para {user['name']} da VIP Mudanças:
        
        Meta pessoal: {meta_pessoal}
        Vendas restantes para a meta: {vendas_restantes}
        Contexto atual: {contexto_atual}
        
        A mensagem deve:
        - Ser motivacional e positiva
        - Conectar o trabalho com a meta pessoal
        - Incluir emoji apropriado
        - Ter máximo 100 palavras
        - Ser específica e pessoal
        """
        
        if not Config.OPENAI_API_KEY:
            if meta_pessoal:
                if vendas_restantes <= 2:
                    mensagem = f"🚀 {user['name']}, você está quase lá! Apenas {vendas_restantes} vendas e seu {meta_pessoal} estará mais próximo! Continue com essa energia!"
                else:
                    mensagem = f"💪 {user['name']}, cada venda te aproxima do seu {meta_pessoal}! Faltam {vendas_restantes} vendas. Você consegue!"
            else:
                mensagem = f"⭐ {user['name']}, você está fazendo um ótimo trabalho! Continue focado e determinado. Suas metas estão ao seu alcance!"
        else:
            try:
                response = openai.ChatCompletion.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": "Você é a IA Mirante, uma assistente motivacional carismática e positiva. Use emojis e seja pessoal."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=120,
                    temperature=0.8
                )
                
                mensagem = response.choices[0].message.content.strip()
                
            except Exception as e:
                print(f"Erro na API OpenAI: {e}")
                mensagem = f"🌟 {user['name']}, você tem potencial incrível! Continue focado em suas metas e sucesso virá!"
        
        return jsonify({
            "mensagem": mensagem,
            "colaborador": user['name'],
            "meta_pessoal": meta_pessoal,
            "gerado_por": "IA Mirante",
            "timestamp": datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ia_bp.route('/assistente-chat', methods=['POST'])
@jwt_required()
def assistente_chat():
    """IA Mirante - Chat do assistente interno"""
    try:
        user_id = get_jwt_identity()
        user = User.get_by_id(user_id)
        
        data = request.get_json()
        pergunta = data.get('pergunta', '')
        contexto = data.get('contexto', 'geral')
        
        prompt = f"""
        Você é a IA Mirante, assistente pessoal de {user['name']} na VIP Mudanças.
        
        Pergunta: {pergunta}
        Contexto: {contexto}
        
        Responda de forma:
        - Amigável e profissional
        - Específica para o negócio de mudanças
        - Prática e útil
        - Máximo 150 palavras
        
        Se a pergunta for sobre vendas, dê dicas específicas.
        Se for sobre operações, foque em eficiência.
        Se for pessoal/motivacional, seja encorajadora.
        """
        
        if not Config.OPENAI_API_KEY:
            respostas_simuladas = {
                'vendas': f"Olá {user['name']}! Para melhorar suas vendas, foque no follow-up rápido e na personalização do atendimento. Cada cliente é único!",
                'operacional': f"Oi {user['name']}! Para otimizar operações, sugiro padronizar processos e manter comunicação clara com a equipe.",
                'geral': f"Oi {user['name']}! Sou sua assistente Mirante. Como posso ajudar você hoje? Estou aqui para apoiar seu sucesso na VIP Mudanças!"
            }
            resposta = respostas_simuladas.get(contexto, respostas_simuladas['geral'])
        else:
            try:
                response = openai.ChatCompletion.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": f"Você é a IA Mirante, assistente pessoal amigável de {user['name']} na VIP Mudanças. Seja útil e motivadora."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=180,
                    temperature=0.7
                )
                
                resposta = response.choices[0].message.content.strip()
                
            except Exception as e:
                print(f"Erro na API OpenAI: {e}")
                resposta = f"Oi {user['name']}! Estou aqui para ajudar. No momento tenho algumas dificuldades técnicas, mas continue focado em suas metas!"
        
        return jsonify({
            "resposta": resposta,
            "colaborador": user['name'],
            "assistente": "IA Mirante",
            "timestamp": datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ia_bp.route('/analisar-vistoria', methods=['POST'])
@jwt_required()
def analisar_vistoria():
    """IA Mirante - Análise de vistoria com IA Vision"""
    try:
        user_id = get_jwt_identity()
        user = User.get_by_id(user_id)
        
        # Obter dados do formulário
        comodo = request.form.get('comodo', '')
        visita_id = request.form.get('visita_id', '')
        
        # Obter arquivos de imagem
        fotos = []
        for key in request.files:
            if key.startswith('foto_'):
                fotos.append(request.files[key])
        
        if not fotos:
            return jsonify({"error": "Nenhuma foto foi enviada"}), 400
        
        # Prompt para análise de vistoria
        prompt = f"""
        Analise as fotos do cômodo "{comodo}" para uma mudança residencial/comercial.
        
        Identifique:
        1. Móveis e objetos presentes
        2. Estime o volume em metros cúbicos (m³)
        3. Observe itens que precisam de cuidado especial
        4. Forneça observações sobre o transporte
        
        Responda em formato JSON com:
        - itens_identificados: lista de móveis/objetos
        - volume_estimado: número em m³
        - observacoes: texto com recomendações
        - confianca: percentual de 0-100
        """
        
        if not Config.OPENAI_API_KEY:
            # Simulação quando não há API key
            itens_simulados = {
                'Sala de Estar': ['Sofá 3 lugares', 'Mesa de centro', 'TV 55"', 'Estante'],
                'Quarto': ['Cama casal', 'Guarda-roupa', 'Cômoda', 'Mesa de cabeceira'],
                'Cozinha': ['Geladeira', 'Fogão', 'Mesa', 'Cadeiras', 'Armários'],
                'Banheiro': ['Gabinete', 'Espelho', 'Acessórios'],
                'Garagem': ['Ferramentas', 'Bicicletas', 'Caixas diversas']
            }
            
            itens = itens_simulados.get(comodo, ['Móveis diversos', 'Objetos pessoais'])
            volume = len(itens) * 1.5  # Estimativa baseada na quantidade de itens
            
            analise = {
                "itens_identificados": itens,
                "volume_estimado": round(volume, 1),
                "observacoes": f"Cômodo {comodo} com móveis de tamanho padrão. Recomenda-se cuidado especial com itens frágeis e eletrônicos.",
                "confianca": 85
            }
        else:
            try:
                # Preparar imagens para a API da OpenAI Vision
                import base64
                import io
                from PIL import Image
                
                imagens_base64 = []
                for foto in fotos[:3]:  # Limitar a 3 fotos para controlar custos
                    # Redimensionar imagem para economizar tokens
                    img = Image.open(foto.stream)
                    img.thumbnail((800, 600), Image.Resampling.LANCZOS)
                    
                    # Converter para base64
                    buffer = io.BytesIO()
                    img.save(buffer, format='JPEG', quality=85)
                    img_base64 = base64.b64encode(buffer.getvalue()).decode()
                    imagens_base64.append(img_base64)
                
                # Chamar API da OpenAI Vision
                messages = [
                    {
                        "role": "system",
                        "content": "Você é um especialista em mudanças que analisa fotos para estimar volumes e identificar itens."
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt}
                        ] + [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{img_base64}"
                                }
                            } for img_base64 in imagens_base64
                        ]
                    }
                ]
                
                response = openai.ChatCompletion.create(
                    model="gpt-4-vision-preview",
                    messages=messages,
                    max_tokens=500,
                    temperature=0.3
                )
                
                resultado = response.choices[0].message.content.strip()
                
                # Tentar extrair JSON da resposta
                import json
                try:
                    analise = json.loads(resultado)
                except:
                    # Se não conseguir parsear JSON, criar estrutura padrão
                    analise = {
                        "itens_identificados": ["Móveis identificados pela IA"],
                        "volume_estimado": 5.0,
                        "observacoes": resultado,
                        "confianca": 75
                    }
                
            except Exception as e:
                print(f"Erro na API OpenAI Vision: {e}")
                # Fallback para análise simulada
                analise = {
                    "itens_identificados": ["Móveis diversos", "Objetos pessoais"],
                    "volume_estimado": 5.0,
                    "observacoes": "Análise automática indisponível. Revisão manual recomendada.",
                    "confianca": 50
                }
        
        return jsonify({
            "comodo": comodo,
            "analise": analise,
            "analisado_por": "IA Mirante Vision",
            "timestamp": datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ia_bp.route('/gerar-pdf-vistoria', methods=['POST'])
@jwt_required()
def gerar_pdf_vistoria():
    """IA Mirante - Gerar PDF da vistoria com assinatura digital"""
    try:
        user_id = get_jwt_identity()
        user = User.get_by_id(user_id)
        
        data = request.get_json()
        visita_id = data.get('visita_id', '')
        comodos = data.get('comodos', [])
        volume_total = data.get('volume_total', 0)
        caixas_adicionais = data.get('caixas_adicionais', 0)
        observacoes = data.get('observacoes', '')
        assinatura_cliente = data.get('assinatura_cliente', '')
        nome_cliente = data.get('nome_cliente', '')
        data_vistoria = data.get('data_vistoria', datetime.utcnow().isoformat())
        
        # Gerar PDF usando ReportLab
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        import io
        
        # Criar buffer para o PDF
        buffer = io.BytesIO()
        
        # Criar documento PDF
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Título
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1  # Centralizado
        )
        story.append(Paragraph("RELATÓRIO DE VISTORIA INTELIGENTE", title_style))
        story.append(Paragraph("VIP Mudanças - IA Mirante", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Informações gerais
        info_data = [
            ['Data da Vistoria:', datetime.fromisoformat(data_vistoria.replace('Z', '+00:00')).strftime('%d/%m/%Y %H:%M')],
            ['Vistoriador:', user['name']],
            ['Cliente:', nome_cliente],
            ['ID da Visita:', visita_id],
            ['Volume Total:', f"{volume_total}m³"],
            ['Caixas Adicionais:', str(caixas_adicionais)]
        ]
        
        info_table = Table(info_data, colWidths=[2*inch, 3*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BACKGROUND', (1, 0), (1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(info_table)
        story.append(Spacer(1, 20))
        
        # Detalhes por cômodo
        story.append(Paragraph("ANÁLISE POR CÔMODO", styles['Heading2']))
        story.append(Spacer(1, 10))
        
        for comodo in comodos:
            if comodo.get('analise'):
                story.append(Paragraph(f"<b>{comodo['nome']}</b>", styles['Heading3']))
                
                # Itens identificados
                itens_text = ", ".join(comodo['analise']['itens_identificados'])
                story.append(Paragraph(f"<b>Itens:</b> {itens_text}", styles['Normal']))
                
                # Volume e observações
                story.append(Paragraph(f"<b>Volume:</b> {comodo['analise']['volume_estimado']}m³", styles['Normal']))
                story.append(Paragraph(f"<b>Observações:</b> {comodo['analise']['observacoes']}", styles['Normal']))
                story.append(Paragraph(f"<b>Confiança da IA:</b> {comodo['analise']['confianca']}%", styles['Normal']))
                story.append(Spacer(1, 10))
        
        # Observações gerais
        if observacoes:
            story.append(Paragraph("OBSERVAÇÕES GERAIS", styles['Heading2']))
            story.append(Paragraph(observacoes, styles['Normal']))
            story.append(Spacer(1, 20))
        
        # Assinatura
        story.append(Paragraph("ASSINATURA DIGITAL", styles['Heading2']))
        story.append(Spacer(1, 10))
        
        assinatura_data = [
            ['Cliente:', nome_cliente],
            ['Assinatura:', assinatura_cliente],
            ['Data:', datetime.now().strftime('%d/%m/%Y %H:%M')]
        ]
        
        assinatura_table = Table(assinatura_data, colWidths=[1.5*inch, 3.5*inch])
        assinatura_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(assinatura_table)
        
        # Rodapé
        story.append(Spacer(1, 30))
        story.append(Paragraph("Documento gerado automaticamente pela IA Mirante - VIP Mudanças", styles['Normal']))
        
        # Construir PDF
        doc.build(story)
        
        # Retornar PDF
        buffer.seek(0)
        pdf_data = buffer.getvalue()
        buffer.close()
        
        from flask import make_response
        response = make_response(pdf_data)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=vistoria_{visita_id}_{datetime.now().strftime("%Y%m%d")}.pdf'
        
        return response
        
    except Exception as e:
        print(f"Erro ao gerar PDF: {e}")
        return jsonify({"error": str(e)}), 500



@ia_bp.route('/gatilho-orcamento-fechado', methods=['POST'])
@jwt_required()
def gatilho_orcamento_fechado():
    """Gatilho automático quando um orçamento é fechado"""
    try:
        user_id = get_jwt_identity()
        user = User.get_by_id(user_id)
        
        data = request.get_json()
        valor_orcamento = data.get('valor_orcamento', 0)
        cliente_nome = data.get('cliente_nome', '')
        tipo_servico = data.get('tipo_servico', 'mudança')
        
        # Mensagem motivacional personalizada
        if valor_orcamento > 5000:
            nivel = "excelente"
            emoji = "🎉"
        elif valor_orcamento > 2000:
            nivel = "ótimo"
            emoji = "👏"
        else:
            nivel = "bom"
            emoji = "✅"
        
        mensagem = f"{emoji} {user['name']}, parabéns! Você fechou um {nivel} orçamento de R$ {valor_orcamento:,.2f} com {cliente_nome}. Continue assim e você estará cada vez mais próximo dos seus objetivos pessoais!"
        
        # Sugestão de próxima ação
        sugestao = "Aproveite o momentum! Faça follow-up com outros clientes em negociação e mantenha o foco na qualidade do atendimento."
        
        return jsonify({
            "mensagem": mensagem,
            "sugestao": sugestao,
            "tipo": "orcamento_fechado",
            "valor": valor_orcamento,
            "timestamp": datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ia_bp.route('/gatilho-meta-vendas', methods=['POST'])
@jwt_required()
def gatilho_meta_vendas():
    """Gatilho automático para acompanhamento de metas"""
    try:
        user_id = get_jwt_identity()
        user = User.get_by_id(user_id)
        
        data = request.get_json()
        vendas_atual = data.get('vendas_atual', 0)
        meta_mensal = data.get('meta_mensal', 10)
        dias_restantes = data.get('dias_restantes', 15)
        
        percentual = (vendas_atual / meta_mensal * 100) if meta_mensal > 0 else 0
        
        if percentual >= 100:
            mensagem = f"🏆 Incrível {user['name']}! Você atingiu {percentual:.1f}% da meta com {dias_restantes} dias de antecedência! Que tal mirar ainda mais alto? Seu carro novo está cada vez mais próximo! 🚗"
            sugestao = "Meta batida! Agora foque em superar suas expectativas e ajudar a equipe a atingir os objetivos coletivos."
        elif percentual >= 80:
            mensagem = f"🔥 Muito bem {user['name']}! Você está em {percentual:.1f}% da meta. Faltam apenas {meta_mensal - vendas_atual} vendas para bater a meta!"
            sugestao = "Você está quase lá! Intensifique o follow-up com leads quentes e mantenha o ritmo."
        elif percentual >= 50:
            mensagem = f"💪 {user['name']}, você está na metade do caminho com {percentual:.1f}% da meta. Ainda há {dias_restantes} dias para acelerar!"
            sugestao = "Hora de acelerar! Revise sua pipeline de vendas e foque nos clientes com maior potencial de fechamento."
        else:
            mensagem = f"⚡ {user['name']}, vamos com tudo! Você está em {percentual:.1f}% da meta. Cada dia conta para alcançar seus objetivos!"
            sugestao = "Intensifique a prospecção! Aumente o número de contatos diários e revise sua abordagem de vendas."
        
        return jsonify({
            "mensagem": mensagem,
            "sugestao": sugestao,
            "percentual_meta": percentual,
            "vendas_restantes": max(0, meta_mensal - vendas_atual),
            "tipo": "acompanhamento_meta",
            "timestamp": datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ia_bp.route('/gatilho-avaliacao-positiva', methods=['POST'])
@jwt_required()
def gatilho_avaliacao_positiva():
    """Gatilho automático quando uma avaliação positiva é registrada"""
    try:
        user_id = get_jwt_identity()
        user = User.get_by_id(user_id)
        
        data = request.get_json()
        nota_avaliacao = data.get('nota_avaliacao', 5)
        comentario_cliente = data.get('comentario_cliente', '')
        cliente_nome = data.get('cliente_nome', '')
        
        if nota_avaliacao >= 4:
            nivel = "excelente" if nota_avaliacao == 5 else "ótima"
            emoji = "⭐" * int(nota_avaliacao)
        else:
            nivel = "boa"
            emoji = "👍"
        
        mensagem = f"{emoji} {user['name']}, você recebeu uma {nivel} avaliação de {cliente_nome}! Isso mostra a qualidade do seu trabalho e dedicação ao cliente."
        
        # Sugestão baseada na avaliação
        if nota_avaliacao >= 4:
            sugestao = "Cliente satisfeito é a melhor propaganda! Peça indicações e use esse feedback positivo para motivar a equipe."
        else:
            sugestao = "Continue melhorando! Use esse feedback para aprimorar ainda mais seu atendimento e superar as expectativas."
        
        return jsonify({
            "mensagem": mensagem,
            "sugestao": sugestao,
            "nota": nota_avaliacao,
            "cliente": cliente_nome,
            "tipo": "avaliacao_positiva",
            "timestamp": datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

