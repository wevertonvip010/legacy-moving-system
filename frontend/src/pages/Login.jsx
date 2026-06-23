import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Eye, EyeOff } from 'lucide-react';

// ── Fleur-de-lis SVG da marca Legacy Moving ────────────────────────────────
const FleurDeLis = ({ size = 64, color = '#F7F5F0' }) => (
  <svg width={size} height={Math.round(size * 1.15)} viewBox="0 0 100 115" fill={color} xmlns="http://www.w3.org/2000/svg">
    {/* Pétala central superior */}
    <path d="M50 4 C45 14 34 27 32 43 C30 55 37 64 50 64 C63 64 70 55 68 43 C66 27 55 14 50 4Z"/>
    {/* Pétala esquerda com caracol */}
    <path d="M33 50 C27 43 15 44 10 53 C6 61 11 70 21 71 C28 72 35 66 33 59 C31 65 25 68 19 66 C14 64 13 59 16 56 C20 52 28 54 31 60Z"/>
    {/* Pétala direita com caracol */}
    <path d="M67 50 C73 43 85 44 90 53 C94 61 89 70 79 71 C72 72 65 66 67 59 C69 65 75 68 81 66 C86 64 87 59 84 56 C80 52 72 54 69 60Z"/>
    {/* Faixa central */}
    <path d="M35 64 L65 64 L65 73 L35 73Z"/>
    {/* Haste inferior */}
    <path d="M42 73 L42 84 L34 96 L34 105 L66 105 L66 96 L58 84 L58 73Z"/>
  </svg>
);

const Login = () => {
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const formatCPF = (value) => {
    const n = value.replace(/\D/g, '').slice(0, 11);
    if (n.length <= 3) return n;
    if (n.length <= 6) return `${n.slice(0,3)}.${n.slice(3)}`;
    if (n.length <= 9) return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6)}`;
    return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6,9)}-${n.slice(9)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const cpfNum = cpf.replace(/\D/g, '');
    if (cpfNum.length !== 11) { setError('CPF deve conter 11 dígitos'); return; }
    if (!password) { setError('Informe a senha'); return; }
    setLoading(true);
    const result = await login(cpf, password);
    setLoading(false);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'CPF ou senha inválidos');
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '13px 14px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#F7F5F0',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, background 0.2s',
  };

  const inputFocus = (e) => {
    e.target.style.borderColor = '#C8A55A';
    e.target.style.background = 'rgba(200,165,90,0.08)';
  };
  const inputBlur = (e) => {
    e.target.style.borderColor = 'rgba(255,255,255,0.12)';
    e.target.style.background = 'rgba(255,255,255,0.06)';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0D1B2A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* ── Identidade Visual ── */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <FleurDeLis size={60} color="#F7F5F0" />

          <div style={{ marginTop: '14px' }}>
            <div style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: '38px',
              fontWeight: '700',
              color: '#F7F5F0',
              letterSpacing: '-0.5px',
              lineHeight: 1,
            }}>
              Legacy
            </div>
            <div style={{
              fontSize: '11px',
              fontWeight: '600',
              color: 'rgba(247,245,240,0.55)',
              letterSpacing: '6px',
              marginTop: '4px',
              textTransform: 'uppercase',
            }}>
              Moving
            </div>
            <div style={{
              width: '60px',
              height: '1.5px',
              background: '#C8A55A',
              margin: '10px auto 0',
              borderRadius: '2px',
            }} />
          </div>

          <div style={{
            marginTop: '16px',
            fontSize: '11px',
            color: 'rgba(247,245,240,0.35)',
            letterSpacing: '3px',
            textTransform: 'uppercase',
          }}>
            Sistema Operacional
          </div>
        </div>

        {/* ── Card de login ── */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '32px',
        }}>
          <h2 style={{
            fontSize: '17px',
            fontWeight: '600',
            color: '#F7F5F0',
            margin: '0 0 6px',
            textAlign: 'center',
          }}>
            Acesso ao Sistema
          </h2>
          <p style={{
            fontSize: '13px',
            color: 'rgba(247,245,240,0.4)',
            margin: '0 0 24px',
            textAlign: 'center',
          }}>
            Entre com seu CPF e senha
          </p>

          {error && (
            <div style={{
              background: 'rgba(220,38,38,0.12)',
              border: '1px solid rgba(220,38,38,0.3)',
              color: '#fca5a5',
              padding: '11px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                fontSize: '11px',
                fontWeight: '600',
                color: 'rgba(247,245,240,0.5)',
                display: 'block',
                marginBottom: '7px',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}>
                CPF
              </label>
              <input
                type="text"
                value={cpf}
                onChange={e => setCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
                style={inputStyle}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{
                fontSize: '11px',
                fontWeight: '600',
                color: 'rgba(247,245,240,0.5)',
                display: 'block',
                marginBottom: '7px',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'rgba(247,245,240,0.3)',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: loading ? 'rgba(200,165,90,0.45)' : '#C8A55A',
                color: '#0D1B2A',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.5px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => { if (!loading) e.target.style.background = '#d4b570'; }}
              onMouseLeave={e => { if (!loading) e.target.style.background = '#C8A55A'; }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p style={{
          textAlign: 'center',
          fontSize: '11px',
          color: 'rgba(247,245,240,0.18)',
          marginTop: '20px',
          letterSpacing: '0.5px',
        }}>
          © 2026 Legacy Moving · Sistema Operacional v2.0
        </p>
      </div>
    </div>
  );
};

export default Login;
