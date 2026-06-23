import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, Package, Users, DollarSign, Truck, Target, X, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';

const ICON_MAP = {
  estoque:   { icon: Package,       color: '#ea580c', bg: '#fff7ed' },
  avaria:    { icon: AlertTriangle,  color: '#dc2626', bg: '#fef2f2' },
  lead:      { icon: Users,         color: '#2563eb', bg: '#eff6ff' },
  financeiro:{ icon: DollarSign,    color: '#16a34a', bg: '#f0fdf4' },
  os:        { icon: Truck,         color: '#7c3aed', bg: '#f5f3ff' },
  meta:      { icon: Target,        color: '#d97706', bg: '#fffbeb' },
  sistema:   { icon: CheckCircle,   color: '#6b7280', bg: '#f9fafb' },
};

const tempoAtras = (iso) => {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff/60)}min`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h`;
  return `${Math.floor(diff/86400)}d`;
};

const LINK_MAP = {
  lead: '/leads', estoque: '/estoque', avaria: '/avarias',
  financeiro: '/orcamentos', os: '/ordens-servico', meta: '/metas',
};

const Notificacoes = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef();
  const btnRef = useRef();
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });

  // Calcula posição do dropdown baseado no botão
  useLayoutEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({
        top: rect.bottom + 8,
        left: Math.min(rect.left, window.innerWidth - 400),
      });
    }
  }, [open]);

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target) &&
          btnRef.current && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const gerarNotificacoes = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, avRes, estoque, leadsRes, osRes] = await Promise.allSettled([
        api.dashboard(),
        api.getResumoAvarias(),
        api.getEstoque(),
        api.getLeads(),
        api.getOrdens(),
      ]);

      const items = [];
      const now = new Date().toISOString();
      const hoje = new Date();

      // ── Dashboard KPIs ─────────────────────────────────
      if (dash.status === 'fulfilled') {
        const d = dash.value;
        if (d.leads_novos > 0) {
          items.push({ tipo: 'lead', msg: `${d.leads_novos} lead${d.leads_novos > 1 ? 's' : ''} novo${d.leads_novos > 1 ? 's' : ''} aguardando contato`, ts: now, prioridade: 2, link: '/leads' });
        }
        if (d.orcamentos_abertos > 0) {
          items.push({ tipo: 'financeiro', msg: `${d.orcamentos_abertos} orçamento${d.orcamentos_abertos > 1 ? 's' : ''} pendente${d.orcamentos_abertos > 1 ? 's' : ''} de aprovação`, ts: now, prioridade: 1, link: '/orcamentos' });
        }
      }

      // ── Avarias abertas ─────────────────────────────────
      if (avRes.status === 'fulfilled') {
        const av = avRes.value;
        if ((av.abertas || 0) > 0) {
          items.push({ tipo: 'avaria', msg: `${av.abertas} avaria${av.abertas > 1 ? 's' : ''} aberta${av.abertas > 1 ? 's' : ''} requer${av.abertas > 1 ? 'em' : ''} atenção`, ts: now, prioridade: 3, link: '/avarias' });
        }
      }

      // ── Estoque crítico ─────────────────────────────────
      if (estoque.status === 'fulfilled') {
        const est = estoque.value;
        const criticos = est.alertas_criticos?.length || 0;
        const baixos = est.alertas_baixo?.length || 0;
        if (criticos > 0) {
          items.push({ tipo: 'estoque', msg: `${criticos} item${criticos > 1 ? 'ns' : ''} em estoque CRÍTICO!`, ts: now, prioridade: 4, link: '/estoque' });
        }
        if (baixos > 0) {
          items.push({ tipo: 'estoque', msg: `${baixos} item${baixos > 1 ? 'ns' : ''} abaixo do estoque mínimo`, ts: now, prioridade: 2, link: '/estoque' });
        }
      }

      // ── Leads parados há +7 dias ────────────────────────
      if (leadsRes.status === 'fulfilled') {
        const leads = Array.isArray(leadsRes.value) ? leadsRes.value : (leadsRes.value?.items || []);
        const parados = leads.filter(l => {
          if (!['novo', 'classificado'].includes(l.status)) return false;
          if (!l.created_at && !l.data_criacao) return false;
          const criado = new Date(l.created_at || l.data_criacao);
          return (hoje - criado) / 86400000 >= 7;
        });
        if (parados.length > 0) {
          items.push({ tipo: 'lead', msg: `${parados.length} lead${parados.length > 1 ? 's' : ''} parado${parados.length > 1 ? 's' : ''} há mais de 7 dias`, ts: now, prioridade: 3, link: '/leads' });
        }
      }

      // ── OS nos próximos 2 dias ───────────────────────────
      if (osRes.status === 'fulfilled') {
        const ordens = Array.isArray(osRes.value) ? osRes.value : (osRes.value?.items || []);
        const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 2);
        const proximas = ordens.filter(o => {
          if (!o.data_mudanca) return false;
          const d = new Date(o.data_mudanca);
          return d >= hoje && d <= amanha && o.status === 'em_andamento';
        });
        if (proximas.length > 0) {
          items.push({ tipo: 'os', msg: `${proximas.length} OS em andamento nos próximos 2 dias`, ts: now, prioridade: 2, link: '/ordens-servico' });
        }
      }

      items.sort((a, b) => b.prioridade - a.prioridade);
      setNotifs(items);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  // Carrega ao abrir
  useEffect(() => {
    if (open) gerarNotificacoes();
  }, [open, gerarNotificacoes]);

  // Refresh periódico (5 min)
  useEffect(() => {
    gerarNotificacoes();
    const interval = setInterval(gerarNotificacoes, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [gerarNotificacoes]);

  const unread = notifs.length;

  return (
    <>
      {/* Botão sino */}
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative', padding: '8px', background: open ? 'rgba(255,255,255,0.15)' : 'transparent',
          border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px',
            width: '16px', height: '16px', borderRadius: '50%',
            background: '#ef4444', color: 'white',
            fontSize: '9px', fontWeight: '800',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #0D1B2A',
            animation: 'notifPulse 2s ease-in-out infinite',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown — posição fixa para não ser cortado pela sidebar */}
      {open && (
        <div ref={ref} style={{
          position: 'fixed',
          top: `${dropPos.top}px`,
          left: `${Math.max(8, dropPos.left)}px`,
          width: '380px', maxHeight: '480px',
          background: 'white', borderRadius: '14px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb', overflow: 'hidden',
          animation: 'notifSlide 0.2s ease',
          zIndex: 9998,
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 18px', borderBottom: '1px solid #f3f4f6',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={15} color="#0D1B2A" />
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a1a' }}>Notificações</span>
              {unread > 0 && (
                <span style={{ fontSize: '11px', background: '#ef4444', color: 'white', padding: '1px 7px', borderRadius: '20px', fontWeight: '700' }}>
                  {unread}
                </span>
              )}
            </div>
            <button onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px' }}>
              <X size={16} />
            </button>
          </div>

          {/* Lista */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {loading && notifs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                Verificando alertas...
              </div>
            ) : notifs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <CheckCircle size={32} color="#d1d5db" style={{ margin: '0 auto 8px' }} />
                <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>Tudo em dia!</p>
                <p style={{ color: '#d1d5db', fontSize: '12px', margin: '4px 0 0' }}>Nenhum alerta no momento</p>
              </div>
            ) : (
              notifs.map((n, i) => {
                const cfg = ICON_MAP[n.tipo] || ICON_MAP.sistema;
                const Icon = cfg.icon;
                return (
                  <div key={i} style={{
                    padding: '12px 18px', borderBottom: '1px solid #f9fafb',
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                    cursor: n.link ? 'pointer' : 'default', transition: 'background 0.1s',
                  }}
                    onClick={() => { if (n.link) { navigate(n.link); setOpen(false); } }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={15} color={cfg.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '13px', color: '#1a1a1a', lineHeight: '1.4' }}>{n.msg}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#9ca3af' }}>{tempoAtras(n.ts)}</p>
                    </div>
                    {n.prioridade >= 3 && (
                      <span style={{
                        fontSize: '9px', padding: '2px 6px', borderRadius: '20px',
                        background: '#fef2f2', color: '#dc2626', fontWeight: '700',
                        flexShrink: 0, alignSelf: 'center',
                      }}>
                        URGENTE
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 18px', borderTop: '1px solid #f3f4f6', background: '#f9fafb' }}>
            <button onClick={gerarNotificacoes} disabled={loading}
              style={{ width: '100%', padding: '6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#2563eb', fontWeight: '600' }}>
              {loading ? 'Atualizando...' : '↻ Atualizar alertas'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes notifPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes notifSlide {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default Notificacoes;
