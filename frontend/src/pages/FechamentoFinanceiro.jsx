import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from 'recharts';
import { api } from '../lib/api';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const pct = (v) => `${(v || 0).toFixed(1)}%`;

const FechamentoFinanceiro = () => {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [dados, setDados] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [abaGrafico, setAbaGrafico] = useState('barras');

  const carregar = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      api.getFechamento(mes, ano),
      api.getFinanceiroHistorico(),
    ]).then(([d, h]) => {
      if (d.status === 'fulfilled') setDados(d.value);
      else setError(d.reason?.message || 'Erro ao carregar');
      if (h.status === 'fulfilled') setHistorico(h.value || []);
    }).finally(() => setLoading(false));
  }, [mes, ano]);

  useEffect(() => { carregar(); }, [carregar]);

  const mesAnterior = () => {
    if (mes === 1) { setMes(12); setAno(a => a - 1); }
    else setMes(m => m - 1);
  };
  const mesSeguinte = () => {
    if (mes === 12) { setMes(1); setAno(a => a + 1); }
    else setMes(m => m + 1);
  };

  const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  if (loading) return <Spinner />;
  if (error) return <Erro msg={error} onRetry={carregar} />;

  const d = dados || {};
  const lucroPos = (d.lucro_liquido || 0) >= 0;

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 4px' }}>Fechamento Mensal</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Resumo financeiro consolidado</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={mesAnterior} style={{ padding: '7px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '7px', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', minWidth: '140px', textAlign: 'center' }}>{mesesNomes[mes - 1]} {ano}</span>
          <button onClick={mesSeguinte} style={{ padding: '7px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '7px', cursor: 'pointer' }}><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '0.5px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <TrendingUp size={16} color="#2563eb" />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Receita Total</span>
          </div>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#2563eb', margin: '0 0 8px' }}>{fmt(d.receita_total)}</p>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            <div>Mudanças: {fmt(d.receita_mudancas)}</div>
            <div>Guarda-Móveis: {fmt(d.receita_guarda_moveis)}</div>
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '0.5px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <TrendingDown size={16} color="#dc2626" />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Total Despesas</span>
          </div>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#dc2626', margin: '0 0 8px' }}>{fmt(d.total_despesas)}</p>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Lançamentos do mês</div>
        </div>
        <div style={{ background: lucroPos ? '#f0fdf4' : '#fef2f2', borderRadius: '12px', padding: '20px', border: `1px solid ${lucroPos ? '#bbf7d0' : '#fecaca'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <DollarSign size={16} color={lucroPos ? '#16a34a' : '#dc2626'} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Lucro Líquido</span>
          </div>
          <p style={{ fontSize: '28px', fontWeight: '700', color: lucroPos ? '#16a34a' : '#dc2626', margin: '0 0 8px' }}>{fmt(d.lucro_liquido)}</p>
          <div style={{ fontSize: '12px', color: lucroPos ? '#16a34a' : '#dc2626', fontWeight: '600' }}>Margem: {pct(d.margem_percentual)}</div>
        </div>
      </div>

      {/* Detalhamento */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #f3f4f6' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Indicadores do Mês</h2>
          </div>
          <div style={{ padding: '16px 20px' }}>
            {[
              ['Mudanças realizadas', d.mudancas_realizadas, ''],
              ['Boxes ocupados', d.boxes_ocupados, '/20'],
              ['Receita por mudança', d.mudancas_realizadas ? fmt((d.receita_mudancas || 0) / d.mudancas_realizadas) : '—', ''],
              ['Taxa de ocupação GM', d.boxes_ocupados ? `${Math.round(d.boxes_ocupados / 20 * 100)}%` : '0%', ''],
            ].map(([label, value, suffix]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid #f9fafb' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{label}</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>{value}{suffix}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#0f1f3d', borderRadius: '12px', padding: '24px', color: 'white' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 20px' }}>DRE Simplificado</h2>
          <div style={{ fontSize: '13px', lineHeight: '2' }}>
            {[
              ['(+) Receita Mudanças', fmt(d.receita_mudancas), false],
              ['(+) Receita Guarda-Móveis', fmt(d.receita_guarda_moveis), false],
              ['= Receita Bruta', fmt(d.receita_total), true],
              ['(-) Total de Despesas', fmt(d.total_despesas), false],
              ['= Lucro Líquido', fmt(d.lucro_liquido), true],
              ['Margem de Lucro', pct(d.margem_percentual), true],
            ].map(([label, value, bold]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: bold ? '1px solid rgba(255,255,255,0.2)' : 'none', paddingBottom: bold ? '4px' : '0', marginBottom: bold ? '4px' : '0' }}>
                <span style={{ color: bold ? 'white' : 'rgba(255,255,255,0.6)', fontWeight: bold ? '600' : '400' }}>{label}</span>
                <span style={{ color: bold ? 'white' : 'rgba(255,255,255,0.8)', fontWeight: bold ? '700' : '400' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Histórico 12 meses */}
      {historico.length > 0 && (
        <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e7eb', marginTop: 24, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart2 size={16} color="#2563eb" />
              <h2 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>Histórico — Últimos 12 meses</h2>
            </div>
            <div style={{ display: 'flex', gap: 0, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              {[{ key: 'barras', label: 'Barras' }, { key: 'linhas', label: 'Tendência' }].map(t => (
                <button key={t.key} onClick={() => setAbaGrafico(t.key)}
                  style={{ padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    background: abaGrafico === t.key ? '#1d4ed8' : 'white',
                    color: abaGrafico === t.key ? 'white' : '#6b7280' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: '20px' }}>
            {abaGrafico === 'barras' ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={historico} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="receita" name="Receita" fill="#2563eb" radius={[4,4,0,0]} />
                  <Bar dataKey="despesas" name="Despesas" fill="#dc2626" radius={[4,4,0,0]} />
                  <Bar dataKey="lucro" name="Lucro" fill="#16a34a" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={historico} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="receita" name="Receita" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="despesas" name="Despesas" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="lucro" name="Lucro" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* Tabela resumo anual */}
            <div style={{ marginTop: 20, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Mês', 'Receita', 'Despesas', 'Lucro', 'Margem', 'Mudanças'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', ':first-child': { textAlign: 'left' } }}>
                        <span style={{ textAlign: h === 'Mês' ? 'left' : 'right', display: 'block' }}>{h}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historico.map((row, i) => {
                    const margem = row.receita > 0 ? ((row.lucro / row.receita) * 100) : 0;
                    const lucroPos = row.lucro >= 0;
                    return (
                      <tr key={i} style={{ borderTop: '0.5px solid #f3f4f6', background: row.label === `${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][mes-1]}/${String(ano).slice(2)}` ? '#eff6ff' : 'transparent' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#374151' }}>{row.label}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#2563eb', fontWeight: 500 }}>{fmt(row.receita)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#dc2626' }}>{fmt(row.despesas)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: lucroPos ? '#16a34a' : '#dc2626' }}>{fmt(row.lucro)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: margem >= 30 ? '#16a34a' : margem >= 15 ? '#d97706' : '#dc2626', fontWeight: 500 }}>{margem.toFixed(1)}%</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#6b7280' }}>{row.mudancas || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #e5e7eb', background: '#f9fafb' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, fontSize: 12 }}>TOTAL ANO</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>{fmt(historico.reduce((s,r) => s+(r.receita||0), 0))}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{fmt(historico.reduce((s,r) => s+(r.despesas||0), 0))}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{fmt(historico.reduce((s,r) => s+(r.lucro||0), 0))}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6b7280' }}>—</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#6b7280' }}>{historico.reduce((s,r) => s+(r.mudancas||0), 0)}</td>
                  </tr>
                </tfoot>
              </table>
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

export default FechamentoFinanceiro;
