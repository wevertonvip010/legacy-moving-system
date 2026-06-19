import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GuardaMoveis from '../pages/GuardaMoveis';

vi.mock('../lib/api.js', () => ({
  api: {
    getBoxes: vi.fn().mockResolvedValue({
      boxes: [
        { id: 1, numero: 'Box 01', status: 'livre', cliente_nome: null, valor_mensal: 0, data_entrada: null, observacoes: null },
        { id: 2, numero: 'Box 02', status: 'ocupado', cliente_nome: 'Maria Silva', valor_mensal: 380, data_entrada: '2025-01-15T00:00:00', observacoes: null },
        { id: 3, numero: 'Box 03', status: 'manutencao', cliente_nome: null, valor_mensal: 0, data_entrada: null, observacoes: null },
      ],
      receita_mensal_total: 380,
      total: 20,
      ocupados: 1,
      livres: 18,
      manutencao: 1
    }),
    ocuparBox: vi.fn().mockResolvedValue({ id: 1, status: 'ocupado', cliente_nome: 'Novo Cliente', valor_mensal: 380, data_entrada: '2025-08-01T00:00:00' }),
    liberarBox: vi.fn().mockResolvedValue({ id: 2, status: 'livre', cliente_nome: null, valor_mensal: 0, data_entrada: null }),
    manutencaoBox: vi.fn().mockResolvedValue({ id: 1, status: 'manutencao' }),
  }
}));

const renderGuardaMoveis = () => render(<MemoryRouter><GuardaMoveis /></MemoryRouter>);

describe('GuardaMoveis', () => {
  it('exibe os boxes carregados da API', async () => {
    renderGuardaMoveis();
    await waitFor(() => {
      expect(document.body.textContent).toContain('Box 01');
    });
  });

  it('exibe box ocupado com nome do cliente', async () => {
    renderGuardaMoveis();
    await waitFor(() => {
      expect(document.body.textContent).toContain('Maria Silva');
    });
  });

  it('exibe status correto dos boxes (livre, ocupado, manutenção)', async () => {
    renderGuardaMoveis();
    await waitFor(() => {
      expect(document.body.textContent).toContain('Livre');
      expect(document.body.textContent).toContain('Ocupado');
      expect(document.body.textContent).toContain('Manutenção');
    });
  });

  it('exibe receita mensal total', async () => {
    renderGuardaMoveis();
    await waitFor(() => {
      expect(document.body.textContent).toContain('380');
    });
  });

  it('botão Ocupar aparece para boxes livres', async () => {
    renderGuardaMoveis();
    await waitFor(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const ocuparBtns = btns.filter(b => b.textContent.trim() === 'Ocupar');
      expect(ocuparBtns.length).toBeGreaterThan(0);
    });
  });

  it('botão Liberar aparece para boxes ocupados', async () => {
    renderGuardaMoveis();
    await waitFor(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const liberarBtns = btns.filter(b => b.textContent.trim() === 'Liberar');
      expect(liberarBtns.length).toBeGreaterThan(0);
    });
  });

  it('abre modal ao clicar em Ocupar', async () => {
    renderGuardaMoveis();
    await waitFor(() => {
      expect(document.body.textContent).toContain('Box 01');
    });
    const ocuparBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Ocupar');
    if (ocuparBtn) fireEvent.click(ocuparBtn);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Ocupar Box|cliente/i);
    });
  });
});
