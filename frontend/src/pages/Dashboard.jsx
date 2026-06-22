import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Archive, Users, DollarSign, TrendingUp, Heart, Calendar, AlertCircle, ChevronLeft, ChevronRight, ExternalLink, AlertTriangle, Trophy, Star, Package } from 'lucide-react';
import { api } from '../lib/api';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEMANA_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dados, setDados] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [osList, setOsList] = useState([]);
  const [progList, setProgList] = useState([]);
  const [avarias, setAvarias] = useState([]);
  const [rankingVendedores, setRankingVendedores] = useState([]);

  useEffect(() => {
    Promise.allSettled([
      api.dashboard(),
      api.getOS({ limit: 200 }),
      api.getProgramacao({ limit: 200 }),
      api.getAvarias ? api.getAvarias({ limit: 100 }) : Promise.resolve([]),
      api.getUsuarios ? api.getUsuarios({ role: 'vendedor' }) : Promise.resolve([]),
    ]).then(([dash, os, prog, av, users]) => {
      if (dash.status === 'fulfilled') setDados(dash.value);
      else setError(dash.reason?.message || 'Erro ao carregar');
      if (os.status === 'fulfilled') setOsList(Array.isArray(os.value) ? os.value : (os.value?.items || []));
      if (prog.status === 'fulfilled') setProgList(Array.isArray(prog.value) ? prog.value : (prog.value?.items || []));
      if (av.status === 'fulfilled') {
        const lista = Array.isArray(av.value) ? av.value : (av.value?.items || []);
        setAvarias(lista);
      }
      if (users.status === 'fulfilled') {
        const lista = Array.isArray(users.value) ? users.value : (users.value?.items || []);
        setRankingVendedores(lista);
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8f9fa' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTop: '3px solid #0f1f3d', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <p style={{ color: '#6b7280', marginTop: '16px', fontSize: '14px' }}>Carregando Legacy Moving...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8f9fa' }}>
      <div style={{ textAlign: 'center', color: '#ef4444' }}>
        <AlertCircle size={40} style={{ margin: '0 auto 12px' }} />
        <p style={{ fontSize: '14px' }}>Erro ao carregar dashboard: {error}</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: '12px', padding: '8px 16px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Tentar novamente
        </button>
      </div>
    </div>
  );

  const d = dados || {};
  const pct = d.boxes_total ? Math.round((d.boxes_ocupados / d.boxes_total) * 100) : 0;

  const metricas = [
    { label: 'Mudanças este mês', value: d.mudancas_mes ?? 0, sub: 'Ordens de serviço', icon: Truck, color: '#3b82f6', path: '/ordens-servico' },
    { label: 'Leads novos', value: d.leads_novos ?? 0, sub: 'Aguardando contato', icon: Heart, color: '#ec4899', path: '/leads' },
    { label: 'Orçamentos abertos', value: d.orcamentos_abertos ?? 0, sub: 'Rascunho + enviado', icon: TrendingUp, color: '#f59e0b', path: '/orcamentos' },
    { label: 'Clientes ativos', value: d.clientes_ativos ?? 0, sub: 'Na carteira', icon: Users, color: '#8b5cf6', path: '/clientes' },
    { label: 'Boxes ocupados', value: `${d.boxes_ocupados ?? 0}/${d.boxes_total ?? 20}`, sub: `${pct}% de ocupação`, icon: Archive, color: '#f97316', path: '/guarda-moveis' },
    { label: 'Avarias abertas', value: avarias.filter(a => a.status === 'aberta').length, sub: 'Requerem atenção', icon: AlertTriangle, color: '#ef4444', path: '/avarias' },
    { label: 'Alertas de Estoque', value: d.estoque_alertas ?? 0, sub: d.estoque_alertas ? '⚠ Itens abaixo do mínimo' : 'Estoque saudável', icon: Package, color: (d.estoque_alertas ?? 0) > 0 ? '#dc2626' : '#16a34a', path: '/estoque' },
    { label: 'Receita Recorrente', value: fmt(d.receita_recorrente ?? 0), sub: 'Guarda-móveis/mês', icon: DollarSign, color: '#0891b2', path: '/financeiro' },
  ];

  // ── Calendário embutido ──────────────────────────────────────────────────────
  const ano = calendarDate.getFullYear();
  const mes = calendarDate.getMonth();
  const primeiroDia = new Date(ano, mes, 1).getDay(); // 0=Dom
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  const hoje = new Date();

  // OS do mês
  const osDoMes = osList.filter(o => {
    if (!o.data_mudanca) return false;
    const d2 = new Date(o.data_mudanca);
    return d2.getFullYear() === ano && d2.getMonth() === mes;
  });

  // Programação do mês
  const progDoMes = progList.filter(p => {
    if (!p.data) return false;
    const d2 = new Date(p.data);
    return d2.getFullYear() === ano && d2.getMonth() === mes;
  });

  // Map dia → OSs
  const osPorDia = {};
  osDoMes.forEach(o => {
    const dia = new Date(o.data_mudanca).getDate();
    if (!osPorDia[dia]) osPorDia[dia] = [];
    osPorDia[dia].push(o);
  });

  // Map dia → Programação
  const progPorDia = {};
  progDoMes.forEach(p => {
    const dia = new Date(p.data).getDate();
    if (!progPorDia[dia]) progPorDia[dia] = [];
    progPorDia[dia].push(p);
  });

  const STATUS_COLOR = { agendada: '#f59e0b', em_andamento: '#3b82f6', concluida: '#10b981', cancelada: '#9ca3af' };

  const mesAnterior = () => setCalendarDate(new Date(ano, mes - 1, 1));
  const mesSeguinte = () => setCalendarDate(new Date(ano, mes + 1, 1));

  // Cria grid de dias
  const cells = [];
  for (let i = 0; i < primeiroDia; i++) cells.push(null);
  for (let i = 1; i <= ultimoDia; i++) cells.push(i);

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 4px' }}>Bem-vindo à Legacy Moving</h1>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
          {hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {metricas.map((m, i) => (
          <div key={i} onClick={() => navigate(m.path)}
            style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '0.5px solid #e5e7eb', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 6px', fontWeight: '500' }}>{m.label}</p>
                <p style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 2px' }}>{m.value}</p>
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>{m.sub}</p>
              </div>
              <div style={{ background: m.color + '15', borderRadius: '8px', padding: '8px' }}>
                <m.icon size={16} color={m.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Calendário Operacional — full width */}
      <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
        {/* Header calendário */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={18} color="#3b82f6" />
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>
              Agenda Operacional — {MESES[mes]} {ano}
            </h2>
            <span style={{ fontSize: '12px', color: '#6b7280', background: '#f3f4f6', padding: '2px 10px', borderRadius: '20px' }}>
              {osDoMes.length} OS · {progDoMes.length} eventos
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Legenda */}
            <div style={{ display: 'flex', gap: '12px', marginRight: '8px' }}>
              {[['Agendada','#f59e0b'],['Em andamento','#3b82f6'],['Concluída','#10b981'],['Programação','#7c3aed']].map(([l,c]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#6b7280' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c }} />
                  {l}
                </div>
              ))}
            </div>
            <button onClick={mesAnterior} style={{ padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', cursor: 'pointer' }}><ChevronLeft size={14} /></button>
            <button onClick={() => setCalendarDate(new Date())} style={{ padding: '4px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px', color: '#374151' }}>Hoje</button>
            <button onClick={mesSeguinte} style={{ padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', cursor: 'pointer' }}><ChevronRight size={14} /></button>
            <button onClick={() => navigate('/programacao')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', border: '1px solid #3b82f6', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px', color: '#3b82f6' }}>
              <ExternalLink size={12} /> Programação
            </button>
          </div>
        </div>

        {/* Google Calendar embed (se configurado) ou calendário interno */}
        {import.meta.env.VITE_GOOGLE_CALENDAR_ID ? (
          <iframe
            src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(import.meta.env.VITE_GOOGLE_CALENDAR_ID)}&ctz=America%2FSao_Paulo&mode=MONTH&showTitle=0&showNav=0&showPrint=0&showTabs=0&showCalendars=0&hl=pt-BR`}
            style={{ border: 'none', width: '100%', height: '680px' }}
            title="Agenda Google Calendar"
          />
        ) : (
          <>
            {/* Cabeçalho dias da semana */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #f3f4f6' }}>
              {DIAS_SEMANA_SHORT.map(d => (
                <div key={d} style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', background: '#f9fafb' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Grid de dias */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {cells.map((dia, idx) => {
                if (!dia) return <div key={`e-${idx}`} style={{ minHeight: '130px', borderRight: '0.5px solid #f3f4f6', borderBottom: '0.5px solid #f3f4f6', background: '#fafafa' }} />;
                const isHoje = hoje.getDate() === dia && hoje.getMonth() === mes && hoje.getFullYear() === ano;
                const osNoDia = osPorDia[dia] || [];
                const progNoDia = progPorDia[dia] || [];
                const totalEventos = osNoDia.length + progNoDia.length;
                const isWeekend = ((primeiroDia + dia - 1) % 7 === 0) || ((primeiroDia + dia - 1) % 7 === 6);
                return (
                  <div key={dia} style={{
                    minHeight: '160px', borderRight: '0.5px solid #f3f4f6', borderBottom: '0.5px solid #f3f4f6',
                    padding: '8px 6px', background: isWeekend ? '#fafafa' : 'white',
                    position: 'relative',
                    borderTop: isHoje ? '2px solid #0f1f3d' : 'none',
                  }}>
                    {/* Número do dia + badge se tem OS */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <div style={{
                        width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: isHoje ? '700' : '500',
                        background: isHoje ? '#0f1f3d' : 'transparent',
                        color: isHoje ? 'white' : isWeekend ? '#9ca3af' : '#374151',
                        flexShrink: 0,
                      }}>
                        {dia}
                      </div>
                      {totalEventos > 0 && (
                        <span style={{ fontSize: '10px', background: '#f0f4ff', color: '#2563eb', borderRadius: '10px', padding: '1px 6px', fontWeight: '600' }}>
                          {totalEventos}
                        </span>
                      )}
                    </div>
                    {/* Programação do dia */}
                    {progNoDia.slice(0, 2).map((p, pi) => (
                      <div key={`p-${pi}`} onClick={() => navigate('/programacao')} style={{
                        padding: '3px 6px', borderRadius: '4px', marginBottom: '3px', cursor: 'pointer',
                        background: '#f5f3ff',
                        borderLeft: '2px solid #7c3aed',
                        fontSize: '10.5px', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        lineHeight: '1.5',
                      }} title={p.titulo || p.cliente || 'Programação'}>
                        <span style={{ fontWeight: '600', color: '#7c3aed' }}>◆</span>{' '}{p.titulo || p.cliente || 'Prog.'}
                      </div>
                    ))}
                    {/* OS do dia */}
                    {osNoDia.slice(0, 3).map(o => (
                      <div key={o.id} onClick={() => navigate('/ordens-servico')} style={{
                        padding: '3px 6px', borderRadius: '4px', marginBottom: '3px', cursor: 'pointer',
                        background: (STATUS_COLOR[o.status] || '#9ca3af') + '18',
                        borderLeft: `2px solid ${STATUS_COLOR[o.status] || '#9ca3af'}`,
                        fontSize: '10.5px', color: '#1a1a1a', lineHeight: '1.5',
                      }} title={`${o.numero} — ${o.cliente}${o.equipe ? ' · ' + o.equipe : ''}`}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '600' }}>
                          {o.cliente || o.numero}
                        </div>
                        {(o.equipe || o.caminhao) && (
                          <div style={{ fontSize: '9.5px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {[o.equipe, o.caminhao].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                    ))}
                    {totalEventos > 5 && (
                      <div style={{ fontSize: '10px', color: '#6b7280', paddingLeft: '4px', fontStyle: 'italic' }}>
                        +{totalEventos - 5} mais
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Painel de Avarias + Ranking Vendedores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px' }}>

        {/* Painel Avarias */}
        <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={15} color="#ef4444" />
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Painel de Avarias</h3>
            </div>
            <button onClick={() => navigate('/avarias')} style={{ fontSize: '11px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Ver todas →</button>
          </div>
          <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', borderBottom: '1px solid #f3f4f6' }}>
            {[
              { label: 'Abertas', count: avarias.filter(a => a.status === 'aberta').length, bg: '#fee2e2', c: '#b91c1c' },
              { label: 'Em resolução', count: avarias.filter(a => a.status === 'em_resolucao').length, bg: '#dbeafe', c: '#1d4ed8' },
              { label: 'Encerradas', count: avarias.filter(a => a.status === 'encerrada').length, bg: '#f0fdf4', c: '#15803d' },
            ].map((s, i) => (
              <div key={i} style={{ background: s.bg, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: s.c }}>{s.count}</div>
                <div style={{ fontSize: '11px', color: s.c, fontWeight: '500' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 16px' }}>
            {avarias.filter(a => a.status === 'aberta' || a.status === 'em_resolucao').slice(0, 3).length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center', padding: '8px 0', margin: 0 }}>Nenhuma avaria pendente ✓</p>
            ) : (
              avarias.filter(a => a.status === 'aberta' || a.status === 'em_resolucao').slice(0, 3).map((a, i) => (
                <div key={i} onClick={() => navigate('/avarias')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 2 ? '1px solid #f3f4f6' : 'none', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#111827' }}>{a.cliente || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>{a.tipo ? a.tipo.replace(/_/g, ' ') : 'Avaria'} · {a.os_numero || '—'}</div>
                  </div>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', fontWeight: '600', background: a.status === 'aberta' ? '#fee2e2' : '#dbeafe', color: a.status === 'aberta' ? '#b91c1c' : '#1d4ed8' }}>
                    {a.status === 'aberta' ? 'Aberta' : 'Em resolução'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ranking Vendedores */}
        <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={15} color="#f59e0b" />
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Ranking Vendedores</h3>
            </div>
            <button onClick={() => navigate('/metas')} style={{ fontSize: '11px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Painel Comercial →</button>
          </div>
          <div style={{ padding: '8px 16px' }}>
            {rankingVendedores.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center', padding: '16px 0', margin: 0 }}>Configure vendedores nas Configurações</p>
            ) : (
              rankingVendedores.slice(0, 5).map((v, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;
                const userColor = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444'][i % 5];
                return (
                  <div key={v.id || i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < rankingVendedores.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{medal}</span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: userColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '13px' }}>
                      {(v.nome || v.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{v.nome || v.name}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>{v.cargo || v.role || 'Vendedor'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: userColor }}>{v.os_count || v.total_os || 0} OS</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>{v.conversao ? `${v.conversao}%` : '—'}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* OS da semana atual */}
      {(d.proximas_os || []).length > 0 && (
        <div style={{ marginTop: '20px', background: 'white', borderRadius: '12px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={15} color="#3b82f6" />
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>OS desta semana</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0', padding: '0' }}>
            {(d.proximas_os || []).map((os) => (
              <div key={os.id} onClick={() => navigate('/ordens-servico')}
                style={{ padding: '14px 20px', cursor: 'pointer', borderRight: '0.5px solid #f3f4f6', borderBottom: '0.5px solid #f3f4f6' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#374151', margin: '0 0 2px' }}>{os.cliente}</p>
                    <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                      {os.data_mudanca ? new Date(os.data_mudanca).toLocaleDateString('pt-BR') : 'Sem data'} · {os.veiculo || '—'}
                    </p>
                  </div>
                  <span style={{
                    fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontWeight: '500',
                    background: os.status === 'em_andamento' ? '#dbeafe' : '#fef9c3',
                    color: os.status === 'em_andamento' ? '#1d4ed8' : '#a16207'
                  }}>
                    {os.status === 'em_andamento' ? 'Em andamento' : 'Agendada'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
