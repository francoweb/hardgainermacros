/**
 * APP — entry point / orchestrator
 * =============================================================================
 * Inicializa o router e despacha cada página para o seu renderer.
 * Páginas carregadas com dynamic import (lazy) para melhor performance.
 * Também monta header, footer e cookie banner.
 * =============================================================================
 */

import { initRouter, navigate } from './modules/router.js';
import { renderHeader, renderFooter, mountCookieBanner, mountHelpFab, mountBackToTop } from './components/ui.js';

const mount = () => document.getElementById('app-mount');

/**
 * Chamado sempre que a rota muda (incluindo carga inicial).
 * Aqui decidimos header, footer e o conteúdo principal.
 */
async function onRouteChange(page, path) {
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

  // Despachar para cada página (lazy)
  switch (page) {
    case 'home': {
      const { renderDadosFisicosPage } = await import('./pages/dados-fisicos.js');
      renderDadosFisicosPage(el);
      break;
    }
    case 'profile': {
      const { renderPerfilPage } = await import('./pages/perfil.js');
      renderPerfilPage(el);
      break;
    }
    case 'routine': {
      const { renderRotinaPage } = await import('./pages/rotina.js');
      renderRotinaPage(el);
      break;
    }
    case 'results': {
      const { renderResultadosPage } = await import('./pages/resultados.js');
      renderResultadosPage(el);
      break;
    }
    case 'plan': {
      const { renderPlanoPage } = await import('./pages/plano-14-dias.js');
      renderPlanoPage(el);
      break;
    }
    case 'privacy':
    case 'terms':
    case 'contact': {
      const { renderPrivacyPage, renderTermsPage, renderContactPage } = await import('./pages/legal.js');
      if (page === 'privacy') renderPrivacyPage(el);
      else if (page === 'terms') renderTermsPage(el);
      else renderContactPage(el);
      break;
    }
    case 'updates': {
      const { renderUpdatesPage } = await import('./pages/updates.js');
      renderUpdatesPage(el);
      break;
    }
    case 'faq': {
      const { renderFaqPage } = await import('./pages/faq.js');
      renderFaqPage(el);
      break;
    }
    case 'barcode': {
      const { renderBarcodeScannerPage } = await import('./pages/barcode-scanner.js');
      renderBarcodeScannerPage(el);
      break;
    }
    case 'blog': {
      const { renderBlogPage } = await import('./pages/blog.js');
      renderBlogPage(el);
      break;
    }
    case 'blog-post': {
      const { renderBlogPostPage } = await import('./pages/blog.js');
      renderBlogPostPage(el);
      break;
    }
    default: {
      const { renderDadosFisicosPage } = await import('./pages/dados-fisicos.js');
      renderDadosFisicosPage(el);
    }
  }

  // Tornar tooltips acessíveis via teclado e tap (após render assíncrono)
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
