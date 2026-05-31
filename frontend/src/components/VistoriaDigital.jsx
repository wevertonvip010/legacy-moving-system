import React, { useState, useRef } from 'react';
import { Camera, CheckSquare, Square, X, Save, Trash2, Plus, Pen } from 'lucide-react';

const COMODOS_DEFAULT = [
  'Sala de Estar', 'Sala de Jantar', 'Quarto 1', 'Quarto 2', 'Quarto 3',
  'Cozinha', 'Lavanderia', 'Banheiro', 'Escritório', 'Varanda', 'Garagem',
];

const CONDICOES = ['Perfeito', 'Bom', 'Usado', 'Avariado'];

const inputStyle = {
  width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb',
  borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
};

/**
 * Vistoria Digital — checklist por cômodo com fotos e observações
 * @param {string} tipo - 'saida' | 'chegada'
 * @param {object} initialData - Dados existentes { comodos: [...] }
 * @param {function} onSave - Callback com dados da vistoria
 * @param {function} onClose - Fechar modal
 */
const VistoriaDigital = ({ tipo = 'saida', initialData, onSave, onClose }) => {
  const [comodos, setComodos] = useState(() => {
    if (initialData?.comodos) return initialData.comodos;
    return COMODOS_DEFAULT.map(nome => ({
      nome,
      ativo: false,
      itens: [],
      observacoes: '',
      fotos: [],
    }));
  });
  const [comodoAtivo, setComodoAtivo] = useState(null);
  const [novoItem, setNovoItem] = useState('');
  const [salvando, setSalvando] = useState(false);

  // ── Assinatura ─────────────────────────────────────────────────────────
  const [showAssinatura, setShowAssinatura] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [assinaturaData, setAssinaturaData] = useState(initialData?.assinatura || null);

  const toggleComodo = (idx) => {
    setComodos(prev => prev.map((c, i) => i === idx ? { ...c, ativo: !c.ativo } : c));
  };

  const addItem = (comodoIdx) => {
    if (!novoItem.trim()) return;
    setComodos(prev => prev.map((c, i) =>
      i === comodoIdx ? {
        ...c,
        itens: [...c.itens, { descricao: novoItem.trim(), condicao: 'Bom', observacao: '' }],
      } : c
    ));
    setNovoItem('');
  };

  const updateItem = (comodoIdx, itemIdx, field, value) => {
    setComodos(prev => prev.map((c, ci) =>
      ci === comodoIdx ? {
        ...c,
        itens: c.itens.map((it, ii) => ii === itemIdx ? { ...it, [field]: value } : it),
      } : c
    ));
  };

  const removeItem = (comodoIdx, itemIdx) => {
    setComodos(prev => prev.map((c, ci) =>
      ci === comodoIdx ? { ...c, itens: c.itens.filter((_, ii) => ii !== itemIdx) } : c
    ));
  };

  const updateObs = (comodoIdx, obs) => {
    setComodos(prev => prev.map((c, i) => i === comodoIdx ? { ...c, observacoes: obs } : c));
  };

  // ── Canvas de assinatura ───────────────────────────────────────────────
  const startDraw = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f1f3d';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      setAssinaturaData(canvasRef.current.toDataURL());
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setAssinaturaData(null);
  };

  const handleSave = () => {
    setSalvando(true);
    const dados = {
      tipo,
      data: new Date().toISOString(),
      comodos: comodos.filter(c => c.ativo),
      assinatura: assinaturaData,
      totalItens: comodos.reduce((s, c) => s + (c.ativo ? c.itens.length : 0), 0),
    };
    onSave(dados);
    setSalvando(false);
  };

  const comodosAtivos = comodos.filter(c => c.ativo);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
      <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: tipo === 'saida' ? '#eff6ff' : '#f0fdf4', borderRadius: '16px 16px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Camera size={20} color={tipo === 'saida' ? '#2563eb' : '#16a34a'} />
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>
                Vistoria de {tipo === 'saida' ? 'Saída' : 'Chegada'}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                {comodosAtivos.length} cômodos selecionados
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {/* Seleção de cômodos */}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '10px' }}>
              Selecione os cômodos a vistoriar:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {comodos.map((c, i) => (
                <button key={i} onClick={() => toggleComodo(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '7px 14px', borderRadius: '20px', fontSize: '12px',
                    cursor: 'pointer', fontWeight: c.ativo ? '600' : '400',
                    border: `1px solid ${c.ativo ? '#2563eb' : '#e5e7eb'}`,
                    background: c.ativo ? '#eff6ff' : 'white',
                    color: c.ativo ? '#2563eb' : '#6b7280',
                  }}>
                  {c.ativo ? <CheckSquare size={12} /> : <Square size={12} />}
                  {c.nome}
                </button>
              ))}
            </div>
          </div>

          {/* Detalhamento por cômodo ativo */}
          {comodosAtivos.map((comodo, _ci) => {
            const idx = comodos.findIndex(c => c.nome === comodo.nome);
            const isOpen = comodoAtivo === idx;
            return (
              <div key={comodo.nome} style={{
                marginBottom: '12px', border: '1px solid #e5e7eb', borderRadius: '10px',
                overflow: 'hidden',
              }}>
                <button onClick={() => setComodoAtivo(isOpen ? null : idx)}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', padding: '12px 14px',
                    background: isOpen ? '#f0f4ff' : '#f9fafb',
                    border: 'none', cursor: 'pointer', fontSize: '13px',
                    fontWeight: '600', color: '#1a1a1a',
                  }}>
                  <span>{comodo.nome} ({comodo.itens.length} itens)</span>
                  <span style={{ fontSize: '18px' }}>{isOpen ? '−' : '+'}</span>
                </button>

                {isOpen && (
                  <div style={{ padding: '12px 14px' }}>
                    {/* Lista de itens */}
                    {comodo.itens.map((item, ii) => (
                      <div key={ii} style={{
                        display: 'flex', gap: '8px', alignItems: 'center',
                        padding: '8px 0', borderBottom: '1px solid #f3f4f6',
                      }}>
                        <span style={{ flex: 2, fontSize: '13px', color: '#374151' }}>{item.descricao}</span>
                        <select value={item.condicao} onChange={e => updateItem(idx, ii, 'condicao', e.target.value)}
                          style={{ ...inputStyle, width: '110px', flex: 'none', fontSize: '12px',
                            color: item.condicao === 'Avariado' ? '#dc2626' : item.condicao === 'Perfeito' ? '#16a34a' : '#374151' }}>
                          {CONDICOES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input placeholder="Obs..." value={item.observacao || ''}
                          onChange={e => updateItem(idx, ii, 'observacao', e.target.value)}
                          style={{ ...inputStyle, width: '120px', flex: 'none', fontSize: '12px' }} />
                        <button onClick={() => removeItem(idx, ii)}
                          style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}

                    {/* Adicionar item */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <input value={novoItem} onChange={e => setNovoItem(e.target.value)}
                        placeholder="Ex: Sofá 3 lugares, TV 55 polegadas..."
                        onKeyDown={e => e.key === 'Enter' && addItem(idx)}
                        style={{ ...inputStyle, flex: 1 }} />
                      <button onClick={() => addItem(idx)}
                        style={{ padding: '8px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}>
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Observações do cômodo */}
                    <div style={{ marginTop: '10px' }}>
                      <textarea value={comodo.observacoes} onChange={e => updateObs(idx, e.target.value)}
                        placeholder="Observações gerais deste cômodo..."
                        rows={2} style={{ ...inputStyle, resize: 'vertical', fontSize: '12px' }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Assinatura */}
          <div style={{ marginTop: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Pen size={15} color="#0f1f3d" />
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#374151' }}>Assinatura do Cliente</span>
              </div>
              {!showAssinatura && (
                <button onClick={() => setShowAssinatura(true)}
                  style={{ padding: '6px 12px', background: '#0f1f3d', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  Assinar
                </button>
              )}
            </div>

            {assinaturaData && !showAssinatura && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={assinaturaData} alt="Assinatura" style={{ height: '60px', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
                <span style={{ fontSize: '12px', color: '#16a34a' }}>✓ Assinado</span>
              </div>
            )}

            {showAssinatura && (
              <div>
                <canvas ref={canvasRef} width={400} height={120}
                  style={{ border: '2px solid #0f1f3d', borderRadius: '8px', cursor: 'crosshair', background: '#fafafa', touchAction: 'none', width: '100%', maxWidth: '400px' }}
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button onClick={clearCanvas}
                    style={{ padding: '6px 12px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    Limpar
                  </button>
                  <button onClick={() => setShowAssinatura(false)}
                    style={{ padding: '6px 12px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    ✓ Confirmar Assinatura
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            {comodosAtivos.length} cômodos · {comodos.reduce((s, c) => s + (c.ativo ? c.itens.length : 0), 0)} itens
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose}
              style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', fontSize: '13px', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={salvando || comodosAtivos.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '9px 18px', background: comodosAtivos.length === 0 ? '#9ca3af' : '#0f1f3d',
                color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px',
                fontWeight: '600', cursor: comodosAtivos.length === 0 ? 'not-allowed' : 'pointer',
              }}>
              <Save size={14} /> Salvar Vistoria
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VistoriaDigital;
