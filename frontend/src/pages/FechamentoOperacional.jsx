import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DollarSign, TrendingUp, TrendingDown, AlertCircle, CheckCircle,
  ChevronDown, ChevronRight, Save, Award, X, Eye, Lock
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const inp = {
  width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb',
  borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
};

const CATEGORIAS_CUSTO = [
  { key: 'custo_equipe',        label: 'Mão de obra (equipe)',  icon: '👷' },
  { key: 'custo_caminhoes',     label: 'Veículos / caminhões',  icon: '🚛' },
  { key: 'custo_materiais',     label: 'Materiais e caixas',    icon: '📦' },
  { key: 'custo_pedagio',       label: 'Pedágio',               icon: '🛣️' },
  { key: 'custo_alimentacao',   label: 'Alimentação',           icon: '🍽️' },
  { key: 'custo_hospedagem',    label: 'Hospedagem',            icon: '🏨' },
  { key: 'custo_freelancers',   label: 'Freelancers',           icon: '🤝' },
  { key: 'custo_outros',        label: 'Outros',                icon: '📋' },
];

export default function FechamentoOperacional() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [loading, setLoading] = useState(true);
  const [fechamentos, setFechamentos] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [selecionado, setSelecionado] = useState(null); // os selecionada
  const [fechamento, setFechamento] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [erro, setErro] = useState(null);
  const [view, setView] = useState('lista'); // lista | editar

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    setLoading(true);
    try {
      const [os, orgs] = await Promise.all([
        api.getOS({}),
        api.getOrganizers(),
      ]);
      setOrdens(os);
      setOrganizers(orgs);
      // Carrega fechamentos existentes
      try {
        const f = await api.getFechamentos();
        setFechamentos(f);
      } catch (_) { setFechamentos([]); }

      // Auto-abre OS se vier com ?osId=X da página de Ordens de Serviço
      const osId = searchParams.get('osId');
      if (osId) {
        const osAlvo = os.find(o => String(o.id) === String(osId));
        if (osAlvo) {
          const fech = await api.getOSFechamento(osAlvo.id);
          setSelecionado(osAlvo);
          setFechamento(fech);
          setView('editar');
        }
      }
    } catch (e) { setErro(e.message); }
    finally { setLoading(false); }
  };

  const abrirFechamento = async (os) => {
    setSelecionado(os);
    setSalvando(false);
    setErro(null);
    try {
      const f = await api.getOSFechamento(os.id);
      setFechamento(f);
      setView('editar');
    } catch (e) { setErro(e.message); }
  };

  const atualizar = (key, val) => {
    setFechamento(prev => {
      const next = { ...prev, [key]: parseFloat(val) || 0 };
      // Recalcula em tempo real
      const custo = CATEGORIAS_CUSTO.reduce((s, c) => s + (parseFloat(next[c.key]) || 0), 0);
      const lucro = (parseFloat(next.receita_bruta) || 0) - custo;
      const margem = next.receita_bruta > 0 ? (lucro / next.receita_bruta * 100) : 0;
      const comissao = Math.max(0, lucro) * ((parseFloat(next.percentual_comissao) || 10) / 100);
      return { ...next, lucro_liquido: lucro, margem_percentual: margem, comissao_organizer: comissao, custo_total: custo };
    });
  };

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      const payload = { ...fechamento };
      delete payload.lucro_liquido;
      delete payload.margem_percentual;
      delete payload.comissao_organizer;
      delete payload.custo_total;
      await api.salvarFechamento(selecionado.id, payload);
      const f = await api.getOSFechamento(selecionado.id);
      setFechamento(f);
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const reabrir = async () => {
    if (!isAdmin) {
      alert('Apenas administradores podem reabrir fechamentos finalizados.');
      return;
    }
    if (!confirm('Reabrir este fechamento para edição? Ele voltará para o status de rascunho.')) return;
    setSalvando(true);
    try {
      await api.salvarFechamento(selecionado.id, { ...fechamento, status: 'rascunho' });
      const f = await api.getOSFechamento(selecionado.id);
      setFechamento(f);
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const finalizar = async () => {
    if (!confirm('Finalizar fechamento? Isso calculará a comissão da organizer.')) return;
    setFinalizando(true);
    try {
      await api.salvarFechamento(selecionado.id, fechamento);
      const f = await api.finalizarFechamento(selecionado.id);
      setFechamento(f);
      carregar();
    } catch (e) { setErro(e.message); }
    finally { setFinalizando(false); }
  };

  // Verifica se já tem fechamento
  const temFechamento = (osId) => fechamentos.find(f => f.os_id === osId);

  if (loading) return <Spinner />;

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 4px' }}>
            Fechamento Operacional
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            P&L por mudança · Cálculo de comissão das organizers
          </p>
        </div>
        {view === 'editar' && (
          <button onClick={() => setView('lista')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
            <X size={14} /> Voltar
          </button>
        )}
      </div>

      {/* Cards resumo global */}
      {view === 'lista' && (() => {
        const finalizados = fechamentos.filter(f => f.status === 'finalizado');
        const receitaTotal = finalizados.reduce((s, f) => s + (f.receita_bruta || 0), 0);
        const lucroTotal = finalizados.reduce((s, f) => s + (f.lucro_liquido || 0), 0);
        const comissaoTotal = finalizados.reduce((s, f) => s + (f.comissao_organizer || 0), 0);
        const margemMedia = finalizados.length > 0
          ? finalizados.reduce((s, f) => s + (f.margem_percentual || 0), 0) / finalizados.length
          : 0;
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Receita bruta total', value: fmt(receitaTotal), color: '#3b82f6', icon: DollarSign },
              { label: 'Lucro líquido total', value: fmt(lucroTotal), color: '#10b981', icon: TrendingUp },
              { label: 'Margem média', value: `${margemMedia.toFixed(1)}%`, color: '#f59e0b', icon: TrendingUp },
              { label: 'Comissão a pagar', value: fmt(comissaoTotal), color: '#ec4899', icon: Award },
            ].map((m, i) => (
              <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '18px', border: '0.5px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 6px', fontWeight: '500' }}>{m.label}</p>
                    <p style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>{m.value}</p>
                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: '2px 0 0' }}>{finalizados.length} fechados</p>
                  </div>
                  <div style={{ background: m.color + '15', borderRadius: '10px', padding: '10px' }}>
                    <m.icon size={18} color={m.color} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* LISTA DE OS CONCLUÍDAS */}
      {view === 'lista' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>
              Ordens de Serviço — Fechamento Operacional
            </h2>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>{ordens.length} ordens · {fechamentos.length} com fechamento</span>
          </div>

          {ordens.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
              <CheckCircle size={32} style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: '14px' }}>Nenhuma OS concluída aguardando fechamento</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>Quando uma OS for concluída, ela aparecerá aqui.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['OS', 'Cliente', 'Data', 'Valor OS', 'Status Fechamento', 'Lucro', 'Ação'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ordens.map(os => {
                  const fech = temFechamento(os.id);
                  return (
                    <tr key={os.id} style={{ borderTop: '0.5px solid #f3f4f6' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 16px', fontWeight: '600', fontSize: '13px', color: '#0f1f3d' }}>{os.numero}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{os.cliente}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#6b7280' }}>
                        {os.data_mudanca ? new Date(os.data_mudanca).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '500' }}>
                        {fmt(os.valor_total)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {fech ? (
                          <span style={{
                            fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontWeight: '500',
                            background: fech.status === 'finalizado' ? '#f0fdf4' : '#fffbeb',
                            color: fech.status === 'finalizado' ? '#16a34a' : '#92400e',
                          }}>
                            {fech.status === 'finalizado' ? '✓ Finalizado' : '○ Rascunho'}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: '#f3f4f6', color: '#6b7280' }}>
                            Pendente
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600' }}>
                        {fech ? (
                          <span style={{ color: fech.lucro_liquido >= 0 ? '#10b981' : '#dc2626' }}>
                            {fmt(fech.lucro_liquido)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={() => abrirFechamento(os)}
                          style={{ padding: '6px 12px', background: fech?.status === 'finalizado' ? '#f3f4f6' : '#0f1f3d', color: fech?.status === 'finalizado' ? '#374151' : 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
                          {fech?.status === 'finalizado' ? 'Ver' : 'Abrir'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* EDITOR DE FECHAMENTO */}
      {view === 'editar' && selecionado && fechamento && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
          {/* Coluna principal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Cabeçalho da OS */}
            <div style={{ background: '#0f1f3d', borderRadius: '12px', padding: '20px', color: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>Ordem de Serviço</p>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>{selecionado.numero}</h2>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>{selecionado.cliente}</p>
                </div>
                {fechamento.status === 'finalizado' && (
                  <span style={{ background: '#22c55e', color: 'white', fontSize: '12px', padding: '4px 10px', borderRadius: '20px', fontWeight: '600' }}>
                    ✓ Finalizado
                  </span>
                )}
              </div>
            </div>

            {/* Receita bruta */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '0.5px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={16} color="#10b981" /> Receita Bruta
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Valor total cobrado (R$)</label>
                  <input type="number" step="0.01" value={fechamento.receita_bruta || ''}
                    onChange={e => atualizar('receita_bruta', e.target.value)}
                    disabled={false}
                    style={{ ...inp, fontSize: '16px', fontWeight: '600', color: '#10b981' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Organizer vinculada</label>
                  <select value={fechamento.organizer_id || ''}
                    onChange={e => setFechamento(f => ({ ...f, organizer_id: e.target.value || null }))}
                    disabled={false}
                    style={inp}>
                    <option value="">Nenhuma</option>
                    {organizers.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Custos */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '0.5px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingDown size={16} color="#ef4444" /> Custos Operacionais
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {CATEGORIAS_CUSTO.map(({ key, label, icon }) => (
                  <div key={key}>
                    <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                      {icon} {label} (R$)
                    </label>
                    <input type="number" step="0.01" value={fechamento[key] || ''}
                      onChange={e => atualizar(key, e.target.value)}
                      placeholder="0,00"
                      disabled={false}
                      style={inp} />
                  </div>
                ))}
              </div>
            </div>

            {/* Comissão */}
            {fechamento.organizer_id && (
              <div style={{ background: '#fdf4ff', borderRadius: '12px', padding: '20px', border: '1px solid #e9d5ff' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#7c3aed', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={16} /> Comissão Organizer
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Percentual (%)</label>
                    <input type="number" step="0.1" value={fechamento.percentual_comissao || 10}
                      onChange={e => atualizar('percentual_comissao', e.target.value)}
                      disabled={false}
                      style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Valor calculado</label>
                    <div style={{ padding: '8px 12px', background: 'white', borderRadius: '8px', border: '1px solid #c4b5fd', fontSize: '16px', fontWeight: '700', color: '#7c3aed' }}>
                      {fmt(fechamento.comissao_organizer)}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: '#7c3aed', margin: '8px 0 0', opacity: 0.8 }}>
                  * Calculado sobre o lucro líquido: {fmt(Math.max(0, fechamento.lucro_liquido))} × {fechamento.percentual_comissao || 10}%
                </p>
              </div>
            )}

            {/* Observações */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '0.5px solid #e5e7eb' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '8px' }}>Observações do fechamento</label>
              <textarea value={fechamento.observacoes || ''} rows={3}
                onChange={e => setFechamento(f => ({ ...f, observacoes: e.target.value }))}
                disabled={false}
                style={{ ...inp, resize: 'vertical', height: '80px' }}
                placeholder="Notas sobre esta operação..." />
            </div>

            {erro && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <AlertCircle size={14} /> {erro}
              </div>
            )}

            {/* Botões de ação */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={salvar} disabled={salvando}
                style={{ flex: 1, minWidth: '140px', padding: '12px', background: '#374151', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Save size={16} /> {salvando ? 'Salvando...' : 'Salvar'}
              </button>
              {fechamento.status === 'finalizado' ? (
                <button onClick={reabrir} disabled={salvando}
                  title={!isAdmin ? 'Apenas administradores podem reabrir' : ''}
                  style={{ flex: 1, minWidth: '140px', padding: '12px', background: isAdmin ? '#f59e0b' : '#9ca3af', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: isAdmin ? 'pointer' : 'not-allowed', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {isAdmin ? '↺' : <Lock size={15} />} Reabrir fechamento
                </button>
              ) : (
                <button onClick={finalizar} disabled={finalizando || !fechamento.receita_bruta}
                  style={{ flex: 1, minWidth: '140px', padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: !fechamento.receita_bruta ? 0.5 : 1 }}>
                  <CheckCircle size={16} /> {finalizando ? 'Finalizando...' : 'Finalizar'}
                </button>
              )}
            </div>
          </div>

          {/* Coluna lateral — Resultado P&L */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '0.5px solid #e5e7eb', position: 'sticky', top: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 16px' }}>Resultado da Operação</h3>

              <Linha label="Receita Bruta" value={fmt(fechamento.receita_bruta)} bold green />
              <div style={{ height: '1px', background: '#f3f4f6', margin: '12px 0' }} />

              {CATEGORIAS_CUSTO.map(({ key, label, icon }) => (
                (fechamento[key] > 0) && (
                  <Linha key={key} label={`${icon} ${label}`} value={`- ${fmt(fechamento[key])}`} small red />
                )
              ))}

              <div style={{ height: '1px', background: '#e5e7eb', margin: '12px 0' }} />
              <Linha label="Custo Total" value={`- ${fmt(fechamento.custo_total)}`} red />
              <div style={{ height: '1px', background: '#0f1f3d', margin: '12px 0' }} />

              {/* Lucro líquido */}
              <div style={{ background: fechamento.lucro_liquido >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: '8px', padding: '14px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: fechamento.lucro_liquido >= 0 ? '#15803d' : '#dc2626', fontWeight: '600', marginBottom: '4px' }}>
                  {fechamento.lucro_liquido >= 0 ? '↑ LUCRO LÍQUIDO' : '↓ PREJUÍZO'}
                </div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: fechamento.lucro_liquido >= 0 ? '#16a34a' : '#dc2626' }}>
                  {fmt(fechamento.lucro_liquido)}
                </div>
                <div style={{ fontSize: '12px', color: fechamento.lucro_liquido >= 0 ? '#15803d' : '#dc2626', marginTop: '4px' }}>
                  Margem: {(fechamento.margem_percentual || 0).toFixed(1)}%
                </div>
              </div>

              {/* Comissão */}
              {fechamento.organizer_id && (
                <div style={{ background: '#fdf4ff', borderRadius: '8px', padding: '12px', border: '1px solid #e9d5ff' }}>
                  <div style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '600', marginBottom: '4px' }}>
                    💜 COMISSÃO ORGANIZER ({fechamento.percentual_comissao || 10}%)
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#7c3aed' }}>
                    {fmt(fechamento.comissao_organizer)}
                  </div>
                </div>
              )}

              {/* Margem visual */}
              {fechamento.receita_bruta > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                    <span>Margem</span>
                    <span>{(fechamento.margem_percentual || 0).toFixed(1)}%</span>
                  </div>
                  <div style={{ height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '4px',
                      width: `${Math.min(100, Math.max(0, fechamento.margem_percentual || 0))}%`,
                      background: fechamento.margem_percentual >= 30 ? '#10b981' : fechamento.margem_percentual >= 15 ? '#f59e0b' : '#ef4444',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                    <span>0%</span><span>15%</span><span>30%</span><span>50%+</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Linha = ({ label, value, bold, small, green, red }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
    <span style={{ fontSize: small ? '12px' : '13px', color: '#6b7280' }}>{label}</span>
    <span style={{
      fontSize: small ? '12px' : '13px',
      fontWeight: bold ? '700' : '500',
      color: green ? '#10b981' : red ? '#ef4444' : '#1a1a1a'
    }}>{value}</span>
  </div>
);

const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
    <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTop: '3px solid #0f1f3d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);
