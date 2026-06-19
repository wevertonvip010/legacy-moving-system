import React, { useState, useEffect, useCallback } from 'react';
import {
  Target, Plus, Edit, Trash2, AlertCircle, X, TrendingUp,
  Award, Users, DollarSign, BarChart2, RefreshCw, CheckCircle, Clock
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { api } from '../lib/api';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtNum = (v) => new Intl.NumberFormat('pt-BR').format(v || 0);
const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb',
  borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
};

const TIPOS = ['receita', 'mudancas', 'clientes', 'boxes', 'organizers'];
const PERIODOS = ['mensal', 'trimestral', 'semestral', 'anual'];
const EMPTY = { titulo: '', tipo: 'receita', periodo: 'mensal', meta: '', realizado: '0' };

const TIPO_LABEL = {
  receita: 'Receita', mudancas: 'Mudanças', clientes: 'Clientes',
  boxes: 'Boxes', organizers: 'Organizers'
};

const TIPO_COLORS = {
  receita: '#2563eb', mudancas: '#7c3aed', clientes: '#059669',
  boxes: '#d97706', organizers: '#db2777'
};

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

// ── Gamificação ────────────────────────────────────────────────────────────────
const LEVELS = [
  { min: 120, emoji: '🚀', label: 'Superou!',     color: '#7c3aed', bg: '#f5f3ff' },
  { min: 100, emoji: '🏆', label: 'Meta atingida!', color: '#d97706', bg: '#fffbeb' },
  { min:  75, emoji: '⭐', label: 'Quase lá!',    color: '#2563eb', bg: '#eff6ff' },
  { min:  25, emoji: '🔥', label: 'Em progresso', color: '#ea580c', bg: '#fff7ed' },
  { min:   0, emoji: '🌱', label: 'Iniciando',    color: '#6b7280', bg: '#f9fafb' },
];
const getLevel = (prog) => LEVELS.find(l => (prog || 0) >= l.min) || LEVELS[LEVELS.length - 1];

// ── Cartão KPI ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, color = '#2563eb', bg = '#eff6ff' }) => (
  <div style={{
    background: 'white', borderRadius: '12px', padding: '18px 20px',
    border: '0.5px solid #e5e7eb', display: 'flex', gap: '14px', alignItems: 'flex-start'
  }}>
    <div style={{ background: bg, borderRadius: '10px', padding: '10px', flexShrink: 0 }}>
      <Icon size={20} color={color} />
    </div>
    <div>
      <p style={{ margin: '0 0 2px', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>{label}</p>
      <p style={{ margin: '0 0 2px', fontSize: '20px', fontWeight: '700', color: '#1a1a1a' }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>{sub}</p>}
    </div>
  </div>
);

// ── Barra de progresso ─────────────────────────────────────────────────────────
const ProgressBar = ({ value, color }) => (
  <div style={{ background: '#f3f4f6', borderRadius: '20px', height: '6px', overflow: 'hidden' }}>
    <div style={{
      width: `${Math.min(value, 100)}%`, height: '100%',
      background: color, borderRadius: '20px', transition: 'width 0.3s'
    }} />
  </div>
);

// ── Tooltip customizado ────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 14px', fontSize: '12px' }}>
      <p style={{ margin: '0 0 6px', fontWeight: '600', color: '#1a1a1a' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '2px 0', color: p.color }}>
          {p.name}: <strong>{typeof p.value === 'number' && p.value > 1000 ? fmt(p.value) : fmtNum(p.value)}</strong>
        </p>
      ))}
    </div>
  );
};

// ── Componente principal ───────────────────────────────────────────────────────
const Metas = () => {
  const [metas, setMetas] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [rankingVendedores, setRankingVendedores] = useState([]);
  const [leads, setLeads] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [atualizandoId, setAtualizandoId] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, r, rv, l, d] = await Promise.allSettled([
        api.getMetas(),
        api.getRankingOrganizers(),
        api.getRankingVendedores(),
        api.getLeads({ limit: 500 }),
        api.dashboard(),
      ]);
      if (m.status === 'fulfilled') setMetas(m.value || []);
      if (r.status === 'fulfilled') setRanking(r.value || []);
      if (rv.status === 'fulfilled') setRankingVendedores(rv.value || []);
      if (l.status === 'fulfilled') setLeads(Array.isArray(l.value) ? l.value : (l.value?.items || []));
      if (d.status === 'fulfilled') setDashboard(d.value);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrir = (m = null) => {
    setEditando(m);
    setForm(m
      ? { titulo: m.titulo, tipo: m.tipo, periodo: m.periodo, meta: String(m.meta), realizado: String(m.realizado) }
      : EMPTY
    );
    setErroForm('');
    setShowModal(true);
  };

  const salvar = async () => {
    if (!form.titulo.trim()) { setErroForm('Título é obrigatório'); return; }
    if (!form.meta) { setErroForm('Valor da meta é obrigatório'); return; }
    setSalvando(true);
    try {
      const payload = { ...form, meta: parseFloat(form.meta) || 0, realizado: parseFloat(form.realizado) || 0 };
      if (editando) await api.updateMeta(editando.id, payload);
      else await api.createMeta(payload);
      setShowModal(false);
      carregar();
    } catch (e) { setErroForm(e.message); }
    finally { setSalvando(false); }
  };

  const deletar = async (id) => {
    if (!confirm('Excluir esta meta?')) return;
    try { await api.deleteMeta(id); carregar(); }
    catch (e) { alert(e.message); }
  };

  const atualizarRealizado = async (m, novoValor) => {
    setAtualizandoId(m.id);
    try {
      await api.updateMeta(m.id, { realizado: parseFloat(novoValor) || 0 });
      await carregar();
    } catch (e) { alert(e.message); }
    finally { setAtualizandoId(null); }
  };

  // ── KPIs calculados ──────────────────────────────────────────────────────────
  const totalLeads = leads.length;
  const convertidos = leads.filter(l => l.status === 'convertido').length;
  const taxaConversao = totalLeads > 0 ? ((convertidos / totalLeads) * 100).toFixed(1) : '0.0';
  const metasAtingidas = metas.filter(m => (m.progresso || 0) >= 100).length;
  const receitaMeta = metas.find(m => m.tipo === 'receita' && m.periodo === 'mensal');

  // ── Dados gráfico de barras ──────────────────────────────────────────────────
  const dadosBarras = metas.map(m => ({
    name: m.titulo.length > 18 ? m.titulo.slice(0, 18) + '…' : m.titulo,
    Meta: parseFloat(m.meta) || 0,
    Realizado: parseFloat(m.realizado) || 0,
    cor: TIPO_COLORS[m.tipo] || '#2563eb',
  }));

  // ── Leads por status para o painel ──────────────────────────────────────────
  const leadsPorStatus = ['novo', 'classificado', 'convertido', 'perdido', 'arquivado'].map(s => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    value: leads.filter(l => l.status === s).length,
  })).filter(x => x.value > 0);

  const PIE_COLORS = ['#2563eb', '#7c3aed', '#059669', '#ef4444', '#9ca3af'];

  if (loading) return <Spinner />;
  if (error) return <Erro msg={error} onRetry={carregar} />;

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 4px' }}>
            Painel Comercial
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            Performance, metas e ranking da equipe
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={carregar}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <RefreshCw size={13} /> Atualizar
          </button>
          <button onClick={() => abrir()}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
            <Plus size={14} /> Nova Meta
          </button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KpiCard
          icon={DollarSign}
          label="Receita mensal (meta)"
          value={receitaMeta ? fmt(receitaMeta.realizado) : 'N/A'}
          sub={receitaMeta ? `Meta: ${fmt(receitaMeta.meta)} · ${receitaMeta.progresso || 0}%` : 'Nenhuma meta de receita'}
          color="#2563eb" bg="#eff6ff"
        />
        <KpiCard
          icon={TrendingUp}
          label="Conversão de leads"
          value={`${taxaConversao}%`}
          sub={`${convertidos} convertidos de ${totalLeads} leads`}
          color="#059669" bg="#f0fdf4"
        />
        <KpiCard
          icon={CheckCircle}
          label="Metas atingidas"
          value={`${metasAtingidas} / ${metas.length}`}
          sub={metas.length > 0 ? `${((metasAtingidas / metas.length) * 100).toFixed(0)}% das metas concluídas` : 'Nenhuma meta cadastrada'}
          color="#7c3aed" bg="#f5f3ff"
        />
        <KpiCard
          icon={Users}
          label="Organizers ativos"
          value={ranking.length}
          sub={ranking.length > 0 ? `Top: ${ranking[0]?.nome || '—'}` : 'Nenhum organizer'}
          color="#d97706" bg="#fffbeb"
        />
      </div>

      {/* ── Destaques / Gamificação ───────────────────────────────────────── */}
      {(rankingVendedores.length > 0 || ranking.length > 0 || metasAtingidas > 0) && (() => {
        const topVend = rankingVendedores[0];
        const topOrg  = ranking[0];
        const melhorMeta = metas.length > 0 ? [...metas].sort((a, b) => (b.progresso || 0) - (a.progresso || 0))[0] : null;
        const destaques = [
          topVend && {
            emoji: '🥇', titulo: 'Top Vendedor',
            nome: topVend.nome,
            stat: fmt(topVend.receita_gerada),
            sub: `${topVend.taxa_conversao}% conversão · ${topVend.os_total} OS`,
            color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe',
          },
          topOrg && {
            emoji: '🏅', titulo: 'Top Organizer',
            nome: topOrg.nome,
            stat: fmt(topOrg.receita_gerada),
            sub: `${(topOrg.taxa_conversao || 0).toFixed(1)}% conversão · ${topOrg.leads_convertidos || 0} leads`,
            color: '#d97706', bg: '#fffbeb', border: '#fde68a',
          },
          melhorMeta && {
            emoji: getLevel(melhorMeta.progresso).emoji,
            titulo: 'Meta em Destaque',
            nome: melhorMeta.titulo,
            stat: `${Math.min(melhorMeta.progresso || 0, 999)}%`,
            sub: getLevel(melhorMeta.progresso).label,
            color: getLevel(melhorMeta.progresso).color,
            bg: getLevel(melhorMeta.progresso).bg,
            border: '#e5e7eb',
          },
        ].filter(Boolean);

        if (destaques.length === 0) return null;
        return (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '16px' }}>🎖️</span>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#1a1a1a' }}>Destaques do Período</h3>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>— performance atual</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${destaques.length}, 1fr)`, gap: '12px' }}>
              {destaques.map((d, i) => (
                <div key={i} style={{
                  background: d.bg, border: `1px solid ${d.border}`,
                  borderRadius: '12px', padding: '16px 18px',
                  display: 'flex', alignItems: 'flex-start', gap: '14px',
                }}>
                  <div style={{ fontSize: '28px', lineHeight: 1, flexShrink: 0 }}>{d.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: '700', color: d.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{d.titulo}</p>
                    <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '700', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nome}</p>
                    <p style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: '800', color: d.color }}>{d.stat}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>{d.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Gráfico de metas + Funil de leads ─────────────────────────────── */}
      {(metas.length > 0 || leadsPorStatus.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>

          {/* Barras meta vs realizado */}
          {metas.length > 0 && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '0.5px solid #e5e7eb' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '600', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={16} color="#2563eb" /> Meta vs Realizado
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dadosBarras} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Meta" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Realizado" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pizza de leads por status */}
          {leadsPorStatus.length > 0 && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '0.5px solid #e5e7eb' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '600', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={16} color="#7c3aed" /> Funil de Leads
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={leadsPorStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="value" nameKey="name" paddingAngle={2}>
                    {leadsPorStatus.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmtNum(v)} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── Metas detalhadas ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '0.5px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={16} color="#0f1f3d" /> Metas Cadastradas
            </h3>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>{metas.length} metas</span>
          </div>

          {metas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
              <Target size={28} style={{ margin: '0 auto 8px', display: 'block' }} />
              <p style={{ margin: 0, fontSize: '13px' }}>Nenhuma meta cadastrada</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '420px', overflowY: 'auto' }}>
              {metas.map(m => {
                const prog = Math.min(m.progresso || 0, 100);
                const atingida = prog >= 100;
                const color = TIPO_COLORS[m.tipo] || '#2563eb';
                return (
                  <div key={m.id} style={{
                    padding: '14px', borderRadius: '10px',
                    background: atingida ? '#f0fdf4' : '#fafafa',
                    border: `1px solid ${atingida ? '#bbf7d0' : '#e5e7eb'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          {atingida && <CheckCircle size={13} color="#16a34a" />}
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{m.titulo}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span style={{
                            fontSize: '10px', padding: '1px 7px', borderRadius: '20px',
                            background: color + '20', color: color, fontWeight: '600'
                          }}>{TIPO_LABEL[m.tipo] || m.tipo}</span>
                          <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', background: '#f3f4f6', color: '#6b7280' }}>{m.periodo}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <button onClick={() => abrir(m)}
                          style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', borderRadius: '4px' }}>
                          <Edit size={12} />
                        </button>
                        <button onClick={() => deletar(m.id)}
                          style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', borderRadius: '4px' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <ProgressBar value={prog} color={atingida ? '#16a34a' : color} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        {m.tipo === 'receita' ? fmt(m.realizado) : fmtNum(m.realizado)}
                        <span style={{ color: '#9ca3af' }}>
                          {' / '}{m.tipo === 'receita' ? fmt(m.meta) : fmtNum(m.meta)}
                        </span>
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {(() => {
                          const lv = getLevel(prog);
                          return (
                            <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '20px', background: lv.bg, color: lv.color, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px', border: `1px solid ${lv.color}30` }}>
                              {lv.emoji} {lv.label}
                            </span>
                          );
                        })()}
                        <span style={{ fontSize: '13px', fontWeight: '800', color: atingida ? '#16a34a' : color }}>
                          {prog}%
                        </span>
                      </div>
                    </div>

                    {/* Atualizar realizado inline */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#9ca3af', flexShrink: 0 }}>Atualizar realizado:</span>
                      <input
                        type="number"
                        defaultValue={m.realizado}
                        key={m.realizado}
                        onBlur={e => {
                          const novo = parseFloat(e.target.value) || 0;
                          if (novo !== parseFloat(m.realizado)) atualizarRealizado(m, e.target.value);
                        }}
                        disabled={atualizandoId === m.id}
                        style={{
                          width: '90px', padding: '3px 7px', border: '1px solid #e5e7eb',
                          borderRadius: '6px', fontSize: '12px', outline: 'none'
                        }}
                      />
                      {atualizandoId === m.id && <Clock size={12} color="#9ca3af" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Ranking de Vendedores ──────────────────────────────────────── */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '0.5px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={16} color="#2563eb" /> Ranking de Vendas
            </h3>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>por receita gerada</span>
          </div>

          {rankingVendedores.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
              <Users size={28} style={{ margin: '0 auto 8px', display: 'block' }} />
              <p style={{ margin: 0, fontSize: '13px' }}>Nenhum vendedor ativo</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
              {rankingVendedores.slice(0, 10).map((v, i) => {
                const maxReceita = rankingVendedores[0]?.receita_gerada || 1;
                const barW = Math.round((v.receita_gerada / maxReceita) * 100);
                return (
                  <div key={v.id} style={{
                    padding: '12px 14px', borderRadius: '10px',
                    background: i === 0 ? '#eff6ff' : '#fafafa',
                    border: `1px solid ${i === 0 ? '#bfdbfe' : '#e5e7eb'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '18px', lineHeight: 1 }}>{RANK_MEDALS[i] || `#${i + 1}`}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{v.nome}</span>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb' }}>{fmt(v.receita_gerada)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                          <span>📋 {v.leads_total} leads</span>
                          <span>✅ {v.leads_convertidos} conv.</span>
                          <span>🚚 {v.os_total} OS</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ background: '#f3f4f6', borderRadius: '20px', height: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${barW}%`, height: '100%', background: i === 0 ? '#2563eb' : '#7c3aed', borderRadius: '20px' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
                      <span>Conversão: <strong style={{ color: v.taxa_conversao >= 50 ? '#059669' : '#6b7280' }}>{v.taxa_conversao}%</strong></span>
                      <span>OS finalizadas: <strong style={{ color: '#374151' }}>{v.os_finalizadas}</strong></span>
                    </div>
                    {i === 0 && (
                      <div style={{ marginTop: '6px' }}>
                        <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '20px', fontWeight: '700', border: '1px solid #bfdbfe' }}>⭐ Top Vendedor</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Indicadores de conversão por período ──────────────────────────── */}
      {leads.length > 0 && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '0.5px solid #e5e7eb', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '600', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} color="#059669" /> Indicadores Comerciais
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
            {['novo', 'classificado', 'convertido', 'perdido', 'arquivado'].map(status => {
              const count = leads.filter(l => l.status === status).length;
              const pct = totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(0) : 0;
              const COLORS = {
                novo: { bg: '#dbeafe', color: '#1d4ed8' },
                classificado: { bg: '#fef9c3', color: '#92400e' },
                convertido: { bg: '#dcfce7', color: '#166534' },
                perdido: { bg: '#fee2e2', color: '#991b1b' },
                arquivado: { bg: '#f3f4f6', color: '#4b5563' },
              };
              const { bg, color } = COLORS[status];
              return (
                <div key={status} style={{ textAlign: 'center', padding: '14px', background: bg, borderRadius: '10px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '700', color }}>{count}</p>
                  <p style={{ margin: '0 0 4px', fontSize: '12px', color, fontWeight: '500', textTransform: 'capitalize' }}>{status}</p>
                  <p style={{ margin: 0, fontSize: '11px', color, opacity: 0.7 }}>{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modal criar/editar meta ────────────────────────────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '440px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{editando ? 'Editar Meta' : 'Nova Meta'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Título *</label>
              <input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ex: Receita mensal de junho" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} style={inputStyle}>
                  {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABEL[t] || t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Período</label>
                <select value={form.periodo} onChange={e => setForm({ ...form, periodo: e.target.value })} style={inputStyle}>
                  {PERIODOS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Valor da Meta *</label>
                <input type="number" value={form.meta} onChange={e => setForm({ ...form, meta: e.target.value })}
                  placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Realizado Atual</label>
                <input type="number" value={form.realizado} onChange={e => setForm({ ...form, realizado: e.target.value })}
                  placeholder="0" style={inputStyle} />
              </div>
            </div>
            {erroForm && <p style={{ color: '#dc2626', fontSize: '13px', margin: '0 0 12px' }}>{erroForm}</p>}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setShowModal(false)}
                style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'white' }}>
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                style={{ padding: '9px 18px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500', opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '12px' }}>
    <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTop: '3px solid #0f1f3d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>Carregando painel...</p>
  </div>
);

const Erro = ({ msg, onRetry }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
    <div style={{ textAlign: 'center', color: '#ef4444' }}>
      <AlertCircle size={32} />
      <p style={{ marginTop: '8px' }}>{msg}</p>
      <button onClick={onRetry}
        style={{ marginTop: '12px', padding: '8px 16px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
        Tentar novamente
      </button>
    </div>
  </div>
);

export default Metas;
