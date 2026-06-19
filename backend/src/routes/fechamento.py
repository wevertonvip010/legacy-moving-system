from flask import Blueprint, request, jsonify
from datetime import datetime
from src.database import db

fechamento_bp = Blueprint('fechamento', __name__, url_prefix='/api/fechamento')

@fechamento_bp.route('/mudancas', methods=['GET'])
def listar_mudancas_fechamento():
    """Listar mudanças com cálculo de receita/despesa/lucro"""
    mes = request.args.get('mes')
    ano = request.args.get('ano')
    
    os_list = db.ordens_servico.find({'status': 'finalizada'})
    
    mudancas = []
    for os in os_list:
        # Buscar orçamento para pegar valor cobrado
        orcamento = db.orcamentos.find_one({'_id': os.get('orcamento_id')})
        
        receita = orcamento.get('valor', 0) if orcamento else 0
        despesas = sum(os.get('custos', {}).values())
        lucro = receita - despesas
        margem = (lucro / receita * 100) if receita > 0 else 0
        
        mudanca = {
            'os_id': os.get('_id'),
            'cliente': os.get('cliente'),
            'data': os.get('data_fim'),
            'receita': receita,
            'despesas': despesas,
            'custos_detalhados': os.get('custos', {}),
            'lucro': lucro,
            'margem': margem
        }
        mudancas.append(mudanca)
    
    return jsonify(mudancas)

@fechamento_bp.route('/resumo', methods=['GET'])
def resumo_fechamento():
    """Resumo consolidado de receita/despesa/lucro"""
    mes = request.args.get('mes', datetime.now().month)
    ano = request.args.get('ano', datetime.now().year)
    
    os_list = db.ordens_servico.find({'status': 'finalizada'})
    
    receita_total = 0
    despesa_total = 0
    lucro_total = 0
    quantidade_mudancas = 0
    
    for os in os_list:
        orcamento = db.orcamentos.find_one({'_id': os.get('orcamento_id')})
        receita = orcamento.get('valor', 0) if orcamento else 0
        despesas = sum(os.get('custos', {}).values())
        
        receita_total += receita
        despesa_total += despesas
        lucro_total += (receita - despesas)
        quantidade_mudancas += 1
    
    margem_media = (lucro_total / receita_total * 100) if receita_total > 0 else 0
    
    return jsonify({
        'periodo': f"{mes}/{ano}",
        'receita_total': receita_total,
        'despesa_total': despesa_total,
        'lucro_bruto': lucro_total,
        'margem_media': margem_media,
        'quantidade_mudancas': quantidade_mudancas,
        'ticket_medio': receita_total / quantidade_mudancas if quantidade_mudancas > 0 else 0
    })

@fechamento_bp.route('/despesas-categoria', methods=['GET'])
def despesas_por_categoria():
    """Despesas agrupadas por categoria"""
    os_list = db.ordens_servico.find({'status': 'finalizada'})
    
    categorias = {
        'caminhao': 0,
        'ajudantes': 0,
        'materiais': 0,
        'combustivel': 0,
        'pedagio': 0,
        'extras': 0
    }
    
    for os in os_list:
        custos = os.get('custos', {})
        for categoria in categorias:
            categorias[categoria] += custos.get(categoria, 0)
    
    return jsonify(categorias)

@fechamento_bp.route('/dre', methods=['GET'])
def dre_consolidada():
    """DRE consolidada do período"""
    mes = request.args.get('mes', datetime.now().month)
    ano = request.args.get('ano', datetime.now().year)
    
    # Receitas
    os_list = db.ordens_servico.find({'status': 'finalizada'})
    receita_mudancas = 0
    for os in os_list:
        orcamento = db.orcamentos.find_one({'_id': os.get('orcamento_id')})
        receita_mudancas += orcamento.get('valor', 0) if orcamento else 0
    
    receita_guarda_moveis = 0  # Implementar se houver dados
    receita_total = receita_mudancas + receita_guarda_moveis
    
    # Despesas operacionais
    despesa_operacional = 0
    for os in os_list:
        despesa_operacional += sum(os.get('custos', {}).values())
    
    # Despesas administrativas (simuladas)
    despesa_administrativa = 3000  # Aluguel, salários, etc
    despesa_marketing = 1000
    
    despesa_total = despesa_operacional + despesa_administrativa + despesa_marketing
    
    # EBITDA
    ebitda = receita_total - despesa_operacional
    
    # Impostos (simulado)
    impostos = ebitda * 0.15  # 15% de carga tributária
    
    # Lucro líquido
    lucro_liquido = ebitda - impostos
    
    return jsonify({
        'periodo': f"{mes}/{ano}",
        'receitas': {
            'mudancas': receita_mudancas,
            'guarda_moveis': receita_guarda_moveis,
            'total': receita_total
        },
        'despesas': {
            'operacional': despesa_operacional,
            'administrativa': despesa_administrativa,
            'marketing': despesa_marketing,
            'total': despesa_total
        },
        'ebitda': ebitda,
        'impostos': impostos,
        'lucro_liquido': lucro_liquido,
        'margem_liquida': (lucro_liquido / receita_total * 100) if receita_total > 0 else 0
    })
