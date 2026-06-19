import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Search, ExternalLink, Send, Truck, CheckCircle, X, AlertCircle, Share2, Mail } from 'lucide-react';
import { api } from '../lib/api';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtData = (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '—';
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };

const STATUS_COLOR = { rascunho: '#6b7280', enviado: '#2563eb', assinado: '#16a34a' };
const STATUS_LABEL = { rascunho: 'Rascunho', enviado: 'Enviado', assinado: 'Assinado' };
const TIPO_LABEL = { residencial: 'Residencial', comercial: 'Comercial', corporativo: 'Corporativo', 'guarda-moveis': 'Guarda-Móveis' };

const Contratos = () => {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [revisados, setRevisados] = useState(new Set()); // IDs dos contratos revisados nesta sessão
  const [confirmandoOS, setConfirmandoOS] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => {
    setLoading(true);
    api.getContratos()
      .then(setContratos)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const marcarEnviado = async (c) => {
    if (!revisados.has(c.id)) {
      alert('Revise o contrato no Drive antes de enviá-lo ao cliente.');
      return;
    }
    if (!window.confirm(`Confirmar envio do contrato ${c.numero} ao cliente "${c.cliente}"?\n\nEsta ação não pode ser desfeita.`)) return;
    try {
      await api.updateContrato(c.id, { status: 'enviado' });
      carregar();
    } catch (e) { alert(e.message); }
  };

  const abrirDrive = (c) => {
    if (!c.drive_url) { alert('URL do contrato não disponível. Verifique a configuração do Google Drive.'); return; }
    window.open(c.drive_url, '_blank');
    setRevisados(prev => new Set([...prev, c.id]));
  };

  const enviarWhatsApp = (c) => {
    const msg = [
      `📋 *CONTRATO DE SERVIÇO — LEGACY MOVING*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `Prezado(a) *${c.cliente}*,`,
      ``,
      `Segue abaixo o resumo do seu contrato com a Legacy Moving:`,
      ``,
      `📄 *Contrato:* ${c.numero}`,
      `🏠 *Tipo:* ${TIPO_LABEL[c.tipo_servico] || c.tipo_servico || '—'}`,
      `💰 *Valor Total:* ${fmt(c.valor)}`,
      c.data_execucao ? `📅 *Data de Execução:* ${fmtData(c.data_execucao)}` : '',
      c.drive_url ? `\n🔗 *Contrato completo:* ${c.drive_url}` : '',
      ``,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `✅ Para confirmar os serviços, por favor responda esta mensagem.`,
      ``,
      `Atenciosamente,`,
      `*Legacy Moving*`,
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const enviarEmail = (c) => {
    const subject = `Contrato ${c.numero} — Legacy Moving`;
    const body = [
      `Prezado(a) ${c.cliente},`,
      ``,
      `Segue o resumo do seu contrato:`,
      ``,
      `Contrato: ${c.numero}`,
      `Tipo: ${TIPO_LABEL[c.tipo_servico] || c.tipo_servico || '—'}`,
      `Valor Total: ${fmt(c.valor)}`,
      c.data_execucao ? `Data de Execução: ${fmtData(c.data_execucao)}` : '',
      c.drive_url ? `\nContrato PDF: ${c.drive_url}` : '',
      ``,
      `Atenciosamente,`,
      `Legacy Moving`,
    ].filter(Boolean).join('\n');
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  const gerarOS = async (c) => {
    setSalvando(true);
    try {
      await api.gerarOsDoContrato(c.id);
      setConfirmandoOS(null);
      carregar();
      alert(`OS gerada com sucesso para o contrato ${c.numero}! Acesse Ordens de Serviço para acompanhar.`);
    } catch (e) {
      alert(e.message);
    } finally {
      setSalvando(false);
    }
  };

  const filtrados = contratos.filter(c => {
    const ok = filtro === 'todos' || c.status === filtro;
    const match = !busca || (c.cliente || '').toLowerCase().includes(busca.toLowerCase())
      || (c.numero || '').toLowerCase().includes(busca.toLowerCase());
    return ok && match;
  });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTop: '3px solid #0f1f3d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  if (error) return <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}><AlertCircle size={32} style={{ marginBottom: '8px' }} /><p>{error}</p><button onClick={carregar} style={{ padding: '8px 16px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Tentar novamente</button></div>;

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 4px' }}>Contratos</h1>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Gerados automaticamente após Cadastro Complementar completo</p>
      </div>

      {/* Fluxo de status */}
      <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151' }}>
        <AlertCircle size={16} style={{ color: '#d97706', flexShrink: 0 }} />
        <span><strong>Fluxo:</strong> Contrato gerado (Rascunho) → Revisar PDF no Drive → Enviar ao cliente (muda para Enviado) → Gerar OS</span>
      </div>

      {/* Filtros */}
      <div style={{ background: 'white', borderRadius: '10px', padding: '14px', border: '1px solid #e5e7eb', marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por cliente ou número..."
            style={{ ...inputStyle, paddingLeft: '32px' }} />
        </div>
        {['todos', 'rascunho', 'enviado', 'assinado'].map(s => (
          <button key={s} onClick={() => setFiltro(s)}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid', fontSize: '13px', cursor: 'pointer',
              borderColor: filtro === s ? '#0f1f3d' : '#e5e7eb',
              background: filtro === s ? '#0f1f3d' : 'white',
              color: filtro === s ? 'white' : '#374151' }}>
            {s === 'todos' ? 'Todos' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['Número', 'Cliente', 'Tipo', 'Valor Total', 'Data Execução', 'Status', 'Ações'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Nenhum contrato encontrado</td></tr>
            ) : filtrados.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#0f1f3d', fontFamily: 'monospace' }}>{c.numero}</td>
                <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>{c.cliente}</td>
                <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280' }}>{TIPO_LABEL[c.tipo_servico] || c.tipo_servico || '—'}</td>
                <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{fmt(c.valor)}</td>
                <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280' }}>{fmtData(c.data_execucao)}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: (STATUS_COLOR[c.status] || '#6b7280') + '20', color: STATUS_COLOR[c.status] || '#6b7280' }}>
                    {STATUS_LABEL[c.status] || c.status}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {/* Revisar PDF (sempre disponível se tiver URL) */}
                    <button onClick={() => abrirDrive(c)}
                      title={c.drive_url ? 'Abrir PDF no Drive' : 'Drive não configurado'}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: c.drive_url ? '#eff6ff' : '#f9fafb', border: `1px solid ${c.drive_url ? '#bfdbfe' : '#e5e7eb'}`, borderRadius: '6px', fontSize: '11px', cursor: 'pointer', color: c.drive_url ? '#1d4ed8' : '#9ca3af' }}>
                      <ExternalLink size={12} />Revisar PDF
                    </button>

                    {/* Enviar ao cliente — apenas após revisar e em rascunho */}
                    {c.status === 'rascunho' && (
                      <button onClick={() => marcarEnviado(c)}
                        title={revisados.has(c.id) ? 'Enviar ao cliente' : 'Revise o PDF primeiro'}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: revisados.has(c.id) ? '#f0fdf4' : '#f9fafb', border: `1px solid ${revisados.has(c.id) ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: '6px', fontSize: '11px', cursor: 'pointer', color: revisados.has(c.id) ? '#15803d' : '#9ca3af' }}>
                        <Send size={12} />Enviar ao cliente
                      </button>
                    )}

                    {/* WhatsApp */}
                    <button onClick={() => enviarWhatsApp(c)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', color: '#15803d' }}>
                      <Share2 size={12} />WhatsApp
                    </button>

                    {/* Email */}
                    <button onClick={() => enviarEmail(c)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', color: '#1d4ed8' }}>
                      <Mail size={12} />E-mail
                    </button>

                    {/* Gerar OS — apenas quando não é rascunho e não tem OS ainda */}
                    {c.status !== 'rascunho' && (
                      <button onClick={() => setConfirmandoOS(c)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', color: '#1d4ed8' }}>
                        <Truck size={12} />Gerar OS
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal confirmação de OS */}
      {confirmandoOS && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Gerar Ordem de Serviço</h3>
              <button onClick={() => setConfirmandoOS(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
            </div>
            <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px' }}>
              <div><strong>Contrato:</strong> {confirmandoOS.numero}</div>
              <div><strong>Cliente:</strong> {confirmandoOS.cliente}</div>
              <div><strong>Valor:</strong> {fmt(confirmandoOS.valor)}</div>
              <div><strong>Data execução:</strong> {fmtData(confirmandoOS.data_execucao)}</div>
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
              A OS será criada com os dados do contrato. Você poderá complementar motorista, equipe e materiais na tela de Ordens de Serviço.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmandoOS(null)} style={{ padding: '9px 20px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'white' }}>Cancelar</button>
              <button onClick={() => gerarOS(confirmandoOS)} disabled={salvando}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', opacity: salvando ? 0.6 : 1 }}>
                <CheckCircle size={15} />{salvando ? 'Gerando...' : 'Confirmar e Gerar OS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contratos;
