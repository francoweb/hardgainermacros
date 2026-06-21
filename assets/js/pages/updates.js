/**
 * PÁGINA — Atualizações (/atualizacoes)
 * =============================================================================
 * Página pública (sem proteção de rota). Mostra as atualizações da ferramenta
 * em linguagem útil para o usuário, agrupadas por mês, com paginação.
 * =============================================================================
 */

import { UPDATES } from '../data/updates.js';
import { icons }   from '../modules/icons.js';

// ─── Configuração ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 6;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const MONTHS_SHORT = [
  'jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.',
  'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.',
];

/** "2026-06-16" → "Junho 2026" */
function monthLabel(isoDate) {
  const [year, m] = isoDate.split('-');
  return `${MONTHS_PT[parseInt(m, 10) - 1]} ${year}`;
}

/** "2026-06-16" → "16 de jun. de 2026" */
function dateLabel(isoDate) {
  const [year, m, d] = isoDate.split('-').map(Number);
  return `${d} de ${MONTHS_SHORT[m - 1]} de ${year}`;
}

/** Cor do badge por tipo de atualização */
function badgeStyle(type) {
  if (type === 'Nova funcionalidade') return 'background:#e3ebd7;color:#3a5e2a;';
  if (type === 'Melhoria')            return 'background:#fbeee8;color:#a35342;';
  if (type === 'Correção')            return 'background:#e8eef5;color:#2d5a8e;';
  return 'background:var(--surface-soft);color:var(--ink-muted);';
}

// ─── Renderização da lista + paginação ───────────────────────────────────────

/**
 * Renderiza as entradas da página atual e o controlo de paginação
 * dentro do elemento #updates-list, sem tocar no resto da página.
 *
 * @param {HTMLElement} listEl  — o elemento #updates-list já no DOM
 * @param {number}      page   — página actual (1-indexed)
 */
function renderUpdatesContent(listEl, page) {
  const totalPages = Math.ceil(UPDATES.length / PAGE_SIZE);
  const safePage   = Math.max(1, Math.min(page, totalPages));
  const start      = (safePage - 1) * PAGE_SIZE;
  const slice      = UPDATES.slice(start, start + PAGE_SIZE);

  // Agrupar por mês dentro da fatia atual
  const groupMap = new Map();
  slice.forEach(u => {
    const key = monthLabel(u.date);
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key).push(u);
  });

  const groupsHtml = [...groupMap.entries()].map(([month, entries]) => `
    <div class="upd-group" data-testid="upd-group">
      <div class="upd-month-label">${month}</div>
      ${entries.map(u => `
        <div class="upd-card ${u.highlight ? 'upd-card--highlight' : ''}" data-testid="upd-card">
          <div class="upd-card-meta">
            <span class="upd-badge" style="${badgeStyle(u.type)}">${u.type}</span>
            ${u.highlight ? '<span class="upd-star">★ Destaque</span>' : ''}
            <span class="upd-date">${dateLabel(u.date)}</span>
          </div>
          <div class="upd-title">${u.title}</div>
          <div class="upd-desc">${u.description}</div>
          ${u.tags && u.tags.length ? `
            <div class="upd-tags">
              ${u.tags.map(t => `<span class="upd-tag">${t}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `).join('');

  // Paginação — só aparece se existir mais do que uma página
  const paginationHtml = totalPages > 1 ? `
    <nav class="upd-pagination" data-testid="upd-pagination" aria-label="Paginação de atualizações">
      <button
        class="upd-pg-btn"
        data-pg-prev
        data-testid="upd-pg-prev"
        ${safePage === 1 ? 'disabled aria-disabled="true"' : ''}
        aria-label="Página anterior">← Anterior</button>

      <div class="upd-pg-nums">
        ${Array.from({ length: totalPages }, (_, i) => i + 1).map(p => `
          <button
            class="upd-pg-num${p === safePage ? ' upd-pg-num--active' : ''}"
            data-pg-num="${p}"
            data-testid="upd-pg-num"
            aria-label="Página ${p}"
            aria-current="${p === safePage ? 'page' : 'false'}"
          >${p}</button>
        `).join('')}
      </div>

      <button
        class="upd-pg-btn"
        data-pg-next
        data-testid="upd-pg-next"
        ${safePage === totalPages ? 'disabled aria-disabled="true"' : ''}
        aria-label="Próxima página">Próxima →</button>
    </nav>
  ` : '';

  listEl.innerHTML = groupsHtml + paginationHtml;

  // Scroll suave para o topo da lista ao trocar de página
  function scrollToList() {
    const top = listEl.getBoundingClientRect().top + window.scrollY - 20;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  // Evento: Anterior
  const prevBtn = listEl.querySelector('[data-pg-prev]');
  if (prevBtn && !prevBtn.disabled) {
    prevBtn.addEventListener('click', () => {
      scrollToList();
      renderUpdatesContent(listEl, safePage - 1);
    });
  }

  // Evento: Próxima
  const nextBtn = listEl.querySelector('[data-pg-next]');
  if (nextBtn && !nextBtn.disabled) {
    nextBtn.addEventListener('click', () => {
      scrollToList();
      renderUpdatesContent(listEl, safePage + 1);
    });
  }

  // Evento: número de página
  listEl.querySelectorAll('[data-pg-num]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.pgNum, 10);
      if (p !== safePage) {
        scrollToList();
        renderUpdatesContent(listEl, p);
      }
    });
  });
}

// ─── Renderer principal ────────────────────────────────────────────────────────

export function renderUpdatesPage(mount) {
  mount.innerHTML = `
    <div class="container">
      <div class="legal" style="padding: 36px clamp(20px, 5vw, 44px) 48px;">
        <a href="/" data-route class="legal-back">${icons.arrowLeft(14)} Voltar ao início</a>
        <h1 class="hero-title">Atualizações</h1>
        <p class="legal-meta">Últimas melhorias, novas funcionalidades e correções da ferramenta.</p>
        <div id="updates-list"></div>
      </div>
    </div>

    <style>
      .upd-group       { margin-bottom: 32px; }
      .upd-month-label { font-size: 12px; font-weight: 700; text-transform: uppercase;
                         letter-spacing: 0.08em; color: var(--ink-muted);
                         padding-bottom: 8px; margin-bottom: 14px;
                         border-bottom: 2px solid var(--border); }
      .upd-card        { background: var(--surface); border: 1px solid var(--border);
                         border-radius: var(--r-md); padding: 18px 20px;
                         margin-bottom: 12px; }
      .upd-card--highlight { background: var(--accent-softer);
                             border-color: var(--accent-soft); }
      .upd-card-meta   { display: flex; align-items: center; gap: 8px;
                         flex-wrap: wrap; margin-bottom: 10px; }
      .upd-badge       { font-size: 11px; font-weight: 700; padding: 3px 9px;
                         border-radius: var(--r-pill); }
      .upd-star        { font-size: 11px; font-weight: 700; color: var(--accent); }
      .upd-date        { font-size: 12px; color: var(--ink-muted); margin-left: auto; }
      .upd-title       { font-size: 16px; font-weight: 700; color: var(--ink);
                         margin-bottom: 6px; }
      .upd-desc        { font-size: 14px; color: var(--ink-soft); line-height: 1.6; }
      .upd-tags        { margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap; }
      .upd-tag         { font-size: 11px; padding: 2px 8px; border-radius: var(--r-pill);
                         background: var(--surface-soft); border: 1px solid var(--border);
                         color: var(--ink-muted); }

      /* Paginação */
      .upd-pagination  { display: flex; align-items: center; justify-content: center;
                         gap: 6px; flex-wrap: wrap; margin-top: 32px; padding-top: 20px;
                         border-top: 1px solid var(--border); }
      .upd-pg-nums     { display: flex; gap: 4px; }
      .upd-pg-btn,
      .upd-pg-num      { font-size: 13px; font-weight: 600; padding: 7px 14px;
                         border: 1px solid var(--border); border-radius: var(--r-md);
                         background: var(--surface); color: var(--ink);
                         cursor: pointer; transition: background 0.12s, border-color 0.12s; }
      .upd-pg-btn:hover:not(:disabled),
      .upd-pg-num:hover { background: var(--surface-soft); border-color: var(--ink-muted); }
      .upd-pg-num--active { background: var(--accent); color: #fff;
                            border-color: var(--accent); cursor: default; }
      .upd-pg-btn:disabled { opacity: 0.35; cursor: not-allowed; }

      @media (max-width: 420px) {
        .upd-card        { padding: 14px 16px; }
        .upd-date        { margin-left: 0; width: 100%; }
        .upd-pg-btn,
        .upd-pg-num      { font-size: 12px; padding: 6px 11px; }
      }
    </style>
  `;

  const listEl = document.getElementById('updates-list');
  renderUpdatesContent(listEl, 1);
}
