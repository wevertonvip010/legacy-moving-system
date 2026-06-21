"""
routes/ai_config.py — Endpoints administrativos de Inteligência Artificial
Legacy Moving ERP

Endpoints:
  GET  /api/ai/status          — status da conexão (público para usuários logados)
  GET  /api/ai/config          — lê config completa (apenas admin)
  POST /api/ai/config          — salva config (apenas admin)
  POST /api/ai/set-key         — define API Key (apenas admin — NUNCA retorna a key)
  POST /api/ai/test            — testa conexão com o provedor
  POST /api/ai/chat            — chat unificado do Mirante (todos os módulos)
  GET  /api/ai/modelos         — lista modelos disponíveis por provedor
  GET  /api/ai/usage           — estatísticas de uso (apenas admin)
  GET  /api/ai/logs            — histórico de consultas (apenas admin)
  PUT  /api/ai/permissions     — define permissões por usuário/setor (apenas admin)
  GET  /api/ai/permissions     — lê permissões atuais (apenas admin)
  PUT  /api/ai/toggle          — ativa/desativa IA (apenas admin)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging

logger = logging.getLogger(__name__)

ai_config_bp = Blueprint("ai_config", __name__)


def _current_user():
    from database_real import User
    uid = get_jwt_identity()
    return User.query.get(int(uid)) if uid else None


def _require_admin():
    u = _current_user()
    if not u or u.role != "admin":
        return jsonify({"erro": "Acesso restrito a administradores."}), 403
    return None


# ─────────────────────────────────────────────────────────────────────────────
# STATUS — qualquer usuário logado
# ─────────────────────────────────────────────────────────────────────────────

@ai_config_bp.route("/status", methods=["GET"])
@jwt_required()
def status():
    """Status rápido da IA para exibir no header/sidebar."""
    try:
        from ai_service import ai
        cfg = ai.get_config()
        return jsonify({
            "ativo": cfg.get("ativo", False) and cfg.get("api_key_configurada", False),
            "provider": cfg.get("provider", "anthropic"),
            "modelo": cfg.get("modelo_padrao", "claude-haiku-4-5-20251001"),
            "api_key_configurada": cfg.get("api_key_configurada", False),
        })
    except Exception as e:
        return jsonify({"ativo": False, "erro": str(e)}), 200


# ─────────────────────────────────────────────────────────────────────────────
# CONFIG — apenas admin
# ─────────────────────────────────────────────────────────────────────────────

@ai_config_bp.route("/config", methods=["GET"])
@jwt_required()
def get_config():
    deny = _require_admin()
    if deny:
        return deny
    try:
        from ai_service import ai
        cfg = ai.get_config()
        return jsonify(cfg)
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@ai_config_bp.route("/config", methods=["POST"])
@jwt_required()
def save_config():
    deny = _require_admin()
    if deny:
        return deny
    try:
        from ai_service import ai
        data = request.get_json() or {}
        # Nunca aceitar 'api_key' diretamente aqui — use /set-key
        data.pop("api_key", None)
        data.pop("_api_key_enc", None)
        data.pop("key", None)
        ai.update_config(data)
        return jsonify({"ok": True, "mensagem": "Configurações salvas."})
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# SET KEY — apenas admin, NUNCA retorna a key
# ─────────────────────────────────────────────────────────────────────────────

@ai_config_bp.route("/set-key", methods=["POST"])
@jwt_required()
def set_api_key():
    """
    Define a API Key do provedor.
    A key é criptografada antes de persistir.
    NUNCA é retornada ao frontend.
    NUNCA é registrada em logs.
    """
    deny = _require_admin()
    if deny:
        return deny
    try:
        from ai_service import ai
        data = request.get_json() or {}
        provider = data.get("provider", "anthropic")
        key = data.get("api_key", "").strip()
        modelo_padrao = data.get("modelo_padrao", "claude-haiku-4-5-20251001")

        if not key:
            return jsonify({"erro": "API Key não pode ser vazia."}), 400

        # Armazena de forma segura
        ai.set_api_key(
            provider=provider,
            key=key,
            extra_config={
                "modelo_padrao": modelo_padrao,
                "ativo": True,
            },
        )

        # Log administrativo (sem registrar a key)
        logger.info(f"API Key do provedor '{provider}' configurada pelo admin.")

        # Verifica imediatamente se a key funciona
        test = ai.test_connection()

        return jsonify({
            "ok": True,
            "mensagem": "API Key salva com sucesso.",
            "teste": test,
            "key_preview": f"{'*' * (len(key) - 4)}{key[-4:]}" if len(key) > 4 else "****",
        })
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# TEST — apenas admin
# ─────────────────────────────────────────────────────────────────────────────

@ai_config_bp.route("/test", methods=["POST"])
@jwt_required()
def test_connection():
    deny = _require_admin()
    if deny:
        return deny
    try:
        from ai_service import ai
        result = ai.test_connection()
        return jsonify(result)
    except Exception as e:
        return jsonify({"ok": False, "message": str(e), "latency_ms": 0}), 200


# ─────────────────────────────────────────────────────────────────────────────
# MODELOS — todos logados
# ─────────────────────────────────────────────────────────────────────────────

@ai_config_bp.route("/modelos", methods=["GET"])
@jwt_required()
def list_modelos():
    from ai_service import MODELOS_DISPONIVEIS
    return jsonify(MODELOS_DISPONIVEIS)


# ─────────────────────────────────────────────────────────────────────────────
# CHAT — todos os módulos convergem aqui
# ─────────────────────────────────────────────────────────────────────────────

@ai_config_bp.route("/chat", methods=["POST"])
@jwt_required()
def chat():
    """
    Endpoint unificado do Mirante.
    Body:
      mensagem    str  — pergunta do usuário
      contexto    str  — módulo de origem (mirante_chat, leads, financeiro, etc.)
      sistema     str  — instrução de sistema (opcional)
      modelo      str  — override do modelo (opcional)
      max_tokens  int  — máximo de tokens (opcional, default 1024)
      historico   list — mensagens anteriores [{role, content}] (opcional)
    """
    try:
        from ai_service import ai
        data = request.get_json() or {}
        user_id = int(get_jwt_identity())

        mensagem = data.get("mensagem", "").strip()
        if not mensagem:
            return jsonify({"erro": "Mensagem não pode ser vazia."}), 400

        contexto = data.get("contexto", "mirante_chat")
        historico = data.get("historico", [])
        max_tokens = min(int(data.get("max_tokens", 1024)), 4096)
        modelo_override = data.get("modelo")

        # Monta system prompt contextualizado
        sistema_base = data.get("sistema", "")
        if not sistema_base:
            sistema_base = _build_system_prompt(contexto, user_id)

        # Monta lista de mensagens
        messages = []
        for h in historico[-10:]:  # máximo 10 turnos de histórico
            if h.get("role") in ("user", "assistant") and h.get("content"):
                messages.append({"role": h["role"], "content": str(h["content"])})
        messages.append({"role": "user", "content": mensagem})

        result = ai.chat(
            messages=messages,
            system=sistema_base,
            model=modelo_override,
            max_tokens=max_tokens,
            user_id=user_id,
            modulo=contexto,
        )

        if result.get("error") == "permission_denied":
            return jsonify({"erro": result["content"]}), 403

        return jsonify({
            "resposta": result.get("content", ""),
            "modelo": result.get("model", ""),
            "provider": result.get("provider", ""),
            "tokens": {
                "prompt": result.get("prompt_tokens", 0),
                "completion": result.get("completion_tokens", 0),
            },
            "assistente": "IA Mirante",
        })

    except Exception as e:
        logger.error(f"ai chat error: {e}")
        return jsonify({"erro": str(e)}), 500


def _build_system_prompt(contexto: str, user_id: int) -> str:
    """Monta system prompt adaptado ao módulo de origem."""
    try:
        from database_real import User
        u = User.query.get(user_id)
        nome = u.name if u else "Colaborador"
        setor = u.role if u else "geral"
    except Exception:
        nome = "Colaborador"
        setor = "geral"

    base = (
        "Você é a IA Mirante, assistente executiva da Legacy Moving — empresa premium de mudanças, "
        "logística e guarda-móveis no Brasil. "
        "Seja objetiva, profissional, útil e estratégica. "
        "Quando não souber, diga claramente. Nunca invente dados. "
        f"Você está conversando com {nome} (setor: {setor}). "
    )

    prompts_contexto = {
        "mirante_chat": base + "Responda perguntas gerais sobre o sistema, operações e estratégia da empresa.",
        "leads": base + "Foque em conversão de leads, follow-up comercial e estratégias de venda no setor de mudanças.",
        "financeiro": base + "Foque em análise financeira, fluxo de caixa, margens e saúde financeira da empresa.",
        "estoque": base + "Foque em gestão de estoque, reposição, consumo por OS e alertas de criticidade.",
        "operacional": base + "Foque em eficiência operacional, roteirização, equipes e qualidade de serviço.",
        "avarias": base + "Foque em análise e resolução de avarias, padrões de incidentes e melhorias preventivas.",
        "metas": base + "Foque em análise de metas, desempenho por vendedor/organizer e gamificação.",
        "painel_executivo": base + "Foque em visão macro da empresa: KPIs, tendências, riscos e oportunidades estratégicas.",
        "manual": base + (
            "Você é o manual interativo do sistema Legacy Moving ERP. "
            "Explique como usar o sistema, fluxos de trabalho, e como realizar tarefas específicas. "
            "Seja didático e claro."
        ),
    }
    return prompts_contexto.get(contexto, base)


# ─────────────────────────────────────────────────────────────────────────────
# USAGE — apenas admin
# ─────────────────────────────────────────────────────────────────────────────

@ai_config_bp.route("/usage", methods=["GET"])
@jwt_required()
def usage_stats():
    deny = _require_admin()
    if deny:
        return deny
    try:
        from ai_service import ai
        days = int(request.args.get("days", 30))
        return jsonify(ai.usage_stats(days=days))
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@ai_config_bp.route("/logs", methods=["GET"])
@jwt_required()
def usage_logs():
    deny = _require_admin()
    if deny:
        return deny
    try:
        from ai_service import ai
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))
        return jsonify(ai.usage_logs(page=page, per_page=per_page))
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# PERMISSÕES — apenas admin
# ─────────────────────────────────────────────────────────────────────────────

@ai_config_bp.route("/permissions", methods=["GET"])
@jwt_required()
def get_permissions():
    deny = _require_admin()
    if deny:
        return deny
    try:
        from ai_service import ai
        return jsonify(ai.get_permissions())
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@ai_config_bp.route("/permissions", methods=["PUT"])
@jwt_required()
def set_permissions():
    deny = _require_admin()
    if deny:
        return deny
    try:
        from ai_service import ai
        data = request.get_json() or {}
        ai.set_permissions(data)
        return jsonify({"ok": True, "mensagem": "Permissões atualizadas."})
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# TOGGLE — apenas admin
# ─────────────────────────────────────────────────────────────────────────────

@ai_config_bp.route("/toggle", methods=["PUT"])
@jwt_required()
def toggle_ia():
    deny = _require_admin()
    if deny:
        return deny
    try:
        from ai_service import ai
        data = request.get_json() or {}
        ativo = bool(data.get("ativo", True))
        ai.update_config({"ativo": ativo})
        return jsonify({
            "ok": True,
            "ativo": ativo,
            "mensagem": f"IA Mirante {'ativada' if ativo else 'desativada'}.",
        })
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
