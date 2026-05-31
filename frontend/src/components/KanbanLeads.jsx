import React, { useState, useRef } from 'react';
import { Phone, Mail, MapPin, Clock, User, ArrowRight } from 'lucide-react';

const COLUNAS = [
  { key: 'novo',         label: 'Novos',         color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'classificado', label: 'Classificados',  color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { key: 'convertido',   label: 'Convertidos',    color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  { key: 'perdido',      label: 'Perdidos',       color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
];

const ORIGEM_EMOJI = {
  site: '🌐', instagram: '📸', whatsapp: '💬', indicacao: '🤝',
  google_ads: '📢', b2b: '🏢', organizer: '💜',
};

const tempoNoFunil = (created) => {
  if (!created) return '';
  const dias = Math.floor((Date.now() - new Date(created).getTime()) / 86400000);
  if (dias === 0) return 'Hoje';
  if (dias === 1) return '1 dia';
  return `${dias} dias`;
};

const KanbanLeads = ({ leads = [], onMoverStatus, onClickLead }) => {
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const dragRef = useRef(null);

  const handleDragStart = (e, lead) => {
    setDragging(lead);
    dragRef.current = lead;
    e.dataTransfer.effectAllowed = 'move';
    // Hack para o ghost não ser transparente
    e.dataTransfer.setData('text/plain', lead.id);
  };

  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(colKey);
  };

  const handleDrop = (e, colKey) => {
    e.preventDefault();
    setDragOver(null);
    const lead = dragRef.current;
    if (lead && lead.status !== colKey) {
      onMoverStatus(lead, colKey);
    }
    setDragging(null);
    dragRef.current = null;
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDragOver(null);
    dragRef.current = null;
  };

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${COLUNAS.length}, 1fr)`,
      gap: '12px', minHeight: '400px',
    }}>
      {COLUNAS.map(col => {
        const colLeads = leads.filter(l => l.status === col.key);
        const isOver = dragOver === col.key;
        return (
          <div key={col.key}
            onDragOver={e => handleDragOver(e, col.key)}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => handleDrop(e, col.key)}
            style={{
              background: isOver ? `${col.color}08` : '#f9fafb',
              borderRadius: '12px',
              border: `2px ${isOver ? 'dashed' : 'solid'} ${isOver ? col.color : '#e5e7eb'}`,
              padding: '12px',
              transition: 'all 0.15s',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Header da coluna */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 10px', marginBottom: '10px',
              background: col.bg, borderRadius: '8px', border: `1px solid ${col.border}`,
            }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: col.color }}>{col.label}</span>
              <span style={{
                fontSize: '11px', fontWeight: '800', color: 'white',
                background: col.color, borderRadius: '20px', padding: '2px 8px',
                minWidth: '22px', textAlign: 'center',
              }}>
                {colLeads.length}
              </span>
            </div>

            {/* Cards */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {colLeads.length === 0 && (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: '#d1d5db', fontSize: '12px' }}>
                  {isOver ? 'Solte aqui' : 'Nenhum lead'}
                </div>
              )}
              {colLeads.map(lead => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={e => handleDragStart(e, lead)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onClickLead && onClickLead(lead)}
                  style={{
                    background: 'white', borderRadius: '10px',
                    padding: '12px', cursor: 'grab',
                    border: `1px solid ${dragging?.id === lead.id ? col.color : '#e5e7eb'}`,
                    boxShadow: dragging?.id === lead.id
                      ? `0 4px 16px ${col.color}25`
                      : '0 1px 3px rgba(0,0,0,0.04)',
                    opacity: dragging?.id === lead.id ? 0.6 : 1,
                    transition: 'box-shadow 0.15s, opacity 0.15s',
                  }}
                  onMouseEnter={e => { if (!dragging) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
                  onMouseLeave={e => { if (!dragging) e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
                >
                  {/* Nome + origem */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', lineHeight: '1.3' }}>
                      {lead.nome}
                    </span>
                    <span style={{ fontSize: '14px', flexShrink: 0 }} title={lead.origem}>
                      {ORIGEM_EMOJI[lead.origem] || '📋'}
                    </span>
                  </div>

                  {/* Info rápida */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '8px' }}>
                    {lead.telefone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#6b7280' }}>
                        <Phone size={10} /> {lead.telefone}
                      </div>
                    )}
                    {lead.cidade_origem && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#6b7280' }}>
                        <MapPin size={10} /> {lead.cidade_origem}{lead.cidade_destino ? ` → ${lead.cidade_destino}` : ''}
                      </div>
                    )}
                  </div>

                  {/* Footer: vendedor + tempo no funil */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {lead.vendedor_nome ? (
                      <span style={{ fontSize: '10px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <User size={9} /> {lead.vendedor_nome.split(' ')[0]}
                      </span>
                    ) : <span />}
                    <span style={{ fontSize: '10px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={9} /> {tempoNoFunil(lead.created_at)}
                    </span>
                  </div>

                  {/* Classificação badge */}
                  {lead.classificacao && (
                    <div style={{ marginTop: '6px' }}>
                      <span style={{
                        fontSize: '10px', padding: '2px 8px', borderRadius: '20px', fontWeight: '700',
                        background: { A: '#2563eb', AA: '#7c3aed', B2B: '#0891b2', Baixo: '#9ca3af' }[lead.classificacao] || '#6b7280',
                        color: 'white',
                      }}>
                        {lead.classificacao}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanLeads;
