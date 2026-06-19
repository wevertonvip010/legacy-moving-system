import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setAuthErrorHandler } from '../lib/api';

const AuthContext = createContext();

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true); // true enquanto valida

  // ── Logout centralizado ──────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  // ── Registra o handler global de 401 assim que o provider monta ─────────
  useEffect(() => {
    setAuthErrorHandler(logout);
  }, [logout]);

  // ── Init: lê localStorage e valida token no backend ─────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const savedToken = localStorage.getItem('token');
        const savedUser  = localStorage.getItem('user');

        if (!savedToken || !savedUser) {
          // Sem credenciais salvas → vai para login
          setLoading(false);
          return;
        }

        // Coloca token em memória para a chamada api.me() poder enviá-lo
        setToken(savedToken);
        setUser(JSON.parse(savedUser));

        // Valida o token contra o backend (pode lançar se expirado/inválido)
        try {
          const freshUser = await api.me();
          // Token válido → atualiza dados do usuário com dados frescos
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        } catch (err) {
          // Token inválido ou expirado → limpa tudo
          if (err.status === 401 || err.status === 422) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
          }
          // Em outros erros (ex: backend offline) mantém sessão para não deslogar desnecessariamente
        }
      } catch {
        // JSON malformado ou erro inesperado → limpa
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []); // eslint-disable-line

  // ── Login ────────────────────────────────────────────────────────────────
  const login = async (cpf, password) => {
    try {
      const response = await api.login(cpf, password);
      const { token: newToken, user: userData } = response;
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Erro ao fazer login' };
    }
  };

  const isAuthenticated = () => !!token && !!user;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};
