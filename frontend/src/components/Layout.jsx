import React from 'react';
import Sidebar from '../components/Sidebar';
import AssistenteMirante from '../components/AssistenteMirante';
import { useActivityTracker } from '../hooks/useActivityTracker';

const Layout = ({ children }) => {
  useActivityTracker();
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '220px 1fr',
      minHeight: '100vh',
      background: '#f8fafc',
    }}>
      {/* Sidebar fixa na primeira coluna */}
      <Sidebar />

      {/* Área de conteúdo — segunda coluna, rolagem interna */}
      <div style={{
        minHeight: '100vh',
        overflow: 'auto',
        background: '#f8fafc',
      }}>
        {children}
      </div>

      {/* IA Mirante — posição fixed, não afeta o grid */}
      <AssistenteMirante />
    </div>
  );
};

export default Layout;
