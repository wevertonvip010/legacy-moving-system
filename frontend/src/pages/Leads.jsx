import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const ORIGENS = ['site', 'instagram', 'whatsapp', 'indicacao', 'google_ads', 'b2b', 'organizer'];
const ORIGEM_LABELS = {
  site: 'Site', instagram: 'Instagram', whatsapp: 'WhatsApp',
  indicacao: 'Indicação', google_ads: 'Google Ads', b2b: 'B2B', organizer: '💜 Organizer'
};
const TIPOS = ['residencial', 'comercial', 'corporativo', 'guarda_moveis'];
const CLASSIFICACOES = ['A', 'AA', 'B2B', 'Baixo'];

const STATUS_COLORS = {
  novo:        { bg: '#dbeafe', color: '#1d4ed8' },
  classificado:{ bg: '#ede9fe', color: '#6d28d9' },
  convertido:  { bg: '#dcfce7', color: '#15803d' },
  perdido:     { bg: '#fee2e2', color: '#b91c1c' },
};

const badge = (status) => {
  const s = STATUS_COLORS[status] || { bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
      {status}
    </span>
  );
};

const cls_badge = (c) => {
  const colors = { A: '#2563eb', AA: '#7c3aed', B2B: '#0891b2', Baixo: '#9ca3af' };
  return c ? (
    <span style={{ background: colors[c] || '#6b7280', color: '#fff', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
      {c}
    </span>
  ) : <span style={{ color: '#9ca3af', fontSize: 12 }}>–</span>;
};

const EMPTY_FORM = {
  nome: '', telefone: '', email: '', origem: 'instagram', tipo_servico: 'residencial',
  organizer_id: '', bairro_origem: '', cidade_origem: '', bairro_destino: '', cidade_destino: '', observacoes: ''
};

export default function Leads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('');
  const [modal, setModal] = useState(null);
  const [selecionado, setSelecionado] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [salvando, setSalvando] = useState(false);
  const [miranteSugestao, setMiranteSugestao] = useState(null);
  const [miranteLoading, setMiranteLoading] = useState(false);
  const [showRelatorio, setShowRelatorio] = useState(false);

  useEffect(() => {
    carregar();
    api.getOrganizers().then(setOrganizers).catch(() => {});
  }, [filtro]); // eslint-disable-line

  const carregar = async () => {
    setLoading(true);
    setErro(null);
    try {
      const params = {};
      if (filtro) params.status = filtro;
      setLeads(await api.getLeads(params));
    } catch (e) { setErro(e.message); }
    finally { setLoading(false); }
  };

  const abrirNovo = () => {
    setForm(EMPTY_FORM);
    setSelecionado(null);
    setModal('form');
  };

  const abrirEditar = (lead) => {
    setSelecionado(lead);
    setForm({
      nome: lead.nome || '', telefone: lead.telefone || '', email: lead.email || '',
      origem: lead.origem || 'instagram', tipo_servico: lead.tipo_servico || 'residencial',
      organizer_id: lead.organizer_id || '',
      bairro_origem: lead.bairro_origem || '', cidade_origem: lead.cidade_origem || '',
      bairro_destino: lead.bairro_destino || '', cidade_destino: lead.cidade_destino || '',
      observacoes: lead.observacoes || ''
    });
    setModal('form');
  };

  const salvarLead = async () => {
    if (!form.nome || !form.telefone) { alert('Nome e Telefone são obrigatórios'); return; }
    setSalvando(true);
    try {
      if (selecionado) {
        await api.updateLead(selecionado.id, form);
      } else {
        await api.createLead(form);
      }
      setModal(null);
      carregar();
    } catch (e) { alert(e.message); }
    finally { setSalvando(false); }
  };

  const marcarPerdido = async (lead) => {
    if (!window.confirm(`Marcar "${lead.nome}" como perdido?`)) return;
    try {
      await api.updateLead(lead.id, { status: 'perdido' });
      carregar();
    } catch (e) { alert(e.message); }
  };

  const excluirLead = async (lead) => {
    if (!window.confirm(`Excluir lead "${lead.nome}" definitivamente?`)) return;
    try { await api.deleteLead(lead.id); carregar(); }
    catch (e) { alert(e.message); }
  };

  const abrirClassificar = (lead) => {
    setSelecionado(lead);
    setForm({ classificacao: lead.classificacao || 'A', justificativa: lead.classificacao_justificativa || '' });
    setMiranteSugestao(null);
    setModal('classificar');
  };

  const pedirMirante = async () => {
    setMiranteLoading(true);
    try {
      const info = `Nome: ${selecionado.nome}\nOrigem: ${selecionado.origem}\nTipo: ${selecionado.tipo_servico}\nCidade: ${selecionado.cidade_origem} → ${selecionado.cidade_destino}\nObs: ${selecionado.observacoes || ''}`;
      const res = await api.miranteClassificarLead(info);
      setMiranteSugestao(res);
      if (res.classificacao) setForm(f => ({ ...f, classificacao: res.classificacao, justificativa: res.justificativa || '' }));
    } catch (e) { alert('Erro Mirante: ' + e.message); }
    finally { setMiranteLoading(false); }
  };

  const salvarClassificacao = async () => {
    setSalvando(true);
    try {
      await api.classificarLead(selecionado.id, form);
      setModal(null);
      carregar();
    } catch (e) { alert(e.message); }
    finally { setSalvando(false); }
  };

  const converterLead = async (lead) => {
    if (!lead.classificacao) { alert('Classifique o lead antes de converter.'); return; }
    if (!window.confirm(`Converter "${lead.nome}" em orçamento?\n\nO cliente será cadastrado automaticamente na aba Clientes.`)) return;
    try {
      const res = await api.converterLead(lead.id);
      const orcId = res.orcamento?.id;
      carregar();
      navigate(`/orcamentos${orcId ? `?edit=${orcId}` : ''}`);
    } catch (e) { alert(e.message); }
  };

  const filtrados = leads.filter(l => !busca || l.nome.toLowerCase().includes(busca.toLowerCase()));

  const inp = {
    width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb',
    borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none'
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Leads</h1>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
            {leads.length} leads · {leads.filter(l => l.status === 'convertido').length} convertidos ·{' '}
            taxa {leads.length > 0 ? ((leads.filter(l => l.status === 'convertido').length / leads.length) * 100).toFixed(0) : 0}%
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowRelatorio(v => !v)}
            style={{ background: showRelatorio ? '#1e3a5f' : 'white', color: showRelatorio ? 'white' : '#374151', border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            📊 {showRelatorio ? 'Ocultar Relatórios' : 'Ver Relatórios'}
          </button>
          <button onClick={abrirNovo}
            style={{ background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}>
            + Novo Lead
          </button>
        </div>
      </div>

      {/* Relatórios / Gráficos */}
      {showRelatorio && (() => {
        const total = leads.length;
        const convertidos = leads.filter(l => l.status === 'convertido').length;
        const perdidos = leads.filter(l => l.status === 'perdido').length;
        const novos = leads.filter(l => l.status === 'novo').length;
        const classificados = leads.filter(l => l.status === 'classificado').length;
        const taxa = total > 0 ? ((convertidos / total) * 100).toFixed(1) : 0;

        // Por origem
        const porOrigem = ORIGENS.map(o => ({
          name: ORIGEM_LABELS[o] || o,
          value: leads.filter(l => l.origem === o).length,
        })).filter(d => d.value > 0);

        // Por status
        const porStatus = [
          { name: 'Novo', value: novos, color: '#2563eb' },
          { name: 'Classificado', value: classificados, color: '#7c3aed' },
          { name: 'Convertido', value: convertidos, color: '#16a34a' },
          { name: 'Perdido', value: perdidos, color: '#dc2626' },
        ].filter(d => d.value > 0);

        const PIE_COLORS_ORIGEM = ['#2563eb', '#ec4899', '#25d366', '#7c3aed', '#f59e0b', '#06b6d4', '#ec4899'];

        return (
          <div style={{ marginBottom: 24 }}>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Total', value: total, color: '#6b7280', bg: '#f3f4f6' },
                { label: 'Novos', value: novos, color: '#1d4ed8', bg: '#dbeafe' },
                { label: 'Classificados', value: classificados, color: '#6d28d9', bg: '#ede9fe' },
                { label: 'Convertidos', value: convertidos, color: '#15803d', bg: '#dcfce7' },
                { label: 'Taxa Conv.', value: `${taxa}%`, color: '#15803d', bg: '#f0fdf4' },
              ].map((k, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 10, padding: '14px 16px', border: '0.5px solid #e5e7eb', borderLeft: `4px solid ${k.color}` }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k.label}</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Charts */}
            {(() => {
              // Ganhos vs Perdidos por Origem
              const ganhosPerdidasOrigem = ORIGENS.map(o => ({
                name: ORIGEM_LABELS[o] || o,
                ganhos: leads.filter(l => l.origem === o && l.status === 'convertido').length,
                perdidos: leads.filter(l => l.origem === o && l.status === 'perdido').length,
              })).filter(d => d.ganhos + d.perdidos > 0);

              // Conversão por organizer (top 6)
              const orgMap = {};
              leads.forEach(l => {
                if (!l.organizer_id) return;
                const orgName = (organizers.find(o => o.id === l.organizer_id)?.nome || 'Organizer').split(' ')[0];
                if (!orgMap[orgName]) orgMap[orgName] = { total: 0, conv: 0 };
                orgMap[orgName].total++;
                if (l.status === 'convertido') orgMap[orgName].conv++;
              });
              const convOrganizer = Object.entries(orgMap).map(([nome, d]) => ({
                name: nome, taxa: d.total > 0 ? +((d.conv/d.total)*100).toFixed(1) : 0, total: d.total,
              })).sort((a,b) => b.taxa - a.taxa).slice(0,6);

              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '0.5px solid #e5e7eb' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Leads por Origem</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={porOrigem} cx="50%" cy="50%" outerRadius={75} dataKey="value" nameKey="name" paddingAngle={2}>
                          {porOrigem.map((_, i) => <Cell key={i} fill={PIE_COLORS_ORIGEM[i % PIE_COLORS_ORIGEM.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '0.5px solid #e5e7eb' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Funil de Conversão</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={porStatus} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" name="Leads" radius={[4, 4, 0, 0]}>
                          {porStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {ganhosPerdidasOrigem.length > 0 && (
                    <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '0.5px solid #e5e7eb' }}>
                      <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Ganhos vs Perdidos por Canal</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={ganhosPerdidasOrigem} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="ganhos" name="Ganhos ✅" fill="#16a34a" radius={[4,4,0,0]} />
                          <Bar dataKey="perdidos" name="Perdidos ❌" fill="#dc2626" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {convOrganizer.length > 0 && (
                    <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '0.5px solid #e5e7eb' }}>
                      <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Taxa de Conversão por Organizer (%)</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={convOrganizer} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} domain={[0,100]} />
                          <Tooltip formatter={(v, n, p) => [`${v}% (${p.payload.total} leads)`, 'Conversão']} />
                          <Bar dataKey="taxa" name="Taxa" fill="#7c3aed" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        );
      })()}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input placeholder="Buscar por nome..." value={busca} onChange={e => setBusca(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none' }} />
        <select value={filtro} onChange={e => setFiltro(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none' }}>
          <option value="">Todos os status</option>
          <option value="novo">Novo</option>
          <option value="classificado">Classificado</option>
          <option value="convertido">Convertido</option>
          <option value="perdido">Perdido</option>
        </select>
      </div>

      {loading && <p style={{ color: '#6b7280' }}>Carregando...</p>}
      {erro && <p style={{ color: '#dc2626' }}>{erro}</p>}

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['Nome', 'Telefone', 'Origem', 'Tipo', 'Cidade', 'Classificação', 'Status', 'Ações'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '11px 14px', fontWeight: 500 }}>{l.nome}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, color: '#6b7280' }}>{l.telefone}</td>
                <td style={{ padding: '11px 14px', fontSize: 13 }}>
                  <div>{ORIGEM_LABELS[l.origem] || l.origem}</div>
                  {l.origem === 'organizer' && l.organizer_nome && (
                    <div style={{ fontSize: 11, color: '#ec4899', marginTop: 2 }}>↳ {l.organizer_nome}</div>
                  )}
                </td>
                <td style={{ padding: '11px 14px', fontSize: 13 }}>{l.tipo_servico}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, color: '#6b7280' }}>{l.cidade_origem || '–'}</td>
                <td style={{ padding: '11px 14px' }}>{cls_badge(l.classificacao)}</td>
                <td style={{ padding: '11px 14px' }}>{badge(l.status)}</td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {l.status !== 'convertido' && (
                      <button onClick={() => abrirEditar(l)}
                        style={{ padding: '4px 9px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                        Editar
                      </button>
                    )}
                    {(l.status === 'novo' || l.status === 'classificado') && (
                      <button onClick={() => abrirClassificar(l)}
                        style={{ padding: '4px 9px', background: '#ede9fe', color: '#6d28d9', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                        {l.status === 'novo' ? 'Classificar' : 'Reclassificar'}
                      </button>
                    )}
                    {l.status === 'classificado' && (
                      <button onClick={() => converterLead(l)}
                        style={{ padding: '4px 9px', background: '#dcfce7', color: '#15803d', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                        → ORC
                      </button>
                    )}
                    {l.status === 'convertido' && (
                      <span style={{ fontSize: 11, color: '#16a34a', padding: '4px 0' }}>✓ ORC criado</span>
                    )}
                    {(l.status === 'novo' || l.status === 'classificado') && (
                      <button onClick={() => marcarPerdido(l)}
                        style={{ padding: '4px 9px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                        Perdido
                      </button>
                    )}
                    <button onClick={() => excluirLead(l)} title="Excluir"
                      style={{ padding: '4px 7px', background: 'none', border: '1px solid #fecaca', color: '#ef4444', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && !loading && (
              <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Nenhum lead encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Novo / Editar */}
      {modal === 'form' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>
              {selecionado ? `Editar Lead — ${selecionado.nome}` : 'Novo Lead'}
            </h2>

            {[
              { label: 'Nome*', key: 'nome' },
              { label: 'Telefone*', key: 'telefone' },
              { label: 'E-mail', key: 'email' },
              { label: 'Bairro Origem', key: 'bairro_origem' },
              { label: 'Cidade Origem', key: 'cidade_origem' },
              { label: 'Bairro Destino', key: 'bairro_destino' },
              { label: 'Cidade Destino', key: 'cidade_destino' },
            ].map(({ label, key }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>{label}</label>
                <input value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inp} />
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Origem</label>
                <select value={form.origem || 'instagram'}
                  onChange={e => setForm(f => ({ ...f, origem: e.target.value, organizer_id: '' }))} style={inp}>
                  {ORIGENS.map(o => <option key={o} value={o}>{ORIGEM_LABELS[o] || o}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Tipo de Serviço</label>
                <select value={form.tipo_servico || 'residencial'}
                  onChange={e => setForm(f => ({ ...f, tipo_servico: e.target.value }))} style={inp}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {form.origem === 'organizer' && (
              <div style={{ marginBottom: 14, background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#7c3aed', display: 'block', marginBottom: 6 }}>
                  💜 Qual Organizer indicou?
                </label>
                <select value={form.organizer_id || ''}
                  onChange={e => setForm(f => ({ ...f, organizer_id: e.target.value }))}
                  style={{ ...inp, border: '1px solid #c4b5fd', background: 'white' }}>
                  <option value="">Selecione a organizer...</option>
                  {organizers.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.nome}{o.instagram ? ` (@${o.instagram.replace('@', '')})` : ''}{o.cidade ? ` · ${o.cidade}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Observações</label>
              <textarea value={form.observacoes || ''} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={3}
                style={{ ...inp, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)}
                style={{ padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', background: '#fff' }}>
                Cancelar
              </button>
              <button onClick={salvarLead} disabled={salvando || !form.nome || !form.telefone}
                style={{ padding: '10px 20px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, opacity: (!form.nome || !form.telefone) ? 0.5 : 1 }}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Classificar */}
      {modal === 'classificar' && selecionado && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>Classificar Lead</h2>
            <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: 14 }}>{selecionado.nome}</p>

            <button onClick={pedirMirante} disabled={miranteLoading}
              style={{ width: '100%', padding: '10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', marginBottom: 16, fontWeight: 600 }}>
              {miranteLoading ? 'Consultando Mirante...' : '🤖 Consultar Mirante (IA)'}
            </button>

            {miranteSugestao && (
              <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13 }}>
                <strong>Sugestão Mirante:</strong> {miranteSugestao.classificacao}<br />
                <span style={{ color: '#6b7280' }}>{miranteSugestao.justificativa}</span>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Classificação</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {CLASSIFICACOES.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, classificacao: c }))}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14,
                      border: `2px solid ${form.classificacao === c ? '#7c3aed' : '#e5e7eb'}`,
                      background: form.classificacao === c ? '#7c3aed' : '#fff',
                      color: form.classificacao === c ? '#fff' : '#374151'
                    }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Justificativa</label>
              <textarea value={form.justificativa || ''} onChange={e => setForm(f => ({ ...f, justificativa: e.target.value }))} rows={3}
                placeholder="Por que esta classificação?"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)}
                style={{ padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', background: '#fff' }}>
                Cancelar
              </button>
              <button onClick={salvarClassificacao} disabled={salvando}
                style={{ padding: '10px 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                {salvando ? 'Confirmando...' : 'Confirmar Classificação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
