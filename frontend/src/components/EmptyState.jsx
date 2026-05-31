import React from 'react';
import {
  Users, FileText, Truck, Package, DollarSign,
  Target, AlertTriangle, Archive, Receipt, Calendar, BarChart2,
} from 'lucide-react';

const PRESETS = {
  leads:      { icon: Users,          color: '#2563eb', title: 'Nenhum lead cadastrado',       sub: 'Comece adicionando seu primeiro lead para iniciar o funil comercial.', action: '+ Novo Lead' },
  clientes:   { icon: Users,          color: '#7c3aed', title: 'Nenhum cliente encontrado',    sub: 'Clientes são criados automaticamente quando um lead é convertido.', action: null },
  orcamentos: { icon: FileText,       color: '#2563eb', title: 'Nenhum orçamento ainda',       sub: 'Crie orçamentos a partir dos leads classificados ou diretamente.', action: '+ Novo Orçamento' },
  contratos:  { icon: FileText,       color: '#7c3aed', title: 'Nenhum contrato registrado',   sub: 'Contratos são gerados ao completar o cadastro complementar.', action: null },
  os:         { icon: Truck,          color: '#d97706', title: 'Nenhuma OS cadastrada',         sub: 'Ordens de serviço nascem automaticamente dos contratos assinados.', action: '+ Nova OS' },
  programacao:{ icon: Calendar,       color: '#0891b2', title: 'Agenda vazia',                  sub: 'Sincronize as OS ou adicione alocações manuais para ver a programação.', action: 'Sincronizar OS' },
  estoque:    { icon: Package,        color: '#ea580c', title: 'Estoque vazio',                 sub: 'Cadastre os materiais utilizados nas operações de mudança.', action: '+ Nova Posição' },
  recibos:    { icon: Receipt,        color: '#16a34a', title: 'Nenhum recibo gerado',          sub: 'Recibos são criados automaticamente ao concluir uma OS.', action: '+ Gerar Recibo' },
  financeiro: { icon: DollarSign,     color: '#2563eb', title: 'Sem dados financeiros',         sub: 'Lançamentos aparecem conforme recibos e despesas são registrados.', action: null },
  metas:      { icon: Target,         color: '#7c3aed', title: 'Nenhuma meta cadastrada',       sub: 'Defina metas de receita, mudanças ou conversão para acompanhar a performance.', action: '+ Nova Meta' },
  avarias:    { icon: AlertTriangle,  color: '#dc2626', title: 'Nenhuma avaria registrada',     sub: 'Ótimo! Isso significa operações sem intercorrências.', action: null },
  boxes:      { icon: Archive,        color: '#6b7280', title: 'Nenhum box cadastrado',         sub: 'Cadastre os boxes do guarda-móveis para controlar ocupação.', action: '+ Novo Box' },
  ranking:    { icon: BarChart2,      color: '#d97706', title: 'Sem dados de ranking',          sub: 'O ranking será populado conforme vendedores e organizers atuam.', action: null },
  generic:    { icon: FileText,       color: '#6b7280', title: 'Nenhum registro encontrado',    sub: 'Não há dados para exibir no momento.', action: null },
};

/**
 * Empty State profissional
 * @param {string} tipo - Chave do preset (leads, clientes, os, etc.)
 * @param {function} onAction - Callback quando clicar no botão de ação
 * @param {string} customTitle - Título customizado (sobrescreve preset)
 * @param {string} customSub - Subtítulo customizado
 */
const EmptyState = ({ tipo = 'generic', onAction, customTitle, customSub }) => {
  const preset = PRESETS[tipo] || PRESETS.generic;
  const Icon = preset.icon;
  const title = customTitle || preset.title;
  const sub = customSub || preset.sub;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '48px 24px', textAlign: 'center',
    }}>
      {/* Ilustração circular */}
      <div style={{
        width: '80px', height: '80px', borderRadius: '50%',
        background: `${preset.color}10`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '20px',
        position: 'relative',
      }}>
        <Icon size={32} color={preset.color} strokeWidth={1.5} />
        {/* Anéis decorativos */}
        <div style={{
          position: 'absolute', inset: '-8px', borderRadius: '50%',
          border: `2px dashed ${preset.color}20`,
        }} />
      </div>

      <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '700', color: '#1a1a1a' }}>
        {title}
      </h3>
      <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#6b7280', maxWidth: '360px', lineHeight: '1.5' }}>
        {sub}
      </p>

      {preset.action && onAction && (
        <button onClick={onAction} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 20px', background: preset.color, color: 'white',
          border: 'none', borderRadius: '10px', fontSize: '13px',
          fontWeight: '600', cursor: 'pointer',
          boxShadow: `0 4px 12px ${preset.color}30`,
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 16px ${preset.color}40`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 12px ${preset.color}30`; }}
        >
          {preset.action}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
