/**
 * Hook para verificar permissões do usuário por módulo.
 *
 * Hierarquia:
 * 1. Se o usuário tem permissões granulares configuradas (u.permissoes), usa essas.
 * 2. Caso contrário, usa as permissões padrão baseadas no role.
 *
 * Módulos disponíveis:
 *   dashboard, leads, clientes, organizers, orcamentos, contratos,
 *   os, programacao, estoque, guarda_moveis, recibos, financeiro,
 *   fechamento, metas, avarias, configuracoes, controladoria, mirante
 *
 * Ações: ver, criar, editar, excluir
 */

import { useAuth } from './useAuth';

// Permissões padrão por role (quando não há permissões granulares)
const DEFAULTS = {
  admin: {
    // admin tem tudo
    _all: { ver: true, criar: true, editar: true, excluir: true },
  },
  vendedor: {
    dashboard:     { ver: true },
    leads:         { ver: true, criar: true, editar: true },
    clientes:      { ver: true, editar: true },
    organizers:    { ver: true },
    orcamentos:    { ver: true, criar: true, editar: true },
    contratos:     { ver: true, editar: true },
    os:            { ver: true },
    recibos:       { ver: true },
    metas:         { ver: true },
    mirante:       { ver: true },
  },
  comercial: {
    // alias de vendedor
    dashboard:     { ver: true },
    leads:         { ver: true, criar: true, editar: true },
    clientes:      { ver: true, editar: true },
    organizers:    { ver: true },
    orcamentos:    { ver: true, criar: true, editar: true },
    contratos:     { ver: true, editar: true },
    os:            { ver: true },
    recibos:       { ver: true },
    metas:         { ver: true },
    mirante:       { ver: true },
  },
  operacional: {
    dashboard:     { ver: true },
    leads:         { ver: true },
    clientes:      { ver: true },
    os:            { ver: true, criar: true, editar: true },
    programacao:   { ver: true, criar: true, editar: true },
    estoque:       { ver: true, criar: true, editar: true },
    guarda_moveis: { ver: true, criar: true, editar: true },
    avarias:       { ver: true, criar: true, editar: true },
    fechamento:    { ver: true, editar: true },
    mirante:       { ver: true },
  },
  financeiro: {
    dashboard:     { ver: true },
    clientes:      { ver: true },
    recibos:       { ver: true, criar: true, editar: true },
    financeiro:    { ver: true, criar: true, editar: true, excluir: true },
    fechamento:    { ver: true, editar: true },
    os:            { ver: true },
    metas:         { ver: true },
    mirante:       { ver: true },
  },
};

/**
 * Retorna true se o usuário pode executar `acao` no `modulo`.
 */
function checkPermissao(user, modulo, acao = 'ver') {
  if (!user) return false;

  const role = user.role || 'comercial';
  const granular = user.permissoes; // null = usa defaults

  if (granular) {
    // Permissões granulares configuradas
    if (granular._all) return !!granular._all[acao];
    const mod = granular[modulo];
    if (mod === undefined) return false; // módulo não listado = sem acesso
    return !!mod[acao];
  }

  // Defaults por role
  if (role === 'admin') return true;

  const roleDefaults = DEFAULTS[role] || DEFAULTS.comercial;
  if (roleDefaults._all) return !!roleDefaults._all[acao];
  const mod = roleDefaults[modulo];
  if (!mod) return false;
  return !!mod[acao];
}

/**
 * Retorna as permissões completas de um usuário para um módulo.
 */
function getModulePermissoes(user, modulo) {
  return {
    ver:    checkPermissao(user, modulo, 'ver'),
    criar:  checkPermissao(user, modulo, 'criar'),
    editar: checkPermissao(user, modulo, 'editar'),
    excluir: checkPermissao(user, modulo, 'excluir'),
  };
}

/**
 * Hook principal de permissões.
 * Retorna um objeto `pode` com métodos utilitários.
 */
export function usePermissoes() {
  const { user } = useAuth();

  return {
    /** Verifica se pode executar ação no módulo */
    pode: (modulo, acao = 'ver') => checkPermissao(user, modulo, acao),
    /** Retorna permissões completas para um módulo */
    modulo: (nome) => getModulePermissoes(user, nome),
    /** true se o usuário é admin */
    isAdmin: user?.role === 'admin',
    /** role do usuário */
    role: user?.role || 'comercial',
  };
}

/** Função standalone para uso fora de hooks (componentes class, etc.) */
export { checkPermissao, getModulePermissoes, DEFAULTS };
