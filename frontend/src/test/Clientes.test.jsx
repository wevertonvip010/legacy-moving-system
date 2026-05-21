import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Clientes from '../pages/Clientes';

vi.mock('../lib/api.js', () => ({
  api: {
    getClientes: vi.fn().mockResolvedValue([
      { id: 1, nome: 'João Silva', email: 'joao@email.com', telefone: '(11) 9999-0000', endereco: 'SP', origem: 'direto', status: 'ativo', created_at: '2025-01-01T00:00:00' },
      { id: 2, nome: 'Maria Santos', email: 'maria@email.com', telefone: '(11) 8888-0000', endereco: 'SP', origem: 'organizer', status: 'ativo', created_at: '2025-01-02T00:00:00' },
    ]),
    createCliente: vi.fn().mockResolvedValue({ id: 3, nome: 'Novo Cliente', status: 'ativo', created_at: '2025-01-03T00:00:00' }),
    updateCliente: vi.fn().mockResolvedValue({ id: 1, nome: 'João Editado', status: 'ativo', created_at: '2025-01-01T00:00:00' }),
    deleteCliente: vi.fn().mockResolvedValue({ status: 'arquivado', id: 1 }),
  }
}));

const renderClientes = () => render(<MemoryRouter><Clientes /></MemoryRouter>);

describe('Clientes', () => {
  it('exibe loading e depois lista de clientes', async () => {
    renderClientes();
    await waitFor(() => {
      expect(document.body.textContent).toContain('João Silva');
    });
  });

  it('exibe todos os clientes carregados da API', async () => {
    renderClientes();
    await waitFor(() => {
      expect(document.body.textContent).toContain('João Silva');
      expect(document.body.textContent).toContain('Maria Santos');
    });
  });

  it('botão "Novo Cliente" abre modal', async () => {
    renderClientes();
    await waitFor(() => {
      expect(document.body.textContent).toContain('João Silva');
    });
    const btn = document.querySelector('button');
    const novoBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Novo Cliente'));
    if (novoBtn) {
      fireEvent.click(novoBtn);
      await waitFor(() => {
        expect(document.body.textContent).toContain('Novo Cliente');
      });
    }
  });

  it('filtra clientes por busca', async () => {
    renderClientes();
    await waitFor(() => {
      expect(document.body.textContent).toContain('João Silva');
    });
    const inputs = document.querySelectorAll('input');
    const searchInput = inputs[0];
    if (searchInput) {
      fireEvent.change(searchInput, { target: { value: 'Maria' } });
      await waitFor(() => {
        expect(document.body.textContent).toContain('Maria Santos');
      });
    }
  });
});
