/**
 * APP — entry point / orchestrator
 * =============================================================================
 * Inicializa o router e despacha cada página para o seu renderer.
 * Também monta header, footer e cookie banner.
 * =============================================================================
 */

import { initRouter, navigate } from './modules/router.js';
import { renderHeader, renderFooter, mountCookieBanner } from './components/ui.js';

import { renderDadosFisicosPage } from './pages/dados-fisicos.js';
import { renderPerfilPage } from './pages/perfil.js';
import { renderRotinaPage } from './pages/rotina.js';
import { renderResultadosPage } from './pages/resultados.js';
import { renderPlanoPage } from './pages/plano-14-dias.js';
import { renderPrivacyPage, renderTermsPage, renderContactPage } from './pages/legal.js';

const mount = () => document.getElementById('app-mount');

/**
 * Chamado sempre que a rota muda (incluindo carga inicial).
 * Aqui decidimos header, footer e o conteúdo principal.
 */
function onRouteChange(page, path) {
  const el = mount();
  if (!el) return;

  // O header varia conforme a página (em /resultados e /plano-14-dias aparece o botão Editar)
  const showEdit = page === 'results' || page === 'plan';
  renderHeader({
    showEdit,
    onEdit: showEdit ? () => navigate('/') : undefined,
  });
  renderFooter();
  mountCookieBanner();

  // Animação de entrada
  el.classList.remove('page-enter');
  // force reflow
  void el.offsetWidth;
  el.classList.add('page-enter');

  // Despachar para cada página
  switch (page) {
    case 'home':     return renderDadosFisicosPage(el);
    case 'profile':  return renderPerfilPage(el);
    case 'routine':  return renderRotinaPage(el);
    case 'results':  return renderResultadosPage(el);
    case 'plan':     return renderPlanoPage(el);
    case 'privacy':  return renderPrivacyPage(el);
    case 'terms':    return renderTermsPage(el);
    case 'contact':  return renderContactPage(el);
    default:         return renderDadosFisicosPage(el);
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  // GitHub Pages SPA fallback: se o 404.html guardou um redirect, aplicamos
  try {
    const redirect = sessionStorage.getItem('spa-redirect');
    if (redirect && redirect !== '/' && redirect !== location.pathname) {
      sessionStorage.removeItem('spa-redirect');
      history.replaceState({}, '', redirect);
    }
  } catch {}

  initRouter(onRouteChange);
});
