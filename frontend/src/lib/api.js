const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getToken() {
  return localStorage.getItem('token');
}

async function req(method, path, body) {
  const token = getToken();
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.erro || `Erro ${res.status}`), { status: res.status, data });
  return data;
}

export const api = {
  // Auth
  login: (cpf, password) => req('POST', '/api/auth/login', { cpf, password }),
  me: () => req('GET', '/api/auth/me'),

  // Dashboard
  dashboard: () => req('GET', '/api/dashboard'),

  // Leads
  getLeads: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req('GET', `/api/leads${qs ? '?' + qs : ''}`);
  },
  getLead: (id) => req('GET', `/api/leads/${id}`),
  createLead: (data) => req('POST', '/api/leads', data),
  updateLead: (id, data) => req('PUT', `/api/leads/${id}`, data),
  classificarLead: (id, data) => req('POST', `/api/leads/${id}/classificar`, data),
  converterLead: (id) => req('POST', `/api/leads/${id}/converter`),
  deleteLead: (id) => req('DELETE', `/api/leads/${id}`),

  // Mirante IA
  miranteChat: (mensagem, historico = []) =>
    req('POST', '/api/mirante/chat', { mensagem, historico }),
  miranteClassificarLead: (info) =>
    req('POST', '/api/mirante/classificar-lead', { info }),

  // Clientes
  getClientes: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req('GET', `/api/clientes${qs ? '?' + qs : ''}`);
  },
  getCliente: (id) => req('GET', `/api/clientes/${id}`),
  getClienteHistorico: (id) => req('GET', `/api/clientes/${id}/historico`),
  createCliente: (data) => req('POST', '/api/clientes', data),
  updateCliente: (id, data) => req('PUT', `/api/clientes/${id}`, data),
  deleteCliente: (id) => req('DELETE', `/api/clientes/${id}`),

  // Organizers
  getOrganizers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req('GET', `/api/organizers${qs ? '?' + qs : ''}`);
  },
  getOrganizerDashboard: (id) => req('GET', `/api/organizers/${id}/dashboard`),
  getOrganizerComissoes: (id) => req('GET', `/api/organizers/${id}/comissoes`),
  getRankingOrganizers: () => req('GET', '/api/organizers/ranking'),
  createOrganizer: (data) => req('POST', '/api/organizers', data),
  updateOrganizer: (id, data) => req('PUT', `/api/organizers/${id}`, data),
  deleteOrganizer: (id) => req('DELETE', `/api/organizers/${id}`),

  // Etapas Operacionais
  getEtapas: (osId) => req('GET', `/api/os/${osId}/etapas`),
  createEtapa: (osId, data) => req('POST', `/api/os/${osId}/etapas`, data),
  updateEtapa: (osId, etapaId, data) => req('PUT', `/api/os/${osId}/etapas/${etapaId}`, data),
  deleteEtapa: (osId, etapaId) => req('DELETE', `/api/os/${osId}/etapas/${etapaId}`),

  // Fechamento Operacional por OS
  getOSFechamento: (osId) => req('GET', `/api/os/${osId}/fechamento`),
  salvarFechamento: (osId, data) => req('PUT', `/api/os/${osId}/fechamento`, data),
  finalizarFechamento: (osId) => req('POST', `/api/os/${osId}/fechamento/finalizar`),
  getFechamentos: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req('GET', `/api/fechamentos${qs ? '?' + qs : ''}`);
  },

  // Comissões
  pagarComissao: (id, data) => req('POST', `/api/comissoes/${id}/pagar`, data),

  // Orçamentos
  getOrcamentos: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req('GET', `/api/orcamentos${qs ? '?' + qs : ''}`);
  },
  getOrcamento: (id) => req('GET', `/api/orcamentos/${id}`),
  createOrcamento: (data) => req('POST', '/api/orcamentos', data),
  updateOrcamento: (id, data) => req('PUT', `/api/orcamentos/${id}`, data),
  aprovarOrcamento: (id) => req('POST', `/api/orcamentos/${id}/aprovar`),
  deleteOrcamento: (id) => req('DELETE', `/api/orcamentos/${id}`),

  // Cadastro Complementar
  getCadastros: () => req('GET', '/api/cadastro-complementar'),
  getCadastro: (id) => req('GET', `/api/cadastro-complementar/${id}`),
  getCadastroPorOrcamento: (orcId) => req('GET', `/api/cadastro-complementar/orcamento/${orcId}`),
  updateCadastro: (id, data) => req('PUT', `/api/cadastro-complementar/${id}`, data),
  gerarContratoDosCadastro: (id) => req('POST', `/api/cadastro-complementar/${id}/gerar-contrato`),

  // Contratos
  getContratos: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req('GET', `/api/contratos${qs ? '?' + qs : ''}`);
  },
  getContrato: (id) => req('GET', `/api/contratos/${id}`),
  updateContrato: (id, data) => req('PUT', `/api/contratos/${id}`, data),
  gerarOsDoContrato: (id) => req('POST', `/api/contratos/${id}/gerar-os`),

  // Ordens de Serviço
  getOS: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req('GET', `/api/os${qs ? '?' + qs : ''}`);
  },
  getOSById: (id) => req('GET', `/api/os/${id}`),
  createOS: (data) => req('POST', '/api/os', data),
  updateOS: (id, data) => req('PUT', `/api/os/${id}`, data),
  iniciarOS: (id) => req('POST', `/api/os/${id}/iniciar`),
  concluirOS: (id, data) => req('POST', `/api/os/${id}/concluir`, data),
  cancelarOS: (id) => req('POST', `/api/os/${id}/cancelar`),

  // Programação
  getProgramacao: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req('GET', `/api/programacao${qs ? '?' + qs : ''}`);
  },
  createProgramacao: (data) => req('POST', '/api/programacao', data),
  updateProgramacao: (id, data) => req('PUT', `/api/programacao/${id}`, data),
  deleteProgramacao: (id) => req('DELETE', `/api/programacao/${id}`),
  syncProgramacao: () => req('POST', '/api/programacao/sync', {}),

  // Estoque
  getEstoque: () => req('GET', '/api/estoque'),
  createEstoque: (data) => req('POST', '/api/estoque', data),
  updateEstoque: (id, data) => req('PUT', `/api/estoque/${id}`, data),
  entradaEstoque: (id, data) => req('POST', `/api/estoque/${id}/entrada`, data),
  saidaEstoque: (id, data) => req('POST', `/api/estoque/${id}/saida`, data),
  getMovimentacoes: (id) => req('GET', `/api/estoque/${id}/movimentacoes`),

  // Guarda-Móveis
  getBoxes: () => req('GET', '/api/guarda-moveis'),
  createBox: (data) => req('POST', '/api/guarda-moveis', data),
  ocuparBox: (id, data) => req('POST', `/api/guarda-moveis/${id}/ocupar`, data),
  liberarBox: (id) => req('POST', `/api/guarda-moveis/${id}/liberar`),
  manutencaoBox: (id) => req('POST', `/api/guarda-moveis/${id}/manutencao`),

  // Recibos
  getRecibos: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req('GET', `/api/recibos${qs ? '?' + qs : ''}`);
  },
  getRecibo: (id) => req('GET', `/api/recibos/${id}`),
  createRecibo: (data) => req('POST', '/api/recibos', data),
  updateRecibo: (id, data) => req('PUT', `/api/recibos/${id}`, data),
  confirmarRecibo: (id, data) => req('POST', `/api/recibos/${id}/receber`, data),

  // Financeiro
  getFinanceiroResumo: (mes, ano) =>
    req('GET', `/api/financeiro/resumo?mes=${mes}&ano=${ano}`),
  getResumoFinanceiro: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req('GET', `/api/financeiro/resumo${qs ? '?' + qs : ''}`);
  },
  getDespesas: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req('GET', `/api/financeiro/despesas${qs ? '?' + qs : ''}`);
  },
  createDespesa: (data) => req('POST', '/api/financeiro/despesas', data),
  updateDespesa: (id, data) => req('PUT', `/api/financeiro/despesas/${id}`, data),
  deleteDespesa: (id) => req('DELETE', `/api/financeiro/despesas/${id}`),
  getFinanceiroHistorico: () => req('GET', '/api/financeiro/historico'),

  // Fechamento
  getFechamento: (mes, ano) =>
    req('GET', `/api/fechamento/resumo?mes=${mes}&ano=${ano}`),
  gerarPdfFechamento: (mes, ano) =>
    req('POST', '/api/fechamento/gerar-pdf', { mes, ano }),

  // Metas
  getMetas: () => req('GET', '/api/metas'),
  createMeta: (data) => req('POST', '/api/metas', data),
  updateMeta: (id, data) => req('PUT', `/api/metas/${id}`, data),
  deleteMeta: (id) => req('DELETE', `/api/metas/${id}`),

  // Usuários
  getUsuarios: () => req('GET', '/api/usuarios'),
  createUsuario: (data) => req('POST', '/api/usuarios', data),

  // Avarias
  getAvarias: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req('GET', `/api/avarias${qs ? '?' + qs : ''}`);
  },
  getAvaria: (id) => req('GET', `/api/avarias/${id}`),
  createAvaria: (data) => req('POST', '/api/avarias', data),
  updateAvaria: (id, data) => req('PUT', `/api/avarias/${id}`, data),
  deleteAvaria: (id) => req('DELETE', `/api/avarias/${id}`),
  getResumoAvarias: () => req('GET', '/api/avarias/resumo'),

  // Admin / Controladoria
  registrarAtividade: (data) => req('POST', '/api/admin/atividade', data),
  getAtividadeAdmin: () => req('GET', '/api/admin/atividade'),
};
