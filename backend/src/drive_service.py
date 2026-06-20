"""
drive_service.py — Legacy Moving
Camada de persistência secundária no Google Drive.

Arquitetura de pastas:
  Legacy Moving ERP/
  ├── Clientes/
  │   └── CLI-001/
  │       ├── CLI-001_20260620_143000.pdf
  │       └── CLI-001_20260620_143000.json
  ├── Orcamentos/
  ├── Contratos/
  ├── OrdensServico/
  └── GuardaMoveis/

Env vars necessárias:
  GOOGLE_SERVICE_ACCOUNT_JSON — JSON completo da Service Account (minificado)
  DRIVE_ADMIN_EMAIL           — legacymovingbr@gmail.com (compartilhamento)
"""

import os
import io
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# ── Imports Google (falha silenciosa se não instalado) ────────────────────────
try:
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseUpload
    from google.oauth2 import service_account
    _GOOGLE_OK = True
except ImportError:
    _GOOGLE_OK = False
    logger.warning("google-api-python-client não instalado — Drive desativado.")

SCOPES           = ['https://www.googleapis.com/auth/drive']
DRIVE_ROOT_NAME  = 'Legacy Moving ERP'
DRIVE_ADMIN      = os.environ.get('DRIVE_ADMIN_EMAIL', 'legacymovingbr@gmail.com')

# Mapeamento tipo → nome da pasta no Drive
TIPO_PASTA = {
    'cliente':      'Clientes',
    'orcamento':    'Orcamentos',
    'contrato':     'Contratos',
    'os':           'OrdensServico',
    'guarda':       'GuardaMoveis',
    'recibo':       'Recibos',
    'fechamento':   'Fechamentos',
    'avaria':       'Avarias',
}


class DriveService:
    """Serviço singleton para interação com o Google Drive."""

    _instance = None

    def __init__(self):
        self._svc       = None
        self._root_id   = None
        self._pasta_ids = {}   # cache: tipo → folder_id
        self._connect()

    @classmethod
    def get(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ── Conexão ───────────────────────────────────────────────────────────────
    def _connect(self):
        if not _GOOGLE_OK:
            return
        # Aceita tanto o novo nome quanto o legado GOOGLE_CREDENTIALS_JSON
        creds_json = (
            os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON') or
            os.environ.get('GOOGLE_CREDENTIALS_JSON') or ''
        )
        if not creds_json:
            logger.warning("GOOGLE_SERVICE_ACCOUNT_JSON não configurada — Drive offline.")
            return
        try:
            info  = json.loads(creds_json)
            creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
            self._svc = build('drive', 'v3', credentials=creds, cache_discovery=False)
            logger.info("Google Drive conectado com sucesso.")
        except Exception as e:
            logger.error(f"Drive: falha na conexão — {e}")

    @property
    def online(self):
        return self._svc is not None

    # ── Utilitários de pasta ──────────────────────────────────────────────────
    def _get_or_create_folder(self, nome, parent_id=None):
        """Retorna ID de pasta existente ou cria uma nova."""
        q = f"name='{nome}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        if parent_id:
            q += f" and '{parent_id}' in parents"
        res = self._svc.files().list(q=q, fields='files(id)', pageSize=1).execute()
        files = res.get('files', [])
        if files:
            return files[0]['id']
        meta = {'name': nome, 'mimeType': 'application/vnd.google-apps.folder'}
        if parent_id:
            meta['parents'] = [parent_id]
        folder = self._svc.files().create(body=meta, fields='id').execute()
        fid = folder['id']
        # Compartilhar com o admin
        try:
            self._svc.permissions().create(
                fileId=fid,
                body={'type': 'user', 'role': 'writer', 'emailAddress': DRIVE_ADMIN},
                sendNotificationEmail=False,
            ).execute()
        except Exception:
            pass
        return fid

    def _root(self):
        if not self._root_id:
            self._root_id = self._get_or_create_folder(DRIVE_ROOT_NAME)
        return self._root_id

    def _pasta_tipo(self, tipo):
        nome = TIPO_PASTA.get(tipo, tipo.capitalize())
        if nome not in self._pasta_ids:
            self._pasta_ids[nome] = self._get_or_create_folder(nome, self._root())
        return self._pasta_ids[nome]

    def _pasta_registro(self, tipo, numero):
        """Pasta específica do registro, ex: Contratos/CTR-2026-001"""
        tipo_id = self._pasta_tipo(tipo)
        return self._get_or_create_folder(numero, tipo_id)

    # ── Upload de arquivo ─────────────────────────────────────────────────────
    def _upload(self, nome_arquivo, conteudo_bytes, mimetype, pasta_id, properties=None):
        meta = {
            'name':    nome_arquivo,
            'parents': [pasta_id],
        }
        if properties:
            meta['properties'] = {k: str(v) for k, v in properties.items()}

        media = MediaIoBaseUpload(io.BytesIO(conteudo_bytes), mimetype=mimetype, resumable=False)
        f = self._svc.files().create(body=meta, media_body=media, fields='id,webViewLink').execute()
        return f.get('id'), f.get('webViewLink', '')

    # ── API pública principal ─────────────────────────────────────────────────
    def salvar_registro(self, tipo, numero, json_data, pdf_bytes=None,
                        usuario='sistema', extra_props=None):
        """
        Salva PDF + JSON no Drive com versionamento.

        Parâmetros:
            tipo        — 'cliente', 'orcamento', 'contrato', 'os', 'guarda'
            numero      — identificador do registro ('CTR-2026-001', 'CLI-001', etc.)
            json_data   — dict com todos os dados do registro
            pdf_bytes   — bytes do PDF (opcional)
            usuario     — nome/id do usuário que gerou a ação
            extra_props — metadados adicionais (dict) para facilitar busca

        Retorna dict com 'pdf_url' e 'json_url' (ou None em caso de erro).
        """
        if not self.online:
            return None

        try:
            ts    = datetime.now().strftime('%Y%m%d_%H%M%S')
            pasta = self._pasta_registro(tipo, numero)

            props = {
                'tipo':    tipo,
                'numero':  numero,
                'usuario': usuario,
                'ts':      ts,
                **(extra_props or {}),
            }

            result = {}

            # ── JSON ──────────────────────────────────────────────────────────
            json_payload = {
                '_meta': {
                    'tipo':      tipo,
                    'numero':    numero,
                    'usuario':   usuario,
                    'gerado_em': ts,
                    'versao':    ts,
                    'sistema':   'Legacy Moving ERP',
                },
                'dados': json_data,
            }
            json_bytes = json.dumps(json_payload, ensure_ascii=False, indent=2, default=str).encode('utf-8')
            jid, jurl = self._upload(
                f"{numero}_{ts}.json", json_bytes,
                'application/json', pasta, props
            )
            result['json_id']  = jid
            result['json_url'] = jurl

            # ── PDF ───────────────────────────────────────────────────────────
            if pdf_bytes:
                pid, purl = self._upload(
                    f"{numero}_{ts}.pdf", pdf_bytes,
                    'application/pdf', pasta, props
                )
                result['pdf_id']  = pid
                result['pdf_url'] = purl

            logger.info(f"Drive: {tipo}/{numero} salvo em {ts} por {usuario}")
            return result

        except Exception as e:
            logger.error(f"Drive: erro ao salvar {tipo}/{numero} — {e}")
            return None

    # ── Busca ─────────────────────────────────────────────────────────────────
    def buscar(self, termo, tipo=None, limite=30):
        """
        Busca arquivos no Drive por termo livre.
        Campos pesquisáveis: nome, properties (numero, cliente_nome, cpf, etc.)
        """
        if not self.online:
            return []
        try:
            q = f"name contains '{termo}' and trashed=false"
            if tipo:
                pasta_nome = TIPO_PASTA.get(tipo, tipo)
                q = f"'{self._pasta_tipo(tipo)}' in parents and trashed=false and name contains '{termo}'"

            res = self._svc.files().list(
                q=q,
                fields='files(id,name,webViewLink,properties,createdTime,mimeType)',
                orderBy='createdTime desc',
                pageSize=limite,
            ).execute()
            return res.get('files', [])
        except Exception as e:
            logger.error(f"Drive busca erro: {e}")
            return []

    def historico_registro(self, tipo, numero):
        """Lista todas as versões de um registro específico."""
        if not self.online:
            return []
        try:
            pasta = self._pasta_registro(tipo, numero)
            res = self._svc.files().list(
                q=f"'{pasta}' in parents and trashed=false",
                fields='files(id,name,webViewLink,createdTime,mimeType,properties)',
                orderBy='createdTime desc',
                pageSize=50,
            ).execute()
            return res.get('files', [])
        except Exception as e:
            logger.error(f"Drive historico erro: {e}")
            return []

    def status(self):
        """Retorna status da conexão e estatísticas básicas."""
        if not self.online:
            return {
                'online':  False,
                'motivo':  'GOOGLE_SERVICE_ACCOUNT_JSON não configurada ou erro de conexão.',
                'admin':   DRIVE_ADMIN,
            }
        try:
            about = self._svc.about().get(fields='storageQuota,user').execute()
            quota = about.get('storageQuota', {})
            return {
                'online':          True,
                'admin':           DRIVE_ADMIN,
                'root_pasta':      DRIVE_ROOT_NAME,
                'quota_total_gb':  round(int(quota.get('limit', 0)) / 1e9, 2),
                'quota_usado_gb':  round(int(quota.get('usage', 0)) / 1e9, 2),
                'usuario_drive':   about.get('user', {}).get('emailAddress'),
            }
        except Exception as e:
            return {'online': False, 'erro': str(e)}


# ── Instância global ──────────────────────────────────────────────────────────
drive = DriveService.get()
