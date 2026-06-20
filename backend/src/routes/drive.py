"""
routes/drive.py — Legacy Moving
Endpoints REST para gerenciamento do backup no Google Drive.
Sem imports circulares com main.py.

Rotas:
  GET  /api/drive/status                     → status da conexão
  GET  /api/drive/historico/<tipo>/<numero>  → versões de um registro
  GET  /api/drive/buscar?q=...&tipo=...      → busca de arquivos
  GET  /api/drive/painel                     → resumo do data lake por tipo

Nota: O endpoint /api/drive/backup/<tipo>/<id> está em main.py
para ter acesso direto aos modelos SQLAlchemy.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Blueprint, request, jsonify
from drive_service import drive, TIPO_PASTA
import logging

logger = logging.getLogger(__name__)

drive_bp = Blueprint('drive', __name__, url_prefix='/api/drive')


def err(msg, code=400):
    return jsonify({'erro': msg}), code


# ── Status ────────────────────────────────────────────────────────────────────
@drive_bp.route('/status', methods=['GET'])
def status_drive():
    """Retorna status da conexão e quota do Google Drive."""
    return jsonify(drive.status())


# ── Histórico de versões ──────────────────────────────────────────────────────
@drive_bp.route('/historico/<tipo>/<path:numero>', methods=['GET'])
def historico_registro(tipo, numero):
    """Lista todas as versões salvas de um registro no Drive."""
    if not drive.online:
        return jsonify({'online': False, 'arquivos': []})

    arquivos = drive.historico_registro(tipo, numero)
    return jsonify({
        'tipo':     tipo,
        'numero':   numero,
        'total':    len(arquivos),
        'arquivos': [
            {
                'id':          a.get('id'),
                'nome':        a.get('name'),
                'url':         a.get('webViewLink'),
                'criado_em':   a.get('createdTime'),
                'tipo_mime':   a.get('mimeType'),
                'usuario':     a.get('properties', {}).get('usuario', '—'),
            }
            for a in arquivos
        ],
    })


# ── Busca ─────────────────────────────────────────────────────────────────────
@drive_bp.route('/buscar', methods=['GET'])
def buscar_no_drive():
    """
    Busca arquivos no Drive por nome, número, e-mail, telefone, etc.
    Query params:
      q    — termo de busca (obrigatório)
      tipo — filtrar por tipo (opcional): cliente | orcamento | contrato | os | guarda
    """
    q = (request.args.get('q') or '').strip()
    tipo = request.args.get('tipo', '').strip() or None

    if not q:
        return err("Parâmetro 'q' é obrigatório")
    if not drive.online:
        return jsonify({'online': False, 'resultados': []})

    resultados = drive.buscar(q, tipo=tipo)
    return jsonify({
        'termo':    q,
        'tipo':     tipo,
        'total':    len(resultados),
        'resultados': [
            {
                'id':        r.get('id'),
                'nome':      r.get('name'),
                'url':       r.get('webViewLink'),
                'criado_em': r.get('createdTime'),
                'tipo_mime': r.get('mimeType'),
                'props':     r.get('properties', {}),
            }
            for r in resultados
        ],
    })


# ── Painel do Data Lake ───────────────────────────────────────────────────────
@drive_bp.route('/painel', methods=['GET'])
def painel_drive():
    """
    Resumo do Data Lake: contagem de registros por tipo.
    Usado no painel Admin.
    """
    if not drive.online:
        return jsonify({'online': False, 'status': drive.status()})

    try:
        resumo = {}
        for tipo, pasta_nome in TIPO_PASTA.items():
            try:
                pasta_id = drive._pasta_tipo(tipo)
                res = drive._svc.files().list(
                    q=f"'{pasta_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
                    fields='files(id)',
                    pageSize=1000,
                ).execute()
                resumo[tipo] = {
                    'pasta':     pasta_nome,
                    'registros': len(res.get('files', [])),
                }
            except Exception:
                resumo[tipo] = {'pasta': pasta_nome, 'registros': 0}

        return jsonify({
            'online':    True,
            'status':    drive.status(),
            'data_lake': resumo,
        })

    except Exception as e:
        logger.error(f"Drive painel erro: {e}")
        return err(str(e), 500)
