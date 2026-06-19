import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Receipt, Search, Plus, CheckCircle, Clock, X,
  Printer, Share2, Eye, Edit2, FileText
} from 'lucide-react';
import { api } from '../lib/api';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '—';
const fmtDateFull = (v) => v ? new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
const today = () => new Date().toISOString().slice(0, 16);

const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb',
  borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
};
const labelStyle = { fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' };

const STATUS_COLOR = { pendente: '#d97706', recebido: '#16a34a', cancelado: '#dc2626' };
const STATUS_LABEL = { pendente: 'Pendente', recebido: 'Recebido', cancelado: 'Cancelado' };
const FORMAS_PAGAMENTO = ['pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'transferencia', 'boleto'];
const FORMAS_LABEL = {
  pix: 'PIX', dinheiro: 'Dinheiro', cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito', transferencia: 'Transferência Bancária', boleto: 'Boleto'
};

const EMPTY_FORM = {
  os_id: '', cliente: '', cliente_id: '', servico_realizado: '',
  valor_cobrado: '', forma_pagamento: 'pix', data_pagamento: today(), observacoes: ''
};

// ── Recibo visual para impressão / WhatsApp ───────────────────────────────────
const ReciboVisual = ({ recibo, onClose }) => {
  const ref = useRef();

  const handlePrint = () => {
    const conteudo = ref.current.innerHTML;
    const janela = window.open('', '_blank');
    janela.document.write(`
      <html><head><title>Recibo ${recibo.numero}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #1a1a1a; }
        * { box-sizing: border-box; }
      </style></head>
      <body>${conteudo}</body></html>
    `);
    janela.document.close();
    janela.print();
  };

  const handleWhatsApp = () => {
    const txt = [
      `🧾 *RECIBO DE SERVIÇO*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `*Legacy Moving*`,
      ``,
      `📋 *Nº do Recibo:* ${recibo.numero}`,
      `👤 *Cliente:* ${recibo.cliente}`,
      recibo.os_numero ? `🚚 *OS:* ${recibo.os_numero}` : '',
      ``,
      `📝 *Serviço:* ${recibo.servico_realizado || 'Serviço de mudança'}`,
      ``,
      `💰 *Valor:* ${fmt(recibo.valor_cobrado)}`,
      recibo.forma_pagamento ? `💳 *Pagamento:* ${FORMAS_LABEL[recibo.forma_pagamento] || recibo.forma_pagamento}` : '',
      recibo.data_pagamento ? `📅 *Data:* ${fmtDate(recibo.data_pagamento)}` : '',
      ``,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `✅ *Status: ${STATUS_LABEL[recibo.status] || recibo.status}*`,
      recibo.observacoes ? `\n📌 *Obs:* ${recibo.observacoes}` : '',
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto' }}>
        {/* Controles */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', borderRadius: '16px 16px 0 0' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>Visualizar Recibo</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleWhatsApp}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', background: '#25d366', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
              <Share2 size={13} /> WhatsApp
            </button>
            <button onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
              <Printer size={13} /> Imprimir
            </button>
            <button onClick={onClose}
              style={{ padding: '7px', background: 'none', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', color: '#6b7280' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Recibo visual */}
        <div ref={ref} style={{ padding: '32px 36px' }}>
          {/* Cabeçalho */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
            <div>
              <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '800', color: '#0f1f3d', letterSpacing: '-0.5px' }}>
                Legacy Moving
              </h1>
              <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Serviços de Mudança Profissional</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', letterSpacing: '1px', marginBottom: '4px' }}>RECIBO</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#2563eb' }}>#{recibo.numero}</div>
            </div>
          </div>

          {/* Linha divisória */}
          <div style={{ borderTop: '2px solid #0f1f3d', marginBottom: '24px' }} />

          {/* Info principal */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cliente</p>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>{recibo.cliente || '—'}</p>
            </div>
            {recibo.os_numero && (
              <div>
                <p style={{ margin: '0 0 2px', fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ordem de Serviço</p>
                <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>{recibo.os_numero}</p>
              </div>
            )}
            <div>
              <p style={{ margin: '0 0 2px', fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data</p>
              <p style={{ margin: 0, fontSize: '14px', color: '#1a1a1a' }}>{fmtDateFull(recibo.data_pagamento || recibo.created_at)}</p>
            </div>
            {recibo.forma_pagamento && (
              <div>
                <p style={{ margin: '0 0 2px', fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Forma de Pagamento</p>
                <p style={{ margin: 0, fontSize: '14px', color: '#1a1a1a' }}>{FORMAS_LABEL[recibo.forma_pagamento] || recibo.forma_pagamento}</p>
              </div>
            )}
          </div>

          {/* Serviço */}
          <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px' }}>
            <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Descrição do Serviço</p>
            <p style={{ margin: 0, fontSize: '14px', color: '#1a1a1a', lineHeight: '1.6' }}>
              {recibo.servico_realizado || 'Serviço de mudança realizado conforme contrato.'}
            </p>
          </div>

          {/* Valor em destaque */}
          <div style={{ background: '#0f1f3d', borderRadius: '12px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor Total</p>
              <p style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: 'white' }}>{fmt(recibo.valor_cobrado)}</p>
            </div>
            <div style={{
              padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '700',
              background: recibo.status === 'recebido' ? '#16a34a' : '#d97706',
              color: 'white'
            }}>
              {recibo.status === 'recebido' ? '✓ PAGO' : '⏳ PENDENTE'}
            </div>
          </div>

          {/* Observações */}
          {recibo.observacoes && (
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginBottom: '16px' }}>
              <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Observações</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>{recibo.observacoes}</p>
            </div>
          )}

          {/* Rodapé */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>
              Documento gerado eletronicamente • Legacy Moving • {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Modal novo recibo ─────────────────────────────────────────────────────────
const ModalNovoRecibo = ({ onClose, onSalvo, osPreId = '' }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [osList, setOsList] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [carregandoOS, setCarregandoOS] = useState(true);

  useEffect(() => {
    api.getOS({ limit: 200 })
      .then(data => {
        const lista = Array.isArray(data) ? data : (data.items || []);
        setOsList(lista);
        // Auto-preenche se veio da OS
        if (osPreId) {
          const os = lista.find(o => String(o.id) === String(osPreId));
          if (os) {
            setForm(f => ({
              ...f,
              os_id: String(os.id),
              cliente: os.cliente || '',
              cliente_id: os.cliente_id || '',
              servico_realizado: `Serviço de mudança ${os.tipo_servico ? '(' + os.tipo_servico + ')' : ''} — ${os.endereco_origem || ''} → ${os.endereco_destino || ''}`.trim(),
              valor_cobrado: String(os.valor_total || ''),
            }));
          }
        }
      })
      .catch(() => setOsList([]))
      .finally(() => setCarregandoOS(false));
  }, [osPreId]); // eslint-disable-line

  const selecionarOS = (osId) => {
    if (!osId) { setForm({ ...form, os_id: '', cliente: '', cliente_id: '', servico_realizado: '', valor_cobrado: '' }); return; }
    const os = osList.find(o => String(o.id) === String(osId));
    if (!os) return;
    setForm(f => ({
      ...f,
      os_id: osId,
      cliente: os.cliente || '',
      cliente_id: os.cliente_id || '',
      servico_realizado: `Serviço de mudança ${os.tipo_servico ? '(' + os.tipo_servico + ')' : ''} — ${os.endereco_origem || ''} → ${os.endereco_destino || ''}`.trim(),
      valor_cobrado: String(os.valor_total || ''),
    }));
  };

  const salvar = async () => {
    if (!form.cliente.trim()) { setErro('Nome do cliente é obrigatório'); return; }
    if (!form.valor_cobrado) { setErro('Valor é obrigatório'); return; }
    setSalvando(true);
    try {
      const payload = {
        ...form,
        os_id: form.os_id ? parseInt(form.os_id) : null,
        cliente_id: form.cliente_id || null,
        valor_cobrado: parseFloat(form.valor_cobrado) || 0,
      };
      if (!payload.data_pagamento) delete payload.data_pagamento;
      await api.createRecibo(payload);
      onSalvo();
      onClose();
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={18} color="#0f1f3d" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Gerar Recibo</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '24px' }}>
          {erro && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>
              {erro}
            </div>
          )}

          {/* Selecionar OS (opcional) */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Vincular a uma OS <span style={{ color: '#9ca3af', fontWeight: '400' }}>(opcional — preenche automático)</span></label>
            <select
              value={form.os_id}
              onChange={e => selecionarOS(e.target.value)}
              style={inputStyle}
              disabled={carregandoOS}
            >
              <option value="">— Sem OS vinculada —</option>
              {osList.map(o => (
                <option key={o.id} value={o.id}>
                  {o.numero} · {o.cliente} · {fmt(o.valor_total)}
                </option>
              ))}
            </select>
            {carregandoOS && <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#9ca3af' }}>Carregando ordens de serviço...</p>}
          </div>

          {/* Linha divisória */}
          <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0 16px' }} />

          {/* Cliente */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Cliente *</label>
            <input
              value={form.cliente}
              onChange={e => setForm({ ...form, cliente: e.target.value })}
              placeholder="Nome do cliente"
              style={inputStyle}
            />
          </div>

          {/* Descrição do serviço */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Descrição do Serviço</label>
            <textarea
              value={form.servico_realizado}
              onChange={e => setForm({ ...form, servico_realizado: e.target.value })}
              placeholder="Ex: Mudança residencial — Av. Paulista, 100 → Rua Augusta, 200"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }}
            />
          </div>

          {/* Valor + Forma */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Valor (R$) *</label>
              <input
                type="number"
                value={form.valor_cobrado}
                onChange={e => setForm({ ...form, valor_cobrado: e.target.value })}
                placeholder="0.00"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Forma de Pagamento</label>
              <input
                value={form.forma_pagamento}
                onChange={e => setForm({ ...form, forma_pagamento: e.target.value })}
                placeholder="Ex: 50% cartão e 50% PIX"
                style={inputStyle}
                list="formas-pagamento-novo"
              />
              <datalist id="formas-pagamento-novo">
                {FORMAS_PAGAMENTO.map(fp => <option key={fp} value={FORMAS_LABEL[fp]} />)}
              </datalist>
            </div>
          </div>

          {/* Data */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Data do Serviço / Pagamento</label>
            <input
              type="datetime-local"
              value={form.data_pagamento}
              onChange={e => setForm({ ...form, data_pagamento: e.target.value })}
              style={inputStyle}
            />
          </div>

          {/* Obs */}
          <div style={{ marginBottom: '4px' }}>
            <label style={labelStyle}>Observações</label>
            <textarea
              value={form.observacoes}
              onChange={e => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Informações adicionais..."
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose}
            style={{ padding: '9px 20px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', fontSize: '13px', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 20px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', opacity: salvando ? 0.7 : 1 }}>
            <Receipt size={15} /> {salvando ? 'Gerando...' : 'Gerar Recibo'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────
const Recibos = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [recibos, setRecibos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [showNovo, setShowNovo] = useState(false);
  const [osPreId, setOsPreId] = useState('');
  const [reciboVisual, setReciboVisual] = useState(null);

  // Auto-abre modal se veio de uma OS (ex: /recibos?os_id=123)
  useEffect(() => {
    const id = searchParams.get('os_id');
    if (id) {
      setOsPreId(id);
      setShowNovo(true);
      setSearchParams({}, { replace: true }); // limpa a URL
    }
  }, []); // eslint-disable-line

  // Modal confirmar recebimento
  const [modalReceber, setModalReceber] = useState(null);
  const [formReceber, setFormReceber] = useState({ forma_pagamento: 'pix', data_pagamento: '' });
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');

  const carregar = useCallback(() => {
    setLoading(true);
    api.getRecibos(filtroStatus !== 'todos' ? { status: filtroStatus } : {})
      .then(setRecibos)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [filtroStatus]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirReceber = (r) => {
    setModalReceber(r);
    setFormReceber({ forma_pagamento: r.forma_pagamento || 'pix', data_pagamento: new Date().toISOString().slice(0, 16) });
    setErroForm('');
  };

  const confirmarRecebimento = async () => {
    if (!formReceber.forma_pagamento) { setErroForm('Forma de pagamento obrigatória'); return; }
    setSalvando(true);
    try {
      await api.confirmarRecibo(modalReceber.id, formReceber);
      setModalReceber(null);
      carregar();
    } catch (e) { setErroForm(e.message); }
    finally { setSalvando(false); }
  };

  const filtrados = recibos.filter(r => {
    const q = busca.toLowerCase();
    return !busca ||
      (r.numero || '').toLowerCase().includes(q) ||
      (r.cliente || '').toLowerCase().includes(q);
  });

  const totalPendente = recibos.filter(r => r.status === 'pendente').reduce((s, r) => s + (r.valor_cobrado || 0), 0);
  const totalRecebido = recibos.filter(r => r.status === 'recebido').reduce((s, r) => s + (r.valor_cobrado || 0), 0);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Carregando...</div>;
  if (error) return <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>{error}</div>;

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 4px' }}>Recibos</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>{recibos.length} recibos · {filtrados.length} exibidos</p>
        </div>
        <button onClick={() => setShowNovo(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
          <Plus size={14} /> Gerar Recibo
        </button>
      </div>

      {/* Cards resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '0.5px solid #e5e7eb', borderLeft: '4px solid #d97706' }}>
          <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>A Receber</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#d97706' }}>{fmt(totalPendente)}</div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{recibos.filter(r => r.status === 'pendente').length} pendentes</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '0.5px solid #e5e7eb', borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Recebido</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#16a34a' }}>{fmt(totalRecebido)}</div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{recibos.filter(r => r.status === 'recebido').length} confirmados</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '0.5px solid #e5e7eb', borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Total Geral</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#2563eb' }}>{fmt(totalPendente + totalRecebido)}</div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{recibos.length} recibos no total</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            placeholder="Buscar por número ou cliente..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '36px' }}
          />
        </div>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          style={{ padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', background: 'white' }}>
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="recebido">Recebido</option>
        </select>
      </div>

      {/* Tabela */}
      <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['Número', 'Cliente', 'OS', 'Serviço', 'Valor', 'Pagamento', 'Data', 'Status', 'Ações'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                <Receipt size={28} style={{ margin: '0 auto 8px', display: 'block', color: '#d1d5db' }} />
                Nenhum recibo encontrado
              </td></tr>
            ) : filtrados.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '700', color: '#2563eb', whiteSpace: 'nowrap' }}>{r.numero}</td>
                <td style={{ padding: '12px 14px', fontSize: '13px', color: '#1a1a1a', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.cliente || '—'}</td>
                <td style={{ padding: '12px 14px', fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{r.os?.numero || (r.os_id ? `OS #${r.os_id}` : '—')}</td>
                <td style={{ padding: '12px 14px', fontSize: '12px', color: '#6b7280', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.servico_realizado || '—'}
                </td>
                <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '700', color: '#1a1a1a', whiteSpace: 'nowrap' }}>{fmt(r.valor_cobrado)}</td>
                <td style={{ padding: '12px 14px', fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                  {r.forma_pagamento ? (FORMAS_LABEL[r.forma_pagamento] || r.forma_pagamento) : '—'}
                </td>
                <td style={{ padding: '12px 14px', fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDate(r.data_pagamento || r.created_at)}</td>
                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                    background: (STATUS_COLOR[r.status] || '#9ca3af') + '20',
                    color: STATUS_COLOR[r.status] || '#9ca3af'
                  }}>
                    {r.status === 'recebido' ? <CheckCircle size={11} /> : <Clock size={11} />}
                    {STATUS_LABEL[r.status] || r.status}
                  </span>
                </td>
                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setReciboVisual(r)} title="Visualizar recibo"
                      style={{ padding: '5px 8px', background: '#f0f4ff', color: '#2563eb', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Eye size={12} /> Ver
                    </button>
                    {r.status === 'pendente' && (
                      <button onClick={() => abrirReceber(r)}
                        style={{ padding: '5px 10px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>
                        Confirmar
                      </button>
                    )}
                    {r.drive_url && (
                      <a href={r.drive_url} target="_blank" rel="noreferrer"
                        style={{ padding: '5px 8px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', textDecoration: 'none' }}>
                        PDF
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal confirmar recebimento */}
      {modalReceber && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '440px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Confirmar Recebimento</h2>
                <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: '13px' }}>{modalReceber.numero} — {fmt(modalReceber.valor_cobrado)}</p>
              </div>
              <button onClick={() => setModalReceber(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              {erroForm && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>{erroForm}</div>}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Forma de Pagamento *</label>
                <input
                  value={formReceber.forma_pagamento}
                  onChange={e => setFormReceber(f => ({ ...f, forma_pagamento: e.target.value }))}
                  placeholder="Ex: 50% cartão e 50% PIX"
                  style={inputStyle}
                  list="formas-pagamento-receber"
                />
                <datalist id="formas-pagamento-receber">
                  {FORMAS_PAGAMENTO.map(fp => <option key={fp} value={FORMAS_LABEL[fp]} />)}
                </datalist>
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#9ca3af' }}>Selecione uma sugestão ou digite livremente (ex: "50% cartão e 50% PIX")</p>
              </div>
              <div>
                <label style={labelStyle}>Data do Pagamento</label>
                <input type="datetime-local" value={formReceber.data_pagamento} onChange={e => setFormReceber(f => ({ ...f, data_pagamento: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setModalReceber(null)} style={{ padding: '9px 20px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmarRecebimento} disabled={salvando}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', opacity: salvando ? 0.6 : 1, fontWeight: '600' }}>
                <CheckCircle size={15} /> {salvando ? 'Confirmando...' : 'Confirmar Recebimento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal novo recibo */}
      {showNovo && <ModalNovoRecibo onClose={() => { setShowNovo(false); setOsPreId(''); }} onSalvo={carregar} osPreId={osPreId} />}

      {/* Recibo visual */}
      {reciboVisual && <ReciboVisual recibo={reciboVisual} onClose={() => setReciboVisual(null)} />}
    </div>
  );
};

export default Recibos;
