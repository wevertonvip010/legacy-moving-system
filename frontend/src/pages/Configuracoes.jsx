import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Settings, Users, Shield, Key, Building2, Mail, Phone, MapPin,
  Plus, Edit, Trash2, Eye, EyeOff, Save, RefreshCw, Lock, Unlock,
  UserCheck, Calendar, CheckCircle, AlertCircle, UserX, Bot, Globe,
  Database, Bell, FileText, Printer,
} from 'lucide-react';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

/* ─── helpers de estilo ─────────────────────────────── */
const card = {
  background: '#fff', borderRadius: '10px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '24px', marginBottom: '20px',
};
const label = {
  display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px',
};
const input = {
  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
  borderRadius: '6px', fontSize: '14px', color: '#111827',
  outline: 'none', boxSizing: 'border-box',
};
const inputIcon = { ...input, paddingLeft: '36px' };
const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '8px 16px', background: '#2563eb', color: '#fff',
  border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500',
  cursor: 'pointer',
};
const btnDanger = { ...btnPrimary, background: '#dc2626' };
const btnGray = {
  ...btnPrimary, background: '#e5e7eb', color: '#374151',
};
const btnGreen = { ...btnPrimary, background: '#16a34a' };
const btnPurple = { ...btnPrimary, background: '#7c3aed' };
const iconWrap = { position: 'relative', display: 'flex', alignItems: 'center' };
const iconAbs = {
  position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
  color: '#9ca3af', pointerEvents: 'none',
};

// ── ABA DOCUMENTOS ──────────────────────────────────────────────────────────
const TEMPLATE_DEFAULTS = {
  empresa_nome: 'LEGACY MOVING',
  empresa_cnpj: '',
  empresa_endereco: '',
  empresa_telefone: '',
  empresa_email: 'legacymovingbr@gmail.com',
  empresa_site: '',
  orcamento_termos: 'Este orçamento é válido por 15 dias. Os valores estão sujeitos a alteração sem aviso prévio.',
  contrato_clausulas: '1. O serviço será realizado na data acordada.\n2. O cliente deve garantir acesso aos locais de origem e destino.\n3. Objetos frágeis devem ser informados previamente.',
  recibo_observacoes: 'Recibo referente ao serviço de mudança prestado pela Legacy Moving.',
  rodape: 'Legacy Moving — Transporte e Mudanças Especializadas',
  numeracao_orc: 'ORC-{ANO}-{SEQ}',
  numeracao_os: 'OS-{ANO}-{SEQ}',
  numeracao_ct: 'CT-{ANO}-{SEQ}',
};

const fmt_input = {
  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
  borderRadius: '6px', fontSize: '13px', color: '#111827',
  outline: 'none', boxSizing: 'border-box',
};

const AbaDocumentos = () => {
  const [config, setConfig] = useState(TEMPLATE_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [preview, setPreview] = useState(null); // 'orcamento' | 'contrato' | 'recibo'

  useEffect(() => {
    api.getConfig()
      .then(data => {
        if (data && Object.keys(data).length > 0) {
          setConfig(prev => ({ ...prev, ...data }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const salvar = async () => {
    setSalvando(true);
    try {
      await api.setConfig(config);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2000);
    } catch (e) { alert(e.message); }
    finally { setSalvando(false); }
  };

  const inp = (field, label, placeholder, multiline = false) => (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>{label}</label>
      {multiline ? (
        <textarea value={config[field] || ''} onChange={e => setConfig(c => ({ ...c, [field]: e.target.value }))}
          placeholder={placeholder} rows={3}
          style={{ ...fmt_input, resize: 'vertical', fontFamily: 'inherit' }} />
      ) : (
        <input value={config[field] || ''} onChange={e => setConfig(c => ({ ...c, [field]: e.target.value }))}
          placeholder={placeholder} style={fmt_input} />
      )}
    </div>
  );

  if (loading) return <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>Carregando...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>Modelos de Documentos</h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>Configure o cabeçalho, termos e numeração dos documentos gerados pelo sistema</p>
        </div>
        <button onClick={salvar} disabled={salvando}
          style={{ ...btnPrimary, background: salvo ? '#16a34a' : '#0f1f3d', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          {salvo ? <CheckCircle size={14} /> : <Save size={14} />}
          {salvo ? 'Salvo!' : salvando ? 'Salvando...' : 'Salvar Templates'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Dados da Empresa */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '20px' }}>
          <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={16} color="#2563eb" /> Dados da Empresa nos Documentos
          </h4>
          {inp('empresa_nome', 'Nome / Razão Social', 'LEGACY MOVING LTDA')}
          {inp('empresa_cnpj', 'CNPJ', '00.000.000/0001-00')}
          {inp('empresa_endereco', 'Endereço Completo', 'Rua..., Nº..., Bairro, Cidade - UF')}
          {inp('empresa_telefone', 'Telefone', '(11) 99999-9999')}
          {inp('empresa_email', 'E-mail', 'contato@legacymoving.com.br')}
          {inp('empresa_site', 'Site', 'www.legacymoving.com.br')}
          {inp('rodape', 'Rodapé dos documentos', 'Legacy Moving — Transporte Especializado')}
        </div>

        {/* Numeração Automática */}
        <div>
          <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} color="#7c3aed" /> Numeração Automática
            </h4>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 12px' }}>
              Use <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: '3px' }}>{'{ANO}'}</code> para o ano atual e <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: '3px' }}>{'{SEQ}'}</code> para o número sequencial.
            </p>
            {inp('numeracao_orc', 'Formato Orçamento', 'ORC-{ANO}-{SEQ}')}
            {inp('numeracao_ct', 'Formato Contrato', 'CT-{ANO}-{SEQ}')}
            {inp('numeracao_os', 'Formato OS', 'OS-{ANO}-{SEQ}')}
          </div>

          {/* Preview Botões */}
          <div style={{ background: '#f0f4ff', borderRadius: '10px', border: '1px solid #c7d2fe', padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: '600', color: '#2563eb' }}>
              👁 Pré-visualizar Documento
            </h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[['orcamento', 'Orçamento'], ['contrato', 'Contrato'], ['recibo', 'Recibo']].map(([tipo, label]) => (
                <button key={tipo} onClick={() => setPreview(tipo)}
                  style={{ padding: '7px 14px', background: 'white', border: '1px solid #c7d2fe', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '500', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Printer size={12} /> Preview {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Termos do Orçamento */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '20px' }}>
          <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} color="#16a34a" /> Termos do Orçamento
          </h4>
          {inp('orcamento_termos', 'Condições e validade', 'Este orçamento é válido por 15 dias...', true)}
          {inp('orcamento_obs', 'Observações padrão', 'Inclui embalagem especial, seguro básico...', true)}
        </div>

        {/* Cláusulas do Contrato */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '20px' }}>
          <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} color="#dc2626" /> Cláusulas do Contrato
          </h4>
          {inp('contrato_clausulas', 'Cláusulas padrão', '1. O serviço será realizado...', true)}
          {inp('contrato_foro', 'Foro de eleição', 'Cidade de São Paulo - SP', false)}
        </div>

        {/* Recibo */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '20px', gridColumn: '1 / -1' }}>
          <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} color="#ea580c" /> Modelo de Recibo
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>{inp('recibo_observacoes', 'Observações do recibo', 'Recibo referente ao serviço de mudança...', true)}</div>
            <div>{inp('recibo_declaro', 'Declaração de recebimento', 'Declaro ter recebido a quantia acima referente...', true)}</div>
          </div>
        </div>
      </div>

      {/* Modal Preview */}
      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '0', width: '680px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>Preview — {preview === 'orcamento' ? 'Orçamento' : preview === 'contrato' ? 'Contrato' : 'Recibo'}</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => window.print()} style={{ ...btnPrimary, fontSize: '12px', padding: '6px 12px' }}><Printer size={12} /> Imprimir</button>
                <button onClick={() => setPreview(null)} style={{ ...btnGray, fontSize: '12px', padding: '6px 12px' }}>Fechar</button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', padding: '32px', background: '#f9fafb', flex: 1 }}>
              <div style={{ background: 'white', maxWidth: '600px', margin: '0 auto', padding: '40px', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'Arial, sans-serif' }}>
                {/* Cabeçalho */}
                <div style={{ borderBottom: '2px solid #0f1f3d', paddingBottom: '16px', marginBottom: '24px' }}>
                  <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#0f1f3d' }}>{config.empresa_nome || 'LEGACY MOVING'}</h1>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
                    {config.empresa_cnpj && `CNPJ: ${config.empresa_cnpj} | `}
                    {config.empresa_telefone && `Tel: ${config.empresa_telefone} | `}
                    {config.empresa_email}
                  </p>
                  {config.empresa_endereco && <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>{config.empresa_endereco}</p>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#374151' }}>
                    {preview === 'orcamento' ? 'ORÇAMENTO' : preview === 'contrato' ? 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS' : 'RECIBO DE PAGAMENTO'}
                  </h2>
                  <div style={{ textAlign: 'right', fontSize: '13px', color: '#6b7280' }}>
                    <p style={{ margin: 0, fontWeight: '600' }}>
                      Nº: {preview === 'orcamento' ? (config.numeracao_orc || 'ORC-{ANO}-{SEQ}') : preview === 'contrato' ? (config.numeracao_ct || 'CT-{ANO}-{SEQ}') : 'REC-{ANO}-{SEQ}'}
                    </p>
                    <p style={{ margin: '2px 0 0' }}>Data: {new Date().toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                {/* Dados do Cliente (placeholder) */}
                <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '13px' }}>
                  <p style={{ margin: 0, fontWeight: '600', color: '#374151' }}>Cliente: [Nome do Cliente]</p>
                  <p style={{ margin: '4px 0 0', color: '#6b7280' }}>Endereço: [Endereço de Origem] → [Endereço de Destino]</p>
                  <p style={{ margin: '4px 0 0', color: '#6b7280' }}>Tel: [Telefone] | E-mail: [E-mail]</p>
                </div>

                {/* Serviço */}
                <div style={{ marginBottom: '20px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#0f1f3d', color: 'white' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Descrição</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '10px 12px' }}>Serviço de Mudança Completa</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600' }}>R$ [Valor]</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f9fafb' }}>
                        <td style={{ padding: '10px 12px', fontWeight: '700' }}>TOTAL</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', fontSize: '16px', color: '#0f1f3d' }}>R$ [Valor]</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Termos */}
                {preview === 'orcamento' && config.orcamento_termos && (
                  <div style={{ fontSize: '12px', color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: '12px', marginBottom: '20px' }}>
                    <p style={{ margin: '0 0 4px', fontWeight: '600', color: '#374151' }}>Condições:</p>
                    <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{config.orcamento_termos}</p>
                  </div>
                )}
                {preview === 'contrato' && config.contrato_clausulas && (
                  <div style={{ fontSize: '12px', color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: '12px', marginBottom: '20px' }}>
                    <p style={{ margin: '0 0 4px', fontWeight: '600', color: '#374151' }}>Cláusulas:</p>
                    <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{config.contrato_clausulas}</p>
                  </div>
                )}

                {/* Assinaturas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #374151', paddingTop: '8px', fontSize: '12px', color: '#374151' }}>
                      <p style={{ margin: 0, fontWeight: '600' }}>{config.empresa_nome || 'LEGACY MOVING'}</p>
                      <p style={{ margin: '2px 0 0', color: '#6b7280' }}>Prestador de Serviço</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #374151', paddingTop: '8px', fontSize: '12px', color: '#374151' }}>
                      <p style={{ margin: 0, fontWeight: '600' }}>Cliente</p>
                      <p style={{ margin: '2px 0 0', color: '#6b7280' }}>Contratante</p>
                    </div>
                  </div>
                </div>

                {/* Rodapé */}
                {config.rodape && (
                  <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', fontSize: '11px', color: '#9ca3af' }}>
                    {config.rodape}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MODULOS_PERM = [
  { id: 'dashboard',     label: 'Dashboard' },
  { id: 'leads',         label: 'Leads' },
  { id: 'clientes',      label: 'Clientes' },
  { id: 'organizers',    label: 'Organizers' },
  { id: 'orcamentos',    label: 'Orçamentos' },
  { id: 'contratos',     label: 'Contratos' },
  { id: 'os',            label: 'Ordens de Serviço' },
  { id: 'programacao',   label: 'Programação' },
  { id: 'estoque',       label: 'Estoque' },
  { id: 'guarda_moveis', label: 'Guarda-Móveis' },
  { id: 'recibos',       label: 'Recibos' },
  { id: 'financeiro',    label: 'Financeiro' },
  { id: 'fechamento',    label: 'Fechamento' },
  { id: 'metas',         label: 'Metas' },
  { id: 'avarias',       label: 'Avarias' },
  { id: 'configuracoes', label: 'Configurações' },
  { id: 'controladoria', label: 'Controladoria' },
  { id: 'mirante',       label: 'IA Mirante' },
];
const ACOES_PERM = ['ver', 'criar', 'editar', 'excluir'];

// ── ABA INTELIGÊNCIA ARTIFICIAL ──────────────────────────────────────────────
const PROVEDORES = [
  { id: 'anthropic', label: 'Anthropic (Claude)', cor: '#7c3aed' },
  { id: 'openai',    label: 'OpenAI (GPT)',        cor: '#16a34a' },
  { id: 'google',    label: 'Google (Gemini)',      cor: '#2563eb' },
];

const PERIODOS = [
  { v: 7,   l: '7 dias' },
  { v: 30,  l: '30 dias' },
  { v: 90,  l: '90 dias' },
];

const cardIA = {
  background: '#fff', borderRadius: '12px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '24px', marginBottom: '20px',
};
const secTitle = { fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' };
const inputIA = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', color: '#111827', outline: 'none', boxSizing: 'border-box', background: '#fff' };
const btnIA = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', border: 'none' };
const tagStyle = (cor) => ({ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', background: cor + '15', color: cor, borderRadius: '99px', fontSize: '12px', fontWeight: '600' });

const AbaIA = () => {
  const [cfg, setCfg] = useState({});
  const [apiKey, setApiKey] = useState('');
  const [mostrarKey, setMostrarKey] = useState(false);
  const [provedor, setProvedor] = useState('anthropic');
  const [modeloPadrao, setModeloPadrao] = useState('claude-sonnet-4-6');
  const [modelos, setModelos] = useState({ anthropic: [], openai: [], google: [] });
  const [testando, setTestando] = useState(false);
  const [testeResult, setTesteResult] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [uso, setUso] = useState(null);
  const [logs, setLogs] = useState([]);
  const [periodo, setPeriodo] = useState(30);
  const [loadingUso, setLoadingUso] = useState(false);
  const [permissoes, setPermissoes] = useState({});
  const [abaLocal, setAbaLocal] = useState('config');
  const [ativo, setAtivo] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => { carregarConfig(); carregarModelos(); }, []);
  useEffect(() => { if (abaLocal === 'monitoramento') carregarUso(); }, [abaLocal, periodo]);
  useEffect(() => { if (abaLocal === 'logs') carregarLogs(); }, [abaLocal]);
  useEffect(() => { if (abaLocal === 'permissoes') carregarPermissoes(); }, [abaLocal]);

  const token = () => localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  const hdr = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });
  const BASE = (window.API_URL || 'https://legacy-moving-backend.onrender.com');

  const carregarConfig = async () => {
    try {
      const r = await fetch(`${BASE}/api/ai/config`, { headers: hdr() });
      const d = await r.json();
      setCfg(d);
      setProvedor(d.provider || 'anthropic');
      setModeloPadrao(d.modelo_padrao || 'claude-sonnet-4-6');
      setAtivo(d.ativo !== false && d.api_key_configurada);
    } catch {}
  };

  const carregarModelos = async () => {
    try {
      const r = await fetch(`${BASE}/api/ai/modelos`, { headers: hdr() });
      const d = await r.json();
      setModelos(d);
    } catch {}
  };

  const carregarUso = async () => {
    setLoadingUso(true);
    try {
      const r = await fetch(`${BASE}/api/ai/usage?days=${periodo}`, { headers: hdr() });
      setUso(await r.json());
    } catch {} finally { setLoadingUso(false); }
  };

  const carregarLogs = async () => {
    try {
      const r = await fetch(`${BASE}/api/ai/logs?per_page=30`, { headers: hdr() });
      const d = await r.json();
      setLogs(d.items || []);
    } catch {}
  };

  const carregarPermissoes = async () => {
    try {
      const r = await fetch(`${BASE}/api/ai/permissions`, { headers: hdr() });
      setPermissoes(await r.json());
    } catch {}
  };

  const salvarKey = async () => {
    if (!apiKey.trim()) { alert('Insira a API Key.'); return; }
    setSalvando(true);
    try {
      const r = await fetch(`${BASE}/api/ai/set-key`, {
        method: 'POST', headers: hdr(),
        body: JSON.stringify({ provider: provedor, api_key: apiKey, modelo_padrao: modeloPadrao }),
      });
      const d = await r.json();
      if (d.ok) {
        setApiKey('');
        setTesteResult(d.teste);
        setAtivo(d.teste?.ok);
        await carregarConfig();
        alert(`✅ API Key salva! ${d.key_preview}\nTeste: ${d.teste?.ok ? '✅ OK' : '❌ ' + d.teste?.message}`);
      } else { alert('Erro: ' + (d.erro || 'desconhecido')); }
    } catch (e) { alert('Erro: ' + e.message); } finally { setSalvando(false); }
  };

  const testarConexao = async () => {
    setTestando(true); setTesteResult(null);
    try {
      const r = await fetch(`${BASE}/api/ai/test`, { method: 'POST', headers: hdr() });
      const d = await r.json();
      setTesteResult(d);
    } catch (e) { setTesteResult({ ok: false, message: e.message }); } finally { setTestando(false); }
  };

  const toggleIA = async () => {
    setToggling(true);
    try {
      const r = await fetch(`${BASE}/api/ai/toggle`, {
        method: 'PUT', headers: hdr(), body: JSON.stringify({ ativo: !ativo }),
      });
      const d = await r.json();
      if (d.ok) { setAtivo(d.ativo); }
    } catch {} finally { setToggling(false); }
  };

  const salvarConfigGeral = async () => {
    setSalvando(true);
    try {
      await fetch(`${BASE}/api/ai/config`, {
        method: 'POST', headers: hdr(),
        body: JSON.stringify({ provider: provedor, modelo_padrao: modeloPadrao }),
      });
      alert('✅ Configurações salvas.');
      await carregarConfig();
    } catch (e) { alert('Erro: ' + e.message); } finally { setSalvando(false); }
  };

  const salvarPermissoes = async () => {
    try {
      await fetch(`${BASE}/api/ai/permissions`, {
        method: 'PUT', headers: hdr(), body: JSON.stringify(permissoes),
      });
      alert('✅ Permissões atualizadas.');
    } catch (e) { alert('Erro: ' + e.message); }
  };

  const fmt_usd = (v) => `$${(v || 0).toFixed(4)}`;
  const fmt_brl = (v) => `R$ ${(v || 0).toFixed(2)}`;
  const fmt_num = (v) => (v || 0).toLocaleString('pt-BR');
  const fmt_dt  = (s) => s ? new Date(s).toLocaleString('pt-BR') : '-';

  const abas_local = [
    { id: 'config',        label: 'Configuração' },
    { id: 'monitoramento', label: 'Monitoramento' },
    { id: 'logs',          label: 'Logs' },
    { id: 'permissoes',    label: 'Permissões' },
  ];

  const provedorInfo = PROVEDORES.find(p => p.id === provedor) || PROVEDORES[0];
  const modelosProvedor = modelos[provedor] || [];

  return (
    <div>
      {/* Header da aba */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#111827', margin: 0 }}>
            <Bot size={20} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#7c3aed' }} />
            Inteligência Artificial — Mirante
          </h2>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0' }}>
            Integração oficial Anthropic · Camada multi-provedor · Controle total de acesso e consumo
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={tagStyle(ativo ? '#16a34a' : '#6b7280')}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: ativo ? '#16a34a' : '#9ca3af', display: 'inline-block' }} />
            {ativo ? 'Ativa' : 'Inativa'}
          </span>
          <button
            onClick={toggleIA}
            disabled={toggling || !cfg.api_key_configurada}
            style={{ ...btnIA, background: ativo ? '#fef2f2' : '#f0fdf4', color: ativo ? '#dc2626' : '#16a34a', fontSize: '13px' }}
          >
            {ativo ? 'Desativar IA' : 'Ativar IA'}
          </button>
        </div>
      </div>

      {/* Sub-abas */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e5e7eb', marginBottom: '20px' }}>
        {abas_local.map(a => (
          <button key={a.id} onClick={() => setAbaLocal(a.id)} style={{
            padding: '10px 16px', fontSize: '13px', fontWeight: '500', border: 'none',
            background: 'none', cursor: 'pointer',
            borderBottom: `2px solid ${abaLocal === a.id ? '#7c3aed' : 'transparent'}`,
            color: abaLocal === a.id ? '#7c3aed' : '#6b7280',
          }}>{a.label}</button>
        ))}
      </div>

      {/* ── CONFIGURAÇÃO ───────────────────────────────────────────── */}
      {abaLocal === 'config' && (
        <div>
          {/* Status da conexão */}
          {cfg.api_key_configurada ? (
            <div style={{ ...cardIA, background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={20} color="#16a34a" />
                <div>
                  <p style={{ margin: 0, fontWeight: '700', color: '#15803d' }}>API Key configurada</p>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#166534' }}>
                    Provedor: {provedorInfo.label} · Modelo: {modeloPadrao}
                  </p>
                </div>
                <button onClick={testarConexao} disabled={testando} style={{ ...btnIA, background: '#16a34a', color: '#fff', marginLeft: 'auto', fontSize: '13px' }}>
                  <RefreshCw size={14} className={testando ? 'spin' : ''} />
                  {testando ? 'Testando...' : 'Testar Conexão'}
                </button>
              </div>
              {testeResult && (
                <div style={{ marginTop: '12px', padding: '10px 14px', background: testeResult.ok ? '#dcfce7' : '#fef2f2', borderRadius: '8px', fontSize: '13px' }}>
                  {testeResult.ok ? '✅' : '❌'} {testeResult.message}
                  {testeResult.latency_ms > 0 && <span style={{ color: '#6b7280', marginLeft: '8px' }}>({testeResult.latency_ms}ms)</span>}
                </div>
              )}
            </div>
          ) : (
            <div style={{ ...cardIA, background: '#fef9c3', border: '1px solid #fde047', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={20} color="#ca8a04" />
                <p style={{ margin: 0, fontWeight: '600', color: '#92400e' }}>
                  API Key não configurada. A IA Mirante está offline.
                </p>
              </div>
            </div>
          )}

          {/* Configuração do provedor */}
          <div style={cardIA}>
            <p style={secTitle}><Globe size={16} color="#7c3aed" /> Provedor de IA</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {PROVEDORES.map(p => (
                <button key={p.id} onClick={() => setProvedor(p.id)} style={{
                  padding: '14px', borderRadius: '10px', border: `2px solid ${provedor === p.id ? p.cor : '#e5e7eb'}`,
                  background: provedor === p.id ? p.cor + '10' : '#fff', cursor: 'pointer',
                  fontWeight: provedor === p.id ? '700' : '400', color: provedor === p.id ? p.cor : '#374151',
                  fontSize: '13px', transition: 'all 0.15s',
                }}>
                  {p.label}
                  {p.id !== 'anthropic' && <span style={{ display: 'block', fontSize: '11px', color: '#9ca3af', fontWeight: '400', marginTop: '4px' }}>Em breve</span>}
                </button>
              ))}
            </div>

            {/* Modelo padrão */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Modelo padrão
              </label>
              {modelosProvedor.length > 0 ? (
                <select value={modeloPadrao} onChange={e => setModeloPadrao(e.target.value)} style={inputIA}>
                  {modelosProvedor.map(m => (
                    <option key={m.id} value={m.id}>{m.label} (ctx {m.contexto})</option>
                  ))}
                </select>
              ) : (
                <input value={modeloPadrao} onChange={e => setModeloPadrao(e.target.value)} style={inputIA} placeholder="claude-sonnet-4-6" />
              )}
            </div>

            <button onClick={salvarConfigGeral} disabled={salvando} style={{ ...btnIA, background: '#7c3aed', color: '#fff' }}>
              <Save size={14} /> {salvando ? 'Salvando...' : 'Salvar Configuração'}
            </button>
          </div>

          {/* API Key */}
          <div style={cardIA}>
            <p style={secTitle}><Key size={16} color="#7c3aed" /> API Key — {provedorInfo.label}</p>
            <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '10px', padding: '14px', marginBottom: '16px', fontSize: '13px', color: '#6b21a8' }}>
              🔐 A API Key é armazenada de forma segura no servidor. Nunca é exposta ao frontend nem registrada em logs.
              Para obter sua key: <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#7c3aed', fontWeight: '600' }}>console.anthropic.com</a>
            </div>
            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <input
                type={mostrarKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                style={{ ...inputIA, paddingRight: '44px', fontFamily: 'monospace' }}
              />
              <button onClick={() => setMostrarKey(!mostrarKey)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                {mostrarKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={salvarKey} disabled={salvando || !apiKey.trim()} style={{ ...btnIA, background: '#7c3aed', color: '#fff' }}>
                <Save size={14} /> {salvando ? 'Salvando...' : 'Salvar API Key'}
              </button>
              <button onClick={testarConexao} disabled={testando} style={{ ...btnIA, background: '#e0e7ff', color: '#3730a3' }}>
                <RefreshCw size={14} /> {testando ? 'Testando...' : 'Testar Conexão'}
              </button>
            </div>
          </div>

          {/* Módulos com acesso */}
          <div style={cardIA}>
            <p style={secTitle}><Bot size={16} color="#7c3aed" /> Módulos com Acesso ao Mirante</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {['Chat Geral', 'Leads', 'Clientes', 'Financeiro', 'Estoque', 'Avarias', 'Painel Executivo', 'Metas', 'Manual do Sistema'].map(m => (
                <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#f5f3ff', borderRadius: '8px', fontSize: '13px', color: '#5b21b6', fontWeight: '500' }}>
                  <CheckCircle size={14} color="#7c3aed" /> {m}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MONITORAMENTO ──────────────────────────────────────────── */}
      {abaLocal === 'monitoramento' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ margin: 0, fontWeight: '700', color: '#111827' }}>Painel de Consumo</p>
            <div style={{ display: 'flex', gap: '6px' }}>
              {PERIODOS.map(p => (
                <button key={p.v} onClick={() => setPeriodo(p.v)} style={{
                  padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                  border: `1px solid ${periodo === p.v ? '#7c3aed' : '#d1d5db'}`,
                  background: periodo === p.v ? '#7c3aed' : '#fff',
                  color: periodo === p.v ? '#fff' : '#374151', cursor: 'pointer',
                }}>{p.l}</button>
              ))}
            </div>
          </div>

          {loadingUso ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Carregando...</div>
          ) : uso ? (
            <>
              {/* Cards de métricas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                {[
                  { label: 'Total de Consultas', valor: fmt_num(uso.total_consultas), cor: '#7c3aed', icon: <Bot size={18} /> },
                  { label: 'Tokens Consumidos', valor: fmt_num(uso.total_tokens), cor: '#2563eb', icon: <Database size={18} /> },
                  { label: 'Custo (USD)', valor: fmt_usd(uso.custo_total_usd), cor: '#16a34a', icon: <Key size={18} /> },
                  { label: 'Custo (BRL ~)', valor: fmt_brl(uso.custo_total_brl), cor: '#ca8a04', icon: <Settings size={18} /> },
                ].map(c => (
                  <div key={c.label} style={{ ...cardIA, marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>{c.label}</p>
                      <span style={{ color: c.cor }}>{c.icon}</span>
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: '22px', fontWeight: '800', color: c.cor }}>{c.valor}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#9ca3af' }}>Últimos {periodo} dias</p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Top usuários */}
                <div style={cardIA}>
                  <p style={secTitle}><Users size={16} color="#7c3aed" /> Usuários que mais utilizam</p>
                  {(uso.top_usuarios || []).length === 0 ? (
                    <p style={{ color: '#9ca3af', fontSize: '13px' }}>Nenhum dado ainda.</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f5f3ff' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '600', color: '#5b21b6' }}>Usuário</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', color: '#5b21b6' }}>Consultas</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', color: '#5b21b6' }}>Tokens</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uso.top_usuarios.map((u, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '8px 10px', color: '#374151' }}>{u.nome}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', color: '#7c3aed' }}>{fmt_num(u.consultas)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: '#6b7280' }}>{fmt_num(u.tokens)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Top módulos */}
                <div style={cardIA}>
                  <p style={secTitle}><Globe size={16} color="#7c3aed" /> Módulos mais utilizados</p>
                  {(uso.top_modulos || []).length === 0 ? (
                    <p style={{ color: '#9ca3af', fontSize: '13px' }}>Nenhum dado ainda.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {uso.top_modulos.slice(0, 6).map((m, i) => {
                        const max = uso.top_modulos[0]?.consultas || 1;
                        const pct = Math.round((m.consultas / max) * 100);
                        return (
                          <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                              <span style={{ color: '#374151', fontWeight: '500' }}>{m.modulo}</span>
                              <span style={{ color: '#7c3aed', fontWeight: '700' }}>{m.consultas}</span>
                            </div>
                            <div style={{ height: '6px', background: '#e9d5ff', borderRadius: '99px' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: '#7c3aed', borderRadius: '99px' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <Bot size={40} color="#d1d5db" style={{ marginBottom: '10px' }} />
              <p>Nenhum dado de uso ainda.</p>
            </div>
          )}
        </div>
      )}

      {/* ── LOGS ───────────────────────────────────────────────────── */}
      {abaLocal === 'logs' && (
        <div style={cardIA}>
          <p style={secTitle}><Database size={16} color="#7c3aed" /> Histórico de Consultas</p>
          {logs.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '13px' }}>Nenhum log ainda.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f5f3ff' }}>
                    {['Data/Hora', 'Usuário', 'Módulo', 'Modelo', 'Tokens', 'Custo USD', 'Status'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '600', color: '#5b21b6', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '7px 10px', color: '#6b7280', whiteSpace: 'nowrap' }}>{fmt_dt(l.timestamp)}</td>
                      <td style={{ padding: '7px 10px', color: '#374151', fontWeight: '500' }}>{l.usuario}</td>
                      <td style={{ padding: '7px 10px' }}><span style={tagStyle('#7c3aed')}>{l.modulo}</span></td>
                      <td style={{ padding: '7px 10px', color: '#6b7280', fontFamily: 'monospace', fontSize: '11px' }}>{l.model}</td>
                      <td style={{ padding: '7px 10px', color: '#2563eb', fontWeight: '600' }}>{fmt_num(l.tokens)}</td>
                      <td style={{ padding: '7px 10px', color: '#16a34a', fontWeight: '600' }}>{fmt_usd(l.custo_usd)}</td>
                      <td style={{ padding: '7px 10px' }}>
                        {l.success
                          ? <span style={tagStyle('#16a34a')}>✓ OK</span>
                          : <span style={tagStyle('#dc2626')} title={l.erro}>✗ Erro</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PERMISSÕES ─────────────────────────────────────────────── */}
      {abaLocal === 'permissoes' && (
        <div>
          <div style={cardIA}>
            <p style={secTitle}><Shield size={16} color="#7c3aed" /> Controle de Acesso</p>

            {/* Setores bloqueados */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>
                Setores sem acesso à IA
              </label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {['comercial', 'operacional', 'financeiro'].map(s => {
                  const bloqueados = permissoes.setores_bloqueados || [];
                  const ativo = bloqueados.includes(s);
                  return (
                    <button key={s} onClick={() => {
                      const arr = ativo ? bloqueados.filter(x => x !== s) : [...bloqueados, s];
                      setPermissoes(p => ({ ...p, setores_bloqueados: arr }));
                    }} style={{
                      padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                      border: `2px solid ${ativo ? '#dc2626' : '#d1d5db'}`,
                      background: ativo ? '#fef2f2' : '#f9fafb',
                      color: ativo ? '#dc2626' : '#374151',
                    }}>
                      {ativo ? <Lock size={12} style={{ marginRight: '4px' }} /> : <Unlock size={12} style={{ marginRight: '4px' }} />}
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>Admin sempre tem acesso total.</p>
            </div>

            {/* Limite de tokens por usuário */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Limite de tokens por usuário/dia (0 = ilimitado)
              </label>
              <input
                type="number"
                min="0"
                value={permissoes.limite_tokens_usuario || 0}
                onChange={e => setPermissoes(p => ({ ...p, limite_tokens_usuario: parseInt(e.target.value) || 0 }))}
                style={{ ...inputIA, width: '200px' }}
              />
            </div>

            {/* Modelos autorizados */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>
                Modelos autorizados (sem restrição = todos)
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'claude-opus-4-8'].map(m => {
                  const autorizados = permissoes.modelos_autorizados || [];
                  const ativado = autorizados.length === 0 || autorizados.includes(m);
                  return (
                    <button key={m} onClick={() => {
                      let arr = autorizados.length === 0 ? ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'claude-opus-4-8'] : [...autorizados];
                      if (ativado) arr = arr.filter(x => x !== m);
                      else arr.push(m);
                      setPermissoes(p => ({ ...p, modelos_autorizados: arr }));
                    }} style={{
                      padding: '6px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                      border: `1px solid ${ativado ? '#7c3aed' : '#d1d5db'}`,
                      background: ativado ? '#f5f3ff' : '#fff',
                      color: ativado ? '#7c3aed' : '#9ca3af',
                      fontWeight: ativado ? '600' : '400',
                    }}>{m}</button>
                  );
                })}
              </div>
            </div>

            <button onClick={salvarPermissoes} style={{ ...btnIA, background: '#7c3aed', color: '#fff' }}>
              <Save size={14} /> Salvar Permissões
            </button>
          </div>

          {/* Info de segurança */}
          <div style={{ ...cardIA, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
            <p style={{ ...secTitle, color: '#374151' }}><Shield size={16} color="#6b7280" /> Boas Práticas de Segurança</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#6b7280' }}>
              {[
                'A API Key nunca é transmitida ao frontend — apenas o status (configurada/não configurada).',
                'A chave é criptografada com o JWT secret do servidor antes de armazenar no banco.',
                'Toda comunicação com a Anthropic usa HTTPS/TLS 1.3.',
                'Logs de uso nunca registram o conteúdo completo das mensagens — apenas metadados.',
                'Rotação de key: ao salvar uma nova chave, a anterior é substituída automaticamente.',
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <CheckCircle size={14} color="#16a34a" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Configuracoes = () => {
  const [abaAtiva, setAbaAtiva] = useState('usuarios');
  const [modalUsuario, setModalUsuario] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [modalPermissoes, setModalPermissoes] = useState(null); // usuario obj
  const [permMatriz, setPermMatriz] = useState({}); // { modulo: { ver, criar, editar, excluir } }
  const [salvendoPerm, setSalvendoPerm] = useState(false);

  const { isConfigured, configure, syncEvents, getSyncStatus, isLoading } = useGoogleCalendar();

  const [googleCalendarConfig, setGoogleCalendarConfig] = useState({
    apiKey: '', accessToken: '', calendarId: 'legacymovingbr@gmail.com',
  });

  const [configEmpresa, setConfigEmpresa] = useState({
    nome: 'Legacy Moving', cnpj: '', email: 'legacymovingbr@gmail.com',
    telefone: '', endereco: '', site: '',
  });

  const [usuarios, setUsuarios] = useState([
    { id: 1, nome: 'Administrador Legacy M.', email: 'admin@legacy.com.br', cargo: 'Admin', permissoes: ['dashboard', 'clientes', 'financeiro', 'vendas', 'estoque', 'configuracoes'], status: 'ativo', ultimoAcesso: '21/06/2024 15:30' },
    { id: 2, nome: 'Kenneth Silva', email: 'kenneth@legacy.com.br', cargo: 'Comercial', permissoes: ['dashboard', 'clientes', 'vendas', 'orcamentos', 'contratos'], status: 'ativo', ultimoAcesso: '21/06/2024 14:15' },
    { id: 3, nome: 'Douglas Santos', email: 'douglas@legacy.com.br', cargo: 'Financeiro', permissoes: ['dashboard', 'financeiro', 'clientes'], status: 'ativo', ultimoAcesso: '21/06/2024 13:45' },
    { id: 4, nome: 'Maciel Oliveira', email: 'maciel@legacy.com.br', cargo: 'Operacional', permissoes: ['dashboard', 'ordens-servico', 'estoque'], status: 'ativo', ultimoAcesso: '21/06/2024 12:30' },
    { id: 5, nome: 'Diego Costa', email: 'diego@legacy.com.br', cargo: 'Operacional', permissoes: ['dashboard', 'ordens-servico', 'estoque'], status: 'inativo', ultimoAcesso: '15/06/2024 16:20' },
  ]);

  const [configSistema, setConfigSistema] = useState({
    anthropicApiKey: '', urlWebhook: '', emailNotificacoes: true,
    backupAutomatico: true, manutencaoAgendada: false,
    versaoSistema: 'v2.0', ultimoBackup: '21/05/2026 02:00',
  });

  const permissoesDisponiveis = [
    { id: 'dashboard', nome: 'Dashboard' }, { id: 'clientes', nome: 'Clientes' },
    { id: 'vendas', nome: 'Vendas' }, { id: 'financeiro', nome: 'Financeiro' },
    { id: 'estoque', nome: 'Estoque' }, { id: 'orcamentos', nome: 'Orçamentos' },
    { id: 'contratos', nome: 'Contratos' }, { id: 'ordens-servico', nome: 'Ordens de Serviço' },
    { id: 'visitas', nome: 'Visitas' }, { id: 'self-storage', nome: 'Self Storage' },
    { id: 'marketing', nome: 'Marketing' }, { id: 'graficos', nome: 'Gráficos' },
    { id: 'configuracoes', nome: 'Configurações' },
  ];

  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [salvendoUsuario, setSalvendoUsuario] = useState(false);
  const formRef = useRef({});

  // Carrega usuários da API
  useEffect(() => {
    setLoadingUsuarios(true);
    api.getUsuarios()
      .then(data => {
        const lista = Array.isArray(data) ? data : (data?.items || []);
        if (lista.length > 0) setUsuarios(lista.map(u => ({
          id: u.id, nome: u.nome || u.name, email: u.email || '',
          cargo: u.role || u.cargo || 'Operacional',
          permissoes: u.permissoes || [],
          status: u.ativo === false ? 'inativo' : 'ativo',
          ultimoAcesso: u.ultimo_acesso || '—',
        })));
      })
      .catch(() => {}); // Mantém os dados mock se a API falhar
    setLoadingUsuarios(false);
  }, []);

  const adicionarUsuario = () => { setUsuarioEditando(null); setModalUsuario(true); };
  const editarUsuario = (u) => { setUsuarioEditando(u); setModalUsuario(true); };

  const salvarUsuario = async () => {
    const nome = formRef.current.nome?.value?.trim();
    const cpfRaw = (formRef.current.cpf?.value || '').replace(/\D/g, '').trim();
    const email = formRef.current.email?.value?.trim() || '';
    const cargo = formRef.current.cargo?.value;
    const senha = formRef.current.senha?.value;
    if (!nome) { alert('Nome é obrigatório.'); return; }
    if (!usuarioEditando && cpfRaw.length !== 11) { alert('CPF inválido. Informe os 11 dígitos.'); return; }
    setSalvendoUsuario(true);
    try {
      if (usuarioEditando) {
        const payload = { name: nome, email, role: cargo };
        if (senha) payload.password = senha;
        await api.updateUsuario(usuarioEditando.id, payload);
      } else {
        if (!senha) { alert('Senha é obrigatória para novos usuários.'); setSalvendoUsuario(false); return; }
        await api.createUsuario({ name: nome, email, role: cargo, password: senha, cpf: cpfRaw });
      }
      // Recarrega lista
      const data = await api.getUsuarios();
      const lista = Array.isArray(data) ? data : (data?.items || []);
      setUsuarios(lista.map(u => ({
        id: u.id, nome: u.nome || u.name, email: u.email || '',
        cargo: u.role || u.cargo || 'Operacional',
        permissoes: u.permissoes || [],
        status: u.ativo === false ? 'inativo' : 'ativo',
        ultimoAcesso: u.ultimo_acesso || '—',
      })));
      setModalUsuario(false);
    } catch (e) {
      alert('Erro ao salvar usuário: ' + (e.message || 'Tente novamente.'));
    } finally { setSalvendoUsuario(false); }
  };

  const alterarStatus = async (id, novoStatus) => {
    try {
      await api.updateUsuario(id, { ativo: novoStatus === 'ativo' });
      setUsuarios(us => us.map(u => u.id === id ? { ...u, status: novoStatus } : u));
    } catch (e) { alert('Erro: ' + e.message); }
  };

  const excluirUsuario = async (id) => {
    if (!confirm('Excluir usuário permanentemente?')) return;
    try {
      await api.updateUsuario(id, { ativo: false }); // Soft delete — inativa
      setUsuarios(us => us.filter(u => u.id !== id));
    } catch (e) { alert('Erro: ' + e.message); }
  };

  const abrirPermissoes = async (u) => {
    setModalPermissoes(u);
    try {
      const perms = await api.getPermissoes(u.id);
      if (perms && typeof perms === 'object' && !Array.isArray(perms)) {
        setPermMatriz(perms);
      } else {
        setPermMatriz({});
      }
    } catch { setPermMatriz({}); }
  };

  const salvarPermissoes = async () => {
    if (!modalPermissoes) return;
    setSalvendoPerm(true);
    try {
      // null = usar defaults do role, {} empty = sem permissões granulares
      const payload = Object.keys(permMatriz).length > 0 ? permMatriz : null;
      await api.setPermissoes(modalPermissoes.id, payload);
      setModalPermissoes(null);
      alert('Permissões salvas!');
    } catch (e) { alert('Erro ao salvar: ' + e.message); }
    finally { setSalvendoPerm(false); }
  };

  const togglePerm = (modulo, acao) => {
    setPermMatriz(prev => ({
      ...prev,
      [modulo]: {
        ...(prev[modulo] || {}),
        [acao]: !(prev[modulo]?.[acao]),
      }
    }));
  };

  const setAllModuloPerm = (modulo, valor) => {
    setPermMatriz(prev => ({
      ...prev,
      [modulo]: Object.fromEntries(ACOES_PERM.map(a => [a, valor])),
    }));
  };

  const resetToRoleDefaults = () => setPermMatriz({});

  const salvarConfigEmpresa = () => alert('Configurações da empresa salvas! (Mock)');
  const salvarConfigSistema = () => alert('Configurações do sistema salvas! (Mock)');

  const testarIA = async () => {
    try {
      const { api } = await import('../lib/api');
      const res = await api.miranteChat('Teste de integração.', []);
      alert(res?.resposta ? '✅ IA Mirante funcionando!\n\n' + res.resposta.substring(0, 120) : '✅ API Anthropic conectada!');
    } catch { alert('❌ Erro ao conectar. Verifique se o backend está rodando.'); }
  };

  const configurarGoogleCalendar = () => {
    if (!googleCalendarConfig.apiKey || !googleCalendarConfig.accessToken) { alert('Preencha todos os campos.'); return; }
    const r = configure(googleCalendarConfig.apiKey, googleCalendarConfig.accessToken);
    alert(r.success ? 'Google Calendar configurado!' : `Erro: ${r.error}`);
  };

  /* ─── Aba Usuários ─────────────────────────────────── */
  const renderAbaUsuarios = () => (
    <div>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#111827', margin: 0 }}>Gestão de Usuários</h3>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>Gerencie usuários e suas permissões</p>
        </div>
        <button style={btnPrimary} onClick={adicionarUsuario}><Plus size={14} /> Novo Usuário</button>
      </div>

      {/* estatísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { icon: <Users size={22} color="#2563eb" />, label: 'Total', value: usuarios.length, bg: '#eff6ff', c: '#1d4ed8' },
          { icon: <UserCheck size={22} color="#16a34a" />, label: 'Ativos', value: usuarios.filter(u => u.status === 'ativo').length, bg: '#f0fdf4', c: '#15803d' },
          { icon: <UserX size={22} color="#dc2626" />, label: 'Inativos', value: usuarios.filter(u => u.status === 'inativo').length, bg: '#fef2f2', c: '#b91c1c' },
          { icon: <Shield size={22} color="#7c3aed" />, label: 'Admins', value: usuarios.filter(u => u.cargo === 'Admin').length, bg: '#f5f3ff', c: '#6d28d9' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {s.icon}
            <div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: s.c }}>{s.label}</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: s.c }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* tabela */}
      <div style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['Usuário', 'Cargo', 'Permissões', 'Status', 'Último Acesso', 'Ações'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u, i) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '13px', flexShrink: 0 }}>
                      {u.nome.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#111827' }}>{u.nome}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                    background: u.cargo === 'Admin' ? '#f5f3ff' : u.cargo === 'Comercial' ? '#eff6ff' : u.cargo === 'Financeiro' ? '#f0fdf4' : '#fff7ed',
                    color: u.cargo === 'Admin' ? '#6d28d9' : u.cargo === 'Comercial' ? '#1d4ed8' : u.cargo === 'Financeiro' ? '#15803d' : '#c2410c',
                  }}>{u.cargo}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ color: '#111827' }}>{u.permissoes.length} permissões</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{u.permissoes.slice(0, 2).join(', ')}{u.permissoes.length > 2 && ` +${u.permissoes.length - 2}`}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: u.status === 'ativo' ? '#f0fdf4' : '#fef2f2', color: u.status === 'ativo' ? '#15803d' : '#b91c1c' }}>
                    {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{u.ultimoAcesso}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => editarUsuario(u)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: '4px' }} title="Editar"><Edit size={15} /></button>
                    <button onClick={() => abrirPermissoes(u)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', padding: '4px' }} title="Permissões Granulares"><Shield size={15} /></button>
                    <button onClick={() => alterarStatus(u.id, u.status === 'ativo' ? 'inativo' : 'ativo')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: u.status === 'ativo' ? '#dc2626' : '#16a34a', padding: '4px' }} title={u.status === 'ativo' ? 'Desativar' : 'Ativar'}>
                      {u.status === 'ativo' ? <Lock size={15} /> : <Unlock size={15} />}
                    </button>
                    {u.cargo !== 'Admin' && (
                      <button onClick={() => excluirUsuario(u.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '4px' }} title="Excluir"><Trash2 size={15} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  /* ─── Aba Empresa ──────────────────────────────────── */
  const renderAbaEmpresa = () => (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#111827', margin: 0 }}>Informações da Empresa</h3>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>Configure os dados da sua empresa</p>
      </div>
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <span style={label}>Nome da Empresa</span>
            <div style={iconWrap}>
              <span style={iconAbs}><Building2 size={15} /></span>
              <input style={inputIcon} value={configEmpresa.nome} onChange={e => setConfigEmpresa({ ...configEmpresa, nome: e.target.value })} />
            </div>
          </div>
          <div>
            <span style={label}>CNPJ</span>
            <input style={input} value={configEmpresa.cnpj} onChange={e => setConfigEmpresa({ ...configEmpresa, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
          </div>
          <div>
            <span style={label}>Email</span>
            <div style={iconWrap}>
              <span style={iconAbs}><Mail size={15} /></span>
              <input style={inputIcon} type="email" value={configEmpresa.email} onChange={e => setConfigEmpresa({ ...configEmpresa, email: e.target.value })} />
            </div>
          </div>
          <div>
            <span style={label}>Telefone</span>
            <div style={iconWrap}>
              <span style={iconAbs}><Phone size={15} /></span>
              <input style={inputIcon} value={configEmpresa.telefone} onChange={e => setConfigEmpresa({ ...configEmpresa, telefone: e.target.value })} />
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={label}>Endereço</span>
            <div style={iconWrap}>
              <span style={iconAbs}><MapPin size={15} /></span>
              <input style={inputIcon} value={configEmpresa.endereco} onChange={e => setConfigEmpresa({ ...configEmpresa, endereco: e.target.value })} />
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={label}>Site</span>
            <div style={iconWrap}>
              <span style={iconAbs}><Globe size={15} /></span>
              <input style={inputIcon} type="url" value={configEmpresa.site} onChange={e => setConfigEmpresa({ ...configEmpresa, site: e.target.value })} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button style={btnPrimary} onClick={salvarConfigEmpresa}><Save size={14} /> Salvar Configurações</button>
        </div>
      </div>
    </div>
  );

  /* ─── Aba Google Calendar ──────────────────────────── */
  const renderAbaGoogleCalendar = () => {
    const status = getSyncStatus();
    const statusColor = status.color === 'green' ? { bg: '#f0fdf4', c: '#15803d' } : status.color === 'blue' ? { bg: '#eff6ff', c: '#1d4ed8' } : status.color === 'red' ? { bg: '#fef2f2', c: '#b91c1c' } : { bg: '#fefce8', c: '#a16207' };
    return (
      <div>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#111827', margin: 0 }}>Integração Google Calendar</h3>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>Configure a sincronização automática com o Google Agenda</p>
        </div>

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={20} color="#2563eb" />
              <span style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>Status da Integração</span>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: statusColor.bg, color: statusColor.c }}>
              {status.color === 'green' ? <CheckCircle size={13} /> : <AlertCircle size={13} />} {status.message}
            </span>
          </div>
          {!isConfigured && (
            <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <AlertCircle size={16} color="#a16207" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#92400e' }}>Configuração Necessária</div>
                <div style={{ fontSize: '12px', color: '#a16207', marginTop: '4px' }}>Configure as credenciais da API para ativar a sincronização automática.</div>
              </div>
            </div>
          )}
          {isConfigured && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <CheckCircle size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#14532d' }}>Integração Ativa</div>
                <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>Google Calendar sincronizando automaticamente.</div>
              </div>
            </div>
          )}
        </div>

        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Key size={18} color="#6b7280" />
            <span style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>Credenciais da API</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={label}>Google API Key *</span>
              <input style={input} value={googleCalendarConfig.apiKey} onChange={e => setGoogleCalendarConfig({ ...googleCalendarConfig, apiKey: e.target.value })} placeholder="AIzaSyC..." />
              <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Google Cloud Console → APIs & Services → Credentials</p>
            </div>
            <div>
              <span style={label}>Access Token *</span>
              <input style={input} type="password" value={googleCalendarConfig.accessToken} onChange={e => setGoogleCalendarConfig({ ...googleCalendarConfig, accessToken: e.target.value })} placeholder="ya29.a0..." />
            </div>
            <div>
              <span style={label}>Calendar ID</span>
              <input style={input} value={googleCalendarConfig.calendarId} onChange={e => setGoogleCalendarConfig({ ...googleCalendarConfig, calendarId: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button style={btnPrimary} onClick={configurarGoogleCalendar}><Save size={14} /> Salvar Configuração</button>
            {isConfigured && (
              <button style={btnGreen} onClick={() => syncEvents()} disabled={isLoading}>
                <RefreshCw size={14} /> {isLoading ? 'Testando...' : 'Testar Sincronização'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ─── Aba Sistema ──────────────────────────────────── */
  const Toggle = ({ checked, onChange }) => (
    <div
      onClick={() => onChange(!checked)}
      style={{ width: '44px', height: '24px', borderRadius: '12px', background: checked ? '#2563eb' : '#d1d5db', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
    >
      <div style={{ position: 'absolute', top: '2px', left: checked ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
    </div>
  );

  const renderAbaSistema = () => (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#111827', margin: 0 }}>Configurações do Sistema</h3>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>Configure integrações e funcionalidades avançadas</p>
      </div>

      {/* IA Mirante */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Bot size={20} color="#7c3aed" />
          <span style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>IA Mirante</span>
        </div>
        <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: '8px', padding: '10px 14px', display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <Bot size={14} color="#7c3aed" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '12px', color: '#5b21b6', margin: 0, lineHeight: '1.5' }}>
            A <strong>Mirante</strong> usa o modelo <strong>Claude (Anthropic)</strong>. A chave deve ser configurada
            na variável <code style={{ background: '#ddd6fe', padding: '0 4px', borderRadius: '4px' }}>ANTHROPIC_API_KEY</code> no backend.
          </p>
        </div>
        <div>
          <span style={label}>Chave API Anthropic (Claude)</span>
          <div style={{ ...iconWrap, position: 'relative' }}>
            <span style={iconAbs}><Key size={15} /></span>
            <input
              style={{ ...inputIcon, paddingRight: '36px' }}
              type={mostrarSenha ? 'text' : 'password'}
              value={configSistema.anthropicApiKey}
              onChange={e => setConfigSistema({ ...configSistema, anthropicApiKey: e.target.value })}
              placeholder="sk-ant-api03-..."
            />
            <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
              {mostrarSenha ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
            Obtenha em: <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: '#7c3aed' }}>console.anthropic.com</a> → API Keys
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
          <button style={btnPurple} onClick={testarIA}><Bot size={14} /> Testar Mirante</button>
          <span style={{ fontSize: '13px', color: '#2563eb', fontWeight: '500' }}>● Claude · Anthropic</span>
        </div>
      </div>

      {/* Webhook */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Globe size={18} color="#2563eb" />
          <span style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>Integrações</span>
        </div>
        <span style={label}>URL Webhook</span>
        <input style={input} type="url" value={configSistema.urlWebhook} onChange={e => setConfigSistema({ ...configSistema, urlWebhook: e.target.value })} placeholder="https://..." />
        <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>URL para receber notificações de eventos do sistema</p>
      </div>

      {/* Notificações */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Bell size={18} color="#d97706" />
          <span style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>Notificações</span>
        </div>
        {[
          { key: 'emailNotificacoes', label: 'Notificações por Email', desc: 'Receber alertas importantes por email' },
          { key: 'backupAutomatico', label: 'Backup Automático', desc: 'Backup diário dos dados do sistema' },
          { key: 'manutencaoAgendada', label: 'Modo Manutenção', desc: 'Ativar para manutenções programadas' },
        ].map(item => (
          <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>{item.label}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.desc}</div>
            </div>
            <Toggle checked={configSistema[item.key]} onChange={val => setConfigSistema({ ...configSistema, [item.key]: val })} />
          </div>
        ))}
      </div>

      {/* Info do sistema */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Database size={18} color="#6b7280" />
          <span style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>Informações do Sistema</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            { label: 'Versão do Sistema', value: configSistema.versaoSistema },
            { label: 'Último Backup', value: configSistema.ultimoBackup },
          ].map((i, idx) => (
            <div key={idx} style={{ background: '#f9fafb', borderRadius: '8px', padding: '14px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>{i.label}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginTop: '4px' }}>{i.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button style={btnPrimary} onClick={salvarConfigSistema}><Save size={14} /> Salvar Configurações</button>
      </div>
    </div>
  );

  /* ─── Aba Documentos ───────────────────────────────── */
  const renderAbaDocumentos = () => <AbaDocumentos />;

  /* ─── Aba IA ────────────────────────────────────────── */
  const renderAbaIA = () => <AbaIA />;

  /* ─── Main render ──────────────────────────────────── */
  const abas = [
    { id: 'usuarios', label: 'Usuários', icon: <Users size={14} /> },
    { id: 'empresa', label: 'Empresa', icon: <Building2 size={14} /> },
    { id: 'documentos', label: 'Documentos', icon: <FileText size={14} /> },
    { id: 'google-calendar', label: 'Google Calendar', icon: <Calendar size={14} />, extra: isConfigured && <CheckCircle size={11} color="#16a34a" /> },
    { id: 'ia', label: 'Inteligência Artificial', icon: <Bot size={14} /> },
    { id: 'sistema', label: 'Sistema', icon: <Settings size={14} /> },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '20px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', margin: 0 }}>Configurações</h1>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>Gerencie usuários, empresa e sistema</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280' }}>
            <Settings size={18} />
            <span style={{ fontSize: '13px' }}>Sistema v2.0</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {/* Abas */}
        <div style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '24px' }}>
          <div style={{ borderBottom: '1px solid #e5e7eb', display: 'flex', padding: '0 24px', gap: '4px' }}>
            {abas.map(a => (
              <button
                key={a.id}
                onClick={() => setAbaAtiva(a.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '14px 16px', fontSize: '13px', fontWeight: '500',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: `2px solid ${abaAtiva === a.id ? '#2563eb' : 'transparent'}`,
                  color: abaAtiva === a.id ? '#2563eb' : '#6b7280',
                  transition: 'color 0.15s',
                }}
              >
                {a.icon}{a.label}{a.extra}
              </button>
            ))}
          </div>
          <div style={{ padding: '24px' }}>
            {abaAtiva === 'usuarios' && renderAbaUsuarios()}
            {abaAtiva === 'empresa' && renderAbaEmpresa()}
            {abaAtiva === 'documentos' && renderAbaDocumentos()}
            {abaAtiva === 'google-calendar' && renderAbaGoogleCalendar()}
            {abaAtiva === 'ia' && renderAbaIA()}
            {abaAtiva === 'sistema' && renderAbaSistema()}
          </div>
        </div>
      </div>

      {/* Modal Usuário */}
      {modalUsuario && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', width: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '20px' }}>
              {usuarioEditando ? 'Editar Usuário' : 'Novo Usuário'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <span style={label}>Nome *</span>
                <input ref={el => formRef.current.nome = el} style={input} type="text" defaultValue={usuarioEditando?.nome || ''} placeholder="Nome completo" />
              </div>
              <div>
                <span style={label}>CPF * (usado para login)</span>
                <input
                  ref={el => formRef.current.cpf = el}
                  style={input}
                  type="text"
                  defaultValue=""
                  placeholder="000.000.000-00"
                  maxLength={14}
                  disabled={!!usuarioEditando}
                  onChange={e => {
                    const n = e.target.value.replace(/\D/g,'').slice(0,11);
                    let f = n;
                    if (n.length > 3) f = n.slice(0,3)+'.'+n.slice(3);
                    if (n.length > 6) f = n.slice(0,3)+'.'+n.slice(3,6)+'.'+n.slice(6);
                    if (n.length > 9) f = n.slice(0,3)+'.'+n.slice(3,6)+'.'+n.slice(6,9)+'-'+n.slice(9);
                    e.target.value = f;
                  }}
                />
                {usuarioEditando && <span style={{ fontSize: '11px', color: '#9ca3af' }}>CPF não pode ser alterado</span>}
              </div>
              <div>
                <span style={label}>Email (opcional)</span>
                <input ref={el => formRef.current.email = el} style={input} type="email" defaultValue={usuarioEditando?.email || ''} placeholder="email@legacy.com.br" />
              </div>
              <div>
                <span style={label}>Cargo / Role</span>
                <select ref={el => formRef.current.cargo = el} style={input} defaultValue={usuarioEditando?.cargo || 'vendedor'}>
                  <option value="admin">Admin</option>
                  <option value="vendedor">Vendedor / Comercial</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="operacional">Operacional</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={label}>Senha {usuarioEditando ? '(deixe em branco para manter)' : '*'}</span>
                <input ref={el => formRef.current.senha = el} style={input} type="password" placeholder={usuarioEditando ? 'Deixe em branco para manter' : 'Senha obrigatória'} />
              </div>
            </div>
            <div>
              <span style={label}>Permissões</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '160px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px' }}>
                {permissoesDisponiveis.map(p => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked={usuarioEditando?.permissoes?.includes(p.id)} style={{ cursor: 'pointer' }} />
                    {p.nome}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button style={btnGray} onClick={() => setModalUsuario(false)}>Cancelar</button>
              <button style={{ ...btnPrimary, opacity: salvendoUsuario ? 0.7 : 1 }} onClick={salvarUsuario} disabled={salvendoUsuario}>
                {salvendoUsuario ? 'Salvando...' : (usuarioEditando ? 'Atualizar' : 'Criar Usuário')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Matriz de Permissões */}
      {modalPermissoes && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '0', width: '700px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#111827' }}>Permissões Granulares</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>{modalPermissoes.nome} · {modalPermissoes.cargo}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={resetToRoleDefaults} style={{ ...btnGray, fontSize: '12px', padding: '6px 12px' }}>
                  Resetar para defaults do role
                </button>
                <button onClick={() => setModalPermissoes(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}>✕</button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <div style={{ padding: '16px 24px', background: '#fef3c7', borderBottom: '1px solid #fde68a', fontSize: '12px', color: '#92400e' }}>
                💡 Deixe vazio para usar as permissões padrão do role ({modalPermissoes.cargo}). Configure apenas quando precisar personalizar.
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', width: '200px' }}>Módulo</th>
                    {ACOES_PERM.map(a => (
                      <th key={a} style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#374151', textTransform: 'capitalize' }}>{a}</th>
                    ))}
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Todos</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Nenhum</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULOS_PERM.map((mod, idx) => (
                    <tr key={mod.id} style={{ borderTop: '1px solid #f3f4f6', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '10px 16px', fontWeight: '500', color: '#374151' }}>{mod.label}</td>
                      {ACOES_PERM.map(acao => (
                        <td key={acao} style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <input type="checkbox"
                            checked={!!permMatriz[mod.id]?.[acao]}
                            onChange={() => togglePerm(mod.id, acao)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#7c3aed' }}
                          />
                        </td>
                      ))}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <button onClick={() => setAllModuloPerm(mod.id, true)} style={{ padding: '2px 8px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', color: '#15803d', fontWeight: '600' }}>✓</button>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <button onClick={() => setAllModuloPerm(mod.id, false)} style={{ padding: '2px 8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', color: '#dc2626', fontWeight: '600' }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button style={btnGray} onClick={() => setModalPermissoes(null)}>Cancelar</button>
              <button style={{ ...btnPrimary, background: '#7c3aed', opacity: salvendoPerm ? 0.7 : 1 }} onClick={salvarPermissoes} disabled={salvendoPerm}>
                <Shield size={14} /> {salvendoPerm ? 'Salvando...' : 'Salvar Permissões'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Configuracoes;
