import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Edit, Trash2, AlertCircle, X, PlayCircle, CheckCircle, Calendar, DollarSign, MessageCircle, Receipt, Camera } from 'lucide-react';
import { api } from '../lib/api';
import { getUserAvatarStyle, getUserInitials } from '../lib/userColors';
import VistoriaDigital from '../components/VistoriaDigital';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '—';
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };
const EMPTY = { cliente: '', endereco_origem: '', endereco_destino: '', data_mudanca: '', equipe: '', veiculo: '', valor_total: '', observacoes: '', materiais_previstos: '', motorista: '' };
const STATUS_COLOR = {
  aberta: '#9ca3af', agendada: '#f59e0b', em_andamento: '#2563eb',
  finalizada: '#16a34a', concluida: '#16a34a', cancelada: '#6b7280', alterada: '#f97316',
};
const STATUS_LABEL = {
  aberta: 'Aberta', agendada: 'Agendada', em_andamento: 'Em andamento',
  finalizada: 'Finalizada', concluida: 'Concluída', cancelada: 'Cancelada', alterada: 'Alterada',
};
const STATUS_NEXT = {
  aberta: ['agendada', 'cancelada'],
  agendada: ['em_andamento', 'alterada', 'cancelada'],
  em_andamento: ['concluida', 'cancelada'],
  finalizada: ['alterada'],
  concluida: ['alterada'],
  alterada: ['agendada', 'cancelada'],
  cancelada: ['aberta'],
};

// Monta mensagem WhatsApp para a OS
const montarMsgWhatsApp = (os) => {
  const data = os.data_mudanca ? fmtDate(os.data_mudanca) : '—';
  const msg = [
    `🚛 *LEGACY MOVING — OS ${os.numero || os.id}*`,
    ``,
    `👤 *Cliente:* ${os.cliente || '—'}`,
    `📅 *Data:* ${data}`,
    `📍 *Origem:* ${os.endereco_origem || '—'}`,
    `📍 *Destino:* ${os.endereco_destino || '—'}`,
    ``,
    `👷 *Equipe:* ${os.equipe || '—'}`,
    `🚚 *Caminhão:* ${os.veiculo || '—'}`,
    ``,
    os.observacoes_operacionais || os.observacoes ? `📋 *Obs:* ${os.observacoes_operacionais || os.observacoes}` : null,
    ``,
    `✅ Legacy Moving ERP`,
  ].filter(l => l !== null).join('\n');
  return encodeURIComponent(msg);
};
const TIPO_ETAPA = { embalagem: '📦 Embalagem', transporte: '🚛 Transporte', finalizacao: '✅ Finalização', outro: '📋 Outro' };
const EMPTY_ETAPA = { data: '', tipo: 'transporte', quantidade_ajudantes: '', quantidade_caminhoes: '', equipe: '', observacoes: '' };

const OrdensServico = () => {
  const navigate = useNavigate();
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [paginaOS, setPaginaOS] = useState(0);
  const PER_PAGE_OS = 20;
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [showFinalModal, setShowFinalModal] = useState(false);
  const [osFinal, setOsFinal] = useState(null);
  const [valorFinal, setValorFinal] = useState('');
  const [materiaisUsados, setMateriaisUsados] = useState('');
  // Vistoria
  const [showVistoria, setShowVistoria] = useState(null); // {os, tipo}
  // Etapas
  const [osEtapas, setOsEtapas] = useState(null); // OS selecionada para etapas
  const [etapas, setEtapas] = useState([]);
  const [loadingEtapas, setLoadingEtapas] = useState(false);
  const [formEtapa, setFormEtapa] = useState(EMPTY_ETAPA);
  // Funcionários
  const [funcionarios, setFuncionarios] = useState([]);
  const [equipeOS, setEquipeOS] = useState([]);
  const [editandoEtapa, setEditandoEtapa] = useState(null);
  const [salvandoEtapa, setSalvandoEtapa] = useState(false);
  // Avaria prompt pós-conclusão
  const [showAvariaPrompt, setShowAvariaPrompt] = useState(false);
  const [osConcluidaInfo, setOsConcluidaInfo] = useState(null);

  const carregar = useCallback(() => {
    setLoading(true);
    api.getOS()
      .then(setOrdens)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { api.getFuncionarios().then(setFuncionarios).catch(() => {}); }, []);

  const abrir = (o = null) => {
    setEditando(o);
    setForm(o ? {
      cliente: o.cliente, endereco_origem: o.endereco_origem || '', endereco_destino: o.endereco_destino || '',
      data_mudanca: o.data_mudanca ? o.data_mudanca.slice(0, 16) : '',
      equipe: o.equipe || '', veiculo: o.veiculo || '', motorista: o.motorista || '',
      valor_total: o.valor_total || '',
      observacoes: o.observacoes_operacionais || o.observacoes || '',
      materiais_previstos: o.materiais_previstos || '',
    } : EMPTY);
    setErroForm('');
    setShowModal(true);
  };

  const salvar = async () => {
    if (!form.cliente.trim()) { setErroForm('Cliente é obrigatório'); return; }
    setSalvando(true);
    try {
      const payload = {
        ...form,
        valor_total: parseFloat(form.valor_total) || 0,
        data_mudanca: form.data_mudanca ? form.data_mudanca + ':00' : null,
        observacoes_operacionais: form.observacoes,
        materiais_previstos: form.materiais_previstos,
        motorista: form.motorista,
      };
      if (editando) await api.updateOS(editando.id, payload);
      else await api.createOS(payload);
      setShowModal(false);
      carregar();
    } catch (e) { setErroForm(e.message); }
    finally { setSalvando(false); }
  };

  const iniciar = async (id) => {
    try { await api.iniciarOS(id); carregar(); }
    catch (e) { alert(e.message); }
  };

  const mudarStatus = async (os, novoStatus) => {
    try {
      await api.updateOS(os.id, { status: novoStatus });
      carregar();
    } catch (e) { alert('Erro ao atualizar status: ' + e.message); }
  };

  const enviarWhatsApp = (os) => {
    const msg = montarMsgWhatsApp(os);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const abrirFinalizar = (os) => {
    setOsFinal(os);
    setValorFinal(String(os.valor_total || ''));
    setMateriaisUsados(os.materiais_previstos || '');
    setShowFinalModal(true);
  };

  const concluir = async () => {
    setSalvando(true);
    try {
      await api.concluirOS(osFinal.id, {
        valor_total: parseFloat(valorFinal) || 0,
        ...(materiaisUsados.trim() ? { materiais_usados: materiaisUsados } : {}),
      });
      setShowFinalModal(false);
      carregar();
      // Perguntar sobre avaria
      setOsConcluidaInfo({ id: osFinal.id, numero: osFinal.numero, cliente: osFinal.cliente, equipe: osFinal.equipe, veiculo: osFinal.veiculo });
      setShowAvariaPrompt(true);
    } catch (e) { alert(e.message); }
    finally { setSalvando(false); }
  };

  const deletar = async (id) => {
    if (!confirm('Cancelar ordem de serviço?')) return;
    try { await api.cancelarOS(id); carregar(); }
    catch (e) { alert(e.message); }
  };

  const abrirEtapas = async (os) => {
    setOsEtapas(os);
    setFormEtapa(EMPTY_ETAPA);
    setEditandoEtapa(null);
    setLoadingEtapas(true);
    try {
      const [et, eq] = await Promise.allSettled([
        api.getEtapas(os.id),
        api.getEquipeOS(os.id),
      ]);
      if (et.status === 'fulfilled') setEtapas(et.value);
      if (eq.status === 'fulfilled') setEquipeOS(eq.value);
    } catch (e) { alert(e.message); }
    finally { setLoadingEtapas(false); }
  };

  const vincularFuncionario = async (funcId) => {
    if (!osEtapas) return;
    try {
      await api.vincularEquipeOS(osEtapas.id, { funcionario_ids: [funcId] });
      const eq = await api.getEquipeOS(osEtapas.id);
      setEquipeOS(eq);
    } catch (e) { alert(e.message); }
  };

  const desvincularFuncionario = async (vinculoId) => {
    if (!osEtapas) return;
    try {
      await api.desvincularEquipeOS(osEtapas.id, vinculoId);
      const eq = await api.getEquipeOS(osEtapas.id);
      setEquipeOS(eq);
    } catch (e) { alert(e.message); }
  };

  const salvarEtapa = async () => {
    if (!formEtapa.data) { alert('Informe a data da etapa'); return; }
    setSalvandoEtapa(true);
    try {
      const payload = {
        ...formEtapa,
        quantidade_ajudantes: parseInt(formEtapa.quantidade_ajudantes) || 0,
        quantidade_caminhoes: parseInt(formEtapa.quantidade_caminhoes) || 0,
      };
      if (editandoEtapa) await api.updateEtapa(osEtapas.id, editandoEtapa.id, payload);
      else await api.createEtapa(osEtapas.id, payload);
      setEtapas(await api.getEtapas(osEtapas.id));
      setFormEtapa(EMPTY_ETAPA);
      setEditandoEtapa(null);
    } catch (e) { alert(e.message); }
    finally { setSalvandoEtapa(false); }
  };

  const editarEtapa = (e) => {
    setEditandoEtapa(e);
    setFormEtapa({
      data: e.data ? e.data.slice(0, 16) : '',
      tipo: e.tipo || 'transporte',
      quantidade_ajudantes: e.quantidade_ajudantes || '',
      quantidade_caminhoes: e.quantidade_caminhoes || '',
      equipe: e.equipe || '',
      observacoes: e.observacoes || '',
    });
  };

  const deletarEtapa = async (etapaId) => {
    if (!confirm('Remover esta etapa?')) return;
    try {
      await api.deleteEtapa(osEtapas.id, etapaId);
      setEtapas(await api.getEtapas(osEtapas.id));
    } catch (e) { alert(e.message); }
  };

  const filtrados = ordens.filter(o => {
    const ok = filtro === 'todos' || o.status === filtro;
    const match = !busca || o.cliente.toLowerCase().includes(busca.toLowerCase()) || o.numero.toLowerCase().includes(busca.toLowerCase());
    return ok && match;
  });
  const totalPaginasOS = Math.ceil(filtrados.length / PER_PAGE_OS);
  const paginadosOS = filtrados.slice(paginaOS * PER_PAGE_OS, (paginaOS + 1) * PER_PAGE_OS);

  if (loading) return <Spinner />;
  if (error) return <Erro msg={error} onRetry={carregar} />;

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 4px' }}>Ordens de Serviço</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>{ordens.length} ordens cadastradas</p>
        </div>
        <button onClick={() => abrir()}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
          <Plus size={14} /> Nova OS
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '10px', padding: '14px', border: '0.5px solid #e5e7eb', marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por cliente ou número..."
            style={{ width: '100%', paddingLeft: '32px', padding: '8px 8px 8px 32px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {['todos', 'agendada', 'em_andamento', 'concluida', 'cancelada'].map(s => (
          <button key={s} onClick={() => setFiltro(s)}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid', fontSize: '13px', cursor: 'pointer',
              borderColor: filtro === s ? '#0f1f3d' : '#e5e7eb',
              background: filtro === s ? '#0f1f3d' : 'white',
              color: filtro === s ? 'white' : '#374151' }}>
            {s === 'todos' ? 'Todos' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Número', 'Cliente', 'Data', 'Equipe', 'Veículo', 'Valor', 'Resp.', 'Status', 'Ações'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>Nenhuma OS encontrada</td></tr>
            ) : paginadosOS.map(o => (
              <tr key={o.id} style={{ borderTop: '0.5px solid #f3f4f6' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280', fontFamily: 'monospace' }}>{o.numero}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>{o.cliente}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                  {o.data_mudanca ? new Date(o.data_mudanca).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{o.equipe || '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{o.veiculo || '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{fmt(o.valor_total)}</td>
                <td style={{ padding: '12px 16px' }}>
                  {o.vendedor_id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }} title={o.vendedor_nome || ''}>
                      <div style={getUserAvatarStyle(o.vendedor_id, 26)}>
                        {getUserInitials(o.vendedor_nome || '?')}
                      </div>
                    </div>
                  ) : <span style={{ fontSize: 11, color: '#d1d5db' }}>—</span>}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontWeight: '500', background: (STATUS_COLOR[o.status] || '#6b7280') + '20', color: STATUS_COLOR[o.status] || '#6b7280' }}>
                    {STATUS_LABEL[o.status] || o.status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Status dropdown */}
                    <select
                      value={o.status || 'aberta'}
                      onChange={e => mudarStatus(o, e.target.value)}
                      style={{ padding: '3px 6px', border: `1px solid ${STATUS_COLOR[o.status] || '#e5e7eb'}`, borderRadius: '6px', fontSize: '11px', color: STATUS_COLOR[o.status] || '#6b7280', background: '#fff', cursor: 'pointer', fontWeight: '600' }}
                      title="Alterar status"
                    >
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    {/* WhatsApp */}
                    <button onClick={() => enviarWhatsApp(o)} title="Enviar via WhatsApp" style={{ padding: '5px', background: '#dcfce7', border: 'none', cursor: 'pointer', color: '#16a34a', borderRadius: '4px' }}>
                      <MessageCircle size={14} />
                    </button>
                    {o.status === 'em_andamento' && (
                      <button onClick={() => abrirFinalizar(o)} title="Finalizar OS" style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a' }}><CheckCircle size={15} /></button>
                    )}
                    <button onClick={() => abrirEtapas(o)} title="Etapas operacionais" style={{ padding: '5px', background: '#eff6ff', border: 'none', cursor: 'pointer', color: '#2563eb', borderRadius: '4px' }}><Calendar size={14} /></button>
                    <button onClick={() => setShowVistoria({ os: o, tipo: o.status === 'concluida' || o.status === 'finalizada' ? 'chegada' : 'saida' })} title="Vistoria digital" style={{ padding: '5px', background: '#fdf4ff', border: 'none', cursor: 'pointer', color: '#7c3aed', borderRadius: '4px' }}><Camera size={14} /></button>
                    {(o.status === 'finalizada' || o.status === 'concluida') && (
                      <button onClick={() => navigate('/fechamento-operacional?osId=' + o.id)} title="Fechamento P&L" style={{ padding: '5px', background: '#f0fdf4', border: 'none', cursor: 'pointer', color: '#16a34a', borderRadius: '4px' }}><DollarSign size={14} /></button>
                    )}
                    {(o.status === 'finalizada' || o.status === 'concluida') && (
                      <button onClick={() => navigate(`/recibos?os_id=${o.id}`)} title="Gerar recibo para esta OS" style={{ padding: '5px', background: '#eff6ff', border: 'none', cursor: 'pointer', color: '#2563eb', borderRadius: '4px' }}><Receipt size={14} /></button>
                    )}
                    <button onClick={async () => {
                      try {
                        const res = await api.getPortalLink(o.id);
                        const url = `${window.location.origin}${res.url}`;
                        navigator.clipboard.writeText(url).then(() => alert(`Link copiado!\n\n${url}`)).catch(() => alert(`Link do portal:\n\n${url}`));
                      } catch (e) { alert('Erro: ' + e.message); }
                    }} title="Copiar link de acompanhamento para o cliente"
                      style={{ padding: '5px', background: '#f5f3ff', border: 'none', cursor: 'pointer', color: '#7c3aed', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>🔗</button>
                    <button onClick={() => abrir(o)} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }} title="Editar OS"><Edit size={15} /></button>
                    <button onClick={() => deletar(o.id)} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginação OS */}
        {totalPaginasOS > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              Mostrando {paginaOS * PER_PAGE_OS + 1}–{Math.min((paginaOS + 1) * PER_PAGE_OS, filtrados.length)} de {filtrados.length} ordens
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setPaginaOS(p => Math.max(0, p - 1))} disabled={paginaOS === 0}
                style={{ padding: '5px 12px', background: paginaOS === 0 ? '#f3f4f6' : '#fff', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: paginaOS === 0 ? 'default' : 'pointer', color: paginaOS === 0 ? '#d1d5db' : '#374151' }}>
                ← Anterior
              </button>
              {Array.from({ length: totalPaginasOS }, (_, i) => i).filter(i => Math.abs(i - paginaOS) <= 2).map(i => (
                <button key={i} onClick={() => setPaginaOS(i)}
                  style={{ padding: '5px 10px', background: i === paginaOS ? '#0D1B2A' : '#fff', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer', color: i === paginaOS ? '#fff' : '#374151', fontWeight: i === paginaOS ? 600 : 400 }}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPaginaOS(p => Math.min(totalPaginasOS - 1, p + 1))} disabled={paginaOS >= totalPaginasOS - 1}
                style={{ padding: '5px 12px', background: paginaOS >= totalPaginasOS - 1 ? '#f3f4f6' : '#fff', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: paginaOS >= totalPaginasOS - 1 ? 'default' : 'pointer', color: paginaOS >= totalPaginasOS - 1 ? '#d1d5db' : '#374151' }}>
                Próximo →
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '520px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{editando ? 'Editar OS' : 'Nova Ordem de Serviço'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
            </div>
            {[['Cliente *', 'cliente', 'text', 'Nome do cliente'], ['Endereço Origem', 'endereco_origem', 'text', 'Ex: Rua A, 100'], ['Endereço Destino', 'endereco_destino', 'text', 'Ex: Rua B, 200']].map(([label, key, type, ph]) => (
              <div key={key} style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>{label}</label>
                <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={ph} style={inputStyle} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Equipe</label>
                <input value={form.equipe} onChange={e => setForm({ ...form, equipe: e.target.value })} placeholder="Ex: João, Pedro, Maria" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Motorista</label>
                <input value={form.motorista} onChange={e => setForm({ ...form, motorista: e.target.value })} placeholder="Nome do motorista" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Veículo</label>
                <input value={form.veiculo} onChange={e => setForm({ ...form, veiculo: e.target.value })} placeholder="Ex: Caminhão, Caminhonete" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Valor (R$)</label>
                <input type="number" value={form.valor_total} onChange={e => setForm({ ...form, valor_total: e.target.value })} placeholder="0.00" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Data/hora da mudança</label>
              <input type="datetime-local" value={form.data_mudanca} onChange={e => setForm({ ...form, data_mudanca: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Materiais Previstos <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400 }}>(lista de itens a utilizar)</span></label>
              <textarea value={form.materiais_previstos} onChange={e => setForm({ ...form, materiais_previstos: e.target.value })} rows={2} placeholder="Ex: 50 caixas de papelão, fita adesiva, papel bolha..." style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Observações Operacionais</label>
              <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
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

      {showFinalModal && osFinal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '460px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '600' }}>Concluir OS</h3>
            <p style={{ fontSize: '13px', color: '#374151', marginBottom: '16px' }}>OS: <strong>{osFinal.numero}</strong> — {osFinal.cliente}</p>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Valor final (R$)</label>
              <input type="number" value={valorFinal} onChange={e => setValorFinal(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                Materiais utilizados <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400 }}>— será descontado do estoque</span>
              </label>
              <textarea
                value={materiaisUsados}
                onChange={e => setMateriaisUsados(e.target.value)}
                rows={3}
                placeholder="Ex: 50 caixas de papelão, 2 rolos de fita adesiva, papel bolha..."
                style={{ ...inputStyle, resize: 'vertical' }}
              />
              <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0' }}>ℹ️ O sistema tentará descontar automaticamente do estoque os itens listados.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setShowFinalModal(false)} style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'white' }}>Cancelar</button>
              <button onClick={concluir} disabled={salvando} style={{ padding: '9px 18px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                {salvando ? 'Concluindo...' : '✓ Concluir OS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL AVARIA PROMPT ── */}
      {showAvariaPrompt && osConcluidaInfo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '420px', maxWidth: '90vw', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span style={{ fontSize: '28px' }}>⚠️</span>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: '#1a1a1a' }}>Houve alguma avaria?</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 8px' }}>OS {osConcluidaInfo.numero} — {osConcluidaInfo.cliente}</p>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 24px' }}>Algum móvel ou item foi danificado, perdido ou arranhado durante a mudança?</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowAvariaPrompt(false)}
                style={{ flex: 1, padding: '11px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', background: 'white', color: '#374151', fontWeight: '500' }}>
                ✅ Não, tudo ok
              </button>
              <button
                onClick={() => {
                  setShowAvariaPrompt(false);
                  navigate('/avarias', { state: { preencherOS: osConcluidaInfo } });
                }}
                style={{ flex: 1, padding: '11px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}>
                ⚠️ Sim, registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ETAPAS OPERACIONAIS ── */}
      {osEtapas && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '700px', maxHeight: '88vh', overflow: 'auto' }}>
            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: '0.5px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1a1a1a' }}>
                  Etapas Operacionais
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>
                  {osEtapas.numero} · {osEtapas.cliente}
                </p>
              </div>
              <button onClick={() => setOsEtapas(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {/* ── Equipe da OS ── */}
              <div style={{ marginBottom: '20px', background: '#f0f4ff', borderRadius: '10px', padding: '14px 16px', border: '1px solid #bfdbfe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#1d4ed8' }}>👥 Equipe Alocada</span>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>{equipeOS.length} funcionário{equipeOS.length !== 1 ? 's' : ''}</span>
                </div>
                {/* Funcionários vinculados */}
                {equipeOS.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                    {equipeOS.map(v => (
                      <span key={v.id} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '4px 10px', borderRadius: '20px', fontSize: '12px',
                        background: 'white', border: '1px solid #bfdbfe', color: '#1d4ed8', fontWeight: '600',
                      }}>
                        {v.nome}
                        {v.funcao_no_servico && <span style={{ fontSize: '10px', color: '#6b7280' }}>({v.funcao_no_servico})</span>}
                        <span style={{ fontSize: '10px', color: '#d97706', fontWeight: '700' }}>+{v.pontos_ganhos}pts</span>
                        <button onClick={() => desvincularFuncionario(v.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0 2px', fontSize: '12px', fontWeight: '700' }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Adicionar funcionário */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {funcionarios.filter(f => !equipeOS.some(e => e.funcionario_id === f.id)).map(f => (
                    <button key={f.id} onClick={() => vincularFuncionario(f.id)}
                      style={{
                        padding: '4px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
                        border: '1px dashed #93c5fd', background: 'white', color: '#6b7280',
                      }}>
                      + {f.nome} <span style={{ fontSize: '9px' }}>({(f.funcoes || '').split(',')[0]})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista de etapas */}
              {loadingEtapas ? (
                <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Carregando...</p>
              ) : etapas.length === 0 ? (
                <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '20px', textAlign: 'center', marginBottom: '20px' }}>
                  <Calendar size={28} style={{ color: '#d1d5db', marginBottom: '8px' }} />
                  <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>Nenhuma etapa cadastrada</p>
                  <p style={{ color: '#9ca3af', fontSize: '12px', margin: '4px 0 0' }}>Adicione as datas de embalagem, transporte e finalização.</p>
                </div>
              ) : (
                <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {etapas.sort((a,b) => new Date(a.data) - new Date(b.data)).map(e => (
                    <div key={e.id} style={{ background: '#f9fafb', borderRadius: '10px', padding: '14px 16px', border: '0.5px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f1f3d' }}>
                            {e.data ? new Date(e.data).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '—'}
                          </span>
                          <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: '#eff6ff', color: '#1d4ed8', fontWeight: '500' }}>
                            {TIPO_ETAPA[e.tipo] || e.tipo}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6b7280' }}>
                          {e.quantidade_ajudantes > 0 && <span>👷 {e.quantidade_ajudantes} ajudantes</span>}
                          {e.quantidade_caminhoes > 0 && <span>🚛 {e.quantidade_caminhoes} caminhões</span>}
                          {e.equipe && <span>👥 {e.equipe}</span>}
                        </div>
                        {e.observacoes && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9ca3af' }}>{e.observacoes}</p>}
                      </div>
                      <div style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
                        <button onClick={() => editarEtapa(e)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit size={13} /></button>
                        <button onClick={() => deletarEtapa(e.id)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulário nova/editar etapa */}
              <div style={{ background: '#f0f9ff', borderRadius: '10px', padding: '16px', border: '1px solid #bae6fd' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: '600', color: '#0369a1' }}>
                  {editandoEtapa ? '✏️ Editando etapa' : '+ Nova etapa'}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#374151', display: 'block', marginBottom: '3px' }}>Data *</label>
                    <input type="date" value={formEtapa.data ? formEtapa.data.slice(0,10) : ''}
                      onChange={e => setFormEtapa(f => ({ ...f, data: e.target.value }))}
                      style={{ ...inputStyle, fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#374151', display: 'block', marginBottom: '3px' }}>Tipo</label>
                    <select value={formEtapa.tipo} onChange={e => setFormEtapa(f => ({ ...f, tipo: e.target.value }))}
                      style={{ ...inputStyle, fontSize: '13px' }}>
                      {Object.entries(TIPO_ETAPA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#374151', display: 'block', marginBottom: '3px' }}>Ajudantes</label>
                    <input type="number" min="0" value={formEtapa.quantidade_ajudantes}
                      onChange={e => setFormEtapa(f => ({ ...f, quantidade_ajudantes: e.target.value }))}
                      placeholder="0" style={{ ...inputStyle, fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#374151', display: 'block', marginBottom: '3px' }}>Caminhões</label>
                    <input type="number" min="0" value={formEtapa.quantidade_caminhoes}
                      onChange={e => setFormEtapa(f => ({ ...f, quantidade_caminhoes: e.target.value }))}
                      placeholder="0" style={{ ...inputStyle, fontSize: '13px' }} />
                  </div>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', color: '#374151', display: 'block', marginBottom: '3px' }}>Equipe (nomes)</label>
                  <input value={formEtapa.equipe} onChange={e => setFormEtapa(f => ({ ...f, equipe: e.target.value }))}
                    placeholder="Ex: João, Pedro, Carlos" style={{ ...inputStyle, fontSize: '13px' }} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: '#374151', display: 'block', marginBottom: '3px' }}>Observações</label>
                  <input value={formEtapa.observacoes} onChange={e => setFormEtapa(f => ({ ...f, observacoes: e.target.value }))}
                    placeholder="Notas para esta etapa" style={{ ...inputStyle, fontSize: '13px' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {editandoEtapa && (
                    <button onClick={() => { setEditandoEtapa(null); setFormEtapa(EMPTY_ETAPA); }}
                      style={{ padding: '7px 14px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '12px', cursor: 'pointer', background: 'white' }}>
                      Cancelar
                    </button>
                  )}
                  <button onClick={salvarEtapa} disabled={salvandoEtapa || !formEtapa.data}
                    style={{ flex: 1, padding: '7px 14px', background: '#0369a1', color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', cursor: 'pointer', fontWeight: '600', opacity: !formEtapa.data ? 0.5 : 1 }}>
                    {salvandoEtapa ? 'Salvando...' : editandoEtapa ? 'Atualizar etapa' : 'Adicionar etapa'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vistoria Digital */}
      {showVistoria && (
        <VistoriaDigital
          tipo={showVistoria.tipo}
          onClose={() => setShowVistoria(null)}
          onSave={async (dados) => {
            try {
              const resumo = dados.comodos.map(c =>
                `[${c.nome}] ${c.itens.map(i => `${i.descricao}: ${i.condicao}${i.observacao ? ` (${i.observacao})` : ''}`).join('; ')}${c.observacoes ? ` | Obs: ${c.observacoes}` : ''}`
              ).join('\n');
              const campo = dados.tipo === 'saida' ? 'checklist' : 'observacoes_finais';
              await api.updateOS(showVistoria.os.id, {
                [campo]: `VISTORIA DE ${dados.tipo.toUpperCase()} — ${new Date().toLocaleDateString('pt-BR')}\n${resumo}${dados.assinatura ? '\n[Assinatura digital registrada]' : ''}`,
              });
              setShowVistoria(null);
              carregar();
              alert('Vistoria salva com sucesso!');
            } catch (e) { alert('Erro: ' + e.message); }
          }}
        />
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

export default OrdensServico;
