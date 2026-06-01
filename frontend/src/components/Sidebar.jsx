import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, FileCheck, Truck, Archive,
  DollarSign, Package, Receipt, Target, Zap, Settings, Heart,
  UserCheck, ClipboardList, BarChart2, AlertTriangle, LogOut, Star, Eye,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePermissoes } from '../hooks/usePermissoes';
import BuscaGlobal from './BuscaGlobal';
import Notificacoes from './Notificacoes';

const menuGroups = [
  {
    label: 'Executivo',
    items: [
      { id: 'painel-executivo',       label: 'Painel Executivo',     icon: Star,            path: '/painel-executivo', modulo: 'dashboard' },
      { id: 'dashboard',              label: 'Dashboard',            icon: LayoutDashboard, path: '/dashboard',         modulo: 'dashboard' },
    ]
  },
  {
    label: 'CRM Comercial',
    items: [
      { id: 'leads',                  label: 'Leads',                icon: UserCheck,       path: '/leads',             modulo: 'leads' },
      { id: 'clientes',               label: 'Clientes',             icon: Users,           path: '/clientes',          modulo: 'clientes' },
      { id: 'organizers',             label: 'Organizers',           icon: Heart,           path: '/organizers',        modulo: 'organizers' },
    ]
  },
  {
    label: 'Operação',
    items: [
      { id: 'orcamentos',             label: 'Orçamentos',           icon: FileText,        path: '/orcamentos',        modulo: 'orcamentos' },
      { id: 'cadastro-complementar',  label: 'Cadastro Compl.',      icon: ClipboardList,   path: '/cadastro-complementar', modulo: 'contratos' },
      { id: 'contratos',              label: 'Contratos',            icon: FileCheck,       path: '/contratos',         modulo: 'contratos' },
      { id: 'ordens-servico',         label: 'Ordens de Serviço',    icon: Truck,           path: '/ordens-servico',    modulo: 'os' },
      { id: 'programacao',            label: 'Programação',          icon: Zap,             path: '/programacao',       modulo: 'programacao' },
      { id: 'funcionarios',           label: 'Equipe',               icon: UserCheck,       path: '/funcionarios',      modulo: 'programacao' },
    ]
  },
  {
    label: 'Recursos',
    items: [
      { id: 'estoque',                label: 'Estoque',              icon: Package,         path: '/estoque',           modulo: 'estoque' },
      { id: 'guarda-moveis',          label: 'Guarda-Móveis',        icon: Archive,         path: '/guarda-moveis',     modulo: 'guarda_moveis' },
      { id: 'avarias',                label: 'Avarias',              icon: AlertTriangle,   path: '/avarias', modulo: 'avarias' },
    ]
  },
  {
    label: 'Financeiro',
    items: [
      { id: 'recibos',                    label: 'Recibos',               icon: Receipt,     path: '/recibos',               modulo: 'recibos' },
      { id: 'financeiro',                 label: 'Financeiro',            icon: DollarSign,  path: '/financeiro',            modulo: 'financeiro' },
      { id: 'fechamento-operacional',     label: 'Fechamento Operac.',    icon: BarChart2,   path: '/fechamento-operacional', modulo: 'fechamento' },
      { id: 'fechamento',                 label: 'Fechamento Mensal',     icon: Receipt,     path: '/fechamento-financeiro', modulo: 'fechamento' },
      { id: 'metas',                      label: 'Painel Comercial',      icon: Target,      path: '/metas',                 modulo: 'metas' },
    ]
  },
  {
    label: 'Sistema',
    items: [
      { id: 'controladoria',          label: 'Controladoria',        icon: Eye,             path: '/controladoria',     modulo: 'controladoria' },
      { id: 'configuracoes',          label: 'Configurações',        icon: Settings,        path: '/configuracoes',     modulo: 'configuracoes' },
    ]
  }
];

const ROLE_LABEL = {
  admin: 'Administrador',
  vendedor: 'Vendedor',
  operacional: 'Operacional',
  financeiro: 'Financeiro',
};

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { pode, isAdmin } = usePermissoes();

  const handleLogout = () => {
    if (confirm('Deseja sair do sistema?')) {
      logout();
      navigate('/login');
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div style={{
      background: '#0f1f3d', color: 'white', width: '220px', minHeight: '100vh',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '0.5px', color: '#ffffff' }}>
            LEGACY
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '3px', marginTop: '1px' }}>
            MOVING
          </div>
          <div style={{ marginTop: '8px', padding: '3px 10px', background: 'rgba(59,130,246,0.2)', borderRadius: '20px', display: 'inline-block' }}>
            <span style={{ fontSize: '10px', color: '#93c5fd', fontWeight: '600' }}>ERP v2.0</span>
          </div>
        </div>
      </div>

      {/* Usuário logado */}
      {user && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: '700', color: 'white', flexShrink: 0,
            }}>
              {(user.name || user.nome || 'U').charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name || user.nome || 'Usuário'}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                {ROLE_LABEL[user.role] || user.role || 'Operador'}
              </div>
            </div>
            <Notificacoes />
          </div>
        </div>
      )}

      {/* Busca Global */}
      <BuscaGlobal />

      {/* Menu agrupado */}
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        {menuGroups.map((group) => {
          const visibleItems = group.items.filter(item =>
            isAdmin || !item.modulo || pode(item.modulo, 'ver')
          );
          if (visibleItems.length === 0) return null;
          return (
          <div key={group.label} style={{ marginBottom: '4px' }}>
            <div style={{
              fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.28)',
              letterSpacing: '1.5px', padding: '10px 18px 4px', textTransform: 'uppercase'
            }}>
              {group.label}
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: '0 8px' }}>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <li key={item.id}>
                    <Link
                      to={item.path}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '9px',
                        padding: '7px 12px', borderRadius: '8px', fontSize: '12.5px',
                        fontWeight: active ? '600' : '400',
                        color: active ? '#ffffff' : 'rgba(255,255,255,0.58)',
                        background: active ? 'rgba(59,130,246,0.22)' : 'transparent',
                        textDecoration: 'none', transition: 'all 0.12s',
                        borderLeft: active ? '2px solid #3b82f6' : '2px solid transparent',
                      }}
                      onMouseEnter={e => {
                        if (!active) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                          e.currentTarget.style.color = '#ffffff';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!active) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'rgba(255,255,255,0.58)';
                        }
                      }}
                    >
                      <Icon size={14} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {item.badge && (
                        <span style={{
                          fontSize: '8px', padding: '1px 5px',
                          background: '#ef4444', color: 'white',
                          borderRadius: '20px', fontWeight: '700', letterSpacing: '0.5px',
                        }}>
                          {item.badge.toUpperCase()}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '10px 8px 14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
            padding: '9px 12px', background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.18)', borderRadius: '8px',
            color: '#fca5a5', cursor: 'pointer', fontSize: '12.5px', fontWeight: '500',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.22)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#fca5a5'; }}
        >
          <LogOut size={14} />
          Sair do sistema
        </button>
        <div style={{ padding: '8px 0 0', textAlign: 'center', fontSize: '9px', color: 'rgba(255,255,255,0.18)' }}>
          Legacy Moving © 2026
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
