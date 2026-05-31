import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import AssistenteMirante from '../components/AssistenteMirante';
import { useActivityTracker } from '../hooks/useActivityTracker';

const Layout = ({ children }) => {
  useActivityTracker();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fecha sidebar ao navegar (mobile)
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [children, isMobile]);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '220px 1fr',
      minHeight: '100vh',
      background: '#f8fafc',
    }}>
      {/* Mobile: botão de menu fixo */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            position: 'fixed', top: '12px', left: '12px', zIndex: 50,
            width: '40px', height: '40px',
            background: '#0f1f3d', color: 'white',
            border: 'none', borderRadius: '10px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <Menu size={20} />
        </button>
      )}

      {/* Sidebar */}
      {isMobile ? (
        <>
          {/* Overlay */}
          {sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 998,
                background: 'rgba(0,0,0,0.5)',
                animation: 'fadeIn 0.2s ease',
              }}
            />
          )}
          {/* Sidebar deslizante */}
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            width: '260px', zIndex: 999,
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.25s ease',
          }}>
            <Sidebar />
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                position: 'absolute', top: '12px', right: '-44px',
                width: '36px', height: '36px',
                background: '#0f1f3d', color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                display: sidebarOpen ? 'flex' : 'none',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </>
      ) : (
        <Sidebar />
      )}

      {/* Conteúdo principal */}
      <div style={{
        minHeight: '100vh', overflow: 'auto',
        background: '#f8fafc',
        paddingTop: isMobile ? '56px' : 0,
      }}>
        {children}
      </div>

      {/* IA Mirante */}
      <AssistenteMirante />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Layout;
