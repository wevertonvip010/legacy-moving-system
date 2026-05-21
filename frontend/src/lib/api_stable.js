import axios from 'axios';

// Configuração da API
const API_BASE_URL = 'https://5000-ibug5bjb05t14xotl0hjg-6f923268.manusvm.computer/api';

// Configurar axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Serviços de autenticação
export const authService = {
  async login(cpf, password) {
    try {
      console.log('Tentando login com:', { cpf, password });
      
      const response = await api.post('/auth/login', {
        cpf,
        password
      });
      
      console.log('Resposta do login:', response.data);
      
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return response.data;
      }
      
      throw new Error('Token não recebido');
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  },

  async verifyToken() {
    try {
      const response = await api.get('/auth/verify');
      return response.data;
    } catch (error) {
      console.error('Erro na verificação do token:', error);
      throw error;
    }
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  isAuthenticated() {
    const token = localStorage.getItem('token');
    return !!token;
  },

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
};

// Serviços do dashboard
export const dashboardService = {
  async getStats() {
    try {
      const response = await api.get('/dashboard/stats');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw error;
    }
  }
};

// Serviços de clientes
export const clientesService = {
  async getAll() {
    try {
      const response = await api.get('/clientes');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      throw error;
    }
  },

  async create(cliente) {
    try {
      const response = await api.post('/clientes', cliente);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      throw error;
    }
  }
};

// Serviços de leads
export const leadsService = {
  async getAll() {
    try {
      const response = await api.get('/leads');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
      throw error;
    }
  }
};

// Serviços de licitações
export const licitacoesService = {
  async getAll() {
    try {
      const response = await api.get('/licitacoes');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar licitações:', error);
      throw error;
    }
  }
};

// Health check
export const healthService = {
  async check() {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      console.error('Erro no health check:', error);
      throw error;
    }
  }
};

export default api;

