from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from datetime import datetime
import os
import tempfile

documentos_bp = Blueprint('documentos', __name__)

def create_pdf_styles():
    """Criar estilos personalizados para PDFs"""
    styles = getSampleStyleSheet()
    
    # Estilo para título principal
    styles.add(ParagraphStyle(
        name='TituloVIP',
        parent=styles['Title'],
        fontSize=18,
        spaceAfter=30,
        textColor=colors.HexColor('#1e40af'),
        alignment=1  # Centralizado
    ))
    
    # Estilo para subtítulos
    styles.add(ParagraphStyle(
        name='SubtituloVIP',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=12,
        textColor=colors.HexColor('#3b82f6')
    ))
    
    return styles

@documentos_bp.route('/gerar-contrato', methods=['POST'])
@jwt_required()
def gerar_contrato():
    """Gerar contrato de mudança em PDF"""
    try:
        data = request.get_json()
        
        # Dados do cliente
        cliente = data.get('cliente', {})
        servico = data.get('servico', {})
        
        # Gerar número sequencial (simulado)
        numero_contrato = data.get('numero', '001-2025')
        
        # Criar arquivo temporário
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            pdf_path = tmp_file.name
        
        # Criar documento PDF
        doc = SimpleDocTemplate(pdf_path, pagesize=A4)
        styles = create_pdf_styles()
        story = []
        
        # Cabeçalho
        story.append(Paragraph("VIP MUDANÇAS", styles['TituloVIP']))
        story.append(Paragraph("CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MUDANÇA", styles['SubtituloVIP']))
        story.append(Spacer(1, 20))
        
        # Número do contrato
        story.append(Paragraph(f"<b>Contrato Nº:</b> {numero_contrato}", styles['Normal']))
        story.append(Paragraph(f"<b>Data:</b> {datetime.now().strftime('%d/%m/%Y')}", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Dados do contratante
        story.append(Paragraph("<b>CONTRATANTE:</b>", styles['SubtituloVIP']))
        contratante_data = [
            ['Nome:', cliente.get('nome', '')],
            ['CPF/CNPJ:', cliente.get('cpf_cnpj', '')],
            ['Telefone:', cliente.get('telefone', '')],
            ['Email:', cliente.get('email', '')],
            ['Endereço:', cliente.get('endereco_origem', '')]
        ]
        
        contratante_table = Table(contratante_data, colWidths=[1.5*inch, 4*inch])
        contratante_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(contratante_table)
        story.append(Spacer(1, 20))
        
        # Dados do serviço
        story.append(Paragraph("<b>DADOS DO SERVIÇO:</b>", styles['SubtituloVIP']))
        servico_data = [
            ['Tipo de Mudança:', servico.get('tipo', 'Residencial')],
            ['Data da Mudança:', servico.get('data_mudanca', '')],
            ['Endereço Origem:', servico.get('endereco_origem', '')],
            ['Endereço Destino:', servico.get('endereco_destino', '')],
            ['Valor Total:', f"R$ {servico.get('valor_total', '0,00')}"],
            ['Forma de Pagamento:', servico.get('forma_pagamento', 'À vista')]
        ]
        
        servico_table = Table(servico_data, colWidths=[1.5*inch, 4*inch])
        servico_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(servico_table)
        story.append(Spacer(1, 20))
        
        # Cláusulas do contrato
        story.append(Paragraph("<b>CLÁUSULAS CONTRATUAIS:</b>", styles['SubtituloVIP']))
        
        clausulas = [
            "1. A VIP MUDANÇAS se compromete a executar os serviços de mudança conforme especificado neste contrato.",
            "2. O cliente se responsabiliza por embalar adequadamente objetos frágeis e de valor.",
            "3. A empresa não se responsabiliza por danos em objetos mal embalados pelo cliente.",
            "4. O pagamento deverá ser efetuado conforme acordado neste contrato.",
            "5. Cancelamentos com menos de 24h de antecedência estão sujeitos a multa de 30% do valor.",
            "6. A empresa possui seguro para cobertura de danos durante o transporte.",
            "7. Este contrato é válido por 30 dias a partir da data de assinatura."
        ]
        
        for clausula in clausulas:
            story.append(Paragraph(clausula, styles['Normal']))
            story.append(Spacer(1, 8))
        
        story.append(Spacer(1, 30))
        
        # Assinaturas
        story.append(Paragraph("<b>ASSINATURAS:</b>", styles['SubtituloVIP']))
        story.append(Spacer(1, 40))
        
        assinaturas_data = [
            ['_' * 30, '_' * 30],
            ['VIP MUDANÇAS', 'CONTRATANTE'],
            ['CNPJ: 12.345.678/0001-90', cliente.get('nome', '')]
        ]
        
        assinaturas_table = Table(assinaturas_data, colWidths=[2.5*inch, 2.5*inch])
        assinaturas_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(assinaturas_table)
        
        # Gerar PDF
        doc.build(story)
        
        # Ler arquivo e retornar base64 (simulado)
        with open(pdf_path, 'rb') as f:
            pdf_content = f.read()
        
        # Limpar arquivo temporário
        os.unlink(pdf_path)
        
        return jsonify({
            "message": "Contrato gerado com sucesso",
            "numero_contrato": numero_contrato,
            "arquivo": "contrato_base64_aqui",  # Em produção, retornaria o base64
            "tamanho": len(pdf_content)
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@documentos_bp.route('/gerar-ordem-servico', methods=['POST'])
@jwt_required()
def gerar_ordem_servico():
    """Gerar ordem de serviço em PDF"""
    try:
        data = request.get_json()
        
        # Dados da OS
        cliente = data.get('cliente', {})
        servico = data.get('servico', {})
        equipe = data.get('equipe', [])
        
        # Gerar número sequencial
        numero_os = data.get('numero', '001-2025')
        
        # Criar arquivo temporário
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            pdf_path = tmp_file.name
        
        # Criar documento PDF
        doc = SimpleDocTemplate(pdf_path, pagesize=A4)
        styles = create_pdf_styles()
        story = []
        
        # Cabeçalho
        story.append(Paragraph("VIP MUDANÇAS", styles['TituloVIP']))
        story.append(Paragraph("ORDEM DE SERVIÇO", styles['SubtituloVIP']))
        story.append(Spacer(1, 20))
        
        # Dados da OS
        story.append(Paragraph(f"<b>OS Nº:</b> {numero_os}", styles['Normal']))
        story.append(Paragraph(f"<b>Data de Emissão:</b> {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Dados do cliente
        story.append(Paragraph("<b>CLIENTE:</b>", styles['SubtituloVIP']))
        cliente_info = f"""
        <b>Nome:</b> {cliente.get('nome', '')}<br/>
        <b>Telefone:</b> {cliente.get('telefone', '')}<br/>
        <b>Email:</b> {cliente.get('email', '')}
        """
        story.append(Paragraph(cliente_info, styles['Normal']))
        story.append(Spacer(1, 15))
        
        # Dados do serviço
        story.append(Paragraph("<b>DETALHES DO SERVIÇO:</b>", styles['SubtituloVIP']))
        servico_info = f"""
        <b>Data da Mudança:</b> {servico.get('data_mudanca', '')}<br/>
        <b>Horário:</b> {servico.get('horario', '08:00')}<br/>
        <b>Origem:</b> {servico.get('endereco_origem', '')}<br/>
        <b>Destino:</b> {servico.get('endereco_destino', '')}<br/>
        <b>Tipo:</b> {servico.get('tipo', 'Residencial')}<br/>
        <b>Observações:</b> {servico.get('observacoes', 'Nenhuma')}
        """
        story.append(Paragraph(servico_info, styles['Normal']))
        story.append(Spacer(1, 15))
        
        # Equipe designada
        if equipe:
            story.append(Paragraph("<b>EQUIPE DESIGNADA:</b>", styles['SubtituloVIP']))
            for membro in equipe:
                story.append(Paragraph(f"• {membro.get('nome', '')} - {membro.get('funcao', '')}", styles['Normal']))
            story.append(Spacer(1, 15))
        
        # Lista de materiais/itens
        story.append(Paragraph("<b>MATERIAIS NECESSÁRIOS:</b>", styles['SubtituloVIP']))
        materiais = [
            "□ Caixas de papelão",
            "□ Plástico bolha",
            "□ Fita adesiva",
            "□ Papel pardo",
            "□ Cobertores",
            "□ Cintas de amarração",
            "□ Outros: _______________"
        ]
        
        for material in materiais:
            story.append(Paragraph(material, styles['Normal']))
        
        story.append(Spacer(1, 30))
        
        # Assinaturas
        story.append(Paragraph("<b>CONTROLE DE EXECUÇÃO:</b>", styles['SubtituloVIP']))
        story.append(Spacer(1, 20))
        
        controle_data = [
            ['Início dos trabalhos:', '___:___', 'Responsável:', '_' * 20],
            ['Término dos trabalhos:', '___:___', 'Responsável:', '_' * 20],
            ['Assinatura do Cliente:', '_' * 30, 'Data:', '___/___/___']
        ]
        
        controle_table = Table(controle_data, colWidths=[1.5*inch, 1*inch, 1*inch, 1.5*inch])
        controle_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(controle_table)
        
        # Gerar PDF
        doc.build(story)
        
        # Ler arquivo e limpar
        with open(pdf_path, 'rb') as f:
            pdf_content = f.read()
        
        os.unlink(pdf_path)
        
        return jsonify({
            "message": "Ordem de serviço gerada com sucesso",
            "numero_os": numero_os,
            "arquivo": "os_base64_aqui",
            "tamanho": len(pdf_content)
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@documentos_bp.route('/gerar-recibo', methods=['POST'])
@jwt_required()
def gerar_recibo():
    """Gerar recibo de pagamento em PDF"""
    try:
        data = request.get_json()
        
        # Dados do recibo
        cliente = data.get('cliente', {})
        pagamento = data.get('pagamento', {})
        
        # Gerar número sequencial
        numero_recibo = data.get('numero', '001-2025')
        
        # Criar arquivo temporário
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            pdf_path = tmp_file.name
        
        # Criar documento PDF
        doc = SimpleDocTemplate(pdf_path, pagesize=A4)
        styles = create_pdf_styles()
        story = []
        
        # Cabeçalho
        story.append(Paragraph("VIP MUDANÇAS", styles['TituloVIP']))
        story.append(Paragraph("RECIBO DE PAGAMENTO", styles['SubtituloVIP']))
        story.append(Spacer(1, 20))
        
        # Dados do recibo
        story.append(Paragraph(f"<b>Recibo Nº:</b> {numero_recibo}", styles['Normal']))
        story.append(Paragraph(f"<b>Data:</b> {datetime.now().strftime('%d/%m/%Y')}", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Valor por extenso (simulado)
        valor = pagamento.get('valor', 0)
        valor_extenso = "Valor por extenso aqui"  # Em produção, converter para extenso
        
        # Corpo do recibo
        recibo_texto = f"""
        Recebi de <b>{cliente.get('nome', '')}</b>, portador do CPF/CNPJ <b>{cliente.get('cpf_cnpj', '')}</b>,
        a quantia de <b>R$ {valor:.2f}</b> ({valor_extenso}), referente aos serviços de mudança
        prestados conforme contrato <b>{pagamento.get('contrato', '')}</b>.
        """
        
        story.append(Paragraph(recibo_texto, styles['Normal']))
        story.append(Spacer(1, 30))
        
        # Detalhes do pagamento
        story.append(Paragraph("<b>DETALHES DO PAGAMENTO:</b>", styles['SubtituloVIP']))
        pagamento_data = [
            ['Forma de Pagamento:', pagamento.get('forma_pagamento', '')],
            ['Data do Serviço:', pagamento.get('data_servico', '')],
            ['Observações:', pagamento.get('observacoes', 'Nenhuma')]
        ]
        
        pagamento_table = Table(pagamento_data, colWidths=[2*inch, 3*inch])
        pagamento_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(pagamento_table)
        story.append(Spacer(1, 40))
        
        # Assinatura
        story.append(Paragraph("São Paulo, " + datetime.now().strftime('%d de %B de %Y'), styles['Normal']))
        story.append(Spacer(1, 40))
        
        story.append(Paragraph("_" * 40, styles['Normal']))
        story.append(Paragraph("VIP MUDANÇAS", styles['Normal']))
        story.append(Paragraph("CNPJ: 12.345.678/0001-90", styles['Normal']))
        
        # Gerar PDF
        doc.build(story)
        
        # Ler arquivo e limpar
        with open(pdf_path, 'rb') as f:
            pdf_content = f.read()
        
        os.unlink(pdf_path)
        
        return jsonify({
            "message": "Recibo gerado com sucesso",
            "numero_recibo": numero_recibo,
            "arquivo": "recibo_base64_aqui",
            "tamanho": len(pdf_content)
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

