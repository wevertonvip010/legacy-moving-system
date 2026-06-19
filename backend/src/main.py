import os
import sys
import json
import logging
from datetime import datetime, timedelta
from functools import wraps

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity
)
from werkzeug.security import check_password_hash, generate_password_hash
from dotenv import load_dotenv
from sqlalchemy import extract

load_dotenv(os.path.join(os.path.dirname(current_dir), '.env'))

from database_real import (
    db, Contador, User, Lead, Cliente, Organizer,
    Orcamento, CadastroComplementar, Contrato,
    OrdemServico, Programacao, Estoque, MovimentacaoEstoque,
    GuardaMovel, Recibo, Despesa, Meta,
    EtapaOperacional, FechamentoOperacional, Comissao,
    Avaria, UserActivityLog,
    Material, BoxEvento, AuditLog, Jornada, Turno,
    RecorrenteFinanceiro, ConfigSistema, Funcionario, FuncionarioOS,
    init_db
)

app = Flask(__name__)

_db_file = os.path.join(current_dir, "legacy_moving.db").replace("\\", "/")
_raw_db = os.environ.get('DATABASE_URL') or f'sqlite:///{_db_file}'
# Railway fornece postgres:// mas SQLAlchemy exige postgresql://
DB_PATH = _raw_db.replace('postgres://', 'postgresql://', 1)
app.config['SQLALCHEMY_DATABASE_URI'] = DB_PATH
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
_jwt_secret = os.environ.get('JWT_SECRET_KEY')
if not _jwt_secret:
    logger.warning("JWT_SECRET_KEY não configurada no .env — usando valor inseguro. Configure antes de subir em produção.")
    _jwt_secret = 'INSEGURO-trocar-em-producao-via-JWT_SECRET_KEY'
app.config['JWT_SECRET_KEY'] = _jwt_secret
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)

db.init_app(app)
jwt = JWTManager(app)
CORS(app, origins="*", allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
init_db(app)


# ── HELPERS ─────────────────────────────────────────────────────────────────
def err(msg, code=400):
    return jsonify({"erro": msg}), code


def current_user():
    uid = get_jwt_identity()
    return User.query.get(int(uid))


def require_role(*roles):
    # 'comercial' e 'vendedor' são equivalentes (alias histórico)
    _roles = set(roles)
    if 'vendedor' in _roles:
        _roles.add('comercial')
    if 'comercial' in _roles:
        _roles.add('vendedor')
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            u = current_user()
            if not u or (u.role not in _roles and u.role != 'admin'):
                return err("Acesso negado", 403)
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def _user_dict(u):
    import json as _json
    perm_raw = getattr(u, 'permissoes', None)
    try:
        permissoes = _json.loads(perm_raw) if perm_raw else None
    except Exception:
        permissoes = None
    return {
        "id": u.id, "name": u.name, "cpf": u.cpf, "role": u.role, "email": u.email,
        "telefone": getattr(u, 'telefone', None),
        "ativo": getattr(u, 'ativo', True),
        "permissoes": permissoes,
    }


def _lead_dict(l):
    vendedor = User.query.get(l.vendedor_id) if l.vendedor_id else None
    return {
        "id": l.id, "nome": l.nome, "telefone": l.telefone, "email": l.email,
        "origem": l.origem, "tipo_servico": l.tipo_servico,
        "bairro_origem": l.bairro_origem, "cidade_origem": l.cidade_origem,
        "bairro_destino": l.bairro_destino, "cidade_destino": l.cidade_destino,
        "observacoes": l.observacoes, "classificacao": l.classificacao,
        "classificacao_justificativa": l.classificacao_justificativa,
        "vendedor_id": l.vendedor_id, "vendedor_nome": vendedor.name if vendedor else None,
        "organizer_id": l.organizer_id,
        "status": l.status, "orcamento_id": l.orcamento_id,
        "created_at": l.created_at.isoformat() if l.created_at else None,
    }


def _cliente_dict(c):
    return {
        "id": c.id, "nome": c.nome, "email": c.email, "telefone": c.telefone,
        "cpf_cnpj": c.cpf_cnpj, "endereco": c.endereco,
        "origem": c.origem, "organizer_id": c.organizer_id,
        "status": c.status,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


def _orc_dict(o):
    return {
        "id": o.id, "numero": o.numero, "cliente": o.cliente, "cliente_id": o.cliente_id,
        "vendedor_id": o.vendedor_id, "lead_id": o.lead_id,
        "tipo_servico": o.tipo_servico,
        "data_prevista": o.data_prevista.isoformat() if o.data_prevista else None,
        "orig_rua": o.orig_rua, "orig_numero": o.orig_numero, "orig_complemento": o.orig_complemento,
        "orig_bairro": o.orig_bairro, "orig_cidade": o.orig_cidade,
        "orig_estado": o.orig_estado, "orig_cep": o.orig_cep,
        "dest_rua": o.dest_rua, "dest_numero": o.dest_numero, "dest_complemento": o.dest_complemento,
        "dest_bairro": o.dest_bairro, "dest_cidade": o.dest_cidade,
        "dest_estado": o.dest_estado, "dest_cep": o.dest_cep,
        "valor_servico": o.valor_servico, "valor_seguro": o.valor_seguro, "valor": o.valor,
        "condicoes_pagamento": o.condicoes_pagamento,
        "observacoes_comerciais": o.observacoes_comerciais,
        "justificativa": o.justificativa,
        "status": o.status,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    }


def _cadastro_dict(c):
    orc = Orcamento.query.get(c.orcamento_id) if c.orcamento_id else None
    return {
        "id": c.id, "orcamento_id": c.orcamento_id, "cliente_id": c.cliente_id,
        "cpf_cnpj": c.cpf_cnpj, "rg_ie": c.rg_ie,
        "orig_rua": c.orig_rua, "orig_numero": c.orig_numero,
        "orig_complemento": c.orig_complemento,
        "orig_bairro": c.orig_bairro, "orig_cidade": c.orig_cidade,
        "orig_estado": c.orig_estado, "orig_cep": c.orig_cep,
        "dest_rua": c.dest_rua, "dest_numero": c.dest_numero,
        "dest_complemento": c.dest_complemento,
        "dest_bairro": c.dest_bairro, "dest_cidade": c.dest_cidade,
        "dest_estado": c.dest_estado, "dest_cep": c.dest_cep,
        "data_confirmada": c.data_confirmada.isoformat() if c.data_confirmada else None,
        "dados_para_contrato": c.dados_para_contrato,
        "planilha_seguro": c.planilha_seguro,
        "observacoes_finais": c.observacoes_finais,
        "status": c.status,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "orcamento": {"id": orc.id, "numero": orc.numero, "cliente": orc.cliente} if orc else None,
    }


def _contrato_dict(c):
    return {
        "id": c.id, "numero": c.numero, "cliente": c.cliente, "cliente_id": c.cliente_id,
        "orcamento_id": c.orcamento_id, "tipo_servico": c.tipo_servico,
        "endereco_origem": c.endereco_origem, "endereco_destino": c.endereco_destino,
        "data_execucao": c.data_execucao.isoformat() if c.data_execucao else None,
        "valor_servico": c.valor_servico, "valor_seguro": c.valor_seguro, "valor": c.valor,
        "condicoes_pagamento": c.condicoes_pagamento,
        "observacoes_contratuais": c.observacoes_contratuais,
        "drive_url": c.drive_url, "status": c.status,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


def _os_dict(o):
    return {
        "id": o.id, "numero": o.numero, "contrato_id": o.contrato_id,
        "cliente": o.cliente, "cliente_id": o.cliente_id,
        "tipo_servico": o.tipo_servico,
        "endereco_origem": o.endereco_origem, "endereco_destino": o.endereco_destino,
        "data_mudanca": o.data_mudanca.isoformat() if o.data_mudanca else None,
        "hora_inicio": o.hora_inicio, "hora_fim_estimada": o.hora_fim_estimada,
        "hora_inicio_real": o.hora_inicio_real, "hora_fim_real": o.hora_fim_real,
        "motorista": o.motorista, "veiculo": o.veiculo,
        "equipe": o.equipe, "quantidade_ajudantes": o.quantidade_ajudantes,
        "quantidade_dias": o.quantidade_dias,
        "materiais_previstos": o.materiais_previstos,
        "materiais_usados": o.materiais_usados,
        "checklist": o.checklist,
        "ocorrencias": o.ocorrencias,
        "observacoes_operacionais": o.observacoes_operacionais,
        "observacoes_finais": o.observacoes_finais,
        "valor_total": o.valor_total,
        "drive_url": o.drive_url, "status": o.status,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    }


def _recibo_dict(r):
    return {
        "id": r.id, "numero": r.numero, "os_id": r.os_id,
        "cliente": r.cliente, "cliente_id": r.cliente_id,
        "servico_realizado": r.servico_realizado,
        "valor_cobrado": r.valor_cobrado, "forma_pagamento": r.forma_pagamento,
        "data_pagamento": r.data_pagamento.isoformat() if r.data_pagamento else None,
        "observacoes": r.observacoes, "drive_url": r.drive_url, "status": r.status,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


def _material_dict(m):
    return {
        "id": m.id, "nome": m.nome, "categoria": m.categoria,
        "unidade": m.unidade, "custo_unitario": m.custo_unitario,
        "quantidade_minima": m.quantidade_minima,
        "quantidade_critica": m.quantidade_critica,
        "descricao": m.descricao, "ativo": m.ativo,
        "fornecedor": getattr(m, 'fornecedor', None),
        "lote": getattr(m, 'lote', None),
        "data_compra": m.data_compra.isoformat() if getattr(m, 'data_compra', None) else None,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
    }


def _box_evento_dict(e):
    return {
        "id": e.id, "box_id": e.box_id, "tipo": e.tipo,
        "cliente_id": e.cliente_id, "cliente_nome": e.cliente_nome,
        "user_id": e.user_id,
        "data_evento": e.data_evento.isoformat() if e.data_evento else None,
        "contrato_referencia": e.contrato_referencia,
        "valor_mensal": e.valor_mensal, "observacoes": e.observacoes,
    }


def _estoque_dict(e):
    mat = Material.query.get(e.material_id) if getattr(e, 'material_id', None) else None
    return {
        "id": e.id,
        "material_id": getattr(e, 'material_id', None),
        "material": e.material,
        "material_nome": mat.nome if mat else e.material,
        "categoria": mat.categoria if mat else None,
        "unidade": e.unidade or (mat.unidade if mat else None),
        "quantidade": e.quantidade, "estoque_minimo": e.estoque_minimo,
        "estoque_critico": e.estoque_critico, "valor_unitario": e.valor_unitario,
        "localizacao": getattr(e, 'localizacao', None),
        "alerta": e.alerta,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }


def _box_dict(b):
    return {
        "id": b.id, "numero": b.numero, "status": b.status,
        "cliente_id": b.cliente_id, "cliente_nome": b.cliente_nome,
        "valor_mensal": b.valor_mensal,
        "metros_quadrados": b.metros_quadrados,
        "metros_cubicos": b.metros_cubicos,
        "localizacao": getattr(b, 'localizacao', None),
        "contrato_referencia": getattr(b, 'contrato_referencia', None),
        "data_entrada": b.data_entrada.isoformat() if b.data_entrada else None,
        "data_saida_prevista": b.data_saida_prevista.isoformat() if b.data_saida_prevista else None,
        "observacoes": b.observacoes,
    }


# ── PDF GENERATION (local) ───────────────────────────────────────────────────
def _gerar_pdf_contrato(contrato):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        import io
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4)
        styles = getSampleStyleSheet()
        story = [
            Paragraph("LEGACY MOVING - CONTRATO DE PRESTAÇÃO DE SERVIÇOS", styles['Title']),
            Spacer(1, 12),
            Paragraph(f"Contrato: {contrato.numero}", styles['Normal']),
            Paragraph(f"Cliente: {contrato.cliente}", styles['Normal']),
            Paragraph(f"Serviço: {contrato.tipo_servico}", styles['Normal']),
            Paragraph(f"Valor do Serviço: R$ {contrato.valor_servico:,.2f}", styles['Normal']),
            Paragraph(f"Valor do Seguro: R$ {contrato.valor_seguro:,.2f}", styles['Normal']),
            Paragraph(f"Condições: {contrato.condicoes_pagamento or ''}", styles['Normal']),
            Spacer(1, 12),
            Paragraph(f"Origem: {contrato.endereco_origem}", styles['Normal']),
            Paragraph(f"Destino: {contrato.endereco_destino}", styles['Normal']),
        ]
        doc.build(story)
        return buf.getvalue()
    except Exception as e:
        logger.error(f"PDF error: {e}")
        return None


def _gerar_pdf_os(os_):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        import io
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4)
        styles = getSampleStyleSheet()
        story = [
            Paragraph("LEGACY MOVING - ORDEM DE SERVIÇO", styles['Title']),
            Spacer(1, 12),
            Paragraph(f"OS: {os_.numero}", styles['Normal']),
            Paragraph(f"Cliente: {os_.cliente}", styles['Normal']),
            Paragraph(f"Data: {os_.data_mudanca.strftime('%d/%m/%Y') if os_.data_mudanca else '-'}", styles['Normal']),
            Paragraph(f"Origem: {os_.endereco_origem}", styles['Normal']),
            Paragraph(f"Destino: {os_.endereco_destino}", styles['Normal']),
            Paragraph(f"Equipe: {os_.equipe or '-'}", styles['Normal']),
            Paragraph(f"Veículo: {os_.veiculo or '-'}", styles['Normal']),
            Paragraph(f"Valor: R$ {os_.valor_total:,.2f}", styles['Normal']),
        ]
        doc.build(story)
        return buf.getvalue()
    except Exception as e:
        logger.error(f"PDF error: {e}")
        return None


def _gerar_pdf_recibo(recibo):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        import io
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4)
        styles = getSampleStyleSheet()
        story = [
            Paragraph("LEGACY MOVING - RECIBO", styles['Title']),
            Spacer(1, 12),
            Paragraph(f"Recibo: {recibo.numero}", styles['Normal']),
            Paragraph(f"Cliente: {recibo.cliente}", styles['Normal']),
            Paragraph(f"Serviço: {recibo.servico_realizado or '-'}", styles['Normal']),
            Paragraph(f"Valor: R$ {recibo.valor_cobrado:,.2f}", styles['Normal']),
            Paragraph(f"Pagamento: {recibo.forma_pagamento or '-'}", styles['Normal']),
            Paragraph(f"Data: {recibo.data_pagamento.strftime('%d/%m/%Y') if recibo.data_pagamento else '-'}", styles['Normal']),
        ]
        doc.build(story)
        return buf.getvalue()
    except Exception as e:
        logger.error(f"PDF error: {e}")
        return None


def _salvar_drive(pdf_bytes, caminho, nome_arquivo):
    """Google Drive upload — usa service account se GOOGLE_CREDENTIALS_JSON estiver configurado."""
    creds_json = os.environ.get('GOOGLE_CREDENTIALS_JSON')
    if not creds_json or not pdf_bytes:
        return None
    try:
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaIoBaseUpload
        from google.oauth2 import service_account
        import io
        creds_data = json.loads(creds_json)
        creds = service_account.Credentials.from_service_account_info(
            creds_data,
            scopes=['https://www.googleapis.com/auth/drive']
        )
        service = build('drive', 'v3', credentials=creds)

        def _get_or_create_folder(parent_id, name):
            q = f"name='{name}' and mimeType='application/vnd.google-apps.folder' and '{parent_id}' in parents and trashed=false"
            res = service.files().list(q=q, fields='files(id)').execute()
            if res['files']:
                return res['files'][0]['id']
            meta = {'name': name, 'mimeType': 'application/vnd.google-apps.folder', 'parents': [parent_id]}
            f = service.files().create(body=meta, fields='id').execute()
            return f['id']

        root = service.files().list(q="name='Legacy Moving' and mimeType='application/vnd.google-apps.folder' and trashed=false", fields='files(id)').execute()
        if root['files']:
            root_id = root['files'][0]['id']
        else:
            meta = {'name': 'Legacy Moving', 'mimeType': 'application/vnd.google-apps.folder'}
            root_id = service.files().create(body=meta, fields='id').execute()['id']

        folder_id = root_id
        for part in caminho.split('/'):
            if part:
                folder_id = _get_or_create_folder(folder_id, part)

        media = MediaIoBaseUpload(io.BytesIO(pdf_bytes), mimetype='application/pdf')
        file_meta = {'name': nome_arquivo, 'parents': [folder_id]}
        f = service.files().create(body=file_meta, media_body=media, fields='id,webViewLink').execute()
        service.permissions().create(fileId=f['id'], body={'role': 'reader', 'type': 'anyone'}).execute()
        return f.get('webViewLink')
    except Exception as e:
        logger.error(f"Drive upload error: {e}")
        return None


# ── HEALTH ───────────────────────────────────────────────────────────────────
@app.route('/api/health')
def health():
    return jsonify({"status": "ok", "sistema": "Legacy Moving v2.0",
                    "timestamp": datetime.now().isoformat()})


# ── AUTH ─────────────────────────────────────────────────────────────────────
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json or {}
    cpf = data.get('cpf', '').replace('.', '').replace('-', '').replace(' ', '')
    password = data.get('password', '')
    if not cpf or not password:
        return err("CPF e senha são obrigatórios")
    user = User.query.filter_by(cpf=cpf).first()
    if not user or not check_password_hash(user.password, password):
        return err("CPF ou senha inválidos", 401)
    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": _user_dict(user)})


@app.route('/api/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    return jsonify({"status": "ok", "mensagem": "Logout realizado"})


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def me():
    return jsonify(_user_dict(current_user()))


# ── USUÁRIOS ─────────────────────────────────────────────────────────────────
@app.route('/api/usuarios', methods=['GET'])
@jwt_required()
def listar_usuarios():
    role_f = request.args.get('role', '')
    q = User.query
    if role_f:
        q = q.filter_by(role=role_f)
    ativo_f = request.args.get('ativo', '')
    if ativo_f == '1':
        q = q.filter(User.ativo == True)  # noqa: E712
    return jsonify([_user_dict(u) for u in q.order_by(User.name).all()])


@app.route('/api/usuarios', methods=['POST'])
@require_role('admin')
def criar_usuario():
    data = request.json or {}
    cpf = data.get('cpf', '').replace('.', '').replace('-', '')
    if not cpf or not data.get('password') or not data.get('name'):
        return err("cpf, password e name são obrigatórios")
    if User.query.filter_by(cpf=cpf).first():
        return err("CPF já cadastrado")
    u = User(cpf=cpf, password=generate_password_hash(data['password']),
             name=data['name'], email=data.get('email', ''),
             role=data.get('role', 'comercial'),
             telefone=data.get('telefone', ''),
             ativo=data.get('ativo', True))
    db.session.add(u)
    db.session.flush()
    registrar_audit(current_user(), 'criar', 'usuario', u.id, f'Usuário criado: {u.name}')
    db.session.commit()
    return jsonify(_user_dict(u)), 201


@app.route('/api/usuarios/<int:id>', methods=['PUT'])
@require_role('admin')
def atualizar_usuario(id):
    import json as _json
    u = User.query.get_or_404(id)
    data = request.json or {}
    for f in ['name', 'email', 'role', 'telefone']:
        if f in data:
            setattr(u, f, data[f])
    if 'ativo' in data:
        u.ativo = bool(data['ativo'])
    if data.get('password'):
        u.password = generate_password_hash(data['password'])
    if 'permissoes' in data:
        u.permissoes = _json.dumps(data['permissoes']) if data['permissoes'] else None
    registrar_audit(current_user(), 'atualizar', 'usuario', id,
                    f'Usuário atualizado: {u.name}', dados_novos={k: v for k, v in data.items() if k != 'password'})
    db.session.commit()
    return jsonify(_user_dict(u))


@app.route('/api/usuarios/<int:id>/permissoes', methods=['GET'])
@jwt_required()
def get_permissoes_usuario(id):
    import json as _json
    u = User.query.get_or_404(id)
    perm_raw = getattr(u, 'permissoes', None)
    try:
        permissoes = _json.loads(perm_raw) if perm_raw else None
    except Exception:
        permissoes = None
    return jsonify(permissoes)


@app.route('/api/usuarios/<int:id>/permissoes', methods=['PUT'])
@require_role('admin')
def set_permissoes_usuario(id):
    import json as _json
    u = User.query.get_or_404(id)
    data = request.json
    u.permissoes = _json.dumps(data) if data is not None else None
    registrar_audit(current_user(), 'permissoes', 'usuario', id, f'Permissões atualizadas: {u.name}')
    db.session.commit()
    return jsonify({"status": "ok"})


# ── DASHBOARD ─────────────────────────────────────────────────────────────────
@app.route('/api/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    now = datetime.utcnow()
    inicio_mes = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    leads_novos = Lead.query.filter(Lead.status == 'novo').count()
    leads_sem_contato = Lead.query.filter(
        Lead.status == 'novo',
        Lead.created_at <= now - timedelta(days=3)
    ).count()

    mudancas_mes = OrdemServico.query.filter(
        OrdemServico.created_at >= inicio_mes,
        OrdemServico.status.in_(['agendada', 'em_andamento', 'concluida'])
    ).count()

    boxes_ocupados = GuardaMovel.query.filter_by(status='ocupado').all()
    boxes_total = GuardaMovel.query.count()
    receita_recorrente = sum(b.valor_mensal for b in boxes_ocupados)

    clientes_ativos = Cliente.query.filter_by(status='ativo').count()
    orcamentos_abertos = Orcamento.query.filter(
        Orcamento.status.in_(['novo', 'em_negociacao'])
    ).count()

    estoque_alertas = Estoque.query.filter(
        Estoque.quantidade <= Estoque.estoque_minimo
    ).count()

    proximas_os = OrdemServico.query.filter(
        OrdemServico.status.in_(['agendada', 'em_andamento']),
        OrdemServico.data_mudanca >= now
    ).order_by(OrdemServico.data_mudanca).limit(5).all()

    return jsonify({
        "leads_novos": leads_novos,
        "leads_sem_contato": leads_sem_contato,
        "mudancas_mes": mudancas_mes,
        "boxes_ocupados": len(boxes_ocupados),
        "boxes_total": boxes_total,
        "receita_recorrente": receita_recorrente,
        "clientes_ativos": clientes_ativos,
        "orcamentos_abertos": orcamentos_abertos,
        "estoque_alertas": estoque_alertas,
        "proximas_os": [_os_dict(o) for o in proximas_os],
    })


# ── LEADS ─────────────────────────────────────────────────────────────────────
@app.route('/api/leads', methods=['GET'])
@require_role('admin', 'vendedor')
def listar_leads():
    status_f = request.args.get('status', '')
    q = request.args.get('q', '')
    query = Lead.query
    if status_f and status_f != 'todos':
        query = query.filter_by(status=status_f)
    if q:
        query = query.filter(Lead.nome.ilike(f'%{q}%'))
    leads = query.order_by(Lead.created_at.desc()).all()
    return jsonify([_lead_dict(l) for l in leads])


@app.route('/api/leads/<int:id>', methods=['GET'])
@require_role('admin', 'vendedor')
def obter_lead(id):
    return jsonify(_lead_dict(Lead.query.get_or_404(id)))


@app.route('/api/leads', methods=['POST'])
@require_role('admin', 'vendedor')
def criar_lead():
    data = request.json or {}
    if not data.get('nome') or not data.get('telefone'):
        return err("nome e telefone são obrigatórios")
    u = current_user()
    l = Lead(
        nome=data['nome'], telefone=data['telefone'],
        email=data.get('email', ''),
        origem=data.get('origem', 'site'),
        tipo_servico=data.get('tipo_servico', 'residencial'),
        bairro_origem=data.get('bairro_origem', ''),
        cidade_origem=data.get('cidade_origem', ''),
        bairro_destino=data.get('bairro_destino', ''),
        cidade_destino=data.get('cidade_destino', ''),
        observacoes=data.get('observacoes', ''),
        vendedor_id=u.id if u else None,
        organizer_id=data.get('organizer_id'),
        status='novo'
    )
    db.session.add(l)
    db.session.commit()
    return jsonify(_lead_dict(l)), 201


@app.route('/api/leads/<int:id>', methods=['PUT'])
@require_role('admin', 'vendedor')
def atualizar_lead(id):
    l = Lead.query.get_or_404(id)
    data = request.json or {}
    for f in ['nome', 'telefone', 'email', 'origem', 'tipo_servico',
              'bairro_origem', 'cidade_origem', 'bairro_destino', 'cidade_destino',
              'observacoes', 'classificacao', 'classificacao_justificativa',
              'organizer_id', 'status']:
        if f in data:
            setattr(l, f, data[f])
    if data.get('classificacao') and l.status == 'novo':
        l.status = 'classificado'
    db.session.commit()
    return jsonify(_lead_dict(l))


@app.route('/api/leads/<int:id>/classificar', methods=['POST'])
@require_role('admin', 'vendedor')
def classificar_lead(id):
    l = Lead.query.get_or_404(id)
    data = request.json or {}
    classificacao = data.get('classificacao')
    if classificacao not in ('A', 'AA', 'B2B', 'Baixo'):
        return err("classificacao deve ser A, AA, B2B ou Baixo")
    l.classificacao = classificacao
    l.classificacao_justificativa = data.get('justificativa', '')
    l.status = 'classificado'
    db.session.commit()
    return jsonify(_lead_dict(l))


@app.route('/api/leads/<int:id>/converter', methods=['POST'])
@require_role('admin', 'vendedor')
def converter_lead(id):
    """Converte lead em orçamento + cliente (se necessário)."""
    l = Lead.query.get_or_404(id)
    if l.status == 'convertido':
        return err("Lead já foi convertido")
    if not l.classificacao:
        return err("Lead precisa ser classificado antes de converter")

    # Cria ou associa cliente
    cliente = None
    if l.email:
        cliente = Cliente.query.filter_by(email=l.email).first()
    if not cliente:
        cliente = Cliente(
            nome=l.nome, telefone=l.telefone, email=l.email or '',
            origem=l.origem, organizer_id=l.organizer_id, status='ativo'
        )
        db.session.add(cliente)
        db.session.flush()

    # Cria orçamento
    numero = Contador.proximo('orc')
    orc = Orcamento(
        numero=numero, cliente=l.nome, cliente_id=cliente.id,
        vendedor_id=l.vendedor_id, lead_id=l.id,
        tipo_servico=l.tipo_servico,
        orig_bairro=l.bairro_origem, orig_cidade=l.cidade_origem,
        dest_bairro=l.bairro_destino, dest_cidade=l.cidade_destino,
        status='novo'
    )
    db.session.add(orc)
    db.session.flush()

    l.status = 'convertido'
    l.orcamento_id = orc.id
    db.session.commit()
    return jsonify({"lead": _lead_dict(l), "orcamento": _orc_dict(orc), "cliente": _cliente_dict(cliente)})


@app.route('/api/leads/<int:id>', methods=['DELETE'])
@require_role('admin', 'vendedor')
def deletar_lead(id):
    l = Lead.query.get_or_404(id)
    l.status = 'perdido'
    db.session.commit()
    return jsonify({"status": "perdido"})


# ── MIRANTE (IA) ──────────────────────────────────────────────────────────────
@app.route('/api/mirante/chat', methods=['POST'])
@jwt_required()
def mirante_chat():
    data = request.json or {}
    mensagem = data.get('mensagem', '').strip()
    historico = data.get('historico', [])
    if not mensagem:
        return err("mensagem é obrigatória")

    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        return jsonify({"resposta": "Mirante não configurado. Adicione ANTHROPIC_API_KEY no .env.", "dados_contexto": {}})

    # Contexto real do banco
    now = datetime.utcnow()
    mes, ano = now.month, now.year
    inicio_mes = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    leads_novos = Lead.query.filter_by(status='novo').count()
    leads_parados = Lead.query.filter(
        Lead.status == 'novo', Lead.created_at <= now - timedelta(days=3)
    ).count()
    os_abertas = OrdemServico.query.filter(OrdemServico.status.in_(['agendada', 'em_andamento'])).count()
    os_semana = OrdemServico.query.filter(
        OrdemServico.data_mudanca >= now,
        OrdemServico.data_mudanca <= now + timedelta(days=7),
        OrdemServico.status == 'agendada'
    ).count()
    estoque_critico = Estoque.query.filter(Estoque.quantidade <= Estoque.estoque_critico).count()
    estoque_baixo = Estoque.query.filter(
        Estoque.quantidade <= Estoque.estoque_minimo,
        Estoque.quantidade > Estoque.estoque_critico
    ).count()
    boxes_ocu = GuardaMovel.query.filter_by(status='ocupado').count()
    boxes_venc = GuardaMovel.query.filter(
        GuardaMovel.status == 'ocupado',
        GuardaMovel.data_saida_prevista <= now + timedelta(days=30),
        GuardaMovel.data_saida_prevista.isnot(None)
    ).count()
    receita_mes = sum(r.valor_cobrado for r in Recibo.query.filter(
        Recibo.status == 'recebido',
        extract('month', Recibo.created_at) == mes,
        extract('year', Recibo.created_at) == ano
    ).all())
    despesas_mes = sum(d.valor for d in Despesa.query.filter(
        extract('month', Despesa.data) == mes,
        extract('year', Despesa.data) == ano
    ).all())
    metas = Meta.query.all()

    contexto = {
        "data_atual": now.strftime('%d/%m/%Y'),
        "leads_novos_sem_classificar": leads_novos,
        "leads_sem_contato_3dias": leads_parados,
        "os_abertas": os_abertas,
        "os_proxima_semana": os_semana,
        "estoque_critico": estoque_critico,
        "estoque_baixo": estoque_baixo,
        "boxes_ocupados": boxes_ocu,
        "boxes_com_saida_proxima": boxes_venc,
        "receita_mes_atual": receita_mes,
        "despesas_mes_atual": despesas_mes,
        "lucro_mes_atual": receita_mes - despesas_mes,
        "metas": [{"titulo": m.titulo, "meta": m.meta, "realizado": m.realizado} for m in metas]
    }

    system_prompt = f"""Você é Mirante, o assistente de inteligência artificial interno da Legacy Moving.
Você tem acesso aos dados reais do sistema. Seja objetivo, direto e útil.
NUNCA salve nada no banco diretamente. Apenas sugira e preencha formulários.
Dados atuais do sistema:
{json.dumps(contexto, ensure_ascii=False, indent=2)}"""

    try:
        import anthropic
        client_ai = anthropic.Anthropic(api_key=api_key)
        msgs = []
        for h in historico[-10:]:
            if h.get('role') in ('user', 'assistant') and h.get('content'):
                msgs.append({"role": h['role'], "content": h['content']})
        msgs.append({"role": "user", "content": mensagem})

        response = client_ai.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=system_prompt,
            messages=msgs
        )
        resposta = response.content[0].text
    except Exception as e:
        logger.error(f"Mirante error: {e}")
        resposta = f"Erro ao consultar Mirante: {str(e)}"

    return jsonify({"resposta": resposta, "dados_contexto": contexto})


@app.route('/api/mirante/classificar-lead', methods=['POST'])
@require_role('admin', 'vendedor')
def mirante_classificar_lead():
    """IA sugere classificação de lead. Usuário confirma antes de salvar."""
    data = request.json or {}
    info = data.get('info', '')
    if not info:
        return err("info do lead é obrigatória")

    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        return jsonify({
            "classificacao_sugerida": "A",
            "justificativa": "Mirante não configurado. Classify manualmente.",
            "campos_sugeridos": {}
        })

    try:
        import anthropic
        client_ai = anthropic.Anthropic(api_key=api_key)
        prompt = f"""Analise as informações abaixo de um potencial cliente de mudança premium e sugira uma classificação.

Classificações possíveis:
- A: cliente comum, boa aderência ao serviço
- AA: cliente premium, alta prioridade, budget elevado
- B2B: empresa, fluxo diferenciado
- Baixo: pouco aderente, baixa prioridade

Informações do lead:
{info}

Responda APENAS em JSON válido:
{{"classificacao": "A|AA|B2B|Baixo", "justificativa": "motivo em 2-3 frases", "campos_sugeridos": {{"tipo_servico": "residencial|comercial|corporativo|guarda_moveis", "origem": "site|instagram|whatsapp|indicacao|google_ads|b2b|organizer"}}}}"""

        response = client_ai.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )
        result = json.loads(response.content[0].text)
    except Exception as e:
        logger.error(f"Mirante classificar error: {e}")
        result = {"classificacao_sugerida": "A", "justificativa": f"Erro: {e}", "campos_sugeridos": {}}

    return jsonify(result)


# ── CLIENTES ─────────────────────────────────────────────────────────────────
@app.route('/api/clientes', methods=['GET'])
@jwt_required()
def listar_clientes():
    status_f = request.args.get('status', '')
    q = request.args.get('q', '')
    query = Cliente.query
    if status_f and status_f != 'todos':
        query = query.filter_by(status=status_f)
    else:
        query = query.filter(Cliente.status != 'arquivado')
    if q:
        query = query.filter(Cliente.nome.ilike(f'%{q}%'))
    return jsonify([_cliente_dict(c) for c in query.order_by(Cliente.created_at.desc()).all()])


@app.route('/api/clientes/<int:id>', methods=['GET'])
@jwt_required()
def obter_cliente(id):
    c = Cliente.query.get_or_404(id)
    orc_list = Orcamento.query.filter_by(cliente_id=id).all()
    con_list = Contrato.query.filter_by(cliente_id=id).all()
    os_list = OrdemServico.query.filter_by(cliente_id=id).all()
    rec_list = Recibo.query.filter_by(cliente_id=id).all()
    av_list = Avaria.query.filter_by(cliente_id=id).order_by(Avaria.created_at.desc()).all()
    valor_total = sum(r.valor_cobrado for r in rec_list if r.status == 'recebido')
    d = _cliente_dict(c)
    d.update({
        "orcamentos": [_orc_dict(o) for o in orc_list],
        "contratos": [_contrato_dict(ct) for ct in con_list],
        "ordens_servico": [_os_dict(o) for o in os_list],
        "recibos": [_recibo_dict(r) for r in rec_list],
        "avarias": [_avaria_dict(av) for av in av_list],
        "valor_total_gasto": valor_total,
    })
    return jsonify(d)


@app.route('/api/clientes', methods=['POST'])
@jwt_required()
def criar_cliente():
    data = request.json or {}
    if not data.get('nome'):
        return err("Nome é obrigatório")
    c = Cliente(
        nome=data['nome'], email=data.get('email', ''),
        telefone=data.get('telefone', ''), cpf_cnpj=data.get('cpf_cnpj', ''),
        endereco=data.get('endereco', ''), origem=data.get('origem', 'direto'),
        organizer_id=data.get('organizer_id'), status='ativo'
    )
    db.session.add(c)
    db.session.commit()
    return jsonify(_cliente_dict(c)), 201


@app.route('/api/clientes/<int:id>', methods=['PUT'])
@jwt_required()
def atualizar_cliente(id):
    c = Cliente.query.get_or_404(id)
    data = request.json or {}
    for f in ['nome', 'email', 'telefone', 'cpf_cnpj', 'endereco', 'origem', 'organizer_id', 'status']:
        if f in data:
            setattr(c, f, data[f])
    db.session.commit()
    return jsonify(_cliente_dict(c))


@app.route('/api/clientes/<int:id>', methods=['DELETE'])
@require_role('admin', 'vendedor')
def arquivar_cliente(id):
    c = Cliente.query.get_or_404(id)
    c.status = 'arquivado'
    db.session.commit()
    return jsonify({"status": "arquivado"})


@app.route('/api/clientes/<int:id>/historico', methods=['GET'])
@jwt_required()
def historico_cliente(id):
    c = Cliente.query.get_or_404(id)
    os_list = OrdemServico.query.filter_by(cliente_id=id).order_by(OrdemServico.created_at.desc()).all()
    orcamentos = Orcamento.query.filter_by(cliente_id=id).order_by(Orcamento.created_at.desc()).all()
    contratos = Contrato.query.filter_by(cliente_id=id).order_by(Contrato.created_at.desc()).all() if hasattr(Contrato, 'cliente_id') else []
    recibos = Recibo.query.filter_by(cliente_id=id).order_by(Recibo.created_at.desc()).all()
    av_list = Avaria.query.filter_by(cliente_id=id).order_by(Avaria.created_at.desc()).all()
    return jsonify({
        "cliente": _cliente_dict(c),
        "ordens_servico": [_os_dict(o) for o in os_list],
        "orcamentos": [_orc_dict(o) for o in orcamentos],
        "contratos": [_contrato_dict(ct) for ct in contratos],
        "recibos": [{
            "id": r.id, "numero": r.numero,
            "valor_cobrado": r.valor_cobrado,
            "status": r.status,
            "data_vencimento": r.data_vencimento.isoformat() if r.data_vencimento else None,
            "data_recebimento": r.data_recebimento.isoformat() if r.data_recebimento else None,
            "forma_pagamento": r.forma_pagamento,
        } for r in recibos],
        "avarias": [_avaria_dict(av) for av in av_list],
    })


# ── ORGANIZERS ────────────────────────────────────────────────────────────────
def _org_stats(o):
    total = Lead.query.filter_by(organizer_id=o.id).count()
    convertidos = Lead.query.filter_by(organizer_id=o.id, status='convertido').count()
    perdidos = Lead.query.filter_by(organizer_id=o.id, status='perdido').count()
    recibos = (Recibo.query.join(OrdemServico, Recibo.os_id == OrdemServico.id)
               .join(Cliente, OrdemServico.cliente_id == Cliente.id)
               .filter(Cliente.organizer_id == o.id, Recibo.status == 'recebido').all())
    receita = sum(r.valor_cobrado for r in recibos)
    fechamentos = FechamentoOperacional.query.filter_by(organizer_id=o.id, status='finalizado').all()
    lucro_total = sum(f.lucro_liquido for f in fechamentos if f.lucro_liquido)
    comissao_total = sum(c.valor for c in Comissao.query.filter_by(organizer_id=o.id).all())
    comissao_paga = sum(c.valor for c in Comissao.query.filter_by(organizer_id=o.id, status='pago').all())
    ultimo_lead = (Lead.query.filter_by(organizer_id=o.id)
                   .order_by(Lead.created_at.desc()).first())
    return {
        "id": o.id, "nome": o.nome, "instagram": o.instagram, "telefone": o.telefone,
        "empresa": o.empresa, "cidade": o.cidade, "observacoes": o.observacoes,
        "classificacao": o.classificacao or 'bronze', "meta_mensal": o.meta_mensal or 0,
        "status": o.status,
        "total_leads": total, "convertidos": convertidos, "perdidos": perdidos,
        "taxa_conversao": round(convertidos / total * 100, 1) if total > 0 else 0,
        "receita_gerada": receita, "lucro_gerado": lucro_total,
        "comissao_acumulada": comissao_total, "comissao_paga": comissao_paga,
        "comissao_pendente": comissao_total - comissao_paga,
        "ticket_medio": round(receita / convertidos, 2) if convertidos > 0 else 0,
        "ultima_indicacao": ultimo_lead.created_at.isoformat() if ultimo_lead else None,
        "dias_sem_indicar": (datetime.utcnow() - ultimo_lead.created_at).days if ultimo_lead else None,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    }


def _classificar_organizer(o):
    stats = _org_stats(o)
    receita = stats['receita_gerada']
    conversao = stats['taxa_conversao']
    total = stats['total_leads']
    if receita >= 100000 or (conversao >= 70 and total >= 10):
        nova = 'vip'
    elif receita >= 50000 or (conversao >= 60 and total >= 5):
        nova = 'ouro'
    elif receita >= 20000 or total >= 5:
        nova = 'prata'
    else:
        nova = 'bronze'
    if o.classificacao != nova:
        o.classificacao = nova
        db.session.commit()
    return nova


@app.route('/api/organizers', methods=['GET'])
@jwt_required()
def listar_organizers():
    include_inativas = request.args.get('todas') == '1'
    q = Organizer.query
    if not include_inativas:
        q = q.filter(Organizer.status != 'inativo')
    orgs = q.order_by(Organizer.nome).all()
    result = [_org_stats(o) for o in orgs]
    result.sort(key=lambda x: x['receita_gerada'], reverse=True)
    return jsonify(result)


@app.route('/api/vendedores/ranking', methods=['GET'])
@jwt_required()
def ranking_vendedores():
    """Ranking de performance dos vendedores (usuários com role vendedor ou admin)."""
    from sqlalchemy import func
    vendedores = User.query.filter(User.role.in_(['admin', 'vendedor']), User.ativo == True).all()  # noqa: E712
    stats = []
    for v in vendedores:
        leads_total = Lead.query.filter_by(vendedor_id=v.id).count()
        leads_conv = Lead.query.filter_by(vendedor_id=v.id, status='convertido').count()
        # OS via orçamentos dos leads convertidos → orcamento.cliente_id → OS.cliente_id
        conv_leads = Lead.query.filter_by(vendedor_id=v.id, status='convertido').all()
        orc_cliente_ids = set()
        for lx in conv_leads:
            if lx.orcamento_id:
                orc = Orcamento.query.get(lx.orcamento_id)
                if orc and orc.cliente_id:
                    orc_cliente_ids.add(orc.cliente_id)
        orc_cliente_ids = list(orc_cliente_ids)
        os_total = OrdemServico.query.filter(OrdemServico.cliente_id.in_(orc_cliente_ids)).count() if orc_cliente_ids else 0
        os_finalizadas = OrdemServico.query.filter(
            OrdemServico.cliente_id.in_(orc_cliente_ids),
            OrdemServico.status.in_(['concluida', 'finalizada'])
        ).count() if orc_cliente_ids else 0
        receita = db.session.query(func.sum(OrdemServico.valor_total)).filter(
            OrdemServico.cliente_id.in_(orc_cliente_ids)
        ).scalar() if orc_cliente_ids else 0
        receita = receita or 0
        taxa_conv = round((leads_conv / leads_total * 100), 1) if leads_total > 0 else 0.0
        stats.append({
            "id": v.id,
            "nome": v.name,
            "role": v.role,
            "leads_total": leads_total,
            "leads_convertidos": leads_conv,
            "os_total": os_total,
            "os_finalizadas": os_finalizadas,
            "receita_gerada": float(receita),
            "taxa_conversao": taxa_conv,
        })
    stats.sort(key=lambda x: x['receita_gerada'], reverse=True)
    for i, s in enumerate(stats):
        s['posicao'] = i + 1
    return jsonify(stats)


@app.route('/api/organizers/ranking', methods=['GET'])
@jwt_required()
def ranking_organizers():
    orgs = Organizer.query.filter(Organizer.status != 'inativo').all()
    stats = []
    for o in orgs:
        s = _org_stats(o)
        _classificar_organizer(o)
        stats.append(s)
    stats.sort(key=lambda x: x['lucro_gerado'], reverse=True)
    for i, s in enumerate(stats):
        s['posicao'] = i + 1
    return jsonify(stats)


@app.route('/api/organizers/<int:id>/dashboard', methods=['GET'])
@jwt_required()
def dashboard_organizer(id):
    o = Organizer.query.get_or_404(id)
    stats = _org_stats(o)
    # Histórico mensal dos últimos 12 meses
    from sqlalchemy import func
    historico = []
    for i in range(11, -1, -1):
        mes_dt = datetime.utcnow().replace(day=1) - timedelta(days=30 * i)
        mes = mes_dt.month
        ano = mes_dt.year
        leads_mes = Lead.query.filter_by(organizer_id=id).filter(
            extract('month', Lead.created_at) == mes,
            extract('year', Lead.created_at) == ano
        ).count()
        conv_mes = Lead.query.filter_by(organizer_id=id, status='convertido').filter(
            extract('month', Lead.created_at) == mes,
            extract('year', Lead.created_at) == ano
        ).count()
        historico.append({
            "mes": mes_dt.strftime('%b/%y'),
            "leads": leads_mes,
            "convertidos": conv_mes,
        })
    # Alertas
    alertas = []
    if stats['dias_sem_indicar'] is not None and stats['dias_sem_indicar'] >= 30:
        alertas.append({"tipo": "inatividade", "msg": f"Sem indicações há {stats['dias_sem_indicar']} dias"})
    if stats['meta_mensal'] > 0:
        mes_atual = datetime.utcnow().month
        leads_mes = Lead.query.filter_by(organizer_id=id).filter(
            extract('month', Lead.created_at) == mes_atual
        ).count()
        if leads_mes >= stats['meta_mensal']:
            alertas.append({"tipo": "meta", "msg": "Meta mensal atingida!"})
    return jsonify({**stats, "historico_mensal": historico, "alertas": alertas})


@app.route('/api/organizers/<int:id>/comissoes', methods=['GET'])
@jwt_required()
def comissoes_organizer(id):
    Organizer.query.get_or_404(id)
    comissoes = Comissao.query.filter_by(organizer_id=id).order_by(Comissao.created_at.desc()).all()
    return jsonify([{
        "id": c.id, "os_id": c.os_id, "fechamento_id": c.fechamento_id,
        "valor": c.valor, "percentual": c.percentual, "status": c.status,
        "data_pagamento": c.data_pagamento.isoformat() if c.data_pagamento else None,
        "observacoes": c.observacoes,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    } for c in comissoes])


@app.route('/api/organizers', methods=['POST'])
@require_role('admin', 'vendedor')
def criar_organizer():
    data = request.json or {}
    if not data.get('nome'):
        return err("Nome é obrigatório")
    o = Organizer(
        nome=data['nome'],
        instagram=data.get('instagram', ''),
        telefone=data.get('telefone', ''),
        empresa=data.get('empresa', ''),
        cidade=data.get('cidade', ''),
        observacoes=data.get('observacoes', ''),
        classificacao=data.get('classificacao', 'bronze'),
        meta_mensal=float(data.get('meta_mensal', 0) or 0),
        status=data.get('status', 'ativo'),
    )
    db.session.add(o)
    db.session.commit()
    return jsonify(_org_stats(o)), 201


@app.route('/api/organizers/<int:id>', methods=['PUT'])
@require_role('admin', 'vendedor')
def atualizar_organizer(id):
    o = Organizer.query.get_or_404(id)
    data = request.json or {}
    for f in ['nome', 'instagram', 'telefone', 'empresa', 'cidade', 'observacoes', 'classificacao', 'status']:
        if f in data:
            setattr(o, f, data[f])
    if 'meta_mensal' in data:
        o.meta_mensal = float(data['meta_mensal'] or 0)
    db.session.commit()
    return jsonify(_org_stats(o))


@app.route('/api/organizers/<int:id>', methods=['DELETE'])
@require_role('admin', 'vendedor')
def inativar_organizer(id):
    o = Organizer.query.get_or_404(id)
    o.status = 'inativo'
    db.session.commit()
    return jsonify({"status": "inativo"})


# ── ORÇAMENTOS ────────────────────────────────────────────────────────────────
@app.route('/api/orcamentos', methods=['GET'])
@require_role('admin', 'vendedor')
def listar_orcamentos():
    status_f = request.args.get('status', '')
    q = request.args.get('q', '')
    query = Orcamento.query
    if status_f and status_f != 'todos':
        query = query.filter_by(status=status_f)
    if q:
        query = query.filter(Orcamento.cliente.ilike(f'%{q}%'))
    return jsonify([_orc_dict(o) for o in query.order_by(Orcamento.created_at.desc()).all()])


@app.route('/api/orcamentos/<int:id>', methods=['GET'])
@require_role('admin', 'vendedor')
def obter_orcamento(id):
    return jsonify(_orc_dict(Orcamento.query.get_or_404(id)))


@app.route('/api/orcamentos', methods=['POST'])
@require_role('admin', 'vendedor')
def criar_orcamento():
    data = request.json or {}
    if not data.get('cliente'):
        return err("cliente é obrigatório")
    u = current_user()
    numero = Contador.proximo('orc')
    data_prev = None
    if data.get('data_prevista'):
        try:
            data_prev = datetime.fromisoformat(data['data_prevista'])
        except ValueError:
            pass
    o = Orcamento(
        numero=numero, cliente=data['cliente'],
        cliente_id=data.get('cliente_id'), vendedor_id=u.id if u else None,
        lead_id=data.get('lead_id'),
        tipo_servico=data.get('tipo_servico', 'residencial'),
        data_prevista=data_prev,
        orig_rua=data.get('orig_rua', ''), orig_numero=data.get('orig_numero', ''),
        orig_complemento=data.get('orig_complemento', ''), orig_bairro=data.get('orig_bairro', ''),
        orig_cidade=data.get('orig_cidade', ''), orig_estado=data.get('orig_estado', ''),
        orig_cep=data.get('orig_cep', ''),
        dest_rua=data.get('dest_rua', ''), dest_numero=data.get('dest_numero', ''),
        dest_complemento=data.get('dest_complemento', ''), dest_bairro=data.get('dest_bairro', ''),
        dest_cidade=data.get('dest_cidade', ''), dest_estado=data.get('dest_estado', ''),
        dest_cep=data.get('dest_cep', ''),
        valor_servico=float(data.get('valor_servico', 0)),
        valor_seguro=float(data.get('valor_seguro', 0)),
        condicoes_pagamento=data.get('condicoes_pagamento', ''),
        observacoes_comerciais=data.get('observacoes_comerciais', ''),
        status='novo'
    )
    db.session.add(o)
    db.session.commit()
    return jsonify(_orc_dict(o)), 201


@app.route('/api/orcamentos/<int:id>', methods=['PUT'])
@require_role('admin', 'vendedor')
def atualizar_orcamento(id):
    o = Orcamento.query.get_or_404(id)
    if o.status in ('aprovado', 'rejeitado', 'cancelado'):
        return err("Orçamento não pode ser editado no status atual")
    data = request.json or {}
    for f in ['cliente', 'cliente_id', 'tipo_servico', 'condicoes_pagamento',
              'observacoes_comerciais', 'justificativa',
              'orig_rua', 'orig_numero', 'orig_complemento', 'orig_bairro',
              'orig_cidade', 'orig_estado', 'orig_cep',
              'dest_rua', 'dest_numero', 'dest_complemento', 'dest_bairro',
              'dest_cidade', 'dest_estado', 'dest_cep']:
        if f in data:
            setattr(o, f, data[f])
    if 'valor_servico' in data:
        o.valor_servico = float(data['valor_servico'])
    if 'valor_seguro' in data:
        o.valor_seguro = float(data['valor_seguro'])
    if 'data_prevista' in data and data['data_prevista']:
        try:
            o.data_prevista = datetime.fromisoformat(data['data_prevista'])
        except ValueError:
            pass
    if 'status' in data:
        novo_status = data['status']
        if novo_status in ('rejeitado', 'cancelado') and not data.get('justificativa') and not o.justificativa:
            return err("justificativa é obrigatória ao rejeitar ou cancelar")
        o.status = novo_status
    db.session.commit()
    return jsonify(_orc_dict(o))


@app.route('/api/orcamentos/<int:id>/aprovar', methods=['POST'])
@require_role('admin', 'vendedor')
def aprovar_orcamento(id):
    o = Orcamento.query.get_or_404(id)
    if o.status != 'novo' and o.status != 'em_negociacao':
        return err("Apenas orçamentos em negociação podem ser aprovados")
    o.status = 'aprovado'
    # Cria cadastro complementar automaticamente
    if not CadastroComplementar.query.filter_by(orcamento_id=id).first():
        cad = CadastroComplementar(
            orcamento_id=id, cliente_id=o.cliente_id,
            orig_rua=o.orig_rua, orig_numero=o.orig_numero,
            orig_complemento=o.orig_complemento,
            orig_bairro=o.orig_bairro, orig_cidade=o.orig_cidade,
            orig_estado=o.orig_estado, orig_cep=o.orig_cep,
            dest_rua=o.dest_rua, dest_numero=o.dest_numero,
            dest_complemento=o.dest_complemento,
            dest_bairro=o.dest_bairro, dest_cidade=o.dest_cidade,
            dest_estado=o.dest_estado, dest_cep=o.dest_cep,
            status='pendente'
        )
        db.session.add(cad)
    db.session.commit()
    cad = CadastroComplementar.query.filter_by(orcamento_id=id).first()
    return jsonify({"orcamento": _orc_dict(o), "cadastro": _cadastro_dict(cad)})


@app.route('/api/orcamentos/<int:id>', methods=['DELETE'])
@require_role('admin', 'vendedor')
def deletar_orcamento(id):
    o = Orcamento.query.get_or_404(id)
    if o.status == 'aprovado':
        return err("Orçamento aprovado não pode ser excluído")
    db.session.delete(o)
    db.session.commit()
    return jsonify({"status": "deletado"})


# ── CADASTRO COMPLEMENTAR ─────────────────────────────────────────────────────
@app.route('/api/cadastro-complementar', methods=['GET'])
@require_role('admin', 'vendedor')
def listar_cadastros():
    return jsonify([_cadastro_dict(c) for c in
                    CadastroComplementar.query.order_by(CadastroComplementar.created_at.desc()).all()])


@app.route('/api/cadastro-complementar/<int:id>', methods=['GET'])
@require_role('admin', 'vendedor')
def obter_cadastro(id):
    return jsonify(_cadastro_dict(CadastroComplementar.query.get_or_404(id)))


@app.route('/api/cadastro-complementar/orcamento/<int:orc_id>', methods=['GET'])
@require_role('admin', 'vendedor')
def cadastro_por_orcamento(orc_id):
    c = CadastroComplementar.query.filter_by(orcamento_id=orc_id).first_or_404()
    return jsonify(_cadastro_dict(c))


@app.route('/api/cadastro-complementar/<int:id>', methods=['PUT'])
@require_role('admin', 'vendedor')
def atualizar_cadastro(id):
    c = CadastroComplementar.query.get_or_404(id)
    data = request.json or {}
    for f in ['cpf_cnpj', 'rg_ie', 'dados_para_contrato', 'planilha_seguro', 'observacoes_finais',
              'orig_rua', 'orig_numero', 'orig_complemento', 'orig_bairro',
              'orig_cidade', 'orig_estado', 'orig_cep',
              'dest_rua', 'dest_numero', 'dest_complemento', 'dest_bairro',
              'dest_cidade', 'dest_estado', 'dest_cep']:
        if f in data:
            setattr(c, f, data[f])
    if data.get('data_confirmada'):
        try:
            c.data_confirmada = datetime.fromisoformat(data['data_confirmada'])
        except ValueError:
            pass
    # Marca completo se CPF e data confirmados
    if c.cpf_cnpj and c.data_confirmada:
        c.status = 'completo'
    db.session.commit()
    return jsonify(_cadastro_dict(c))


@app.route('/api/cadastro-complementar/<int:id>/gerar-contrato', methods=['POST'])
@require_role('admin', 'vendedor')
def gerar_contrato_do_cadastro(id):
    cad = CadastroComplementar.query.get_or_404(id)
    if cad.status != 'completo':
        return err("Cadastro complementar precisa estar completo para gerar contrato")
    orc = Orcamento.query.get_or_404(cad.orcamento_id)
    if Contrato.query.filter_by(orcamento_id=orc.id).first():
        return err("Contrato já existe para este orçamento")

    numero = Contador.proximo('con')
    data_exec = cad.data_confirmada
    con = Contrato(
        numero=numero, orcamento_id=orc.id, cadastro_id=cad.id,
        cliente=orc.cliente, cliente_id=orc.cliente_id,
        tipo_servico=orc.tipo_servico,
        endereco_origem=orc.endereco_origem, endereco_destino=orc.endereco_destino,
        data_execucao=data_exec,
        valor_servico=orc.valor_servico, valor_seguro=orc.valor_seguro,
        condicoes_pagamento=orc.condicoes_pagamento,
        observacoes_contratuais=cad.dados_para_contrato,
        status='rascunho'
    )
    db.session.add(con)
    db.session.flush()

    # Gera PDF e faz upload
    pdf = _gerar_pdf_contrato(con)
    ano = datetime.utcnow().year
    url = _salvar_drive(pdf, f"Contratos/{ano}", f"{numero}.pdf")
    if url:
        con.drive_url = url

    db.session.commit()
    return jsonify(_contrato_dict(con)), 201


# ── CONTRATOS ─────────────────────────────────────────────────────────────────
@app.route('/api/contratos', methods=['GET'])
@require_role('admin', 'vendedor', 'operacional')
def listar_contratos():
    status_f = request.args.get('status', '')
    query = Contrato.query
    if status_f and status_f != 'todos':
        query = query.filter_by(status=status_f)
    return jsonify([_contrato_dict(c) for c in query.order_by(Contrato.created_at.desc()).all()])


@app.route('/api/contratos/<int:id>', methods=['GET'])
@require_role('admin', 'vendedor', 'operacional')
def obter_contrato(id):
    return jsonify(_contrato_dict(Contrato.query.get_or_404(id)))


@app.route('/api/contratos/<int:id>', methods=['PUT'])
@require_role('admin', 'vendedor')
def atualizar_contrato(id):
    c = Contrato.query.get_or_404(id)
    data = request.json or {}
    for f in ['valor_servico', 'valor_seguro', 'condicoes_pagamento', 'observacoes_contratuais']:
        if f in data:
            setattr(c, f, data[f])
    if 'status' in data:
        c.status = data['status']
    db.session.commit()
    return jsonify(_contrato_dict(c))


@app.route('/api/contratos/<int:id>/gerar-os', methods=['POST'])
@require_role('admin', 'vendedor', 'operacional')
def gerar_os_do_contrato(id):
    c = Contrato.query.get_or_404(id)
    if c.status == 'rascunho':
        return err("Contrato ainda em rascunho. Confirme antes de gerar OS.")
    if OrdemServico.query.filter_by(contrato_id=id).first():
        return err("OS já existe para este contrato")

    numero = Contador.proximo('os')
    os_ = OrdemServico(
        numero=numero, contrato_id=c.id, cliente=c.cliente, cliente_id=c.cliente_id,
        tipo_servico=c.tipo_servico,
        endereco_origem=c.endereco_origem, endereco_destino=c.endereco_destino,
        data_mudanca=c.data_execucao,
        valor_total=c.valor,
        status='agendada'
    )
    db.session.add(os_)
    db.session.flush()

    pdf = _gerar_pdf_os(os_)
    ano = datetime.utcnow().year
    url = _salvar_drive(pdf, f"OS/{ano}", f"{numero}.pdf")
    if url:
        os_.drive_url = url

    db.session.commit()
    return jsonify(_os_dict(os_)), 201


# ── ORDENS DE SERVIÇO ─────────────────────────────────────────────────────────
@app.route('/api/os', methods=['GET'])
@require_role('admin', 'vendedor', 'operacional')
def listar_os():
    status_f = request.args.get('status', '')
    query = OrdemServico.query
    if status_f and status_f != 'todos':
        query = query.filter_by(status=status_f)
    return jsonify([_os_dict(o) for o in query.order_by(OrdemServico.created_at.desc()).all()])


@app.route('/api/os/<int:id>', methods=['GET'])
@require_role('admin', 'vendedor', 'operacional')
def obter_os(id):
    return jsonify(_os_dict(OrdemServico.query.get_or_404(id)))


@app.route('/api/os', methods=['POST'])
@require_role('admin', 'operacional')
def criar_os():
    data = request.json or {}
    if not data.get('cliente'):
        return err("cliente é obrigatório")
    numero = Contador.proximo('os')
    data_m = None
    if data.get('data_mudanca'):
        try:
            data_m = datetime.fromisoformat(data['data_mudanca'])
        except ValueError:
            pass
    os_ = OrdemServico(
        numero=numero, contrato_id=data.get('contrato_id'),
        cliente=data['cliente'], cliente_id=data.get('cliente_id'),
        tipo_servico=data.get('tipo_servico', 'residencial'),
        endereco_origem=data.get('endereco_origem', ''),
        endereco_destino=data.get('endereco_destino', ''),
        data_mudanca=data_m,
        hora_inicio=data.get('hora_inicio', ''),
        hora_fim_estimada=data.get('hora_fim_estimada', ''),
        motorista=data.get('motorista', ''),
        veiculo=data.get('veiculo', ''),
        equipe=data.get('equipe', ''),
        quantidade_ajudantes=int(data.get('quantidade_ajudantes', 0)),
        quantidade_dias=int(data.get('quantidade_dias', 1)),
        materiais_previstos=data.get('materiais_previstos', ''),
        checklist=data.get('checklist', ''),
        observacoes_operacionais=data.get('observacoes_operacionais', ''),
        valor_total=float(data.get('valor_total', 0)),
        status='agendada'
    )
    db.session.add(os_)
    db.session.commit()
    _sync_programacao_os(os_)
    db.session.commit()
    return jsonify(_os_dict(os_)), 201


@app.route('/api/os/<int:id>', methods=['PUT'])
@require_role('admin', 'operacional')
def atualizar_os(id):
    os_ = OrdemServico.query.get_or_404(id)
    data = request.json or {}
    for f in ['motorista', 'veiculo', 'equipe', 'hora_inicio', 'hora_fim_estimada',
              'hora_inicio_real', 'hora_fim_real', 'quantidade_ajudantes', 'quantidade_dias',
              'materiais_previstos', 'materiais_usados', 'checklist', 'observacoes_operacionais',
              'ocorrencias', 'observacoes_finais', 'status']:
        if f in data:
            setattr(os_, f, data[f])
    if 'valor_total' in data:
        os_.valor_total = float(data['valor_total'])
    if 'data_mudanca' in data and data['data_mudanca']:
        try:
            os_.data_mudanca = datetime.fromisoformat(data['data_mudanca'])
        except ValueError:
            pass
    db.session.commit()
    _sync_programacao_os(os_)
    db.session.commit()
    return jsonify(_os_dict(os_))


@app.route('/api/os/<int:id>/iniciar', methods=['POST'])
@require_role('admin', 'operacional')
def iniciar_os(id):
    os_ = OrdemServico.query.get_or_404(id)
    if os_.status != 'agendada':
        return err("OS deve estar agendada para iniciar")
    os_.status = 'em_andamento'
    os_.hora_inicio_real = datetime.utcnow().strftime('%H:%M')
    db.session.commit()
    return jsonify(_os_dict(os_))


@app.route('/api/os/<int:id>/concluir', methods=['POST'])
@require_role('admin', 'operacional')
def concluir_os(id):
    os_ = OrdemServico.query.get_or_404(id)
    if os_.status != 'em_andamento':
        return err("OS deve estar em andamento para concluir")
    data = request.json or {}
    os_.status = 'concluida'
    os_.hora_fim_real = datetime.utcnow().strftime('%H:%M')
    if 'valor_total' in data:
        os_.valor_total = float(data['valor_total'])
    if 'materiais_usados' in data:
        os_.materiais_usados = data['materiais_usados']
    if 'ocorrencias' in data:
        os_.ocorrencias = data['ocorrencias']
    if 'observacoes_finais' in data:
        os_.observacoes_finais = data['observacoes_finais']

    # Desconta estoque automaticamente
    _descontar_estoque(os_)

    # Gera recibo automaticamente
    numero_rec = Contador.proximo('rec')
    rec = Recibo(
        numero=numero_rec, os_id=os_.id,
        cliente=os_.cliente, cliente_id=os_.cliente_id,
        servico_realizado=f"Mudança {os_.tipo_servico} - {os_.endereco_origem} → {os_.endereco_destino}",
        valor_cobrado=os_.valor_total,
        status='pendente'
    )
    db.session.add(rec)
    db.session.flush()

    pdf = _gerar_pdf_recibo(rec)
    ano = datetime.utcnow().year
    url = _salvar_drive(pdf, f"Recibos/{ano}", f"{numero_rec}.pdf")
    if url:
        rec.drive_url = url

    db.session.commit()
    return jsonify({"os": _os_dict(os_), "recibo": _recibo_dict(rec)})


def _descontar_estoque(os_):
    if not os_.materiais_usados:
        return
    try:
        materiais = json.loads(os_.materiais_usados) if isinstance(os_.materiais_usados, str) else os_.materiais_usados
        for item in materiais:
            nome = item.get('material') or item.get('nome')
            qtd = int(item.get('quantidade', 0))
            if not nome or qtd <= 0:
                continue
            e = Estoque.query.filter(Estoque.material.ilike(f'%{nome}%')).first()
            if e:
                e.quantidade = max(0, e.quantidade - qtd)
                db.session.add(MovimentacaoEstoque(
                    estoque_id=e.id, os_id=os_.id,
                    tipo='saida', quantidade=qtd,
                    observacao=f"OS {os_.numero}"
                ))
    except Exception as ex:
        logger.error(f"Estoque desconto error: {ex}")


@app.route('/api/os/<int:id>/cancelar', methods=['POST'])
@require_role('admin', 'operacional')
def cancelar_os(id):
    os_ = OrdemServico.query.get_or_404(id)
    os_.status = 'cancelada'
    db.session.commit()
    return jsonify(_os_dict(os_))


# ── ETAPAS OPERACIONAIS ───────────────────────────────────────────────────────
def _etapa_dict(e):
    return {
        "id": e.id, "os_id": e.os_id,
        "data": e.data.isoformat() if e.data else None,
        "tipo": e.tipo,
        "quantidade_ajudantes": e.quantidade_ajudantes,
        "quantidade_caminhoes": e.quantidade_caminhoes,
        "equipe": e.equipe, "veiculos": e.veiculos,
        "observacoes": e.observacoes, "status": e.status,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }


@app.route('/api/os/<int:id>/etapas', methods=['GET'])
@require_role('admin', 'operacional', 'vendedor')
def listar_etapas(id):
    OrdemServico.query.get_or_404(id)
    etapas = EtapaOperacional.query.filter_by(os_id=id).order_by(EtapaOperacional.data).all()
    return jsonify([_etapa_dict(e) for e in etapas])


@app.route('/api/os/<int:id>/etapas', methods=['POST'])
@require_role('admin', 'operacional')
def criar_etapa(id):
    OrdemServico.query.get_or_404(id)
    data = request.json or {}
    data_e = None
    if data.get('data'):
        try:
            data_e = datetime.fromisoformat(data['data'])
        except ValueError:
            pass
    e = EtapaOperacional(
        os_id=id,
        data=data_e,
        tipo=data.get('tipo', 'transporte'),
        quantidade_ajudantes=int(data.get('quantidade_ajudantes', 0)),
        quantidade_caminhoes=int(data.get('quantidade_caminhoes', 0)),
        equipe=data.get('equipe', ''),
        veiculos=data.get('veiculos', ''),
        observacoes=data.get('observacoes', ''),
        status=data.get('status', 'agendada'),
    )
    db.session.add(e)
    db.session.commit()
    # Sincroniza programação
    _sync_programacao_etapa(e)
    return jsonify(_etapa_dict(e)), 201


@app.route('/api/os/<int:os_id>/etapas/<int:etapa_id>', methods=['PUT'])
@require_role('admin', 'operacional')
def atualizar_etapa(os_id, etapa_id):
    e = EtapaOperacional.query.filter_by(id=etapa_id, os_id=os_id).first_or_404()
    data = request.json or {}
    for f in ['tipo', 'quantidade_ajudantes', 'quantidade_caminhoes', 'equipe', 'veiculos', 'observacoes', 'status']:
        if f in data:
            setattr(e, f, data[f])
    if data.get('data'):
        try:
            e.data = datetime.fromisoformat(data['data'])
        except ValueError:
            pass
    db.session.commit()
    _sync_programacao_etapa(e)
    return jsonify(_etapa_dict(e))


@app.route('/api/os/<int:os_id>/etapas/<int:etapa_id>', methods=['DELETE'])
@require_role('admin', 'operacional')
def deletar_etapa(os_id, etapa_id):
    e = EtapaOperacional.query.filter_by(id=etapa_id, os_id=os_id).first_or_404()
    db.session.delete(e)
    db.session.commit()
    return jsonify({"status": "deletado"})


def _sync_programacao_os(os_):
    """Cria/atualiza entrada na programação quando uma OS tem data_mudanca."""
    if not os_ or not os_.data_mudanca:
        return
    dt = os_.data_mudanca
    semana = dt.isocalendar()[1]
    ano = dt.year
    # Verifica se já existe programação para essa OS no mesmo dia
    existente = Programacao.query.filter_by(os_id=os_.id).first()
    if existente:
        existente.data = dt
        existente.cliente = os_.cliente
        existente.equipe = os_.equipe or ''
        existente.veiculo = os_.veiculo or ''
        existente.semana = semana
        existente.ano = ano
    else:
        prog = Programacao(
            os_id=os_.id, cliente=os_.cliente,
            data=dt, equipe=os_.equipe or '',
            veiculo=os_.veiculo or '',
            status='agendado', semana=semana, ano=ano,
        )
        db.session.add(prog)


def _sync_programacao_etapa(etapa):
    os_ = OrdemServico.query.get(etapa.os_id)
    if not os_ or not etapa.data:
        return
    semana = etapa.data.isocalendar()[1]
    ano = etapa.data.year
    # Remove programação existente para mesma etapa
    for p in Programacao.query.filter_by(os_id=etapa.os_id).all():
        if p.data and p.data.date() == etapa.data.date():
            db.session.delete(p)
    prog = Programacao(
        os_id=os_.id, cliente=os_.cliente,
        data=etapa.data, equipe=etapa.equipe or '',
        veiculo=etapa.veiculos or '',
        status='agendado', semana=semana, ano=ano,
    )
    db.session.add(prog)
    db.session.commit()


# ── FECHAMENTO OPERACIONAL ────────────────────────────────────────────────────
def _fechamento_dict(f):
    return {
        "id": f.id, "os_id": f.os_id, "organizer_id": f.organizer_id,
        "receita_bruta": f.receita_bruta,
        "custo_equipe": f.custo_equipe, "custo_caminhoes": f.custo_caminhoes,
        "custo_materiais": f.custo_materiais, "custo_pedagio": f.custo_pedagio,
        "custo_alimentacao": f.custo_alimentacao, "custo_hospedagem": f.custo_hospedagem,
        "custo_freelancers": f.custo_freelancers, "custo_outros": f.custo_outros,
        "lucro_liquido": f.lucro_liquido, "margem_percentual": f.margem_percentual,
        "comissao_organizer": f.comissao_organizer,
        "percentual_comissao": f.percentual_comissao,
        "observacoes": f.observacoes, "status": f.status,
        "custo_total": (
            (f.custo_equipe or 0) + (f.custo_caminhoes or 0) +
            (f.custo_materiais or 0) + (f.custo_pedagio or 0) +
            (f.custo_alimentacao or 0) + (f.custo_hospedagem or 0) +
            (f.custo_freelancers or 0) + (f.custo_outros or 0)
        ),
        "created_at": f.created_at.isoformat() if f.created_at else None,
    }


@app.route('/api/os/<int:id>/fechamento', methods=['GET'])
@require_role('admin', 'financeiro', 'operacional')
def get_fechamento(id):
    os_ = OrdemServico.query.get_or_404(id)
    f = FechamentoOperacional.query.filter_by(os_id=id).first()
    if not f:
        # Cria esboço com dados da OS
        rec = Recibo.query.filter_by(os_id=id, status='recebido').first()
        f = FechamentoOperacional(
            os_id=id,
            receita_bruta=rec.valor_cobrado if rec else os_.valor_total or 0,
            status='rascunho',
        )
        # Tenta detectar organizer via cliente
        if os_.cliente_id:
            cli = Cliente.query.get(os_.cliente_id)
            if cli and cli.organizer_id:
                f.organizer_id = cli.organizer_id
        db.session.add(f)
        db.session.commit()
    return jsonify(_fechamento_dict(f))


@app.route('/api/os/<int:id>/fechamento', methods=['PUT'])
@require_role('admin', 'financeiro')
def salvar_fechamento(id):
    OrdemServico.query.get_or_404(id)
    f = FechamentoOperacional.query.filter_by(os_id=id).first()
    if not f:
        f = FechamentoOperacional(os_id=id)
        db.session.add(f)
    data = request.json or {}
    for field in ['receita_bruta', 'custo_equipe', 'custo_caminhoes', 'custo_materiais',
                  'custo_pedagio', 'custo_alimentacao', 'custo_hospedagem',
                  'custo_freelancers', 'custo_outros', 'percentual_comissao']:
        if field in data:
            setattr(f, field, float(data[field] or 0))
    if 'organizer_id' in data:
        f.organizer_id = data['organizer_id'] or None
    if 'observacoes' in data:
        f.observacoes = data['observacoes']
    if 'status' in data and data['status'] in ('rascunho', 'finalizado'):
        f.status = data['status']
    f.calcular()
    db.session.commit()
    return jsonify(_fechamento_dict(f))


@app.route('/api/os/<int:id>/fechamento/finalizar', methods=['POST'])
@require_role('admin', 'financeiro')
def finalizar_fechamento(id):
    OrdemServico.query.get_or_404(id)
    f = FechamentoOperacional.query.filter_by(os_id=id).first_or_404()
    f.calcular()
    f.status = 'finalizado'
    # Cria ou atualiza comissão da organizer
    if f.organizer_id and f.comissao_organizer > 0:
        comissao = Comissao.query.filter_by(fechamento_id=f.id).first()
        if not comissao:
            comissao = Comissao(
                organizer_id=f.organizer_id, os_id=id,
                fechamento_id=f.id,
                valor=f.comissao_organizer,
                percentual=f.percentual_comissao,
                status='pendente',
            )
            db.session.add(comissao)
        else:
            comissao.valor = f.comissao_organizer
            comissao.percentual = f.percentual_comissao
        # Recalcula classificação da organizer
        org = Organizer.query.get(f.organizer_id)
        if org:
            _classificar_organizer(org)
    db.session.commit()
    return jsonify(_fechamento_dict(f))


@app.route('/api/fechamentos', methods=['GET'])
@require_role('admin', 'financeiro')
def listar_fechamentos():
    status_f = request.args.get('status', '')
    q = FechamentoOperacional.query
    if status_f:
        q = q.filter_by(status=status_f)
    return jsonify([_fechamento_dict(f) for f in q.order_by(FechamentoOperacional.created_at.desc()).all()])


@app.route('/api/comissoes/<int:id>/pagar', methods=['POST'])
@require_role('admin', 'financeiro')
def pagar_comissao(id):
    c = Comissao.query.get_or_404(id)
    data = request.json or {}
    c.status = 'pago'
    c.data_pagamento = datetime.utcnow()
    if 'observacoes' in data:
        c.observacoes = data['observacoes']
    db.session.commit()
    return jsonify({"id": c.id, "status": c.status, "valor": c.valor,
                    "data_pagamento": c.data_pagamento.isoformat()})


# ── PROGRAMAÇÃO ───────────────────────────────────────────────────────────────
@app.route('/api/programacao', methods=['GET'])
@require_role('admin', 'operacional', 'vendedor')
def listar_programacao():
    semana = request.args.get('semana', type=int)
    ano = request.args.get('ano', type=int)
    query = Programacao.query
    if semana:
        query = query.filter_by(semana=semana)
    if ano:
        query = query.filter_by(ano=ano)
    items = query.order_by(Programacao.data).all()
    return jsonify([{
        "id": p.id, "os_id": p.os_id, "cliente": p.cliente,
        "tipo_servico": p.tipo_servico or 'mudanca',
        "data": p.data.isoformat() if p.data else None,
        "equipe": p.equipe, "veiculo": p.veiculo,
        "status": p.status, "semana": p.semana, "ano": p.ano,
    } for p in items])


@app.route('/api/programacao/sync', methods=['POST'])
@require_role('admin', 'operacional', 'vendedor', 'financeiro')
def sync_programacao():
    """Sincroniza todas as OS com data_mudanca para a tabela de programação."""
    os_list = OrdemServico.query.filter(
        OrdemServico.data_mudanca != None,
        OrdemServico.status.in_(['agendada', 'em_andamento'])
    ).all()
    count = 0
    for os_ in os_list:
        _sync_programacao_os(os_)
        count += 1
    db.session.commit()
    return jsonify({"sincronizadas": count})


@app.route('/api/programacao', methods=['POST'])
@require_role('admin', 'operacional', 'vendedor', 'financeiro')
def criar_programacao():
    data = request.json or {}
    if not data.get('cliente'):
        return err("cliente é obrigatório")
    dt = None
    if data.get('data'):
        try:
            dt = datetime.fromisoformat(data['data'])
        except ValueError:
            pass
    p = Programacao(
        os_id=data.get('os_id'), cliente=data['cliente'],
        tipo_servico=data.get('tipo_servico', 'mudanca'),
        data=dt, equipe=data.get('equipe', ''), veiculo=data.get('veiculo', ''),
        status='agendado',
        semana=dt.isocalendar()[1] if dt else None,
        ano=dt.year if dt else None
    )
    db.session.add(p)
    db.session.commit()
    return jsonify({"id": p.id, "cliente": p.cliente}), 201


@app.route('/api/programacao/<int:id>', methods=['PUT'])
@require_role('admin', 'operacional', 'vendedor', 'financeiro')
def atualizar_programacao(id):
    p = Programacao.query.get_or_404(id)
    data = request.json or {}
    for f in ['cliente', 'equipe', 'veiculo', 'status', 'tipo_servico']:
        if f in data:
            setattr(p, f, data[f])
    if 'data' in data and data['data']:
        try:
            dt = datetime.fromisoformat(data['data'])
            p.data = dt
            p.semana = dt.isocalendar()[1]
            p.ano = dt.year
        except ValueError:
            pass
    db.session.commit()
    return jsonify({"id": p.id, "status": p.status})


@app.route('/api/programacao/<int:id>', methods=['DELETE'])
@require_role('admin', 'operacional')
def deletar_programacao(id):
    p = Programacao.query.get_or_404(id)
    db.session.delete(p)
    db.session.commit()
    return jsonify({"status": "deletado"})


# ── ESTOQUE ───────────────────────────────────────────────────────────────────
@app.route('/api/estoque', methods=['GET'])
@jwt_required()
def listar_estoque():
    items = Estoque.query.order_by(Estoque.material).all()
    alertas = [e for e in items if e.alerta]
    return jsonify({
        "items": [_estoque_dict(e) for e in items],
        "alertas_criticos": [_estoque_dict(e) for e in alertas if e.alerta == 'critico'],
        "alertas_baixo": [_estoque_dict(e) for e in alertas if e.alerta == 'baixo'],
    })


@app.route('/api/estoque', methods=['POST'])
@require_role('admin', 'operacional')
def criar_estoque():
    data = request.json or {}
    if not data.get('material'):
        return err("material é obrigatório")
    e = Estoque(
        material=data['material'], unidade=data.get('unidade', 'un'),
        quantidade=int(data.get('quantidade', 0)),
        estoque_minimo=int(data.get('estoque_minimo', 10)),
        estoque_critico=int(data.get('estoque_critico', 5)),
        valor_unitario=float(data.get('valor_unitario', 0))
    )
    db.session.add(e)
    db.session.commit()
    return jsonify(_estoque_dict(e)), 201


@app.route('/api/estoque/<int:id>', methods=['PUT'])
@require_role('admin', 'operacional')
def atualizar_estoque(id):
    e = Estoque.query.get_or_404(id)
    data = request.json or {}
    for f in ['material', 'unidade', 'estoque_minimo', 'estoque_critico', 'valor_unitario']:
        if f in data:
            setattr(e, f, data[f])
    if 'quantidade' in data:
        e.quantidade = int(data['quantidade'])
    db.session.commit()
    return jsonify(_estoque_dict(e))


@app.route('/api/estoque/<int:id>/entrada', methods=['POST'])
@require_role('admin', 'operacional')
def entrada_estoque(id):
    e = Estoque.query.get_or_404(id)
    data = request.json or {}
    qtd = int(data.get('quantidade', 0))
    if qtd <= 0:
        return err("quantidade deve ser positiva")
    e.quantidade += qtd
    db.session.add(MovimentacaoEstoque(
        estoque_id=e.id, tipo='entrada', quantidade=qtd,
        observacao=data.get('observacao', 'Entrada manual')
    ))
    db.session.commit()
    return jsonify(_estoque_dict(e))


@app.route('/api/estoque/<int:id>/saida', methods=['POST'])
@require_role('admin', 'operacional')
def saida_estoque(id):
    e = Estoque.query.get_or_404(id)
    data = request.json or {}
    qtd = int(data.get('quantidade', 0))
    if qtd <= 0:
        return err("quantidade deve ser positiva")
    if e.quantidade < qtd:
        return err("Estoque insuficiente")
    e.quantidade -= qtd
    db.session.add(MovimentacaoEstoque(
        estoque_id=e.id, tipo='saida', quantidade=qtd,
        observacao=data.get('observacao', 'Saída manual')
    ))
    db.session.commit()
    return jsonify(_estoque_dict(e))


@app.route('/api/estoque/<int:id>/movimentacoes', methods=['GET'])
@jwt_required()
def movimentacoes_estoque(id):
    Estoque.query.get_or_404(id)
    movs = MovimentacaoEstoque.query.filter_by(estoque_id=id).order_by(MovimentacaoEstoque.created_at.desc()).all()
    result = []
    for m in movs:
        user_nome = None
        if m.user_id:
            u = User.query.get(m.user_id)
            if u: user_nome = u.name
        os_numero = None
        if m.os_id:
            o = OrdemServico.query.get(m.os_id)
            if o: os_numero = o.numero
        result.append({
            "id": m.id, "tipo": m.tipo, "quantidade": m.quantidade,
            "quantidade_anterior": m.quantidade_anterior,
            "quantidade_posterior": m.quantidade_posterior,
            "valor_unitario": m.valor_unitario, "valor_total": m.valor_total,
            "os_id": m.os_id, "os_numero": os_numero,
            "user_id": m.user_id, "user_nome": user_nome,
            "observacao": m.observacao,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })
    return jsonify(result)


@app.route('/api/estoque/movimentacoes/recentes', methods=['GET'])
@jwt_required()
def movimentacoes_recentes():
    """Retorna as últimas 100 movimentações de todos os itens."""
    movs = MovimentacaoEstoque.query.order_by(MovimentacaoEstoque.created_at.desc()).limit(100).all()
    result = []
    for m in movs:
        e = Estoque.query.get(m.estoque_id) if m.estoque_id else None
        user_nome = None
        if m.user_id:
            u = User.query.get(m.user_id)
            if u: user_nome = u.name
        os_numero = None
        if m.os_id:
            o = OrdemServico.query.get(m.os_id)
            if o: os_numero = o.numero
        result.append({
            "id": m.id,
            "material_nome": e.nome_material if e else '—',
            "tipo": m.tipo, "quantidade": m.quantidade,
            "quantidade_anterior": m.quantidade_anterior,
            "quantidade_posterior": m.quantidade_posterior,
            "valor_unitario": m.valor_unitario, "valor_total": m.valor_total,
            "os_id": m.os_id, "os_numero": os_numero,
            "user_id": m.user_id, "user_nome": user_nome,
            "observacao": m.observacao,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })
    return jsonify(result)


# ── GUARDA-MÓVEIS ─────────────────────────────────────────────────────────────
@app.route('/api/guarda-moveis', methods=['GET'])
@jwt_required()
def listar_boxes():
    boxes = GuardaMovel.query.order_by(GuardaMovel.id).all()
    now = datetime.utcnow()
    receita = sum(b.valor_mensal for b in boxes if b.status == 'ocupado')
    vencendo = [b for b in boxes if b.status == 'ocupado' and b.data_saida_prevista
                and b.data_saida_prevista <= now + timedelta(days=30)]
    return jsonify({
        "boxes": [_box_dict(b) for b in boxes],
        "receita_mensal_total": receita,
        "total": len(boxes),
        "ocupados": sum(1 for b in boxes if b.status == 'ocupado'),
        "livres": sum(1 for b in boxes if b.status == 'livre'),
        "manutencao": sum(1 for b in boxes if b.status == 'manutencao'),
        "vencendo_30dias": len(vencendo),
        "taxa_ocupacao": round(sum(1 for b in boxes if b.status == 'ocupado') / len(boxes) * 100, 1) if boxes else 0,
    })


@app.route('/api/guarda-moveis', methods=['POST'])
@jwt_required()
def criar_box():
    data = request.json or {}
    total = GuardaMovel.query.count()
    numero = data.get('numero') or f"Box {total + 1}"
    box = GuardaMovel(numero=numero, status='livre')
    db.session.add(box)
    db.session.commit()
    return jsonify(_box_dict(box)), 201


@app.route('/api/guarda-moveis/<int:id>/ocupar', methods=['POST'])
@jwt_required()
def ocupar_box(id):
    data = request.json or {}
    box = GuardaMovel.query.get_or_404(id)
    if box.status == 'ocupado':
        return err("Box já está ocupado", 400)
    box.status = 'ocupado'
    box.cliente_nome = data.get('cliente_nome', '')
    box.cliente_id = data.get('cliente_id')
    box.valor_mensal = float(data.get('valor_mensal', 380))
    if data.get('metros_quadrados') is not None:
        box.metros_quadrados = float(data['metros_quadrados'])
    if data.get('metros_cubicos') is not None:
        box.metros_cubicos = float(data['metros_cubicos'])
    box.data_entrada = datetime.utcnow()
    box.observacoes = data.get('observacoes', '')
    if data.get('data_saida_prevista'):
        try:
            box.data_saida_prevista = datetime.fromisoformat(data['data_saida_prevista'])
        except ValueError:
            pass
    db.session.commit()
    return jsonify(_box_dict(box))


@app.route('/api/guarda-moveis/<int:id>/liberar', methods=['POST'])
@jwt_required()
def liberar_box(id):
    box = GuardaMovel.query.get_or_404(id)
    box.status = 'livre'
    box.cliente_nome = None
    box.cliente_id = None
    box.valor_mensal = 0
    box.metros_quadrados = None
    box.metros_cubicos = None
    box.data_entrada = None
    box.data_saida_prevista = None
    db.session.commit()
    return jsonify(_box_dict(box))


@app.route('/api/guarda-moveis/<int:id>/manutencao', methods=['POST'])
@jwt_required()
def manutencao_box(id):
    box = GuardaMovel.query.get_or_404(id)
    box.status = 'manutencao'
    db.session.commit()
    return jsonify(_box_dict(box))


# ── AVARIAS ───────────────────────────────────────────────────────────────────
def _avaria_dict(a):
    return {
        "id": a.id, "os_id": a.os_id, "os_numero": a.os_numero,
        "cliente": a.cliente, "cliente_id": a.cliente_id,
        "data_mudanca": a.data_mudanca.isoformat() if a.data_mudanca else None,
        "equipe": a.equipe, "veiculo": a.veiculo,
        "organizer_id": a.organizer_id,
        "tipo": a.tipo, "descricao": a.descricao,
        "valor_estimado": a.valor_estimado,
        "observacoes": a.observacoes,
        "status": a.status,
        "data_resolucao": a.data_resolucao.isoformat() if a.data_resolucao else None,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


@app.route('/api/avarias', methods=['GET'])
@jwt_required()
def listar_avarias():
    status_f = request.args.get('status', '')
    query = Avaria.query
    if status_f and status_f != 'todos':
        query = query.filter_by(status=status_f)
    return jsonify([_avaria_dict(a) for a in query.order_by(Avaria.created_at.desc()).all()])


@app.route('/api/avarias', methods=['POST'])
@jwt_required()
def criar_avaria():
    data = request.json or {}
    if not data.get('cliente'):
        return err("cliente é obrigatório")
    a = Avaria(
        os_id=data.get('os_id'),
        os_numero=data.get('os_numero', ''),
        cliente=data['cliente'],
        cliente_id=data.get('cliente_id'),
        equipe=data.get('equipe', ''),
        veiculo=data.get('veiculo', ''),
        organizer_id=data.get('organizer_id'),
        tipo=data.get('tipo', 'outro'),
        descricao=data.get('descricao', ''),
        valor_estimado=float(data.get('valor_estimado', 0)),
        observacoes=data.get('observacoes', ''),
        status='aberta',
    )
    if data.get('data_mudanca'):
        try:
            a.data_mudanca = datetime.fromisoformat(data['data_mudanca'])
        except ValueError:
            pass
    db.session.add(a)
    db.session.commit()
    return jsonify(_avaria_dict(a)), 201


@app.route('/api/avarias/<int:id>', methods=['GET'])
@jwt_required()
def obter_avaria(id):
    return jsonify(_avaria_dict(Avaria.query.get_or_404(id)))


@app.route('/api/avarias/<int:id>', methods=['PUT'])
@jwt_required()
def atualizar_avaria(id):
    a = Avaria.query.get_or_404(id)
    data = request.json or {}
    for f in ['tipo', 'descricao', 'observacoes', 'equipe', 'veiculo', 'status']:
        if f in data:
            setattr(a, f, data[f])
    if 'valor_estimado' in data:
        a.valor_estimado = float(data['valor_estimado'] or 0)
    if 'organizer_id' in data:
        a.organizer_id = data['organizer_id'] or None
    if data.get('status') in ('resolvida', 'encerrada') and not a.data_resolucao:
        a.data_resolucao = datetime.utcnow()
    db.session.commit()
    return jsonify(_avaria_dict(a))


@app.route('/api/avarias/<int:id>', methods=['DELETE'])
@require_role('admin')
def deletar_avaria(id):
    a = Avaria.query.get_or_404(id)
    db.session.delete(a)
    db.session.commit()
    return jsonify({"status": "deletado"})


@app.route('/api/avarias/resumo', methods=['GET'])
@jwt_required()
def resumo_avarias():
    from sqlalchemy import func
    total = Avaria.query.count()
    abertas = Avaria.query.filter_by(status='aberta').count()
    em_analise = Avaria.query.filter_by(status='em_analise').count()
    resolvidas = Avaria.query.filter_by(status='resolvida').count() + Avaria.query.filter_by(status='encerrada').count()
    valor_total = db.session.query(func.sum(Avaria.valor_estimado)).scalar() or 0

    # Por tipo
    por_tipo = db.session.query(Avaria.tipo, func.count(Avaria.id)).group_by(Avaria.tipo).all()

    # Por equipe (top 10)
    por_equipe_raw = db.session.query(
        Avaria.equipe, func.count(Avaria.id).label('count')
    ).filter(Avaria.equipe != None, Avaria.equipe != '').group_by(Avaria.equipe).order_by(
        func.count(Avaria.id).desc()
    ).limit(10).all()
    por_equipe = {e: c for e, c in por_equipe_raw if e}

    # Mensal (últimos 12 meses)
    now = datetime.utcnow()
    mensal = []
    for i in range(11, -1, -1):
        if now.month - i <= 0:
            m = now.month - i + 12
            a = now.year - 1
        else:
            m = now.month - i
            a = now.year
        cnt = Avaria.query.filter(
            extract('month', Avaria.created_at) == m,
            extract('year', Avaria.created_at) == a
        ).count()
        val = db.session.query(func.sum(Avaria.valor_estimado)).filter(
            extract('month', Avaria.created_at) == m,
            extract('year', Avaria.created_at) == a
        ).scalar() or 0
        label = f"{['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][m-1]}/{str(a)[2:]}"
        mensal.append({"mes": m, "ano": a, "label": label, "total": cnt, "valor": float(val)})

    # Tempo médio de resolução (em dias)
    resolvidas_com_data = Avaria.query.filter(
        Avaria.data_resolucao != None,
        Avaria.created_at != None
    ).all()
    if resolvidas_com_data:
        dias = [(a.data_resolucao - a.created_at).days for a in resolvidas_com_data if a.data_resolucao and a.created_at]
        tempo_medio_resolucao = round(sum(dias) / len(dias), 1) if dias else 0
    else:
        tempo_medio_resolucao = 0

    return jsonify({
        "total": total, "abertas": abertas, "em_analise": em_analise,
        "resolvidas": resolvidas, "valor_total_estimado": float(valor_total),
        "por_tipo": {t: c for t, c in por_tipo},
        "por_equipe": por_equipe,
        "mensal": mensal,
        "tempo_medio_resolucao": tempo_medio_resolucao,
    })


# ── CONFIGURAÇÕES DO SISTEMA ─────────────────────────────────────────────────
@app.route('/api/config', methods=['GET'])
@jwt_required()
def get_config():
    """Retorna todas as configurações do sistema como dicionário."""
    configs = ConfigSistema.query.all()
    result = {}
    for c in configs:
        try:
            import json
            result[c.chave] = json.loads(c.valor) if c.valor and c.valor.startswith('{') else c.valor
        except Exception:
            result[c.chave] = c.valor
    return jsonify(result)


@app.route('/api/config', methods=['PUT'])
@require_role('admin')
def set_config():
    """Salva/atualiza múltiplas configurações de uma vez."""
    import json as json_mod
    data = request.json or {}
    for chave, valor in data.items():
        if not chave:
            continue
        valor_str = json_mod.dumps(valor) if isinstance(valor, (dict, list)) else str(valor)
        c = ConfigSistema.query.filter_by(chave=chave).first()
        if c:
            c.valor = valor_str
            c.updated_at = datetime.utcnow()
        else:
            c = ConfigSistema(chave=chave, valor=valor_str)
            db.session.add(c)
    db.session.commit()
    return jsonify({"status": "ok"})


@app.route('/api/config/<chave>', methods=['GET'])
@jwt_required()
def get_config_key(chave):
    c = ConfigSistema.query.filter_by(chave=chave).first()
    if not c:
        return jsonify(None)
    try:
        import json
        val = json.loads(c.valor) if c.valor and (c.valor.startswith('{') or c.valor.startswith('[')) else c.valor
    except Exception:
        val = c.valor
    return jsonify(val)


# ── ADMIN / CONTROLADORIA ─────────────────────────────────────────────────────
@app.route('/api/admin/atividade', methods=['POST'])
@jwt_required()
def registrar_atividade():
    """Frontend envia heartbeats e pageviews aqui."""
    u = current_user()
    if not u:
        return err("Unauthorized", 401)
    data = request.json or {}
    log = UserActivityLog(
        user_id=u.id,
        page=data.get('page', '/'),
        action=data.get('action', 'heartbeat'),
        session_id=data.get('session_id', ''),
    )
    db.session.add(log)
    # Limpa logs > 30 dias para não acumular indefinidamente
    cutoff = datetime.utcnow() - timedelta(days=30)
    UserActivityLog.query.filter(UserActivityLog.timestamp < cutoff).delete()
    db.session.commit()
    return jsonify({"ok": True})


@app.route('/api/admin/atividade', methods=['GET'])
@require_role('admin')
def relatorio_atividade():
    """Retorna relatório de atividade dos usuários para a Controladoria."""
    from sqlalchemy import func
    agora = datetime.utcnow()
    cinco_min = agora - timedelta(minutes=5)
    uma_hora = agora - timedelta(hours=1)
    hoje = agora.replace(hour=0, minute=0, second=0, microsecond=0)

    # Todos os usuários
    usuarios = User.query.all()
    resultado = []
    for u in usuarios:
        # Online agora (heartbeat nos últimos 5 min)
        online = UserActivityLog.query.filter(
            UserActivityLog.user_id == u.id,
            UserActivityLog.timestamp >= cinco_min
        ).count() > 0

        # Último acesso
        ultimo_log = (UserActivityLog.query
                      .filter_by(user_id=u.id)
                      .order_by(UserActivityLog.timestamp.desc())
                      .first())

        # Página atual (último heartbeat/pageview)
        pagina_atual = ultimo_log.page if ultimo_log else None

        # Total de ações hoje
        acoes_hoje = UserActivityLog.query.filter(
            UserActivityLog.user_id == u.id,
            UserActivityLog.timestamp >= hoje
        ).count()

        # Pages mais visitadas hoje
        pages_hoje = (db.session.query(
            UserActivityLog.page, func.count(UserActivityLog.id).label('c')
        ).filter(
            UserActivityLog.user_id == u.id,
            UserActivityLog.timestamp >= hoje,
            UserActivityLog.action == 'pageview'
        ).group_by(UserActivityLog.page)
         .order_by(func.count(UserActivityLog.id).desc())
         .limit(5).all())

        resultado.append({
            "id": u.id,
            "nome": u.name,
            "role": u.role,
            "online": online,
            "pagina_atual": pagina_atual,
            "ultimo_acesso": ultimo_log.timestamp.isoformat() if ultimo_log else None,
            "acoes_hoje": acoes_hoje,
            "pages_hoje": [{"page": p, "visitas": c} for p, c in pages_hoje],
        })

    # Usuários online primeiro, depois por último acesso
    resultado.sort(key=lambda x: (not x['online'], x['ultimo_acesso'] or ''))

    # Timeline das últimas 2h (atividade por hora/quinze min)
    logs_2h = UserActivityLog.query.filter(
        UserActivityLog.timestamp >= (agora - timedelta(hours=2))
    ).order_by(UserActivityLog.timestamp).all()

    # Agrega por janelas de 15 min
    from collections import defaultdict
    buckets = defaultdict(int)
    for log in logs_2h:
        mins = (log.timestamp - (agora - timedelta(hours=2))).seconds // 60
        bucket = (mins // 15) * 15
        buckets[bucket] += 1
    timeline = [{"min": k, "acoes": v} for k, v in sorted(buckets.items())]

    return jsonify({
        "usuarios": resultado,
        "total_online": sum(1 for u in resultado if u['online']),
        "timeline_2h": timeline,
        "timestamp": agora.isoformat(),
    })


# ── RECIBOS ───────────────────────────────────────────────────────────────────
@app.route('/api/recibos', methods=['GET'])
@require_role('admin', 'financeiro', 'vendedor')
def listar_recibos():
    status_f = request.args.get('status', '')
    query = Recibo.query
    if status_f and status_f != 'todos':
        query = query.filter_by(status=status_f)
    return jsonify([_recibo_dict(r) for r in query.order_by(Recibo.created_at.desc()).all()])


@app.route('/api/recibos/<int:id>', methods=['GET'])
@require_role('admin', 'financeiro', 'vendedor')
def obter_recibo(id):
    return jsonify(_recibo_dict(Recibo.query.get_or_404(id)))


@app.route('/api/recibos', methods=['POST'])
@require_role('admin', 'financeiro')
def criar_recibo():
    data = request.json or {}
    if not data.get('cliente'):
        return err("cliente é obrigatório")
    numero = Contador.proximo('rec')
    r = Recibo(
        numero=numero, os_id=data.get('os_id'),
        cliente=data['cliente'], cliente_id=data.get('cliente_id'),
        servico_realizado=data.get('servico_realizado', ''),
        valor_cobrado=float(data.get('valor_cobrado', 0)),
        forma_pagamento=data.get('forma_pagamento', ''),
        observacoes=data.get('observacoes', ''),
        status='pendente'
    )
    if data.get('data_pagamento'):
        try:
            r.data_pagamento = datetime.fromisoformat(data['data_pagamento'])
        except ValueError:
            pass
    db.session.add(r)
    db.session.commit()
    return jsonify(_recibo_dict(r)), 201


@app.route('/api/recibos/<int:id>/receber', methods=['POST'])
@require_role('admin', 'financeiro')
def confirmar_recibo(id):
    r = Recibo.query.get_or_404(id)
    data = request.json or {}
    r.status = 'recebido'
    r.forma_pagamento = data.get('forma_pagamento', r.forma_pagamento)
    if data.get('data_pagamento'):
        try:
            r.data_pagamento = datetime.fromisoformat(data['data_pagamento'])
        except ValueError:
            pass
    if not r.data_pagamento:
        r.data_pagamento = datetime.utcnow()
    db.session.commit()
    return jsonify(_recibo_dict(r))


@app.route('/api/recibos/<int:id>', methods=['PUT'])
@require_role('admin', 'financeiro')
def atualizar_recibo(id):
    r = Recibo.query.get_or_404(id)
    data = request.json or {}
    for f in ['servico_realizado', 'valor_cobrado', 'forma_pagamento', 'observacoes', 'status']:
        if f in data:
            setattr(r, f, data[f])
    if 'data_pagamento' in data and data['data_pagamento']:
        try:
            r.data_pagamento = datetime.fromisoformat(data['data_pagamento'])
        except ValueError:
            pass
    db.session.commit()
    return jsonify(_recibo_dict(r))


# ── FINANCEIRO ────────────────────────────────────────────────────────────────
@app.route('/api/financeiro/resumo', methods=['GET'])
@require_role('admin', 'financeiro')
def resumo_financeiro():
    mes = request.args.get('mes', type=int, default=datetime.utcnow().month)
    ano = request.args.get('ano', type=int, default=datetime.utcnow().year)

    recibos = Recibo.query.filter(
        Recibo.status == 'recebido',
        extract('month', Recibo.data_pagamento) == mes,
        extract('year', Recibo.data_pagamento) == ano
    ).all()
    receita_mudancas = sum(r.valor_cobrado for r in recibos)

    boxes_ocu = GuardaMovel.query.filter_by(status='ocupado').all()
    receita_guarda = sum(b.valor_mensal for b in boxes_ocu)

    despesas = Despesa.query.filter(
        extract('month', Despesa.data) == mes,
        extract('year', Despesa.data) == ano
    ).all()
    total_despesas = sum(d.valor for d in despesas)

    receita_total = receita_mudancas + receita_guarda
    lucro = receita_total - total_despesas

    return jsonify({
        "mes": mes, "ano": ano,
        "receita_mudancas": receita_mudancas,
        "receita_guarda_moveis": receita_guarda,
        "receita_total": receita_total,
        "total_despesas": total_despesas,
        "lucro_liquido": lucro,
        "margem_percentual": round(lucro / receita_total * 100, 1) if receita_total > 0 else 0,
        "mudancas_realizadas": len(recibos),
        "ticket_medio": round(receita_mudancas / len(recibos), 2) if recibos else 0,
        "despesas_detalhe": [{"categoria": d.categoria, "valor": d.valor,
                               "descricao": d.descricao,
                               "data": d.data.isoformat() if d.data else None} for d in despesas],
    })


@app.route('/api/financeiro/despesas', methods=['GET'])
@require_role('admin', 'financeiro')
def listar_despesas():
    mes = request.args.get('mes', type=int)
    ano = request.args.get('ano', type=int)
    query = Despesa.query
    if mes:
        query = query.filter(extract('month', Despesa.data) == mes)
    if ano:
        query = query.filter(extract('year', Despesa.data) == ano)
    despesas = query.order_by(Despesa.data.desc()).all()
    return jsonify([{"id": d.id, "categoria": d.categoria, "descricao": d.descricao,
                     "valor": d.valor, "os_id": d.os_id,
                     "comprovante_url": d.comprovante_url,
                     "data": d.data.isoformat() if d.data else None} for d in despesas])


@app.route('/api/financeiro/despesas', methods=['POST'])
@require_role('admin', 'financeiro', 'operacional')
def criar_despesa():
    data = request.json or {}
    if not data.get('categoria') or not data.get('valor'):
        return err("categoria e valor são obrigatórios")
    dt = datetime.utcnow()
    if data.get('data'):
        try:
            dt = datetime.fromisoformat(data['data'])
        except ValueError:
            pass
    d = Despesa(
        categoria=data['categoria'], descricao=data.get('descricao', ''),
        valor=float(data['valor']), data=dt, os_id=data.get('os_id'),
        comprovante_url=data.get('comprovante_url', '')
    )
    db.session.add(d)
    db.session.commit()
    return jsonify({"id": d.id, "categoria": d.categoria, "valor": d.valor}), 201


@app.route('/api/financeiro/despesas/<int:id>', methods=['PUT'])
@require_role('admin', 'financeiro', 'operacional')
def atualizar_despesa(id):
    d = Despesa.query.get_or_404(id)
    data = request.json or {}
    for f in ['categoria', 'descricao', 'valor', 'os_id', 'comprovante_url']:
        if f in data:
            setattr(d, f, data[f])
    if data.get('data'):
        try:
            d.data = datetime.fromisoformat(data['data'])
        except ValueError:
            pass
    if 'valor' in data:
        d.valor = float(data['valor'])
    db.session.commit()
    return jsonify({"id": d.id, "categoria": d.categoria, "descricao": d.descricao,
                    "valor": d.valor, "comprovante_url": d.comprovante_url,
                    "data": d.data.isoformat() if d.data else None})


@app.route('/api/financeiro/despesas/<int:id>', methods=['DELETE'])
@require_role('admin', 'financeiro')
def deletar_despesa(id):
    d = Despesa.query.get_or_404(id)
    db.session.delete(d)
    db.session.commit()
    return jsonify({"status": "deletado"})


@app.route('/api/financeiro/historico', methods=['GET'])
@require_role('admin', 'financeiro')
def financeiro_historico():
    """Retorna os últimos 12 meses de receita/despesas para gráficos."""
    meses = []
    now = datetime.utcnow()
    for i in range(11, -1, -1):
        if now.month - i <= 0:
            m = now.month - i + 12
            a = now.year - 1
        else:
            m = now.month - i
            a = now.year
        recibos = Recibo.query.filter(
            Recibo.status == 'recebido',
            extract('month', Recibo.data_pagamento) == m,
            extract('year', Recibo.data_pagamento) == a
        ).all()
        receita = sum(r.valor_cobrado for r in recibos)
        despesas = Despesa.query.filter(
            extract('month', Despesa.data) == m,
            extract('year', Despesa.data) == a
        ).all()
        total_desp = sum(d.valor for d in despesas)
        mudancas_count = OrdemServico.query.filter(
            OrdemServico.status == 'concluida',
            extract('month', OrdemServico.data_mudanca) == m,
            extract('year', OrdemServico.data_mudanca) == a
        ).count()
        meses.append({
            "mes": m, "ano": a,
            "label": f"{['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][m-1]}/{str(a)[2:]}",
            "receita": receita,
            "despesas": total_desp,
            "lucro": receita - total_desp,
            "mudancas": mudancas_count,
        })
    return jsonify(meses)


# ── RECORRENTES FINANCEIROS ───────────────────────────────────────────────────
@app.route('/api/financeiro/recorrentes', methods=['GET'])
@require_role('admin', 'financeiro')
def listar_recorrentes():
    items = RecorrenteFinanceiro.query.order_by(RecorrenteFinanceiro.tipo, RecorrenteFinanceiro.descricao).all()
    return jsonify([{
        "id": r.id, "tipo": r.tipo, "categoria": r.categoria,
        "descricao": r.descricao, "valor": r.valor,
        "dia_vencimento": r.dia_vencimento, "ativo": r.ativo,
        "observacoes": r.observacoes,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in items])


@app.route('/api/financeiro/recorrentes', methods=['POST'])
@require_role('admin', 'financeiro')
def criar_recorrente():
    data = request.json or {}
    if not data.get('descricao') or not data.get('categoria'):
        return err("Descrição e categoria são obrigatórias")
    r = RecorrenteFinanceiro(
        tipo=data.get('tipo', 'despesa'),
        categoria=data['categoria'],
        descricao=data['descricao'],
        valor=float(data.get('valor', 0)),
        dia_vencimento=int(data.get('dia_vencimento', 1)),
        ativo=bool(data.get('ativo', True)),
        observacoes=data.get('observacoes', ''),
    )
    db.session.add(r)
    db.session.commit()
    return jsonify({"id": r.id, "descricao": r.descricao}), 201


@app.route('/api/financeiro/recorrentes/<int:id>', methods=['PUT'])
@require_role('admin', 'financeiro')
def atualizar_recorrente(id):
    r = RecorrenteFinanceiro.query.get_or_404(id)
    data = request.json or {}
    for f in ['tipo', 'categoria', 'descricao', 'dia_vencimento', 'observacoes']:
        if f in data:
            setattr(r, f, data[f])
    if 'valor' in data:
        r.valor = float(data['valor'])
    if 'ativo' in data:
        r.ativo = bool(data['ativo'])
    db.session.commit()
    return jsonify({"id": r.id, "descricao": r.descricao})


@app.route('/api/financeiro/recorrentes/<int:id>', methods=['DELETE'])
@require_role('admin', 'financeiro')
def deletar_recorrente(id):
    r = RecorrenteFinanceiro.query.get_or_404(id)
    db.session.delete(r)
    db.session.commit()
    return jsonify({"ok": True})


# ── FECHAMENTO ────────────────────────────────────────────────────────────────
@app.route('/api/fechamento/resumo', methods=['GET'])
@require_role('admin', 'financeiro')
def fechamento_resumo():
    mes = request.args.get('mes', type=int, default=datetime.utcnow().month)
    ano = request.args.get('ano', type=int, default=datetime.utcnow().year)

    recibos = Recibo.query.filter(
        Recibo.status == 'recebido',
        extract('month', Recibo.data_pagamento) == mes,
        extract('year', Recibo.data_pagamento) == ano
    ).all()
    receita_mudancas = sum(r.valor_cobrado for r in recibos)

    boxes_ocu = GuardaMovel.query.filter_by(status='ocupado').all()
    receita_guarda = sum(b.valor_mensal for b in boxes_ocu)

    despesas = Despesa.query.filter(
        extract('month', Despesa.data) == mes,
        extract('year', Despesa.data) == ano
    ).all()
    total_despesas = sum(d.valor for d in despesas)

    receita_total = receita_mudancas + receita_guarda
    lucro = receita_total - total_despesas
    n = len(recibos)

    return jsonify({
        "mes": mes, "ano": ano,
        "receita_mudancas": receita_mudancas,
        "receita_guarda_moveis": receita_guarda,
        "receita_total": receita_total,
        "total_despesas": total_despesas,
        "lucro_liquido": lucro,
        "margem_percentual": round(lucro / receita_total * 100, 1) if receita_total > 0 else 0,
        "mudancas_realizadas": n,
        "ticket_medio": round(receita_mudancas / n, 2) if n > 0 else 0,
        "boxes_ocupados": len(boxes_ocu),
    })


@app.route('/api/fechamento/gerar-pdf', methods=['POST'])
@require_role('admin', 'financeiro')
def gerar_pdf_fechamento():
    data = request.json or {}
    mes = data.get('mes', datetime.utcnow().month)
    ano = data.get('ano', datetime.utcnow().year)
    # Gera PDF simples do fechamento
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        import io, calendar
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4)
        styles = getSampleStyleSheet()
        nome_mes = calendar.month_name[mes]
        story = [
            Paragraph(f"LEGACY MOVING - FECHAMENTO {nome_mes.upper()} {ano}", styles['Title']),
        ]
        doc.build(story)
        pdf_bytes = buf.getvalue()
        url = _salvar_drive(pdf_bytes, f"Fechamentos/{ano}", f"Fechamento-{nome_mes}-{ano}.pdf")
        return jsonify({"drive_url": url, "status": "gerado"})
    except Exception as e:
        return err(f"Erro ao gerar PDF: {e}")


# ── METAS ─────────────────────────────────────────────────────────────────────
@app.route('/api/metas', methods=['GET'])
@jwt_required()
def listar_metas():
    return jsonify([{"id": m.id, "titulo": m.titulo, "tipo": m.tipo,
                     "periodo": m.periodo, "meta": m.meta, "realizado": m.realizado,
                     "progresso": round(m.realizado / m.meta * 100, 1) if m.meta > 0 else 0,
                     "created_at": m.created_at.isoformat() if m.created_at else None}
                    for m in Meta.query.all()])


@app.route('/api/metas', methods=['POST'])
@require_role('admin')
def criar_meta():
    data = request.json or {}
    if not data.get('titulo'):
        return err("titulo é obrigatório")
    m = Meta(titulo=data['titulo'], tipo=data.get('tipo', 'receita'),
             periodo=data.get('periodo', 'mensal'),
             meta=float(data.get('meta', 0)), realizado=float(data.get('realizado', 0)))
    db.session.add(m)
    db.session.commit()
    return jsonify({"id": m.id, "titulo": m.titulo}), 201


@app.route('/api/metas/<int:id>', methods=['PUT'])
@require_role('admin')
def atualizar_meta(id):
    m = Meta.query.get_or_404(id)
    data = request.json or {}
    for f in ['titulo', 'tipo', 'periodo']:
        if f in data:
            setattr(m, f, data[f])
    if 'meta' in data:
        m.meta = float(data['meta'])
    if 'realizado' in data:
        m.realizado = float(data['realizado'])
    db.session.commit()
    return jsonify({"id": m.id, "titulo": m.titulo})


@app.route('/api/metas/<int:id>', methods=['DELETE'])
@require_role('admin')
def deletar_meta(id):
    m = Meta.query.get_or_404(id)
    db.session.delete(m)
    db.session.commit()
    return jsonify({"status": "deletado"})


# ── AUDIT LOG HELPER ─────────────────────────────────────────────────────────
def registrar_audit(user, acao, entidade, entidade_id=None, descricao='',
                    dados_anteriores=None, dados_novos=None):
    try:
        log = AuditLog(
            user_id=user.id if user else None,
            user_nome=user.name if user else 'Sistema',
            acao=acao,
            entidade=entidade,
            entidade_id=str(entidade_id) if entidade_id else None,
            descricao=descricao,
            dados_anteriores=json.dumps(dados_anteriores, ensure_ascii=False) if dados_anteriores else None,
            dados_novos=json.dumps(dados_novos, ensure_ascii=False) if dados_novos else None,
            ip=request.remote_addr,
            user_agent=request.headers.get('User-Agent', '')[:255],
        )
        db.session.add(log)
        # não commita aqui — será commitado junto com a operação principal
    except Exception as e:
        logger.warning(f"Audit log error: {e}")


# ── MATERIAIS ─────────────────────────────────────────────────────────────────
@app.route('/api/materiais', methods=['GET'])
@jwt_required()
def listar_materiais():
    q = request.args.get('q', '')
    categoria = request.args.get('categoria', '')
    ativo = request.args.get('ativo', '')
    query = Material.query
    if q:
        query = query.filter(Material.nome.ilike(f'%{q}%'))
    if categoria:
        query = query.filter_by(categoria=categoria)
    if ativo == '1':
        query = query.filter(Material.ativo == True)  # noqa: E712
    elif ativo == '0':
        query = query.filter(Material.ativo == False)  # noqa: E712
    mats = query.order_by(Material.categoria, Material.nome).all()
    return jsonify([_material_dict(m) for m in mats])


@app.route('/api/materiais/<int:id>', methods=['GET'])
@jwt_required()
def obter_material(id):
    m = Material.query.get_or_404(id)
    d = _material_dict(m)
    # Posição de estoque associada
    estoque = Estoque.query.filter_by(material_id=id).first()
    d['estoque'] = _estoque_dict(estoque) if estoque else None
    return jsonify(d)


@app.route('/api/materiais', methods=['POST'])
@require_role('admin', 'operacional')
def criar_material():
    data = request.json or {}
    if not data.get('nome'):
        return err("nome é obrigatório")
    from datetime import date as date_type
    dc = data.get('data_compra')
    data_compra_obj = None
    if dc:
        try: data_compra_obj = date_type.fromisoformat(dc)
        except: pass
    m = Material(
        nome=data['nome'],
        categoria=data.get('categoria', 'outros'),
        unidade=data.get('unidade', 'un'),
        custo_unitario=float(data.get('custo_unitario', 0)),
        quantidade_minima=float(data.get('quantidade_minima', 0)),
        quantidade_critica=float(data.get('quantidade_critica', 0)),
        descricao=data.get('descricao', ''),
        ativo=data.get('ativo', True),
        fornecedor=data.get('fornecedor', ''),
        lote=data.get('lote', ''),
        data_compra=data_compra_obj,
    )
    db.session.add(m)
    db.session.flush()
    u = current_user()
    registrar_audit(u, 'criar', 'material', m.id, f'Material criado: {m.nome}', dados_novos=data)
    db.session.commit()
    return jsonify(_material_dict(m)), 201


@app.route('/api/materiais/<int:id>', methods=['PUT'])
@require_role('admin', 'operacional')
def atualizar_material(id):
    m = Material.query.get_or_404(id)
    data = request.json or {}
    antes = _material_dict(m)
    for f in ['nome', 'categoria', 'unidade', 'descricao', 'ativo', 'fornecedor', 'lote']:
        if f in data:
            setattr(m, f, data[f])
    if 'custo_unitario' in data:
        m.custo_unitario = float(data['custo_unitario'])
    if 'quantidade_minima' in data:
        m.quantidade_minima = float(data['quantidade_minima'])
    if 'quantidade_critica' in data:
        m.quantidade_critica = float(data['quantidade_critica'])
    if 'data_compra' in data and data['data_compra']:
        from datetime import date as date_type
        try: m.data_compra = date_type.fromisoformat(data['data_compra'])
        except: pass
    m.updated_at = datetime.utcnow()
    registrar_audit(current_user(), 'atualizar', 'material', m.id,
                    f'Material atualizado: {m.nome}', dados_anteriores=antes, dados_novos=data)
    db.session.commit()
    return jsonify(_material_dict(m))


@app.route('/api/materiais/<int:id>', methods=['DELETE'])
@require_role('admin')
def deletar_material(id):
    m = Material.query.get_or_404(id)
    m.ativo = False
    m.updated_at = datetime.utcnow()
    registrar_audit(current_user(), 'desativar', 'material', m.id, f'Material desativado: {m.nome}')
    db.session.commit()
    return jsonify({"status": "desativado"})


@app.route('/api/materiais/categorias', methods=['GET'])
@jwt_required()
def listar_categorias_material():
    from sqlalchemy import distinct
    cats = db.session.query(distinct(Material.categoria)).order_by(Material.categoria).all()
    return jsonify([c[0] for c in cats if c[0]])


# ── GUARDA-MÓVEIS — HISTÓRICO DE EVENTOS ─────────────────────────────────────
@app.route('/api/guarda-moveis/<int:box_id>/eventos', methods=['POST'])
@require_role('admin', 'operacional', 'financeiro')
def criar_box_evento(box_id):
    box = GuardaMovel.query.get_or_404(box_id)
    data = request.json or {}
    tipo = data.get('tipo')
    tipos_validos = ('entrada', 'saida', 'troca_cliente', 'renovacao', 'encerramento', 'manutencao', 'liberacao')
    if tipo not in tipos_validos:
        return err(f"tipo deve ser um de: {', '.join(tipos_validos)}")

    u = current_user()
    evento = BoxEvento(
        box_id=box_id,
        tipo=tipo,
        cliente_id=data.get('cliente_id') or box.cliente_id,
        cliente_nome=data.get('cliente_nome') or box.cliente_nome,
        user_id=u.id if u else None,
        data_evento=datetime.utcnow(),
        contrato_referencia=data.get('contrato_referencia') or box.contrato_referencia,
        valor_mensal=float(data.get('valor_mensal', box.valor_mensal or 0)),
        observacoes=data.get('observacoes', ''),
    )
    db.session.add(evento)

    # Atualiza estado do box conforme tipo
    status_map = {
        'entrada': 'ocupado',
        'saida': 'livre',
        'troca_cliente': 'ocupado',
        'renovacao': 'ocupado',
        'encerramento': 'livre',
        'manutencao': 'manutencao',
        'liberacao': 'livre',
    }
    box.status = status_map.get(tipo, box.status)

    if tipo == 'entrada':
        box.cliente_id = data.get('cliente_id', box.cliente_id)
        box.cliente_nome = data.get('cliente_nome', box.cliente_nome)
        box.valor_mensal = float(data.get('valor_mensal', box.valor_mensal or 0))
        box.data_entrada = datetime.utcnow()
        if data.get('data_saida_prevista'):
            box.data_saida_prevista = datetime.fromisoformat(data['data_saida_prevista'])
        box.contrato_referencia = data.get('contrato_referencia', box.contrato_referencia)
    elif tipo in ('saida', 'encerramento', 'liberacao'):
        box.cliente_id = None
        box.cliente_nome = None
        box.valor_mensal = 0
        box.data_saida_prevista = None
    elif tipo == 'troca_cliente':
        box.cliente_id = data.get('cliente_id', box.cliente_id)
        box.cliente_nome = data.get('cliente_nome', box.cliente_nome)
        box.valor_mensal = float(data.get('valor_mensal', box.valor_mensal or 0))
    elif tipo == 'renovacao':
        if data.get('data_saida_prevista'):
            box.data_saida_prevista = datetime.fromisoformat(data['data_saida_prevista'])
        if data.get('valor_mensal'):
            box.valor_mensal = float(data['valor_mensal'])

    if hasattr(box, 'updated_at'):
        box.updated_at = datetime.utcnow()

    registrar_audit(u, f'box_{tipo}', 'guarda_movel', box_id,
                    f'Evento {tipo} no box {box.numero}', dados_novos=data)
    db.session.commit()
    return jsonify(_box_evento_dict(evento)), 201


@app.route('/api/guarda-moveis/<int:box_id>/historico', methods=['GET'])
@jwt_required()
def historico_box(box_id):
    GuardaMovel.query.get_or_404(box_id)
    eventos = (BoxEvento.query
               .filter_by(box_id=box_id)
               .order_by(BoxEvento.data_evento.desc())
               .all())
    return jsonify([_box_evento_dict(e) for e in eventos])


# ── AUDIT LOG ─────────────────────────────────────────────────────────────────
@app.route('/api/audit-log', methods=['GET'])
@require_role('admin')
def listar_audit_log():
    entidade = request.args.get('entidade', '')
    user_id = request.args.get('user_id', '')
    limit = min(int(request.args.get('limit', 100)), 500)
    offset = int(request.args.get('offset', 0))
    query = AuditLog.query
    if entidade:
        query = query.filter_by(entidade=entidade)
    if user_id:
        query = query.filter_by(user_id=int(user_id))
    logs = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
    total = query.count()
    return jsonify({
        "total": total,
        "offset": offset,
        "limit": limit,
        "logs": [{
            "id": l.id, "user_id": l.user_id, "user_nome": l.user_nome,
            "acao": l.acao, "entidade": l.entidade, "entidade_id": l.entidade_id,
            "descricao": l.descricao,
            "dados_anteriores": json.loads(l.dados_anteriores) if l.dados_anteriores else None,
            "dados_novos": json.loads(l.dados_novos) if l.dados_novos else None,
            "ip": l.ip,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
        } for l in logs]
    })


# ── JORNADAS ─────────────────────────────────────────────────────────────────
@app.route('/api/jornadas/<int:user_id>', methods=['GET'])
@jwt_required()
def obter_jornada(user_id):
    u = current_user()
    # Qualquer usuário pode ver a própria jornada; admin vê qualquer uma
    if u.id != user_id and u.role != 'admin':
        return err("Acesso negado", 403)
    j = Jornada.query.filter_by(user_id=user_id).first()
    if not j:
        return jsonify(None)
    return jsonify({
        "id": j.id, "user_id": j.user_id,
        "hora_entrada": j.hora_entrada, "hora_saida": j.hora_saida,
        "dias_semana": json.loads(j.dias_semana) if j.dias_semana else [],
        "tipo_turno": j.tipo_turno,
        "carga_horaria_semanal": j.carga_horaria_semanal,
        "observacoes": j.observacoes,
    })


@app.route('/api/jornadas/<int:user_id>', methods=['PUT'])
@require_role('admin')
def salvar_jornada(user_id):
    User.query.get_or_404(user_id)
    data = request.json or {}
    j = Jornada.query.filter_by(user_id=user_id).first()
    if not j:
        j = Jornada(user_id=user_id)
        db.session.add(j)
    if 'hora_entrada' in data:
        j.hora_entrada = data['hora_entrada']
    if 'hora_saida' in data:
        j.hora_saida = data['hora_saida']
    if 'dias_semana' in data:
        j.dias_semana = json.dumps(data['dias_semana'])
    if 'tipo_turno' in data:
        j.tipo_turno = data['tipo_turno']
    if 'carga_horaria_semanal' in data:
        j.carga_horaria_semanal = float(data['carga_horaria_semanal'])
    if 'observacoes' in data:
        j.observacoes = data['observacoes']
    registrar_audit(current_user(), 'atualizar', 'jornada', user_id,
                    f'Jornada atualizada para user {user_id}')
    db.session.commit()
    return jsonify({"status": "ok", "user_id": user_id})


# ── TURNOS ─────────────────────────────────────────────────────────────────────
@app.route('/api/turnos/iniciar', methods=['POST'])
@jwt_required()
def iniciar_turno():
    u = current_user()
    hoje = datetime.utcnow().date()
    turno_aberto = Turno.query.filter_by(user_id=u.id, status='aberto').first()
    if turno_aberto:
        return jsonify({"turno_id": turno_aberto.id, "ja_aberto": True})
    turno = Turno(
        user_id=u.id,
        data=hoje,
        inicio=datetime.utcnow(),
        status='aberto',
        minutos_online=0, minutos_ativo=0, minutos_ocioso=0, total_acoes=0,
    )
    db.session.add(turno)
    db.session.commit()
    return jsonify({"turno_id": turno.id, "ja_aberto": False}), 201


@app.route('/api/turnos/encerrar', methods=['POST'])
@jwt_required()
def encerrar_turno():
    u = current_user()
    turno = Turno.query.filter_by(user_id=u.id, status='aberto').first()
    if not turno:
        return err("Nenhum turno aberto encontrado")
    agora = datetime.utcnow()
    turno.fim = agora
    turno.status = 'encerrado'
    # Calcula minutos online
    delta = int((agora - turno.inicio).total_seconds() / 60)
    turno.minutos_online = delta
    # Ações = logs de atividade no período
    acoes = UserActivityLog.query.filter(
        UserActivityLog.user_id == u.id,
        UserActivityLog.timestamp >= turno.inicio,
        UserActivityLog.timestamp <= agora,
    ).count()
    turno.total_acoes = acoes
    # Ocioso = online - ativo (estimativa simples)
    turno.minutos_ativo = min(delta, acoes * 2)  # ~2min de atividade por ação
    turno.minutos_ocioso = max(0, delta - turno.minutos_ativo)
    db.session.commit()
    return jsonify({
        "turno_id": turno.id,
        "minutos_online": turno.minutos_online,
        "minutos_ativo": turno.minutos_ativo,
        "minutos_ocioso": turno.minutos_ocioso,
        "total_acoes": turno.total_acoes,
    })


@app.route('/api/turnos', methods=['GET'])
@jwt_required()
def listar_turnos():
    u = current_user()
    user_id = request.args.get('user_id', '')
    data_str = request.args.get('data', '')
    # Não-admin só vê os próprios turnos
    if u.role != 'admin':
        user_id = str(u.id)
    query = Turno.query
    if user_id:
        query = query.filter_by(user_id=int(user_id))
    if data_str:
        try:
            from datetime import date
            d = date.fromisoformat(data_str)
            query = query.filter_by(data=d)
        except Exception:
            pass
    turnos = query.order_by(Turno.inicio.desc()).limit(100).all()
    return jsonify([{
        "id": t.id, "user_id": t.user_id,
        "data": t.data.isoformat() if t.data else None,
        "inicio": t.inicio.isoformat() if t.inicio else None,
        "fim": t.fim.isoformat() if t.fim else None,
        "minutos_online": t.minutos_online,
        "minutos_ativo": t.minutos_ativo,
        "minutos_ocioso": t.minutos_ocioso,
        "total_acoes": t.total_acoes,
        "status": t.status,
    } for t in turnos])


# ── FUNCIONÁRIOS ──────────────────────────────────────────────────────────────
def _func_dict(f):
    return {
        "id": f.id, "nome": f.nome, "tipo": f.tipo,
        "funcoes": f.funcoes, "telefone": f.telefone,
        "cpf": f.cpf, "pix": f.pix,
        "valor_diaria": f.valor_diaria, "salario": f.salario,
        "disponibilidade": f.disponibilidade,
        "avaliacao": f.avaliacao, "total_servicos": f.total_servicos,
        "pontos": f.pontos or 0,
        "ativo": f.ativo, "observacoes": f.observacoes,
        "created_at": f.created_at.isoformat() if f.created_at else None,
    }


@app.route('/api/funcionarios', methods=['GET'])
@jwt_required()
def listar_funcionarios():
    ativo = request.args.get('ativo', '1')
    tipo = request.args.get('tipo', '')
    q = Funcionario.query
    if ativo == '1':
        q = q.filter_by(ativo=True)
    if tipo:
        q = q.filter_by(tipo=tipo)
    funcs = q.order_by(Funcionario.nome).all()
    return jsonify([_func_dict(f) for f in funcs])


@app.route('/api/funcionarios', methods=['POST'])
@require_role('admin', 'operacional')
def criar_funcionario():
    data = request.json or {}
    if not data.get('nome'):
        return err("Nome é obrigatório")
    f = Funcionario(
        nome=data['nome'], tipo=data.get('tipo', 'fixo'),
        funcoes=data.get('funcoes', ''), telefone=data.get('telefone', ''),
        cpf=data.get('cpf', ''), pix=data.get('pix', ''),
        valor_diaria=float(data.get('valor_diaria', 0)),
        salario=float(data.get('salario', 0)),
        disponibilidade=data.get('disponibilidade', ''),
        observacoes=data.get('observacoes', ''),
        ativo=data.get('ativo', True),
    )
    db.session.add(f)
    db.session.commit()
    return jsonify(_func_dict(f)), 201


@app.route('/api/funcionarios/<int:id>', methods=['PUT'])
@require_role('admin', 'operacional')
def atualizar_funcionario(id):
    f = Funcionario.query.get_or_404(id)
    data = request.json or {}
    for campo in ['nome', 'tipo', 'funcoes', 'telefone', 'cpf', 'pix',
                   'disponibilidade', 'observacoes', 'ativo']:
        if campo in data:
            setattr(f, campo, data[campo])
    if 'valor_diaria' in data:
        f.valor_diaria = float(data['valor_diaria'])
    if 'salario' in data:
        f.salario = float(data['salario'])
    if 'avaliacao' in data:
        f.avaliacao = float(data['avaliacao'])
    if 'total_servicos' in data:
        f.total_servicos = int(data['total_servicos'])
    db.session.commit()
    return jsonify(_func_dict(f))


@app.route('/api/funcionarios/<int:id>', methods=['DELETE'])
@require_role('admin')
def deletar_funcionario(id):
    f = Funcionario.query.get_or_404(id)
    db.session.delete(f)
    db.session.commit()
    return jsonify({"ok": True})


# ── VÍNCULO FUNCIONÁRIO ↔ OS ──────────────────────────────────────────────────
@app.route('/api/os/<int:os_id>/equipe', methods=['GET'])
@jwt_required()
def listar_equipe_os(os_id):
    OrdemServico.query.get_or_404(os_id)
    vinculos = FuncionarioOS.query.filter_by(os_id=os_id).all()
    result = []
    for v in vinculos:
        f = Funcionario.query.get(v.funcionario_id)
        result.append({
            "id": v.id, "funcionario_id": v.funcionario_id,
            "nome": f.nome if f else '?', "tipo": f.tipo if f else '',
            "funcao_no_servico": v.funcao_no_servico,
            "funcoes": f.funcoes if f else '',
            "pontos_ganhos": v.pontos_ganhos,
            "etapa_id": v.etapa_id,
            "data": v.data.isoformat() if v.data else None,
        })
    return jsonify(result)


@app.route('/api/os/<int:os_id>/equipe', methods=['POST'])
@require_role('admin', 'operacional')
def vincular_funcionario_os(os_id):
    """Vincula um ou mais funcionários a uma OS."""
    OrdemServico.query.get_or_404(os_id)
    data = request.json or {}
    funcionario_ids = data.get('funcionario_ids', [])
    etapa_id = data.get('etapa_id')

    # Pontos por tipo de serviço
    PONTOS = {'mudanca': 15, 'embalagem': 10, 'transporte': 12, 'icamento': 20, 'montagem': 8}
    pontos_base = PONTOS.get(data.get('tipo_servico', ''), 10)

    vinculados = []
    for fid in funcionario_ids:
        f = Funcionario.query.get(fid)
        if not f:
            continue
        # Evita duplicata
        existente = FuncionarioOS.query.filter_by(
            funcionario_id=fid, os_id=os_id, etapa_id=etapa_id
        ).first()
        if existente:
            continue
        v = FuncionarioOS(
            funcionario_id=fid, os_id=os_id, etapa_id=etapa_id,
            funcao_no_servico=f.funcoes.split(',')[0].strip() if f.funcoes else '',
            pontos_ganhos=pontos_base,
        )
        db.session.add(v)
        # Atualiza contadores do funcionário
        f.total_servicos = (f.total_servicos or 0) + 1
        f.pontos = (f.pontos or 0) + pontos_base
        vinculados.append(f.nome)

    db.session.commit()
    return jsonify({"vinculados": vinculados, "pontos": pontos_base})


@app.route('/api/os/<int:os_id>/equipe/<int:vinculo_id>', methods=['DELETE'])
@require_role('admin', 'operacional')
def desvincular_funcionario_os(os_id, vinculo_id):
    v = FuncionarioOS.query.get_or_404(vinculo_id)
    # Remove pontos
    f = Funcionario.query.get(v.funcionario_id)
    if f:
        f.total_servicos = max(0, (f.total_servicos or 0) - 1)
        f.pontos = max(0, (f.pontos or 0) - (v.pontos_ganhos or 0))
    db.session.delete(v)
    db.session.commit()
    return jsonify({"ok": True})


@app.route('/api/funcionarios/ranking', methods=['GET'])
@jwt_required()
def ranking_funcionarios():
    """Ranking gamificado de funcionários por pontos."""
    funcs = Funcionario.query.filter_by(ativo=True).order_by(Funcionario.pontos.desc()).all()
    NIVEIS = [
        (500, 'Lenda', '🏆'), (300, 'Expert', '💎'), (150, 'Veterano', '⭐'),
        (80, 'Profissional', '🔥'), (30, 'Iniciante', '🌱'), (0, 'Novato', '🆕'),
    ]
    result = []
    for i, f in enumerate(funcs):
        pts = f.pontos or 0
        nivel = next((n for n in NIVEIS if pts >= n[0]), NIVEIS[-1])
        prox = next((n for n in reversed(NIVEIS) if n[0] > pts), None)
        result.append({
            **_func_dict(f),
            "posicao": i + 1,
            "pontos": pts,
            "nivel": nivel[1],
            "nivel_emoji": nivel[2],
            "proximo_nivel": prox[1] if prox else None,
            "pontos_proximo": prox[0] - pts if prox else 0,
            # Histórico de OS
            "os_recentes": [{
                "os_id": v.os_id,
                "funcao": v.funcao_no_servico,
                "pontos": v.pontos_ganhos,
                "data": v.data.isoformat() if v.data else None,
            } for v in FuncionarioOS.query.filter_by(funcionario_id=f.id)
                .order_by(FuncionarioOS.created_at.desc()).limit(5).all()],
        })
    return jsonify(result)


# ── PORTAL DO CLIENTE (público, sem autenticação) ────────────────────────────
import hashlib

def _gerar_token_portal(os_id):
    """Gera um token determinístico para a OS (baseado no ID + secret)."""
    secret = app.config.get('JWT_SECRET_KEY', 'legacy')
    raw = f"portal-{os_id}-{secret}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


@app.route('/api/portal/<token>', methods=['GET'])
def portal_cliente(token):
    """Endpoint público — retorna dados da OS pelo token do portal."""
    # Encontra a OS cujo token bate
    todas_os = OrdemServico.query.all()
    os_ = None
    for o in todas_os:
        if _gerar_token_portal(o.id) == token:
            os_ = o
            break
    if not os_:
        return err("Link inválido ou expirado", 404)
    return jsonify({
        "os": {
            "id": os_.id, "numero": os_.numero,
            "cliente": os_.cliente,
            "status": os_.status,
            "data_mudanca": os_.data_mudanca.isoformat() if os_.data_mudanca else None,
            "endereco_origem": os_.endereco_origem,
            "endereco_destino": os_.endereco_destino,
            "equipe": os_.equipe,
            "veiculo": os_.veiculo,
            "tipo_servico": os_.tipo_servico,
        },
        "token": token,
    })


@app.route('/api/portal/<token>/nps', methods=['POST'])
def portal_nps(token):
    """Recebe avaliação NPS do cliente."""
    todas_os = OrdemServico.query.all()
    os_ = None
    for o in todas_os:
        if _gerar_token_portal(o.id) == token:
            os_ = o
            break
    if not os_:
        return err("Link inválido", 404)
    data = request.json or {}
    nota = data.get('nota')
    comentario = data.get('comentario', '')
    # Salva como observação na OS
    nps_text = f"\n[NPS {nota}/10] {comentario}" if comentario else f"\n[NPS {nota}/10]"
    os_.observacoes_finais = (os_.observacoes_finais or '') + nps_text
    db.session.commit()
    return jsonify({"ok": True, "nota": nota})


@app.route('/api/os/<int:id>/portal-link', methods=['GET'])
@jwt_required()
def gerar_link_portal(id):
    """Gera o link do portal para enviar ao cliente."""
    os_ = OrdemServico.query.get_or_404(id)
    token = _gerar_token_portal(os_.id)
    return jsonify({"token": token, "url": f"/acompanhar/{token}"})


# ── INICIALIZAÇÃO ─────────────────────────────────────────────────────────────
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
