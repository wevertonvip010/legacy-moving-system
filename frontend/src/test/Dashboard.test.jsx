import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';

// Mock da api
vi.mock('../lib/api.js', () => ({
  api: {
    dashboard: vi.fn().mockResolvedValue({
      mudancas_mes: 5,
      boxes_ocupados: 8,
      boxes_total: 20,
      receita_recorrente: 3040,
      clientes_ativos: 12,
      organizers_ativos: 7,
      orcamentos_abertos: 3,
      proximas_os: [
        { id: 1, numero: 'OS-001', cliente: 'Ana Silva', data_programada: '2025-08-01T09:00:00', status: 'agendada', veiculo: 'Caminhão' }
      ]
    })
  }
}));

const renderDashboard = () => render(<MemoryRouter><Dashboard /></MemoryRouter>);

describe('Dashboard', () => {
  it('exibe loading inicialmente', () => {
    renderDashboard();
    expect(document.body.textContent).toMatch(/carregando/i);
  });

  it('carrega métricas da API e exibe dados reais', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Legacy Moving/i);
    });
  });

  it('exibe número de mudanças do mês', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(document.body.textContent).toContain('5');
    });
  });

  it('exibe boxes ocupados', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(document.body.textContent).toContain('8/20');
    });
  });

  it('exibe próximas OS da semana', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(document.body.textContent).toContain('Ana Silva');
    });
  });
});
