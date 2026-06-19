import React, { useState, useEffect, useCallback } from 'react';
import {
  Heart, Plus, Search, Edit, Trash2, AlertCircle, X, TrendingUp,
  Users, DollarSign, Award, Star, BarChart2, ChevronDown, ChevronUp,
  Bell, Calendar, CheckCircle, Eye
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { api } from '../lib/api';

const inp = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb',
  borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
};

const CLASSIFICACAO_CONFIG = {
  bronze: { label: 'Bronze', color: '#cd7f32', bg: '#fdf3e7' },
  prata:  { label: 'Prata',  color: '#9ca3af', bg: '#f3f4f6' },
  ouro:   { label: 'Ouro',   color: '#f59e0b', bg: '#fffbeb' },
  vip:    { label: 'VIP',    color: '#7c3aed', bg: '#f5f3ff' },
};

const STATUS_CONFIG = {
  ativo:        { label: 'Ativa',        color: '#16a34a', bg: '#f0fdf4' },
  inativo:      { label: 'Inativa',      color: '#6b7280', bg: '#f3f4f6' },
  parceira_vip: { label: 'Parceira VIP', color: '#7c3aed', bg: '#f5f3ff' },
};

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtPct = (v) => `${(v || 0).toFixed(1)}%`;

const EMPTY_FORM = {
  nome: '', instagram: '', telefone: '', empresa: '',
  cidade: '', observacoes: '', classificacao: 'bronze',
  meta_mensal: '', status: 'ativo',
};

const CHART_COLORS = ['#0f1f3d', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function Organizers() {
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('ativo');
  const [filtroClassificacao, setFiltroClassificacao] = useState('');
  const [view, setView] = useState('lista'); // lista | ranking | graficos
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [detalhes, setDetalhes] = useState(null); // organizer selecionada para detalhe
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDash, setLoadingDash] = useState(false);
  const [comissoesData, setComissoesData] = useState([]);
  const [pagandoComissao, setPagandoComissao] = useState(null); // id da comissão sendo paga

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params = filtroStatus === 'todos' ? { todas: '1' } : {};
      setOrganizers(await api.getOrganizers(params));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [filtroStatus]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirDetalhes = async (o) => {
    setDetalhes(o);
    setDashboardData(null);
    setComissoesData([]);
    setLoadingDash(true);
    try {
      const [d, comissoes] = await Promise.all([
        api.getOrganizerDashboard(o.id),
        api.getOrganizerComissoes(o.id),
      ]);
      setDashboardData(d);
      setComissoesData(comissoes);
    } catch (e) { setDashboardData(null); }
    finally { setLoadingDash(false); }
  };

  const handlePagarComissao = async (comissaoId, obs = '') => {
    setPagandoComissao(comissaoId);
    try {
      await api.pagarComissao(comissaoId, { observacoes: obs });
      // Recarregar comissões e dashboard
      const [d, comissoes] = await Promise.all([
        api.getOrganizerDashboard(detalhes.id),
        api.getOrganizerComissoes(detalhes.id),
      ]);
      setDashboardData(d);
      setComissoesData(comissoes);
      carregar(); // Atualiza lista principal
    } catch (e) { alert(e.message); }
    finally { setPagandoComissao(null); }
  };

  const abrirModal = (o = null) => {
    setEditando(o);
    setForm(o ? {
      nome: o.nome || '', instagram: o.instagram || '', telefone: o.telefone || '',
      empresa: o.empresa || '', cidade: o.cidade || '', observacoes: o.observacoes || '',
      classificacao: o.classificacao || 'bronze', meta_mensal: o.meta_mensal || '',
      status: o.status || 'ativo',
    } : EMPTY_FORM);
    setErroForm('');
    setShowModal(true);
  };

  const salvar = async () => {
    if (!form.nome.trim()) { setErroForm('Nome é obrigatório'); return; }
    setSalvando(true);
    try {
      const payload = { ...form, meta_mensal: parseFloat(form.meta_mensal) || 0 };
      if (editando) await api.updateOrganizer(editando.id, payload);
      else await api.createOrganizer(payload);
      setShowModal(false);
      carregar();
    } catch (e) { setErroForm(e.message); }
    finally { setSalvando(false); }
  };

  const inativar = async (id) => {
    if (!confirm('Inativar organizer?')) return;
    try { await api.deleteOrganizer(id); carregar(); }
    catch (e) { alert(e.message); }
  };

  const filtrados = organizers.filter(o => {
    const textoOk = !busca || o.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (o.instagram || '').toLowerCase().includes(busca.toLowerCase()) ||
      (o.cidade || '').toLowerCase().includes(busca.toLowerCase());
    const classOk = !filtroClassificacao || o.classificacao === filtroClassificacao;
    return textoOk && classOk;
  });

  // Métricas globais
  const totalLeads = organizers.reduce((s, o) => s + (o.total_leads || 0), 0);
  const totalConvertidos = organizers.reduce((s, o) => s + (o.convertidos || 0), 0);
  const totalReceita = organizers.reduce((s, o) => s + (o.receita_gerada || 0), 0);
  const totalComissao = organizers.reduce((s, o) => s + (o.comissao_pendente || 0), 0);

  if (loading) return <Spinner />;
  if (error) return <Erro msg={error} onRetry={carregar} />;

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 4px' }}>
            Personal Organizers
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            {organizers.length} parceiras · Rede de indicações
          </p>
        </div>
        <button onClick={() => abrirModal()}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
          <Plus size={14} /> Nova Organizer
        </button>
      </div>

      {/* Cards de métricas globais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '20px' }}>
        {[
          { label: 'Total de leads', value: totalLeads, icon: Users, color: '#3b82f6' },
          { label: 'Convertidos', value: totalConvertidos, sub: totalLeads > 0 ? fmtPct(totalConvertidos/totalLeads*100) : '0%', icon: TrendingUp, color: '#10b981' },
          { label: 'Receita gerada', value: fmt(totalReceita), icon: DollarSign, color: '#f59e0b' },
          { label: 'Comissão a pagar', value: fmt(totalComissao), icon: Award, color: '#ec4899' },
        ].map((m, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '18px', border: '0.5px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 6px', fontWeight: '500' }}>{m.label}</p>
                <p style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>{m.value}</p>
                {m.sub && <p style={{ fontSize: '12px', color: m.color, margin: '2px 0 0', fontWeight: '500' }}>{m.sub}</p>}
              </div>
              <div style={{ background: m.color + '15', borderRadius: '10px', padding: '10px' }}>
                <m.icon size={18} color={m.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Abas de view */}
      <div style={{ display: 'flex', gap: '4px', background: 'white', padding: '4px', borderRadius: '10px', border: '0.5px solid #e5e7eb', marginBottom: '16px', width: 'fit-content' }}>
        {[['lista','Lista'], ['ranking','Ranking'], ['graficos','Gráficos']].map(([v, l]) => (
          <button key={v} onClick={() => setView(v)}
            style={{ padding: '7px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
              background: view === v ? '#0f1f3d' : 'transparent',
              color: view === v ? 'white' : '#6b7280' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, @instagram, cidade..."
            style={{ ...inp, paddingLeft: '32px' }} />
        </div>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          style={{ ...inp, width: 'auto', minWidth: '130px' }}>
          <option value="ativo">Ativas</option>
          <option value="inativo">Inativas</option>
          <option value="todos">Todas</option>
        </select>
        <select value={filtroClassificacao} onChange={e => setFiltroClassificacao(e.target.value)}
          style={{ ...inp, width: 'auto', minWidth: '130px' }}>
          <option value="">Todas as classes</option>
          {Object.entries(CLASSIFICACAO_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* LISTA */}
      {view === 'lista' && (
        <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Organizer', 'Contato', 'Classificação', 'Leads', 'Conversão', 'Receita', 'Comissão', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>Nenhuma organizer encontrada</td></tr>
              ) : filtrados.map(o => {
                const cls = CLASSIFICACAO_CONFIG[o.classificacao] || CLASSIFICACAO_CONFIG.bronze;
                const sts = STATUS_CONFIG[o.status] || STATUS_CONFIG.ativo;
                const diasSem = o.dias_sem_indicar;
                return (
                  <tr key={o.id} style={{ borderTop: '0.5px solid #f3f4f6' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: '600', fontSize: '13px', color: '#1a1a1a' }}>{o.nome}</div>
                      {o.cidade && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{o.cidade}</div>}
                      {o.empresa && <div style={{ fontSize: '11px', color: '#6b7280' }}>{o.empresa}</div>}
                      {diasSem !== null && diasSem >= 30 && (
                        <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Bell size={10} /> {diasSem}d sem indicar
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: '#6b7280' }}>
                      {o.instagram && <div style={{ color: '#ec4899' }}>@{o.instagram.replace('@','')}</div>}
                      {o.telefone && <div>{o.telefone}</div>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontWeight: '600', background: cls.bg, color: cls.color, width: 'fit-content' }}>
                          {cls.label}
                        </span>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '20px', background: sts.bg, color: sts.color, width: 'fit-content' }}>
                          {sts.label}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{o.total_leads || 0}</td>
                    <td style={{ padding: '12px 14px', fontSize: '13px', color: '#6b7280' }}>
                      <div style={{ fontWeight: '500', color: o.taxa_conversao >= 50 ? '#10b981' : '#6b7280' }}>
                        {fmtPct(o.taxa_conversao)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>{o.convertidos || 0} fechados</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>
                      {fmt(o.receita_gerada)}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '13px' }}>
                      {o.comissao_pendente > 0 ? (
                        <span style={{ color: '#dc2626', fontWeight: '600' }}>{fmt(o.comissao_pendente)}</span>
                      ) : (
                        <span style={{ color: '#10b981', fontSize: '12px' }}>Em dia</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => abrirDetalhes(o)} title="Ver dashboard"
                          style={{ padding: '5px', background: '#eff6ff', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#3b82f6' }}>
                          <Eye size={14} />
                        </button>
                        <button onClick={() => abrirModal(o)} title="Editar"
                          style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                          <Edit size={14} />
                        </button>
                        <button onClick={() => inativar(o.id)} title="Inativar"
                          style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* RANKING */}
      {view === 'ranking' && (
        <div style={{ display: 'grid', gap: '12px' }}>
          {filtrados
            .sort((a, b) => (b.receita_gerada || 0) - (a.receita_gerada || 0))
            .map((o, i) => {
              const cls = CLASSIFICACAO_CONFIG[o.classificacao] || CLASSIFICACAO_CONFIG.bronze;
              const medalhas = ['🥇', '🥈', '🥉'];
              return (
                <div key={o.id}
                  style={{ background: 'white', borderRadius: '12px', padding: '16px 20px', border: `0.5px solid ${i < 3 ? cls.color + '40' : '#e5e7eb'}`, display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '24px', width: '36px', textAlign: 'center' }}>
                    {i < 3 ? medalhas[i] : <span style={{ fontSize: '16px', color: '#9ca3af', fontWeight: '700' }}>#{i+1}</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '600', fontSize: '14px', color: '#1a1a1a' }}>{o.nome}</span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: '600', background: cls.bg, color: cls.color }}>{cls.label}</span>
                    </div>
                    {o.cidade && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{o.cidade}{o.empresa ? ` · ${o.empresa}` : ''}</div>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '20px', textAlign: 'center' }}>
                    {[
                      { label: 'Leads', value: o.total_leads || 0 },
                      { label: 'Conversão', value: fmtPct(o.taxa_conversao) },
                      { label: 'Receita', value: fmt(o.receita_gerada) },
                      { label: 'Comissão', value: fmt(o.comissao_acumulada) },
                    ].map((m, j) => (
                      <div key={j}>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>{m.value}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => abrirDetalhes(o)}
                    style={{ padding: '7px 14px', background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '500', whiteSpace: 'nowrap' }}>
                    Ver detalhes
                  </button>
                </div>
              );
          })}
        </div>
      )}

      {/* GRÁFICOS */}
      {view === 'graficos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Top organizers por receita */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '0.5px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 16px' }}>Top 5 por Receita</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={filtrados.slice(0,5).map(o => ({ nome: o.nome.split(' ')[0], receita: o.receita_gerada || 0 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => fmt(v)} />
                <Bar dataKey="receita" fill="#0f1f3d" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Conversão por organizer */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '0.5px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 16px' }}>Conversão por Organizer (%)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={filtrados.slice(0,5).map(o => ({ nome: o.nome.split(' ')[0], conversao: o.taxa_conversao || 0 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={v => fmtPct(v)} />
                <Bar dataKey="conversao" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Distribuição por classificação */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '0.5px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 16px' }}>Distribuição por Nível</h3>
            {(() => {
              const counts = { bronze: 0, prata: 0, ouro: 0, vip: 0 };
              organizers.forEach(o => { if (counts[o.classificacao] !== undefined) counts[o.classificacao]++; });
              const data = Object.entries(counts).filter(([,v]) => v > 0).map(([k,v]) => ({
                name: CLASSIFICACAO_CONFIG[k].label, value: v, color: CLASSIFICACAO_CONFIG[k].color
              }));
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${(percent*100).toFixed(0)}%`}>
                        {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1 }}>
                    {data.map((d, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: d.color }} />
                        <span style={{ fontSize: '13px', color: '#374151' }}>{d.name}</span>
                        <span style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Top por comissão acumulada */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '0.5px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 16px' }}>Comissão Acumulada</h3>
            <div style={{ overflowY: 'auto', maxHeight: '180px' }}>
              {filtrados
                .filter(o => (o.comissao_acumulada || 0) > 0)
                .sort((a,b) => (b.comissao_acumulada||0) - (a.comissao_acumulada||0))
                .slice(0,6)
                .map((o, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid #f3f4f6' }}>
                    <span style={{ fontSize: '13px', color: '#374151' }}>{o.nome.split(' ')[0]}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{fmt(o.comissao_acumulada)}</div>
                      {o.comissao_pendente > 0 && <div style={{ fontSize: '11px', color: '#dc2626' }}>{fmt(o.comissao_pendente)} a pagar</div>}
                    </div>
                  </div>
                ))}
              {filtrados.filter(o => (o.comissao_acumulada||0) > 0).length === 0 && (
                <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>Nenhuma comissão gerada ainda</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHES DA ORGANIZER */}
      {detalhes && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '780px', maxHeight: '85vh', overflow: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '0.5px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#1a1a1a' }}>{detalhes.nome}</h3>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
                  {detalhes.instagram ? `@${detalhes.instagram.replace('@','')}` : ''}{detalhes.cidade ? ` · ${detalhes.cidade}` : ''}
                </p>
              </div>
              <button onClick={() => setDetalhes(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {loadingDash ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTop: '3px solid #0f1f3d', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : dashboardData ? (
                <DashboardOrganizer
                  data={dashboardData}
                  comissoes={comissoesData}
                  onPagar={handlePagarComissao}
                  pagandoId={pagandoComissao}
                />
              ) : (
                <p style={{ color: '#9ca3af', textAlign: 'center' }}>Dados não disponíveis</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CADASTRO/EDIÇÃO */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '500px', maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{editando ? 'Editar Organizer' : 'Nova Organizer'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                ['Nome *', 'nome', 'Nome completo', 'full'],
                ['Instagram', 'instagram', '@perfil'],
                ['Telefone', 'telefone', '(11) 99999-0000'],
                ['Empresa', 'empresa', 'Nome da empresa (opcional)'],
                ['Cidade', 'cidade', 'São Paulo'],
              ].map(([label, key, ph, span]) => (
                <div key={key} style={{ gridColumn: span === 'full' ? '1 / -1' : 'auto' }}>
                  <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>{label}</label>
                  <input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={ph} style={inp} />
                </div>
              ))}

              <div>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Classificação</label>
                <select value={form.classificacao} onChange={e => setForm({ ...form, classificacao: e.target.value })} style={inp}>
                  {Object.entries(CLASSIFICACAO_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Meta mensal (leads)</label>
                <input type="number" value={form.meta_mensal} onChange={e => setForm({ ...form, meta_mensal: e.target.value })} placeholder="0" style={inp} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })}
                  placeholder="Notas internas..."
                  style={{ ...inp, height: '70px', resize: 'vertical' }} />
              </div>
            </div>

            {erroForm && <p style={{ color: '#dc2626', fontSize: '13px', margin: '8px 0 0' }}>{erroForm}</p>}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'white' }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando}
                style={{ padding: '9px 18px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardOrganizer({ data, comissoes = [], onPagar, pagandoId }) {
  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  const cls = CLASSIFICACAO_CONFIG[data.classificacao] || CLASSIFICACAO_CONFIG.bronze;
  const [obsModal, setObsModal] = useState(null); // { id, valor }
  const [obs, setObs] = useState('');

  const pendentes = comissoes.filter(c => c.status === 'pendente');
  const pagas = comissoes.filter(c => c.status === 'pago');

  return (
    <div>
      {/* Alertas */}
      {(data.alertas || []).length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          {data.alertas.map((a, i) => (
            <div key={i} style={{ background: a.tipo === 'inatividade' ? '#fef3c7' : '#f0fdf4', border: `1px solid ${a.tipo === 'inatividade' ? '#fcd34d' : '#86efac'}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: a.tipo === 'inatividade' ? '#92400e' : '#166534' }}>
              {a.tipo === 'inatividade' ? <Bell size={14} /> : <CheckCircle size={14} />}
              {a.msg}
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total leads', value: data.total_leads || 0 },
          { label: 'Convertidos', value: data.convertidos || 0 },
          { label: 'Conversão', value: `${(data.taxa_conversao || 0).toFixed(1)}%` },
          { label: 'Ticket médio', value: fmt(data.ticket_medio) },
          { label: 'Receita gerada', value: fmt(data.receita_gerada) },
          { label: 'Lucro gerado', value: fmt(data.lucro_gerado) },
          { label: 'Comissão total', value: fmt(data.comissao_acumulada) },
          { label: 'A pagar', value: fmt(data.comissao_pendente) },
        ].map((m, i) => (
          <div key={i} style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>{m.label}</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Histórico mensal */}
      {(data.historico_mensal || []).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#374151', margin: '0 0 12px' }}>Histórico de indicações (12 meses)</h4>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={data.historico_mensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} dot={false} name="Leads" />
              <Line type="monotone" dataKey="convertidos" stroke="#10b981" strokeWidth={2} dot={false} name="Convertidos" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Comissões */}
      {comissoes.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#374151', margin: 0 }}>
              Comissões
            </h4>
            <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
              {pendentes.length > 0 && (
                <span style={{ color: '#dc2626', fontWeight: 600 }}>
                  {pendentes.length} pendente{pendentes.length > 1 ? 's' : ''} · {fmt(pendentes.reduce((s,c)=>s+c.valor,0))}
                </span>
              )}
              {pagas.length > 0 && (
                <span style={{ color: '#16a34a' }}>
                  {pagas.length} paga{pagas.length > 1 ? 's' : ''} · {fmt(pagas.reduce((s,c)=>s+c.valor,0))}
                </span>
              )}
            </div>
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['OS/Ref.', 'Valor', 'Status', 'Data Pagamento', 'Observação', 'Ação'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comissoes.map(c => (
                  <tr key={c.id} style={{ borderTop: '0.5px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: '#6b7280' }}>
                      {c.os_id ? `OS #${c.os_id}` : c.fechamento_id ? `Fech. #${c.fechamento_id}` : `#${c.id}`}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{fmt(c.valor)}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                        background: c.status === 'pago' ? '#dcfce7' : '#fef3c7',
                        color: c.status === 'pago' ? '#16a34a' : '#d97706',
                      }}>
                        {c.status === 'pago' ? '✓ Pago' : '⏳ Pendente'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: '#6b7280' }}>
                      {c.data_pagamento ? new Date(c.data_pagamento).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: '#6b7280' }}>{c.observacoes || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>
                      {c.status !== 'pago' && (
                        <button
                          onClick={() => { setObsModal({ id: c.id, valor: c.valor }); setObs(''); }}
                          disabled={pagandoId === c.id}
                          style={{ fontSize: 11, padding: '4px 10px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, opacity: pagandoId === c.id ? 0.6 : 1 }}>
                          {pagandoId === c.id ? 'Pagando...' : 'Pagar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal confirmação pagamento */}
      {obsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, width: 380, maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>Confirmar Pagamento</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
              Registrar pagamento de comissão no valor de <strong style={{ color: '#15803d' }}>{fmt(obsModal.valor)}</strong>?
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Observações (opcional)</label>
              <input
                value={obs}
                onChange={e => setObs(e.target.value)}
                placeholder="Ex: Pago via PIX, transferência..."
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setObsModal(null)} style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white' }}>Cancelar</button>
              <button
                onClick={() => { const id = obsModal.id; setObsModal(null); onPagar && onPagar(id, obs); }}
                style={{ padding: '9px 18px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                ✓ Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
    <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTop: '3px solid #0f1f3d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const Erro = ({ msg, onRetry }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
    <div style={{ textAlign: 'center', color: '#ef4444' }}>
      <AlertCircle size={32} />
      <p style={{ marginTop: '8px' }}>{msg}</p>
      <button onClick={onRetry} style={{ marginTop: '12px', padding: '8px 16px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Tentar novamente</button>
    </div>
  </div>
);
