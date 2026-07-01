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

  const categories = [...new Set(BLOG_POSTS.map(p => p.category))];

  const filtersHtml = categories.map((cat, i) => `
    <button class="blog-filter-btn${i === 0 ? ' active' : ''}" data-cat="${cat}">${cat}</button>
  `).join('');

  const cardsHtml = BLOG_POSTS.map(renderCard).join('');

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
          <button class="blog-filter-btn active" data-cat="__all__">Todos</button>
          ${filtersHtml}
        </div>

        <div id="blog-grid" class="blog-grid">
          ${cardsHtml}
        </div>

        <p id="blog-no-results" class="blog-no-results" style="display:none;">
          Nenhum artigo encontrado nesta categoria.
        </p>

      </div>
    </div>
  `;

  // ── Filtros ───────────────────────────────────────────────────────────────
  const filterBtns = mount.querySelectorAll('.blog-filter-btn');
  const cards      = mount.querySelectorAll('.blog-card');
  const noResults  = document.getElementById('blog-no-results');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const cat = btn.dataset.cat;
      let any = false;
      cards.forEach(card => {
        const match = cat === '__all__' || card.dataset.category === cat;
        card.style.display = match ? '' : 'none';
        if (match) any = true;
      });
      noResults.style.display = any ? 'none' : '';
    });
  });

  // ── Navegação SPA nos cards ──────────────────────────────────────────────
  // (o handler global do router já captura clicks em a[data-route],
  //  mas garantimos que slugs com "/" também são tratados)
  mount.querySelectorAll('.blog-card[data-route]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigate(link.getAttribute('href'));
    });
  });
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
        <div class="blog-post-content">
          ${post.content}
        </div>
        <footer class="blog-post-footer">
          <a href="/blog" data-route class="btn btn-secondary">← Ver todos os artigos</a>
        </footer>
      </div>
    </div>
  `;
}
