import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';

const mockIsAuthenticated = vi.fn();
let mockLoading = false;

vi.mock('../hooks/useAuth.jsx', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    get loading() { return mockLoading; },
  }),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockLoading = false;
    mockIsAuthenticated.mockReset();
  });

  it('rota protegida sem login redireciona para /login', () => {
    mockIsAuthenticated.mockReturnValue(false);
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Página de Login</div>} />
          <Route path="/dashboard" element={
            <ProtectedRoute><div>Dashboard Protegido</div></ProtectedRoute>
          } />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByText('Dashboard Protegido')).toBeNull();
    expect(screen.getByText('Página de Login')).toBeTruthy();
  });

  it('rota protegida com login exibe o conteúdo', () => {
    mockIsAuthenticated.mockReturnValue(true);
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Página de Login</div>} />
          <Route path="/dashboard" element={
            <ProtectedRoute><div>Dashboard Protegido</div></ProtectedRoute>
          } />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Dashboard Protegido')).toBeTruthy();
  });

  it('exibe spinner enquanto verifica autenticação', () => {
    mockLoading = true;
    mockIsAuthenticated.mockReturnValue(false);
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={
            <ProtectedRoute><div>Dashboard Protegido</div></ProtectedRoute>
          } />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByText('Dashboard Protegido')).toBeNull();
    expect(document.body.textContent).toMatch(/autenticação|verificando/i);
  });
});
