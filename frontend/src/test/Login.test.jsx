import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/Login';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockLogin = vi.fn();

vi.mock('../hooks/useAuth.jsx', () => ({
  useAuth: () => ({
    login: mockLogin,
    loading: false,
    error: null,
  }),
}));

const renderLogin = () => render(<MemoryRouter><Login /></MemoryRouter>);

describe('Login', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockNavigate.mockReset();
  });

  it('renderiza campos CPF e senha', () => {
    renderLogin();
    expect(screen.getByPlaceholderText(/000\.000\.000/)).toBeTruthy();
    expect(document.querySelector('input[type="password"]')).toBeTruthy();
  });

  it('exibe erro quando CPF inválido (menos de 11 dígitos)', async () => {
    renderLogin();
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: '123.456' } });
    fireEvent.change(inputs[1], { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/cpf|inválido|dígitos/i);
    });
  });

  it('login bem sucedido redireciona para /dashboard', async () => {
    mockLogin.mockResolvedValue({ success: true });
    renderLogin();
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: '12345678901' } });
    fireEvent.change(inputs[1], { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('exibe erro quando login falha', async () => {
    mockLogin.mockResolvedValue({ success: false, error: 'CPF ou senha inválidos' });
    renderLogin();
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: '12345678901' } });
    fireEvent.change(inputs[1], { target: { value: 'errada' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/inválidos|senha|erro/i);
    });
  });

  it('campo senha é do tipo password', () => {
    renderLogin();
    expect(document.querySelector('input[type="password"]')).toBeTruthy();
  });
});
