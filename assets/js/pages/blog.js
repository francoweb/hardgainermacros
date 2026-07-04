/**
 * PÁGINA — Blog (/blog)
 * =============================================================================
 * Listagem pública de todos os artigos, agrupados por categoria,
 * com filtro por categoria e navegação SPA para /blog/:slug.
 * =============================================================================
 */

import { BLOG_POSTS } from '../data/blog-posts.js';
import { navigate }   from '../modules/router.js';

// ─── Agrupa posts por categoria ────────────────────────────────────────────────

function groupByCategory(posts) {
  const map = new Map();
  posts.forEach(p => {
    if (!map.has(p.category)) map.set(p.category, []);
    map.get(p.category).push(p);
  });
  return map;
}

// ─── Formata data para exibição ────────────────────────────────────────────────

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ─── Card de artigo ────────────────────────────────────────────────────────────

function renderCard(post) {
  return `
    <a href="/blog/${post.slug}" data-route class="blog-card" data-category="${post.category}">
      <div class="blog-card-thumb">
        <img src="${post.heroImage}" alt="${post.title}" loading="lazy" width="400" height="225" />
      </div>
      <span class="blog-card-cat">${post.category}</span>
      <h2 class="blog-card-title">${post.title}</h2>
      <p class="blog-card-excerpt">${post.excerpt}</p>
      <div class="blog-card-meta">
        <span class="blog-card-date">${formatDate(post.publishDate)}</span>
        <span class="blog-card-read">${post.readTime} min de leitura</span>
      </div>
    </a>
  `;
}

// ─── Renderer ──────────────────────────────────────────────────────────────────

export function renderBlogPage(mount) {
  // Reset de SEO para a página de listagem
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
  canonical.href = 'https://hardgainermacros.com/blog';

  document.title = 'Blog Hardgainer | Nutrição e Treino para Ectomorfos';
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', 'Guias práticos sobre nutrição, treino e estratégias para hardgainers e ectomorfos ganharem massa muscular de verdade.');

  const setMeta = (sel, attr, val) => {
    let el = document.querySelector(sel);
    if (!el) { el = document.createElement('meta'); document.head.appendChild(el); }
    el.setAttribute(attr, val);
  };
  setMeta('meta[property="og:title"]',       'property', 'Blog Hardgainer | Nutrição e Treino para Ectomorfos');
  setMeta('meta[property="og:description"]', 'property', 'Guias práticos sobre nutrição, treino e estratégias para hardgainers e ectomorfos ganharem massa muscular de verdade.');
  setMeta('meta[property="og:url"]',         'property', 'https://hardgainermacros.com/blog');
  setMeta('meta[property="og:type"]',        'property', 'website');

  const oldSchema = document.getElementById('schema-article');
  if (oldSchema) oldSchema.remove();

  const categories = [...new Set(BLOG_POSTS.map(p => p.category))];

  const filtersHtml = categories.map(cat => `
    <button class="blog-filter-btn" data-cat="${cat}">${cat}</button>
  `).join('');

  let currentPage = 1;
  const POSTS_PER_PAGE = 10;
  let activeFilter = 'Todos';

  mount.innerHTML = `
    <div class="container">
      <div class="blog-listing">

        <header class="blog-header">
          <a href="/" data-route class="blog-back">← Voltar à calculadora</a>
          <h1 class="blog-hero-title">Blog Hardgainer</h1>
          <p class="blog-hero-sub">
            Guias práticos sobre nutrição, treino e estratégias para ectomorfos
            ganharem massa muscular de verdade.
          </p>
        </header>

        <div class="blog-filters" role="group" aria-label="Filtrar por categoria">
          <button class="blog-filter-btn active" data-cat="Todos">Todos</button>
          ${filtersHtml}
        </div>

        <div class="blog-grid"></div>
        <nav class="blog-pagination"></nav>

      </div>
    </div>
  `;

  function renderGrid(filter, page) {
    const filtered = filter === 'Todos'
      ? BLOG_POSTS
      : BLOG_POSTS.filter(p => p.category === filter);

    const totalPages = Math.ceil(filtered.length / POSTS_PER_PAGE);
    const start = (page - 1) * POSTS_PER_PAGE;
    const paginated = filtered.slice(start, start + POSTS_PER_PAGE);

    const grid = mount.querySelector('.blog-grid');
    const paginationEl = mount.querySelector('.blog-pagination');

    grid.innerHTML = paginated.length
      ? paginated.map(p => `
          <a href="/blog/${p.slug}" data-route class="blog-card">
            ${p.heroImage ? `<div class="blog-card-thumb"><img src="${p.heroImage}" alt="${p.title}" loading="lazy" width="400" height="225" /></div>` : ''}
            <span class="blog-card-cat">${p.category}</span>
            <p class="blog-card-title">${p.title}</p>
            <p class="blog-card-excerpt">${p.excerpt}</p>
            <div class="blog-card-meta">
              <span class="blog-card-date">${formatDate(p.publishDate)}</span>
              <span class="blog-card-read">${p.readTime} min de leitura</span>
            </div>
          </a>
        `).join('')
      : `<p class="blog-no-results">Nenhum artigo encontrado nesta categoria.</p>`;

    paginationEl.innerHTML = totalPages <= 1 ? '' : `
      <button class="blog-page-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>← Anterior</button>
      ${Array.from({ length: totalPages }, (_, i) => i + 1).map(n => `
        <button class="blog-page-btn ${n === page ? 'active' : ''}" data-page="${n}">${n}</button>
      `).join('')}
      <button class="blog-page-btn" data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}>Próxima →</button>
    `;

    paginationEl.querySelectorAll('.blog-page-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.dataset.page);
        renderGrid(activeFilter, currentPage);
        mount.querySelector('.blog-listing').scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  // ── Filtros ───────────────────────────────────────────────────────────────
  mount.querySelectorAll('.blog-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.cat;
      currentPage = 1;
      mount.querySelectorAll('.blog-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderGrid(activeFilter, currentPage);
    });
  });

  renderGrid(activeFilter, currentPage);
}

// ─── SEO meta dinâmico (OG + Twitter Card + Schema.org + canonical) ───────────

function updateSEOMeta(post) {
  const base = 'https://hardgainermacros.com';
  const url = base + '/blog/' + post.slug;

  const setMeta = (sel, attr, val) => {
    let el = document.querySelector(sel);
    if (!el) { el = document.createElement('meta'); document.head.appendChild(el); }
    el.setAttribute(attr, val);
  };

  // Open Graph
  setMeta('meta[property="og:title"]',       'property', post.title);
  setMeta('meta[property="og:description"]', 'property', post.metaDescription);
  setMeta('meta[property="og:url"]',         'property', url);
  setMeta('meta[property="og:type"]',        'property', 'article');
  setMeta('meta[property="og:site_name"]',   'property', 'Hardgainer Macros');

  // Twitter Card
  setMeta('meta[name="twitter:card"]',        'name', 'summary');
  setMeta('meta[name="twitter:title"]',       'name', post.title);
  setMeta('meta[name="twitter:description"]', 'name', post.metaDescription);

  // Canonical dinâmico
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
  canonical.href = url;

  // Schema.org Article
  let schema = document.getElementById('schema-article');
  if (!schema) { schema = document.createElement('script'); schema.id = 'schema-article'; schema.type = 'application/ld+json'; document.head.appendChild(schema); }
  schema.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.metaDescription,
    url: url,
    datePublished: post.publishDate,
    author: { '@type': 'Organization', name: 'Hardgainer Macros' },
    publisher: { '@type': 'Organization', name: 'Hardgainer Macros', url: base }
  });
}

// ─── Artigos relacionados ──────────────────────────────────────────────────────

function getRelatedPosts(current, count = 4) {
  const sameCat = BLOG_POSTS.filter(p => p.slug !== current.slug && p.category === current.category);
  const others  = BLOG_POSTS.filter(p => p.slug !== current.slug && p.category !== current.category);
  const pool    = [...sameCat, ...others];
  return pool.slice(0, count);
}

function renderRelated(posts) {
  if (!posts.length) return '';
  return `
    <aside class="blog-related">
      <h2 class="blog-related-title">Artigos relacionados</h2>
      <div class="blog-related-grid">
        ${posts.map(p => `
          <a href="/blog/${p.slug}" data-route class="blog-related-card">
            ${p.heroImage ? `<div class="blog-related-thumb"><img src="${p.heroImage}" alt="${p.title}" loading="lazy" width="300" height="169" /></div>` : ''}
            <span class="blog-card-cat">${p.category}</span>
            <span class="blog-related-card-title">${p.title}</span>
            <span class="blog-card-read">${p.readTime} min de leitura</span>
          </a>
        `).join('')}
      </div>
    </aside>
  `;
}

// ─── CTA — calculadora de macros ──────────────────────────────────────────────

function renderCTA() {
  return `
    <div class="blog-cta">
      <div class="blog-cta-inner">
        <p class="blog-cta-label">Ferramenta gratuita</p>
        <h2 class="blog-cta-title">Descobre os teus macros ideais para ganhar massa</h2>
        <p class="blog-cta-sub">Calculadora personalizada para hardgainers e ectomorfos. Plano de 14 dias incluído.</p>
        <a href="/" data-route class="blog-cta-btn">Calcular os meus macros →</a>
      </div>
    </div>
  `;
}

// ─── Página de artigo individual (/blog/:slug) ─────────────────────────────────

export function renderBlogPostPage(mount) {
  const slug = location.pathname.replace('/blog/', '').replace(/\/$/, '');
  const post = BLOG_POSTS.find(p => p.slug === slug);

  if (!post) {
    mount.innerHTML = `
      <div class="container">
        <div class="blog-post-wrapper">
          <a href="/blog" data-route class="blog-back">← Voltar ao blog</a>
          <h1>Artigo não encontrado</h1>
          <p>O artigo que procuras não existe ou foi removido.</p>
        </div>
      </div>`;
    return;
  }

  document.title = post.title + ' | Hardgainer Macros';
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', post.metaDescription);
  updateSEOMeta(post);

  mount.innerHTML = `
    <div class="container">
      <div class="blog-post-wrapper">
        <nav class="blog-post-nav">
          <a href="/blog" data-route class="blog-back">← Voltar ao blog</a>
        </nav>
        <header class="blog-post-header">
          <span class="blog-card-cat">${post.category}</span>
          <h1 class="blog-post-title">${post.title}</h1>
          <div class="blog-card-meta" style="margin-top:12px">
            <span class="blog-card-date">${formatDate(post.publishDate)}</span>
            <span class="blog-card-read">${post.readTime} min de leitura</span>
          </div>
        </header>
        <div class="blog-post-hero">
          <img src="${post.heroImage}" alt="${post.title}" loading="lazy" width="1200" height="675" />
        </div>
        <div class="blog-post-content">
          ${post.content}
        </div>

        ${renderCTA()}

        ${renderRelated(getRelatedPosts(post))}

        <footer class="blog-post-footer">
          <a href="/blog" data-route class="btn btn-secondary">← Ver todos os artigos</a>
        </footer>
      </div>
    </div>
  `;
}
