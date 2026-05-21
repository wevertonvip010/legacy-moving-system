import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Search, CheckCircle, Clock, ChevronRight, X, Save } from 'lucide-react';
import { api } from '../lib/api';

const fmt = (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '—';
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };
const labelStyle = { fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' };

const STATUS_COLOR = { pendente: '#d97706', completo: '#16a34a' };
const STATUS_LABEL = { pendente: 'Pendente', completo: 'Completo' };

const EMPTY_FORM = {
  cpf_cnpj: '',
  orig_rua: '', orig_numero: '', orig_complemento: '', orig_bairro: '', orig_cidade: '', orig_estado: '', orig_cep: '',
  dest_rua: '', dest_numero: '', dest_complemento: '', dest_bairro: '', dest_cidade: '', dest_estado: '', dest_cep: '',
  data_confirmada: '',
  dados_para_contrato: '',
};

const CadastroComplementar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cadastros, setCadastros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [selecionado, setSelecionado] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [sucesso, setSucesso] = useState('');

  const carregar = useCallback(() => {
    setLoading(true);
    api.getCadastros()
      .then(setCadastros)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Auto-open cadastro when navigating from Orcamentos with ?id= or ?orcamento_id=
  useEffect(() => {
    if (loading || cadastros.length === 0) return;
    const idParam = searchParams.get('id');
    const orcIdParam = searchParams.get('orcamento_id');
    if (idParam) {
      const c = cadastros.find(x => String(x.id) === idParam);
      if (c) { abrir(c); setSearchParams({}, { replace: true }); }
    } else if (orcIdParam) {
      const c = cadastros.find(x => String(x.orcamento_id) === orcIdParam);
      if (c) { abrir(c); setSearchParams({}, { replace: true }); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, cadastros]);

  const abrir = (c) => {
    setSelecionado(c);
    setForm({
      cpf_cnpj: c.cpf_cnpj || '',
      orig_rua: c.orig_rua || '', orig_numero: c.orig_numero || '', orig_complemento: c.orig_complemento || '',
      orig_bairro: c.orig_bairro || '', orig_cidade: c.orig_cidade || '', orig_estado: c.orig_estado || '', orig_cep: c.orig_cep || '',
      dest_rua: c.dest_rua || '', dest_numero: c.dest_numero || '', dest_complemento: c.dest_complemento || '',
      dest_bairro: c.dest_bairro || '', dest_cidade: c.dest_cidade || '', dest_estado: c.dest_estado || '', dest_cep: c.dest_cep || '',
      data_confirmada: c.data_confirmada ? c.data_confirmada.slice(0, 16) : '',
      dados_para_contrato: c.dados_para_contrato || '',
    });
    setErroForm('');
    setSucesso('');
  };

  const fechar = () => { setSelecionado(null); setForm(EMPTY_FORM); };

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const salvar = async () => {
    if (!form.cpf_cnpj.trim()) { setErroForm('CPF/CNPJ é obrigatório'); return; }
    if (!form.data_confirmada) { setErroForm('Data confirmada é obrigatória'); return; }
    setSalvando(true);
    setErroForm('');
    try {
      await api.updateCadastro(selecionado.id, form);
      setSucesso('Cadastro salvo com sucesso!');
      carregar();
      setTimeout(() => setSucesso(''), 3000);
    } catch (e) {
      setErroForm(e.message);
    } finally {
      setSalvando(false);
    }
  };

  const gerarContrato = async () => {
    if (!confirm('Gerar contrato a partir deste cadastro?')) return;
    try {
      await api.gerarContratoDosCadastro(selecionado.id);
      alert('Contrato gerado com sucesso! Acesse a aba Contratos.');
      fechar();
      carregar();
    } catch (e) {
      alert(e.message);
    }
  };

  const filtrados = cadastros.filter(c => {
    const okStatus = filtroStatus === 'todos' || c.status === filtroStatus;
    const nome = (c.orcamento?.cliente || c.orcamento?.numero || '').toLowerCase();
    const okBusca = !busca || nome.includes(busca.toLowerCase());
    return okStatus && okBusca;
  });

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Carregando...</div>;
  if (error) return <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>{error}</div>;

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 4px' }}>Cadastro Complementar</h1>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
          Complete os dados após aprovação do orçamento para gerar o contrato.
        </p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            placeholder="Buscar por cliente ou orçamento..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '36px' }}
          />
        </div>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          style={{ padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', background: 'white' }}>
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="completo">Completo</option>
        </select>
      </div>

      {/* Tabela */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['Orçamento', 'Cliente', 'Data Mudança', 'Status', 'Ação'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Nenhum cadastro encontrado</td></tr>
            ) : filtrados.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#2563eb' }}>{c.orcamento?.numero || '—'}</td>
                <td style={{ padding: '14px 16px', fontSize: '13px', color: '#1a1a1a' }}>{c.orcamento?.cliente || '—'}</td>
                <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280' }}>{fmt(c.data_confirmada)}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: STATUS_COLOR[c.status] + '20', color: STATUS_COLOR[c.status] }}>
                    {c.status === 'completo' ? <CheckCircle size={11} style={{ display: 'inline', marginRight: '4px' }} /> : <Clock size={11} style={{ display: 'inline', marginRight: '4px' }} />}
                    {STATUS_LABEL[c.status]}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <button onClick={() => abrir(c)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    {c.status === 'completo' ? 'Ver' : 'Preencher'} <ChevronRight size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de edição */}
      {selecionado && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '720px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Cadastro Complementar</h2>
                <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: '13px' }}>{selecionado.orcamento?.numero} — {selecionado.orcamento?.cliente}</p>
              </div>
              <button onClick={fechar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
            </div>

            {/* Corpo */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '24px' }}>
              {erroForm && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>{erroForm}</div>}
              {sucesso && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', color: '#16a34a', fontSize: '13px', marginBottom: '16px' }}>{sucesso}</div>}

              {/* CPF/CNPJ + Data */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={labelStyle}>CPF / CNPJ *</label>
                  <input value={form.cpf_cnpj} onChange={e => set('cpf_cnpj', e.target.value)} placeholder="000.000.000-00" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Data Confirmada *</label>
                  <input type="datetime-local" value={form.data_confirmada} onChange={e => set('data_confirmada', e.target.value)} style={inputStyle} />
                </div>
              </div>

              {/* Endereço Origem */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#374151', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>ORIGEM</span>
                  Endereço de Coleta
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div><label style={labelStyle}>Rua</label><input value={form.orig_rua} onChange={e => set('orig_rua', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Número</label><input value={form.orig_numero} onChange={e => set('orig_numero', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Complemento</label><input value={form.orig_complemento} onChange={e => set('orig_complemento', e.target.value)} style={inputStyle} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>Bairro</label><input value={form.orig_bairro} onChange={e => set('orig_bairro', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cidade</label><input value={form.orig_cidade} onChange={e => set('orig_cidade', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Estado</label><input value={form.orig_estado} onChange={e => set('orig_estado', e.target.value)} maxLength={2} style={inputStyle} /></div>
                  <div><label style={labelStyle}>CEP</label><input value={form.orig_cep} onChange={e => set('orig_cep', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>

              {/* Endereço Destino */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#374151', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>DESTINO</span>
                  Endereço de Entrega
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div><label style={labelStyle}>Rua</label><input value={form.dest_rua} onChange={e => set('dest_rua', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Número</label><input value={form.dest_numero} onChange={e => set('dest_numero', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Complemento</label><input value={form.dest_complemento} onChange={e => set('dest_complemento', e.target.value)} style={inputStyle} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>Bairro</label><input value={form.dest_bairro} onChange={e => set('dest_bairro', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cidade</label><input value={form.dest_cidade} onChange={e => set('dest_cidade', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Estado</label><input value={form.dest_estado} onChange={e => set('dest_estado', e.target.value)} maxLength={2} style={inputStyle} /></div>
                  <div><label style={labelStyle}>CEP</label><input value={form.dest_cep} onChange={e => set('dest_cep', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>

              {/* Dados para contrato */}
              <div>
                <label style={labelStyle}>Dados Adicionais para o Contrato</label>
                <textarea
                  value={form.dados_para_contrato}
                  onChange={e => set('dados_para_contrato', e.target.value)}
                  rows={4}
                  placeholder="Observações sobre a mudança, itens especiais, condições específicas..."
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={fechar} style={{ padding: '9px 20px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={salvar} disabled={salvando}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', opacity: salvando ? 0.6 : 1 }}>
                  <Save size={15} />{salvando ? 'Salvando...' : 'Salvar'}
                </button>
                {selecionado.status === 'completo' && (
                  <button onClick={gerarContrato}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <CheckCircle size={15} />Gerar Contrato
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CadastroComplementar;
