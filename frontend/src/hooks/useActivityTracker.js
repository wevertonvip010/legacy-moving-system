import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../lib/api';

// Gera um session_id único por aba/sessão do browser
function getSessionId() {
  let sid = sessionStorage.getItem('legacy_session_id');
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('legacy_session_id', sid);
  }
  return sid;
}

/**
 * Hook que rastreia a atividade do usuário no sistema.
 * - Envia um 'pageview' a cada mudança de rota
 * - Envia um 'heartbeat' a cada 2 minutos (enquanto a aba estiver ativa)
 * Deve ser chamado UMA vez no Layout ou componente raiz autenticado.
 */
export function useActivityTracker() {
  const location = useLocation();
  const sessionId = useRef(getSessionId());
  const timerRef = useRef(null);

  const enviar = (action, page) => {
    api.registrarAtividade({
      action,
      page,
      session_id: sessionId.current,
    }).catch(() => {}); // silencioso — não quebrar se backend falhar
  };

  // Pageview a cada mudança de rota
  useEffect(() => {
    enviar('pageview', location.pathname);
  }, [location.pathname]); // eslint-disable-line

  // Heartbeat a cada 2 minutos
  useEffect(() => {
    const tick = () => enviar('heartbeat', location.pathname);
    timerRef.current = setInterval(tick, 2 * 60 * 1000);
    return () => clearInterval(timerRef.current);
  }, [location.pathname]); // eslint-disable-line
}
