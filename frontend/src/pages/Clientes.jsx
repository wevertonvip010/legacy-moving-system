import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, AlertCircle, X, Clock, Truck, Users, Package, MapPin, Calendar, Eye } from 'lucide-react';
import { api } from '../lib/api';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '–';

const ORIGENS = ['direto', 'organizer', 'indicação', 'site', 'outro'];
const STATUS_OPTS = ['ativo', 'inativo'];
const EMPTY = { nome: '', email: '', telefone: '', endereco: '', origem: 'direto', status: 'ativo' };

const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb',
  borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
};

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [historicoCliente, setHistoricoCliente] = useState(null);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [abaHistorico, setAbaHistorico] = useState('os');
  // OS Detail Modal
  const [osDetalhe, setOsDetalhe] = useState(null);
  const [osEtapas, setOsEtapas] = useState([]);
  const [osEtapasLoading, setOsEtapasLoading] = useState(false);

  const carregar = useCallback(() => {
    setLoading(true);
    api.getClientes()
      .then(setClientes)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrir = (c = null) => {
    setEditando(c);
    setForm(c ? { nome: c.nome, email: c.email || '', telefone: c.telefone || '', endereco: c.endereco || '', origem: c.origem || 'direto', status: c.status } : EMPTY);
    setErroForm('');
    setShowModal(true);
  };

  const salvar = async () => {
    if (!form.nome.trim()) { setErroForm('Nome é obrigatório'); return; }
    setSalvando(true);
    try {
      if (editando) await api.updateCliente(editando.id, form);
      else await api.createCliente(form);
      setShowModal(false);
      carregar();
    } catch (e) {
      setErroForm(e.message);
    } finally {
      setSalvando(false);
    }
  };

  const arquivar = async (id) => {
    if (!window.confirm('Arquivar cliente? Ele ficará oculto das listas.')) return;
    try { await api.deleteCliente(id); carregar(); }
    catch (e) { alert(e.message); }
  };

  const toggleStatus = async (c) => {
    const novoStatus = c.status === 'ativo' ? 'inativo' : 'ativo';
    try { await api.updateCliente(c.id, { status: novoStatus }); carregar(); }
    catch (e) { alert(e.message); }
  };

  const verHistorico = async (cliente) => {
    setHistoricoCliente({ ...cliente });
    setAbaHistorico('os');
    setHistoricoLoading(true);
    try {
      const data = await api.getCliente(cliente.id);
      setHistoricoCliente(data);
    } catch (e) {
      alert('Erro ao carregar histórico: ' + e.message);
      setHistoricoCliente(null);
    } finally {
      setHistoricoLoading(false);
    }
  };

  const abrirOsDetalhe = async (os) => {
    setOsDetalhe(os);
    setOsEtapas([]);
    setOsEtapasLoading(true);
    try {
      const etapas = await api.getEtapas(os.id);
      setOsEtapas(etapas);
    } catch (_) { setOsEtapas([]); }
    finally { setOsEtapasLoading(false); }
  };

  const filtrados = clientes.filter(c => {
    const ok = filtroStatus === 'todos' || c.status === filtroStatus;
    const match = !busca || c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(busca.toLowerCase()));
    return ok && match;
  });

  if (loading) return <Spinner />;
  if (error) return <Erro msg={error} onRetry={carregar} />;

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 4px' }}>Clientes</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>{clientes.length} clientes cadastrados</p>
        </div>
        <button onClick={() => abrir()}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
          <Plus size={14} /> Novo Cliente
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '10px', padding: '14px', border: '0.5px solid #e5e7eb', marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou email..."
            style={{ width: '100%', paddingLeft: '32px', padding: '8px 8px 8px 32px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {['todos', 'ativo', 'inativo'].map(s => (
          <button key={s} onClick={() => setFiltroStatus(s)}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid', fontSize: '13px', cursor: 'pointer',
              borderColor: filtroStatus === s ? '#0f1f3d' : '#e5e7eb',
              background: filtroStatus === s ? '#0f1f3d' : 'white',
              color: filtroStatus === s ? 'white' : '#374151' }}>
            {s === 'todos' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Nome', 'Email', 'Telefone', 'Origem', 'Status', 'Ações'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>Nenhum cliente encontrado</td></tr>
            ) : filtrados.map(c => (
              <tr key={c.id} style={{ borderTop: '0.5px solid #f3f4f6' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                  <button onClick={() => verHistorico(c)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', fontWeight: 600, fontSize: 13, padding: 0, textDecoration: 'underline' }}>
                    {c.nome}
                  </button>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{c.email || '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{c.telefone || '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280', textTransform: 'capitalize' }}>{c.origem}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontWeight: '500',
                    background: c.status === 'ativo' ? '#f0fdf4' : '#fef2f2',
                    color: c.status === 'ativo' ? '#16a34a' : '#dc2626' }}>
                    {c.status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button onClick={() => verHistorico(c)} title="Ver histórico completo"
                      style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}><Clock size={15} /></button>
                    <button onClick={() => abrir(c)} title="Editar dados do cliente"
                      style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit size={15} /></button>
                    <button
                      onClick={() => toggleStatus(c)}
                      title={c.status === 'ativo' ? 'Marcar como inativo' : 'Reativar cliente'}
                      style={{
                        padding: '3px 8px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                        fontSize: '10px', fontWeight: '700',
                        background: c.status === 'ativo' ? '#fff7ed' : '#f0fdf4',
                        color: c.status === 'ativo' ? '#c2410c' : '#15803d',
                      }}>
                      {c.status === 'ativo' ? 'Inativar' : '✓ Ativar'}
                    </button>
                    <button onClick={() => arquivar(c.id)} title="Arquivar cliente"
                      style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Novo/Editar */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '480px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{editando ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
            </div>
            {[{ label: 'Nome *', key: 'nome', type: 'text' }, { label: 'Email', key: 'email', type: 'email' }, { label: 'Telefone', key: 'telefone', type: 'text' }, { label: 'Endereço', key: 'endereco', type: 'text' }].map(({ label, key, type }) => (
              <div key={key} style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>{label}</label>
                <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} style={inputStyle} />
              </div>
            ))}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Origem</label>
              <select value={form.origem} onChange={e => setForm({ ...form, origem: e.target.value })} style={inputStyle}>
                {ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            {editando && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                  {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            {erroForm && <p style={{ color: '#dc2626', fontSize: '13px', margin: '4px 0 0' }}>{erroForm}</p>}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setShowModal(false)} disabled={salvando}
                style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'white' }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando}
                style={{ padding: '9px 18px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Histórico */}
      {historicoCliente && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '820px', maxWidth: '96vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: '700' }}>{historicoCliente.nome}</h2>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#6b7280', flexWrap: 'wrap' }}>
                  {historicoCliente.telefone && <span>📞 {historicoCliente.telefone}</span>}
                  {historicoCliente.email && <span>✉️ {historicoCliente.email}</span>}
                  {historicoCliente.endereco && <span>📍 {historicoCliente.endereco}</span>}
                </div>
              </div>
              <button onClick={() => setHistoricoCliente(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
            </div>

            {!historicoLoading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Orçamentos', value: (historicoCliente.orcamentos || []).length, color: '#2563eb' },
                  { label: 'OS Realizadas', value: (historicoCliente.ordens_servico || []).length, color: '#7c3aed' },
                  { label: 'Recibos', value: (historicoCliente.recibos || []).length, color: '#0891b2' },
                  { label: 'Total Gasto', value: fmt(historicoCliente.valor_total_gasto), color: '#16a34a', isVal: true },
                ].map(c => (
                  <div key={c.label} style={{ background: '#f8f9fa', borderRadius: 10, padding: '12px 16px', border: '1px solid #e5e7eb' }}>
                    <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase' }}>{c.label}</p>
                    <p style={{ fontSize: c.isVal ? 16 : 24, fontWeight: 700, color: c.color, margin: 0 }}>{c.value}</p>
                  </div>
                ))}
              </div>
            )}

            {historicoLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Carregando histórico...</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid #e5e7eb' }}>
                  {[
                    { key: 'os', label: `OS (${(historicoCliente.ordens_servico||[]).length})` },
                    { key: 'orc', label: `Orçamentos (${(historicoCliente.orcamentos||[]).length})` },
                    { key: 'contratos', label: `Contratos (${(historicoCliente.contratos||[]).length})` },
                    { key: 'recibos', label: `Recibos (${(historicoCliente.recibos||[]).length})` },
                    { key: 'avarias', label: `Avarias (${(historicoCliente.avarias||[]).length})` },
                  ].map(aba => (
                    <button key={aba.key} onClick={() => setAbaHistorico(aba.key)}
                      style={{ padding: '10px 18px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        borderBottom: `2px solid ${abaHistorico === aba.key ? '#1d4ed8' : 'transparent'}`,
                        color: abaHistorico === aba.key ? '#1d4ed8' : '#6b7280', background: 'none', marginBottom: -2 }}>
                      {aba.label}
                    </button>
                  ))}
                </div>

                {abaHistorico === 'os' && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ background: '#f9fafb' }}>
                      {['Número', 'Tipo', 'Data', 'Rota', 'Equipe/Veículo', 'Status', ''].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {!(historicoCliente.ordens_servico||[]).length
                        ? <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Nenhuma OS</td></tr>
                        : (historicoCliente.ordens_servico||[]).map(os => (
                          <tr key={os.id} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            onClick={() => abrirOsDetalhe(os)}>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#1d4ed8', fontWeight: 600 }}>{os.numero}</td>
                            <td style={{ padding: '10px 12px' }}>{os.tipo_servico}</td>
                            <td style={{ padding: '10px 12px', color: '#6b7280' }}>{fmtDate(os.data_mudanca)}</td>
                            <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 12 }}>
                              {os.endereco_origem && os.endereco_destino
                                ? <span title={`${os.endereco_origem} → ${os.endereco_destino}`}>
                                    {os.endereco_origem.split(',')[0]} → {os.endereco_destino.split(',')[0]}
                                  </span>
                                : '–'}
                            </td>
                            <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>
                              {[os.veiculo, os.equipe].filter(Boolean).join(' · ') || '–'}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                                background: os.status === 'concluida' ? '#dcfce7' : os.status === 'cancelada' ? '#fee2e2' : '#dbeafe',
                                color: os.status === 'concluida' ? '#15803d' : os.status === 'cancelada' ? '#b91c1c' : '#1d4ed8' }}>
                                {os.status}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <button onClick={e => { e.stopPropagation(); abrirOsDetalhe(os); }}
                                style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 11, color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Eye size={12} /> Ver
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}

                {abaHistorico === 'orc' && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ background: '#f9fafb' }}>
                      {['Número', 'Tipo', 'Valor', 'Data Prev.', 'Status'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {!(historicoCliente.orcamentos||[]).length
                        ? <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Nenhum orçamento</td></tr>
                        : (historicoCliente.orcamentos||[]).map(o => (
                          <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#6b7280' }}>{o.numero}</td>
                            <td style={{ padding: '10px 12px' }}>{o.tipo_servico}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{fmt((o.valor_servico||0)+(o.valor_seguro||0))}</td>
                            <td style={{ padding: '10px 12px', color: '#6b7280' }}>{fmtDate(o.data_prevista)}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: '#f3f4f6', color: '#374151' }}>{o.status}</span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}

                {abaHistorico === 'contratos' && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ background: '#f9fafb' }}>
                      {['Número', 'Tipo', 'Valor', 'Data', 'Status'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {!(historicoCliente.contratos||[]).length
                        ? <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Nenhum contrato</td></tr>
                        : (historicoCliente.contratos||[]).map(ct => (
                          <tr key={ct.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#6b7280' }}>{ct.numero}</td>
                            <td style={{ padding: '10px 12px' }}>{ct.tipo_servico}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{fmt((ct.valor_servico||0)+(ct.valor_seguro||0))}</td>
                            <td style={{ padding: '10px 12px', color: '#6b7280' }}>{fmtDate(ct.data_assinatura)}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                                background: ct.status === 'assinado' ? '#dcfce7' : '#f3f4f6',
                                color: ct.status === 'assinado' ? '#15803d' : '#374151' }}>{ct.status}</span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}

                {abaHistorico === 'recibos' && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ background: '#f9fafb' }}>
                      {['Número', 'Valor', 'Data Pgto', 'Forma Pgto', 'Status'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {!(historicoCliente.recibos||[]).length
                        ? <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Nenhum recibo</td></tr>
                        : (historicoCliente.recibos||[]).map(r => (
                          <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#6b7280' }}>{r.numero}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: '#16a34a' }}>{fmt(r.valor_cobrado)}</td>
                            <td style={{ padding: '10px 12px', color: '#6b7280' }}>{fmtDate(r.data_pagamento)}</td>
                            <td style={{ padding: '10px 12px', color: '#6b7280' }}>{r.forma_pagamento || '–'}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                                background: r.status === 'recebido' ? '#dcfce7' : '#fef3c7',
                                color: r.status === 'recebido' ? '#15803d' : '#92400e' }}>{r.status}</span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}

                {abaHistorico === 'avarias' && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ background: '#f9fafb' }}>
                      {['OS', 'Tipo', 'Descrição', 'Valor Est.', 'Status', 'Data'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {!(historicoCliente.avarias||[]).length
                        ? <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Nenhuma avaria registrada</td></tr>
                        : (historicoCliente.avarias||[]).map(av => {
                          const STATUS_AV = { aberta: { bg: '#fee2e2', c: '#b91c1c' }, em_analise: { bg: '#fef3c7', c: '#92400e' }, resolvida: { bg: '#dcfce7', c: '#15803d' }, encerrada: { bg: '#f3f4f6', c: '#6b7280' } };
                          const sv = STATUS_AV[av.status] || { bg: '#f3f4f6', c: '#6b7280' };
                          return (
                            <tr key={av.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#6b7280', fontSize: 12 }}>{av.os_numero || '—'}</td>
                              <td style={{ padding: '10px 12px' }}>{av.tipo || '—'}</td>
                              <td style={{ padding: '10px 12px', color: '#6b7280', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{av.descricao || '—'}</td>
                              <td style={{ padding: '10px 12px', fontWeight: 600, color: '#dc2626' }}>{av.valor_estimado ? fmt(av.valor_estimado) : '—'}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: sv.bg, color: sv.c }}>{av.status}</span>
                              </td>
                              <td style={{ padding: '10px 12px', color: '#6b7280' }}>{fmtDate(av.created_at)}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
                  <button onClick={() => { setHistoricoCliente(null); abrir(historicoCliente); }}
                    style={{ padding: '9px 18px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                    ✏️ Editar Cliente
                  </button>
                  <button onClick={() => setHistoricoCliente(null)}
                    style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'white' }}>
                    Fechar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* OS Detail Modal */}
      {osDetalhe && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1100, overflowY: 'auto', padding: '24px 16px' }}>
          <div style={{ background: 'white', borderRadius: 14, width: '820px', maxWidth: '98vw', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f1f3d', borderRadius: '14px 14px 0 0' }}>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Ordem de Serviço</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'white', fontFamily: 'monospace' }}>{osDetalhe.numero}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{osDetalhe.cliente}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  fontSize: 12, padding: '4px 14px', borderRadius: 20, fontWeight: 700,
                  background: osDetalhe.status === 'concluida' ? '#dcfce7' : osDetalhe.status === 'cancelada' ? '#fee2e2' : '#dbeafe',
                  color: osDetalhe.status === 'concluida' ? '#15803d' : osDetalhe.status === 'cancelada' ? '#b91c1c' : '#1d4ed8',
                }}>
                  {osDetalhe.status?.toUpperCase()}
                </span>
                <button onClick={() => setOsDetalhe(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'white' }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Datas */}
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Calendar size={14} color="#6b7280" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Datas</span>
                </div>
                {[
                  { label: 'Data da Mudança', value: fmtDate(osDetalhe.data_mudanca) },
                  { label: 'Hora Início', value: osDetalhe.hora_inicio || '—' },
                  { label: 'Hora Fim Prevista', value: osDetalhe.hora_fim_estimada || '—' },
                  { label: 'Hora Início Real', value: osDetalhe.hora_inicio_real || '—' },
                  { label: 'Hora Fim Real', value: osDetalhe.hora_fim_real || '—' },
                  { label: 'Dias', value: osDetalhe.quantidade_dias || 1 },
                ].map(f => (
                  <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid #e5e7eb' }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{f.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{f.value}</span>
                  </div>
                ))}
              </div>

              {/* Endereços */}
              <div style={{ background: '#f0f9ff', borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <MapPin size={14} color="#0369a1" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>Endereços</span>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 3 }}>📍 ORIGEM</div>
                  <div style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.4 }}>{osDetalhe.endereco_origem || '—'}</div>
                </div>
                <div style={{ borderTop: '1px dashed #bae6fd', margin: '10px 0' }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 3 }}>🏁 DESTINO</div>
                  <div style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.4 }}>{osDetalhe.endereco_destino || '—'}</div>
                </div>
              </div>

              {/* Equipe e Veículos */}
              <div style={{ background: '#fafafa', borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Users size={14} color="#6b7280" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Equipe & Veículos</span>
                </div>
                {[
                  { label: 'Motorista', value: osDetalhe.motorista || '—' },
                  { label: 'Veículo', value: osDetalhe.veiculo || '—' },
                  { label: 'Equipe', value: osDetalhe.equipe || '—' },
                  { label: 'Ajudantes', value: osDetalhe.quantidade_ajudantes || 0 },
                ].map(f => (
                  <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid #e5e7eb' }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{f.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{f.value}</span>
                  </div>
                ))}
              </div>

              {/* Valores e Materiais */}
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Package size={14} color="#16a34a" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Financeiro & Materiais</span>
                </div>
                {[
                  { label: 'Valor Total', value: fmt(osDetalhe.valor_total) },
                  { label: 'Tipo de Serviço', value: osDetalhe.tipo_servico || '—' },
                ].map(f => (
                  <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid #dcfce7' }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{f.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>{f.value}</span>
                  </div>
                ))}
                {osDetalhe.materiais_previstos && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Materiais Previstos</div>
                    <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{osDetalhe.materiais_previstos}</div>
                  </div>
                )}
                {osDetalhe.materiais_usados && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Materiais Usados</div>
                    <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
                      {typeof osDetalhe.materiais_usados === 'string' ? osDetalhe.materiais_usados : JSON.stringify(osDetalhe.materiais_usados)}
                    </div>
                  </div>
                )}
              </div>

              {/* Observações */}
              {(osDetalhe.observacoes_operacionais || osDetalhe.observacoes_finais || osDetalhe.ocorrencias) && (
                <div style={{ background: '#fffbeb', borderRadius: 10, padding: 16, gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 10, textTransform: 'uppercase' }}>📋 Observações e Ocorrências</div>
                  {osDetalhe.observacoes_operacionais && <p style={{ margin: '0 0 8px', fontSize: 13, color: '#374151' }}><strong>Operacional:</strong> {osDetalhe.observacoes_operacionais}</p>}
                  {osDetalhe.observacoes_finais && <p style={{ margin: '0 0 8px', fontSize: 13, color: '#374151' }}><strong>Finais:</strong> {osDetalhe.observacoes_finais}</p>}
                  {osDetalhe.ocorrencias && <p style={{ margin: 0, fontSize: 13, color: '#dc2626' }}><strong>Ocorrências:</strong> {osDetalhe.ocorrencias}</p>}
                </div>
              )}

              {/* Etapas operacionais */}
              <div style={{ gridColumn: '1 / -1', background: '#f9fafb', borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Truck size={14} color="#6b7280" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Etapas Operacionais</span>
                </div>
                {osEtapasLoading ? (
                  <p style={{ color: '#9ca3af', fontSize: 13 }}>Carregando etapas...</p>
                ) : osEtapas.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: 13 }}>Nenhuma etapa registrada</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {osEtapas.map((etapa, i) => (
                      <div key={etapa.id} style={{ background: 'white', borderRadius: 8, padding: '10px 14px', border: '1px solid #e5e7eb', display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0f1f3d', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{i+1}</div>
                        <div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Tipo</div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{etapa.tipo}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Data</div>
                          <div style={{ fontSize: 13 }}>{fmtDate(etapa.data)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Equipe / Veículos</div>
                          <div style={{ fontSize: 12, color: '#374151' }}>{[etapa.equipe, etapa.veiculos].filter(Boolean).join(' · ') || '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setOsDetalhe(null)} style={{ padding: '9px 20px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white' }}>
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

export default Clientes;
