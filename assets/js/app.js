/**
 * APP — entry point / orchestrator
 * =============================================================================
 * Inicializa o router e despacha cada página para o seu renderer.
 * Também monta header, footer e cookie banner.
 * =============================================================================
 */

import { initRouter, navigate } from './modules/router.js';
import { renderHeader, renderFooter, mountCookieBanner, mountHelpFab, mountBackToTop } from './components/ui.js';

import { renderDadosFisicosPage } from './pages/dados-fisicos.js';
import { renderPerfilPage } from './pages/perfil.js';
import { renderRotinaPage } from './pages/rotina.js';
import { renderResultadosPage } from './pages/resultados.js';
import { renderPlanoPage } from './pages/plano-14-dias.js';
import { renderPrivacyPage, renderTermsPage, renderContactPage } from './pages/legal.js';
import { renderUpdatesPage } from './pages/updates.js';
import { renderFaqPage }     from './pages/faq.js';

const mount = () => document.getElementById('app-mount');

/**
 * Chamado sempre que a rota muda (incluindo carga inicial).
 * Aqui decidimos header, footer e o conteúdo principal.
 */
function onRouteChange(page, path) {
  const el = mount();
  if (!el) return;

  renderHeader();
  renderFooter();
  mountCookieBanner();
  mountHelpFab(page);
  mountBackToTop();

  // Animação de entrada
  el.classList.remove('page-enter');
  // force reflow
  void el.offsetWidth;
  el.classList.add('page-enter');

  // Despachar para cada página
  switch (page) {
    case 'home':     renderDadosFisicosPage(el); break;
    case 'profile':  renderPerfilPage(el); break;
    case 'routine':  renderRotinaPage(el); break;
    case 'results':  renderResultadosPage(el); break;
    case 'plan':     renderPlanoPage(el); break;
    case 'privacy':  renderPrivacyPage(el); break;
    case 'terms':    renderTermsPage(el); break;
    case 'contact':  renderContactPage(el); break;
    case 'updates':  renderUpdatesPage(el); break;
    case 'faq':      renderFaqPage(el);     break;
    default:         renderDadosFisicosPage(el);
  }

  // Tornar tooltips acessíveis via teclado e tap (adicionado após render síncrono)
  el.querySelectorAll('.label-help').forEach(tip => {
    if (!tip.hasAttribute('tabindex')) tip.setAttribute('tabindex', '0');
  });
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

  // Handler delegado para fechar/abrir tooltip com tap (touch devices)
  document.addEventListener('click', (e) => {
    const help = e.target.closest('.label-help');
    const wasOpen = help && help.classList.contains('tooltip-open');
    document.querySelectorAll('.label-help.tooltip-open').forEach(el => el.classList.remove('tooltip-open'));
    if (help && !wasOpen) help.classList.add('tooltip-open');
  });
});
