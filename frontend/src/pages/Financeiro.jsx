import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Plus, Edit, Trash2, AlertCircle, X, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { api } from '../lib/api';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };
const CATEGORIAS = ['Combustível', 'Salários', 'Manutenção', 'Materiais', 'Aluguel', 'Marketing', 'Impostos', 'Outros'];
const CORES_PIZZA = ['#2563eb','#7c3aed','#0891b2','#16a34a','#dc2626','#d97706','#0d9488','#6b7280'];
const EMPTY_DESP = { categoria: 'Combustível', descricao: '', valor: '', data: new Date().toISOString().slice(0, 10) };
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const Financeiro = () => {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [resumo, setResumo] = useState(null);
  const [despesas, setDespesas] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(EMPTY_DESP);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [aba, setAba] = useState('visao_geral');

  const carregar = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.getResumoFinanceiro({ mes, ano }),
      api.getDespesas({ mes, ano }),
      api.getFinanceiroHistorico(),
    ])
      .then(([r, d, h]) => { setResumo(r); setDespesas(d); setHistorico(h); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [mes, ano]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirModal = (d = null) => {
    setEditando(d);
    setForm(d ? { categoria: d.categoria, descricao: d.descricao || '', valor: String(d.valor), data: d.data ? d.data.slice(0, 10) : '' } : EMPTY_DESP);
    setErroForm('');
    setShowModal(true);
  };

  const salvar = async () => {
    if (!form.valor) { setErroForm('Valor é obrigatório'); return; }
    setSalvando(true);
    try {
      const payload = { ...form, valor: parseFloat(form.valor), data: form.data + 'T12:00:00' };
      if (editando) await api.updateDespesa(editando.id, payload);
      else await api.createDespesa(payload);
      setShowModal(false);
      carregar();
    } catch (e) { setErroForm(e.message); }
    finally { setSalvando(false); }
  };

  const deletar = async (id) => {
    if (!window.confirm('Excluir despesa?')) return;
    try { await api.deleteDespesa(id); carregar(); }
    catch (e) { alert(e.message); }
  };

  if (loading) return <Spinner />;
  if (error) return <Erro msg={error} onRetry={carregar} />;

  const r = resumo || {};
  const margem = r.margem_percentual || 0;
  const margemColor = margem >= 30 ? '#16a34a' : margem >= 15 ? '#d97706' : '#dc2626';

  const despPorCategoria = CATEGORIAS.map(cat => ({
    name: cat,
    value: despesas.filter(d => d.categoria === cat).reduce((s, d) => s + d.valor, 0)
  })).filter(d => d.value > 0);

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 4px' }}>Financeiro</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Receitas, despesas e resultado do negócio</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select value={mes} onChange={e => setMes(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none' }}>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <input type="number" value={ano} onChange={e => setAno(Number(e.target.value))}
            style={{ width: '80px', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
          <button onClick={() => abrirModal()}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
            <Plus size={14} /> Nova Despesa
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'Receita Mudanças', value: fmt(r.receita_mudancas), icon: TrendingUp, color: '#2563eb', bg: '#dbeafe' },
          { label: 'Guarda-Móveis', value: fmt(r.receita_guarda_moveis), icon: TrendingUp, color: '#7c3aed', bg: '#ede9fe' },
          { label: 'Receita Total', value: fmt(r.receita_total), icon: DollarSign, color: '#0891b2', bg: '#e0f2fe' },
          { label: 'Total Despesas', value: fmt(r.total_despesas), icon: TrendingDown, color: '#dc2626', bg: '#fee2e2' },
          { label: 'Resultado', value: fmt(r.lucro_liquido), icon: BarChart2, color: (r.lucro_liquido||0) >= 0 ? '#16a34a' : '#dc2626', bg: (r.lucro_liquido||0) >= 0 ? '#dcfce7' : '#fee2e2' },
        ].map((c, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ background: c.bg, borderRadius: 8, padding: 6, display: 'flex' }}>
                <c.icon size={14} color={c.color} />
              </div>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: 0, fontWeight: '600', textTransform: 'uppercase' }}>{c.label}</p>
            </div>
            <p style={{ fontSize: '18px', fontWeight: '700', color: c.color, margin: 0 }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Barra de margem */}
      <div style={{ background: 'white', borderRadius: 12, padding: '14px 20px', border: '1px solid #e5e7eb', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ minWidth: 100 }}>
          <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase' }}>Margem</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: margemColor, margin: 0 }}>{margem.toFixed(1)}%</p>
        </div>
        <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 8, height: 10, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, Math.max(0, margem))}%`, height: '100%', background: margemColor, borderRadius: 8, transition: 'width 0.5s' }} />
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
          🎯 Meta: 30% &nbsp;|&nbsp; Mudanças: {r.mudancas_realizadas || 0} &nbsp;|&nbsp; Ticket: {fmt(r.ticket_medio)}
        </div>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid #e5e7eb' }}>
        {[
          { key: 'visao_geral', label: 'Visão Geral' },
          { key: 'graficos', label: 'Gráficos' },
          { key: 'despesas', label: `Despesas (${despesas.length})` },
        ].map(a => (
          <button key={a.key} onClick={() => setAba(a.key)}
            style={{ padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              borderBottom: `2px solid ${aba === a.key ? '#1d4ed8' : 'transparent'}`,
              color: aba === a.key ? '#1d4ed8' : '#6b7280', background: 'none', marginBottom: -2 }}>
            {a.label}
          </button>
        ))}
      </div>

      {/* Visão Geral */}
      {aba === 'visao_geral' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', background: '#f0fdf4', borderBottom: '1px solid #dcfce7' }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#15803d' }}>📈 Receitas — {MESES[mes-1]}/{ano}</h3>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {[
                { label: 'Mudanças realizadas', value: r.receita_mudancas, sub: `${r.mudancas_realizadas || 0} serviços` },
                { label: 'Guarda-Móveis (mensal)', value: r.receita_guarda_moveis, sub: null },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, color: '#374151' }}>{item.label}</p>
                    {item.sub && <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{item.sub}</p>}
                  </div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#15803d' }}>{fmt(item.value)}</p>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', marginTop: 4 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>TOTAL RECEITAS</p>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#15803d' }}>{fmt(r.receita_total)}</p>
              </div>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', background: '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#b91c1c' }}>📊 DRE Simplificado — {MESES[mes-1]}/{ano}</h3>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>Receita Total</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#15803d' }}>{fmt(r.receita_total)}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>(−) Despesas Operacionais</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#dc2626' }}>({fmt(r.total_despesas)})</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', marginTop: 4, borderTop: '2px solid #e5e7eb' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>RESULTADO LÍQUIDO</p>
                  <p style={{ margin: 0, fontSize: 11, color: margemColor, fontWeight: 600 }}>Margem: {margem.toFixed(1)}%</p>
                </div>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: (r.lucro_liquido||0) >= 0 ? '#15803d' : '#dc2626' }}>{fmt(r.lucro_liquido)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gráficos */}
      {aba === 'graficos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '20px', gridColumn: '1 / -1' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Evolução dos últimos 12 meses</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={historico} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend />
                <Bar dataKey="receita" name="Receita" fill="#2563eb" radius={[4,4,0,0]} />
                <Bar dataKey="despesas" name="Despesas" fill="#dc2626" radius={[4,4,0,0]} />
                <Bar dataKey="lucro" name="Lucro" fill="#16a34a" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Tendência de Resultado</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={historico} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Line type="monotone" dataKey="lucro" name="Resultado" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="receita" name="Receita" stroke="#2563eb" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Despesas por Categoria — {MESES[mes-1]}/{ano}</h3>
            {despPorCategoria.length === 0 ? (
              <p style={{ color: '#9ca3af', textAlign: 'center', paddingTop: 60 }}>Sem despesas no período</p>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <ResponsiveContainer width={180} height={200}>
                  <PieChart>
                    <Pie data={despPorCategoria} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value">
                      {despPorCategoria.map((_, i) => <Cell key={i} fill={CORES_PIZZA[i % CORES_PIZZA.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1 }}>
                  {despPorCategoria.map((d, i) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: CORES_PIZZA[i % CORES_PIZZA.length], flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#374151', flex: 1 }}>{d.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Despesas */}
      {aba === 'despesas' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>Despesas — {MESES[mes - 1]}/{ano}</h2>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              {despesas.length} lançamentos · Total: <strong style={{ color: '#dc2626' }}>{fmt(despesas.reduce((s,d) => s+d.valor, 0))}</strong>
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Data', 'Categoria', 'Descrição', 'Valor', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {despesas.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>Nenhuma despesa neste mês</td></tr>
              ) : despesas.map(d => (
                <tr key={d.id} style={{ borderTop: '0.5px solid #f3f4f6' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{d.data ? new Date(d.data).toLocaleDateString('pt-BR') : '–'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                    <span style={{ background: '#f3f4f6', color: '#374151', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 500 }}>{d.categoria}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{d.descricao || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#dc2626' }}>{fmt(d.valor)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => abrirModal(d)} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit size={15} /></button>
                      <button onClick={() => deletar(d.id)} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '440px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{editando ? 'Editar Despesa' : 'Nova Despesa'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Categoria</label>
              <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} style={inputStyle}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Descrição</label>
              <input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição opcional" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Valor (R$) *</label>
                <input type="number" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} placeholder="0.00" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Data</label>
                <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} style={inputStyle} />
              </div>
            </div>
            {erroForm && <p style={{ color: '#dc2626', fontSize: '13px' }}>{erroForm}</p>}
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
};

const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
    <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTop: '3px solid #0f1f3d', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
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

export default Financeiro;
