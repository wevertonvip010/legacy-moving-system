import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, TrendingDown, DollarSign, Users, Truck,
  Heart, AlertTriangle, Package, Archive, Target, Award, RefreshCw,
  ChevronRight, BarChart2, Zap,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '../lib/api';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtPct = (v) => `${(v || 0).toFixed(1)}%`;

const Card = ({ children, style = {} }) => (
  <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', ...style }}>
    {children}
  </div>
);

const KPICard = ({ label, value, sub, icon: Icon, color, bg, onClick }) => (
  <div onClick={onClick} style={{
    background: 'white', borderRadius: 12, padding: '16px 18px', border: '0.5px solid #e5e7eb',
    cursor: onClick ? 'pointer' : 'default', transition: 'all 0.12s',
  }}
    onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.08)')}
    onMouseLeave={e => onClick && (e.currentTarget.style.boxShadow = 'none')}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
        <p style={{ fontSize: 22, fontWeight: 800, color: color || '#1a1a1a', margin: '0 0 2px' }}>{value}</p>
        {sub && <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{sub}</p>}
      </div>
      {Icon && (
        <div style={{ background: bg || (color + '15'), borderRadius: 10, padding: 10 }}>
          <Icon size={18} color={color || '#374151'} />
        </div>
      )}
    </div>
  </div>
);

const SectionHeader = ({ title, icon: Icon, color = '#0f1f3d', action, onAction }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {Icon && <Icon size={16} color={color} />}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>{title}</h2>
    </div>
    {action && <button onClick={onAction} style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>{action} <ChevronRight size={12} /></button>}
  </div>
);

export default function PainelExecutivo() {
  const navigate = useNavigate();
  const now = new Date();
  const [mes] = useState(now.getMonth() + 1);
  const [ano] = useState(now.getFullYear());

  const [dados, setDados] = useState({});
  const [loading, setLoading] = useState(true);
  const [ultimaAt, setUltimaAt] = useState(null);
  const [recarregando, setRecarregando] = useState(false);

  const carregar = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    else setRecarregando(true);
    try {
      const [dash, financeiro, historico, avarias, organizers, leads, os] = await Promise.allSettled([
        api.dashboard(),
        api.getResumoFinanceiro({ mes, ano }),
        api.getFinanceiroHistorico(),
        api.getResumoAvarias(),
        api.getRankingOrganizers(),
        api.getLeads(),
        api.getOS({ limit: 200 }),
      ]);
      setDados({
        dash: dash.status === 'fulfilled' ? dash.value : null,
        fin: financeiro.status === 'fulfilled' ? financeiro.value : null,
        hist: historico.status === 'fulfilled' ? historico.value : [],
        av: avarias.status === 'fulfilled' ? avarias.value : null,
        orgs: organizers.status === 'fulfilled' ? organizers.value : [],
        leads: leads.status === 'fulfilled' ? leads.value : [],
        os: os.status === 'fulfilled' ? (Array.isArray(os.value) ? os.value : os.value?.items || []) : [],
      });
      setUltimaAt(new Date());
    } catch (e) { /* silent */ }
    finally { setLoading(false); setRecarregando(false); }
  };

  useEffect(() => { carregar(); }, []); // eslint-disable-line

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTop: '3px solid #0f1f3d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>Carregando Painel Executivo...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const { dash = {}, fin = {}, hist = [], av = {}, orgs = [], leads = [], os = [] } = dados;

  // Computed from raw data
  const totalLeads = leads.length;
  const leadsConvertidos = leads.filter(l => l.status === 'convertido').length;
  const leadsPerdidos = leads.filter(l => l.status === 'perdido').length;
  const taxaConv = totalLeads > 0 ? ((leadsConvertidos / totalLeads) * 100) : 0;

  const osAgendadas = os.filter(o => o.status === 'agendada').length;
  const osAndamento = os.filter(o => o.status === 'em_andamento').length;
  const osConcluidas = os.filter(o => o.status === 'concluida').length;

  const margemColor = (fin.margem_percentual || 0) >= 30 ? '#16a34a' : (fin.margem_percentual || 0) >= 15 ? '#d97706' : '#dc2626';

  // Gráfico funil leads
  const funnelData = [
    { name: 'Novos', v: leads.filter(l => l.status === 'novo').length, color: '#3b82f6' },
    { name: 'Classif.', v: leads.filter(l => l.status === 'classificado').length, color: '#7c3aed' },
    { name: 'Convertidos', v: leadsConvertidos, color: '#16a34a' },
    { name: 'Perdidos', v: leadsPerdidos, color: '#dc2626' },
  ].filter(d => d.v > 0);

  // OS por status
  const osStatus = [
    { name: 'Agendadas', v: osAgendadas, color: '#f59e0b' },
    { name: 'Em andamento', v: osAndamento, color: '#2563eb' },
    { name: 'Concluídas', v: osConcluidas, color: '#16a34a' },
  ].filter(d => d.v > 0);

  const MESES_NOME = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ background: '#0f1f3d', borderRadius: 10, padding: '6px 8px', display: 'flex' }}>
              <LayoutDashboard size={18} color="white" />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Painel Executivo</h1>
          </div>
          <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
            Visão 360° — {MESES_NOME[mes-1]} {ano}
            {ultimaAt && <span style={{ marginLeft: 8, fontSize: 11, color: '#9ca3af' }}>· Atualizado {ultimaAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <button onClick={() => carregar(false)} disabled={recarregando}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 500 }}>
          <RefreshCw size={14} style={{ animation: recarregando ? 'spin 1s linear infinite' : 'none' }} />
          Atualizar
        </button>
      </div>

      {/* ── SEÇÃO 1: KPIs COMERCIAIS ── */}
      <div style={{ marginBottom: 24 }}>
        <SectionHeader title="CRM Comercial" icon={Heart} color="#ec4899" action="Ir para Leads" onAction={() => navigate('/leads')} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          <KPICard label="Total de Leads" value={totalLeads} sub="Todas as origens" icon={Heart} color="#ec4899" onClick={() => navigate('/leads')} />
          <KPICard label="Convertidos" value={leadsConvertidos} sub={`${fmtPct(taxaConv)} taxa`} icon={TrendingUp} color="#16a34a" onClick={() => navigate('/leads')} />
          <KPICard label="Perdidos" value={leadsPerdidos} sub={`${totalLeads > 0 ? fmtPct(leadsPerdidos/totalLeads*100) : '0%'} do total`} icon={TrendingDown} color="#dc2626" onClick={() => navigate('/leads')} />
          <KPICard label="Leads Novos" value={dash.leads_novos ?? 0} sub="Aguardando contato" icon={Users} color="#2563eb" onClick={() => navigate('/leads')} />
          <KPICard label="Orç. Abertos" value={dash.orcamentos_abertos ?? 0} sub="Pendentes de aprovação" icon={Target} color="#f59e0b" onClick={() => navigate('/orcamentos')} />
        </div>
      </div>

      {/* ── SEÇÃO 2: FINANCEIRO ── */}
      <div style={{ marginBottom: 24 }}>
        <SectionHeader title="Financeiro" icon={DollarSign} color="#2563eb" action="Ver Financeiro" onAction={() => navigate('/financeiro')} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <KPICard label="Receita Total" value={fmt(fin.receita_total)} sub={`${fin.mudancas_realizadas || 0} mudanças`} icon={TrendingUp} color="#2563eb" onClick={() => navigate('/financeiro')} />
          <KPICard label="Guarda-Móveis" value={fmt(fin.receita_guarda_moveis)} sub="Receita mensal" icon={Archive} color="#7c3aed" onClick={() => navigate('/guarda-moveis')} />
          <KPICard label="Despesas" value={fmt(fin.total_despesas)} sub="Lançamentos do mês" icon={TrendingDown} color="#dc2626" onClick={() => navigate('/financeiro')} />
          <KPICard label="Lucro Líquido" value={fmt(fin.lucro_liquido)} sub={`Margem: ${fmtPct(fin.margem_percentual)}`} icon={DollarSign} color={(fin.lucro_liquido||0) >= 0 ? '#16a34a' : '#dc2626'} onClick={() => navigate('/financeiro')} />
          <KPICard label="Ticket Médio" value={fmt(fin.ticket_medio)} sub="Por mudança" icon={BarChart2} color="#0891b2" onClick={() => navigate('/financeiro')} />
        </div>

        {/* Barra de margem */}
        <Card style={{ padding: '12px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ minWidth: 80 }}>
              <p style={{ fontSize: 10, color: '#6b7280', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase' }}>Margem</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: margemColor, margin: 0 }}>{fmtPct(fin.margem_percentual)}</p>
            </div>
            <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 8, height: 10, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, Math.max(0, fin.margem_percentual || 0))}%`, height: '100%', background: margemColor, borderRadius: 8, transition: 'width 0.5s' }} />
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
              🎯 Meta: 30%
            </div>
          </div>
        </Card>

        {/* Histórico 12 meses */}
        {hist.length > 0 && (
          <Card style={{ padding: 20 }}>
            <SectionHeader title="Evolução 12 Meses" icon={BarChart2} color="#2563eb" action="Fechamento" onAction={() => navigate('/fechamento-financeiro')} />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hist} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="receita" name="Receita" fill="#2563eb" radius={[4,4,0,0]} />
                <Bar dataKey="despesas" name="Despesas" fill="#dc2626" radius={[4,4,0,0]} />
                <Bar dataKey="lucro" name="Lucro" fill="#16a34a" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* ── SEÇÃO 3: OPERACIONAL ── */}
      <div style={{ marginBottom: 24 }}>
        <SectionHeader title="Operacional" icon={Truck} color="#0891b2" action="Ver OS" onAction={() => navigate('/ordens-servico')} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          <KPICard label="Mudanças Mês" value={dash.mudancas_mes ?? 0} sub="Ordens de serviço" icon={Truck} color="#0891b2" onClick={() => navigate('/ordens-servico')} />
          <KPICard label="Agendadas" value={osAgendadas} sub="A realizar" icon={Zap} color="#f59e0b" onClick={() => navigate('/ordens-servico')} />
          <KPICard label="Em Andamento" value={osAndamento} sub="Acontecendo agora" icon={Truck} color="#2563eb" onClick={() => navigate('/ordens-servico')} />
          <KPICard label="Concluídas" value={osConcluidas} sub="Total histórico" icon={TrendingUp} color="#16a34a" onClick={() => navigate('/ordens-servico')} />
        </div>

        {/* OS por status + leads funil */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {osStatus.length > 0 && (
            <Card style={{ padding: 20 }}>
              <SectionHeader title="OS por Status" icon={Truck} color="#0891b2" />
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={osStatus.map(d => ({ name: d.name, value: d.v }))} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                    {osStatus.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}

          {funnelData.length > 0 && (
            <Card style={{ padding: 20 }}>
              <SectionHeader title="Funil de Leads" icon={Heart} color="#ec4899" />
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={funnelData.map(d => ({ name: d.name, value: d.v }))} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="value" name="Leads" radius={[0,4,4,0]}>
                    {funnelData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      </div>

      {/* ── SEÇÃO 4: RECURSOS ── */}
      <div style={{ marginBottom: 24 }}>
        <SectionHeader title="Recursos & Infraestrutura" icon={Package} color="#7c3aed" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <KPICard label="Clientes Ativos" value={dash.clientes_ativos ?? 0} sub="Na carteira" icon={Users} color="#7c3aed" onClick={() => navigate('/clientes')} />
          <KPICard label="Boxes GM" value={`${dash.boxes_ocupados ?? 0}/${dash.boxes_total ?? 20}`} sub={`${dash.boxes_total ? Math.round((dash.boxes_ocupados/dash.boxes_total)*100) : 0}% ocupados`} icon={Archive} color="#f97316" onClick={() => navigate('/guarda-moveis')} />
          <KPICard label="Avarias Abertas" value={av.por_status?.aberta || av.total_abertas || 0} sub="Pendentes" icon={AlertTriangle} color="#dc2626" onClick={() => navigate('/avarias')} />
          <KPICard label="Valor em Avarias" value={fmt(av.valor_total_estimado)} sub="Estimado total" icon={AlertTriangle} color="#dc2626" onClick={() => navigate('/avarias')} />
        </div>
      </div>

      {/* ── SEÇÃO 5: ORGANIZERS ── */}
      {orgs.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionHeader title="Personal Organizers" icon={Award} color="#ec4899" action="Ver Organizers" onAction={() => navigate('/organizers')} />
          <Card>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['#', 'Organizer', 'Leads', 'Convertidos', 'Conversão', 'Receita', 'Comissão'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: h === '#' || h === 'Organizer' ? 'left' : 'right', fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orgs.slice(0, 8).map((o, i) => (
                    <tr key={o.id} style={{ borderTop: '0.5px solid #f3f4f6' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 14px', fontSize: 16 }}>{['🥇','🥈','🥉'][i] || `#${i+1}`}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1a1a1a' }}>{o.nome}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>{o.total_leads || 0}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>{o.convertidos || 0}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: (o.taxa_conversao||0) >= 50 ? '#16a34a' : '#6b7280' }}>{fmtPct(o.taxa_conversao)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>{fmt(o.receita_gerada)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: o.comissao_pendente > 0 ? '#dc2626' : '#16a34a', fontWeight: 500 }}>
                        {o.comissao_pendente > 0 ? fmt(o.comissao_pendente) + ' ⚠️' : 'Em dia ✓'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── RODAPÉ ── */}
      <div style={{ textAlign: 'center', padding: '16px 0 8px', color: '#9ca3af', fontSize: 11 }}>
        Legacy Moving ERP v2.0 · Painel Executivo · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}
