import React, { useState, useEffect, useCallback } from 'react';
import { Archive, Plus, Search, X, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const STATUS_LABEL = { ocupado: 'Ocupado', livre: 'Livre', manutencao: 'Manutenção' };
const STATUS_COLOR = {
  ocupado: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  livre: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  manutencao: { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
};

const GuardaMoveis = () => {
  const [dados, setDados] = useState({ boxes: [], receita_mensal_total: 0, ocupados: 0, livres: 0, manutencao: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [showNovoBox, setShowNovoBox] = useState(false);
  const [boxSelecionado, setBoxSelecionado] = useState(null);
  const [modo, setModo] = useState('');
  const [form, setForm] = useState({ cliente_nome: '', valor_mensal: '380', metros_quadrados: '', metros_cubicos: '', observacoes: '' });
  const [novoBoxNumero, setNovoBoxNumero] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');

  const carregar = useCallback(() => {
    setLoading(true);
    api.getBoxes()
      .then(setDados)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirModal = (box, m) => {
    setBoxSelecionado(box);
    setModo(m);
    setErroForm('');
    if (m === 'ocupar') setForm({ cliente_nome: '', valor_mensal: '380', metros_quadrados: '', metros_cubicos: '', observacoes: '' });
    setShowModal(true);
  };

  const criarNovoBox = async () => {
    setSalvando(true);
    try {
      await api.createBox({ numero: novoBoxNumero.trim() || undefined });
      setShowNovoBox(false);
      setNovoBoxNumero('');
      carregar();
    } catch (e) {
      setErroForm(e.message);
    } finally {
      setSalvando(false);
    }
  };

  const salvar = async () => {
    if (modo === 'ocupar' && !form.cliente_nome.trim()) {
      setErroForm('Nome do cliente é obrigatório');
      return;
    }
    setSalvando(true);
    try {
      if (modo === 'ocupar') {
        await api.ocuparBox(boxSelecionado.id, {
          cliente_nome: form.cliente_nome,
          valor_mensal: parseFloat(form.valor_mensal) || 380,
          metros_quadrados: form.metros_quadrados ? parseFloat(form.metros_quadrados) : undefined,
          metros_cubicos: form.metros_cubicos ? parseFloat(form.metros_cubicos) : undefined,
          observacoes: form.observacoes,
        });
      } else if (modo === 'liberar') {
        await api.liberarBox(boxSelecionado.id);
      } else if (modo === 'manutencao') {
        await api.manutencaoBox(boxSelecionado.id);
      }
      setShowModal(false);
      carregar();
    } catch (e) {
      setErroForm(e.message);
    } finally {
      setSalvando(false);
    }
  };

  const filtrados = (dados.boxes || []).filter(b => {
    const ok = filtro === 'todos' || b.status === filtro;
    const match = !busca || b.numero.toLowerCase().includes(busca.toLowerCase()) ||
      (b.cliente_nome && b.cliente_nome.toLowerCase().includes(busca.toLowerCase()));
    return ok && match;
  });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTop: '3px solid #0f1f3d', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <p style={{ color: '#6b7280', marginTop: '12px', fontSize: '14px' }}>Carregando boxes...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 4px' }}>Guarda-Móveis</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            {dados.total} boxes cadastrados · {dados.ocupados} ocupados · {dados.livres} livres
          </p>
        </div>
        <button onClick={() => { setErroForm(''); setNovoBoxNumero(''); setShowNovoBox(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
          <Plus size={14} /> Novo Box
        </button>
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total de boxes', value: dados.total, color: '#6b7280' },
          { label: 'Ocupados', value: dados.ocupados, color: '#dc2626' },
          { label: 'Livres', value: dados.livres, color: '#16a34a' },
          { label: 'Receita mensal', value: fmt(dados.receita_mensal_total), color: '#0f1f3d' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '0.5px solid #e5e7eb' }}>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 6px' }}>{s.label}</p>
            <p style={{ fontSize: '22px', fontWeight: '700', color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '0.5px solid #e5e7eb', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por box ou cliente..."
            style={{ width: '100%', paddingLeft: '32px', padding: '8px 8px 8px 32px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {['todos', 'livre', 'ocupado', 'manutencao'].map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid', fontSize: '13px', cursor: 'pointer',
              borderColor: filtro === f ? '#0f1f3d' : '#e5e7eb',
              background: filtro === f ? '#0f1f3d' : 'white',
              color: filtro === f ? 'white' : '#374151' }}>
            {f === 'todos' ? 'Todos' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {/* Grid de boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
        {filtrados.map(box => {
          const sc = STATUS_COLOR[box.status] || STATUS_COLOR.livre;
          return (
            <div key={box.id} style={{ background: 'white', borderRadius: '10px', border: `1px solid ${sc.border}`, padding: '16px', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontWeight: '700', color: '#1a1a1a', fontSize: '15px' }}>{box.numero}</span>
                <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: sc.bg, color: sc.text, fontWeight: '500' }}>
                  {STATUS_LABEL[box.status]}
                </span>
              </div>
              {box.status === 'ocupado' && (
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '500', color: '#374151', margin: '0 0 2px' }}>{box.cliente_nome}</p>
                  <p style={{ fontSize: '12px', color: '#10b981', fontWeight: '600', margin: '0 0 2px' }}>{fmt(box.valor_mensal)}/mês</p>
                  {(box.metros_quadrados || box.metros_cubicos) && (
                    <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 2px' }}>
                      {box.metros_quadrados ? `${box.metros_quadrados} m²` : ''}
                      {box.metros_quadrados && box.metros_cubicos ? ' · ' : ''}
                      {box.metros_cubicos ? `${box.metros_cubicos} m³` : ''}
                    </p>
                  )}
                  {box.data_entrada && (
                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>
                      Desde {new Date(box.data_entrada).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {box.status === 'livre' && (
                  <button onClick={() => abrirModal(box, 'ocupar')}
                    style={{ flex: 1, padding: '7px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
                    Ocupar
                  </button>
                )}
                {box.status === 'ocupado' && (
                  <button onClick={() => abrirModal(box, 'liberar')}
                    style={{ flex: 1, padding: '7px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '7px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
                    Liberar
                  </button>
                )}
                {box.status !== 'manutencao' && (
                  <button onClick={() => abrirModal(box, 'manutencao')}
                    style={{ padding: '7px 10px', background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', borderRadius: '7px', fontSize: '12px', cursor: 'pointer' }}>
                    Mnt.
                  </button>
                )}
                {box.status === 'manutencao' && (
                  <button onClick={() => abrirModal(box, 'liberar')}
                    style={{ flex: 1, padding: '7px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '7px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
                    Liberar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Novo Box */}
      {showNovoBox && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '380px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Novo Box</h3>
              <button onClick={() => setShowNovoBox(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Identificação do box</label>
              <input value={novoBoxNumero} onChange={e => setNovoBoxNumero(e.target.value)}
                placeholder="Ex: Box 21 (deixe vazio para automático)"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            {erroForm && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{erroForm}</p>}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNovoBox(false)} style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'white' }}>Cancelar</button>
              <button onClick={criarNovoBox} disabled={salvando}
                style={{ padding: '9px 18px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                {salvando ? 'Criando...' : 'Criar Box'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && boxSelecionado && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '420px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600' }}>
              {modo === 'ocupar' ? `Ocupar ${boxSelecionado.numero}` :
               modo === 'liberar' ? `Liberar ${boxSelecionado.numero}` :
               `Manutenção — ${boxSelecionado.numero}`}
            </h3>
            {modo === 'ocupar' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Nome do cliente *</label>
                  <input value={form.cliente_nome} onChange={e => setForm({ ...form, cliente_nome: e.target.value })}
                    placeholder="Ex: Maria Silva"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Valor mensal (R$)</label>
                    <input type="number" value={form.valor_mensal} onChange={e => setForm({ ...form, valor_mensal: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                      Área (m²) <span style={{ fontSize: '11px', color: '#9ca3af' }}>↔ calcula m³</span>
                    </label>
                    <input type="number" step="0.1" value={form.metros_quadrados}
                      onChange={e => {
                        const m2 = e.target.value;
                        const m3 = m2 ? (parseFloat(m2) * 2.5).toFixed(1) : '';
                        setForm({ ...form, metros_quadrados: m2, metros_cubicos: m3 });
                      }}
                      placeholder="Ex: 4.5"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                      Volume (m³) <span style={{ fontSize: '11px', color: '#9ca3af' }}>↔ calcula m²</span>
                    </label>
                    <input type="number" step="0.1" value={form.metros_cubicos}
                      onChange={e => {
                        const m3 = e.target.value;
                        const m2 = m3 ? (parseFloat(m3) / 2.5).toFixed(1) : '';
                        setForm({ ...form, metros_cubicos: m3, metros_quadrados: m2 });
                      }}
                      placeholder="Ex: 12.0"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Observações</label>
                  <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={2}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
              </div>
            )}
            {modo === 'liberar' && <p style={{ fontSize: '14px', color: '#374151' }}>Confirma a liberação do {boxSelecionado.numero}?</p>}
            {modo === 'manutencao' && <p style={{ fontSize: '14px', color: '#374151' }}>Marcar {boxSelecionado.numero} como em manutenção?</p>}
            {erroForm && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '8px' }}>{erroForm}</p>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} disabled={salvando}
                style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'white' }}>
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                style={{ padding: '9px 18px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                {salvando ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuardaMoveis;
