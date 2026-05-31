import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Clientes from './pages/Clientes';
import Organizers from './pages/Organizers';
import Orcamentos from './pages/Orcamentos';
import CadastroComplementar from './pages/CadastroComplementar';
import Contratos from './pages/Contratos';
import OrdensServico from './pages/OrdensServico';
import Programacao from './pages/Programacao';
import Estoque from './pages/Estoque';
import GuardaMoveis from './pages/GuardaMoveis';
import Recibos from './pages/Recibos';
import Financeiro from './pages/Financeiro';
import FechamentoFinanceiro from './pages/FechamentoFinanceiro';
import FechamentoOperacional from './pages/FechamentoOperacional';
import Metas from './pages/Metas';
import Configuracoes from './pages/Configuracoes';
import Avarias from './pages/Avarias';
import PainelExecutivo from './pages/PainelExecutivo';
import Controladoria from './pages/Controladoria';
import PortalCliente from './pages/PortalCliente';
import './App.css';

const PR = ({ children }) => (
  <ProtectedRoute><Layout>{children}</Layout></ProtectedRoute>
);

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/acompanhar/:token" element={<PortalCliente />} />
          <Route path="/dashboard"              element={<PR><Dashboard /></PR>} />
          <Route path="/leads"                  element={<PR><Leads /></PR>} />
          <Route path="/clientes"               element={<PR><Clientes /></PR>} />
          <Route path="/organizers"             element={<PR><Organizers /></PR>} />
          <Route path="/orcamentos"             element={<PR><Orcamentos /></PR>} />
          <Route path="/cadastro-complementar"  element={<PR><CadastroComplementar /></PR>} />
          <Route path="/contratos"              element={<PR><Contratos /></PR>} />
          <Route path="/ordens-servico"         element={<PR><OrdensServico /></PR>} />
          <Route path="/programacao"            element={<PR><Programacao /></PR>} />
          <Route path="/estoque"                element={<PR><Estoque /></PR>} />
          <Route path="/guarda-moveis"          element={<PR><GuardaMoveis /></PR>} />
          <Route path="/recibos"                element={<PR><Recibos /></PR>} />
          <Route path="/financeiro"             element={<PR><Financeiro /></PR>} />
          <Route path="/fechamento-financeiro"   element={<PR><FechamentoFinanceiro /></PR>} />
          <Route path="/fechamento-operacional" element={<PR><FechamentoOperacional /></PR>} />
          <Route path="/metas"                  element={<PR><Metas /></PR>} />
          <Route path="/configuracoes"          element={<PR><Configuracoes /></PR>} />
          <Route path="/avarias"               element={<PR><Avarias /></PR>} />
          <Route path="/painel-executivo"      element={<PR><PainelExecutivo /></PR>} />
          <Route path="/controladoria"         element={<PR><Controladoria /></PR>} />
          <Route path="/"                       element={<Navigate to="/dashboard" replace />} />
          <Route path="*"                       element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
