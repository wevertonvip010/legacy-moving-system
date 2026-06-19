import React, { useState, useMemo } from 'react';
import { Calculator, Plus, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';

// ── Tabela de itens com cubagem padrão (m³) ─────────────────────────────────
const COMODOS = {
  'Sala': [
    { nome: 'Sofá 2 lugares', m3: 0.8 },
    { nome: 'Sofá 3 lugares', m3: 1.2 },
    { nome: 'Poltrona', m3: 0.5 },
    { nome: 'Mesa de centro', m3: 0.3 },
    { nome: 'Rack / Painel TV', m3: 0.6 },
    { nome: 'TV (grande)', m3: 0.15 },
    { nome: 'Estante', m3: 0.8 },
    { nome: 'Mesa de jantar (4 lug.)', m3: 0.5 },
    { nome: 'Mesa de jantar (6 lug.)', m3: 0.8 },
    { nome: 'Cadeira de jantar', m3: 0.15 },
    { nome: 'Aparador / Buffet', m3: 0.5 },
    { nome: 'Tapete grande', m3: 0.2 },
  ],
  'Quarto': [
    { nome: 'Cama casal (box + colchão)', m3: 1.5 },
    { nome: 'Cama solteiro', m3: 0.8 },
    { nome: 'Beliche', m3: 1.2 },
    { nome: 'Guarda-roupa 4 portas', m3: 2.0 },
    { nome: 'Guarda-roupa 6 portas', m3: 2.8 },
    { nome: 'Cômoda', m3: 0.5 },
    { nome: 'Criado-mudo', m3: 0.15 },
    { nome: 'Sapateira', m3: 0.3 },
    { nome: 'Penteadeira', m3: 0.4 },
  ],
  'Cozinha': [
    { nome: 'Geladeira', m3: 0.8 },
    { nome: 'Geladeira duplex', m3: 1.2 },
    { nome: 'Fogão 4 bocas', m3: 0.4 },
    { nome: 'Fogão 5 bocas', m3: 0.5 },
    { nome: 'Micro-ondas', m3: 0.1 },
    { nome: 'Máquina de lavar louça', m3: 0.5 },
    { nome: 'Armário de cozinha (módulo)', m3: 0.4 },
    { nome: 'Mesa de cozinha', m3: 0.3 },
  ],
  'Lavanderia': [
    { nome: 'Máquina de lavar', m3: 0.5 },
    { nome: 'Secadora', m3: 0.5 },
    { nome: 'Tanque', m3: 0.3 },
    { nome: 'Tábua de passar', m3: 0.1 },
  ],
  'Escritório': [
    { nome: 'Mesa de escritório', m3: 0.5 },
    { nome: 'Cadeira de escritório', m3: 0.25 },
    { nome: 'Estante de livros', m3: 0.6 },
    { nome: 'Arquivo / gaveteiro', m3: 0.3 },
    { nome: 'Computador desktop', m3: 0.1 },
    { nome: 'Impressora', m3: 0.08 },
  ],
  'Diversos': [
    { nome: 'Bicicleta', m3: 0.4 },
    { nome: 'Ventilador de coluna', m3: 0.15 },
    { nome: 'Ar condicionado split', m3: 0.2 },
    { nome: 'Caixas médias (cada)', m3: 0.06 },
    { nome: 'Caixas grandes (cada)', m3: 0.12 },
    { nome: 'Sacolas / bags', m3: 0.04 },
    { nome: 'Quadro / espelho grande', m3: 0.1 },
    { nome: 'Vaso de planta grande', m3: 0.15 },
  ],
};

const inputStyle = {
  padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: '6px',
  fontSize: '13px', outline: 'none', boxSizing: 'border-box', width: '100%',
};

/**
 * Calculadora de cubagem para orçamentos
 * @param {function} onCubagemCalculada - Callback com { m3Total, itens, valorSugerido }
 * @param {function} onClose - Fechar calculadora
 * @param {number} precoPorM3 - Preço base por m³ (default: R$150)
 */
const CalculadoraCubagem = ({ onCubagemCalculada, onClose, precoPorM3 = 150 }) => {
  const [itens, setItens] = useState([]); // [{nome, m3, qtd}]
  const [comodoAberto, setComodoAberto] = useState('Sala');
  const [customNome, setCustomNome] = useState('');
  const [customM3, setCustomM3] = useState('');
  const [distanciaKm, setDistanciaKm] = useState('');
  const [andar, setAndar] = useState(0);
  const [temElevador, setTemElevador] = useState(false);

  const addItem = (nome, m3) => {
    const existente = itens.findIndex(i => i.nome === nome);
    if (existente >= 0) {
      setItens(prev => prev.map((it, i) => i === existente ? { ...it, qtd: it.qtd + 1 } : it));
    } else {
      setItens(prev => [...prev, { nome, m3, qtd: 1 }]);
    }
  };

  const removeItem = (idx) => setItens(prev => prev.filter((_, i) => i !== idx));
  const updateQtd = (idx, qtd) => {
    if (qtd <= 0) return removeItem(idx);
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, qtd } : it));
  };

  const addCustom = () => {
    if (!customNome.trim() || !customM3) return;
    addItem(customNome.trim(), parseFloat(customM3) || 0.1);
    setCustomNome('');
    setCustomM3('');
  };

  const totais = useMemo(() => {
    const m3 = itens.reduce((s, i) => s + i.m3 * i.qtd, 0);
    const totalItens = itens.reduce((s, i) => s + i.qtd, 0);
    const km = parseFloat(distanciaKm) || 0;
    // Cálculo: base por m³ + adicional por km + adicional por andar sem elevador
    const valorBase = m3 * precoPorM3;
    const valorKm = km > 30 ? (km - 30) * 3.5 : 0; // Grátis até 30km, R$3.50/km depois
    const valorAndar = (!temElevador && andar > 0) ? andar * 80 : 0; // R$80/andar sem elevador
    const valorSugerido = Math.round(valorBase + valorKm + valorAndar);
    return { m3: m3.toFixed(2), totalItens, valorBase, valorKm, valorAndar, valorSugerido };
  }, [itens, distanciaKm, andar, temElevador, precoPorM3]);

  const aplicar = () => {
    if (onCubagemCalculada) {
      onCubagemCalculada({
        m3Total: parseFloat(totais.m3),
        totalItens: totais.totalItens,
        valorSugerido: totais.valorSugerido,
        resumo: itens.map(i => `${i.qtd}x ${i.nome} (${i.m3}m³)`).join(', '),
      });
    }
  };

  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '780px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0f4ff', borderRadius: '16px 16px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calculator size={20} color="#2563eb" />
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1a1a1a' }}>Calculadora de Cubagem</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Selecione os itens por cômodo para calcular o volume</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr 300px', minHeight: 0 }}>
          {/* Lado esquerdo: cômodos e itens */}
          <div style={{ padding: '16px 20px', borderRight: '1px solid #f3f4f6', overflowY: 'auto' }}>
            {Object.entries(COMODOS).map(([comodo, lista]) => (
              <div key={comodo} style={{ marginBottom: '8px' }}>
                <button
                  onClick={() => setComodoAberto(comodoAberto === comodo ? '' : comodo)}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', background: comodoAberto === comodo ? '#eff6ff' : '#f9fafb',
                    border: `1px solid ${comodoAberto === comodo ? '#bfdbfe' : '#e5e7eb'}`,
                    borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                    color: comodoAberto === comodo ? '#1d4ed8' : '#374151',
                  }}
                >
                  {comodo}
                  {comodoAberto === comodo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {comodoAberto === comodo && (
                  <div style={{ padding: '8px 0', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {lista.map(item => {
                      const jaAdded = itens.find(i => i.nome === item.nome);
                      return (
                        <button key={item.nome} onClick={() => addItem(item.nome, item.m3)}
                          style={{
                            padding: '6px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
                            border: `1px solid ${jaAdded ? '#bfdbfe' : '#e5e7eb'}`,
                            background: jaAdded ? '#eff6ff' : 'white',
                            color: jaAdded ? '#1d4ed8' : '#374151',
                            fontWeight: jaAdded ? '600' : '400',
                            transition: 'all 0.1s',
                          }}
                        >
                          {item.nome} <span style={{ color: '#9ca3af', fontSize: '10px' }}>{item.m3}m³</span>
                          {jaAdded && <span style={{ marginLeft: '4px', fontWeight: '700' }}>×{jaAdded.qtd}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Item personalizado */}
            <div style={{ marginTop: '12px', padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Item personalizado</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={customNome} onChange={e => setCustomNome(e.target.value)} placeholder="Nome do item" style={{ ...inputStyle, flex: 2 }} />
                <input type="number" value={customM3} onChange={e => setCustomM3(e.target.value)} placeholder="m³" step="0.1" style={{ ...inputStyle, flex: 1 }} />
                <button onClick={addCustom} style={{ padding: '6px 10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Lado direito: resumo */}
          <div style={{ padding: '16px 20px', background: '#fafafa', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: '700', color: '#374151' }}>Itens selecionados</h4>

            {itens.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#9ca3af', padding: '20px 0', textAlign: 'center' }}>
                Selecione itens nos cômodos ao lado
              </p>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', marginBottom: '12px' }}>
                {itens.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: '12px' }}>
                    <span style={{ flex: 1, color: '#374151' }}>{it.nome}</span>
                    <input type="number" min={1} value={it.qtd} onChange={e => updateQtd(idx, parseInt(e.target.value) || 0)}
                      style={{ width: '40px', padding: '3px 6px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '12px', textAlign: 'center' }} />
                    <span style={{ color: '#9ca3af', fontSize: '11px', minWidth: '40px' }}>{(it.m3 * it.qtd).toFixed(1)}m³</span>
                    <button onClick={() => removeItem(idx)} style={{ padding: '2px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Parâmetros extras */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '3px' }}>Distância (km)</label>
                  <input type="number" value={distanciaKm} onChange={e => setDistanciaKm(e.target.value)} placeholder="0" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '3px' }}>Andar</label>
                  <input type="number" value={andar} onChange={e => setAndar(parseInt(e.target.value) || 0)} placeholder="0" style={inputStyle} />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#374151', cursor: 'pointer' }}>
                <input type="checkbox" checked={temElevador} onChange={e => setTemElevador(e.target.checked)} />
                Tem elevador
              </label>
            </div>

            {/* Totais */}
            <div style={{ background: '#0f1f3d', borderRadius: '10px', padding: '14px', color: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', opacity: 0.7 }}>Volume total</span>
                <span style={{ fontSize: '16px', fontWeight: '800' }}>{totais.m3} m³</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', opacity: 0.6 }}>Itens</span>
                <span style={{ fontSize: '12px' }}>{totais.totalItens}</span>
              </div>
              {parseFloat(distanciaKm) > 30 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', opacity: 0.6 }}>Adicional distância</span>
                  <span style={{ fontSize: '12px' }}>+{fmt(totais.valorKm)}</span>
                </div>
              )}
              {totais.valorAndar > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', opacity: 0.6 }}>Adicional andar</span>
                  <span style={{ fontSize: '12px' }}>+{fmt(totais.valorAndar)}</span>
                </div>
              )}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: '600' }}>Valor sugerido</span>
                <span style={{ fontSize: '20px', fontWeight: '800', color: '#22c55e' }}>{fmt(totais.valorSugerido)}</span>
              </div>
            </div>

            <button onClick={aplicar} disabled={itens.length === 0}
              style={{
                marginTop: '12px', width: '100%', padding: '10px',
                background: itens.length === 0 ? '#9ca3af' : '#2563eb', color: 'white',
                border: 'none', borderRadius: '8px', fontSize: '13px',
                fontWeight: '600', cursor: itens.length === 0 ? 'not-allowed' : 'pointer',
              }}>
              Aplicar ao Orçamento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalculadoraCubagem;
