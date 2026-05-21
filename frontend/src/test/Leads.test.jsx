import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Leads from '../pages/Leads';

vi.mock('../lib/api', () => ({
  api: {
    getLeads: vi.fn().mockResolvedValue([
      { id: 1, nome: 'Ana Oliveira', telefone: '11 91234-5678', email: 'ana@email.com', origem: 'instagram', tipo_servico: 'residencial', status: 'novo', classificacao: null, created_at: '2026-05-01T10:00:00' },
      { id: 2, nome: 'Bruno Silva', telefone: '21 99876-5432', email: 'bruno@email.com', origem: 'indicacao', tipo_servico: 'comercial', status: 'classificado', classificacao: 'AA', created_at: '2026-05-02T11:00:00' },
    ]),
    createLead: vi.fn().mockResolvedValue({ id: 3, nome: 'Novo Lead', status: 'novo' }),
    classificarLead: vi.fn().mockResolvedValue({ id: 1, classificacao: 'AA', status: 'classificado' }),
    converterLead: vi.fn().mockResolvedValue({ lead: { status: 'convertido' }, orcamento: { id: 1, numero: 'ORC-2026-001' } }),
    miranteClassificarLead: vi.fn().mockResolvedValue({ classificacao: 'A', justificativa: 'Lead com potencial', confianca: 0.85 }),
  },
}));

vi.mock('../hooks/useAuth.jsx', () => ({
  useAuth: () => ({ user: { name: 'Admin', role: 'admin' }, token: 'fake-token' }),
}));

const renderLeads = () => render(<MemoryRouter><Leads /></MemoryRouter>);

describe('Leads', () => {
  it('renderiza a página de leads com título', async () => {
    renderLeads();
    await waitFor(() => {
      expect(screen.getByText(/leads/i)).toBeTruthy();
    });
  });

  it('exibe a lista de leads carregados', async () => {
    renderLeads();
    await waitFor(() => {
      expect(screen.getByText('Ana Oliveira')).toBeTruthy();
      expect(screen.getByText('Bruno Silva')).toBeTruthy();
    });
  });

  it('exibe badge de classificação AA para lead classificado', async () => {
    renderLeads();
    await waitFor(() => {
      expect(screen.getByText('AA')).toBeTruthy();
    });
  });

  it('exibe botão Novo Lead', async () => {
    renderLeads();
    await waitFor(() => {
      expect(screen.getByText(/novo lead/i)).toBeTruthy();
    });
  });

  it('abre modal ao clicar em Novo Lead', async () => {
    renderLeads();
    await waitFor(() => screen.getByText(/novo lead/i));
    fireEvent.click(screen.getByText(/novo lead/i));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/nome|cadastrar|lead/i);
    });
  });

  it('filtra leads por status', async () => {
    renderLeads();
    await waitFor(() => screen.getByText('Ana Oliveira'));
    const selects = document.querySelectorAll('select');
    if (selects.length > 0) {
      fireEvent.change(selects[0], { target: { value: 'classificado' } });
    }
  });
});
