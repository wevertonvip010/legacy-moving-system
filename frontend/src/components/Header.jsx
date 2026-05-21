import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogOut, RefreshCw } from 'lucide-react';

const Header = ({ title }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <header className="bg-vip-gradient text-white px-6 py-4 shadow-vip">
      <div className="flex items-center justify-between">
        {/* Título da página */}
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>

        {/* Informações do usuário e ações */}
        <div className="flex items-center space-x-4">
          {/* Botão de atualizar */}
          <button
            onClick={() => window.location.reload()}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-vip"
            title="Atualizar página"
          >
            <RefreshCw className="h-5 w-5" />
          </button>

          {/* Informações do usuário */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium">Olá, {user?.name || 'Administrador'} VIP</p>
              <p className="text-xs text-blue-100">{user?.role || 'admin'}</p>
            </div>
            
            {/* Avatar */}
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold">
                {user?.name?.charAt(0) || 'A'}
              </span>
            </div>

            {/* Botão de logout */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-vip"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

