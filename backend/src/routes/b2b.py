from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime
from src.models import User
import time
import random

b2b_bp = Blueprint('b2b', __name__)

@b2b_bp.route('/buscar-empresas', methods=['POST'])
@jwt_required()
def buscar_empresas():
    """Buscar empresas no LinkedIn e outras fontes B2B"""
    try:
        user_id = get_jwt_identity()
        user = User.get_by_id(user_id)
        
        data = request.get_json()
        palavras_chave = data.get('palavras_chave', '')
        regiao = data.get('regiao', 'São Paulo')
        setor = data.get('setor', '')
        tamanho_empresa = data.get('tamanho_empresa', '')  # pequena, média, grande
        
        # Simular busca de empresas (em produção, usaria APIs reais)
        empresas_simuladas = [
            {
                "nome": "TechCorp Solutions",
                "cnpj": "12.345.678/0001-90",
                "setor": "Tecnologia",
                "tamanho": "Média empresa",
                "endereco": "São Paulo, SP",
                "site": "www.techcorp.com.br",
                "telefone": "(11) 3456-7890",
                "email_contato": "contato@techcorp.com.br",
                "linkedin": "https://linkedin.com/company/techcorp",
                "funcionarios": "50-200",
                "potencial_mudanca": "Alto",
                "observacoes": "Empresa em crescimento, possível expansão de escritório",
                "score_qualificacao": 85
            },
            {
                "nome": "Inovação Empresarial Ltda",
                "cnpj": "98.765.432/0001-10",
                "setor": "Consultoria",
                "tamanho": "Pequena empresa",
                "endereco": "São Paulo, SP",
                "site": "www.inovacaoempresarial.com.br",
                "telefone": "(11) 2345-6789",
                "email_contato": "comercial@inovacaoempresarial.com.br",
                "linkedin": "https://linkedin.com/company/inovacao-empresarial",
                "funcionarios": "10-50",
                "potencial_mudanca": "Médio",
                "observacoes": "Consultoria em expansão, pode precisar de mudança de escritório",
                "score_qualificacao": 70
            },
            {
                "nome": "Logística Express S.A.",
                "cnpj": "11.222.333/0001-44",
                "setor": "Logística",
                "tamanho": "Grande empresa",
                "endereco": "São Paulo, SP",
                "site": "www.logisticaexpress.com.br",
                "telefone": "(11) 4567-8901",
                "email_contato": "vendas@logisticaexpress.com.br",
                "linkedin": "https://linkedin.com/company/logistica-express",
                "funcionarios": "200+",
                "potencial_mudanca": "Muito Alto",
                "observacoes": "Grande empresa de logística, frequentes mudanças de equipamentos",
                "score_qualificacao": 95
            }
        ]
        
        # Filtrar por palavras-chave se fornecidas
        if palavras_chave:
            empresas_filtradas = []
            for empresa in empresas_simuladas:
                if any(palavra.lower() in empresa['nome'].lower() or 
                      palavra.lower() in empresa['setor'].lower() 
                      for palavra in palavras_chave.split()):
                    empresas_filtradas.append(empresa)
            empresas_simuladas = empresas_filtradas
        
        # Gerar sugestões de abordagem para cada empresa
        for empresa in empresas_simuladas:
            empresa['sugestao_abordagem'] = gerar_sugestao_abordagem(empresa)
            empresa['data_busca'] = datetime.utcnow().isoformat()
            empresa['responsavel_busca'] = user['name']
        
        return jsonify({
            "empresas": empresas_simuladas,
            "total_encontradas": len(empresas_simuladas),
            "parametros_busca": {
                "palavras_chave": palavras_chave,
                "regiao": regiao,
                "setor": setor,
                "tamanho_empresa": tamanho_empresa
            },
            "timestamp": datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def gerar_sugestao_abordagem(empresa):
    """Gerar sugestão de abordagem personalizada para a empresa"""
    sugestoes_base = {
        "Tecnologia": "Olá! Somos especialistas em mudanças corporativas para empresas de tecnologia. Sabemos da importância de manter equipamentos seguros durante relocações.",
        "Consultoria": "Prezados, oferecemos soluções completas de mudança para consultorias. Entendemos a necessidade de agilidade e discrição em relocações corporativas.",
        "Logística": "Como empresa do setor logístico, vocês sabem a importância de um transporte eficiente. Oferecemos o mesmo padrão de excelência para mudanças corporativas."
    }
    
    sugestao_base = sugestoes_base.get(empresa['setor'], 
        "Olá! Somos a VIP Mudanças, especialistas em relocações corporativas. Oferecemos soluções completas para sua empresa.")
    
    if empresa['potencial_mudanca'] == "Muito Alto":
        adicional = " Vamos agendar uma visita para apresentar nossos diferenciais?"
    elif empresa['potencial_mudanca'] == "Alto":
        adicional = " Gostaria de conhecer nossos cases de sucesso no seu setor?"
    else:
        adicional = " Podemos enviar um material sobre nossos serviços?"
    
    return sugestao_base + adicional

@b2b_bp.route('/salvar-lead-b2b', methods=['POST'])
@jwt_required()
def salvar_lead_b2b():
    """Salvar empresa como lead B2B no sistema"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        lead_b2b = {
            "nome_empresa": data.get('nome_empresa'),
            "cnpj": data.get('cnpj'),
            "contato_nome": data.get('contato_nome', ''),
            "telefone": data.get('telefone'),
            "email": data.get('email'),
            "endereco": data.get('endereco'),
            "setor": data.get('setor'),
            "tamanho_empresa": data.get('tamanho_empresa'),
            "potencial": data.get('potencial_mudanca', 'Médio'),
            "observacoes": data.get('observacoes', ''),
            "origem": "LinkedIn B2B",
            "responsavel_id": user_id,
            "status": "novo",
            "data_criacao": datetime.utcnow(),
            "sugestao_abordagem": data.get('sugestao_abordagem', ''),
            "score_qualificacao": data.get('score_qualificacao', 50)
        }
        
        # Aqui salvaria no banco de dados
        # Por enquanto, retornamos sucesso
        
        return jsonify({
            "message": "Lead B2B salvo com sucesso",
            "lead_id": f"b2b_{int(time.time())}",
            "timestamp": datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@b2b_bp.route('/estatisticas-b2b', methods=['GET'])
@jwt_required()
def estatisticas_b2b():
    """Estatísticas de prospecção B2B"""
    try:
        # Estatísticas simuladas
        stats = {
            "total_empresas_prospectadas": 156,
            "leads_gerados": 45,
            "contatos_realizados": 23,
            "reunioes_agendadas": 8,
            "propostas_enviadas": 5,
            "contratos_fechados": 2,
            "taxa_conversao": 4.4,  # (2/45) * 100
            "setores_mais_prospectados": [
                {"setor": "Tecnologia", "count": 35},
                {"setor": "Consultoria", "count": 28},
                {"setor": "Logística", "count": 22},
                {"setor": "Saúde", "count": 18}
            ],
            "potencial_por_tamanho": [
                {"tamanho": "Grande empresa", "potencial_alto": 15},
                {"tamanho": "Média empresa", "potencial_alto": 12},
                {"tamanho": "Pequena empresa", "potencial_alto": 8}
            ]
        }
        
        return jsonify(stats), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

