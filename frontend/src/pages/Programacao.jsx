import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, ChevronLeft, ChevronRight, AlertCircle, X, Edit, Trash2, RefreshCw, Truck, Share2 } from 'lucide-react';
import { api } from '../lib/api';

const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };

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

const Programacao = () => {
  const [programacoes, setProgramacoes] = useState([]);
  const [osSemana, setOsSemana] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [semana, setSemana] = useState(() => getSemanaISO(new Date())[1]);
  const [ano, setAno] = useState(() => getSemanaISO(new Date())[0]);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ cliente: '', data: '', equipe: '', veiculo: '', status: 'agendado' });
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [sincronizando, setSincronizando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [progs, os] = await Promise.allSettled([
        api.getProgramacao({ semana, ano }),
        api.getOS({ limit: 200 }),
      ]);
      if (progs.status === 'fulfilled') setProgramacoes(progs.value || []);
      // Filtra OS com data_mudanca na semana atual
      if (os.status === 'fulfilled') {
        const osList = Array.isArray(os.value) ? os.value : (os.value?.items || []);
        const datas = datasDosDias(semana, ano);
        const inicio = datas[0];
        const fim = new Date(datas[5]);
        fim.setHours(23, 59, 59);
        const filtradas = osList.filter(o => {
          if (!o.data_mudanca) return false;
          const dt = new Date(o.data_mudanca);
          return dt >= inicio && dt <= fim && ['agendada', 'em_andamento'].includes(o.status);
        });
        setOsSemana(filtradas);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [semana, ano]);

  useEffect(() => { carregar(); }, [carregar]);

  const semanaAnterior = () => {
    if (semana === 1) { setSemana(52); setAno(a => a - 1); }
    else setSemana(s => s - 1);
  };
  const semanaSeguinte = () => {
    if (semana === 52) { setSemana(1); setAno(a => a + 1); }
    else setSemana(s => s + 1);
  };

  const abrir = (p = null, dataStr = '') => {
    setEditando(p);
    setForm(p ? { cliente: p.cliente, data: p.data ? p.data.slice(0, 16) : '', equipe: p.equipe || '', veiculo: p.veiculo || '', status: p.status } :
      { cliente: '', data: dataStr, equipe: '', veiculo: '', status: 'agendado' });
    setErroForm('');
    setShowModal(true);
  };

  const salvar = async () => {
    if (!form.cliente.trim()) { setErroForm('Cliente é obrigatório'); return; }
    setSalvando(true);
    try {
      if (editando) await api.updateProgramacao(editando.id, form);
      else await api.createProgramacao(form);
      setShowModal(false);
      carregar();
    } catch (e) { setErroForm(e.message); }
    finally { setSalvando(false); }
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
      alert(`✅ Sincronização concluída: ${res.sincronizadas} OS sincronizadas com a programação.`);
      carregar();
    } catch (e) { alert('Erro ao sincronizar: ' + e.message); }
    finally { setSincronizando(false); }
  };

  const datas = datasDosDias(semana, ano);

  const progsPorDia = (data) => programacoes.filter(p => {
    if (!p.data) return false;
    return new Date(p.data).toDateString() === data.toDateString();
  });

  const osPorDia = (data) => osSemana.filter(o => {
    if (!o.data_mudanca) return false;
    return new Date(o.data_mudanca).toDateString() === data.toDateString();
  });

  const enviarWhatsApp = (data, osNoDia, progs) => {
    const dataStr = data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    let msg = `🚚 *PROGRAMAÇÃO LEGACY MOVING*\n📅 ${dataStr}\n━━━━━━━━━━━━━━━━━\n\n`;
    osNoDia.forEach((o, i) => {
      msg += `*${i + 1}. OS ${o.numero || ''}*\n`;
      msg += `👤 Cliente: ${o.cliente || '—'}\n`;
      if (o.endereco_origem) msg += `📍 Origem: ${o.endereco_origem}\n`;
      if (o.endereco_destino) msg += `📍 Destino: ${o.endereco_destino}\n`;
      if (o.equipe) msg += `👥 Equipe: ${o.equipe}\n`;
      if (o.veiculo) msg += `🚛 Veículo: ${o.veiculo}\n`;
      if (o.hora_inicio) msg += `⏰ Início: ${o.hora_inicio}\n`;
      msg += '\n';
    });
    progs.forEach((p, i) => {
      msg += `*${osNoDia.length + i + 1}. ${p.cliente || '—'}*\n`;
      if (p.equipe) msg += `👥 Equipe: ${p.equipe}\n`;
      if (p.veiculo) msg += `🚛 Veículo: ${p.veiculo}\n`;
      msg += '\n';
    });
    msg += `━━━━━━━━━━━━━━━━━\n✅ Legacy Moving — Equipe Operacional`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) return <Spinner />;
  if (error) return <Erro msg={error} onRetry={carregar} />;

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 4px' }}>Programação de Equipe</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            Visão semanal · {programacoes.length} alocações · {osSemana.length} OS na semana
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={sincronizar} disabled={sincronizando}
            title="Sincroniza automaticamente as OS com datas para a programação"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', opacity: sincronizando ? 0.6 : 1 }}>
            <RefreshCw size={13} /> {sincronizando ? 'Sincronizando...' : 'Sincronizar OS'}
          </button>
          <button onClick={() => abrir()}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
            <Plus size={14} /> Nova Alocação
          </button>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '10px', padding: '14px 20px', border: '0.5px solid #e5e7eb', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={semanaAnterior} style={{ padding: '6px', background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
        <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>Semana {semana} de {ano}</span>
        <button onClick={semanaSeguinte} style={{ padding: '6px', background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer' }}><ChevronRight size={16} /></button>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>
          {datas[0].toLocaleDateString('pt-BR')} — {datas[5].toLocaleDateString('pt-BR')}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
        {DIAS_SEMANA.map((dia, i) => {
          const data = datas[i];
          const progs = progsPorDia(data);
          const osNoDia = osPorDia(data);
          const isHoje = data.toDateString() === new Date().toDateString();
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
                      <button
                        onClick={() => enviarWhatsApp(data, osNoDia, progs)}
                        title="Enviar programação do dia via WhatsApp"
                        style={{ padding: '2px 4px', background: '#25d366', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Share2 size={9} color="white" />
                      </button>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: '11px', color: isHoje ? 'rgba(255,255,255,0.6)' : '#9ca3af', margin: 0 }}>{data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
              </div>
              <div style={{ padding: '8px', minHeight: '80px' }}>
                {/* OS do dia (origem: data_mudanca) */}
                {osNoDia.map(o => (
                  <div key={`os-${o.id}`} style={{ background: '#fff7ed', borderRadius: '6px', padding: '8px', marginBottom: '6px', border: '1px solid #fed7aa' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                      <Truck size={10} color="#c2410c" />
                      <p style={{ fontSize: '10px', fontWeight: '700', color: '#c2410c', margin: 0 }}>OS {o.numero}</p>
                    </div>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#92400e', margin: '0 0 2px' }}>{o.cliente}</p>
                    {o.equipe && <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 1px' }}>👥 {o.equipe}</p>}
                    {o.veiculo && <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>🚛 {o.veiculo}</p>}
                    {o.hora_inicio && <p style={{ fontSize: '10px', color: '#9ca3af', margin: '2px 0 0' }}>⏰ {o.hora_inicio}</p>}
                  </div>
                ))}
                {/* Alocações manuais */}
                {progs.map(p => (
                  <div key={p.id} style={{ background: '#f0f4ff', borderRadius: '6px', padding: '8px', marginBottom: '6px', border: '1px solid #dbeafe' }}>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#1e40af', margin: '0 0 2px' }}>{p.cliente}</p>
                    {p.equipe && <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 2px' }}>👥 {p.equipe}</p>}
                    {p.veiculo && <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>🚛 {p.veiculo}</p>}
                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                      <button onClick={() => abrir(p)} style={{ padding: '3px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit size={11} /></button>
                      <button onClick={() => deletar(p.id)} style={{ padding: '3px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={11} /></button>
                    </div>
                  </div>
                ))}
                <button onClick={() => abrir(null, `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,'0')}-${String(data.getDate()).padStart(2,'0')}T08:00`)}
                  style={{ width: '100%', padding: '5px', background: 'none', border: '1px dashed #d1d5db', borderRadius: '6px', fontSize: '11px', color: '#9ca3af', cursor: 'pointer' }}>
                  + Add
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '440px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{editando ? 'Editar Alocação' : 'Nova Alocação'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
            </div>
            {[['Cliente *', 'cliente', 'text', 'Nome do cliente'], ['Equipe', 'equipe', 'text', 'Ex: João, Pedro'], ['Veículo', 'veiculo', 'text', 'Ex: Caminhão']].map(([label, key, type, ph]) => (
              <div key={key} style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>{label}</label>
                <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={ph} style={inputStyle} />
              </div>
            ))}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Data/hora</label>
              <input type="datetime-local" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} style={inputStyle} />
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

export default Programacao;
