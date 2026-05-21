import React, { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Edit, Trash2, AlertCircle, X, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };
const EMPTY = { material: '', quantidade: '', estoque_minimo: '10', estoque_critico: '5', valor_unitario: '' };

const Estoque = () => {
  const [itens, setItens] = useState([]);
  const [alertasCriticos, setAlertasCriticos] = useState([]);
  const [alertasBaixo, setAlertasBaixo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');

  const carregar = useCallback(() => {
    setLoading(true);
    api.getEstoque()
      .then(data => {
        setItens(data.items || []);
        setAlertasCriticos(data.alertas_criticos || []);
        setAlertasBaixo(data.alertas_baixo || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrir = (e = null) => {
    setEditando(e);
    setForm(e ? {
      material: e.material,
      quantidade: String(e.quantidade),
      estoque_minimo: String(e.estoque_minimo),
      estoque_critico: String(e.estoque_critico || 5),
      valor_unitario: String(e.valor_unitario),
    } : EMPTY);
    setErroForm('');
    setShowModal(true);
  };

  const salvar = async () => {
    if (!form.material.trim()) { setErroForm('Material é obrigatório'); return; }
    setSalvando(true);
    try {
      const payload = { material: form.material, quantidade: parseInt(form.quantidade) || 0, estoque_minimo: parseInt(form.estoque_minimo) || 10, estoque_critico: parseInt(form.estoque_critico) || 5, valor_unitario: parseFloat(form.valor_unitario) || 0 };
      if (editando) await api.updateEstoque(editando.id, payload);
      else await api.createEstoque(payload);
      setShowModal(false);
      carregar();
    } catch (e) { setErroForm(e.message); }
    finally { setSalvando(false); }
  };

  const deletar = async (id) => {
    if (!confirm('Remover item do estoque?')) return;
    try { await api.deleteEstoque(id); carregar(); }
    catch (e) { alert(e.message); }
  };

  const totalAlertas = alertasCriticos.length + alertasBaixo.length;

  if (loading) return <Spinner />;
  if (error) return <Erro msg={error} onRetry={carregar} />;

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 4px' }}>Estoque de Materiais</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            {itens.length} itens cadastrados
            {totalAlertas > 0 && <span style={{ color: '#ea580c', marginLeft: '8px' }}>· ⚠️ {totalAlertas} em alerta</span>}
          </p>
        </div>
        <button onClick={() => abrir()}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
          <Plus size={14} /> Novo Item
        </button>
      </div>

      {totalAlertas > 0 && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={16} color="#ea580c" />
          <span style={{ fontSize: '13px', color: '#ea580c', fontWeight: '500' }}>
            {alertasCriticos.length > 0 && `${alertasCriticos.length} crítico(s)`}
            {alertasCriticos.length > 0 && alertasBaixo.length > 0 && ' · '}
            {alertasBaixo.length > 0 && `${alertasBaixo.length} abaixo do mínimo`}
            . Verifique o estoque!
          </span>
        </div>
      )}

      {/* Gráficos */}
      {itens.length > 0 && (() => {
        const ok = itens.filter(i => !i.alerta).length;
        const baixo = alertasBaixo.length;
        const critico = alertasCriticos.length;
        const pieData = [
          { name: 'Estoque OK', value: ok, color: '#10b981' },
          { name: 'Estoque Baixo', value: baixo, color: '#f59e0b' },
          { name: 'Crítico', value: critico, color: '#ef4444' },
        ].filter(d => d.value > 0);

        const topItens = [...itens].sort((a, b) => (b.quantidade * b.valor_unitario) - (a.quantidade * a.valor_unitario)).slice(0, 6);
        const totalValor = itens.reduce((s, i) => s + i.quantidade * i.valor_unitario, 0);

        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Pizza status */}
            <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb', padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 12px' }}>📊 Status do Estoque</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} itens`, n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Top valor */}
            <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb', padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 12px' }}>💰 Top Itens por Valor</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {topItens.map(i => {
                  const val = i.quantidade * i.valor_unitario;
                  const pct = totalValor > 0 ? (val / totalValor * 100) : 0;
                  return (
                    <div key={i.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#374151', marginBottom: '2px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{i.material}</span>
                        <span style={{ fontWeight: '600' }}>{fmt(val)}</span>
                      </div>
                      <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '3px' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#3b82f6', borderRadius: '3px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Material', 'Quantidade', 'Mínimo / Crítico', 'Valor Unitário', 'Valor Total', 'Alerta', 'Ações'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>Nenhum item cadastrado</td></tr>
            ) : itens.map(i => {
              const cor = i.alerta === 'critico' ? '#dc2626' : i.alerta === 'baixo' ? '#ea580c' : null;
              return (
              <tr key={i.id} style={{ borderTop: '0.5px solid #f3f4f6', background: cor ? '#fffbf5' : 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.background = cor ? '#fff7ed' : '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = cor ? '#fffbf5' : 'transparent'}>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>{i.material}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: cor || '#1a1a1a', fontWeight: cor ? '700' : '400' }}>
                  {i.quantidade}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{i.estoque_minimo} / {i.estoque_critico}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{fmt(i.valor_unitario)}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{fmt(i.quantidade * i.valor_unitario)}</td>
                <td style={{ padding: '12px 16px' }}>
                  {i.alerta === 'critico' ? (
                    <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: '#fef2f2', color: '#dc2626', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                      <AlertTriangle size={10} /> Crítico
                    </span>
                  ) : i.alerta === 'baixo' ? (
                    <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: '#fff7ed', color: '#ea580c', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                      <AlertTriangle size={10} /> Baixo
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: '#f0fdf4', color: '#16a34a', fontWeight: '500' }}>OK</span>
                  )}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => abrir(i)} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit size={15} /></button>
                    <button onClick={() => deletar(i.id)} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '440px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{editando ? 'Editar Item' : 'Novo Item'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Material *</label>
              <input value={form.material} onChange={e => setForm({ ...form, material: e.target.value })} placeholder="Ex: Caixa de papelão grande" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              {[['Quantidade', 'quantidade', '0'], ['Mínimo', 'estoque_minimo', '10'], ['Crítico', 'estoque_critico', '5'], ['Valor un.', 'valor_unitario', '0.00']].map(([label, key, ph]) => (
                <div key={key}>
                  <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>{label}</label>
                  <input type="number" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={ph} style={inputStyle} />
                </div>
              ))}
            </div>
            {erroForm && <p style={{ color: '#dc2626', fontSize: '13px' }}>{erroForm}</p>}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'white' }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando} style={{ padding: '9px 18px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
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

export default Estoque;
