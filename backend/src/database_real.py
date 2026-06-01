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


# ── USUÁRIOS / FUNCIONÁRIOS ─────────────────────────────────────────────────
# Usuários = Funcionários. Sem entidade separada de funcionário.
# O campo `role` define o cargo operacional.
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    cpf = db.Column(db.String(14), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255))
    # Cargo operacional: admin|comercial|operacional|financeiro|supervisor
    # 'vendedor' mantido como alias de 'comercial' para compat
    role = db.Column(db.String(50), default='comercial')
    telefone = db.Column(db.String(30))
    ativo = db.Column(db.Boolean, default=True)
    permissoes = db.Column(db.Text)  # JSON: {"leads":{"ver":1,"criar":1},...} ou null = usa defaults do role
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── JORNADA (ESCALA DE TRABALHO DO USUÁRIO) ─────────────────────────────────
class Jornada(db.Model):
    """Define o horário de trabalho padrão de um usuário (escala semanal)."""
    __tablename__ = 'jornadas'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    # Horário padrão
    hora_entrada = db.Column(db.String(5), default='08:00')   # HH:MM
    hora_saida = db.Column(db.String(5), default='18:00')     # HH:MM
    # Dias da semana ativos (JSON: [1,2,3,4,5] = seg~sex)
    dias_semana = db.Column(db.Text, default='[1,2,3,4,5]')
    tipo_turno = db.Column(db.String(30), default='comercial')  # comercial|operacional|plantao
    carga_horaria_semanal = db.Column(db.Float, default=40.0)   # horas/semana
    observacoes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── TURNO (INSTÂNCIA REAL DE TRABALHO POR DIA) ──────────────────────────────
class Turno(db.Model):
    """Registra cada sessão real de trabalho: entrada, saída, ociosidade."""
    __tablename__ = 'turnos'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    data = db.Column(db.DateTime, nullable=False)                    # data do turno
    inicio = db.Column(db.DateTime, nullable=True)                   # login / início
    fim = db.Column(db.DateTime, nullable=True)                      # logout / encerramento
    # Calculados pelo backend ao encerrar
    minutos_online = db.Column(db.Float, default=0)                  # tempo total logado
    minutos_ativo = db.Column(db.Float, default=0)                   # com ações registradas
    minutos_ocioso = db.Column(db.Float, default=0)                  # sem ação por > 10min
    total_acoes = db.Column(db.Integer, default=0)                   # clicks/acoes no sistema
    status = db.Column(db.String(20), default='aberto')              # aberto|encerrado
    observacoes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── AUDITORIA GLOBAL ─────────────────────────────────────────────────────────
class AuditLog(db.Model):
    """Rastreia TODAS as ações relevantes do sistema. Imutável após criação."""
    __tablename__ = 'audit_log'
    id = db.Column(db.Integer, primary_key=True)
    # Quem
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    user_nome = db.Column(db.String(255))                            # desnormalizado p/ histórico
    # O quê
    acao = db.Column(db.String(100), nullable=False)                 # LEAD_CRIADO|OS_ALTERADA|etc.
    entidade = db.Column(db.String(100))                             # Lead|OS|Contrato|etc.
    entidade_id = db.Column(db.Integer)
    # Dados
    descricao = db.Column(db.Text)                                   # texto legível
    dados_anteriores = db.Column(db.Text)                            # JSON snapshot antes
    dados_novos = db.Column(db.Text)                                 # JSON snapshot depois
    # Contexto técnico
    ip = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


# ── ATIVIDADE DO USUÁRIO (heartbeat de página) ──────────────────────────────
class UserActivityLog(db.Model):
    __tablename__ = 'user_activity_log'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    page = db.Column(db.String(200))
    action = db.Column(db.String(100))   # pageview|heartbeat|logout
    session_id = db.Column(db.String(64))
    turno_id = db.Column(db.Integer, db.ForeignKey('turnos.id'), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)


# ── LEADS ───────────────────────────────────────────────────────────────────
class Lead(db.Model):
    __tablename__ = 'leads'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255), nullable=False)
    telefone = db.Column(db.String(30), nullable=False)
    email = db.Column(db.String(255))
    origem = db.Column(db.String(50), default='site')
    tipo_servico = db.Column(db.String(50), default='residencial')
    bairro_origem = db.Column(db.String(100))
    cidade_origem = db.Column(db.String(100))
    bairro_destino = db.Column(db.String(100))
    cidade_destino = db.Column(db.String(100))
    observacoes = db.Column(db.Text)
    classificacao = db.Column(db.String(10))
    classificacao_justificativa = db.Column(db.Text)
    # Vendedor responsável: usuário com role=comercial
    vendedor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    organizer_id = db.Column(db.Integer, db.ForeignKey('organizers.id'), nullable=True)
    status = db.Column(db.String(30), default='novo')
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
    classificacao = db.Column(db.String(20), default='bronze')
    meta_mensal = db.Column(db.Float, default=0)
    status = db.Column(db.String(50), default='ativo')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── ORÇAMENTOS ──────────────────────────────────────────────────────────────
class Orcamento(db.Model):
    __tablename__ = 'orcamentos'
    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String(20), unique=True)
    cliente = db.Column(db.String(255), nullable=False)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=True)
    vendedor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    lead_id = db.Column(db.Integer, db.ForeignKey('leads.id'), nullable=True)
    tipo_servico = db.Column(db.String(50), default='residencial')
    data_prevista = db.Column(db.DateTime, nullable=True)
    orig_rua = db.Column(db.String(255))
    orig_numero = db.Column(db.String(20))
    orig_complemento = db.Column(db.String(100))
    orig_bairro = db.Column(db.String(100))
    orig_cidade = db.Column(db.String(100))
    orig_estado = db.Column(db.String(10))
    orig_cep = db.Column(db.String(10))
    dest_rua = db.Column(db.String(255))
    dest_numero = db.Column(db.String(20))
    dest_complemento = db.Column(db.String(100))
    dest_bairro = db.Column(db.String(100))
    dest_cidade = db.Column(db.String(100))
    dest_estado = db.Column(db.String(10))
    dest_cep = db.Column(db.String(10))
    valor_servico = db.Column(db.Float, default=0)
    valor_seguro = db.Column(db.Float, default=0)
    condicoes_pagamento = db.Column(db.String(255))
    observacoes_comerciais = db.Column(db.Text)
    justificativa = db.Column(db.Text)
    status = db.Column(db.String(30), default='novo')
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
    orig_rua = db.Column(db.String(255))
    orig_numero = db.Column(db.String(20))
    orig_complemento = db.Column(db.String(100))
    orig_bairro = db.Column(db.String(100))
    orig_cidade = db.Column(db.String(100))
    orig_estado = db.Column(db.String(10))
    orig_cep = db.Column(db.String(10))
    dest_rua = db.Column(db.String(255))
    dest_numero = db.Column(db.String(20))
    dest_complemento = db.Column(db.String(100))
    dest_bairro = db.Column(db.String(100))
    dest_cidade = db.Column(db.String(100))
    dest_estado = db.Column(db.String(10))
    dest_cep = db.Column(db.String(10))
    data_confirmada = db.Column(db.DateTime, nullable=True)
    dados_para_contrato = db.Column(db.Text)
    planilha_seguro = db.Column(db.String(500))
    observacoes_finais = db.Column(db.Text)
    status = db.Column(db.String(20), default='pendente')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── CONTRATOS ───────────────────────────────────────────────────────────────
class Contrato(db.Model):
    __tablename__ = 'contratos'
    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String(20), unique=True)
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
    status = db.Column(db.String(30), default='rascunho')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def valor(self):
        return (self.valor_servico or 0) + (self.valor_seguro or 0)


# ── ORDENS DE SERVIÇO ───────────────────────────────────────────────────────
class OrdemServico(db.Model):
    __tablename__ = 'ordens_servico'
    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String(20), unique=True)
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
    # Equipe: texto livre (legado) + JSON de IDs de usuários operacionais
    equipe = db.Column(db.Text)
    equipe_ids = db.Column(db.Text)        # JSON: [1, 3, 5] → user_ids com role=operacional
    quantidade_ajudantes = db.Column(db.Integer, default=0)
    quantidade_dias = db.Column(db.Integer, default=1)
    materiais_previstos = db.Column(db.Text)
    materiais_usados = db.Column(db.Text)
    checklist = db.Column(db.Text)
    planilha_seguro = db.Column(db.String(500))
    ocorrencias = db.Column(db.Text)
    observacoes_operacionais = db.Column(db.Text)
    observacoes_finais = db.Column(db.Text)
    valor_total = db.Column(db.Float, default=0)
    drive_url = db.Column(db.String(500))
    status = db.Column(db.String(30), default='agendada')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def data_programada(self):
        return self.data_mudanca


# ── FUNCIONÁRIOS (banco de ajudantes) ──────────────────────────────────────
class Funcionario(db.Model):
    __tablename__ = 'funcionarios'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255), nullable=False)
    tipo = db.Column(db.String(30), default='fixo')       # fixo | diarista
    funcoes = db.Column(db.String(500))                    # Ex: "embalador,motorista"
    telefone = db.Column(db.String(30))
    cpf = db.Column(db.String(20))
    pix = db.Column(db.String(255))
    valor_diaria = db.Column(db.Float, default=0)          # Valor da diária (diaristas)
    salario = db.Column(db.Float, default=0)               # Salário mensal (fixos)
    disponibilidade = db.Column(db.String(100))            # Ex: "seg-sex" ou "sob demanda"
    avaliacao = db.Column(db.Float, default=5.0)           # 1-5 estrelas
    total_servicos = db.Column(db.Integer, default=0)
    pontos = db.Column(db.Integer, default=0)             # Gamificação
    ativo = db.Column(db.Boolean, default=True)
    observacoes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── VÍNCULO FUNCIONÁRIO ↔ OS ─────────────────────────────────────────────
class FuncionarioOS(db.Model):
    """Registra qual funcionário participou de qual OS/etapa."""
    __tablename__ = 'funcionario_os'
    id = db.Column(db.Integer, primary_key=True)
    funcionario_id = db.Column(db.Integer, db.ForeignKey('funcionarios.id'), nullable=False)
    os_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=False)
    etapa_id = db.Column(db.Integer, db.ForeignKey('etapas_operacionais.id'), nullable=True)
    funcao_no_servico = db.Column(db.String(100))   # Ex: "motorista", "embalador"
    pontos_ganhos = db.Column(db.Integer, default=10)
    data = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── PROGRAMAÇÃO ─────────────────────────────────────────────────────────────
class Programacao(db.Model):
    __tablename__ = 'programacoes'
    id = db.Column(db.Integer, primary_key=True)
    os_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=True)
    cliente = db.Column(db.String(255), nullable=False)
    tipo_servico = db.Column(db.String(50), default='mudanca')  # mudanca, embalagem, icamento, transporte, etc
    data = db.Column(db.DateTime, nullable=True)
    equipe = db.Column(db.String(500))
    equipe_ids = db.Column(db.Text)        # JSON user IDs
    veiculo = db.Column(db.String(100))
    status = db.Column(db.String(50), default='agendado')
    semana = db.Column(db.Integer)
    ano = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── MATERIAL (CATÁLOGO DE PRODUTOS) ─────────────────────────────────────────
class Material(db.Model):
    """Entidade de catálogo: define O QUE é o item. Separado do estoque."""
    __tablename__ = 'materiais'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(200), nullable=False)
    categoria = db.Column(db.String(100), default='embalagem')
    # embalagem|ferramenta|equipamento|veiculo|consumivel|outro
    unidade = db.Column(db.String(20), default='un')    # un|m|m2|m3|kg|l
    custo_unitario = db.Column(db.Float, default=0)
    quantidade_minima = db.Column(db.Float, default=0)  # alerta amarelo
    quantidade_critica = db.Column(db.Float, default=0) # alerta vermelho
    descricao = db.Column(db.Text)
    ativo = db.Column(db.Boolean, default=True)
    # Rastreabilidade
    fornecedor = db.Column(db.String(200))              # fornecedor/fabricante
    lote = db.Column(db.String(100))                    # número do lote
    data_compra = db.Column(db.Date, nullable=True)     # data da última compra
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def alerta(self):
        """Calcula o alerta baseado no estoque atual via relacionamento."""
        estoque = Estoque.query.filter_by(material_id=self.id).first()
        if not estoque:
            return None
        if estoque.quantidade <= self.quantidade_critica:
            return 'critico'
        if estoque.quantidade <= self.quantidade_minima:
            return 'baixo'
        return None


# ── ESTOQUE (POSIÇÃO DE INVENTÁRIO) ─────────────────────────────────────────
class Estoque(db.Model):
    """Controla a quantidade disponível de cada material no armazém."""
    __tablename__ = 'estoque'
    id = db.Column(db.Integer, primary_key=True)
    # FK para o catálogo de materiais (novo modelo)
    material_id = db.Column(db.Integer, db.ForeignKey('materiais.id'), nullable=True)
    # Campo legado — usado por registros antigos sem material_id
    material = db.Column(db.String(255))
    unidade = db.Column(db.String(30), default='un')
    quantidade = db.Column(db.Float, default=0)
    estoque_minimo = db.Column(db.Float, default=10)
    estoque_critico = db.Column(db.Float, default=5)
    valor_unitario = db.Column(db.Float, default=0)
    localizacao = db.Column(db.String(100))             # prateleira, galpão, etc.
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def nome_material(self):
        """Retorna o nome do material (via FK ou campo legado)."""
        if self.material_id:
            m = Material.query.get(self.material_id)
            return m.nome if m else self.material
        return self.material

    @property
    def alerta(self):
        if self.quantidade <= self.estoque_critico:
            return 'critico'
        if self.quantidade <= self.estoque_minimo:
            return 'baixo'
        return None


# ── MOVIMENTAÇÃO DE ESTOQUE ─────────────────────────────────────────────────
class MovimentacaoEstoque(db.Model):
    """Cada entrada ou saída de material gera um registro auditável."""
    __tablename__ = 'movimentacoes_estoque'
    id = db.Column(db.Integer, primary_key=True)
    estoque_id = db.Column(db.Integer, db.ForeignKey('estoque.id'), nullable=False)
    material_id = db.Column(db.Integer, db.ForeignKey('materiais.id'), nullable=True)
    os_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # quem movimentou
    tipo = db.Column(db.String(30), nullable=False)
    # entrada|saida|consumo_os|ajuste|perda|avaria|devolucao|reserva
    quantidade = db.Column(db.Float, nullable=False)
    quantidade_anterior = db.Column(db.Float)           # snapshot antes da movimentação
    quantidade_posterior = db.Column(db.Float)          # snapshot depois
    valor_unitario = db.Column(db.Float, default=0)
    valor_total = db.Column(db.Float, default=0)
    observacao = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── BOX / GUARDA-MÓVEIS ─────────────────────────────────────────────────────
class GuardaMovel(db.Model):
    """Entidade Box: unidade física de armazenamento."""
    __tablename__ = 'guarda_moveis'
    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String(20), nullable=False)            # Box 01, Box 02, ...
    localizacao = db.Column(db.String(200))                      # Galpão A, Bloco 2, Andar 1
    metros_quadrados = db.Column(db.Float)
    metros_cubicos = db.Column(db.Float)
    # Status: livre|ocupado|manutencao|bloqueado
    status = db.Column(db.String(20), default='livre')
    # Cliente atualmente ocupando o box
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=True)
    cliente_nome = db.Column(db.String(255))                     # desnormalizado p/ leitura rápida
    valor_mensal = db.Column(db.Float, default=0)
    data_entrada = db.Column(db.DateTime, nullable=True)
    data_saida_prevista = db.Column(db.DateTime, nullable=True)
    contrato_referencia = db.Column(db.String(100))              # número do contrato de locação
    observacoes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── EVENTOS DO BOX ───────────────────────────────────────────────────────────
class BoxEvento(db.Model):
    """Histórico completo de eventos de cada box: entrada, saída, troca, etc."""
    __tablename__ = 'box_eventos'
    id = db.Column(db.Integer, primary_key=True)
    box_id = db.Column(db.Integer, db.ForeignKey('guarda_moveis.id'), nullable=False)
    # Tipo: entrada|saida|troca_cliente|renovacao|encerramento|manutencao|liberacao
    tipo = db.Column(db.String(50), nullable=False)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=True)
    cliente_nome = db.Column(db.String(255))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # quem registrou
    data_evento = db.Column(db.DateTime, default=datetime.utcnow)
    contrato_referencia = db.Column(db.String(100))
    valor_mensal = db.Column(db.Float, default=0)
    observacoes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── RECIBOS ─────────────────────────────────────────────────────────────────
class Recibo(db.Model):
    __tablename__ = 'recibos'
    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String(20), unique=True)
    os_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=True)
    cliente = db.Column(db.String(255), nullable=False)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=True)
    servico_realizado = db.Column(db.Text)
    valor_cobrado = db.Column(db.Float, default=0)
    forma_pagamento = db.Column(db.String(30))
    data_pagamento = db.Column(db.DateTime, nullable=True)
    data_vencimento = db.Column(db.DateTime, nullable=True)
    data_recebimento = db.Column(db.DateTime, nullable=True)
    observacoes = db.Column(db.Text)
    drive_url = db.Column(db.String(500))
    status = db.Column(db.String(20), default='pendente')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── DESPESAS ────────────────────────────────────────────────────────────────
class Despesa(db.Model):
    __tablename__ = 'despesas'
    id = db.Column(db.Integer, primary_key=True)
    categoria = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.Text)
    valor = db.Column(db.Float, default=0)
    data = db.Column(db.DateTime, default=datetime.utcnow)
    os_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=True)
    comprovante_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── ETAPAS OPERACIONAIS ─────────────────────────────────────────────────────
class EtapaOperacional(db.Model):
    __tablename__ = 'etapas_operacionais'
    id = db.Column(db.Integer, primary_key=True)
    os_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=False)
    data = db.Column(db.DateTime, nullable=True)
    tipo = db.Column(db.String(50), default='transporte')
    quantidade_ajudantes = db.Column(db.Integer, default=0)
    quantidade_caminhoes = db.Column(db.Integer, default=0)
    equipe = db.Column(db.Text)
    equipe_ids = db.Column(db.Text)       # JSON user IDs operacionais
    veiculos = db.Column(db.Text)
    observacoes = db.Column(db.Text)
    status = db.Column(db.String(20), default='agendada')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── FECHAMENTO OPERACIONAL ───────────────────────────────────────────────────
class FechamentoOperacional(db.Model):
    __tablename__ = 'fechamentos_operacionais'
    id = db.Column(db.Integer, primary_key=True)
    os_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=False, unique=True)
    organizer_id = db.Column(db.Integer, db.ForeignKey('organizers.id'), nullable=True)
    vendedor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    receita_bruta = db.Column(db.Float, default=0)
    custo_equipe = db.Column(db.Float, default=0)
    custo_caminhoes = db.Column(db.Float, default=0)
    custo_materiais = db.Column(db.Float, default=0)
    custo_pedagio = db.Column(db.Float, default=0)
    custo_alimentacao = db.Column(db.Float, default=0)
    custo_hospedagem = db.Column(db.Float, default=0)
    custo_freelancers = db.Column(db.Float, default=0)
    custo_outros = db.Column(db.Float, default=0)
    lucro_liquido = db.Column(db.Float, default=0)
    margem_percentual = db.Column(db.Float, default=0)
    comissao_organizer = db.Column(db.Float, default=0)
    percentual_comissao = db.Column(db.Float, default=10.0)
    observacoes = db.Column(db.Text)
    status = db.Column(db.String(20), default='rascunho')
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
        self.margem_percentual = round(
            self.lucro_liquido / self.receita_bruta * 100, 1
        ) if self.receita_bruta else 0
        self.comissao_organizer = round(
            max(0, self.lucro_liquido) * (self.percentual_comissao or 10) / 100, 2
        )


# ── COMISSÕES DAS ORGANIZERS ─────────────────────────────────────────────────
class Comissao(db.Model):
    __tablename__ = 'comissoes'
    id = db.Column(db.Integer, primary_key=True)
    organizer_id = db.Column(db.Integer, db.ForeignKey('organizers.id'), nullable=False)
    os_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=True)
    fechamento_id = db.Column(db.Integer, db.ForeignKey('fechamentos_operacionais.id'), nullable=True)
    valor = db.Column(db.Float, default=0)
    percentual = db.Column(db.Float, default=10.0)
    status = db.Column(db.String(20), default='pendente')
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
    tipo = db.Column(db.String(100))
    descricao = db.Column(db.Text)
    valor_estimado = db.Column(db.Float, default=0)
    observacoes = db.Column(db.Text)
    status = db.Column(db.String(50), default='aberta')
    data_resolucao = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── RECORRENTES FINANCEIROS ─────────────────────────────────────────────────
class RecorrenteFinanceiro(db.Model):
    __tablename__ = 'recorrentes_financeiros'
    id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(20), default='despesa')   # 'despesa' | 'receita'
    categoria = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.String(255), nullable=False)
    valor = db.Column(db.Float, default=0)
    dia_vencimento = db.Column(db.Integer, default=1)    # 1–31
    ativo = db.Column(db.Boolean, default=True)
    observacoes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── CONFIGURAÇÕES DO SISTEMA ─────────────────────────────────────────────────
class ConfigSistema(db.Model):
    """Armazena configurações gerais do sistema como chave-valor."""
    __tablename__ = 'config_sistema'
    id = db.Column(db.Integer, primary_key=True)
    chave = db.Column(db.String(100), unique=True, nullable=False)
    valor = db.Column(db.Text)                  # JSON ou texto simples
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── INICIALIZAÇÃO DO BANCO ───────────────────────────────────────────────────
def init_db(app):
    with app.app_context():
        db.create_all()

        # ── Usuários padrão ──
        if not User.query.filter_by(cpf='12345678901').first():
            db.session.add(User(
                cpf='12345678901',
                password=generate_password_hash('123456'),
                name='Administrador Legacy Moving',
                email='admin@legacymoving.com.br',
                role='admin'
            ))
        # Usuário comercial de exemplo
        if not User.query.filter_by(cpf='11111111111').first():
            db.session.add(User(
                cpf='11111111111',
                password=generate_password_hash('123456'),
                name='Carlos Vendas',
                email='carlos@legacymoving.com.br',
                role='comercial'
            ))
        # Usuário operacional de exemplo
        if not User.query.filter_by(cpf='22222222222').first():
            db.session.add(User(
                cpf='22222222222',
                password=generate_password_hash('123456'),
                name='João Operacional',
                email='joao@legacymoving.com.br',
                role='operacional'
            ))
        if not User.query.filter_by(cpf='33333333333').first():
            db.session.add(User(
                cpf='33333333333',
                password=generate_password_hash('123456'),
                name='Pedro Ajudante',
                email='pedro@legacymoving.com.br',
                role='operacional'
            ))
        if not User.query.filter_by(cpf='44444444444').first():
            db.session.add(User(
                cpf='44444444444',
                password=generate_password_hash('123456'),
                name='Ana Financeiro',
                email='ana@legacymoving.com.br',
                role='financeiro'
            ))

        # ── 20 boxes de guarda-móveis ──
        if GuardaMovel.query.count() == 0:
            locais = ['Galpão A', 'Galpão A', 'Galpão A', 'Galpão A', 'Galpão A',
                      'Galpão B', 'Galpão B', 'Galpão B', 'Galpão B', 'Galpão B',
                      'Galpão C', 'Galpão C', 'Galpão C', 'Galpão C', 'Galpão C',
                      'Galpão D', 'Galpão D', 'Galpão D', 'Galpão D', 'Galpão D']
            tamanhos = [9.0, 12.0, 6.0, 15.0, 9.0, 12.0, 6.0, 18.0, 9.0, 12.0,
                        6.0, 9.0, 15.0, 12.0, 6.0, 9.0, 12.0, 9.0, 6.0, 18.0]
            for i in range(1, 21):
                m2 = tamanhos[i - 1]
                db.session.add(GuardaMovel(
                    numero=f'Box {str(i).zfill(2)}',
                    localizacao=locais[i - 1],
                    metros_quadrados=m2,
                    metros_cubicos=round(m2 * 2.5, 1),
                    status='livre'
                ))

        # ── Catálogo de materiais ──
        if Material.query.count() == 0:
            catalogo = [
                ('Caixa P', 'embalagem', 'un', 3.50, 10, 5,
                 'Caixa pequena para itens leves como livros e CDs'),
                ('Caixa M', 'embalagem', 'un', 5.00, 10, 5,
                 'Caixa média para roupas dobradas e utensílios'),
                ('Caixa G', 'embalagem', 'un', 7.50, 8, 3,
                 'Caixa grande para roupas de cama e objetos maiores'),
                ('Fita Adesiva', 'consumivel', 'un', 4.00, 5, 2,
                 'Fita marrom larga para lacrar caixas'),
                ('Plástico Bolha', 'embalagem', 'm', 2.00, 20, 10,
                 'Proteção para itens frágeis e eletrônicos'),
                ('Papel Kraft', 'embalagem', 'm', 1.50, 15, 8,
                 'Papel para embrulhar peças e proteger superfícies'),
                ('Manta de Proteção', 'equipamento', 'un', 25.00, 5, 2,
                 'Cobertor acolchoado para móveis grandes'),
                ('Caneta Marcadora', 'consumivel', 'un', 3.00, 3, 1,
                 'Para identificar caixas por cômodo'),
                ('Elástico de Borracha', 'consumivel', 'pct', 8.00, 3, 1,
                 'Pacote com 100 elásticos largos'),
                ('Etiqueta Adesiva', 'consumivel', 'pct', 5.00, 5, 2,
                 'Etiquetas para identificação de volumes'),
            ]
            for nome, cat, un, custo, qmin, qcrit, desc in catalogo:
                db.session.add(Material(
                    nome=nome, categoria=cat, unidade=un,
                    custo_unitario=custo, quantidade_minima=qmin,
                    quantidade_critica=qcrit, descricao=desc
                ))
            db.session.flush()  # garante IDs antes de criar estoque

        # ── Posições de estoque vinculadas ao catálogo ──
        if Estoque.query.count() == 0:
            materiais_bd = Material.query.all()
            quantidades = [50, 50, 30, 20, 100, 80, 15, 10, 8, 25]
            for mat, qtd in zip(materiais_bd, quantidades):
                db.session.add(Estoque(
                    material_id=mat.id,
                    material=mat.nome,
                    unidade=mat.unidade,
                    quantidade=qtd,
                    estoque_minimo=mat.quantidade_minima,
                    estoque_critico=mat.quantidade_critica,
                    valor_unitario=mat.custo_unitario
                ))

        db.session.commit()
        print('Legacy Moving — banco iniciado v3 (estrutura enterprise)')
