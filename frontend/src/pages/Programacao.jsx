import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, ChevronLeft, ChevronRight, AlertCircle, X, Edit, Trash2, RefreshCw, Truck, Share2 } from 'lucide-react';
import { api } from '../lib/api';

const DIAS_SEMANA_CURTO = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const DIAS_SEMANA_LONGO = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };

const TIPOS_SERVICO = [
  { key: 'mudanca',    label: 'Mudança',     emoji: '🚚', color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
  { key: 'embalagem',  label: 'Embalagem',   emoji: '📦', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { key: 'transporte', label: 'Transporte',  emoji: '🛻', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'icamento',   label: 'Içamento',    emoji: '🏗️', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  { key: 'montagem',   label: 'Montagem',    emoji: '🔧', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  { key: 'guarda',     label: 'Guarda-Móveis', emoji: '🏠', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { key: 'outro',      label: 'Outro',       emoji: '📋', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
];
const getTipoConfig = (key) => TIPOS_SERVICO.find(t => t.key === key) || TIPOS_SERVICO[TIPOS_SERVICO.length - 1];

/* ── Helpers de data ─────────────────────────────────────────────────────── */
function getSemanaISO(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return [d.getFullYear(), 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)];
}

function datasDosDias(semana, ano) {
  const jan4 = new Date(ano, 0, 4);
  const seg = new Date(jan4);
  seg.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (semana - 1) * 7);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(seg);
    d.setDate(seg.getDate() + i);
    return d;
  });
}

// Retorna todas as datas visíveis no grid mensal (preenchendo semanas completas)
function datasDoGrid(mes, ano) {
  const primeiroDia = new Date(ano, mes - 1, 1);
  const ultimoDia   = new Date(ano, mes, 0);
  const diaSemana   = (primeiroDia.getDay() + 6) % 7; // 0=Mon
  const inicio      = new Date(primeiroDia);
  inicio.setDate(primeiroDia.getDate() - diaSemana);
  const fimDiaSem   = (ultimoDia.getDay() + 6) % 7;
  const fim         = new Date(ultimoDia);
  fim.setDate(ultimoDia.getDate() + (6 - fimDiaSem));
  const datas = [];
  const cur = new Date(inicio);
  while (cur <= fim) { datas.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
  return datas;
}

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ── Componente principal ────────────────────────────────────────────────── */
const Programacao = () => {
  // ── Visão semanal ──────────────────────────────────────────────────────────
  const [semana, setSemana] = useState(() => getSemanaISO(new Date())[1]);
  const [ano,    setAno]    = useState(() => getSemanaISO(new Date())[0]);

  // ── Visão mensal ───────────────────────────────────────────────────────────
  const [mesVis, setMesVis] = useState(() => new Date().getMonth() + 1);
  const [anoVis, setAnoVis] = useState(() => new Date().getFullYear());

  // ── Modo de visualização ───────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState('mes'); // 'semana' | 'mes'

  // ── Dados ──────────────────────────────────────────────────────────────────
  const [programacoes, setProgramacoes] = useState([]);
  const [osSemana,     setOsSemana]     = useState([]);
  const [allOS,        setAllOS]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [sincronizando, setSincronizando] = useState(false);

  // ── Modal de alocação ──────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editando,  setEditando]  = useState(null);
  const [form, setForm] = useState({ cliente: '', tipo_servico: 'mudanca', data: '', equipe: '', veiculo: '', status: 'agendado' });
  const [salvando,  setSalvando]  = useState(false);
  const [erroForm,  setErroForm]  = useState('');
  const [funcionarios, setFuncionarios] = useState([]);
  const [dragItem, setDragItem] = useState(null);

  /* ── Carga de dados ────────────────────────────────────────────────────── */
  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [progs, os] = await Promise.allSettled([
        api.getProgramacao({ semana, ano }),
        api.getOS({ limit: 500 }),
      ]);
      if (progs.status === 'fulfilled') setProgramacoes(progs.value || []);
      if (os.status === 'fulfilled') {
        const osList = Array.isArray(os.value) ? os.value : (os.value?.items || []);
        setAllOS(osList);
        // Filtra para a semana atual
        const datas = datasDosDias(semana, ano);
        const inicio = datas[0];
        const fim    = new Date(datas[5]); fim.setHours(23, 59, 59);
        setOsSemana(osList.filter(o => {
          if (!o.data_mudanca) return false;
          const dt = new Date(o.data_mudanca);
          return dt >= inicio && dt <= fim && ['agendada', 'em_andamento', 'concluida'].includes(o.status);
        }));
      }
    } catch (e) { setError(e.message); }
    finally    { setLoading(false); }
  }, [semana, ano]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { api.getFuncionarios().then(setFuncionarios).catch(() => {}); }, []);

  /* ── Navegação semanal ─────────────────────────────────────────────────── */
  const semanaAnterior = () => { if (semana === 1) { setSemana(52); setAno(a => a - 1); } else setSemana(s => s - 1); };
  const semanaSeguinte = () => { if (semana === 52) { setSemana(1); setAno(a => a + 1); } else setSemana(s => s + 1); };

  /* ── Navegação mensal ──────────────────────────────────────────────────── */
  const mesAnterior = () => { if (mesVis === 1) { setMesVis(12); setAnoVis(a => a - 1); } else setMesVis(m => m - 1); };
  const mesSeguinte = () => { if (mesVis === 12) { setMesVis(1); setAnoVis(a => a + 1); } else setMesVis(m => m + 1); };

  /* ── Helpers por dia ────────────────────────────────────────────────────── */
  const progsPorDia = (data) =>
    programacoes.filter(p => p.data && new Date(p.data).toDateString() === data.toDateString());

  const osPorDia = (data, listaOS = osSemana) =>
    listaOS.filter(o => o.data_mudanca && new Date(o.data_mudanca).toDateString() === data.toDateString());

  /* ── WhatsApp ───────────────────────────────────────────────────────────── */
  const enviarWhatsApp = (data, osNoDia, progs) => {
    const dataStr = data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    let msg = `🚚 *PROGRAMAÇÃO LEGACY MOVING*\n📅 ${dataStr}\n━━━━━━━━━━━━━━━━━\n\n`;
    osNoDia.forEach((o, i) => {
      msg += `*${i + 1}. OS ${o.numero || ''}*\n`;
      msg += `👤 Cliente: ${o.cliente || '—'}\n`;
      if (o.endereco_origem)  msg += `📍 Origem: ${o.endereco_origem}\n`;
      if (o.endereco_destino) msg += `📍 Destino: ${o.endereco_destino}\n`;
      if (o.equipe)           msg += `👥 Equipe: ${o.equipe}\n`;
      if (o.veiculo)          msg += `🚛 Veículo: ${o.veiculo}\n`;
      if (o.hora_inicio)      msg += `⏰ Início: ${o.hora_inicio}\n`;
      msg += '\n';
    });
    progs.forEach((p, i) => {
      msg += `*${osNoDia.length + i + 1}. ${p.cliente || '—'}*\n`;
      if (p.equipe)  msg += `👥 Equipe: ${p.equipe}\n`;
      if (p.veiculo) msg += `🚛 Veículo: ${p.veiculo}\n`;
      msg += '\n';
    });
    msg += `━━━━━━━━━━━━━━━━━\n✅ Legacy Moving — Equipe Operacional`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  /* ── Modal ─────────────────────────────────────────────────────────────── */
  const abrir = (p = null, dataStr = '') => {
    setEditando(p);
    setForm(p
      ? { cliente: p.cliente, tipo_servico: p.tipo_servico || 'mudanca', data: p.data ? p.data.slice(0, 16) : '', equipe: p.equipe || '', veiculo: p.veiculo || '', status: p.status }
      : { cliente: '', tipo_servico: 'mudanca', data: dataStr, equipe: '', veiculo: '', status: 'agendado' });
    setErroForm('');
    setShowModal(true);
  };

  const salvar = async () => {
    if (!form.cliente.trim()) { setErroForm('Cliente é obrigatório'); return; }
    setSalvando(true);
    try {
      if (editando) await api.updateProgramacao(editando.id, form);
      else          await api.createProgramacao(form);
      setShowModal(false);
      carregar();
    } catch (e) { setErroForm(e.message); }
    finally    { setSalvando(false); }
  };

  const deletar = async (id) => {
    if (!confirm('Remover alocação?')) return;
    try { await api.deleteProgramacao(id); carregar(); }
    catch (e) { alert(e.message); }
  };

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      const res = await api.syncProgramacao();
      alert(`✅ Sincronização concluída: ${res.sincronizadas} OS sincronizadas.`);
      carregar();
    } catch (e) { alert('Erro: ' + e.message); }
    finally    { setSincronizando(false); }
  };

  /* ── Dados semana ──────────────────────────────────────────────────────── */
  const datasSemanais = datasDosDias(semana, ano);

  /* ── Dados mês ─────────────────────────────────────────────────────────── */
  const gridMes   = datasDoGrid(mesVis, anoVis);
  const osDoMes   = allOS.filter(o => {
    if (!o.data_mudanca) return false;
    const dt = new Date(o.data_mudanca);
    return dt.getFullYear() === anoVis && dt.getMonth() + 1 === mesVis;
  });
  // Build a quick lookup: dateString → {os[], progs[]}
  const eventosPorDiaStr = {};
  osDoMes.forEach(o => {
    const key = new Date(o.data_mudanca).toDateString();
    if (!eventosPorDiaStr[key]) eventosPorDiaStr[key] = { os: [], progs: [] };
    eventosPorDiaStr[key].os.push(o);
  });
  programacoes.forEach(p => {
    if (!p.data) return;
    const dt = new Date(p.data);
    if (dt.getFullYear() === anoVis && dt.getMonth() + 1 === mesVis) {
      const key = dt.toDateString();
      if (!eventosPorDiaStr[key]) eventosPorDiaStr[key] = { os: [], progs: [] };
      eventosPorDiaStr[key].progs.push(p);
    }
  });

  /* ── KPI totais mês ─────────────────────────────────────────────────────── */
  const totalOsMes   = osDoMes.length;
  const progsMesAll  = programacoes.filter(p => {
    if (!p.data) return false;
    const dt = new Date(p.data);
    return dt.getFullYear() === anoVis && dt.getMonth() + 1 === mesVis;
  });

  if (loading) return <Spinner />;
  if (error)   return <Erro msg={error} onRetry={carregar} />;

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={20} color="#0f1f3d" /> Programação de Equipe
          </h1>
          <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>
            {viewMode === 'mes'
              ? `${MESES_PT[mesVis - 1]} ${anoVis} · ${totalOsMes} OS · ${progsMesAll.length} alocações`
              : `Semana ${semana} de ${ano} · ${osSemana.length} OS · ${programacoes.length} alocações`
            }
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Toggle de visualização */}
          <div style={{ display: 'flex', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            {['semana', 'mes'].map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                style={{ padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                  background: viewMode === v ? '#0f1f3d' : 'transparent',
                  color:      viewMode === v ? 'white'   : '#374151' }}>
                {v === 'semana' ? '📅 Semana' : '📆 Mês'}
              </button>
            ))}
          </div>
          <button onClick={sincronizar} disabled={sincronizando}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', opacity: sincronizando ? 0.6 : 1 }}>
            <RefreshCw size={13} /> {sincronizando ? 'Sincronizando...' : 'Sincronizar OS'}
          </button>
          <button onClick={() => abrir()}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
            <Plus size={14} /> Nova Alocação
          </button>
        </div>
      </div>

      {/* ── Barra de navegação ────────────────────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: '10px', padding: '12px 20px', border: '0.5px solid #e5e7eb', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {viewMode === 'semana' ? (
          <>
            <button onClick={semanaAnterior} style={{ padding: '5px 8px', background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a1a', minWidth: 130 }}>Semana {semana} de {ano}</span>
            <button onClick={semanaSeguinte} style={{ padding: '5px 8px', background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer' }}><ChevronRight size={16} /></button>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
              {datasSemanais[0].toLocaleDateString('pt-BR')} — {datasSemanais[5].toLocaleDateString('pt-BR')}
            </span>
          </>
        ) : (
          <>
            <button onClick={mesAnterior} style={{ padding: '5px 8px', background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
            <span style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a1a', minWidth: 180 }}>
              {MESES_PT[mesVis - 1]} {anoVis}
            </span>
            <button onClick={mesSeguinte} style={{ padding: '5px 8px', background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer' }}><ChevronRight size={16} /></button>
            {/* KPIs rápidos do mês */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px' }}>
              {[
                { label: 'OS no mês', value: totalOsMes, color: '#c2410c', bg: '#fff7ed' },
                { label: 'Alocações',  value: progsMesAll.length, color: '#1d4ed8', bg: '#eff6ff' },
                { label: 'Dias com mov.', value: Object.keys(eventosPorDiaStr).length, color: '#15803d', bg: '#f0fdf4' },
              ].map(k => (
                <div key={k.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: k.bg, borderRadius: '8px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: k.color }}>{k.value}</span>
                  <span style={{ fontSize: '11px', color: k.color, opacity: 0.8 }}>{k.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          VISÃO SEMANAL
      ════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'semana' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
          {DIAS_SEMANA_LONGO.map((dia, i) => {
            const data     = datasSemanais[i];
            const progs    = progsPorDia(data);
            const osNoDia  = osPorDia(data);
            const isHoje   = data.toDateString() === new Date().toDateString();
            const totalNoDia = progs.length + osNoDia.length;
            return (
              <div key={dia} style={{ background: 'white', borderRadius: '10px', border: isHoje ? '1.5px solid #0f1f3d' : '0.5px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ padding: '10px 12px', background: isHoje ? '#0f1f3d' : '#f9fafb', borderBottom: '0.5px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: isHoje ? 'white' : '#374151', margin: '0 0 2px' }}>{dia}</p>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {totalNoDia > 0 && (
                        <span style={{ fontSize: '10px', fontWeight: '700', background: isHoje ? 'rgba(255,255,255,0.2)' : '#0f1f3d', color: 'white', borderRadius: '10px', padding: '1px 6px' }}>
                          {totalNoDia}
                        </span>
                      )}
                      {totalNoDia > 0 && (
                        <button onClick={() => enviarWhatsApp(data, osNoDia, progs)} title="Enviar via WhatsApp"
                          style={{ padding: '2px 4px', background: '#25d366', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <Share2 size={9} color="white" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: '11px', color: isHoje ? 'rgba(255,255,255,0.6)' : '#9ca3af', margin: 0 }}>
                    {data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </p>
                </div>
                <div style={{ padding: '8px', minHeight: '80px' }}>
                  {osNoDia.map(o => (
                    <div key={`os-${o.id}`} style={{ background: '#fff7ed', borderRadius: '6px', padding: '8px', marginBottom: '6px', border: '1px solid #fed7aa' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                        <Truck size={10} color="#c2410c" />
                        <p style={{ fontSize: '10px', fontWeight: '700', color: '#c2410c', margin: 0 }}>OS {o.numero}</p>
                      </div>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#92400e', margin: '0 0 2px' }}>{o.cliente}</p>
                      {o.equipe  && <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 1px' }}>👥 {o.equipe}</p>}
                      {o.veiculo && <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>🚛 {o.veiculo}</p>}
                      {o.hora_inicio && <p style={{ fontSize: '10px', color: '#9ca3af', margin: '2px 0 0' }}>⏰ {o.hora_inicio}</p>}
                    </div>
                  ))}
                  {progs.map(p => {
                    const tc = getTipoConfig(p.tipo_servico);
                    return (
                      <div key={p.id} draggable
                        onDragStart={e => { setDragItem(p); e.dataTransfer.effectAllowed = 'move'; }}
                        style={{ background: tc.bg, borderRadius: '6px', padding: '8px', marginBottom: '6px', border: `1px solid ${tc.border}`, cursor: 'grab' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '11px' }}>{tc.emoji}</span>
                          <span style={{ fontSize: '10px', fontWeight: '700', color: tc.color }}>{tc.label}</span>
                        </div>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: tc.color, margin: '0 0 2px' }}>{p.cliente}</p>
                        {p.equipe  && <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 2px' }}>👥 {p.equipe}</p>}
                        {p.veiculo && <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>🚛 {p.veiculo}</p>}
                        <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                          <button onClick={() => abrir(p)} style={{ padding: '3px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit size={11} /></button>
                          <button onClick={() => deletar(p.id)} style={{ padding: '3px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={11} /></button>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={() => abrir(null, `${isoDate(data)}T08:00`)}
                    style={{ width: '100%', padding: '5px', background: 'none', border: '1px dashed #d1d5db', borderRadius: '6px', fontSize: '11px', color: '#9ca3af', cursor: 'pointer' }}>
                    + Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          VISÃO MENSAL
      ════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'mes' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
          {/* Cabeçalho dias da semana */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e5e7eb' }}>
            {DIAS_SEMANA_CURTO.map(d => (
              <div key={d} style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', background: '#f9fafb' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Grade de dias */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {gridMes.map((data, idx) => {
              const doMes     = data.getMonth() + 1 === mesVis && data.getFullYear() === anoVis;
              const isHoje    = data.toDateString() === new Date().toDateString();
              const eventos   = eventosPorDiaStr[data.toDateString()] || { os: [], progs: [] };
              const totalDia  = eventos.os.length + eventos.progs.length;
              const showBorder = idx % 7 !== 6; // not last column
              const showBorderBottom = idx < gridMes.length - 7;
              return (
                <div key={idx} style={{
                  minHeight: '110px',
                  borderRight:  showBorder       ? '1px solid #f3f4f6' : 'none',
                  borderBottom: showBorderBottom ? '1px solid #f3f4f6' : 'none',
                  background:   isHoje ? '#eff6ff' : (doMes ? 'white' : '#fafafa'),
                  padding: '6px',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => { if (!isHoje && doMes) e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={e => { if (!isHoje && doMes) e.currentTarget.style.background = doMes ? 'white' : '#fafafa'; }}
                  onClick={() => abrir(null, `${isoDate(data)}T08:00`)}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = '#dbeafe'; }}
                  onDragLeave={e => { e.currentTarget.style.background = isHoje ? '#eff6ff' : (doMes ? 'white' : '#fafafa'); }}
                  onDrop={async e => {
                    e.preventDefault();
                    e.currentTarget.style.background = isHoje ? '#eff6ff' : (doMes ? 'white' : '#fafafa');
                    if (dragItem) {
                      try {
                        await api.updateProgramacao(dragItem.id, { data: `${isoDate(data)}T${dragItem.data ? dragItem.data.slice(11, 16) : '08:00'}:00` });
                        setDragItem(null);
                        carregar();
                      } catch (err) { alert(err.message); }
                    }
                  }}
                >
                  {/* Número do dia */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '13px', fontWeight: isHoje ? '800' : '600',
                      color: isHoje ? 'white' : (doMes ? '#1a1a1a' : '#c4c4c4'),
                      background: isHoje ? '#2563eb' : 'transparent',
                      borderRadius: '50%', width: '24px', height: '24px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {data.getDate()}
                    </span>
                    {totalDia > 0 && doMes && (
                      <button
                        onClick={e => { e.stopPropagation(); enviarWhatsApp(data, eventos.os, eventos.progs); }}
                        title="Enviar via WhatsApp"
                        style={{ padding: '2px 3px', background: '#25d366', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <Share2 size={8} color="white" />
                      </button>
                    )}
                  </div>

                  {/* Eventos do dia */}
                  {doMes && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {eventos.os.slice(0, 3).map(o => (
                        <div key={`m-os-${o.id}`} onClick={e => e.stopPropagation()}
                          style={{ background: '#fff7ed', borderRadius: '4px', padding: '2px 5px', border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden' }}>
                          <Truck size={8} color="#c2410c" style={{ flexShrink: 0 }} />
                          <span style={{ fontSize: '10px', fontWeight: '600', color: '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {o.cliente}
                          </span>
                        </div>
                      ))}
                      {eventos.progs.slice(0, Math.max(0, 3 - eventos.os.length)).map(p => {
                        const tc = getTipoConfig(p.tipo_servico);
                        return (
                          <div key={`m-p-${p.id}`}
                            draggable
                            onDragStart={e => { e.stopPropagation(); setDragItem(p); e.dataTransfer.effectAllowed = 'move'; }}
                            onClick={e => { e.stopPropagation(); abrir(p); }}
                            style={{ background: tc.bg, borderRadius: '4px', padding: '2px 5px', border: `1px solid ${tc.border}`, display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden', cursor: 'grab' }}>
                            <span style={{ fontSize: '9px', flexShrink: 0 }}>{tc.emoji}</span>
                            <span style={{ fontSize: '10px', fontWeight: '600', color: tc.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.cliente}
                            </span>
                          </div>
                        );
                      })}
                      {totalDia > 3 && (
                        <span style={{ fontSize: '9px', color: '#6b7280', fontWeight: '600', paddingLeft: '2px' }}>
                          +{totalDia - 3} mais
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div style={{ padding: '10px 16px', background: '#f9fafb', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600' }}>Legenda:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '3px' }} />
              <span style={{ fontSize: '11px', color: '#6b7280' }}>OS agendada</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', background: '#f0f4ff', border: '1px solid #dbeafe', borderRadius: '3px' }} />
              <span style={{ fontSize: '11px', color: '#6b7280' }}>Alocação manual</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '3px' }} />
              <span style={{ fontSize: '11px', color: '#6b7280' }}>Hoje</span>
            </div>
            <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: 'auto' }}>Clique num dia para adicionar alocação</span>
          </div>
        </div>
      )}

      {/* ── Modal alocação ──────────────────────────────────────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '24px', width: '520px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>{editando ? 'Editar Alocação' : 'Nova Alocação'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
            </div>

            {/* Cliente */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Cliente *</label>
              <input value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} placeholder="Nome do cliente" style={inputStyle} />
            </div>

            {/* Tipo de serviço */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Tipo de Serviço</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {TIPOS_SERVICO.map(t => (
                  <button key={t.key} onClick={() => setForm({ ...form, tipo_servico: t.key })}
                    style={{
                      padding: '6px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
                      border: `1px solid ${form.tipo_servico === t.key ? t.color : '#e5e7eb'}`,
                      background: form.tipo_servico === t.key ? t.bg : 'white',
                      color: form.tipo_servico === t.key ? t.color : '#6b7280',
                      fontWeight: form.tipo_servico === t.key ? '700' : '400',
                    }}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Data */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Data / hora</label>
              <input type="datetime-local" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} style={inputStyle} />
            </div>

            {/* Equipe — seleção do banco de funcionários */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                Equipe <span style={{ fontWeight: '400', color: '#9ca3af' }}>— selecione ou digite</span>
              </label>
              {funcionarios.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                  {funcionarios.map(f => {
                    const nomes = (form.equipe || '').split(',').map(s => s.trim().toLowerCase());
                    const selecionado = nomes.includes(f.nome.toLowerCase());
                    return (
                      <button key={f.id} onClick={() => {
                        if (selecionado) {
                          setForm({ ...form, equipe: nomes.filter(n => n !== f.nome.toLowerCase()).join(', ') });
                        } else {
                          setForm({ ...form, equipe: form.equipe ? `${form.equipe}, ${f.nome}` : f.nome });
                        }
                      }}
                        style={{
                          padding: '4px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
                          border: `1px solid ${selecionado ? '#2563eb' : '#e5e7eb'}`,
                          background: selecionado ? '#eff6ff' : 'white',
                          color: selecionado ? '#2563eb' : '#374151',
                          fontWeight: selecionado ? '700' : '400',
                        }}>
                        {f.nome}
                        {f.funcoes && <span style={{ fontSize: '10px', color: '#9ca3af', marginLeft: '4px' }}>({f.funcoes.split(',')[0]})</span>}
                      </button>
                    );
                  })}
                </div>
              )}
              <input value={form.equipe} onChange={e => setForm({ ...form, equipe: e.target.value })}
                placeholder="Ex: Diego (motorista), Carlinhos (embalador)" style={inputStyle} />
            </div>

            {/* Veículo */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Veículo</label>
              <input value={form.veiculo} onChange={e => setForm({ ...form, veiculo: e.target.value })} placeholder="Ex: Caminhão baú" style={inputStyle} />
            </div>

            {erroForm && <p style={{ color: '#dc2626', fontSize: '13px' }}>{erroForm}</p>}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              {/* Criar sequência — só no novo */}
              {!editando && form.cliente && form.data && (
                <button onClick={async () => {
                  if (!form.cliente.trim()) return;
                  setSalvando(true);
                  try {
                    // Cria a alocação principal
                    await api.createProgramacao(form);
                    // Cria automaticamente a mudança no dia seguinte se for embalagem
                    if (form.tipo_servico === 'embalagem' && form.data) {
                      const dtBase = new Date(form.data);
                      dtBase.setDate(dtBase.getDate() + 1);
                      const nextDate = `${dtBase.getFullYear()}-${String(dtBase.getMonth()+1).padStart(2,'0')}-${String(dtBase.getDate()).padStart(2,'0')}T08:00`;
                      await api.createProgramacao({ ...form, tipo_servico: 'mudanca', data: nextDate });
                    }
                    setShowModal(false);
                    carregar();
                  } catch (e) { setErroForm(e.message); }
                  finally { setSalvando(false); }
                }} disabled={salvando}
                  style={{ padding: '9px 16px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>
                  + Criar com sequência
                </button>
              )}
              <button onClick={() => setShowModal(false)} style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'white' }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando}
                style={{ padding: '9px 18px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Helpers de UI ─────────────────────────────────────────────────────────── */
const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '12px' }}>
    <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTop: '3px solid #0f1f3d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>Carregando programação...</p>
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

export default Programacao;
