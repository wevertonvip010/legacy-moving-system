import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, Edit, Trash2, X, Star, Phone, AlertCircle, UserCheck, Clock, Award, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';

const NIVEIS = [
  { min: 500, label: 'Lenda',        emoji: '🏆', color: '#d97706', bg: '#fffbeb' },
  { min: 300, label: 'Expert',       emoji: '💎', color: '#7c3aed', bg: '#f5f3ff' },
  { min: 150, label: 'Veterano',     emoji: '⭐', color: '#2563eb', bg: '#eff6ff' },
  { min: 80,  label: 'Profissional', emoji: '🔥', color: '#ea580c', bg: '#fff7ed' },
  { min: 30,  label: 'Iniciante',    emoji: '🌱', color: '#16a34a', bg: '#f0fdf4' },
  { min: 0,   label: 'Novato',       emoji: '🆕', color: '#6b7280', bg: '#f9fafb' },
];
const getNivel = (pts) => NIVEIS.find(n => (pts || 0) >= n.min) || NIVEIS[NIVEIS.length - 1];
const getProximo = (pts) => {
  const idx = NIVEIS.findIndex(n => (pts || 0) >= n.min);
  return idx > 0 ? NIVEIS[idx - 1] : null;
};

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };
const labelStyle = { fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' };

const FUNCOES_PRESET = ['Motorista', 'Embalador', 'Ajudante', 'Líder de equipe', 'Montador', 'Içador'];

const TIPO_CONFIG = {
  fixo:     { label: 'Fixo',     color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', emoji: '👷' },
  diarista: { label: 'Diarista', color: '#d97706', bg: '#fffbeb', border: '#fde68a', emoji: '🔧' },
};

const StarRating = ({ value = 5, onChange, readonly = false }) => (
  <div style={{ display: 'flex', gap: '2px' }}>
    {[1, 2, 3, 4, 5].map(s => (
      <button key={s}
        onClick={() => !readonly && onChange && onChange(s)}
        style={{
          background: 'none', border: 'none', cursor: readonly ? 'default' : 'pointer',
          fontSize: '16px', padding: '0 1px', color: s <= value ? '#f59e0b' : '#d1d5db',
        }}>
        ★
      </button>
    ))}
  </div>
);

const EMPTY = {
  nome: '', tipo: 'fixo', funcoes: '', telefone: '', cpf: '', pix: '',
  valor_diaria: '', salario: '', disponibilidade: '', observacoes: '',
};

const Funcionarios = () => {
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [aba, setAba] = useState('equipe'); // 'equipe' | 'ranking'
  const [ranking, setRanking] = useState([]);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getFuncionarios({ ativo: '0' }); // Todos (incl. inativos)
      setFuncionarios(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    if (aba === 'ranking') api.getRankingFuncionarios().then(setRanking).catch(() => {});
  }, [aba]);

  const abrir = (f = null) => {
    setEditando(f);
    setForm(f ? {
      nome: f.nome || '', tipo: f.tipo || 'fixo', funcoes: f.funcoes || '',
      telefone: f.telefone || '', cpf: f.cpf || '', pix: f.pix || '',
      valor_diaria: f.valor_diaria ? String(f.valor_diaria) : '',
      salario: f.salario ? String(f.salario) : '',
      disponibilidade: f.disponibilidade || '', observacoes: f.observacoes || '',
    } : EMPTY);
    setErroForm('');
    setShowModal(true);
  };

  const salvar = async () => {
    if (!form.nome.trim()) { setErroForm('Nome é obrigatório'); return; }
    setSalvando(true);
    try {
      const payload = {
        ...form,
        valor_diaria: parseFloat(form.valor_diaria) || 0,
        salario: parseFloat(form.salario) || 0,
      };
      if (editando) await api.updateFuncionario(editando.id, payload);
      else await api.createFuncionario(payload);
      setShowModal(false);
      carregar();
    } catch (e) { setErroForm(e.message); }
    finally { setSalvando(false); }
  };

  const toggleAtivo = async (f) => {
    try {
      await api.updateFuncionario(f.id, { ativo: !f.ativo });
      carregar();
    } catch (e) { alert(e.message); }
  };

  const deletar = async (id) => {
    if (!confirm('Excluir funcionário permanentemente?')) return;
    try { await api.deleteFuncionario(id); carregar(); }
    catch (e) { alert(e.message); }
  };

  const toggleFuncao = (funcao) => {
    const lista = form.funcoes ? form.funcoes.split(',').map(s => s.trim()).filter(Boolean) : [];
    const idx = lista.findIndex(f => f.toLowerCase() === funcao.toLowerCase());
    if (idx >= 0) lista.splice(idx, 1);
    else lista.push(funcao);
    setForm({ ...form, funcoes: lista.join(', ') });
  };

  const filtrados = funcionarios.filter(f => {
    const matchTipo = filtroTipo === 'todos' || f.tipo === filtroTipo;
    const matchBusca = !busca || f.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (f.funcoes || '').toLowerCase().includes(busca.toLowerCase());
    return matchTipo && matchBusca;
  });

  const fixos = funcionarios.filter(f => f.tipo === 'fixo' && f.ativo);
  const diaristas = funcionarios.filter(f => f.tipo === 'diarista' && f.ativo);
  const custoFixoMensal = fixos.reduce((s, f) => s + (f.salario || 0), 0);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '12px' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTop: '3px solid #0f1f3d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>Carregando equipe...</p>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', color: '#ef4444' }}>
        <AlertCircle size={32} />
        <p style={{ marginTop: '8px' }}>{error}</p>
        <button onClick={carregar} style={{ marginTop: '12px', padding: '8px 16px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Tentar novamente</button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={22} color="#0f1f3d" /> Equipe Operacional
          </h1>
          <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>
            {fixos.length} fixos · {diaristas.length} diaristas · {funcionarios.filter(f => !f.ativo).length} inativos
          </p>
        </div>
        <button onClick={() => abrir()}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
          <Plus size={14} /> Novo Funcionário
        </button>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
        {[
          { key: 'equipe', label: '👥 Equipe', icon: Users },
          { key: 'ranking', label: '🏆 Ranking & Pontos', icon: Award },
        ].map(t => (
          <button key={t.key} onClick={() => setAba(t.key)}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600',
              background: 'transparent',
              color: aba === t.key ? '#0f1f3d' : '#6b7280',
              borderBottom: aba === t.key ? '2px solid #0f1f3d' : '2px solid transparent',
              marginBottom: '-2px',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════ ABA RANKING ══════ */}
      {aba === 'ranking' && (
        <div>
          {ranking.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>
              <Award size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
              <p style={{ fontSize: '14px', margin: '0 0 4px' }}>Nenhum funcionário com pontos</p>
              <p style={{ fontSize: '12px', margin: 0 }}>Vincule funcionários às OS para gerar pontos automaticamente</p>
            </div>
          ) : (
            <>
              {/* Top 3 destaque */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {ranking.slice(0, 3).map((f, i) => {
                  const nv = getNivel(f.pontos);
                  const medalhas = ['🥇', '🥈', '🥉'];
                  return (
                    <div key={f.id} style={{
                      background: i === 0 ? 'linear-gradient(135deg, #fffbeb, #fef3c7)' : 'white',
                      borderRadius: '14px', padding: '20px', textAlign: 'center',
                      border: `2px solid ${i === 0 ? '#fde68a' : '#e5e7eb'}`,
                      boxShadow: i === 0 ? '0 4px 20px rgba(217,119,6,0.15)' : 'none',
                    }}>
                      <div style={{ fontSize: '36px', marginBottom: '4px' }}>{medalhas[i]}</div>
                      <p style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '800', color: '#1a1a1a' }}>{f.nome}</p>
                      <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#6b7280' }}>{f.funcoes || '—'}</p>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', background: nv.bg, border: `1px solid ${nv.color}30` }}>
                        <span style={{ fontSize: '14px' }}>{nv.emoji}</span>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: nv.color }}>{nv.label}</span>
                      </div>
                      <p style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: '800', color: '#d97706' }}>{f.pontos} pts</p>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#9ca3af' }}>{f.total_servicos} serviços</p>
                    </div>
                  );
                })}
              </div>

              {/* Tabela completa */}
              <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      {['#', 'Funcionário', 'Tipo', 'Nível', 'Pontos', 'Serviços', 'Próximo Nível', 'Últimas OS'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: h === '#' || h === 'Funcionário' ? 'left' : 'center', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((f, i) => {
                      const nv = getNivel(f.pontos);
                      const prox = getProximo(f.pontos);
                      const progresso = prox ? Math.min(100, ((f.pontos - (NIVEIS.find(n => n.label === nv.label)?.min || 0)) / (prox.min - (NIVEIS.find(n => n.label === nv.label)?.min || 0))) * 100) : 100;
                      return (
                        <tr key={f.id} style={{ borderTop: '0.5px solid #f3f4f6' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '12px 14px', fontSize: '16px', fontWeight: '700' }}>
                            {['🥇','🥈','🥉'][i] || `#${i+1}`}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: nv.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', border: `2px solid ${nv.color}30` }}>
                                {nv.emoji}
                              </div>
                              <div>
                                <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{f.nome}</p>
                                <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>{f.funcoes || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', fontWeight: '700', background: f.tipo === 'fixo' ? '#eff6ff' : '#fffbeb', color: f.tipo === 'fixo' ? '#2563eb' : '#d97706' }}>
                              {f.tipo === 'fixo' ? '👷 Fixo' : '🔧 Diarista'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', fontWeight: '700', background: nv.bg, color: nv.color, border: `1px solid ${nv.color}30` }}>
                              {nv.emoji} {nv.label}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '16px', fontWeight: '800', color: '#d97706' }}>{f.pontos}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '14px', fontWeight: '600' }}>{f.total_servicos}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            {prox ? (
                              <div>
                                <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '3px', marginBottom: '4px' }}>
                                  <div style={{ height: '100%', width: `${progresso}%`, background: prox.color, borderRadius: '3px' }} />
                                </div>
                                <span style={{ fontSize: '10px', color: '#6b7280' }}>Faltam {prox.min - f.pontos} pts → {prox.emoji} {prox.label}</span>
                              </div>
                            ) : <span style={{ fontSize: '11px', color: '#d97706' }}>🏆 Nível máximo!</span>}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            {(f.os_recentes || []).length > 0 ? (
                              <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                                {f.os_recentes.slice(0, 3).map((os, j) => (
                                  <span key={j} style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: '#f3f4f6', color: '#374151' }}>
                                    +{os.pontos}
                                  </span>
                                ))}
                              </div>
                            ) : <span style={{ fontSize: '11px', color: '#d1d5db' }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════ ABA EQUIPE ══════ */}
      {aba === 'equipe' && <>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Fixos ativos', value: fixos.length, icon: '👷', color: '#2563eb', bg: '#eff6ff' },
          { label: 'Diaristas ativos', value: diaristas.length, icon: '🔧', color: '#d97706', bg: '#fffbeb' },
          { label: 'Custo fixo mensal', value: fmt(custoFixoMensal), icon: '💰', color: '#dc2626', bg: '#fef2f2' },
          { label: 'Média avaliação', value: funcionarios.length > 0 ? (funcionarios.reduce((s, f) => s + (f.avaliacao || 5), 0) / funcionarios.length).toFixed(1) + ' ★' : '—', icon: '⭐', color: '#f59e0b', bg: '#fffbeb' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '18px', border: '0.5px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k.label}</p>
                <p style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: k.color }}>{k.value}</p>
              </div>
              <div style={{ fontSize: '24px' }}>{k.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input placeholder="Buscar por nome ou função..." value={busca} onChange={e => setBusca(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '36px' }} />
        </div>
        {['todos', 'fixo', 'diarista'].map(t => (
          <button key={t} onClick={() => setFiltroTipo(t)}
            style={{
              padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600',
              border: `1px solid ${filtroTipo === t ? '#0f1f3d' : '#e5e7eb'}`,
              background: filtroTipo === t ? '#0f1f3d' : 'white',
              color: filtroTipo === t ? 'white' : '#374151',
            }}>
            {t === 'todos' ? 'Todos' : TIPO_CONFIG[t]?.emoji + ' ' + TIPO_CONFIG[t]?.label}
          </button>
        ))}
      </div>

      {/* Grid de cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
        {filtrados.map(f => {
          const tc = TIPO_CONFIG[f.tipo] || TIPO_CONFIG.fixo;
          const funcList = f.funcoes ? f.funcoes.split(',').map(s => s.trim()).filter(Boolean) : [];
          return (
            <div key={f.id} style={{
              background: f.ativo ? 'white' : '#fafafa',
              borderRadius: '12px', border: `1px solid ${f.ativo ? tc.border : '#e5e7eb'}`,
              padding: '18px', opacity: f.ativo ? 1 : 0.6,
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { if (f.ativo) e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.06)'; }}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: tc.bg, border: `2px solid ${tc.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px',
                  }}>
                    {tc.emoji}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>{f.nome}</p>
                    <span style={{
                      fontSize: '10px', padding: '2px 8px', borderRadius: '20px', fontWeight: '700',
                      background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`,
                    }}>
                      {tc.label}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => abrir(f)} title="Editar"
                    style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit size={14} /></button>
                  <button onClick={() => deletar(f.id)} title="Excluir"
                    style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                </div>
              </div>

              {/* Funções */}
              {funcList.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                  {funcList.map((fn, i) => (
                    <span key={i} style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
                      background: '#f3f4f6', color: '#374151', fontWeight: '500',
                    }}>
                      {fn}
                    </span>
                  ))}
                </div>
              )}

              {/* Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#6b7280', marginBottom: '10px' }}>
                {f.telefone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={11} /> {f.telefone}
                  </div>
                )}
                {f.tipo === 'diarista' && f.valor_diaria > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    💰 Diária: <strong style={{ color: '#d97706' }}>{fmt(f.valor_diaria)}</strong>
                  </div>
                )}
                {f.tipo === 'fixo' && f.salario > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    💰 Salário: <strong style={{ color: '#2563eb' }}>{fmt(f.salario)}</strong>
                  </div>
                )}
                {f.disponibilidade && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={11} /> {f.disponibilidade}
                  </div>
                )}
              </div>

              {/* Pontos + Nível */}
              {(() => {
                const nv = getNivel(f.pontos);
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '6px 8px', background: nv.bg, borderRadius: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: nv.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {nv.emoji} {nv.label}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#d97706' }}>{f.pontos || 0} pts</span>
                  </div>
                );
              })()}

              {/* Footer: avaliação + status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f3f4f6', paddingTop: '10px' }}>
                <StarRating value={f.avaliacao || 5} readonly />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>{f.total_servicos || 0} serviços</span>
                  <button onClick={() => toggleAtivo(f)}
                    style={{
                      padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700',
                      border: 'none', cursor: 'pointer',
                      background: f.ativo ? '#f0fdf4' : '#fef2f2',
                      color: f.ativo ? '#16a34a' : '#dc2626',
                    }}>
                    {f.ativo ? '● Ativo' : '○ Inativo'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtrados.length === 0 && (
        <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>
          <Users size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
          <p style={{ fontSize: '14px', margin: '0 0 4px' }}>Nenhum funcionário encontrado</p>
          <p style={{ fontSize: '12px', margin: 0 }}>Cadastre sua equipe para facilitar a alocação na programação</p>
        </div>
      )}

      </>}

      {/* Modal Novo / Editar */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '540px', maxHeight: '92vh', overflow: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', borderRadius: '14px 14px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserCheck size={18} color="#0f1f3d" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>
                  {editando ? `Editar — ${editando.nome}` : 'Novo Funcionário'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
            </div>

            <div style={{ padding: '24px' }}>
              {erroForm && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>{erroForm}</div>}

              {/* Tipo */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Tipo de Vínculo *</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {['fixo', 'diarista'].map(t => {
                    const tc = TIPO_CONFIG[t];
                    return (
                      <button key={t} onClick={() => setForm({ ...form, tipo: t })}
                        style={{
                          flex: 1, padding: '14px', borderRadius: '10px', cursor: 'pointer',
                          border: `2px solid ${form.tipo === t ? tc.color : '#e5e7eb'}`,
                          background: form.tipo === t ? tc.bg : 'white',
                          textAlign: 'center',
                        }}>
                        <div style={{ fontSize: '24px', marginBottom: '4px' }}>{tc.emoji}</div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: form.tipo === t ? tc.color : '#6b7280' }}>{tc.label}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                          {t === 'fixo' ? 'Salário mensal' : 'Pago por diária'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nome + Telefone */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={labelStyle}>Nome completo *</label>
                  <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Diego Silva" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Telefone</label>
                  <input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 99999-9999" style={inputStyle} />
                </div>
              </div>

              {/* Funções */}
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Funções <span style={{ fontWeight: '400', color: '#9ca3af' }}>— clique para selecionar</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                  {FUNCOES_PRESET.map(fn => {
                    const sel = form.funcoes && form.funcoes.toLowerCase().includes(fn.toLowerCase());
                    return (
                      <button key={fn} onClick={() => toggleFuncao(fn)}
                        style={{
                          padding: '5px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
                          border: `1px solid ${sel ? '#2563eb' : '#e5e7eb'}`,
                          background: sel ? '#eff6ff' : 'white',
                          color: sel ? '#2563eb' : '#6b7280', fontWeight: sel ? '700' : '400',
                        }}>
                        {fn}
                      </button>
                    );
                  })}
                </div>
                <input value={form.funcoes} onChange={e => setForm({ ...form, funcoes: e.target.value })}
                  placeholder="Ou digite: embalador, motorista, líder..." style={inputStyle} />
              </div>

              {/* Valores */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                {form.tipo === 'fixo' ? (
                  <div>
                    <label style={labelStyle}>Salário mensal (R$)</label>
                    <input type="number" value={form.salario} onChange={e => setForm({ ...form, salario: e.target.value })} placeholder="0.00" style={inputStyle} />
                  </div>
                ) : (
                  <div>
                    <label style={labelStyle}>Valor da diária (R$)</label>
                    <input type="number" value={form.valor_diaria} onChange={e => setForm({ ...form, valor_diaria: e.target.value })} placeholder="0.00" style={inputStyle} />
                  </div>
                )}
                <div>
                  <label style={labelStyle}>Disponibilidade</label>
                  <input value={form.disponibilidade} onChange={e => setForm({ ...form, disponibilidade: e.target.value })}
                    placeholder={form.tipo === 'fixo' ? 'Seg a Sex' : 'Sob demanda'} style={inputStyle} />
                </div>
              </div>

              {/* CPF + PIX */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={labelStyle}>CPF</label>
                  <input value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Chave PIX</label>
                  <input value={form.pix} onChange={e => setForm({ ...form, pix: e.target.value })} placeholder="CPF, telefone ou e-mail" style={inputStyle} />
                </div>
              </div>

              {/* Observações */}
              <div style={{ marginBottom: '4px' }}>
                <label style={labelStyle}>Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })}
                  rows={2} placeholder="Restrições, especialidades, etc." style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowModal(false)}
                style={{ padding: '9px 20px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 20px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', opacity: salvando ? 0.7 : 1 }}>
                <UserCheck size={14} /> {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Funcionarios;
