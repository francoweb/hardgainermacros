/**
 * PÁGINA — Perguntas Frequentes (/faq)
 * =============================================================================
 * Página pública (sem proteção de rota). Mostra as perguntas frequentes
 * agrupadas por categoria, com barra de pesquisa client-side.
 * =============================================================================
 */

import { FAQS }  from '../data/faqs.js';
import { icons } from '../modules/icons.js';

// ─── Agrupar FAQs por categoria ───────────────────────────────────────────────

function groupByCategory(faqs) {
  const map = new Map();
  faqs.forEach(f => {
    if (!map.has(f.category)) map.set(f.category, []);
    map.get(f.category).push(f);
  });
  return map;
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

export function renderFaqPage(mount) {
  const groups = groupByCategory(FAQS);

  const categoriesHtml = [...groups.entries()].map(([cat, items]) => `
    <div class="faq-cat" data-faq-cat="${cat}">
      <div class="faq-cat-title">${cat}</div>
      ${items.map(f => `
        <details class="faq-item"
          data-testid="faq-item"
          data-question="${f.question.replace(/"/g, '&quot;')}"
          data-answer="${f.answer.replace(/"/g, '&quot;')}"
          data-category="${f.category}"
          data-keywords="${f.keywords.join(',')}">
          <summary class="faq-question">${f.question}</summary>
          <div class="faq-answer">${f.answer}</div>
        </details>
      `).join('')}
    </div>
  `).join('');

  mount.innerHTML = `
    <div class="container">
      <div class="legal" style="padding: 36px clamp(20px, 5vw, 44px) 48px;">
        <a href="/" data-route class="legal-back">${icons.arrowLeft(14)} Voltar ao início</a>
        <h1 class="hero-title">Perguntas Frequentes</h1>
        <p class="legal-meta">Encontre respostas rápidas sobre como usar a ferramenta.</p>

        <div class="faq-search-wrap">
          <input
            type="text"
            id="faq-search"
            class="faq-search-input"
            placeholder="Buscar: PDF, macros, editar, alimento, cache…"
            autocomplete="off"
            inputmode="search">
        </div>

        <div id="faq-no-results" class="faq-no-results" style="display:none;">
          Nenhuma dúvida encontrada. Tente outra palavra ou use o
          <a href="/contato" data-route>Contato</a>.
        </div>

        <div id="faq-list">
          ${categoriesHtml}
        </div>
      </div>
    </div>

    <style>
      .faq-search-wrap   { margin-bottom: 28px; }
      .faq-search-input  { width: 100%; padding: 11px 16px; border: 1.5px solid var(--border);
                           border-radius: var(--r-md); font-size: 14px; font-family: var(--font-body);
                           background: var(--surface); color: var(--ink); box-sizing: border-box;
                           outline: none; transition: border-color 0.15s; }
      .faq-search-input:focus { border-color: var(--accent); }
      .faq-search-input::placeholder { color: var(--ink-faint); }

      .faq-no-results    { font-size: 14px; color: var(--ink-muted); line-height: 1.6;
                           padding: 16px; background: var(--surface-soft);
                           border: 1px solid var(--border); border-radius: var(--r-md);
                           margin-bottom: 16px; }
      .faq-no-results a  { color: var(--accent); text-decoration: none; font-weight: 500; }

      .faq-cat           { margin-bottom: 28px; }
      .faq-cat-title     { font-size: 12px; font-weight: 700; text-transform: uppercase;
                           letter-spacing: 0.08em; color: var(--ink-muted);
                           padding-bottom: 8px; margin-bottom: 10px;
                           border-bottom: 2px solid var(--border); }

      .faq-item          { background: var(--surface); border: 1px solid var(--border);
                           border-radius: var(--r-md); margin-bottom: 8px; overflow: hidden; }
      .faq-item[open]    { border-color: var(--accent-soft); }

      .faq-question      { display: flex; justify-content: space-between; align-items: center;
                           gap: 12px; padding: 14px 18px; cursor: pointer; list-style: none;
                           font-size: 14.5px; font-weight: 600; color: var(--ink); line-height: 1.4;
                           user-select: none; }
      .faq-question::-webkit-details-marker { display: none; }
      .faq-question::after { content: '▸'; font-size: 11px; color: var(--ink-muted);
                             flex-shrink: 0; transition: transform 0.2s; }
      .faq-item[open] .faq-question::after { transform: rotate(90deg); }

      .faq-answer        { padding: 0 18px 16px; font-size: 14px; color: var(--ink-soft);
                           line-height: 1.65; border-top: 1px solid var(--border-soft); padding-top: 12px; }

      @media (max-width: 420px) {
        .faq-question    { padding: 12px 14px; font-size: 14px; }
        .faq-answer      { padding: 10px 14px 14px; }
      }
    </style>
  `;

  // ── Lógica de pesquisa ────────────────────────────────────────────────
  const searchInput = document.getElementById('faq-search');
  const noResults   = document.getElementById('faq-no-results');
  const allItems    = mount.querySelectorAll('.faq-item');
  const allCats     = mount.querySelectorAll('.faq-cat');

  searchInput.addEventListener('input', () => {
    const term = searchInput.value.toLowerCase().trim();
    let anyVisible = false;

    allItems.forEach(item => {
      if (!term) {
        item.style.display = '';
        anyVisible = true;
        return;
      }
      const searchable = [
        item.dataset.question  || '',
        item.dataset.answer    || '',
        item.dataset.category  || '',
        item.dataset.keywords  || '',
      ].join(' ').toLowerCase();

      const match = searchable.includes(term);
      item.style.display = match ? '' : 'none';
      if (match) anyVisible = true;
    });

    // Ocultar categorias onde todos os itens estão escondidos
    allCats.forEach(cat => {
      const anyInCat = [...cat.querySelectorAll('.faq-item')].some(
        i => i.style.display !== 'none'
      );
      cat.style.display = anyInCat ? '' : 'none';
    });

    noResults.style.display = anyVisible ? 'none' : '';
  });
}
