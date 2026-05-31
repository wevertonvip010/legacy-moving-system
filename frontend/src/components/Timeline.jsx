import React from 'react';
import {
  UserCheck, FileText, Truck, AlertTriangle, DollarSign,
  CheckCircle, Clock, Edit, Plus, ArrowRight, Package, Star, Send,
} from 'lucide-react';

const ICON_MAP = {
  lead_criado:       { icon: Plus,          color: '#2563eb', bg: '#eff6ff' },
  lead_classificado: { icon: Star,          color: '#7c3aed', bg: '#f5f3ff' },
  lead_convertido:   { icon: CheckCircle,   color: '#16a34a', bg: '#f0fdf4' },
  lead_perdido:      { icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2' },
  orcamento_criado:  { icon: FileText,      color: '#2563eb', bg: '#eff6ff' },
  orcamento_aprovado:{ icon: CheckCircle,   color: '#16a34a', bg: '#f0fdf4' },
  contrato_criado:   { icon: FileText,      color: '#7c3aed', bg: '#f5f3ff' },
  contrato_enviado:  { icon: Send,          color: '#0891b2', bg: '#ecfeff' },
  os_criada:         { icon: Truck,         color: '#d97706', bg: '#fffbeb' },
  os_iniciada:       { icon: ArrowRight,    color: '#2563eb', bg: '#eff6ff' },
  os_concluida:      { icon: CheckCircle,   color: '#16a34a', bg: '#f0fdf4' },
  avaria_registrada: { icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2' },
  recibo_gerado:     { icon: DollarSign,    color: '#16a34a', bg: '#f0fdf4' },
  pagamento:         { icon: DollarSign,    color: '#16a34a', bg: '#f0fdf4' },
  edicao:            { icon: Edit,          color: '#6b7280', bg: '#f9fafb' },
  estoque:           { icon: Package,       color: '#ea580c', bg: '#fff7ed' },
  default:           { icon: Clock,         color: '#6b7280', bg: '#f9fafb' },
};

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const hoje = new Date();
  const diff = Math.floor((hoje - d) / 86400000);
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (diff === 0) return `Hoje ${hora}`;
  if (diff === 1) return `Ontem ${hora}`;
  if (diff < 7) return `${diff} dias atrás ${hora}`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ` ${hora}`;
};

/**
 * Timeline de atividades
 * @param {Array} items - [{tipo, descricao, usuario, data, detalhe?}]
 * @param {string} titulo - Título da seção
 * @param {number} maxItems - Máximo de itens visíveis
 */
const Timeline = ({ items = [], titulo = 'Histórico de Atividades', maxItems = 20 }) => {
  if (!items || items.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
        <Clock size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
        <p style={{ fontSize: '13px', margin: 0 }}>Nenhuma atividade registrada</p>
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, maxItems);

  return (
    <div>
      {titulo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Clock size={15} color="#6b7280" />
          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#374151' }}>{titulo}</h4>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>({items.length})</span>
        </div>
      )}

      <div style={{ position: 'relative', paddingLeft: '28px' }}>
        {/* Linha vertical */}
        <div style={{
          position: 'absolute', left: '11px', top: '6px', bottom: '6px',
          width: '2px', background: '#e5e7eb', borderRadius: '2px',
        }} />

        {sorted.map((item, i) => {
          const cfg = ICON_MAP[item.tipo] || ICON_MAP.default;
          const Icon = cfg.icon;
          return (
            <div key={i} style={{
              position: 'relative', marginBottom: i < sorted.length - 1 ? '16px' : 0,
              paddingBottom: i < sorted.length - 1 ? '0' : 0,
            }}>
              {/* Dot / ícone */}
              <div style={{
                position: 'absolute', left: '-28px', top: '2px',
                width: '24px', height: '24px', borderRadius: '50%',
                background: cfg.bg, border: `2px solid ${cfg.color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1,
              }}>
                <Icon size={11} color={cfg.color} />
              </div>

              {/* Conteúdo */}
              <div>
                <p style={{ margin: '0 0 2px', fontSize: '13px', color: '#1a1a1a', lineHeight: '1.4' }}>
                  {item.descricao}
                </p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {item.usuario && (
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>
                      por <strong>{item.usuario}</strong>
                    </span>
                  )}
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>{fmtDate(item.data)}</span>
                </div>
                {item.detalhe && (
                  <p style={{
                    margin: '4px 0 0', fontSize: '12px', color: '#6b7280',
                    background: '#f9fafb', padding: '6px 10px', borderRadius: '6px',
                    borderLeft: `3px solid ${cfg.color}40`,
                  }}>
                    {item.detalhe}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Timeline;
