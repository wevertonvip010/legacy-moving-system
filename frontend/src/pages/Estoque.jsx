import React, { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Edit, Trash2, AlertCircle, X, AlertTriangle, BookOpen, ChevronRight, RefreshCw, ArrowUp, ArrowDown, History, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (s) => s ? new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };

const CATEGORIAS = ['embalagem', 'ferramenta', 'limpeza', 'escritorio', 'seguranca', 'outros'];
const UNIDADES = ['un', 'cx', 'pct', 'kg', 'lt', 'm', 'm²', 'rolo', 'par'];

const EMPTY_ESTOQUE = { material: '', quantidade: '', estoque_minimo: '10', estoque_critico: '5', valor_unitario: '' };
const EMPTY_MATERIAL = { nome: '', categoria: 'embalagem', unidade: 'un', custo_unitario: '', quantidade_minima: '10', quantidade_critica: '5', descricao: '', ativo: true, fornecedor: '', lote: '', data_compra: '' };

const TIPO_CORES = {
  entrada: { bg: '#f0fdf4', c: '#15803d', label: '↑ Entrada' },
  saida: { bg: '#fef2f2', c: '#dc2626', label: '↓ Saída' },
  consumo_os: { bg: '#fef3c7', c: '#92400e', label: '⚙ OS' },
  ajuste: { bg: '#eff6ff', c: '#2563eb', label: '~ Ajuste' },
  perda: { bg: '#fdf4ff', c: '#9333ea', label: '✗ Perda' },
  avaria: { bg: '#fff1f2', c: '#be123c', label: '⚠ Avaria' },
  devolucao: { bg: '#f0fdf4', c: '#16a34a', label: '← Dev.' },
  reserva: { bg: '#f8fafc', c: '#475569', label: '⏸ Reserva' },
};

// ── ESTOQUE (posições) ────────────────────────────────────────────────────────
const AbaEstoque = () => {
  const [itens, setItens] = useState([]);
  const [alertasCriticos, setAlertasCriticos] = useState([]);
  const [alertasBaixo, setAlertasBaixo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(EMPTY_ESTOQUE);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  // Movimentação rápida
  const [movItem, setMovItem] = useState(null); // item para movimentar
  const [movTipo, setMovTipo] = useState('entrada'); // entrada|saida
  const [movQtd, setMovQtd] = useState('');
  const [movObs, setMovObs] = useState('');
  const [movSalvando, setMovSalvando] = useState(false);
  const [movErro, setMovErro] = useState('');
  // Histórico do item
  const [histItem, setHistItem] = useState(null);
  const [histMovs, setHistMovs] = useState([]);
  const [histLoading, setHistLoading] = useState(false);

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
      material: e.material || e.material_nome || '',
      quantidade: String(e.quantidade),
      estoque_minimo: String(e.estoque_minimo),
      estoque_critico: String(e.estoque_critico || 5),
      valor_unitario: String(e.valor_unitario),
    } : EMPTY_ESTOQUE);
    setErroForm('');
    setShowModal(true);
  };

  const salvar = async () => {
    if (!form.material.trim()) { setErroForm('Material é obrigatório'); return; }
    setSalvando(true);
    try {
      const payload = {
        material: form.material,
        quantidade: parseInt(form.quantidade) || 0,
        estoque_minimo: parseInt(form.estoque_minimo) || 10,
        estoque_critico: parseInt(form.estoque_critico) || 5,
        valor_unitario: parseFloat(form.valor_unitario) || 0,
      };
      if (editando) await api.updateEstoque(editando.id, payload);
      else await api.createEstoque(payload);
      setShowModal(false);
      carregar();
    } catch (e) { setErroForm(e.message); }
    finally { setSalvando(false); }
  };

  const abrirMovimentacao = (item, tipo) => {
    setMovItem(item);
    setMovTipo(tipo);
    setMovQtd('');
    setMovObs('');
    setMovErro('');
  };

  const salvarMovimentacao = async () => {
    const qtd = parseFloat(movQtd);
    if (!qtd || qtd <= 0) { setMovErro('Informe uma quantidade válida'); return; }
    setMovSalvando(true);
    try {
      if (movTipo === 'entrada') {
        await api.entradaEstoque(movItem.id, { quantidade: qtd, observacao: movObs || 'Entrada manual' });
      } else {
        await api.saidaEstoque(movItem.id, { quantidade: qtd, observacao: movObs || 'Saída manual' });
      }
      setMovItem(null);
      carregar();
    } catch (e) { setMovErro(e.message); }
    finally { setMovSalvando(false); }
  };

  const verHistorico = async (item) => {
    setHistItem(item);
    setHistMovs([]);
    setHistLoading(true);
    try {
      const movs = await api.getMovimentacoes(item.id);
      setHistMovs(movs);
    } catch (e) { setHistMovs([]); }
    finally { setHistLoading(false); }
  };

  if (loading) return <Spinner />;
  if (error) return <Erro msg={error} onRetry={carregar} />;

  const totalAlertas = alertasCriticos.length + alertasBaixo.length;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
          {itens.length} itens cadastrados
          {totalAlertas > 0 && <span style={{ color: '#ea580c', marginLeft: '8px' }}>· ⚠️ {totalAlertas} em alerta</span>}
        </p>
        <button onClick={() => abrir()}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 14px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
          <Plus size={14} /> Nova Posição
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

      {itens.length > 0 && (() => {
        const ok = itens.filter(i => !i.alerta).length;
        const baixo = alertasBaixo.length;
        const critico = alertasCriticos.length;
        const pieData = [
          { name: 'OK', value: ok, color: '#10b981' },
          { name: 'Baixo', value: baixo, color: '#f59e0b' },
          { name: 'Crítico', value: critico, color: '#ef4444' },
        ].filter(d => d.value > 0);
        const topItens = [...itens].sort((a, b) => (b.quantidade * b.valor_unitario) - (a.quantidade * a.valor_unitario)).slice(0, 6);
        const totalValor = itens.reduce((s, i) => s + i.quantidade * i.valor_unitario, 0);
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb', padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 12px' }}>📊 Status do Estoque</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={4} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} itens`, n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb', padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 12px' }}>💰 Top Itens por Valor</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {topItens.map(i => {
                  const val = i.quantidade * i.valor_unitario;
                  const pct = totalValor > 0 ? (val / totalValor * 100) : 0;
                  return (
                    <div key={i.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#374151', marginBottom: '2px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{i.material_nome || i.material}</span>
                        <span style={{ fontWeight: '600' }}>{fmt(val)}</span>
                      </div>
                      <div style={{ height: '5px', background: '#f3f4f6', borderRadius: '3px' }}>
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
              {['Material', 'Categoria', 'Qtd', 'Mín/Crít', 'Valor Un.', 'Total', 'Status', 'Ações'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>Nenhum item cadastrado</td></tr>
            ) : itens.map(i => {
              const cor = i.alerta === 'critico' ? '#dc2626' : i.alerta === 'baixo' ? '#ea580c' : null;
              return (
                <tr key={i.id} style={{ borderTop: '0.5px solid #f3f4f6', background: cor ? '#fffbf5' : 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = cor ? '#fff7ed' : '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = cor ? '#fffbf5' : 'transparent'}>
                  <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>{i.material_nome || i.material}</td>
                  <td style={{ padding: '11px 14px', fontSize: '12px', color: '#6b7280' }}>
                    {i.categoria ? <span style={{ background: '#f3f4f6', padding: '2px 7px', borderRadius: '12px' }}>{i.categoria}</span> : '—'}
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: '14px', color: cor || '#1a1a1a', fontWeight: cor ? '700' : '500' }}>
                    {i.quantidade} <span style={{ fontSize: '11px', color: '#9ca3af' }}>{i.unidade}</span>
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: '12px', color: '#6b7280' }}>{i.estoque_minimo} / {i.estoque_critico}</td>
                  <td style={{ padding: '11px 14px', fontSize: '13px', color: '#6b7280' }}>{fmt(i.valor_unitario)}</td>
                  <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{fmt(i.quantidade * i.valor_unitario)}</td>
                  <td style={{ padding: '11px 14px' }}>
                    {i.alerta === 'critico' ? (
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#fef2f2', color: '#dc2626', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px', width: 'fit-content' }}>
                        <AlertTriangle size={10} /> Crítico
                      </span>
                    ) : i.alerta === 'baixo' ? (
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#fff7ed', color: '#ea580c', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '3px', width: 'fit-content' }}>
                        <AlertTriangle size={10} /> Baixo
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#f0fdf4', color: '#16a34a', fontWeight: '500' }}>OK</span>
                    )}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <button onClick={() => abrirMovimentacao(i, 'entrada')} title="Entrada" style={{ padding: '4px 7px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', color: '#15803d', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <ArrowUp size={11} /> +
                      </button>
                      <button onClick={() => abrirMovimentacao(i, 'saida')} title="Saída" style={{ padding: '4px 7px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', color: '#dc2626', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <ArrowDown size={11} /> −
                      </button>
                      <button onClick={() => verHistorico(i)} title="Histórico" style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><History size={14} /></button>
                      <button onClick={() => abrir(i)} title="Editar" style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit size={14} /></button>
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
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '460px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{editando ? 'Editar Posição' : 'Nova Posição de Estoque'}</h3>
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
            {erroForm && <p style={{ color: '#dc2626', fontSize: '13px', margin: '0 0 8px' }}>{erroForm}</p>}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'white' }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando} style={{ padding: '9px 18px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal movimentação rápida */}
      {movItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '400px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: movTipo === 'entrada' ? '#15803d' : '#dc2626' }}>
                {movTipo === 'entrada' ? '↑ Entrada de Estoque' : '↓ Saída de Estoque'}
              </h3>
              <button onClick={() => setMovItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>{movItem.material_nome || movItem.material}</p>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>Estoque atual: <strong>{movItem.quantidade} {movItem.unidade || 'un'}</strong></p>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Quantidade *</label>
              <input type="number" min="1" value={movQtd} onChange={e => setMovQtd(e.target.value)}
                placeholder="Ex: 50" style={inputStyle} autoFocus />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Observação</label>
              <input value={movObs} onChange={e => setMovObs(e.target.value)}
                placeholder={movTipo === 'entrada' ? 'Compra, devolução...' : 'Consumo, perda...'}
                style={inputStyle} />
            </div>
            {movErro && <p style={{ color: '#dc2626', fontSize: '13px', margin: '0 0 8px' }}>{movErro}</p>}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setMovItem(null)} style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'white' }}>Cancelar</button>
              <button onClick={salvarMovimentacao} disabled={movSalvando}
                style={{ padding: '9px 18px', background: movTipo === 'entrada' ? '#15803d' : '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                {movSalvando ? 'Salvando...' : (movTipo === 'entrada' ? 'Confirmar Entrada' : 'Confirmar Saída')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal histórico do item */}
      {histItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '680px', maxWidth: '95vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Histórico de Movimentações</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>{histItem.material_nome || histItem.material} — estoque atual: <strong>{histItem.quantidade}</strong></p>
              </div>
              <button onClick={() => setHistItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {histLoading ? <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>Carregando...</div> :
               histMovs.length === 0 ? <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af', fontSize: '14px' }}>Nenhuma movimentação registrada</div> :
               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                 <thead>
                   <tr style={{ background: '#f9fafb' }}>
                     {['Data', 'Tipo', 'Qtd', 'Anterior → Posterior', 'OS', 'Usuário', 'Observação'].map(h => (
                       <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                     ))}
                   </tr>
                 </thead>
                 <tbody>
                   {histMovs.map(m => {
                     const tc = TIPO_CORES[m.tipo] || { bg: '#f3f4f6', c: '#374151', label: m.tipo };
                     return (
                       <tr key={m.id} style={{ borderTop: '0.5px solid #f3f4f6' }}>
                         <td style={{ padding: '9px 12px', fontSize: '12px', color: '#374151', whiteSpace: 'nowrap' }}>{fmtDate(m.created_at)}</td>
                         <td style={{ padding: '9px 12px' }}>
                           <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '12px', background: tc.bg, color: tc.c, fontWeight: '600', whiteSpace: 'nowrap' }}>{tc.label}</span>
                         </td>
                         <td style={{ padding: '9px 12px', fontSize: '13px', fontWeight: '700', color: m.tipo === 'entrada' || m.tipo === 'devolucao' ? '#15803d' : '#dc2626' }}>
                           {m.tipo === 'entrada' || m.tipo === 'devolucao' ? '+' : '-'}{m.quantidade}
                         </td>
                         <td style={{ padding: '9px 12px', fontSize: '12px', color: '#6b7280' }}>
                           {m.quantidade_anterior != null ? `${m.quantidade_anterior} → ${m.quantidade_posterior}` : '—'}
                         </td>
                         <td style={{ padding: '9px 12px', fontSize: '12px', color: '#2563eb' }}>{m.os_numero || '—'}</td>
                         <td style={{ padding: '9px 12px', fontSize: '12px', color: '#374151' }}>{m.user_nome || '—'}</td>
                         <td style={{ padding: '9px 12px', fontSize: '12px', color: '#9ca3af', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.observacao || '—'}</td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
              }
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ── CATÁLOGO DE MATERIAIS ─────────────────────────────────────────────────────
const AbaMateriais = () => {
  const [materiais, setMateriais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(EMPTY_MATERIAL);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [q, setQ] = useState('');

  const carregar = useCallback(() => {
    setLoading(true);
    api.getMateriais()
      .then(data => setMateriais(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrir = (m = null) => {
    setEditando(m);
    setForm(m ? {
      nome: m.nome,
      categoria: m.categoria,
      unidade: m.unidade,
      custo_unitario: String(m.custo_unitario || ''),
      quantidade_minima: String(m.quantidade_minima || ''),
      quantidade_critica: String(m.quantidade_critica || ''),
      descricao: m.descricao || '',
      ativo: m.ativo,
      fornecedor: m.fornecedor || '',
      lote: m.lote || '',
      data_compra: m.data_compra || '',
    } : EMPTY_MATERIAL);
    setErroForm('');
    setShowModal(true);
  };

  const salvar = async () => {
    if (!form.nome.trim()) { setErroForm('Nome é obrigatório'); return; }
    setSalvando(true);
    try {
      const payload = {
        nome: form.nome,
        categoria: form.categoria,
        unidade: form.unidade,
        custo_unitario: parseFloat(form.custo_unitario) || 0,
        quantidade_minima: parseFloat(form.quantidade_minima) || 0,
        quantidade_critica: parseFloat(form.quantidade_critica) || 0,
        descricao: form.descricao,
        ativo: form.ativo,
        fornecedor: form.fornecedor || '',
        lote: form.lote || '',
        data_compra: form.data_compra || null,
      };
      if (editando) await api.updateMaterial(editando.id, payload);
      else await api.createMaterial(payload);
      setShowModal(false);
      carregar();
    } catch (e) { setErroForm(e.message); }
    finally { setSalvando(false); }
  };

  const desativar = async (id, nome) => {
    if (!confirm(`Desativar o material "${nome}"?`)) return;
    try { await api.deleteMaterial(id); carregar(); }
    catch (e) { alert(e.message); }
  };

  if (loading) return <Spinner />;
  if (error) return <Erro msg={error} onRetry={carregar} />;

  const filtrados = materiais.filter(m => {
    const matchQ = !q || m.nome.toLowerCase().includes(q.toLowerCase());
    const matchCat = !filtroCategoria || m.categoria === filtroCategoria;
    return matchQ && matchCat;
  });

  const porCategoria = CATEGORIAS.reduce((acc, cat) => {
    acc[cat] = materiais.filter(m => m.categoria === cat && m.ativo).length;
    return acc;
  }, {});

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar material..."
            style={{ ...inputStyle, maxWidth: '240px' }}
          />
          <select
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
            style={{ ...inputStyle, maxWidth: '160px' }}
          >
            <option value="">Todas categorias</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={carregar} style={{ padding: '9px 10px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
            <RefreshCw size={14} />
          </button>
        </div>
        <button onClick={() => abrir()}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 14px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500', flexShrink: 0 }}>
          <Plus size={14} /> Novo Material
        </button>
      </div>

      {/* Resumo por categoria */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {CATEGORIAS.filter(c => porCategoria[c] > 0).map(cat => (
          <button key={cat}
            onClick={() => setFiltroCategoria(filtroCategoria === cat ? '' : cat)}
            style={{
              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontWeight: '500',
              background: filtroCategoria === cat ? '#0f1f3d' : '#f3f4f6',
              color: filtroCategoria === cat ? 'white' : '#374151',
              border: 'none',
            }}>
            {cat} ({porCategoria[cat]})
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Nome', 'Categoria', 'Unidade', 'Custo Un.', 'Qtd Mín/Crít', 'Fornecedor', 'Lote', 'Status', 'Ações'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                {materiais.length === 0 ? 'Nenhum material cadastrado no catálogo' : 'Nenhum material corresponde ao filtro'}
              </td></tr>
            ) : filtrados.map(m => (
              <tr key={m.id} style={{ borderTop: '0.5px solid #f3f4f6', opacity: m.ativo ? 1 : 0.5 }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{m.nome}</td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#f0f4ff', color: '#2563eb', fontWeight: '500' }}>{m.categoria}</span>
                </td>
                <td style={{ padding: '11px 14px', fontSize: '12px', color: '#6b7280' }}>{m.unidade}</td>
                <td style={{ padding: '11px 14px', fontSize: '13px', color: '#374151' }}>{fmt(m.custo_unitario)}</td>
                <td style={{ padding: '11px 14px', fontSize: '12px', color: '#6b7280' }}>{m.quantidade_minima} / {m.quantidade_critica}</td>
                <td style={{ padding: '11px 14px', fontSize: '12px', color: '#374151', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.fornecedor || '—'}
                </td>
                <td style={{ padding: '11px 14px', fontSize: '12px', color: '#6b7280' }}>
                  {m.lote || '—'}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  {m.ativo
                    ? <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#f0fdf4', color: '#16a34a', fontWeight: '500' }}>Ativo</span>
                    : <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#f3f4f6', color: '#9ca3af', fontWeight: '500' }}>Inativo</span>
                  }
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => abrir(m)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }} title="Editar"><Edit size={14} /></button>
                    {m.ativo && (
                      <button onClick={() => desativar(m.id, m.nome)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} title="Desativar"><Trash2 size={14} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '520px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{editando ? 'Editar Material' : 'Novo Material no Catálogo'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Nome *</label>
                <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Caixa de papelão grande" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Categoria</label>
                <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} style={inputStyle}>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Unidade</label>
                <select value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })} style={inputStyle}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Custo unitário (R$)</label>
                <input type="number" step="0.01" value={form.custo_unitario} onChange={e => setForm({ ...form, custo_unitario: e.target.value })} placeholder="0.00" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Qtd mínima</label>
                <input type="number" value={form.quantidade_minima} onChange={e => setForm({ ...form, quantidade_minima: e.target.value })} placeholder="10" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Qtd crítica</label>
                <input type="number" value={form.quantidade_critica} onChange={e => setForm({ ...form, quantidade_critica: e.target.value })} placeholder="5" style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Descrição</label>
                <input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição opcional" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Fornecedor</label>
                <input value={form.fornecedor} onChange={e => setForm({ ...form, fornecedor: e.target.value })} placeholder="Nome do fornecedor" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Lote</label>
                <input value={form.lote} onChange={e => setForm({ ...form, lote: e.target.value })} placeholder="Número do lote" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Data da Compra</label>
                <input type="date" value={form.data_compra} onChange={e => setForm({ ...form, data_compra: e.target.value })} style={inputStyle} />
              </div>
              {editando && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '16px' }}>
                  <input type="checkbox" id="ativo" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} />
                  <label htmlFor="ativo" style={{ fontSize: '13px', color: '#374151', cursor: 'pointer' }}>Material ativo</label>
                </div>
              )}
            </div>

            {erroForm && <p style={{ color: '#dc2626', fontSize: '13px', margin: '0 0 8px' }}>{erroForm}</p>}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'white' }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando} style={{ padding: '9px 18px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ── HISTÓRICO GLOBAL ─────────────────────────────────────────────────────────
const AbaHistorico = () => {
  const [movs, setMovs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');

  const carregar = useCallback(() => {
    setLoading(true);
    api.getMovimentacoesRecentes()
      .then(data => setMovs(data))
      .catch(() => setMovs([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const filtrados = movs.filter(m => {
    if (!filtro) return true;
    const q = filtro.toLowerCase();
    return (m.material_nome || '').toLowerCase().includes(q) ||
           (m.tipo || '').toLowerCase().includes(q) ||
           (m.user_nome || '').toLowerCase().includes(q) ||
           (m.os_numero || '').toLowerCase().includes(q) ||
           (m.observacao || '').toLowerCase().includes(q);
  });

  const resumo = movs.reduce((acc, m) => {
    if (m.tipo === 'entrada' || m.tipo === 'devolucao') acc.entradas += m.quantidade;
    else acc.saidas += m.quantidade;
    return acc;
  }, { entradas: 0, saidas: 0 });

  if (loading) return <Spinner />;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total de Movimentações', value: movs.length, color: '#0f1f3d', bg: '#f0f4ff' },
          { label: 'Total Entradas', value: resumo.entradas + ' un', color: '#15803d', bg: '#f0fdf4' },
          { label: 'Total Saídas', value: resumo.saidas + ' un', color: '#dc2626', bg: '#fef2f2' },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: '10px', padding: '16px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{c.label}</p>
            <p style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: '700', color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
        <input value={filtro} onChange={e => setFiltro(e.target.value)}
          placeholder="Filtrar por material, tipo, usuário, OS..."
          style={{ ...inputStyle, maxWidth: '320px' }} />
        <button onClick={carregar} style={{ padding: '9px 10px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
          <RefreshCw size={14} />
        </button>
        <span style={{ fontSize: '13px', color: '#9ca3af' }}>{filtrados.length} movimentações (últimas 100)</span>
      </div>

      <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Data/Hora', 'Material', 'Tipo', 'Quantidade', 'Ant. → Post.', 'OS', 'Usuário', 'Observação'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>Nenhuma movimentação encontrada</td></tr>
            ) : filtrados.map(m => {
              const tc = TIPO_CORES[m.tipo] || { bg: '#f3f4f6', c: '#374151', label: m.tipo };
              const isEntrada = m.tipo === 'entrada' || m.tipo === 'devolucao';
              return (
                <tr key={m.id} style={{ borderTop: '0.5px solid #f3f4f6' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '9px 12px', fontSize: '12px', color: '#374151', whiteSpace: 'nowrap' }}>{fmtDate(m.created_at)}</td>
                  <td style={{ padding: '9px 12px', fontSize: '13px', fontWeight: '500', color: '#1a1a1a', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.material_nome || '—'}</td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '12px', background: tc.bg, color: tc.c, fontWeight: '600', whiteSpace: 'nowrap' }}>{tc.label}</span>
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: '13px', fontWeight: '700', color: isEntrada ? '#15803d' : '#dc2626' }}>
                    {isEntrada ? '+' : '-'}{m.quantidade}
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: '12px', color: '#6b7280' }}>
                    {m.quantidade_anterior != null ? `${m.quantidade_anterior} → ${m.quantidade_posterior}` : '—'}
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: '12px', color: '#2563eb' }}>{m.os_numero || '—'}</td>
                  <td style={{ padding: '9px 12px', fontSize: '12px', color: '#374151' }}>{m.user_nome || '—'}</td>
                  <td style={{ padding: '9px 12px', fontSize: '12px', color: '#9ca3af', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.observacao || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

// ── CONTAINER PRINCIPAL ───────────────────────────────────────────────────────
const Estoque = () => {
  const [aba, setAba] = useState('estoque');

  const tabs = [
    { id: 'estoque', label: 'Posições de Estoque', icon: Package },
    { id: 'materiais', label: 'Catálogo de Materiais', icon: BookOpen },
    { id: 'historico', label: 'Histórico de Movimentações', icon: Clock },
  ];

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 4px' }}>Estoque</h1>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Controle de materiais, posições, catálogo e histórico</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', borderRadius: '10px', padding: '4px', marginBottom: '20px', width: 'fit-content' }}>
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setAba(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '8px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: '500', transition: 'all 0.15s',
                background: aba === t.id ? 'white' : 'transparent',
                color: aba === t.id ? '#0f1f3d' : '#6b7280',
                boxShadow: aba === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}>
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {aba === 'estoque' && <AbaEstoque />}
      {aba === 'materiais' && <AbaMateriais />}
      {aba === 'historico' && <AbaHistorico />}
    </div>
  );
};

const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '30vh' }}>
    <div style={{ width: '28px', height: '28px', border: '3px solid #e5e7eb', borderTop: '3px solid #0f1f3d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const Erro = ({ msg, onRetry }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '30vh' }}>
    <div style={{ textAlign: 'center', color: '#ef4444' }}>
      <AlertCircle size={28} />
      <p style={{ marginTop: '8px', fontSize: '14px' }}>{msg}</p>
      <button onClick={onRetry} style={{ marginTop: '12px', padding: '8px 16px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>Tentar novamente</button>
    </div>
  </div>
);

export default Estoque;
