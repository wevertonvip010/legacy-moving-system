import { useState, useCallback } from 'react';

const API_BASE = 'http://localhost:5000/api';

export const useAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (method, endpoint, data = null) => {
    setLoading(true);
    setError(null);
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${API_BASE}${endpoint}`, options);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  return { request, loading, error };
};

// Programação
export const useProgramacao = () => {
  const { request, loading, error } = useAPI();

  return {
    listar: async (semana, ano) => request('GET', `/programacao?semana=${semana}&ano=${ano}`),
    criar: async (data) => request('POST', '/programacao', data),
    atualizar: async (id, data) => request('PUT', `/programacao/${id}`, data),
    atualizarEquipe: async (id, equipe) => request('PUT', `/programacao/${id}/equipe`, { equipe }),
    confirmar: async (id) => request('POST', `/programacao/${id}/confirmar`),
    loading,
    error
  };
};

// Metas
export const useMetas = () => {
  const { request, loading, error } = useAPI();

  return {
    listar: async (tipo = 'todos', periodo = 'todos') => 
      request('GET', `/metas?tipo=${tipo}&periodo=${periodo}`),
    criar: async (data) => request('POST', '/metas', data),
    atualizar: async (id, data) => request('PUT', `/metas/${id}`, data),
    atualizarProgresso: async (id, realizado) => 
      request('PUT', `/metas/${id}/progresso`, { realizado }),
    ranking: async () => request('GET', '/metas/ranking'),
    deletar: async (id) => request('DELETE', `/metas/${id}`),
    loading,
    error
  };
};

// O.S. + Estoque
export const useOSEstoque = () => {
  const { request, loading, error } = useAPI();

  return {
    listarOS: async (status = 'todos') => request('GET', `/os?status=${status}`),
    criarOS: async (data) => request('POST', '/os', data),
    iniciarOS: async (id, materiais) => request('POST', `/os/${id}/iniciar`, { materiais }),
    finalizarOS: async (id, custos, materiais_retorno) => 
      request('POST', `/os/${id}/finalizar`, { custos, materiais_retorno }),
    
    listarEstoque: async () => request('GET', '/os/estoque'),
    adicionarEstoque: async (data) => request('POST', '/os/estoque', data),
    atualizarEstoque: async (id, quantidade) => 
      request('PUT', `/os/estoque/${id}`, { quantidade }),
    alertasEstoque: async () => request('GET', '/os/estoque/alertas'),
    
    loading,
    error
  };
};

// Fechamento Financeiro
export const useFechamento = () => {
  const { request, loading, error } = useAPI();

  return {
    listarMudancas: async (mes, ano) => 
      request('GET', `/fechamento/mudancas?mes=${mes}&ano=${ano}`),
    resumo: async (mes, ano) => 
      request('GET', `/fechamento/resumo?mes=${mes}&ano=${ano}`),
    despesasCategoria: async () => request('GET', '/fechamento/despesas-categoria'),
    dre: async (mes, ano) => 
      request('GET', `/fechamento/dre?mes=${mes}&ano=${ano}`),
    loading,
    error
  };
};
