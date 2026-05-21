import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AlertTriangle, Plus, Search, X, Edit, Trash2,
  CheckCircle, Clock, AlertCircle, FileText, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { api } from '../lib/api';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '—';

const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb',
  borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
};
const labelStyle = { fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' };

const TIPOS = [
  { value: 'movel_quebrado', label: 'Móvel quebrado', emoji: '💥' },
  { value: 'arranhado', label: 'Arranhado / riscado', emoji: '🔴' },
  { value: 'molhado', label: 'Molhado / manchado', emoji: '💧' },
  { value: 'perdido', label: 'Item perdido', emoji: '🔍' },
  { value: 'eletronico', label: 'Eletrônico danificado', emoji: '⚡' },
  { value: 'estrutural', label: 'Estrutural / parede', emoji: '🏗️' },
  { value: 'outro', label: 'Outro', emoji: '📋' },
];

const STATUS = {
  aberta:         { label: 'Aberta',         bg: '#fee2e2', color: '#b91c1c', icon: AlertTriangle },
  em_analise:     { label: 'Em Análise',      bg: '#fef9c3', color: '#92400e', icon: Clock },
  em_resolucao:   { label: 'Em Resolução',    bg: '#dbeafe', color: '#1d4ed8', icon: RefreshCw },
  resolvida:      { label: 'Resolvida',       bg: '#dcfce7', color: '#15803d', icon: CheckCircle },
  encerrada:      { label: 'Encerrada',       bg: '#f3f4f6', color: '#6b7280', icon: CheckCircle },
};

const STATUS_ORDER = ['aberta', 'em_analise', 'em_resolucao', 'resolvida', 'encerrada'];
const TIPO_LABEL = Object.fromEntries(TIPOS.map(t => [t.value, `${t.emoji} ${t.label}`]));

const PIE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#6b7280'];

const EMPTY_FORM = {
  os_id: '', os_numero: '', cliente: '', cliente_id: '',
  equipe: '', veiculo: '', organizer_id: '',
  tipo: 'outro', descricao: '', valor_estimado: '',
  observacoes: '', status: 'aberta',
};

const Avarias = () => {
  const location = useLocation();
  const [avarias, setAvarias] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [osList, setOsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [modal, setModal] = useState(null); // null | 'form' | 'detalhe'
  const [selecionada, setSelecionada] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [av, res, os] = await Promise.allSettled([
        api.getAvarias(filtroStatus !== 'todos' ? { status: filtroStatus } : {}),
        api.getResumoAvarias(),
        api.getOS({ limit: 200 }),
      ]);
      if (av.status === 'fulfilled') setAvarias(av.value || []);
      if (res.status === 'fulfilled') setResumo(res.value);
      if (os.status === 'fulfilled') {
        const lista = Array.isArray(os.value) ? os.value : (os.value?.items || []);
        setOsList(lista);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [filtroStatus]);

  useEffect(() => { carregar(); }, [carregar]);

  // Pré-preencher formulário se vindo da OS concluída
  useEffect(() => {
    const state = location.state;
    if (state?.preencherOS) {
      const os = state.preencherOS;
      setForm(f => ({
        ...f,
        os_id: os.id || '',
        os_numero: os.numero || '',
        cliente: os.cliente || '',
        equipe: os.equipe || '',
        veiculo: os.veiculo || '',
      }));
      setSelecionada(null);
      setErroForm('');
      setModal('form');
      // Limpar state para não reabrir ao navegar
      window.history.replaceState({}, document.title);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selecionarOS = (osId) => {
    if (!osId) { setForm(f => ({ ...f, os_id: '', os_numero: '', cliente: '', cliente_id: '', equipe: '', veiculo: '' })); return; }
    const os = osList.find(o => String(o.id) === String(osId));
    if (!os) return;
    setForm(f => ({
      ...f,
      os_id: osId,
      os_numero: os.numero || '',
      cliente: os.cliente || '',
      cliente_id: os.cliente_id || '',
      equipe: os.equipe || '',
      veiculo: os.veiculo || '',
    }));
  };

  const abrirNova = () => {
    setSelecionada(null);
    setForm(EMPTY_FORM);
    setErroForm('');
    setModal('form');
  };

  const abrirEditar = (a) => {
    setSelecionada(a);
    setForm({
      os_id: a.os_id || '',
      os_numero: a.os_numero || '',
      cliente: a.cliente || '',
      cliente_id: a.cliente_id || '',
      equipe: a.equipe || '',
      veiculo: a.veiculo || '',
      organizer_id: a.organizer_id || '',
      tipo: a.tipo || 'outro',
      descricao: a.descricao || '',
      valor_estimado: a.valor_estimado ? String(a.valor_estimado) : '',
      observacoes: a.observacoes || '',
      status: a.status || 'aberta',
    });
    setErroForm('');
    setModal('form');
  };

  const abrirDetalhe = (a) => {
    setSelecionada(a);
    setModal('detalhe');
  };

  const salvar = async () => {
    if (!form.cliente.trim()) { setErroForm('Nome do cliente é obrigatório'); return; }
    if (!form.descricao.trim()) { setErroForm('Descrição é obrigatória'); return; }
    setSalvando(true);
    try {
      const payload = {
        ...form,
        os_id: form.os_id ? parseInt(form.os_id) : null,
        cliente_id: form.cliente_id || null,
        organizer_id: form.organizer_id || null,
        valor_estimado: parseFloat(form.valor_estimado) || 0,
      };
      if (selecionada) await api.updateAvaria(selecionada.id, payload);
      else await api.createAvaria(payload);
      setModal(null);
      carregar();
    } catch (e) { setErroForm(e.message); }
    finally { setSalvando(false); }
  };

  const atualizarStatus = async (a, novoStatus) => {
    try {
      await api.updateAvaria(a.id, { status: novoStatus });
      carregar();
    } catch (e) { alert(e.message); }
  };

  const deletar = async (id) => {
    if (!confirm('Excluir avaria?')) return;
    try { await api.deleteAvaria(id); carregar(); }
    catch (e) { alert(e.message); }
  };

  const filtradas = avarias.filter(a => {
    const q = busca.toLowerCase();
    return !busca || (a.cliente || '').toLowerCase().includes(q) || (a.os_numero || '').toLowerCase().includes(q) || (a.descricao || '').toLowerCase().includes(q);
  });

  // Dados para gráficos
  const dadosPorTipo = resumo ? Object.entries(resumo.por_tipo || {}).map(([tipo, count]) => ({
    name: TIPOS.find(t => t.value === tipo)?.label || tipo,
    value: count,
  })) : [];

  const dadosPorStatus = STATUS_ORDER.map(s => ({
    name: STATUS[s]?.label || s,
    value: avarias.filter(a => a.status === s).length,
  })).filter(d => d.value > 0);

  if (loading) return <Spinner />;
  if (error) return <Erro msg={error} onRetry={carregar} />;

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={22} color="#ef4444" /> Avarias
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            Controle de intercorrências operacionais · {avarias.length} registros
          </p>
        </div>
        <button onClick={abrirNova}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
          <Plus size={14} /> Registrar Avaria
        </button>
      </div>

      {/* KPI Cards */}
      {resumo && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total',         value: resumo.total,          color: '#6b7280', bg: '#f3f4f6' },
            { label: 'Abertas',       value: resumo.abertas,        color: '#b91c1c', bg: '#fee2e2' },
            { label: 'Em Análise',    value: resumo.em_analise,     color: '#92400e', bg: '#fef9c3' },
            { label: 'Resolvidas',    value: resumo.resolvidas,     color: '#15803d', bg: '#dcfce7' },
            { label: 'Valor Estimado', value: fmt(resumo.valor_total_estimado), color: '#1d4ed8', bg: '#dbeafe' },
          ].map((k, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '0.5px solid #e5e7eb', borderLeft: `4px solid ${k.color}` }}>
              <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k.label}</p>
              <p style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      {avarias.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '0.5px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>Por Tipo de Avaria</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={dadosPorTipo} cx="50%" cy="50%" outerRadius={75} dataKey="value" nameKey="name" paddingAngle={2}>
                  {dadosPorTipo.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '0.5px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>Por Status</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dadosPorStatus} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" name="Avarias" radius={[4, 4, 0, 0]}>
                  {dadosPorStatus.map((entry, i) => {
                    const status = STATUS_ORDER.find(s => STATUS[s]?.label === entry.name);
                    const color = status ? STATUS[status]?.color : '#6b7280';
                    return <Cell key={i} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input placeholder="Buscar por cliente, OS, descrição..." value={busca} onChange={e => setBusca(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '36px' }} />
        </div>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          style={{ padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', background: 'white' }}>
          <option value="todos">Todos os status</option>
          {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS[s]?.label}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['Data', 'Cliente', 'OS', 'Tipo', 'Descrição', 'Valor Est.', 'Status', 'Ações'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                <AlertTriangle size={28} style={{ margin: '0 auto 8px', display: 'block', color: '#d1d5db' }} />
                {avarias.length === 0 ? 'Nenhuma avaria registrada' : 'Nenhuma avaria encontrada'}
              </td></tr>
            ) : filtradas.map(a => {
              const st = STATUS[a.status] || STATUS.aberta;
              const tipoLabel = TIPO_LABEL[a.tipo] || a.tipo;
              return (
                <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDate(a.created_at)}</td>
                  <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '600', color: '#1a1a1a', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.cliente || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: '#2563eb', fontWeight: '600', whiteSpace: 'nowrap' }}>{a.os_numero || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: '#374151', whiteSpace: 'nowrap' }}>{tipoLabel}</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: '#6b7280', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.descricao || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '600', color: '#dc2626', whiteSpace: 'nowrap' }}>{fmt(a.valor_estimado)}</td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: st.bg, color: st.color }}>
                      <st.icon size={10} /> {st.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={() => abrirDetalhe(a)} title="Detalhes"
                        style={{ padding: '4px 8px', background: '#f0f4ff', color: '#2563eb', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <FileText size={11} /> Ver
                      </button>
                      <button onClick={() => abrirEditar(a)} title="Editar"
                        style={{ padding: '4px 8px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>
                        <Edit size={11} />
                      </button>
                      {a.status === 'aberta' && (
                        <button onClick={() => atualizarStatus(a, 'em_analise')} title="Analisar"
                          style={{ padding: '4px 8px', background: '#fef9c3', color: '#92400e', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}>
                          Analisar
                        </button>
                      )}
                      {a.status === 'em_analise' && (
                        <button onClick={() => atualizarStatus(a, 'em_resolucao')} title="Resolver"
                          style={{ padding: '4px 8px', background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}>
                          Resolver
                        </button>
                      )}
                      {a.status === 'em_resolucao' && (
                        <button onClick={() => atualizarStatus(a, 'resolvida')} title="Marcar resolvida"
                          style={{ padding: '4px 8px', background: '#dcfce7', color: '#15803d', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}>
                          ✓ Resolvida
                        </button>
                      )}
                      <button onClick={() => deletar(a.id)} title="Excluir"
                        style={{ padding: '4px 7px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Formulário */}
      {modal === 'form' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '560px', maxHeight: '92vh', overflow: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fef2f2', borderRadius: '14px 14px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={18} color="#dc2626" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>
                  {selecionada ? 'Editar Avaria' : 'Registrar Avaria'}
                </h3>
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
            </div>

            <div style={{ padding: '24px' }}>
              {erroForm && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>{erroForm}</div>}

              {/* Vincular OS */}
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Vincular à OS <span style={{ color: '#9ca3af', fontWeight: '400' }}>(auto-preenche dados)</span></label>
                <select value={form.os_id} onChange={e => selecionarOS(e.target.value)} style={inputStyle}>
                  <option value="">— Sem OS vinculada —</option>
                  {osList.map(o => (
                    <option key={o.id} value={o.id}>{o.numero} · {o.cliente}</option>
                  ))}
                </select>
              </div>

              <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0 16px' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={labelStyle}>Cliente *</label>
                  <input value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} style={inputStyle} placeholder="Nome do cliente" />
                </div>
                <div>
                  <label style={labelStyle}>N° OS</label>
                  <input value={form.os_numero} onChange={e => setForm(f => ({ ...f, os_numero: e.target.value }))} style={inputStyle} placeholder="Ex: OS-2026-001" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={labelStyle}>Equipe</label>
                  <input value={form.equipe} onChange={e => setForm(f => ({ ...f, equipe: e.target.value }))} style={inputStyle} placeholder="Nomes da equipe" />
                </div>
                <div>
                  <label style={labelStyle}>Veículo</label>
                  <input value={form.veiculo} onChange={e => setForm(f => ({ ...f, veiculo: e.target.value }))} style={inputStyle} placeholder="Caminhão / placa" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={labelStyle}>Tipo de Avaria *</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={inputStyle}>
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Valor Estimado (R$)</label>
                  <input type="number" value={form.valor_estimado} onChange={e => setForm(f => ({ ...f, valor_estimado: e.target.value }))} style={inputStyle} placeholder="0.00" />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Descrição da Avaria *</label>
                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }}
                  placeholder="Descreva detalhadamente o que aconteceu..." />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  rows={2} style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="Providências tomadas, contato com cliente, etc." />
              </div>

              {selecionada && (
                <div style={{ marginBottom: '4px' }}>
                  <label style={labelStyle}>Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                    {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS[s]?.label}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setModal(null)}
                style={{ padding: '9px 20px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', opacity: salvando ? 0.7 : 1 }}>
                <AlertTriangle size={14} /> {salvando ? 'Salvando...' : (selecionada ? 'Salvar' : 'Registrar Avaria')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhe */}
      {modal === 'detalhe' && selecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Detalhes da Avaria</h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              {/* Status badge */}
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
                  background: STATUS[selecionada.status]?.bg, color: STATUS[selecionada.status]?.color
                }}>
                  {React.createElement(STATUS[selecionada.status]?.icon || AlertTriangle, { size: 13 })}
                  {STATUS[selecionada.status]?.label || selecionada.status}
                </span>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Registrado em {fmtDate(selecionada.created_at)}</span>
              </div>

              {[
                ['Cliente', selecionada.cliente],
                ['Ordem de Serviço', selecionada.os_numero],
                ['Tipo', TIPO_LABEL[selecionada.tipo] || selecionada.tipo],
                ['Equipe', selecionada.equipe],
                ['Veículo', selecionada.veiculo],
                ['Valor Estimado', fmt(selecionada.valor_estimado)],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} style={{ display: 'flex', gap: '12px', marginBottom: '12px', padding: '10px 12px', background: '#f9fafb', borderRadius: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', minWidth: '110px' }}>{label}:</span>
                  <span style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: '500' }}>{value}</span>
                </div>
              ))}

              <div style={{ marginTop: '16px' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>DESCRIÇÃO:</p>
                <p style={{ fontSize: '14px', color: '#1a1a1a', lineHeight: '1.6', background: '#fef2f2', padding: '12px', borderRadius: '8px', margin: 0 }}>{selecionada.descricao}</p>
              </div>

              {selecionada.observacoes && (
                <div style={{ marginTop: '14px' }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>OBSERVAÇÕES:</p>
                  <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', margin: 0 }}>{selecionada.observacoes}</p>
                </div>
              )}

              {/* Progressão de status */}
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '12px' }}>ATUALIZAR STATUS:</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {STATUS_ORDER.map(s => (
                    <button key={s}
                      onClick={() => { atualizarStatus(selecionada, s); setSelecionada({ ...selecionada, status: s }); }}
                      style={{
                        padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: '500',
                        background: selecionada.status === s ? STATUS[s]?.color : STATUS[s]?.bg,
                        color: selecionada.status === s ? 'white' : STATUS[s]?.color,
                        border: `1px solid ${STATUS[s]?.color}30`,
                      }}>
                      {STATUS[s]?.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setModal(null); abrirEditar(selecionada); }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <Edit size={13} /> Editar
              </button>
              <button onClick={() => setModal(null)}
                style={{ padding: '9px 20px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                Fechar
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
    <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTop: '3px solid #dc2626', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>Carregando avarias...</p>
  </div>
);

const Erro = ({ msg, onRetry }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
    <div style={{ textAlign: 'center', color: '#ef4444' }}>
      <AlertCircle size={32} />
      <p style={{ marginTop: '8px' }}>{msg}</p>
      <button onClick={onRetry} style={{ marginTop: '12px', padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
        Tentar novamente
      </button>
    </div>
  </div>
);

export default Avarias;
