/**
 * COMPONENTS — UI pieces partilhadas entre páginas
 */

import { icons } from '../modules/icons.js';
import { session, K, resetAll } from '../modules/storage.js';

/* ---------- HEADER ---------- */
export function renderHeader() {
  // Se o header já existe, apenas actualiza o link activo e sai
  const existing = document.querySelector('.site-header');
  if (existing) {
    const path = location.pathname;
    existing.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      link.classList.toggle('active', href === path || (href !== '/' && path.startsWith(href)));
    });
    return;
  }

  const nav = document.createElement('header');
  nav.className = 'site-header';
  nav.innerHTML = `
    <div class="header-inner">
      <a href="/" data-route class="header-logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="header-logo-img" width="32" height="32" aria-label="Hardgainer Macros">
          <rect width="24" height="24" rx="6" fill="#c26d5a"/>
          <g fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.4 14.4 9.6 9.6"/>
            <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/>
            <path d="m21.5 21.5-1.4-1.4"/>
            <path d="M3.9 3.9 2.5 2.5"/>
            <path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"/>
          </g>
        </svg>
        <div class="header-logo-text">
          <span class="header-logo-name">Hardgainer Macros</span>
          <span class="header-logo-sub">Calculadora especializada para ectomorfos</span>
        </div>
      </a>

      <button class="header-hamburger" id="hamburger" aria-label="Abrir menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>

      <nav class="header-nav" id="header-nav">
        <a href="/" data-route class="nav-link">Início</a>
        <a href="/blog" data-route class="nav-link">Blog</a>
        <a href="/faq" data-route class="nav-link">FAQ</a>
        <a href="/atualizacoes" data-route class="nav-link">Novidades</a>
      </nav>

      <button class="header-reset-btn" id="header-reset" aria-label="Resetar dados" title="Apagar dados e recomeçar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1 4 1 10 7 10"></polyline>
          <path d="M3.51 15a9 9 0 1 0 .49-3.51"></path>
        </svg>
      </button>
    </div>
  `;
  document.body.prepend(nav);

  // Reset de dados
  const resetBtn = nav.querySelector('#header-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const overlay = document.createElement('div');
      overlay.className = 'reset-modal-overlay';
      overlay.innerHTML = `
        <div class="reset-modal">
          <h3 class="reset-modal-title">Resetar dados?</h3>
          <p class="reset-modal-text">Todos os seus dados serão apagados e você voltará ao início. Essa ação não pode ser desfeita.</p>
          <div class="reset-modal-actions">
            <button class="reset-modal-cancel">Cancelar</button>
            <button class="reset-modal-confirm">Sim, resetar</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });

      overlay.querySelector('.reset-modal-cancel').addEventListener('click', () => {
        overlay.remove();
      });

      overlay.querySelector('.reset-modal-confirm').addEventListener('click', () => {
        overlay.remove();
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
      });
    });
  }

  // Hamburger toggle
  const hamburger = nav.querySelector('#hamburger');
  const headerNav = nav.querySelector('#header-nav');
  hamburger.addEventListener('click', () => {
    const open = headerNav.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open);
  });

  // Fechar menu ao clicar num link
  headerNav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      headerNav.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', false);
    });
  });

  // Marcar link activo
  function setActive() {
    const path = location.pathname;
    headerNav.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      link.classList.toggle('active', href === path || (href !== '/' && path.startsWith(href)));
    });
  }
  setActive();
  window.addEventListener('popstate', setActive);
}

/* ---------- FOOTER ---------- */
export function renderFooter() {
  const year = new Date().getFullYear();
  const html = `
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <a href="/" data-route class="footer-logo-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="footer-logo-img" width="32" height="32" aria-label="Hardgainer Macros">
              <rect width="24" height="24" rx="6" fill="#c26d5a"/>
              <g fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.4 14.4 9.6 9.6"/>
                <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/>
                <path d="m21.5 21.5-1.4-1.4"/>
                <path d="M3.9 3.9 2.5 2.5"/>
                <path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"/>
              </g>
            </svg>
            <span class="footer-logo-name">HardgainerMacros.com</span>
          </a>
        </div>
        <div class="footer-links">
          <a href="/politica-de-privacidade" data-route>Política de Privacidade</a>
          <span class="footer-sep">•</span>
          <a href="/termos-de-uso" data-route>Termos de Uso</a>
          <span class="footer-sep">•</span>
          <a href="/contato" data-route>Contato</a>
          <span class="footer-sep">•</span>
          <a href="/atualizacoes" data-route>Atualizações</a>
          <span class="footer-sep">•</span>
          <a href="/faq" data-route>FAQ</a>
          <span class="footer-sep">•</span>
          <a href="/blog" data-route>Blog</a>
        </div>
        <div class="footer-meta">
          © ${year} Todos os direitos reservados<br>
          Esta ferramenta é apenas para fins educacionais e não substitui acompanhamento profissional.<br>
          Baseado no <a href="https://hardgainerhibrido.com/" target="_blank" rel="noopener noreferrer">Sistema de Alimentação Híbrida</a> para Hardgainers.<br>
          Ferramenta desenvolvida por <a href="https://www.instagram.com/marcofrancooficial" target="_blank" rel="noopener">@marcofrancooficial</a>
        </div>
      </div>
    </footer>
  `;
  const mount = document.getElementById('footer-mount');
  if (mount) mount.innerHTML = html;
}

/* ---------- STEPPER ---------- */
const STEPS = [
  { key: 'form', label: 'Dados Físicos' },
  { key: 'profile', label: 'Perfil' },
  { key: 'routine', label: 'Rotina' },
  { key: 'results', label: 'Resultados' },
];

/**
 * currentStep: 1..4 (o plano de 14 dias não aparece no stepper — é uma ação posterior)
 */
export function renderStepper(currentStep) {
  const items = [];
  STEPS.forEach((s, i) => {
    const num = i + 1;
    const isDone = num < currentStep;
    const isActive = num === currentStep;
    const cls = isDone ? 'step done' : isActive ? 'step active' : 'step';
    const inner = isDone ? icons.check(16) : num;
    items.push(`
      <div class="${cls}">
        <div class="step-circle">${inner}</div>
        <div class="step-label">${s.label}</div>
      </div>
    `);
    if (i < STEPS.length - 1) {
      items.push(`<div class="step-line ${num < currentStep ? 'done' : ''}"></div>`);
    }
  });
  return `<div class="stepper">${items.join('')}</div>`;
}

/* ---------- COOKIE BANNER ---------- */
export function mountCookieBanner() {
  const accepted = localStorage.getItem('hg:cookies');
  if (accepted) return;

  const html = `
    <div class="cookie show" id="cookie-banner" role="dialog" aria-label="Preferências de cookies">
      <p>
        Usamos armazenamento local para salvar seu progresso nesta calculadora
        e funcionar corretamente. Não compartilhamos seus dados.
        <a href="/politica-de-privacidade" data-route>Saber mais</a>.
      </p>
      <div class="cookie-row">
        <button class="btn btn-primary" id="cookie-accept">Aceitar</button>
        <button class="btn btn-ghost" id="cookie-refuse">Recusar</button>
      </div>
    </div>
  `;

  let mount = document.getElementById('cookie-mount');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'cookie-mount';
    document.body.appendChild(mount);
  }
  mount.innerHTML = html;

  document.getElementById('cookie-accept').addEventListener('click', () => {
    localStorage.setItem('hg:cookies', 'accepted');
    document.getElementById('cookie-banner').remove();
  });
  document.getElementById('cookie-refuse').addEventListener('click', () => {
    localStorage.setItem('hg:cookies', 'refused');
    document.getElementById('cookie-banner').remove();
  });
}

/* ---------- HELP FAB ---------- */
/**
 * Monta o botão flutuante de ajuda no canto inferior direito.
 *
 * @param {string} currentPage — nome da página actual (ex.: 'faq', 'home', 'plan')
 *
 * Estados:
 *  - Normal:    mostra [×] [?]. Clicar em ? → /faq. Clicar em × → minimiza.
 *  - Minimizado: mostra apenas [? Ajuda] pequeno. Clicar → restaura estado normal.
 *
 * Persistência: hg:help-minimized em sessionStorage.
 * Chaves antigas (hg:help-x-hidden) são ignoradas sem quebrar nada.
 */
export function mountHelpFab(currentPage) {
  // Remover FAB existente ao navegar (evita duplicatas)
  const existing = document.getElementById('help-fab');
  if (existing) existing.remove();

  // Não aparecer na própria FAQ
  if (currentPage === 'faq') return;

  // Verificar estado inicial
  let minimized = false;
  try {
    minimized = !!sessionStorage.getItem('hg:help-minimized');
  } catch {}

  const fab = document.createElement('div');
  fab.id = 'help-fab';
  fab.className = 'help-fab' + (minimized ? ' is-minimized' : '');
  fab.setAttribute('data-testid', 'help-fab');
  fab.innerHTML = `
    <button
      class="help-fab-dismiss"
      id="help-fab-dismiss"
      aria-label="Minimizar ajuda"
      title="Minimizar">×</button>
    <button
      class="help-fab-btn"
      id="help-fab-btn"
      aria-label="Ajuda"
      title="Ajuda">?</button>
    <button
      class="help-fab-restore"
      id="help-fab-restore"
      aria-label="Abrir ajuda"
      title="Abrir ajuda">? Ajuda</button>
  `;

  document.body.appendChild(fab);

  // ? → navegar para /faq
  document.getElementById('help-fab-btn').addEventListener('click', () => {
    import('../modules/router.js').then(({ navigate }) => navigate('/faq'));
  });

  // × → minimizar
  document.getElementById('help-fab-dismiss').addEventListener('click', () => {
    fab.classList.add('is-minimized');
    try { sessionStorage.setItem('hg:help-minimized', '1'); } catch {}
  });

  // botão minimizado → restaurar
  document.getElementById('help-fab-restore').addEventListener('click', () => {
    fab.classList.remove('is-minimized');
    try { sessionStorage.removeItem('hg:help-minimized'); } catch {}
  });
}

/* ---------- BACK TO TOP ---------- */
/**
 * Monta o botão flutuante "Voltar ao topo" — componente global.
 * Remove instância anterior antes de criar (seguro em SPA).
 * O listener de scroll auto-remove quando o botão deixa de existir.
 */
export function mountBackToTop() {
  // Remover botão anterior (evita duplicatas em navegação SPA)
  const existing = document.getElementById('back-to-top-btn');
  if (existing) existing.remove();

  const btn = document.createElement('button');
  btn.id = 'back-to-top-btn';
  btn.className = 'no-print';
  btn.setAttribute('aria-label', 'Voltar ao topo');
  btn.setAttribute('title', 'Voltar ao topo');
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>';
  btn.style.cssText = [
    'position:fixed', 'bottom:28px', 'right:28px',
    'width:36px', 'height:36px', 'border-radius:50%',
    'background:#c26d5a', 'color:#fff', 'border:none',
    'cursor:pointer', 'display:none', 'align-items:center', 'justify-content:center',
    'box-shadow:0 1px 5px rgba(194,109,90,0.25)',
    'z-index:900', 'transition:transform 0.15s ease,box-shadow 0.15s ease,background 0.15s ease',
    'outline:none',
  ].join(';');
  document.body.appendChild(btn);

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'translateY(-1px)';
    btn.style.background = '#b45d4a';
    btn.style.boxShadow = '0 4px 12px rgba(194,109,90,0.32)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
    btn.style.background = '#c26d5a';
    btn.style.boxShadow = '0 2px 8px rgba(194,109,90,0.25)';
  });

  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  const onScroll = () => {
    // Auto-limpa o listener quando o botão deixa de existir (navegação SPA)
    if (!document.getElementById('back-to-top-btn')) {
      window.removeEventListener('scroll', onScroll);
      return;
    }
    btn.style.display = window.scrollY > 300 ? 'flex' : 'none';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ---------- MODAL (substituição) ---------- */
export function openModal(contentHtml, onClose) {
  let mount = document.getElementById('modal-mount');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'modal-mount';
    document.body.appendChild(mount);
  }
  mount.innerHTML = `<div class="modal-backdrop show" id="modal-bd"><div class="modal" role="dialog">${contentHtml}</div></div>`;

  const close = () => {
    mount.innerHTML = '';
    if (onClose) onClose();
  };
  const bd = document.getElementById('modal-bd');
  bd.addEventListener('click', (e) => { if (e.target === bd) close(); });
  document.querySelectorAll('[data-modal-close]').forEach(btn => btn.addEventListener('click', close));

  const esc = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } };
  document.addEventListener('keydown', esc);

  return close;
}
