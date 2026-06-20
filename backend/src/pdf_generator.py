"""
pdf_generator.py — Legacy Moving
Gera PDFs profissionais para cada tipo de registro usando reportlab.

Uso:
    from pdf_generator import gerar_pdf
    pdf_bytes = gerar_pdf('contrato', dados_dict)
"""

import io
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# ── reportlab (graceful fallback) ─────────────────────────────────────────────
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        HRFlowable, KeepTogether
    )
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
    _RL_OK = True
except ImportError:
    _RL_OK = False
    logger.warning("reportlab não instalado — geração de PDF desativada.")

# ── Paleta Legacy Moving ──────────────────────────────────────────────────────
AZUL_ESCURO  = colors.HexColor('#0f1f3d')
AZUL_MEDIO   = colors.HexColor('#1e3a5f')
CINZA_CLARO  = colors.HexColor('#f8f9fa')
CINZA_BORDA  = colors.HexColor('#e5e7eb')
VERDE        = colors.HexColor('#16a34a')
VERMELHO     = colors.HexColor('#dc2626')
AMARELO      = colors.HexColor('#d97706')
PRETO        = colors.black
BRANCO       = colors.white

def _fmt(v):
    """Formata valor monetário."""
    try:
        return f"R$ {float(v or 0):,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    except Exception:
        return str(v or '—')

def _fdata(v):
    """Formata data ISO para dd/mm/aaaa."""
    if not v:
        return '—'
    try:
        if 'T' in str(v):
            return datetime.fromisoformat(str(v)).strftime('%d/%m/%Y')
        return str(v)[:10].replace('-', '/')
    except Exception:
        return str(v)

def _val(v):
    return str(v) if v else '—'


# ── Base do documento ─────────────────────────────────────────────────────────
def _doc_base(buffer, titulo='Legacy Moving'):
    return SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
        title=titulo,
        author='Legacy Moving ERP',
    )

def _estilos():
    base = getSampleStyleSheet()
    return {
        'titulo':      ParagraphStyle('titulo',      parent=base['Normal'], fontSize=20, textColor=BRANCO,    alignment=TA_CENTER, fontName='Helvetica-Bold', spaceAfter=4),
        'subtitulo':   ParagraphStyle('subtitulo',   parent=base['Normal'], fontSize=11, textColor=BRANCO,    alignment=TA_CENTER, fontName='Helvetica'),
        'secao':       ParagraphStyle('secao',       parent=base['Normal'], fontSize=11, textColor=AZUL_ESCURO, fontName='Helvetica-Bold', spaceBefore=12, spaceAfter=4),
        'label':       ParagraphStyle('label',       parent=base['Normal'], fontSize=9,  textColor=colors.HexColor('#6b7280'), fontName='Helvetica'),
        'valor':       ParagraphStyle('valor',       parent=base['Normal'], fontSize=10, textColor=PRETO,      fontName='Helvetica'),
        'destaque':    ParagraphStyle('destaque',    parent=base['Normal'], fontSize=12, textColor=AZUL_ESCURO, fontName='Helvetica-Bold'),
        'nota':        ParagraphStyle('nota',        parent=base['Normal'], fontSize=8,  textColor=colors.HexColor('#9ca3af'), fontName='Helvetica', alignment=TA_CENTER),
        'normal':      base['Normal'],
    }

def _cabecalho(story, st, numero, tipo_label, data_str=None):
    """Cabeçalho padrão Legacy Moving."""
    # Bloco azul
    story.append(Table(
        [[Paragraph('LEGACY MOVING', st['titulo'])],
         [Paragraph(f'{tipo_label} &nbsp;·&nbsp; {numero}', st['subtitulo'])]],
        colWidths=[17*cm],
        style=TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), AZUL_ESCURO),
            ('ROUNDEDCORNERS', [6]),
            ('TOPPADDING',    (0,0), (-1,-1), 14),
            ('BOTTOMPADDING', (0,0), (-1,-1), 14),
            ('LEFTPADDING',   (0,0), (-1,-1), 20),
            ('RIGHTPADDING',  (0,0), (-1,-1), 20),
        ])
    ))
    story.append(Spacer(1, 10))
    data_emissao = data_str or datetime.now().strftime('%d/%m/%Y %H:%M')
    story.append(Paragraph(f'Emitido em: {data_emissao} &nbsp;·&nbsp; legacymovingbr@gmail.com', st['nota']))
    story.append(Spacer(1, 14))

def _linha(story, st, label, valor, cor_fundo=None):
    """Linha label → valor."""
    row = [[Paragraph(label, st['label']), Paragraph(_val(valor), st['valor'])]]
    ts = [
        ('VALIGN',  (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING',    (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING',   (0,0), (-1,-1), 8),
        ('RIGHTPADDING',  (0,0), (-1,-1), 8),
    ]
    if cor_fundo:
        ts.append(('BACKGROUND', (0,0), (-1,-1), cor_fundo))
    story.append(Table(row, colWidths=[5*cm, 12*cm], style=TableStyle(ts)))

def _tabela_dados(story, pares, st):
    """Grid de campos em 2 colunas."""
    rows = []
    for i in range(0, len(pares), 2):
        row = []
        for k, v in pares[i:i+2]:
            cell = [Paragraph(k, st['label']), Paragraph(_val(v), st['valor'])]
            row.append(cell)
        if len(row) == 1:
            row.append('')
        rows.append(row)

    if not rows:
        return

    t = Table(rows, colWidths=[8.5*cm, 8.5*cm])
    t.setStyle(TableStyle([
        ('VALIGN',        (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING',   (0,0), (-1,-1), 8),
        ('RIGHTPADDING',  (0,0), (-1,-1), 8),
        ('ROWBACKGROUNDS',(0,0), (-1,-1), [CINZA_CLARO, BRANCO]),
        ('GRID',          (0,0), (-1,-1), 0.3, CINZA_BORDA),
    ]))
    story.append(t)
    story.append(Spacer(1, 8))

def _secao(story, st, titulo):
    story.append(HRFlowable(width='100%', thickness=1, color=CINZA_BORDA))
    story.append(Paragraph(titulo, st['secao']))

def _rodape(story, st, numero):
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width='100%', thickness=0.5, color=CINZA_BORDA))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        f'Legacy Moving · legacymovingbr@gmail.com · Documento: {numero} · '
        f'Gerado em {datetime.now().strftime("%d/%m/%Y %H:%M")}',
        st['nota']
    ))


# ── Geradores por tipo ────────────────────────────────────────────────────────

def _pdf_cliente(d, st):
    buf = io.BytesIO()
    doc = _doc_base(buf, f"Cliente {d.get('nome','')}")
    story = []
    _cabecalho(story, st, d.get('numero', f"CLI-{d.get('id','')}"), 'FICHA DE CLIENTE')
    _secao(story, st, 'Dados do Cliente')
    _tabela_dados(story, [
        ('Nome',       d.get('nome')),
        ('E-mail',     d.get('email')),
        ('Telefone',   d.get('telefone')),
        ('CPF/CNPJ',   d.get('cpf_cnpj')),
        ('Origem',     d.get('origem')),
        ('Status',     d.get('status')),
        ('Endereço',   d.get('endereco')),
        ('Cadastro',   _fdata(d.get('created_at'))),
    ], st)
    if d.get('observacoes'):
        _secao(story, st, 'Observações')
        story.append(Paragraph(d['observacoes'], st['valor']))
    _rodape(story, st, d.get('numero', ''))
    doc.build(story)
    return buf.getvalue()


def _pdf_orcamento(d, st):
    buf = io.BytesIO()
    doc = _doc_base(buf, f"Orçamento {d.get('numero','')}")
    story = []
    _cabecalho(story, st, d.get('numero', ''), 'ORÇAMENTO')
    _secao(story, st, 'Cliente')
    _tabela_dados(story, [
        ('Cliente',    d.get('cliente')),
        ('E-mail',     d.get('email_cliente')),
        ('Telefone',   d.get('telefone_cliente')),
        ('Tipo',       d.get('tipo_servico')),
        ('Data Prev.', _fdata(d.get('data_prevista'))),
        ('Status',     d.get('status')),
    ], st)
    _secao(story, st, 'Endereços')
    orig = ', '.join(filter(None, [d.get('orig_rua'), d.get('orig_numero'), d.get('orig_bairro'), d.get('orig_cidade'), d.get('orig_estado')]))
    dest = ', '.join(filter(None, [d.get('dest_rua'), d.get('dest_numero'), d.get('dest_bairro'), d.get('dest_cidade'), d.get('dest_estado')]))
    _tabela_dados(story, [('Origem', orig or '—'), ('Destino', dest or '—')], st)
    _secao(story, st, 'Valores')
    _tabela_dados(story, [
        ('Valor Serviço', _fmt(d.get('valor_servico'))),
        ('Seguro',        _fmt(d.get('valor_seguro'))),
        ('Total',         _fmt(d.get('valor'))),
        ('Pagamento',     d.get('condicoes_pagamento')),
    ], st)
    if d.get('observacoes_comerciais'):
        _secao(story, st, 'Observações')
        story.append(Paragraph(d['observacoes_comerciais'], st['valor']))
    _rodape(story, st, d.get('numero', ''))
    doc.build(story)
    return buf.getvalue()


def _pdf_contrato(d, st):
    buf = io.BytesIO()
    doc = _doc_base(buf, f"Contrato {d.get('numero','')}")
    story = []
    _cabecalho(story, st, d.get('numero', ''), 'CONTRATO DE SERVIÇO')
    _secao(story, st, 'Dados do Contratante')
    _tabela_dados(story, [
        ('Cliente',    d.get('cliente')),
        ('E-mail',     d.get('email_cliente')),
        ('Telefone',   d.get('telefone_cliente')),
        ('Tipo',       d.get('tipo_servico')),
        ('Status',     d.get('status')),
        ('Emissão',    _fdata(d.get('created_at'))),
    ], st)
    _secao(story, st, 'Endereços')
    _tabela_dados(story, [
        ('Origem',  d.get('endereco_origem')),
        ('Destino', d.get('endereco_destino')),
        ('Data Execução', _fdata(d.get('data_execucao'))),
    ], st)
    _secao(story, st, 'Valores Contratuais')
    _tabela_dados(story, [
        ('Valor Serviço', _fmt(d.get('valor_servico'))),
        ('Seguro',        _fmt(d.get('valor_seguro'))),
        ('Total',         _fmt(d.get('valor'))),
        ('Pagamento',     d.get('condicoes_pagamento')),
    ], st)
    if d.get('observacoes_contratuais'):
        _secao(story, st, 'Cláusulas e Observações')
        story.append(Paragraph(d['observacoes_contratuais'], st['valor']))
    # Assinaturas
    story.append(Spacer(1, 30))
    assin = Table(
        [['_'*40, '_'*40],
         [Paragraph('Contratante', st['label']), Paragraph('Legacy Moving', st['label'])]],
        colWidths=[8.5*cm, 8.5*cm],
    )
    assin.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'CENTER'), ('TOPPADDING', (0,1), (-1,1), 4)]))
    story.append(assin)
    _rodape(story, st, d.get('numero', ''))
    doc.build(story)
    return buf.getvalue()


def _pdf_os(d, st):
    buf = io.BytesIO()
    doc = _doc_base(buf, f"OS {d.get('numero','')}")
    story = []
    _cabecalho(story, st, d.get('numero', ''), 'ORDEM DE SERVIÇO')
    _secao(story, st, 'Cliente e Serviço')
    _tabela_dados(story, [
        ('Cliente',    d.get('cliente')),
        ('Tipo',       d.get('tipo_servico')),
        ('Status',     d.get('status')),
        ('Data',       _fdata(d.get('data_mudanca'))),
        ('Início',     d.get('hora_inicio')),
        ('Fim Est.',   d.get('hora_fim_estimada')),
    ], st)
    _secao(story, st, 'Logística')
    _tabela_dados(story, [
        ('Origem',   d.get('endereco_origem')),
        ('Destino',  d.get('endereco_destino')),
        ('Veículo',  d.get('veiculo')),
        ('Motorista', d.get('motorista')),
        ('Equipe',   d.get('equipe')),
        ('Ajudantes', d.get('quantidade_ajudantes')),
    ], st)
    if d.get('materiais_previstos'):
        _secao(story, st, 'Materiais Previstos')
        story.append(Paragraph(str(d['materiais_previstos']), st['valor']))
    if d.get('ocorrencias'):
        _secao(story, st, 'Ocorrências / Observações')
        story.append(Paragraph(str(d['ocorrencias']), st['valor']))
    _rodape(story, st, d.get('numero', ''))
    doc.build(story)
    return buf.getvalue()


def _pdf_guarda(d, st):
    buf = io.BytesIO()
    doc = _doc_base(buf, f"Guarda-Móveis {d.get('numero','')}")
    story = []
    _cabecalho(story, st, d.get('numero', ''), 'GUARDA-MÓVEIS')
    _secao(story, st, 'Dados do Contrato')
    _tabela_dados(story, [
        ('Cliente',       d.get('cliente')),
        ('Unidade',       d.get('numero_unidade')),
        ('Área (m²)',     d.get('area_m2')),
        ('Volume (m³)',   d.get('volume_m3')),
        ('Entrada',       _fdata(d.get('data_entrada'))),
        ('Saída Prev.',   _fdata(d.get('data_saida_prevista'))),
        ('Mensalidade',   _fmt(d.get('valor_mensalidade'))),
        ('Status',        d.get('status')),
    ], st)
    if d.get('inventario'):
        _secao(story, st, 'Inventário dos Móveis')
        story.append(Paragraph(str(d['inventario']), st['valor']))
    _rodape(story, st, d.get('numero', ''))
    doc.build(story)
    return buf.getvalue()


def _pdf_recibo(d, st):
    buf = io.BytesIO()
    doc = _doc_base(buf, f"Recibo {d.get('numero','')}")
    story = []
    _cabecalho(story, st, d.get('numero', ''), 'RECIBO DE SERVIÇO')
    _secao(story, st, 'Dados do Pagamento')
    _tabela_dados(story, [
        ('Cliente',    d.get('cliente')),
        ('OS Ref.',    d.get('os_numero')),
        ('Serviço',    d.get('servico_realizado')),
        ('Valor',      _fmt(d.get('valor_cobrado'))),
        ('Pagamento',  d.get('forma_pagamento')),
        ('Data Pgto',  _fdata(d.get('data_pagamento'))),
        ('Status',     d.get('status')),
    ], st)
    if d.get('observacoes'):
        _secao(story, st, 'Observações')
        story.append(Paragraph(d['observacoes'], st['valor']))
    _rodape(story, st, d.get('numero', ''))
    doc.build(story)
    return buf.getvalue()


# ── Dispatcher principal ──────────────────────────────────────────────────────
_GERADORES = {
    'cliente':   _pdf_cliente,
    'orcamento': _pdf_orcamento,
    'contrato':  _pdf_contrato,
    'os':        _pdf_os,
    'guarda':    _pdf_guarda,
    'recibo':    _pdf_recibo,
}

def gerar_pdf(tipo, dados):
    """
    Gera PDF para o tipo e dados fornecidos.
    Retorna bytes do PDF ou None em caso de erro/indisponibilidade.
    """
    if not _RL_OK:
        return None
    gerador = _GERADORES.get(tipo)
    if not gerador:
        logger.warning(f"pdf_generator: tipo '{tipo}' não tem gerador definido.")
        return None
    try:
        st = _estilos()
        return gerador(dados, st)
    except Exception as e:
        logger.error(f"pdf_generator: erro ao gerar {tipo} — {e}")
        return None
