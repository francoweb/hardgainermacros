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
      if (confirm('Reiniciar tudo? Os seus dados preenchidos serão apagados.')) {
        resetAll();
        location.href = '/';
      }
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
        Usamos armazenamento local para guardar o seu progresso nesta calculadora
        e funcionar corretamente. Não partilhamos os seus dados.
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
  const closeBtn = document.querySelector('[data-modal-close]');
  if (closeBtn) closeBtn.addEventListener('click', close);

  const esc = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } };
  document.addEventListener('keydown', esc);

  return close;
}
