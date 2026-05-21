import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Eye, EyeOff } from 'lucide-react';

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

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ background: '#0f1f3d', borderRadius: '16px', padding: '32px 24px', textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'white', letterSpacing: '2px', marginBottom: '4px' }}>LEGACY MOVING</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '3px' }}>SISTEMA OPERACIONAL</div>
        </div>

        {/* Form */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 6px', textAlign: 'center' }}>Acesso ao Sistema</h2>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 24px', textAlign: 'center' }}>Entre com seu CPF e senha</p>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>CPF</label>
              <input
                type="text"
                value={cpf}
                onChange={e => setCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#0f1f3d'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  style={{ width: '100%', padding: '12px 40px 12px 14px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                  onFocus={e => e.target.style.borderColor = '#0f1f3d'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '13px', background: loading ? '#6b7280' : '#0f1f3d', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '16px' }}>
          © 2025 Legacy Moving — Sistema Operacional v2.0
        </p>
      </div>
    </div>
  );
};

export default Login;
