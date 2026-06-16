/**
 * PÁGINA — Atualizações (/atualizacoes)
 * =============================================================================
 * Página pública (sem proteção de rota). Mostra as atualizações da ferramenta
 * em linguagem útil para o usuário, agrupadas por mês.
 * =============================================================================
 */

import { UPDATES } from '../data/updates.js';
import { icons }   from '../modules/icons.js';

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

// ─── Renderer ─────────────────────────────────────────────────────────────────

export function renderUpdatesPage(mount) {
  // Agrupar por mês (preserva a ordem — UPDATES já vem mais recente primeiro)
  const groupMap = new Map();
  UPDATES.forEach(u => {
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

  mount.innerHTML = `
    <div class="container">
      <div class="legal" style="padding: 36px clamp(20px, 5vw, 44px) 48px;">
        <a href="/" data-route class="legal-back">${icons.arrowLeft(14)} Voltar ao início</a>
        <h1 class="hero-title">Atualizações</h1>
        <p class="legal-meta">Últimas melhorias, novas funcionalidades e correções da ferramenta.</p>
        <div id="updates-list">
          ${groupsHtml}
        </div>
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

      @media (max-width: 420px) {
        .upd-card      { padding: 14px 16px; }
        .upd-date      { margin-left: 0; width: 100%; }
      }
    </style>
  `;
}
