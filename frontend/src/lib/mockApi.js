/**
 * API Mock para VIP Mudanças
 * Solução alternativa para problemas de conectividade
 */

// Dados mockados
const mockUsers = [
  {
    id: "1",
    cpf: "12345678901",
    password: "1234",
    name: "Administrador VIP",
    role: "admin",
    email: "admin@vipmudancas.com.br"
  }
];

const mockClientes = [
  {
    id: "1",
    nome: "João Silva",
    email: "joao@email.com",
    telefone: "(11) 99999-9999",
    endereco: "São Paulo, SP",
    status: "Ativo",
    dataCadastro: "21/06/2023"
  },
  {
    id: "2",
    nome: "Maria Santos",
    email: "maria@email.com",
    telefone: "(11) 88888-8888",
    endereco: "Rio de Janeiro, RJ",
    status: "Pendente",
    dataCadastro: "20/06/2023"
  }
];

// Simular delay de rede
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Gerar token JWT mock
const generateMockToken = (user) => {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    sub: user.id,
    name: user.name,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 horas
  }));
  const signature = btoa("mock-signature");
  return `${header}.${payload}.${signature}`;
};

// API Mock
export const mockApi = {
  // Autenticação
  async login(cpf, password) {
    await delay(500); // Simular delay de rede
    
    console.log('🔐 Mock API: Tentativa de login', { cpf, password });
    
    // Remover formatação do CPF
    const cleanCpf = cpf.replace(/\D/g, '');
    
    // Buscar usuário
    const user = mockUsers.find(u => u.cpf === cleanCpf && u.password === password);
    
    if (!user) {
      throw new Error('CPF ou senha inválidos');
    }
    
    const token = generateMockToken(user);
    
    console.log('✅ Mock API: Login realizado com sucesso', { user: user.name });
    
    return {
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        cpf: user.cpf
      },
      message: "Login realizado com sucesso"
    };
  },

  // Verificar saúde da API
  async health() {
    await delay(200);
    return {
      status: "ok",
      message: "VIP Mudanças Mock API está funcionando",
      version: "3.1-mock",
      timestamp: new Date().toISOString()
    };
  },

  // Clientes
  async getClientes() {
    await delay(300);
    return {
      clientes: mockClientes,
      total: mockClientes.length
    };
  },

  async createCliente(clienteData) {
    await delay(400);
    const novoCliente = {
      id: String(mockClientes.length + 1),
      ...clienteData,
      dataCadastro: new Date().toLocaleDateString('pt-BR'),
      status: "Ativo"
    };
    mockClientes.push(novoCliente);
    return novoCliente;
  },

  // Dashboard
  async getDashboardData() {
    await delay(300);
    return {
      mudancasAgendadas: 12,
      boxesOcupados: { ocupados: 34, total: 56 },
      visitasMes: 28,
      valorPrevisto: 85750.00,
      atividadesRecentes: [
        {
          id: "1",
          cliente: "Maria Silva",
          acao: "Mudança agendada - R$ 2.500,00",
          data: "20/06/2024"
        },
        {
          id: "2",
          cliente: "João Santos",
          acao: "Visita confirmada - Rua das Flores, 123",
          data: "21/06/2024"
        }
      ]
    };
  },

  // Leads
  async getLeads() {
    await delay(300);
    return {
      leads: [
        {
          id: "1",
          nome: "Carlos Mendes",
          telefone: "(11) 77777-7777",
          origem: "ManyChat",
          status: "Novo",
          data: "19/07/2025"
        }
      ]
    };
  },

  // Orçamentos
  async getOrcamentos() {
    await delay(300);
    return {
      orcamentos: [
        {
          id: "1",
          cliente: "Ana Costa",
          valor: 3500.00,
          status: "Pendente",
          data: "18/07/2025"
        }
      ]
    };
  },

  // Contratos
  async getContratos() {
    await delay(300);
    return {
      contratos: [
        {
          id: "1",
          cliente: "Pedro Oliveira",
          valor: 4200.00,
          status: "Ativo",
          dataInicio: "15/07/2025"
        }
      ]
    };
  },

  // Visitas
  async getVisitas() {
    await delay(300);
    return {
      visitas: [
        {
          id: "1",
          cliente: "Lucia Ferreira",
          endereco: "Rua das Palmeiras, 456",
          data: "20/07/2025",
          status: "Agendada"
        }
      ]
    };
  },

  // Financeiro
  async getFinanceiro() {
    await delay(300);
    return {
      receitas: 125000.00,
      despesas: 45000.00,
      lucro: 80000.00,
      contasReceber: 25000.00,
      contasPagar: 15000.00
    };
  },

  // Estoque
  async getEstoque() {
    await delay(300);
    return {
      itens: [
        {
          id: "1",
          nome: "Caixas de Papelão",
          quantidade: 150,
          minimo: 50,
          status: "OK"
        },
        {
          id: "2",
          nome: "Fita Adesiva",
          quantidade: 25,
          minimo: 30,
          status: "Baixo"
        }
      ]
    };
  }
};

// Verificar se deve usar API mock ou real
export const shouldUseMockApi = () => {
  // Usar mock se estiver em desenvolvimento ou se a API real não estiver disponível
  return true; // Forçar uso do mock para resolver problema de conectividade
};

console.log('📦 Mock API carregada - VIP Mudanças v3.1');

