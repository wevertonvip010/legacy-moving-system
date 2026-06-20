"""
drive_hooks.py — Legacy Moving
Helper de backup no Drive. Executa em thread separada para não bloquear responses.

Uso em main.py:
    from drive_hooks import enqueue_backup, init_drive_routes

    # Registrar blueprint
    init_drive_routes(app)

    # Após db.session.commit() em qualquer rota:
    enqueue_backup('contrato', _contrato_dict(c), usuario='Weverton')
"""

import threading
import queue
import logging
import atexit

logger = logging.getLogger(__name__)

# ── Fila de backups ───────────────────────────────────────────────────────────
_fila: queue.Queue = queue.Queue()
_worker_rodando    = False
_worker_thread     = None


def _worker():
    """Thread worker que processa a fila de backups."""
    from drive_service import drive
    from pdf_generator import gerar_pdf

    while True:
        try:
            item = _fila.get(timeout=5)
            if item is None:          # sinal de encerramento
                break

            tipo, dados, usuario = item
            try:
                numero = dados.get('numero') or f"{tipo.upper()}-{dados.get('id', 0):04d}"
                extra  = {}
                if dados.get('cliente'):
                    extra['cliente_nome'] = str(dados['cliente'])[:100]
                if dados.get('email_cliente'):
                    extra['email'] = str(dados['email_cliente'])[:100]
                if dados.get('telefone_cliente'):
                    extra['telefone'] = str(dados['telefone_cliente'])[:30]

                pdf_bytes = gerar_pdf(tipo, dados)
                resultado = drive.salvar_registro(
                    tipo=tipo,
                    numero=numero,
                    json_data=dados,
                    pdf_bytes=pdf_bytes,
                    usuario=usuario,
                    extra_props=extra,
                )
                if resultado:
                    logger.info(f"[Drive] ✓ {tipo}/{numero} → {resultado.get('json_url','')}")
                else:
                    logger.debug(f"[Drive] offline — {tipo}/{numero} não salvo.")
            except Exception as e:
                logger.warning(f"[Drive] Erro backup {tipo}: {e}")
            finally:
                _fila.task_done()

        except queue.Empty:
            continue
        except Exception as e:
            logger.error(f"[Drive] Worker erro: {e}")


def _iniciar_worker():
    global _worker_rodando, _worker_thread
    if not _worker_rodando:
        _worker_thread = threading.Thread(target=_worker, daemon=True, name='DriveWorker')
        _worker_thread.start()
        _worker_rodando = True
        logger.info("[Drive] Worker iniciado.")


def _parar_worker():
    global _worker_rodando
    if _worker_rodando:
        _fila.put(None)       # sinal de encerramento
        _worker_rodando = False


atexit.register(_parar_worker)
_iniciar_worker()           # inicia ao importar o módulo


# ── API pública ───────────────────────────────────────────────────────────────
def enqueue_backup(tipo: str, dados: dict, usuario: str = 'sistema'):
    """
    Enfileira um backup para o Drive em background.

    Args:
        tipo    — 'cliente' | 'orcamento' | 'contrato' | 'os' | 'guarda' | 'recibo'
        dados   — dict com todos os dados do registro (saída das funções _xxx_dict)
        usuario — nome do usuário que realizou a ação
    """
    _fila.put((tipo, dados, usuario))


def init_drive_routes(app):
    """
    Registra o blueprint de rotas do Drive no Flask app.
    Chamar no main.py após criar o `app`.
    """
    try:
        from routes.drive import drive_bp
        app.register_blueprint(drive_bp)
        logger.info("[Drive] Blueprint /api/drive registrado.")
    except Exception as e:
        logger.warning(f"[Drive] Não foi possível registrar blueprint: {e}")
