import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

// ── Context ─────────────────────────────────────────────────────────────────
const ToastContext = createContext();

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return ctx;
};

// ── Tipos de toast ──────────────────────────────────────────────────────────
const TYPES = {
  success: { icon: CheckCircle, bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', barColor: '#22c55e' },
  error:   { icon: XCircle,     bg: '#fef2f2', border: '#fecaca', color: '#dc2626', barColor: '#ef4444' },
  warning: { icon: AlertTriangle, bg: '#fffbeb', border: '#fde68a', color: '#92400e', barColor: '#f59e0b' },
  info:    { icon: Info,        bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', barColor: '#3b82f6' },
};

// ── Toast individual ────────────────────────────────────────────────────────
const ToastItem = ({ id, type = 'info', title, message, duration = 4000, onRemove }) => {
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const t = TYPES[type] || TYPES.info;
  const Icon = t.icon;

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setExiting(true);
        setTimeout(() => onRemove(id), 300);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [id, duration, onRemove]);

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => onRemove(id), 300);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      padding: '14px 16px', borderRadius: '12px',
      background: t.bg, border: `1px solid ${t.border}`,
      boxShadow: '0 8px 25px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
      minWidth: '320px', maxWidth: '420px',
      animation: exiting ? 'toastOut 0.3s ease forwards' : 'toastIn 0.3s ease',
      position: 'relative', overflow: 'hidden',
      cursor: 'pointer',
    }} onClick={dismiss}>
      <Icon size={18} color={t.color} style={{ flexShrink: 0, marginTop: '1px' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '700', color: t.color }}>{title}</p>
        )}
        <p style={{ margin: 0, fontSize: '13px', color: t.color, opacity: 0.85, lineHeight: '1.4' }}>{message}</p>
      </div>
      <button onClick={e => { e.stopPropagation(); dismiss(); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.color, opacity: 0.5, padding: '2px', flexShrink: 0 }}>
        <X size={14} />
      </button>
      {/* Progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px',
        background: `${t.barColor}30`,
      }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: t.barColor, transition: 'width 0.05s linear',
          borderRadius: '0 2px 2px 0',
        }} />
      </div>
    </div>
  );
};

// ── Provider ────────────────────────────────────────────────────────────────
let _toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((opts) => {
    const id = ++_toastId;
    const toast = typeof opts === 'string'
      ? { id, type: 'info', message: opts }
      : { id, ...opts };
    setToasts(prev => [...prev, toast]);
    return id;
  }, []);

  const toast = useCallback((message, type = 'info') => addToast({ type, message }), [addToast]);
  toast.success = (msg, title) => addToast({ type: 'success', message: msg, title });
  toast.error   = (msg, title) => addToast({ type: 'error',   message: msg, title: title || 'Erro' });
  toast.warning = (msg, title) => addToast({ type: 'warning', message: msg, title });
  toast.info    = (msg, title) => addToast({ type: 'info',    message: msg, title });

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Container fixo */}
      <div style={{
        position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: '10px',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem {...t} onRemove={removeToast} />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(40px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to   { opacity: 0; transform: translateX(40px) scale(0.95); }
        }
      `}</style>
    </ToastContext.Provider>
  );
};
