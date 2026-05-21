import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const STATUS = {
  novo:          { label: 'Novo',           bg: '#dbeafe', color: '#1d4ed8' },
  em_negociacao: { label: 'Em Negociação',  bg: '#ede9fe', color: '#6d28d9' },
  aprovado:      { label: 'Aprovado',       bg: '#dcfce7', color: '#15803d' },
  rejeitado:     { label: 'Rejeitado',      bg: '#fee2e2', color: '#b91c1c' },
  cancelado:     { label: 'Cancelado',      bg: '#f3f4f6', color: '#6b7280' },
};

const S = {
  input: { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  label: { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 },
  btn:   { padding: '9px 18px', background: '#0f1f3d', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500 },
  btnSec:{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: '#fff', color: '#374151' },
};

const EMPTY_FORM = {
  cliente: '', cliente_id: null, lead_id: null,
  tipo_servico: 'residencial',
  data_prevista: '',
  orig_rua: '', orig_numero: '', orig_complemento: '', orig_bairro: '',
  orig_cidade: '', orig_estado: 'SP', orig_cep: '',
  dest_rua: '', dest_numero: '', dest_complemento: '', dest_bairro: '',
  dest_cidade: '', dest_estado: 'SP', dest_cep: '',
  valor_servico: '', valor_seguro: '',
  condicoes_pagamento: '',
  observacoes_comerciais: '',
};

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={S.label}>{label}</label>
    {children}
  </div>
);

const Overlay = ({ children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
    {children}
  </div>
);

export default function Orcamentos() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [lista, setLista]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [erro, setErro]         = useState(null);
  const [busca, setBusca]       = useState('');
  const [filtro, setFiltro]     = useState('');
  const [modal, setModal]       = useState(null); // 'form' | 'rejeitar' | 'cancelar'
  const [editando, setEditando] = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [justificativa, setJustificativa] = useState('');
  const [orcAtual, setOrcAtual] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const p = {};
      if (filtro) p.status = filtro;
      setLista(await api.getOrcamentos(p));
    } catch (e) { setErro(e.message); }
    finally { setLoading(false); }
  }, [filtro]);

  useEffect(() => { carregar(); }, [carregar]);

  // Abre formulário de edição para orçamento recém-criado (vindo de lead convertido)
  useEffect(() => {
    const editId = params.get('edit');
    if (!editId) return;
    api.getOrcamento(editId).then(orc => {
      abrirEditar(orc);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const abrirNovo = () => {
    setForm(EMPTY_FORM);
    setEditando(null);
    setErroForm('');
    setModal('form');
  };

  const abrirEditar = (o) => {
    setForm({
      cliente:    o.cliente,
      cliente_id: o.cliente_id,
      lead_id:    o.lead_id,
      tipo_servico: o.tipo_servico || 'residencial',
      data_prevista: o.data_prevista ? o.data_prevista.slice(0, 10) : '',
      orig_rua: o.orig_rua || '', orig_numero: o.orig_numero || '',
      orig_complemento: o.orig_complemento || '', orig_bairro: o.orig_bairro || '',
      orig_cidade: o.orig_cidade || '', orig_estado: o.orig_estado || 'SP',
      orig_cep: o.orig_cep || '',
      dest_rua: o.dest_rua || '', dest_numero: o.dest_numero || '',
      dest_complemento: o.dest_complemento || '', dest_bairro: o.dest_bairro || '',
      dest_cidade: o.dest_cidade || '', dest_estado: o.dest_estado || 'SP',
      dest_cep: o.dest_cep || '',
      valor_servico: o.valor_servico || '',
      valor_seguro:  o.valor_seguro  || '',
      condicoes_pagamento:   o.condicoes_pagamento   || '',
      observacoes_comerciais: o.observacoes_comerciais || '',
    });
    setEditando(o);
    setErroForm('');
    setModal('form');
  };

  const salvar = async () => {
    if (!form.cliente.trim()) { setErroForm('Nome do cliente é obrigatório'); return; }
    setSalvando(true);
    setErroForm('');
    try {
      const payload = {
        ...form,
        valor_servico: parseFloat(form.valor_servico) || 0,
        valor_seguro:  parseFloat(form.valor_seguro)  || 0,
        data_prevista: form.data_prevista || null,
      };
      if (editando) await api.updateOrcamento(editando.id, payload);
      else          await api.createOrcamento(payload);
      setModal(null);
      carregar();
    } catch (e) { setErroForm(e.message); }
    finally { setSalvando(false); }
  };

  const aprovar = async (o) => {
    if (!window.confirm(`Aprovar orçamento ${o.numero}?\n\nIsso criará o Cadastro Complementar com os dados pré-preenchidos.`)) return;
    try {
      const res = await api.aprovarOrcamento(o.id);
      carregar();
      // Navega automaticamente para o cadastro complementar
      if (res.cadastro?.id) {
        navigate(`/cadastro-complementar?id=${res.cadastro.id}`);
      }
    } catch (e) { alert(e.message); }
  };

  const confirmarJustificativa = async () => {
    if (!justificativa.trim()) { alert('Justificativa é obrigatória'); return; }
    setSalvando(true);
    try {
      await api.updateOrcamento(orcAtual.id, {
        status: modal === 'rejeitar' ? 'rejeitado' : 'cancelado',
        justificativa,
      });
      setModal(null);
      setJustificativa('');
      setOrcAtual(null);
      carregar();
    } catch (e) { alert(e.message); }
    finally { setSalvando(false); }
  };

  const abrirJustificativa = (o, tipo) => {
    setOrcAtual(o);
    setJustificativa('');
    setModal(tipo); // 'rejeitar' | 'cancelar'
  };

  const filtrados = lista.filter(o => {
    const matchStatus = !filtro || o.status === filtro;
    const matchBusca  = !busca  || o.cliente.toLowerCase().includes(busca.toLowerCase())
                                 || o.numero.toLowerCase().includes(busca.toLowerCase());
    return matchStatus && matchBusca;
  });

  return (
    <div style={{ padding: 24, background: '#f8f9fa', minHeight: '100vh' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 2px' }}>Orçamentos</h1>
          <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>{lista.length} registros</p>
        </div>
        <button onClick={abrirNovo} style={S.btn}>+ Novo Orçamento</button>
      </div>

      {/* Filtros */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', border: '1px solid #e5e7eb', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente ou número..."
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }} />
        <select value={filtro} onChange={e => setFiltro(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Tabela */}
      {loading ? <Spinner /> : erro ? <Erro msg={erro} onRetry={carregar} /> : (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Número', 'Cliente', 'Tipo', 'Valor Total', 'Data Prev.', 'Status', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Nenhum orçamento encontrado</td></tr>
              ) : filtrados.map(o => {
                const st = STATUS[o.status] || { label: o.status, bg: '#f3f4f6', color: '#6b7280' };
                // Permite editar todos exceto rejeitado/cancelado
                const podeEditar  = !['rejeitado', 'cancelado'].includes(o.status);
                const podeCancelar = !['rejeitado', 'cancelado'].includes(o.status);
                return (
                  <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{o.numero}</td>
                    <td style={{ padding: '11px 14px', fontWeight: 500 }}>{o.cliente}</td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: '#6b7280', textTransform: 'capitalize' }}>{o.tipo_servico}</td>
                    <td style={{ padding: '11px 14px', fontWeight: 600 }}>{fmt((o.valor_servico || 0) + (o.valor_seguro || 0))}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#6b7280' }}>
                      {o.data_prevista ? new Date(o.data_prevista).toLocaleDateString('pt-BR') : '–'}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(o.status === 'novo' || o.status === 'em_negociacao') && (
                          <>
                            <button onClick={() => aprovar(o)} title="Aprovar"
                              style={{ padding: '4px 10px', background: '#dcfce7', color: '#15803d', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                              ✓ Aprovar
                            </button>
                            <button onClick={() => abrirJustificativa(o, 'rejeitar')} title="Rejeitar"
                              style={{ padding: '4px 10px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                              ✕ Rejeitar
                            </button>
                          </>
                        )}
                        {podeEditar && (
                          <button onClick={() => abrirEditar(o)}
                            style={{ padding: '4px 10px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                            ✎ Editar
                          </button>
                        )}
                        {o.status === 'aprovado' && (
                          <button onClick={() => navigate(`/cadastro-complementar?orcamento_id=${o.id}`)}
                            style={{ padding: '4px 10px', background: '#ede9fe', color: '#6d28d9', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                            → Cadastro
                          </button>
                        )}
                        {podeCancelar && (
                          <button onClick={() => abrirJustificativa(o, 'cancelar')}
                            style={{ padding: '4px 8px', background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL FORMULÁRIO ─────────────────────────────────────── */}
      {modal === 'form' && (
        <Overlay>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                {editando ? `Editar ${editando.numero}` : 'Novo Orçamento'}
              </h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>

            {/* Cliente + Tipo + Data */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <Field label="Cliente *">
                <input value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} style={S.input} />
              </Field>
              <Field label="Tipo de Serviço">
                <select value={form.tipo_servico} onChange={e => setForm(f => ({ ...f, tipo_servico: e.target.value }))} style={S.input}>
                  <option value="residencial">Residencial</option>
                  <option value="comercial">Comercial</option>
                  <option value="corporativo">Corporativo</option>
                  <option value="guarda_moveis">Guarda-Móveis</option>
                </select>
              </Field>
              <Field label="Data Prevista">
                <input type="date" value={form.data_prevista} onChange={e => setForm(f => ({ ...f, data_prevista: e.target.value }))} style={S.input} />
              </Field>
            </div>

            {/* Endereço Origem */}
            <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Endereço de Origem</p>
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 2fr', gap: 10, marginBottom: 10 }}>
              <Field label="Rua / Logradouro">
                <input value={form.orig_rua} onChange={e => setForm(f => ({ ...f, orig_rua: e.target.value }))} style={S.input} />
              </Field>
              <Field label="Número">
                <input value={form.orig_numero} onChange={e => setForm(f => ({ ...f, orig_numero: e.target.value }))} style={S.input} />
              </Field>
              <Field label="Complemento">
                <input value={form.orig_complemento} onChange={e => setForm(f => ({ ...f, orig_complemento: e.target.value }))} style={S.input} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
              <Field label="Bairro">
                <input value={form.orig_bairro} onChange={e => setForm(f => ({ ...f, orig_bairro: e.target.value }))} style={S.input} />
              </Field>
              <Field label="Cidade">
                <input value={form.orig_cidade} onChange={e => setForm(f => ({ ...f, orig_cidade: e.target.value }))} style={S.input} />
              </Field>
              <Field label="UF">
                <input value={form.orig_estado} maxLength={2} onChange={e => setForm(f => ({ ...f, orig_estado: e.target.value.toUpperCase() }))} style={S.input} />
              </Field>
              <Field label="CEP">
                <input value={form.orig_cep} onChange={e => setForm(f => ({ ...f, orig_cep: e.target.value }))} style={S.input} />
              </Field>
            </div>

            {/* Endereço Destino */}
            <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Endereço de Destino</p>
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 2fr', gap: 10, marginBottom: 10 }}>
              <Field label="Rua / Logradouro">
                <input value={form.dest_rua} onChange={e => setForm(f => ({ ...f, dest_rua: e.target.value }))} style={S.input} />
              </Field>
              <Field label="Número">
                <input value={form.dest_numero} onChange={e => setForm(f => ({ ...f, dest_numero: e.target.value }))} style={S.input} />
              </Field>
              <Field label="Complemento">
                <input value={form.dest_complemento} onChange={e => setForm(f => ({ ...f, dest_complemento: e.target.value }))} style={S.input} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
              <Field label="Bairro">
                <input value={form.dest_bairro} onChange={e => setForm(f => ({ ...f, dest_bairro: e.target.value }))} style={S.input} />
              </Field>
              <Field label="Cidade">
                <input value={form.dest_cidade} onChange={e => setForm(f => ({ ...f, dest_cidade: e.target.value }))} style={S.input} />
              </Field>
              <Field label="UF">
                <input value={form.dest_estado} maxLength={2} onChange={e => setForm(f => ({ ...f, dest_estado: e.target.value.toUpperCase() }))} style={S.input} />
              </Field>
              <Field label="CEP">
                <input value={form.dest_cep} onChange={e => setForm(f => ({ ...f, dest_cep: e.target.value }))} style={S.input} />
              </Field>
            </div>

            {/* Valores + Condições */}
            <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Valores e Condições</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12, marginBottom: 14 }}>
              <Field label="Valor do Serviço (R$)">
                <input type="number" min="0" step="0.01" value={form.valor_servico}
                  onChange={e => setForm(f => ({ ...f, valor_servico: e.target.value }))} style={S.input} />
              </Field>
              <Field label="Valor do Seguro (R$)">
                <input type="number" min="0" step="0.01" value={form.valor_seguro}
                  onChange={e => setForm(f => ({ ...f, valor_seguro: e.target.value }))} style={S.input} />
              </Field>
              <Field label="Condições de Pagamento">
                <input value={form.condicoes_pagamento} placeholder="Ex: 50% entrada, 50% na execução"
                  onChange={e => setForm(f => ({ ...f, condicoes_pagamento: e.target.value }))} style={S.input} />
              </Field>
            </div>
            <Field label="Observações Comerciais">
              <textarea value={form.observacoes_comerciais} rows={2}
                onChange={e => setForm(f => ({ ...f, observacoes_comerciais: e.target.value }))}
                style={{ ...S.input, resize: 'vertical' }} />
            </Field>

            {form.valor_servico > 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
                <strong>Total: {fmt((parseFloat(form.valor_servico) || 0) + (parseFloat(form.valor_seguro) || 0))}</strong>
                {' '}(serviço {fmt(form.valor_servico)} + seguro {fmt(form.valor_seguro)})
              </div>
            )}

            {erroForm && <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 10px' }}>{erroForm}</p>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={S.btnSec}>Cancelar</button>
              <button onClick={salvar} disabled={salvando} style={S.btn}>
                {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Criar Orçamento'}
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── MODAL JUSTIFICATIVA (Rejeitar / Cancelar) ─────────── */}
      {(modal === 'rejeitar' || modal === 'cancelar') && orcAtual && (
        <Overlay>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>
              {modal === 'rejeitar' ? 'Rejeitar' : 'Cancelar'} Orçamento
            </h2>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 18px' }}>{orcAtual.numero} — {orcAtual.cliente}</p>
            <Field label="Justificativa *">
              <textarea value={justificativa} rows={4} autoFocus
                placeholder="Descreva o motivo..."
                onChange={e => setJustificativa(e.target.value)}
                style={{ ...S.input, resize: 'vertical' }} />
            </Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => { setModal(null); setOrcAtual(null); }} style={S.btnSec}>Voltar</button>
              <button onClick={confirmarJustificativa} disabled={salvando}
                style={{ ...S.btn, background: modal === 'rejeitar' ? '#b91c1c' : '#6b7280' }}>
                {salvando ? 'Salvando...' : modal === 'rejeitar' ? 'Confirmar Rejeição' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

const Spinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
    <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTop: '3px solid #0f1f3d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const Erro = ({ msg, onRetry }) => (
  <div style={{ textAlign: 'center', padding: 60, color: '#dc2626' }}>
    <p>{msg}</p>
    <button onClick={onRetry} style={{ marginTop: 8, padding: '8px 16px', background: '#0f1f3d', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Tentar novamente</button>
  </div>
);
