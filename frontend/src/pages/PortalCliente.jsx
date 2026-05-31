import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Truck, CheckCircle, Clock, FileText, Phone, MapPin, Calendar, Star, Send } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

const STATUS_INFO = {
  agendada:      { label: 'Agendada',       color: '#d97706', bg: '#fffbeb', icon: Calendar,    step: 1 },
  em_andamento:  { label: 'Em Andamento',   color: '#2563eb', bg: '#eff6ff', icon: Truck,       step: 2 },
  concluida:     { label: 'Concluída',      color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle, step: 3 },
  finalizada:    { label: 'Finalizada',     color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle, step: 3 },
};

const PortalCliente = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nps, setNps] = useState(null);
  const [npsComentario, setNpsComentario] = useState('');
  const [npsSent, setNpsSent] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/portal/${token}`)
      .then(async r => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Link inválido ou expirado' : 'Erro ao carregar');
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const enviarNPS = async () => {
    if (nps === null) return;
    try {
      await fetch(`${API}/api/portal/${token}/nps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nota: nps, comentario: npsComentario }),
      });
      setNpsSent(true);
    } catch { /* silent */ }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #e5e7eb', borderTop: '4px solid #0f1f3d', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Carregando informações...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ margin: '0 0 8px', fontSize: '18px', color: '#1a1a1a' }}>Acesso não disponível</h2>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>{error}</p>
      </div>
    </div>
  );

  const os = data?.os;
  const status = STATUS_INFO[os?.status] || STATUS_INFO.agendada;
  const StatusIcon = status.icon;
  const step = status.step;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Header */}
      <div style={{ background: '#0f1f3d', color: 'white', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '1px' }}>LEGACY MOVING</div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', letterSpacing: '3px', marginTop: '2px' }}>ACOMPANHE SUA MUDANÇA</div>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Card de status */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: status.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <StatusIcon size={22} color={status.color} />
            </div>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: '12px', color: '#6b7280' }}>Status da mudança</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: status.color }}>{status.label}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ flex: 1, height: '6px', borderRadius: '3px', background: s <= step ? status.color : '#e5e7eb', transition: 'background 0.3s' }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9ca3af' }}>
            <span>Agendada</span>
            <span>Em andamento</span>
            <span>Concluída</span>
          </div>
        </div>

        {/* Detalhes */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '700', color: '#374151' }}>Detalhes do Serviço</h3>

          {[
            { icon: FileText, label: 'Ordem de Serviço', value: os?.numero },
            { icon: Calendar, label: 'Data da Mudança', value: fmtDate(os?.data_mudanca) },
            { icon: MapPin,   label: 'Origem', value: os?.endereco_origem },
            { icon: MapPin,   label: 'Destino', value: os?.endereco_destino },
            { icon: Truck,    label: 'Equipe', value: os?.equipe },
            { icon: Truck,    label: 'Veículo', value: os?.veiculo },
          ].filter(r => r.value).map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: i < 5 ? '1px solid #f3f4f6' : 'none' }}>
              <r.icon size={15} color="#6b7280" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>{r.label}</p>
                <p style={{ margin: '2px 0 0', fontSize: '14px', color: '#1a1a1a', fontWeight: '500' }}>{r.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Contato */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '700', color: '#374151' }}>Precisa de ajuda?</h3>
          <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '12px', background: '#25d366', color: 'white',
              borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: '600',
            }}>
            <Phone size={16} /> Falar com a Legacy Moving
          </a>
        </div>

        {/* NPS — aparece apenas se concluída */}
        {(os?.status === 'concluida' || os?.status === 'finalizada') && !npsSent && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '700', color: '#374151' }}>Como foi sua experiência?</h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#6b7280' }}>De 0 a 10, quanto você recomendaria a Legacy Moving?</p>

            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
              {Array.from({ length: 11 }, (_, i) => (
                <button key={i} onClick={() => setNps(i)}
                  style={{
                    width: '36px', height: '36px', borderRadius: '8px',
                    border: nps === i ? '2px solid #2563eb' : '1px solid #e5e7eb',
                    background: nps === i ? '#eff6ff' : 'white',
                    color: nps === i ? '#2563eb' : '#374151',
                    fontWeight: nps === i ? '700' : '400',
                    fontSize: '14px', cursor: 'pointer',
                  }}>
                  {i}
                </button>
              ))}
            </div>

            <textarea
              value={npsComentario}
              onChange={e => setNpsComentario(e.target.value)}
              placeholder="Comentário (opcional)"
              rows={2}
              style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', outline: 'none', marginBottom: '12px' }}
            />

            <button onClick={enviarNPS} disabled={nps === null}
              style={{
                width: '100%', padding: '12px', background: nps === null ? '#9ca3af' : '#0f1f3d',
                color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px',
                fontWeight: '600', cursor: nps === null ? 'not-allowed' : 'pointer',
              }}>
              Enviar Avaliação
            </button>
          </div>
        )}

        {npsSent && (
          <div style={{ background: '#f0fdf4', borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '16px' }}>
            <CheckCircle size={32} color="#16a34a" style={{ margin: '0 auto 8px' }} />
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#15803d' }}>Obrigado pela avaliação!</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#16a34a' }}>Sua opinião é muito importante para nós.</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '16px 0', color: '#9ca3af', fontSize: '11px' }}>
          Legacy Moving © {new Date().getFullYear()} — Todos os direitos reservados
        </div>
      </div>
    </div>
  );
};

export default PortalCliente;
