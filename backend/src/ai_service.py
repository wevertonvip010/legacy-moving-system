"""
ai_service.py — Camada de abstração de Inteligência Artificial
Legacy Moving ERP

Arquitetura multi-provedor:
  - Anthropic (provedor principal)
  - OpenAI (stub preparado)
  - Google Gemini (stub preparado)
  - Modelos locais (stub preparado)

Segurança:
  - API Key NUNCA retornada ao frontend
  - NUNCA registrada em logs
  - Lida de variável de ambiente ou ConfigSistema (criptografada)
"""

from __future__ import annotations

import os
import json
import logging
import base64
import hashlib
import hmac
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

# ── Tabela de preços por modelo (USD por 1M tokens) ─────────────────────────
PRICING = {
    # Anthropic
    "claude-opus-4-8":              {"input": 15.00, "output": 75.00},
    "claude-sonnet-4-6":            {"input":  3.00, "output": 15.00},
    "claude-haiku-4-5-20251001":    {"input":  0.80, "output":  4.00},
    "claude-3-5-sonnet-20241022":   {"input":  3.00, "output": 15.00},
    "claude-3-5-haiku-20241022":    {"input":  0.80, "output":  4.00},
    "claude-3-opus-20240229":       {"input": 15.00, "output": 75.00},
    # OpenAI (stubs)
    "gpt-4o":                       {"input":  5.00, "output": 15.00},
    "gpt-4o-mini":                  {"input":  0.15, "output":  0.60},
    # Gemini (stubs)
    "gemini-1.5-pro":               {"input":  3.50, "output": 10.50},
    "gemini-1.5-flash":             {"input":  0.075,"output":  0.30},
}

MODELOS_DISPONIVEIS = {
    "anthropic": [
        {"id": "claude-sonnet-4-6",          "label": "Claude Sonnet 4 (recomendado)", "contexto": "200k"},
        {"id": "claude-haiku-4-5-20251001",   "label": "Claude Haiku 4 (rápido/econômico)", "contexto": "200k"},
        {"id": "claude-opus-4-8",             "label": "Claude Opus 4 (máxima capacidade)", "contexto": "200k"},
        {"id": "claude-3-5-sonnet-20241022",  "label": "Claude 3.5 Sonnet", "contexto": "200k"},
        {"id": "claude-3-5-haiku-20241022",   "label": "Claude 3.5 Haiku", "contexto": "200k"},
    ],
    "openai": [
        {"id": "gpt-4o",      "label": "GPT-4o", "contexto": "128k"},
        {"id": "gpt-4o-mini", "label": "GPT-4o Mini", "contexto": "128k"},
    ],
    "google": [
        {"id": "gemini-1.5-pro",   "label": "Gemini 1.5 Pro", "contexto": "1M"},
        {"id": "gemini-1.5-flash", "label": "Gemini 1.5 Flash", "contexto": "1M"},
    ],
}

# ── Criptografia simples para armazenar a key no BD ─────────────────────────
def _encrypt_key(plaintext: str, secret: str) -> str:
    """XOR + base64 usando HMAC do secret como pad."""
    pad = hmac.new(secret.encode(), b"ai-key-v1", hashlib.sha256).digest()
    # Repete o pad até cobrir o plaintext
    full_pad = (pad * ((len(plaintext) // len(pad)) + 1))[:len(plaintext)]
    encrypted = bytes(a ^ b for a, b in zip(plaintext.encode(), full_pad))
    return base64.b64encode(encrypted).decode()


def _decrypt_key(ciphertext: str, secret: str) -> str:
    """Reverte _encrypt_key."""
    encrypted = base64.b64decode(ciphertext.encode())
    pad = hmac.new(secret.encode(), b"ai-key-v1", hashlib.sha256).digest()
    full_pad = (pad * ((len(encrypted) // len(pad)) + 1))[:len(encrypted)]
    return bytes(a ^ b for a, b in zip(encrypted, full_pad)).decode()


def _app_secret() -> str:
    return os.environ.get("JWT_SECRET_KEY", "legacy-moving-default-secret")


# ── Estimativa de custo ──────────────────────────────────────────────────────
def estimar_custo(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Retorna custo estimado em USD."""
    p = PRICING.get(model, {"input": 3.0, "output": 15.0})
    return (prompt_tokens * p["input"] + completion_tokens * p["output"]) / 1_000_000


# ══════════════════════════════════════════════════════════════════════════════
# Providers abstratos
# ══════════════════════════════════════════════════════════════════════════════

class AIProvider(ABC):
    """Interface base para todos os provedores de IA."""

    @abstractmethod
    def chat(
        self,
        messages: List[Dict[str, str]],
        model: str,
        max_tokens: int = 1024,
        system: str = "",
        temperature: float = 0.7,
    ) -> Dict[str, Any]:
        """Retorna dict com: content, prompt_tokens, completion_tokens, model"""
        ...

    @abstractmethod
    def test_connection(self) -> Dict[str, Any]:
        """Testa conectividade. Retorna: ok, message, latency_ms"""
        ...

    @abstractmethod
    def is_available(self) -> bool:
        ...


# ── Anthropic Provider ───────────────────────────────────────────────────────

class AnthropicProvider(AIProvider):
    def __init__(self, api_key: str):
        self._key = api_key
        self._client = None

    def _get_client(self):
        if self._client is None:
            try:
                import anthropic
                self._client = anthropic.Anthropic(api_key=self._key)
            except ImportError:
                raise RuntimeError("Pacote 'anthropic' não instalado. Execute: pip install anthropic")
        return self._client

    def is_available(self) -> bool:
        return bool(self._key)

    def chat(self, messages, model="claude-sonnet-4-6", max_tokens=1024,
             system="", temperature=0.7) -> Dict[str, Any]:
        import time
        t0 = time.time()
        client = self._get_client()

        kwargs: Dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": messages,
        }
        if system:
            kwargs["system"] = system

        resp = client.messages.create(**kwargs)
        latency = int((time.time() - t0) * 1000)

        content = resp.content[0].text if resp.content else ""
        return {
            "content": content,
            "prompt_tokens": resp.usage.input_tokens,
            "completion_tokens": resp.usage.output_tokens,
            "model": resp.model,
            "latency_ms": latency,
            "stop_reason": resp.stop_reason,
        }

    def test_connection(self) -> Dict[str, Any]:
        import time
        t0 = time.time()
        try:
            result = self.chat(
                messages=[{"role": "user", "content": "Responda apenas: OK"}],
                model="claude-haiku-4-5-20251001",
                max_tokens=10,
                system="Você é um assistente de teste.",
            )
            return {
                "ok": True,
                "message": "Conexão estabelecida com sucesso.",
                "latency_ms": result["latency_ms"],
                "model_usado": result["model"],
            }
        except Exception as e:
            return {
                "ok": False,
                "message": str(e),
                "latency_ms": int((time.time() - t0) * 1000),
            }


# ── OpenAI Provider (stub) ───────────────────────────────────────────────────

class OpenAIProvider(AIProvider):
    def __init__(self, api_key: str):
        self._key = api_key

    def is_available(self) -> bool:
        return bool(self._key)

    def chat(self, messages, model="gpt-4o", max_tokens=1024,
             system="", temperature=0.7) -> Dict[str, Any]:
        try:
            import openai
            client = openai.OpenAI(api_key=self._key)
            msgs = []
            if system:
                msgs.append({"role": "system", "content": system})
            msgs.extend(messages)
            resp = client.chat.completions.create(
                model=model, messages=msgs, max_tokens=max_tokens, temperature=temperature
            )
            return {
                "content": resp.choices[0].message.content,
                "prompt_tokens": resp.usage.prompt_tokens,
                "completion_tokens": resp.usage.completion_tokens,
                "model": model,
                "latency_ms": 0,
                "stop_reason": resp.choices[0].finish_reason,
            }
        except Exception as e:
            raise RuntimeError(f"OpenAI error: {e}")

    def test_connection(self) -> Dict[str, Any]:
        try:
            r = self.chat([{"role": "user", "content": "OK"}], model="gpt-4o-mini", max_tokens=5)
            return {"ok": True, "message": "Conexão OpenAI OK.", "latency_ms": r.get("latency_ms", 0)}
        except Exception as e:
            return {"ok": False, "message": str(e), "latency_ms": 0}


# ── Google Gemini Provider (stub) ────────────────────────────────────────────

class GeminiProvider(AIProvider):
    def __init__(self, api_key: str):
        self._key = api_key

    def is_available(self) -> bool:
        return bool(self._key)

    def chat(self, messages, model="gemini-1.5-flash", max_tokens=1024,
             system="", temperature=0.7) -> Dict[str, Any]:
        raise NotImplementedError("Integração Gemini ainda não implementada nesta versão.")

    def test_connection(self) -> Dict[str, Any]:
        return {"ok": False, "message": "Provedor Gemini não implementado ainda.", "latency_ms": 0}


# ── Local Provider (stub) ────────────────────────────────────────────────────

class LocalProvider(AIProvider):
    def __init__(self, endpoint: str):
        self._endpoint = endpoint

    def is_available(self) -> bool:
        return bool(self._endpoint)

    def chat(self, messages, model="local", max_tokens=1024,
             system="", temperature=0.7) -> Dict[str, Any]:
        raise NotImplementedError("Integração com modelo local não implementada nesta versão.")

    def test_connection(self) -> Dict[str, Any]:
        return {"ok": False, "message": "Provedor local não implementado ainda.", "latency_ms": 0}


# ══════════════════════════════════════════════════════════════════════════════
# AIService — singleton central
# ══════════════════════════════════════════════════════════════════════════════

class AIService:
    """
    Serviço central de IA do ERP Legacy Moving.

    Ordem de leitura da API Key:
      1. Variável de ambiente ANTHROPIC_API_KEY (prioridade máxima)
      2. ConfigSistema.chave == 'ai_api_key_{provider}' (armazenada criptografada)
    """

    _instance: Optional["AIService"] = None

    def __init__(self):
        self._config_cache: Dict[str, Any] = {}
        self._provider_cache: Optional[AIProvider] = None

    @classmethod
    def get(cls) -> "AIService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ── Config persistida no BD ──────────────────────────────────────────────

    def _load_config(self) -> Dict[str, Any]:
        """Lê config da tabela ConfigSistema."""
        try:
            from database_real import ConfigSistema
            row = ConfigSistema.query.filter_by(chave="ai_config").first()
            if row and row.valor:
                return json.loads(row.valor)
        except Exception:
            pass
        return {}

    def _save_config(self, cfg: Dict[str, Any]):
        """Persiste config na tabela ConfigSistema (sem a API key em texto claro)."""
        try:
            from database_real import ConfigSistema, db
            row = ConfigSistema.query.filter_by(chave="ai_config").first()
            if not row:
                row = ConfigSistema(chave="ai_config")
                db.session.add(row)
            row.valor = json.dumps(cfg)
            db.session.commit()
            self._config_cache = cfg
            self._provider_cache = None  # invalidar cache do provider
        except Exception as e:
            logger.error(f"ai_service: erro ao salvar config: {e}")

    def get_config(self) -> Dict[str, Any]:
        """Retorna config pública (NUNCA inclui a API key em texto claro)."""
        cfg = self._load_config()
        # Nunca expor a key
        cfg.pop("_api_key_enc", None)
        # Indica se key está configurada
        cfg["api_key_configurada"] = self._resolve_api_key(cfg.get("provider", "anthropic")) is not None
        return cfg

    # ── Resolução da API Key ─────────────────────────────────────────────────

    def _resolve_api_key(self, provider: str) -> Optional[str]:
        """
        Resolve API Key sem expô-la ao chamador externo.
        Prioridade: env var > ConfigSistema (criptografada)
        """
        env_map = {
            "anthropic": "ANTHROPIC_API_KEY",
            "openai":    "OPENAI_API_KEY",
            "google":    "GOOGLE_AI_API_KEY",
        }
        # 1. Env var
        env_key = env_map.get(provider)
        if env_key:
            val = os.environ.get(env_key, "").strip()
            if val:
                return val

        # 2. BD (criptografada)
        try:
            cfg = self._load_config()
            enc = cfg.get("_api_key_enc")
            if enc and cfg.get("_api_key_provider") == provider:
                return _decrypt_key(enc, _app_secret())
        except Exception:
            pass

        return None

    # ── Salvar API Key (só backend, nunca retorna ao frontend) ───────────────

    def set_api_key(self, provider: str, key: str, extra_config: Dict = None):
        """
        Armazena API key de forma segura + config geral.
        A key é criptografada antes de persistir.
        """
        cfg = self._load_config()
        cfg["provider"] = provider
        cfg["_api_key_enc"] = _encrypt_key(key, _app_secret())
        cfg["_api_key_provider"] = provider

        # Atualiza também a env var em memória (para esta sessão)
        env_map = {
            "anthropic": "ANTHROPIC_API_KEY",
            "openai":    "OPENAI_API_KEY",
            "google":    "GOOGLE_AI_API_KEY",
        }
        if provider in env_map:
            os.environ[env_map[provider]] = key

        if extra_config:
            for k, v in extra_config.items():
                if not k.startswith("_"):
                    cfg[k] = v

        self._save_config(cfg)

    def update_config(self, updates: Dict):
        """Atualiza campos de config sem alterar a API key."""
        cfg = self._load_config()
        for k, v in updates.items():
            if not k.startswith("_") and k not in ("api_key", "key"):
                cfg[k] = v
        self._save_config(cfg)

    # ── Obter provider ativo ─────────────────────────────────────────────────

    def _get_provider(self) -> AIProvider:
        cfg = self._load_config()
        provider_name = cfg.get("provider", "anthropic")
        key = self._resolve_api_key(provider_name)

        if provider_name == "anthropic":
            return AnthropicProvider(key or "")
        elif provider_name == "openai":
            return OpenAIProvider(key or "")
        elif provider_name == "google":
            return GeminiProvider(key or "")
        else:
            return AnthropicProvider(key or "")

    # ── Chat principal ───────────────────────────────────────────────────────

    def chat(
        self,
        messages: List[Dict[str, str]],
        system: str = "",
        model: str = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
        user_id: int = None,
        modulo: str = "mirante_chat",
    ) -> Dict[str, Any]:
        """
        Ponto central para todas as chamadas de IA do sistema.
        Loga uso automaticamente.
        """
        cfg = self._load_config()
        provider_name = cfg.get("provider", "anthropic")
        model = model or cfg.get("modelo_padrao", "claude-sonnet-4-6")

        # Verificar permissão do usuário
        if user_id and not self._check_permission(user_id, modulo):
            return {
                "content": "Acesso à IA não autorizado para seu perfil.",
                "error": "permission_denied",
                "prompt_tokens": 0,
                "completion_tokens": 0,
            }

        provider = self._get_provider()
        if not provider.is_available():
            return {
                "content": "IA Mirante está offline. Configure a API Key em Configurações > Inteligência Artificial.",
                "error": "no_api_key",
                "prompt_tokens": 0,
                "completion_tokens": 0,
            }

        # Verificar se IA está ativa
        if not cfg.get("ativo", True):
            return {
                "content": "IA Mirante está desativada pelo administrador.",
                "error": "ia_desativada",
                "prompt_tokens": 0,
                "completion_tokens": 0,
            }

        try:
            result = provider.chat(
                messages=messages,
                model=model,
                max_tokens=max_tokens,
                system=system,
                temperature=temperature,
            )
            result["provider"] = provider_name

            # Log de uso
            self._log_usage(
                user_id=user_id,
                provider=provider_name,
                model=model,
                modulo=modulo,
                prompt_tokens=result.get("prompt_tokens", 0),
                completion_tokens=result.get("completion_tokens", 0),
                custo=estimar_custo(model, result.get("prompt_tokens", 0), result.get("completion_tokens", 0)),
                success=True,
            )
            return result

        except Exception as e:
            logger.error(f"ai_service.chat error: {e}")
            self._log_usage(
                user_id=user_id, provider=provider_name, model=model,
                modulo=modulo, prompt_tokens=0, completion_tokens=0,
                custo=0.0, success=False, error_msg=str(e)[:500],
            )
            return {
                "content": f"Erro ao consultar IA: {str(e)}",
                "error": str(e),
                "prompt_tokens": 0,
                "completion_tokens": 0,
            }

    # ── Teste de conexão ─────────────────────────────────────────────────────

    def test_connection(self) -> Dict[str, Any]:
        provider = self._get_provider()
        if not provider.is_available():
            return {"ok": False, "message": "API Key não configurada.", "latency_ms": 0}
        return provider.test_connection()

    # ── Logging de uso ───────────────────────────────────────────────────────

    def _log_usage(self, user_id, provider, model, modulo,
                   prompt_tokens, completion_tokens, custo, success, error_msg=None):
        try:
            from database_real import db
            from database_real import AIUsageLog
            log = AIUsageLog(
                user_id=user_id,
                provider=provider,
                model=model,
                modulo=modulo,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=prompt_tokens + completion_tokens,
                custo_usd=custo,
                success=success,
                error_msg=error_msg,
                timestamp=datetime.utcnow(),
            )
            db.session.add(log)
            db.session.commit()
        except Exception as e:
            logger.warning(f"ai_service: falha ao logar uso: {e}")

    # ── Estatísticas de uso ──────────────────────────────────────────────────

    def usage_stats(self, days: int = 30) -> Dict[str, Any]:
        try:
            from database_real import AIUsageLog, User
            from sqlalchemy import func
            from datetime import timedelta

            since = datetime.utcnow() - timedelta(days=days)
            logs = AIUsageLog.query.filter(AIUsageLog.timestamp >= since).all()

            total_consultas = len(logs)
            total_tokens = sum(l.total_tokens or 0 for l in logs)
            custo_total = sum(l.custo_usd or 0.0 for l in logs)

            # Por usuário
            por_usuario: Dict[int, Dict] = {}
            for l in logs:
                uid = l.user_id or 0
                if uid not in por_usuario:
                    por_usuario[uid] = {"consultas": 0, "tokens": 0}
                por_usuario[uid]["consultas"] += 1
                por_usuario[uid]["tokens"] += l.total_tokens or 0

            top_usuarios = []
            for uid, d in sorted(por_usuario.items(), key=lambda x: -x[1]["consultas"])[:5]:
                u = User.query.get(uid) if uid else None
                top_usuarios.append({
                    "user_id": uid,
                    "nome": u.name if u else "Desconhecido",
                    **d,
                })

            # Por módulo
            por_modulo: Dict[str, int] = {}
            for l in logs:
                m = l.modulo or "desconhecido"
                por_modulo[m] = por_modulo.get(m, 0) + 1

            top_modulos = [
                {"modulo": k, "consultas": v}
                for k, v in sorted(por_modulo.items(), key=lambda x: -x[1])
            ]

            return {
                "periodo_dias": days,
                "total_consultas": total_consultas,
                "total_tokens": total_tokens,
                "custo_total_usd": round(custo_total, 4),
                "custo_total_brl": round(custo_total * 5.8, 2),  # aproximado
                "top_usuarios": top_usuarios,
                "top_modulos": top_modulos,
            }
        except Exception as e:
            logger.error(f"usage_stats error: {e}")
            return {"erro": str(e)}

    def usage_logs(self, page: int = 1, per_page: int = 50) -> Dict[str, Any]:
        try:
            from database_real import AIUsageLog, User
            q = AIUsageLog.query.order_by(AIUsageLog.timestamp.desc())
            total = q.count()
            logs = q.offset((page - 1) * per_page).limit(per_page).all()
            items = []
            for l in logs:
                u = User.query.get(l.user_id) if l.user_id else None
                items.append({
                    "id": l.id,
                    "timestamp": l.timestamp.isoformat() if l.timestamp else None,
                    "usuario": u.name if u else "Sistema",
                    "provider": l.provider,
                    "model": l.model,
                    "modulo": l.modulo,
                    "tokens": l.total_tokens,
                    "custo_usd": round(l.custo_usd or 0.0, 6),
                    "success": l.success,
                    "erro": l.error_msg if not l.success else None,
                })
            return {"total": total, "page": page, "per_page": per_page, "items": items}
        except Exception as e:
            return {"erro": str(e), "items": []}

    # ── Controle de permissões ───────────────────────────────────────────────

    def _check_permission(self, user_id: int, modulo: str) -> bool:
        """Verifica se o usuário tem permissão para usar a IA."""
        try:
            cfg = self._load_config()
            permissoes = cfg.get("permissoes", {})

            # Admin sempre tem acesso
            from database_real import User
            u = User.query.get(user_id)
            if not u:
                return False
            if u.role == "admin":
                return True

            # Verificar se setor está bloqueado
            setores_bloqueados = permissoes.get("setores_bloqueados", [])
            if u.role in setores_bloqueados:
                return False

            # Verificar usuário individualmente bloqueado
            usuarios_bloqueados = permissoes.get("usuarios_bloqueados", [])
            if user_id in usuarios_bloqueados:
                return False

            return True
        except Exception:
            return True  # fallback: permite

    def get_permissions(self) -> Dict:
        cfg = self._load_config()
        return cfg.get("permissoes", {
            "setores_bloqueados": [],
            "usuarios_bloqueados": [],
            "limite_tokens_usuario": None,
            "modelos_autorizados": list(PRICING.keys()),
        })

    def set_permissions(self, permissoes: Dict):
        self.update_config({"permissoes": permissoes})


# ── Singleton global ─────────────────────────────────────────────────────────
ai = AIService.get()
