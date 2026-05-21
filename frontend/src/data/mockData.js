// Mock data para o sistema VIP Mudanças v2.6

export const mockData = {
  // Dashboard metrics
  dashboard: {
    mudancasAgendadas: 12,
    boxesOcupados: 34,
    visitasNoMes: 28,
    valorPrevisto: 85750.00,
    
    // Atividades recentes
    atividadesRecentes: [
      {
        id: 1,
        tipo: 'mudanca',
        cliente: 'Maria Silva',
        data: '2024-06-20',
        status: 'agendada',
        valor: 2500.00
      },
      {
        id: 2,
        tipo: 'visita',
        cliente: 'João Santos',
        data: '2024-06-21',
        status: 'confirmada',
        endereco: 'Rua das Flores, 123'
      },
      {
        id: 3,
        tipo: 'box',
        cliente: 'Ana Costa',
        box: 'Box 15',
        data: '2024-06-19',
        status: 'ocupado'
      }
    ]
  },

  // Guarda-móveis (56 boxes)
  boxes: Array.from({ length: 56 }, (_, i) => {
    const boxNumber = i + 1;
    const statuses = ['livre', 'ocupado', 'manutencao'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
      id: boxNumber,
      numero: `Box ${boxNumber.toString().padStart(2, '0')}`,
      altura: 2.5,
      largura: 2.0,
      profundidade: 3.0,
      status: status,
      cliente: status === 'ocupado' ? `Cliente ${boxNumber}` : null,
      cpfCnpj: status === 'ocupado' ? `123.456.789-${boxNumber.toString().padStart(2, '0')}` : null,
      dataEntrada: status === 'ocupado' ? '2024-05-15' : null,
      observacoes: status === 'manutencao' ? 'Porta com problema na fechadura' : ''
    };
  }),

  // Estoque
  estoque: [
    {
      id: 1,
      nome: 'Caixa de Papelão Grande',
      quantidade: 150,
      ultimaMovimentacao: '2024-06-20',
      tipo: 'entrada',
      valorUnitario: 3.50
    },
    {
      id: 2,
      nome: 'Plástico Bolha (rolo)',
      quantidade: 25,
      ultimaMovimentacao: '2024-06-19',
      tipo: 'saida',
      valorUnitario: 45.00
    },
    {
      id: 3,
      nome: 'Papelão Ondulado',
      quantidade: 80,
      ultimaMovimentacao: '2024-06-18',
      tipo: 'entrada',
      valorUnitario: 2.80
    },
    {
      id: 4,
      nome: 'Fita Adesiva Transparente',
      quantidade: 200,
      ultimaMovimentacao: '2024-06-17',
      tipo: 'saida',
      valorUnitario: 8.90
    },
    {
      id: 5,
      nome: 'Formulário Impresso',
      quantidade: 500,
      ultimaMovimentacao: '2024-06-16',
      tipo: 'entrada',
      valorUnitario: 0.15
    }
  ],

  // Financeiro
  financeiro: {
    caixaAtual: 45780.50,
    entradas: [
      { mes: 'Abril', valor: 32500.00 },
      { mes: 'Maio', valor: 41200.00 },
      { mes: 'Junho', valor: 38750.00 }
    ],
    saidas: [
      { mes: 'Abril', valor: 18900.00 },
      { mes: 'Maio', valor: 22100.00 },
      { mes: 'Junho', valor: 19800.00 }
    ],
    despesasFixas: [
      { nome: 'Aluguel', valor: 8500.00 },
      { nome: 'Salários', valor: 15200.00 },
      { nome: 'Combustível', valor: 3200.00 },
      { nome: 'Seguro', valor: 1800.00 },
      { nome: 'Manutenção', valor: 2500.00 }
    ]
  },

  // Clientes
  clientes: [
    {
      id: 1,
      nome: 'Maria Silva Santos',
      cpfCnpj: '123.456.789-01',
      telefone: '(11) 99999-1234',
      email: 'maria.silva@email.com',
      endereco: 'Rua das Flores, 123 - São Paulo/SP',
      status: 'ativo',
      dataCadastro: '2024-01-15'
    },
    {
      id: 2,
      nome: 'João Carlos Oliveira',
      cpfCnpj: '987.654.321-02',
      telefone: '(11) 88888-5678',
      email: 'joao.oliveira@email.com',
      endereco: 'Av. Paulista, 456 - São Paulo/SP',
      status: 'ativo',
      dataCadastro: '2024-02-20'
    },
    {
      id: 3,
      nome: 'Ana Costa Ferreira',
      cpfCnpj: '456.789.123-03',
      telefone: '(11) 77777-9012',
      email: 'ana.costa@email.com',
      endereco: 'Rua Augusta, 789 - São Paulo/SP',
      status: 'pendente',
      dataCadastro: '2024-03-10'
    },
    {
      id: 4,
      nome: 'Carlos Eduardo Lima',
      cpfCnpj: '789.123.456-04',
      telefone: '(11) 66666-3456',
      email: 'carlos.lima@email.com',
      endereco: 'Rua Oscar Freire, 321 - São Paulo/SP',
      status: 'ativo',
      dataCadastro: '2024-04-05'
    },
    {
      id: 5,
      nome: 'Fernanda Rodrigues',
      cpfCnpj: '321.654.987-05',
      telefone: '(11) 55555-7890',
      email: 'fernanda.rodrigues@email.com',
      endereco: 'Alameda Santos, 654 - São Paulo/SP',
      status: 'ativo',
      dataCadastro: '2024-05-12'
    },
    {
      id: 6,
      nome: 'Roberto Almeida',
      cpfCnpj: '654.987.321-06',
      telefone: '(11) 44444-1234',
      email: 'roberto.almeida@email.com',
      endereco: 'Rua Consolação, 987 - São Paulo/SP',
      status: 'inativo',
      dataCadastro: '2024-01-30'
    },
    {
      id: 7,
      nome: 'Juliana Martins',
      cpfCnpj: '147.258.369-07',
      telefone: '(11) 33333-5678',
      email: 'juliana.martins@email.com',
      endereco: 'Rua Haddock Lobo, 147 - São Paulo/SP',
      status: 'ativo',
      dataCadastro: '2024-06-01'
    },
    {
      id: 8,
      nome: 'Pedro Henrique Silva',
      cpfCnpj: '258.369.147-08',
      telefone: '(11) 22222-9012',
      email: 'pedro.silva@email.com',
      endereco: 'Av. Rebouças, 258 - São Paulo/SP',
      status: 'ativo',
      dataCadastro: '2024-06-10'
    },
    {
      id: 9,
      nome: 'Luciana Pereira',
      cpfCnpj: '369.147.258-09',
      telefone: '(11) 11111-3456',
      email: 'luciana.pereira@email.com',
      endereco: 'Rua Pamplona, 369 - São Paulo/SP',
      status: 'pendente',
      dataCadastro: '2024-06-15'
    },
    {
      id: 10,
      nome: 'Ricardo Santos',
      cpfCnpj: '741.852.963-10',
      telefone: '(11) 99999-7890',
      email: 'ricardo.santos@email.com',
      endereco: 'Rua Bela Cintra, 741 - São Paulo/SP',
      status: 'ativo',
      dataCadastro: '2024-06-18'
    }
  ],

  // Leads LinkedIn
  leadsLinkedIn: [
    {
      id: 1,
      nome: 'Alexandre Moreira',
      cargo: 'Gerente de Facilities',
      empresa: 'Tech Solutions Ltda',
      status: 'novo',
      dataCaptura: '2024-06-20',
      telefone: '(11) 98765-4321',
      email: 'alexandre.moreira@techsolutions.com'
    },
    {
      id: 2,
      nome: 'Beatriz Campos',
      cargo: 'Coordenadora de RH',
      empresa: 'Inovação Corp',
      status: 'em_negociacao',
      dataCaptura: '2024-06-18',
      telefone: '(11) 87654-3210',
      email: 'beatriz.campos@inovacao.com'
    },
    {
      id: 3,
      nome: 'Carlos Mendes',
      cargo: 'Diretor Administrativo',
      empresa: 'Global Services',
      status: 'fechado',
      dataCaptura: '2024-06-15',
      telefone: '(11) 76543-2109',
      email: 'carlos.mendes@globalservices.com'
    }
  ],

  // Funcionários para programa de pontos
  funcionarios: [
    {
      id: 1,
      nome: 'Kenneth',
      funcao: 'Vendas',
      pontuacaoMensal: 95,
      avaliacaoClientes: 4.8,
      pontualidade: 98,
      organizacao: 92,
      posicao: 1
    },
    {
      id: 2,
      nome: 'Douglas',
      funcao: 'Financeiro',
      pontuacaoMensal: 88,
      avaliacaoClientes: 4.6,
      pontualidade: 95,
      organizacao: 90,
      posicao: 2
    },
    {
      id: 3,
      nome: 'Maciel',
      funcao: 'Motorista/Embalador',
      pontuacaoMensal: 85,
      avaliacaoClientes: 4.7,
      pontualidade: 92,
      organizacao: 85,
      posicao: 3
    },
    {
      id: 4,
      nome: 'Sebastião',
      funcao: 'Montador',
      pontuacaoMensal: 82,
      avaliacaoClientes: 4.5,
      pontualidade: 90,
      organizacao: 88,
      posicao: 4
    },
    {
      id: 5,
      nome: 'Diego',
      funcao: 'Motorista/Embalador',
      pontuacaoMensal: 80,
      avaliacaoClientes: 4.4,
      pontualidade: 88,
      organizacao: 85,
      posicao: 5
    }
  ],

  // Campanhas de Marketing
  campanhasMarketing: [
    {
      id: 1,
      nome: 'Mudanças Residenciais - Verão 2024',
      status: 'ativa',
      roiEstimado: 250,
      investimento: 5000.00,
      retorno: 12500.00,
      dataInicio: '2024-06-01',
      dataFim: '2024-08-31',
      plataforma: 'Google Ads + Facebook'
    },
    {
      id: 2,
      nome: 'Self Storage - Promoção Junho',
      status: 'ativa',
      roiEstimado: 180,
      investimento: 3000.00,
      retorno: 5400.00,
      dataInicio: '2024-06-15',
      dataFim: '2024-07-15',
      plataforma: 'Instagram + WhatsApp'
    }
  ],

  // Licitações mockadas
  licitacoes: [
    {
      id: 1,
      orgao: 'Banco do Brasil',
      titulo: 'Serviços de Mudança e Transporte - Agências SP',
      numero: 'BB-2024-001',
      valor: 150000.00,
      dataAbertura: '2024-07-01',
      dataEntrega: '2024-07-15',
      status: 'aberta',
      palavrasChave: ['mudança', 'transporte']
    },
    {
      id: 2,
      orgao: 'Caixa Econômica Federal',
      titulo: 'Remoção de Móveis e Equipamentos',
      numero: 'CEF-2024-045',
      valor: 85000.00,
      dataAbertura: '2024-06-25',
      dataEntrega: '2024-07-10',
      status: 'aberta',
      palavrasChave: ['remoção', 'móveis']
    },
    {
      id: 3,
      orgao: 'Comprasnet - Ministério da Educação',
      titulo: 'Guarda-móveis e Self Storage',
      numero: 'MEC-2024-078',
      valor: 200000.00,
      dataAbertura: '2024-07-05',
      dataEntrega: '2024-07-20',
      status: 'em_breve',
      palavrasChave: ['guarda-móveis', 'storage']
    }
  ]
};

export default mockData;

