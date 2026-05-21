import os
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash

db = SQLAlchemy()


# ── CONTADOR DE NUMERAÇÃO SEQUENCIAL ───────────────────────────────────────
class Contador(db.Model):
    __tablename__ = 'contadores'
    id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(10), unique=True, nullable=False)  # orc|con|os|rec
    ano = db.Column(db.Integer, nullable=False)
    ultimo = db.Column(db.Integer, default=0)

    @staticmethod
    def proximo(tipo):
        ano_atual = datetime.utcnow().year
        c = Contador.query.filter_by(tipo=tipo).with_for_update().first()
        if not c:
            c = Contador(tipo=tipo, ano=ano_atual, ultimo=0)
            db.session.add(c)
        if c.ano != ano_atual:
            c.ano = ano_atual
            c.ultimo = 0
        c.ultimo += 1
        prefixo = {'orc': 'ORC', 'con': 'CON', 'os': 'OS', 'rec': 'REC'}.get(tipo, tipo.upper())
        return f"{prefixo}-{c.ano}-{str(c.ultimo).zfill(3)}"


# ── USUÁRIOS ────────────────────────────────────────────────────────────────
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    cpf = db.Column(db.String(14), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255))
    role = db.Column(db.String(50), default='vendedor')  # admin|vendedor|operacional|financeiro
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── LEADS ───────────────────────────────────────────────────────────────────
class Lead(db.Model):
    __tablename__ = 'leads'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255), nullable=False)
    telefone = db.Column(db.String(30), nullable=False)
    email = db.Column(db.String(255))
    origem = db.Column(db.String(50), default='site')         # site|instagram|whatsapp|indicacao|google_ads|b2b|organizer
    tipo_servico = db.Column(db.String(50), default='residencial')  # residencial|comercial|corporativo|guarda_moveis
    bairro_origem = db.Column(db.String(100))
    cidade_origem = db.Column(db.String(100))
    bairro_destino = db.Column(db.String(100))
    cidade_destino = db.Column(db.String(100))
    observacoes = db.Column(db.Text)
    classificacao = db.Column(db.String(10))                  # A|AA|B2B|Baixo
    classificacao_justificativa = db.Column(db.Text)
    vendedor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    organizer_id = db.Column(db.Integer, db.ForeignKey('organizers.id'), nullable=True)
    status = db.Column(db.String(30), default='novo')         # novo|classificado|convertido|perdido
    orcamento_id = db.Column(db.Integer, db.ForeignKey('orcamentos.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── CLIENTES ────────────────────────────────────────────────────────────────
class Cliente(db.Model):
    __tablename__ = 'clientes'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255))
    telefone = db.Column(db.String(30))
    cpf_cnpj = db.Column(db.String(30))
    endereco = db.Column(db.Text)
    origem = db.Column(db.String(100), default='direto')
    organizer_id = db.Column(db.Integer, db.ForeignKey('organizers.id'), nullable=True)
    status = db.Column(db.String(50), default='ativo')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── ORGANIZERS ──────────────────────────────────────────────────────────────
class Organizer(db.Model):
    __tablename__ = 'organizers'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255), nullable=False)
    instagram = db.Column(db.String(100))
    telefone = db.Column(db.String(30))
    empresa = db.Column(db.String(255))
    cidade = db.Column(db.String(100))
    observacoes = db.Column(db.Text)
    classificacao = db.Column(db.String(20), default='bronze')  # bronze|prata|ouro|vip
    meta_mensal = db.Column(db.Float, default=0)
    status = db.Column(db.String(50), default='ativo')          # ativo|inativo|parceira_vip
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── ORÇAMENTOS ──────────────────────────────────────────────────────────────
class Orcamento(db.Model):
    __tablename__ = 'orcamentos'
    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String(20), unique=True)            # ORC-2026-001
    cliente = db.Column(db.String(255), nullable=False)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=True)
    vendedor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    lead_id = db.Column(db.Integer, db.ForeignKey('leads.id'), nullable=True)
    tipo_servico = db.Column(db.String(50), default='residencial')
    data_prevista = db.Column(db.DateTime, nullable=True)
    # Endereço origem
    orig_rua = db.Column(db.String(255))
    orig_numero = db.Column(db.String(20))
    orig_complemento = db.Column(db.String(100))
    orig_bairro = db.Column(db.String(100))
    orig_cidade = db.Column(db.String(100))
    orig_estado = db.Column(db.String(10))
    orig_cep = db.Column(db.String(10))
    # Endereço destino
    dest_rua = db.Column(db.String(255))
    dest_numero = db.Column(db.String(20))
    dest_complemento = db.Column(db.String(100))
    dest_bairro = db.Column(db.String(100))
    dest_cidade = db.Column(db.String(100))
    dest_estado = db.Column(db.String(10))
    dest_cep = db.Column(db.String(10))
    # Valores
    valor_servico = db.Column(db.Float, default=0)
    valor_seguro = db.Column(db.Float, default=0)
    condicoes_pagamento = db.Column(db.String(255))
    observacoes_comerciais = db.Column(db.Text)
    justificativa = db.Column(db.Text)                        # obrigatório ao rejeitar/cancelar
    status = db.Column(db.String(30), default='novo')         # novo|em_negociacao|aprovado|rejeitado|cancelado
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def valor(self):
        return (self.valor_servico or 0) + (self.valor_seguro or 0)

    @property
    def endereco_origem(self):
        parts = [self.orig_rua, self.orig_numero, self.orig_bairro, self.orig_cidade]
        return ', '.join(p for p in parts if p)

    @property
    def endereco_destino(self):
        parts = [self.dest_rua, self.dest_numero, self.dest_bairro, self.dest_cidade]
        return ', '.join(p for p in parts if p)


# ── CADASTRO COMPLEMENTAR ───────────────────────────────────────────────────
class CadastroComplementar(db.Model):
    __tablename__ = 'cadastros_complementares'
    id = db.Column(db.Integer, primary_key=True)
    orcamento_id = db.Column(db.Integer, db.ForeignKey('orcamentos.id'), unique=True, nullable=False)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=True)
    cpf_cnpj = db.Column(db.String(30))
    rg_ie = db.Column(db.String(30))
    # Endereço origem confirmado
    orig_rua = db.Column(db.String(255))
    orig_numero = db.Column(db.String(20))
    orig_complemento = db.Column(db.String(100))
    orig_bairro = db.Column(db.String(100))
    orig_cidade = db.Column(db.String(100))
    orig_estado = db.Column(db.String(10))
    orig_cep = db.Column(db.String(10))
    # Endereço destino confirmado
    dest_rua = db.Column(db.String(255))
    dest_numero = db.Column(db.String(20))
    dest_complemento = db.Column(db.String(100))
    dest_bairro = db.Column(db.String(100))
    dest_cidade = db.Column(db.String(100))
    dest_estado = db.Column(db.String(10))
    dest_cep = db.Column(db.String(10))
    data_confirmada = db.Column(db.DateTime, nullable=True)
    dados_para_contrato = db.Column(db.Text)
    planilha_seguro = db.Column(db.String(500))               # filename/path
    observacoes_finais = db.Column(db.Text)
    status = db.Column(db.String(20), default='pendente')     # pendente|completo
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── CONTRATOS ───────────────────────────────────────────────────────────────
class Contrato(db.Model):
    __tablename__ = 'contratos'
    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String(20), unique=True)            # CON-2026-001
    orcamento_id = db.Column(db.Integer, db.ForeignKey('orcamentos.id'), nullable=True)
    cadastro_id = db.Column(db.Integer, db.ForeignKey('cadastros_complementares.id'), nullable=True)
    cliente = db.Column(db.String(255), nullable=False)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=True)
    tipo_servico = db.Column(db.String(50), default='residencial')
    endereco_origem = db.Column(db.Text)
    endereco_destino = db.Column(db.Text)
    data_execucao = db.Column(db.DateTime, nullable=True)
    valor_servico = db.Column(db.Float, default=0)
    valor_seguro = db.Column(db.Float, default=0)
    condicoes_pagamento = db.Column(db.String(255))
    observacoes_contratuais = db.Column(db.Text)
    drive_url = db.Column(db.String(500))
    status = db.Column(db.String(30), default='rascunho')     # rascunho|enviado|assinado
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def valor(self):
        return (self.valor_servico or 0) + (self.valor_seguro or 0)


# ── ORDENS DE SERVIÇO ───────────────────────────────────────────────────────
class OrdemServico(db.Model):
    __tablename__ = 'ordens_servico'
    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String(20), unique=True)            # OS-2026-001
    contrato_id = db.Column(db.Integer, db.ForeignKey('contratos.id'), nullable=True)
    cliente = db.Column(db.String(255), nullable=False)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=True)
    tipo_servico = db.Column(db.String(50), default='residencial')
    endereco_origem = db.Column(db.Text)
    endereco_destino = db.Column(db.Text)
    data_mudanca = db.Column(db.DateTime, nullable=True)
    hora_inicio = db.Column(db.String(10))
    hora_fim_estimada = db.Column(db.String(10))
    hora_inicio_real = db.Column(db.String(10))
    hora_fim_real = db.Column(db.String(10))
    motorista = db.Column(db.String(255))
    veiculo = db.Column(db.String(100))
    equipe = db.Column(db.Text)                               # JSON string
    quantidade_ajudantes = db.Column(db.Integer, default=0)
    quantidade_dias = db.Column(db.Integer, default=1)
    materiais_previstos = db.Column(db.Text)                  # JSON string
    materiais_usados = db.Column(db.Text)                     # JSON string (preenchido na execução)
    checklist = db.Column(db.Text)                            # JSON string
    planilha_seguro = db.Column(db.String(500))
    ocorrencias = db.Column(db.Text)
    observacoes_operacionais = db.Column(db.Text)
    observacoes_finais = db.Column(db.Text)
    valor_total = db.Column(db.Float, default=0)
    drive_url = db.Column(db.String(500))
    status = db.Column(db.String(30), default='agendada')     # agendada|em_andamento|concluida|cancelada
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Compat alias
    @property
    def data_programada(self):
        return self.data_mudanca


# ── PROGRAMAÇÃO ─────────────────────────────────────────────────────────────
class Programacao(db.Model):
    __tablename__ = 'programacoes'
    id = db.Column(db.Integer, primary_key=True)
    os_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=True)
    cliente = db.Column(db.String(255), nullable=False)
    data = db.Column(db.DateTime, nullable=True)
    equipe = db.Column(db.String(500))
    veiculo = db.Column(db.String(100))
    status = db.Column(db.String(50), default='agendado')
    semana = db.Column(db.Integer)
    ano = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── ESTOQUE ─────────────────────────────────────────────────────────────────
class Estoque(db.Model):
    __tablename__ = 'estoque'
    id = db.Column(db.Integer, primary_key=True)
    material = db.Column(db.String(255), nullable=False)
    unidade = db.Column(db.String(30), default='un')
    quantidade = db.Column(db.Integer, default=0)
    estoque_minimo = db.Column(db.Integer, default=10)
    estoque_critico = db.Column(db.Integer, default=5)
    valor_unitario = db.Column(db.Float, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def alerta(self):
        if self.quantidade <= self.estoque_critico:
            return 'critico'
        if self.quantidade <= self.estoque_minimo:
            return 'baixo'
        return None


class MovimentacaoEstoque(db.Model):
    __tablename__ = 'movimentacoes_estoque'
    id = db.Column(db.Integer, primary_key=True)
    estoque_id = db.Column(db.Integer, db.ForeignKey('estoque.id'), nullable=False)
    os_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=True)
    tipo = db.Column(db.String(10), nullable=False)           # entrada|saida
    quantidade = db.Column(db.Integer, nullable=False)
    observacao = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── GUARDA-MÓVEIS ───────────────────────────────────────────────────────────
class GuardaMovel(db.Model):
    __tablename__ = 'guarda_moveis'
    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), default='livre')        # livre|ocupado|manutencao
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=True)
    cliente_nome = db.Column(db.String(255))
    valor_mensal = db.Column(db.Float, default=0)
    metros_quadrados = db.Column(db.Float)
    metros_cubicos = db.Column(db.Float)
    data_entrada = db.Column(db.DateTime)
    data_saida_prevista = db.Column(db.DateTime)
    observacoes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── RECIBOS ─────────────────────────────────────────────────────────────────
class Recibo(db.Model):
    __tablename__ = 'recibos'
    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String(20), unique=True)            # REC-2026-001
    os_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=True)
    cliente = db.Column(db.String(255), nullable=False)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=True)
    servico_realizado = db.Column(db.Text)
    valor_cobrado = db.Column(db.Float, default=0)
    forma_pagamento = db.Column(db.String(30))                # pix|transferencia|dinheiro|cartao|cheque
    data_pagamento = db.Column(db.DateTime, nullable=True)
    observacoes = db.Column(db.Text)
    drive_url = db.Column(db.String(500))
    status = db.Column(db.String(20), default='pendente')     # pendente|recebido
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── DESPESAS ────────────────────────────────────────────────────────────────
class Despesa(db.Model):
    __tablename__ = 'despesas'
    id = db.Column(db.Integer, primary_key=True)
    categoria = db.Column(db.String(100), nullable=False)     # ajudantes|combustivel|pedagio|alimentacao|material|outros
    descricao = db.Column(db.Text)
    valor = db.Column(db.Float, default=0)
    data = db.Column(db.DateTime, default=datetime.utcnow)
    os_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── ETAPAS OPERACIONAIS ─────────────────────────────────────────────────────
class EtapaOperacional(db.Model):
    __tablename__ = 'etapas_operacionais'
    id = db.Column(db.Integer, primary_key=True)
    os_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=False)
    data = db.Column(db.DateTime, nullable=True)
    tipo = db.Column(db.String(50), default='transporte')  # embalagem|transporte|finalizacao|outro
    quantidade_ajudantes = db.Column(db.Integer, default=0)
    quantidade_caminhoes = db.Column(db.Integer, default=0)
    equipe = db.Column(db.Text)                            # JSON: nomes dos ajudantes
    veiculos = db.Column(db.Text)                          # JSON: placas/descrição
    observacoes = db.Column(db.Text)
    status = db.Column(db.String(20), default='agendada')  # agendada|concluida
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── FECHAMENTO OPERACIONAL ───────────────────────────────────────────────────
class FechamentoOperacional(db.Model):
    __tablename__ = 'fechamentos_operacionais'
    id = db.Column(db.Integer, primary_key=True)
    os_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=False, unique=True)
    organizer_id = db.Column(db.Integer, db.ForeignKey('organizers.id'), nullable=True)
    receita_bruta = db.Column(db.Float, default=0)
    # Custos operacionais
    custo_equipe = db.Column(db.Float, default=0)
    custo_caminhoes = db.Column(db.Float, default=0)
    custo_materiais = db.Column(db.Float, default=0)
    custo_pedagio = db.Column(db.Float, default=0)
    custo_alimentacao = db.Column(db.Float, default=0)
    custo_hospedagem = db.Column(db.Float, default=0)
    custo_freelancers = db.Column(db.Float, default=0)
    custo_outros = db.Column(db.Float, default=0)
    # Resultados calculados
    lucro_liquido = db.Column(db.Float, default=0)
    margem_percentual = db.Column(db.Float, default=0)
    comissao_organizer = db.Column(db.Float, default=0)
    percentual_comissao = db.Column(db.Float, default=10.0)
    observacoes = db.Column(db.Text)
    status = db.Column(db.String(20), default='rascunho')  # rascunho|finalizado
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def calcular(self):
        custo_total = (
            (self.custo_equipe or 0) + (self.custo_caminhoes or 0) +
            (self.custo_materiais or 0) + (self.custo_pedagio or 0) +
            (self.custo_alimentacao or 0) + (self.custo_hospedagem or 0) +
            (self.custo_freelancers or 0) + (self.custo_outros or 0)
        )
        self.lucro_liquido = (self.receita_bruta or 0) - custo_total
        self.margem_percentual = round(self.lucro_liquido / self.receita_bruta * 100, 1) if self.receita_bruta else 0
        self.comissao_organizer = round(max(0, self.lucro_liquido) * (self.percentual_comissao or 10) / 100, 2)


# ── COMISSÕES DAS ORGANIZERS ─────────────────────────────────────────────────
class Comissao(db.Model):
    __tablename__ = 'comissoes'
    id = db.Column(db.Integer, primary_key=True)
    organizer_id = db.Column(db.Integer, db.ForeignKey('organizers.id'), nullable=False)
    os_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=True)
    fechamento_id = db.Column(db.Integer, db.ForeignKey('fechamentos_operacionais.id'), nullable=True)
    valor = db.Column(db.Float, default=0)
    percentual = db.Column(db.Float, default=10.0)
    status = db.Column(db.String(20), default='pendente')      # pendente|pago
    data_pagamento = db.Column(db.DateTime, nullable=True)
    observacoes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── METAS ───────────────────────────────────────────────────────────────────
class Meta(db.Model):
    __tablename__ = 'metas'
    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(255), nullable=False)
    tipo = db.Column(db.String(50), default='receita')
    periodo = db.Column(db.String(50), default='mensal')
    meta = db.Column(db.Float, default=0)
    realizado = db.Column(db.Float, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── AVARIAS ─────────────────────────────────────────────────────────────────
class UserActivityLog(db.Model):
    __tablename__ = 'user_activity_log'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    page = db.Column(db.String(200))           # e.g. '/leads', '/dashboard'
    action = db.Column(db.String(100))         # 'pageview' | 'heartbeat' | 'logout'
    session_id = db.Column(db.String(64))      # frontend-generated UUID per session
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)


class Avaria(db.Model):
    __tablename__ = 'avarias'
    id = db.Column(db.Integer, primary_key=True)
    os_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=True)
    os_numero = db.Column(db.String(50))
    cliente = db.Column(db.String(200))
    cliente_id = db.Column(db.Integer, nullable=True)
    data_mudanca = db.Column(db.DateTime, nullable=True)
    equipe = db.Column(db.String(200))
    veiculo = db.Column(db.String(100))
    organizer_id = db.Column(db.Integer, db.ForeignKey('organizers.id'), nullable=True)
    tipo = db.Column(db.String(100))  # movel_quebrado|arranhado|molhado|perdido|outro
    descricao = db.Column(db.Text)
    valor_estimado = db.Column(db.Float, default=0)
    observacoes = db.Column(db.Text)
    status = db.Column(db.String(50), default='aberta')  # aberta|em_analise|em_resolucao|resolvida|encerrada
    data_resolucao = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── INICIALIZAÇÃO ───────────────────────────────────────────────────────────
def init_db(app):
    with app.app_context():
        db.create_all()
        # Admin padrão: CPF 123.456.789-01 / senha 123456
        if not User.query.filter_by(cpf='12345678901').first():
            admin = User(
                cpf='12345678901',
                password=generate_password_hash('123456'),
                name='Administrador Legacy Moving',
                email='admin@legacymoving.com.br',
                role='admin'
            )
            db.session.add(admin)
        # 20 boxes de guarda-móveis
        if GuardaMovel.query.count() == 0:
            for i in range(1, 21):
                db.session.add(GuardaMovel(numero=f'Box {str(i).zfill(2)}', status='livre'))
        # Estoque inicial
        if Estoque.query.count() == 0:
            materiais = [
                ('Caixa P', 'un', 50, 10, 5, 3.50),
                ('Caixa M', 'un', 50, 10, 5, 5.00),
                ('Caixa G', 'un', 30, 8, 3, 7.50),
                ('Fita adesiva', 'un', 20, 5, 2, 4.00),
                ('Plastico bolha', 'm', 100, 20, 10, 2.00),
                ('Papel kraft', 'm', 80, 15, 8, 1.50),
                ('Manta de protecao', 'un', 15, 5, 2, 25.00),
                ('Caneta marcadora', 'un', 10, 3, 1, 3.00),
            ]
            for m, u, q, em, ec, v in materiais:
                db.session.add(Estoque(material=m, unidade=u, quantidade=q,
                                       estoque_minimo=em, estoque_critico=ec, valor_unitario=v))
        db.session.commit()
        print("Legacy Moving - banco iniciado v2")
