/**
 * COMPONENTS — UI pieces partilhadas entre páginas
 */

import { icons } from '../modules/icons.js';
import { session, K, resetAll } from '../modules/storage.js';

/* ---------- HEADER ---------- */
export function renderHeader({ showEdit = false, onEdit, onReset } = {}) {
  const actions = [];
  if (showEdit) {
    actions.push(`<button class="btn-header" id="hdr-edit">${icons.edit(14)} Editar</button>`);
  }
  actions.push(`<button class="btn-icon" id="hdr-reset" aria-label="Reiniciar">${icons.refresh(18)}</button>`);

  const html = `
    <header class="header">
      <div class="header-inner">
        <a href="/" data-route class="brand" aria-label="Hardgainer Macros — início">
          <div class="brand-icon">${icons.dumbbell(22)}</div>
          <div class="brand-text">
            <h1>Hardgainer Macros</h1>
            <p>Calculadora especializada para ectomorfos</p>
          </div>
        </a>
        <div class="header-actions">
          ${actions.join('')}
        </div>
      </div>
    </header>
  `;

  // Inserir no DOM
  const mount = document.getElementById('header-mount');
  if (mount) mount.innerHTML = html;

  // Event listeners
  const editBtn = document.getElementById('hdr-edit');
  if (editBtn && onEdit) editBtn.addEventListener('click', onEdit);

  const resetBtn = document.getElementById('hdr-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (onReset) { onReset(); return; }
      openModal(`
        <div class="modal-head">
          <div>
            <div class="modal-title">⚠️ Resetar a app</div>
          </div>
          <button type="button" class="modal-close" data-modal-close aria-label="Fechar">${icons.x(18)}</button>
        </div>
        <div class="modal-body">
          <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:var(--ink);">Tem certeza que deseja resetar a app?</p>
          <p style="margin:0 0 20px;font-size:13px;color:var(--ink-muted);line-height:1.6;">
            Isto vai apagar os dados guardados neste navegador, incluindo <strong>perfil, plano gerado, substituições, alimentos adicionados e alimentos personalizados</strong>.
          </p>
          <div class="btn-row" style="flex-wrap:wrap;">
            <button type="button" class="btn btn-secondary" data-modal-close>Cancelar</button>
            <button type="button" class="btn btn-danger" id="btn-confirm-reset" data-testid="btn-confirm-reset">Sim, apagar tudo</button>
          </div>
        </div>
      `);
      document.getElementById('btn-confirm-reset')?.addEventListener('click', () => {
        resetAll();
        location.href = '/';
      });
    });
  }
}

/* ---------- FOOTER ---------- */
export function renderFooter() {
  const year = new Date().getFullYear();
  const html = `
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <span class="brand-icon">${icons.dumbbell(18)}</span>
          <span>HardgainerMacros.com</span>
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
        </div>
        <div class="footer-meta">
          © ${year} Todos os direitos reservados<br>
          Esta ferramenta é apenas para fins educacionais e não substitui acompanhamento profissional.<br>
          Baseado no Sistema de Alimentação Híbrida para Hardgainers.<br>
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
