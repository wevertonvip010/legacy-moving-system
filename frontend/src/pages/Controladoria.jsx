import React, { useState, useEffect, useCallback } from 'react';
import { Users, Activity, Clock, Eye, RefreshCw, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { api } from '../lib/api';

const PAGE_LABELS = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/clientes': 'Clientes',
  '/organizers': 'Organizers',
  '/orcamentos': 'Orçamentos',
  '/cadastro-complementar': 'Cadastro Complementar',
  '/contratos': 'Contratos',
  '/ordens-servico': 'Ordens de Serviço',
  '/programacao': 'Programação',
  '/estoque': 'Estoque',
  '/guarda-moveis': 'Guarda-Móveis',
  '/recibos': 'Recibos',
  '/financeiro': 'Financeiro',
  '/fechamento-operacional': 'Fechamento Operacional',
  '/fechamento-financeiro': 'Fechamento Mensal',
  '/metas': 'Painel Comercial',
  '/avarias': 'Avarias',
  '/configuracoes': 'Configurações',
  '/controladoria': 'Controladoria',
};

const ROLE_LABELS = {
  admin: 'Administrador',
  vendedor: 'Vendedor',
  operacional: 'Operacional',
  financeiro: 'Financeiro',
};

const fmtTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const fmtDatetime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) return `Hoje ${fmtTime(iso)}`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + fmtTime(iso);
};

const tempoAtras = (iso) => {
  if (!iso) return null;
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff/60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h atrás`;
  return `${Math.floor(diff/86400)}d atrás`;
};

const Controladoria = () => {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);
  const [usuarioExpandido, setUsuarioExpandido] = useState(null);

  const carregar = useCallback(async () => {
    try {
      const data = await api.getAtividadeAdmin();
      setDados(data);
      setUltimaAtualizacao(new Date());
      setErro(null);
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(carregar, 30000); // refresh a cada 30s
    return () => clearInterval(interval);
  }, [autoRefresh, carregar]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTop: '3px solid #0f1f3d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (erro) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
      <AlertCircle size={32} style={{ marginBottom: '8px' }} />
      <p>{erro}</p>
      <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
        {erro.includes('403') ? 'Acesso restrito ao Administrador.' : 'Verifique se o backend está rodando.'}
      </p>
      <button onClick={carregar} style={{ marginTop: '12px', padding: '8px 16px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
        Tentar novamente
      </button>
    </div>
  );

  const { usuarios = [], total_online = 0 } = dados || {};

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 4px' }}>Controladoria</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            Monitoramento de atividade dos usuários em tempo real
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {ultimaAtualizacao && (
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
              Atualizado às {fmtTime(ultimaAtualizacao.toISOString())}
            </span>
          )}
          <button
            onClick={() => setAutoRefresh(a => !a)}
            title={autoRefresh ? 'Desativar auto-refresh' : 'Ativar auto-refresh'}
            style={{ padding: '7px 12px', background: autoRefresh ? '#f0fdf4' : '#f9fafb', border: `1px solid ${autoRefresh ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: autoRefresh ? '#15803d' : '#6b7280', display: 'flex', alignItems: 'center', gap: '5px' }}>
            {autoRefresh ? <Wifi size={13} /> : <WifiOff size={13} />}
            {autoRefresh ? 'Live' : 'Pausado'}
          </button>
          <button onClick={carregar}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <RefreshCw size={13} /> Atualizar
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '20px' }}>
        {[
          { label: 'Online agora', value: total_online, icon: Activity, color: '#16a34a', bg: '#f0fdf4', desc: 'ativo nos últimos 5min' },
          { label: 'Total usuários', value: usuarios.length, icon: Users, color: '#2563eb', bg: '#eff6ff', desc: 'cadastrados no sistema' },
          { label: 'Ativos hoje', value: usuarios.filter(u => u.acoes_hoje > 0).length, icon: Clock, color: '#7c3aed', bg: '#f5f3ff', desc: 'com ações registradas' },
          { label: 'Inativos hoje', value: usuarios.filter(u => u.acoes_hoje === 0).length, icon: Eye, color: '#f59e0b', bg: '#fffbeb', desc: 'sem acesso hoje' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '18px', border: '0.5px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 6px', fontWeight: '500' }}>{k.label}</p>
                <p style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 2px' }}>{k.value}</p>
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>{k.desc}</p>
              </div>
              <div style={{ background: k.bg, borderRadius: '10px', padding: '10px' }}>
                <k.icon size={20} color={k.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabela de usuários */}
      <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e7eb', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#1a1a1a' }}>Status dos Usuários</h2>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
            {total_online > 0 ? `${total_online} online agora` : 'Nenhum online'}
          </span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Usuário', 'Cargo', 'Status', 'Página atual', 'Último acesso', 'Ações hoje', 'Detalhes'].map(h => (
                <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                Nenhuma atividade registrada ainda. Os dados aparecem após o primeiro acesso ao sistema.
              </td></tr>
            ) : usuarios.map(u => (
              <React.Fragment key={u.id}>
                <tr style={{ borderTop: '0.5px solid #f3f4f6' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {/* Nome */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '50%',
                        background: u.online ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #d1d5db, #9ca3af)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: '700', color: 'white', flexShrink: 0,
                        boxShadow: u.online ? '0 0 0 3px rgba(16,185,129,0.2)' : 'none',
                      }}>
                        {u.nome.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{u.nome}</span>
                    </div>
                  </td>
                  {/* Cargo */}
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#6b7280' }}>
                    {ROLE_LABELS[u.role] || u.role}
                  </td>
                  {/* Status online */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: u.online ? '#16a34a' : '#d1d5db', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', fontWeight: '500', color: u.online ? '#15803d' : '#9ca3af' }}>
                        {u.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </td>
                  {/* Página atual */}
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#374151' }}>
                    {u.pagina_atual ? (
                      <span style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '11px' }}>
                        {PAGE_LABELS[u.pagina_atual] || u.pagina_atual}
                      </span>
                    ) : '—'}
                  </td>
                  {/* Último acesso */}
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#6b7280' }}>
                    <div>{fmtDatetime(u.ultimo_acesso)}</div>
                    {u.ultimo_acesso && (
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{tempoAtras(u.ultimo_acesso)}</div>
                    )}
                  </td>
                  {/* Ações hoje */}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: '13px', fontWeight: '700',
                      color: u.acoes_hoje > 20 ? '#15803d' : u.acoes_hoje > 0 ? '#2563eb' : '#9ca3af'
                    }}>
                      {u.acoes_hoje}
                    </span>
                  </td>
                  {/* Expandir */}
                  <td style={{ padding: '12px 16px' }}>
                    {u.pages_hoje?.length > 0 && (
                      <button
                        onClick={() => setUsuarioExpandido(usuarioExpandido === u.id ? null : u.id)}
                        style={{ padding: '4px 10px', background: '#eff6ff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: '#2563eb', fontWeight: '500' }}>
                        {usuarioExpandido === u.id ? 'Ocultar' : 'Ver páginas'}
                      </button>
                    )}
                  </td>
                </tr>
                {/* Linha expandida: páginas mais acessadas hoje */}
                {usuarioExpandido === u.id && u.pages_hoje?.length > 0 && (
                  <tr style={{ background: '#f8f9fa' }}>
                    <td colSpan={7} style={{ padding: '8px 16px 12px 60px' }}>
                      <p style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Páginas mais acessadas hoje:
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {u.pages_hoje.map((p, i) => (
                          <span key={i} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', color: '#374151', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontWeight: '600', color: '#2563eb' }}>{p.visitas}×</span>
                            {PAGE_LABELS[p.page] || p.page}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info box */}
      <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '10px', padding: '14px 18px', fontSize: '13px', color: '#1d4ed8', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <Activity size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
        <div>
          <strong>Como funciona:</strong> O sistema registra automaticamente cada navegação de página e um heartbeat a cada 2 minutos enquanto o usuário estiver ativo. Usuários com heartbeat nos últimos 5 minutos aparecem como "Online".
          Os logs são mantidos por 30 dias e então removidos automaticamente.
        </div>
      </div>
    </div>
  );
};

export default Controladoria;
