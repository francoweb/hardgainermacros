/**
 * ROUTER — SPA routing com proteção de rotas
 * =============================================================================
 * Regras de proteção:
 *   /                 -> sempre acessível (step 1)
 *   /perfil           -> requer step1_done na sessão
 *   /rotina           -> requer step1_done E step2_done na sessão
 *   /resultados       -> requer results_ready na sessão (e dados válidos)
 *   /plano-14-dias    -> requer plan_ready na sessão
 *   /politica-de-privacidade, /termos-de-uso, /contato -> sempre acessíveis
 *
 * A decisão de qual página renderizar é feita ANTES de desenhar qualquer coisa.
 * Se a rota não é válida, redirecionamos (history.replaceState) e renderizamos
 * a home — o utilizador nunca vê conteúdo errado.
 * =============================================================================
 */

import { session, K } from './storage.js';

const ROUTES = {
  '/': { page: 'home', protected: false },
  '/perfil': { page: 'profile', protected: true, requires: [K.STEP1_DONE] },
  '/rotina': { page: 'routine', protected: true, requires: [K.STEP1_DONE, K.STEP2_DONE] },
  '/resultados': { page: 'results', protected: true, requires: [K.RESULTS_READY] },
  '/plano-14-dias': { page: 'plan', protected: true, requires: [K.PLAN_READY] },
  '/politica-de-privacidade': { page: 'privacy', protected: false },
  '/termos-de-uso': { page: 'terms', protected: false },
  '/contato': { page: 'contact', protected: false },
};

let handler = null;

/**
 * Resolve a rota atual, aplicando proteção se necessário.
 * Retorna o nome da página a renderizar.
 */
function resolve(path) {
  const route = ROUTES[path];
  if (!route) {
    // rota desconhecida -> home
    history.replaceState({}, '', '/');
    return 'home';
  }
  if (route.protected) {
    const ok = route.requires.every(k => session.has(k));
    if (!ok) {
      // redireciona silenciosamente para home
      history.replaceState({}, '', '/');
      return 'home';
    }
  }
  return route.page;
}

/**
 * Navega para uma rota.
 */
export function navigate(path, { replace = false } = {}) {
  const page = resolve(path);
  // atualiza URL se ainda não está lá
  if (location.pathname !== path && ROUTES[path] && !replace) {
    history.pushState({}, '', path);
  }
  render(page);
}

/**
 * Chama o handler com a página resolvida.
 */
function render(page) {
  if (handler) handler(page, location.pathname);
  // scroll to top suavemente
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/**
 * Inicia o router.
 */
export function initRouter(onRouteChange) {
  handler = onRouteChange;
  // intercepta todos os links com data-route
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-route]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href) return;
    // se é externo ou abre em nova tab, deixa o browser lidar
    if (link.target === '_blank' || href.startsWith('http') || href.startsWith('mailto:')) return;
    e.preventDefault();
    navigate(href);
  });

  // lida com back/forward
  window.addEventListener('popstate', () => {
    const page = resolve(location.pathname);
    render(page);
  });

  // renderiza inicial
  const page = resolve(location.pathname);
  render(page);
}

/**
 * Usado quando o utilizador completa uma etapa válida.
 */
export function markProgress(key) {
  session.set(key, true);
}
