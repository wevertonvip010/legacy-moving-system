const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getToken() {
  return localStorage.getItem('token');
}

// ── Interceptor global de autenticação ──────────────────────────────────────
// Registrado pelo AuthProvider para disparar logout automaticamente em 401
let _onAuthError = null;
export function setAuthErrorHandler(fn) {
  _onAuthError = fn;
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
  if (!res.ok) {
    if (res.status === 401 && path !== '/api/auth/login') {
      if (_onAuthError) _onAuthError();
    }
    throw Object.assign(new Error(data.erro || `Erro ${res.status}`), { status: res.status, data });
  }
  return data;
}

// ── Helper: query string ─────────────────────────────────────────────────────
const qs = (params) => {
  const s = new URLSearchParams(params).toString();
  return s ? '?' + s : '';
};

export const api = {

  // ── Auth ──────────────────────────────────────────────────────────────────
  login:  (cpf, password) => req('POST', '/api/auth/login', { cpf, password }),
  me:     ()               => req('GET',  '/api/auth/me'),

  // ── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: () => req('GET', '/api/dashboard'),

  // ── IA Mirante ────────────────────────────────────────────────────────────
  miranteChat:           (mensagem, historico = []) => req('POST', '/api/mirante/chat', { mensagem, historico }),
  miranteClassificarLead: (info)                    => req('POST', '/api/mirante/classificar-lead', { info }),

  // ── Leads ─────────────────────────────────────────────────────────────────
  getLeads:        (params = {}) => req('GET',    `/api/leads${qs(params)}`),
  getLead:         (id)          => req('GET',    `/api/leads/${id}`),
  createLead:      (data)        => req('POST',   '/api/leads', data),
  updateLead:      (id, data)    => req('PUT',    `/api/leads/${id}`, data),
  classificarLead: (id, data)    => req('POST',   `/api/leads/${id}/classificar`, data),
  converterLead:   (id)          => req('POST',   `/api/leads/${id}/converter`),
  deleteLead:      (id)          => req('DELETE', `/api/leads/${id}`),

  // ── Clientes ──────────────────────────────────────────────────────────────
  getClientes:        (params = {}) => req('GET',    `/api/clientes${qs(params)}`),
  getCliente:         (id)          => req('GET',    `/api/clientes/${id}`),
  getClienteHistorico:(id)          => req('GET',    `/api/clientes/${id}/historico`),
  createCliente:      (data)        => req('POST',   '/api/clientes', data),
  updateCliente:      (id, data)    => req('PUT',    `/api/clientes/${id}`, data),
  deleteCliente:      (id)          => req('DELETE', `/api/clientes/${id}`),

  // ── Organizers ────────────────────────────────────────────────────────────
  getOrganizers:        (params = {}) => req('GET',    `/api/organizers${qs(params)}`),
  getOrganizerDashboard:(id)          => req('GET',    `/api/organizers/${id}/dashboard`),
  getOrganizerComissoes:(id)          => req('GET',    `/api/organizers/${id}/comissoes`),
  getOrganizerLeads:    (id)          => req('GET',    `/api/organizers/${id}/leads`),
  getRankingOrganizers: ()            => req('GET',    '/api/organizers/ranking'),
  getRankingVendedores: ()            => req('GET',    '/api/vendedores/ranking'),
  createOrganizer:      (data)        => req('POST',   '/api/organizers', data),
  updateOrganizer:      (id, data)    => req('PUT',    `/api/organizers/${id}`, data),
  deleteOrganizer:      (id)          => req('DELETE', `/api/organizers/${id}`),

  // ── Orçamentos ────────────────────────────────────────────────────────────
  getOrcamentos:   (params = {}) => req('GET',    `/api/orcamentos${qs(params)}`),
  getOrcamento:    (id)          => req('GET',    `/api/orcamentos/${id}`),
  createOrcamento: (data)        => req('POST',   '/api/orcamentos', data),
  updateOrcamento: (id, data)    => req('PUT',    `/api/orcamentos/${id}`, data),
  aprovarOrcamento:(id)          => req('POST',   `/api/orcamentos/${id}/aprovar`),
  deleteOrcamento: (id)          => req('DELETE', `/api/orcamentos/${id}`),

  // ── Cadastro Complementar ─────────────────────────────────────────────────
  getCadastros:              ()         => req('GET',  '/api/cadastro-complementar'),
  getCadastro:               (id)       => req('GET',  `/api/cadastro-complementar/${id}`),
  getCadastroPorOrcamento:   (orcId)    => req('GET',  `/api/cadastro-complementar/orcamento/${orcId}`),
  updateCadastro:            (id, data) => req('PUT',  `/api/cadastro-complementar/${id}`, data),
  gerarContratoDosCadastro:  (id)       => req('POST', `/api/cadastro-complementar/${id}/gerar-contrato`),

  // ── Contratos ─────────────────────────────────────────────────────────────
  getContratos:     (params = {}) => req('GET',  `/api/contratos${qs(params)}`),
  getContrato:      (id)          => req('GET',  `/api/contratos/${id}`),
  updateContrato:   (id, data)    => req('PUT',  `/api/contratos/${id}`, data),
  gerarOsDoContrato:(id)          => req('POST', `/api/contratos/${id}/gerar-os`),

  // ── Ordens de Serviço ─────────────────────────────────────────────────────
  getOS:       (params = {}) => req('GET',  `/api/os${qs(params)}`),
  getOSById:   (id)          => req('GET',  `/api/os/${id}`),
  createOS:    (data)        => req('POST', '/api/os', data),
  updateOS:    (id, data)    => req('PUT',  `/api/os/${id}`, data),
  iniciarOS:   (id)          => req('POST', `/api/os/${id}/iniciar`),
  concluirOS:  (id, data)    => req('POST', `/api/os/${id}/concluir`, data),
  cancelarOS:  (id)          => req('POST', `/api/os/${id}/cancelar`),
  getPortalLink:(id)         => req('GET',  `/api/os/${id}/portal-link`),

  // ── Etapas Operacionais ───────────────────────────────────────────────────
  getEtapas:   (osId)                    => req('GET',    `/api/os/${osId}/etapas`),
  createEtapa: (osId, data)              => req('POST',   `/api/os/${osId}/etapas`, data),
  updateEtapa: (osId, etapaId, data)     => req('PUT',    `/api/os/${osId}/etapas/${etapaId}`, data),
  deleteEtapa: (osId, etapaId)           => req('DELETE', `/api/os/${osId}/etapas/${etapaId}`),

  // ── OS ↔ Estoque ──────────────────────────────────────────────────────────
  getMateriaisOS:      (osId)                    => req('GET',  `/api/os/${osId}/materiais`),
  verificarMateriaisOS:(osId, materiais)          => req('POST', `/api/os/${osId}/materiais/verificar`, { materiais }),
  consumirMateriaisOS: (osId, materiais, forcar = false) => req('POST', `/api/os/${osId}/materiais/consumir`, { materiais, forcar }),
  devolverMateriaisOS: (osId)                    => req('POST', `/api/os/${osId}/materiais/devolver`),

  // ── Fechamento Operacional ────────────────────────────────────────────────
  getOSFechamento:     (osId)       => req('GET',  `/api/os/${osId}/fechamento`),
  getSugestaoFechamento:(osId)      => req('GET',  `/api/os/${osId}/fechamento/sugestao`),
  salvarFechamento:    (osId, data) => req('PUT',  `/api/os/${osId}/fechamento`, data),
  finalizarFechamento: (osId)       => req('POST', `/api/os/${osId}/fechamento/finalizar`),
  getFechamentos:      (params = {})=> req('GET',  `/api/fechamentos${qs(params)}`),

  // ── Comissões ─────────────────────────────────────────────────────────────
  pagarComissao: (id, data) => req('POST', `/api/comissoes/${id}/pagar`, data),

  // ── Programação ───────────────────────────────────────────────────────────
  getProgramacao:   (params = {}) => req('GET',  `/api/programacao${qs(params)}`),
  createProgramacao:(data)        => req('POST', '/api/programacao', data),
  updateProgramacao:(id, data)    => req('PUT',  `/api/programacao/${id}`, data),
  deleteProgramacao:(id, body)    => req('DELETE',`/api/programacao/${id}`, body || undefined),
  syncProgramacao:  ()            => req('POST', '/api/programacao/sync', {}),
  getGcalStatus:    ()            => req('GET',  '/api/programacao/gcal-status'),

  // ── Estoque ───────────────────────────────────────────────────────────────
  getEstoque:             ()         => req('GET',  '/api/estoque'),
  createEstoque:          (data)     => req('POST', '/api/estoque', data),
  updateEstoque:          (id, data) => req('PUT',  `/api/estoque/${id}`, data),
  entradaEstoque:         (id, data) => req('POST', `/api/estoque/${id}/entrada`, data),
  saidaEstoque:           (id, data) => req('POST', `/api/estoque/${id}/saida`, data),
  getMovimentacoes:       (id)       => req('GET',  `/api/estoque/${id}/movimentacoes`),
  getMovimentacoesRecentes:()        => req('GET',  '/api/estoque/movimentacoes/recentes'),

  // ── Materiais (catálogo) ──────────────────────────────────────────────────
  getMateriais:       (params = {}) => req('GET',    `/api/materiais${qs(params)}`),
  getMaterial:        (id)          => req('GET',    `/api/materiais/${id}`),
  createMaterial:     (data)        => req('POST',   '/api/materiais', data),
  updateMaterial:     (id, data)    => req('PUT',    `/api/materiais/${id}`, data),
  deleteMaterial:     (id)          => req('DELETE', `/api/materiais/${id}`),
  getCategoriasMaterial:()          => req('GET',    '/api/materiais/categorias'),

  // ── Guarda-Móveis ─────────────────────────────────────────────────────────
  getBoxes:       ()         => req('GET',  '/api/guarda-moveis'),
  createBox:      (data)     => req('POST', '/api/guarda-moveis', data),
  ocuparBox:      (id, data) => req('POST', `/api/guarda-moveis/${id}/ocupar`, data),
  liberarBox:     (id)       => req('POST', `/api/guarda-moveis/${id}/liberar`),
  manutencaoBox:  (id)       => req('POST', `/api/guarda-moveis/${id}/manutencao`),
  getBoxHistorico:(boxId)    => req('GET',  `/api/guarda-moveis/${boxId}/historico`),
  createBoxEvento:(boxId, data) => req('POST', `/api/guarda-moveis/${boxId}/eventos`, data),

  // ── Recibos ───────────────────────────────────────────────────────────────
  getRecibos:     (params = {}) => req('GET',  `/api/recibos${qs(params)}`),
  getRecibo:      (id)          => req('GET',  `/api/recibos/${id}`),
  createRecibo:   (data)        => req('POST', '/api/recibos', data),
  updateRecibo:   (id, data)    => req('PUT',  `/api/recibos/${id}`, data),
  confirmarRecibo:(id, data)    => req('POST', `/api/recibos/${id}/receber`, data),

  // ── Financeiro ────────────────────────────────────────────────────────────
  getFinanceiroResumo: (mes, ano)    => req('GET', `/api/financeiro/resumo?mes=${mes}&ano=${ano}`),
  getResumoFinanceiro: (params = {}) => req('GET', `/api/financeiro/resumo${qs(params)}`),
  getDespesas:         (params = {}) => req('GET', `/api/financeiro/despesas${qs(params)}`),
  createDespesa:       (data)        => req('POST',   '/api/financeiro/despesas', data),
  updateDespesa:       (id, data)    => req('PUT',    `/api/financeiro/despesas/${id}`, data),
  deleteDespesa:       (id)          => req('DELETE', `/api/financeiro/despesas/${id}`),
  getFinanceiroHistorico:()          => req('GET',    '/api/financeiro/historico'),

  // ── Recorrentes Financeiros ───────────────────────────────────────────────
  getRecorrentes:   ()         => req('GET',    '/api/financeiro/recorrentes'),
  createRecorrente: (data)     => req('POST',   '/api/financeiro/recorrentes', data),
  updateRecorrente: (id, data) => req('PUT',    `/api/financeiro/recorrentes/${id}`, data),
  deleteRecorrente: (id)       => req('DELETE', `/api/financeiro/recorrentes/${id}`),

  // ── Fechamento Mensal ─────────────────────────────────────────────────────
  getFechamento:     (mes, ano) => req('GET',  `/api/fechamento/resumo?mes=${mes}&ano=${ano}`),
  gerarPdfFechamento:(mes, ano) => req('POST', '/api/fechamento/gerar-pdf', { mes, ano }),

  // ── Metas ─────────────────────────────────────────────────────────────────
  getMetas:   ()         => req('GET',    '/api/metas'),
  createMeta: (data)     => req('POST',   '/api/metas', data),
  updateMeta: (id, data) => req('PUT',    `/api/metas/${id}`, data),
  deleteMeta: (id)       => req('DELETE', `/api/metas/${id}`),

  // ── Avarias ───────────────────────────────────────────────────────────────
  getAvarias:     (params = {}) => req('GET',    `/api/avarias${qs(params)}`),
  getAvaria:      (id)          => req('GET',    `/api/avarias/${id}`),
  createAvaria:   (data)        => req('POST',   '/api/avarias', data),
  updateAvaria:   (id, data)    => req('PUT',    `/api/avarias/${id}`, data),
  deleteAvaria:   (id)          => req('DELETE', `/api/avarias/${id}`),
  getResumoAvarias:()           => req('GET',    '/api/avarias/resumo'),

  // ── Usuários ──────────────────────────────────────────────────────────────
  getUsuarios:      (params = {}) => req('GET',  `/api/usuarios${qs(params)}`),
  getUsuariosPorRole:(role)       => req('GET',  `/api/usuarios?role=${role}&ativo=1`),
  createUsuario:    (data)        => req('POST', '/api/usuarios', data),
  updateUsuario:    (id, data)    => req('PUT',  `/api/usuarios/${id}`, data),
  getPermissoes:    (id)          => req('GET',  `/api/usuarios/${id}/permissoes`),
  setPermissoes:    (id, data)    => req('PUT',  `/api/usuarios/${id}/permissoes`, data),

  // ── Funcionários (banco de ajudantes) ─────────────────────────────────────
  getFuncionarios:      (params = {}) => req('GET',    `/api/funcionarios${qs(params)}`),
  createFuncionario:    (data)        => req('POST',   '/api/funcionarios', data),
  updateFuncionario:    (id, data)    => req('PUT',    `/api/funcionarios/${id}`, data),
  deleteFuncionario:    (id)          => req('DELETE', `/api/funcionarios/${id}`),
  getRankingFuncionarios:()           => req('GET',    '/api/funcionarios/ranking'),
  getEquipeOS:          (osId)        => req('GET',    `/api/os/${osId}/equipe`),
  vincularEquipeOS:     (osId, data)  => req('POST',   `/api/os/${osId}/equipe`, data),
  desvincularEquipeOS:  (osId, vinculoId) => req('DELETE', `/api/os/${osId}/equipe/${vinculoId}`),

  // ── Jornadas e Turnos ─────────────────────────────────────────────────────
  getJornada:   (userId)     => req('GET',  `/api/jornadas/${userId}`),
  updateJornada:(userId, data)=> req('PUT', `/api/jornadas/${userId}`, data),
  iniciarTurno: ()            => req('POST','/api/turnos/iniciar'),
  encerrarTurno:()            => req('POST','/api/turnos/encerrar'),
  getTurnos:    (params = {}) => req('GET', `/api/turnos${qs(params)}`),

  // ── Admin / Controladoria ─────────────────────────────────────────────────
  registrarAtividade: (data) => req('POST', '/api/admin/atividade', data),
  getAtividadeAdmin:  ()     => req('GET',  '/api/admin/atividade'),
  getAuditLog:        (params = {}) => req('GET', `/api/audit-log${qs(params)}`),

  // ── Configurações do Sistema ──────────────────────────────────────────────
  getConfig:    ()         => req('GET', '/api/config'),
  setConfig:    (data)     => req('PUT', '/api/config', data),
  getConfigKey: (chave)    => req('GET', `/api/config/${chave}`),

};
