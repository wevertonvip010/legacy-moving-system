import React, { useState, useRef, useEffect } from 'react';
import { Search, X, User, Users, FileText, Truck, Receipt, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const ICON_MAP = {
  cliente:   { icon: Users,    color: '#7c3aed', label: 'Cliente' },
  lead:      { icon: User,     color: '#2563eb', label: 'Lead' },
  os:        { icon: Truck,    color: '#f97316', label: 'OS' },
  orcamento: { icon: FileText, color: '#0891b2', label: 'Orçamento' },
  recibo:    { icon: Receipt,  color: '#16a34a', label: 'Recibo' },
  box:       { icon: Archive,  color: '#d97706', label: 'Box' },
};

const ROTAS = {
  cliente:   '/clientes',
  lead:      '/leads',
  os:        '/ordens-servico',
  orcamento: '/orcamentos',
  recibo:    '/recibos',
  box:       '/guarda-moveis',
};

export default function BuscaGlobal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  let debounceTimer = useRef(null);

  // Atalho de teclado Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!open) { setQuery(''); setResults([]); }
    else setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const buscar = (q) => {
    setQuery(q);
    clearTimeout(debounceTimer.current);
    if (q.trim().length < 2) { setResults([]); return; }
    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        // Busca paralela em todas as entidades
        const [clientes, leads, os, orcamentos] = await Promise.allSettled([
          api.getClientes({ busca: q, limit: 5 }),
          api.getLeads({ busca: q, limit: 5 }),
          api.getOS({ busca: q, limit: 5 }),
          api.getOrcamentos ? api.getOrcamentos({ busca: q, limit: 5 }) : Promise.resolve([]),
        ]);
        const all = [];
        const push = (arr, tipo) => {
          const list = Array.isArray(arr) ? arr : (arr?.items || []);
          list.forEach(item => all.push({ ...item, _tipo: tipo }));
        };
        if (clientes.status === 'fulfilled') push(clientes.value, 'cliente');
        if (leads.status === 'fulfilled') push(leads.value, 'lead');
        if (os.status === 'fulfilled') push(os.value, 'os');
        if (orcamentos.status === 'fulfilled') push(orcamentos.value, 'orcamento');
        setResults(all.slice(0, 12));
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  };

  const selecionar = (item) => {
    navigate(ROTAS[item._tipo] || '/');
    setOpen(false);
  };

  const getLabel = (item) => {
    return item.nome || item.cliente || item.numero || item.titulo || `ID ${item.id}`;
  };
  const getSub = (item) => {
    if (item._tipo === 'cliente') return item.email || item.telefone || '';
    if (item._tipo === 'lead') return item.telefone || item.email || '';
    if (item._tipo === 'os') return item.data_mudanca ? new Date(item.data_mudanca).toLocaleDateString('pt-BR') : '';
    return '';
  };

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      title="Busca Global (Ctrl+K)"
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        margin: '8px 12px', padding: '8px 12px',
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
        fontSize: '12px', width: 'calc(100% - 24px)', textAlign: 'left',
      }}
    >
      <Search size={13} />
      <span style={{ flex: 1 }}>Buscar... </span>
      <span style={{ fontSize: '10px', opacity: 0.5 }}>Ctrl+K</span>
    </button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '80px' }}
      onClick={() => setOpen(false)}>
      <div style={{ background: 'white', borderRadius: '16px', width: '560px', maxWidth: '95vw', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f3f4f6', gap: '12px' }}>
          <Search size={18} color="#9ca3af" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => buscar(e.target.value)}
            placeholder="Buscar cliente, lead, OS, orçamento... (nome, CPF, telefone, email)"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '15px', color: '#111827' }}
          />
          {loading && <div style={{ width: '16px', height: '16px', border: '2px solid #e5e7eb', borderTop: '2px solid #2563eb', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />}
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}><X size={16} /></button>
        </div>

        {/* Resultados */}
        {results.length > 0 ? (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {results.map((item, i) => {
              const cfg = ICON_MAP[item._tipo] || ICON_MAP.cliente;
              const Icon = cfg.icon;
              return (
                <button key={i} onClick={() => selecionar(item)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f9fafb' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: cfg.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color={cfg.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getLabel(item)}</div>
                    {getSub(item) && <div style={{ fontSize: '12px', color: '#9ca3af' }}>{getSub(item)}</div>}
                  </div>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: cfg.color + '15', color: cfg.color, fontWeight: '600', flexShrink: 0 }}>
                    {cfg.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : query.length >= 2 && !loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
            Nenhum resultado para "{query}"
          </div>
        ) : query.length < 2 ? (
          <div style={{ padding: '20px 24px' }}>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Busca rápida</p>
            {['Cliente Maria', 'OS-2026-001', 'Kennedy'].map(s => (
              <button key={s} onClick={() => buscar(s)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: '#f9fafb', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#374151', marginBottom: '6px' }}>
                🔍 {s}
              </button>
            ))}
          </div>
        ) : null}

        <div style={{ padding: '10px 20px', background: '#f9fafb', display: 'flex', gap: '16px', fontSize: '11px', color: '#9ca3af' }}>
          <span>↵ Navegar</span>
          <span>Esc Fechar</span>
          <span>Ctrl+K Abrir</span>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
