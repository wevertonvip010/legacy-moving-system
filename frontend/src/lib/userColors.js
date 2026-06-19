/**
 * Sistema de cores por usuário — Legacy Moving ERP
 * Cada usuário recebe uma cor fixa baseada em seu ID.
 * As cores aparecem em: agenda, programação, leads, clientes, OS.
 */

const PALETTE = [
  { bg: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6' },  // azul
  { bg: '#dcfce7', text: '#15803d', dot: '#22c55e' },  // verde
  { bg: '#f5f3ff', text: '#6d28d9', dot: '#8b5cf6' },  // roxo
  { bg: '#fef9c3', text: '#92400e', dot: '#f59e0b' },  // amarelo
  { bg: '#fee2e2', text: '#b91c1c', dot: '#ef4444' },  // vermelho
  { bg: '#ffedd5', text: '#c2410c', dot: '#f97316' },  // laranja
  { bg: '#cffafe', text: '#0e7490', dot: '#06b6d4' },  // ciano
  { bg: '#fce7f3', text: '#9d174d', dot: '#ec4899' },  // rosa
];

// Cache em memória para consistência durante a sessão
const colorCache = {};

/**
 * Retorna a paleta de cor para um usuário dado seu ID ou nome.
 * @param {number|string} userId - ID do usuário
 * @returns {{ bg, text, dot }} objeto de cores
 */
export function getUserColor(userId) {
  if (!userId) return PALETTE[0];
  const key = String(userId);
  if (!colorCache[key]) {
    // Hash simples e determinístico baseado no ID
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) % PALETTE.length;
    }
    colorCache[key] = PALETTE[Math.abs(hash) % PALETTE.length];
  }
  return colorCache[key];
}

/**
 * Retorna um badge colorido com as iniciais do usuário.
 */
export function getUserInitials(name) {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

/**
 * Retorna estilo inline para avatar/dot de usuário.
 */
export function getUserAvatarStyle(userId, size = 28) {
  const c = getUserColor(userId);
  return {
    width: size, height: size, borderRadius: '50%',
    background: c.dot, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size < 30 ? '11px' : '13px', fontWeight: '700',
    flexShrink: 0,
  };
}

/**
 * Retorna estilo inline para badge/chip de usuário.
 */
export function getUserBadgeStyle(userId) {
  const c = getUserColor(userId);
  return {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '2px 8px', borderRadius: '20px',
    background: c.bg, color: c.text,
    fontSize: '11px', fontWeight: '600',
  };
}
