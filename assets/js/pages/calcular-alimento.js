import { hasFoodImage } from '../data/food-images.js';
import { FOODS } from '../data/foods.js';
import { getFoodSeoContent } from '../data/food-seo-content.js';

function idToSlug(id) { return id.replace(/_/g, '-'); }
function slugToId(slug) { return slug.replace(/-/g, '_'); }

const PLAN_START_ROUTE = '/';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderFoodVisual(foodId, foodName, { className = '', size = 56 } = {}) {
  if (!hasFoodImage(foodId)) return '';

  const classes = ['calc-alimento-visual', className].filter(Boolean).join(' ');

  return `
    <div class="${classes}" data-food-visual="image" data-food-id="${escapeHtml(foodId)}">
      <img
        src="/assets/images/foods/${escapeHtml(foodId)}.webp"
        alt="Ilustração de ${escapeHtml(foodName || 'alimento')}"
        loading="lazy"
        decoding="async"
        width="${size}"
        height="${size}"
        data-calc-food-image
      >
    </div>
  `;
}

function bindFoodImageFallback(scope) {
  if (!scope) return;
  scope.querySelectorAll('[data-calc-food-image]').forEach(img => {
    if (img.dataset.calcFoodFallbackBound === 'true') return;
    img.dataset.calcFoodFallbackBound = 'true';
    img.addEventListener('error', () => {
      img.closest('[data-food-visual="image"]')?.remove();
    }, { once: true });
  });
}

function removeFoodSchema() {
  document.getElementById('schema-food')?.remove();
}

function ensureCanonical() {
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  return canonical;
}

function setMetaDescription(content) {
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', content);
}

function renderFoodCard(id, food) {
  return `
    <a href="/calcular-alimento/${idToSlug(id)}" data-route class="calc-alimento-item-card">
      ${renderFoodVisual(id, food.name, { className: 'calc-alimento-card-visual', size: 64 })}
      <span class="calc-alimento-item-name">${escapeHtml(food.name)}</span>
      <span class="calc-alimento-item-kcal">${food.per100.kcal} kcal</span>
      <span class="calc-alimento-item-prot">${food.per100.prot}g prot</span>
    </a>
  `;
}

function renderSuggestionItem(id, food) {
  return `
    <button type="button" class="calc-suggestion-item" data-id="${escapeHtml(id)}">
      ${renderFoodVisual(id, food.name, { className: 'calc-alimento-suggestion-visual', size: 44 })}
      <span class="calc-suggestion-copy">
        <span class="calc-suggestion-name">${escapeHtml(food.name)}</span>
        <span class="calc-suggestion-meta">${food.per100.kcal} kcal · ${food.per100.prot}g prot</span>
      </span>
    </button>
  `;
}

function renderFoodLink(foodId) {
  const linkedFood = FOODS[foodId];
  if (!linkedFood) return '';
  return `<a href="/calcular-alimento/${idToSlug(foodId)}" data-route>${escapeHtml(linkedFood.name)}</a>`;
}

function renderFoodLinkList(foodIds = []) {
  const links = foodIds.map(renderFoodLink).filter(Boolean);
  if (!links.length) return '';
  if (links.length === 1) return links[0];
  if (links.length === 2) return `${links[0]} e ${links[1]}`;
  return `${links.slice(0, -1).join(', ')} e ${links[links.length - 1]}`;
}

function renderLegacyFoodInfoBlock(food, catDesc) {
  return `
    <div class="calc-alimento-info-block">
      <h2>${escapeHtml(food.name)} para Hardgainers</h2>
      <p>${escapeHtml(food.name)} é uma ${escapeHtml(catDesc)}. Para hardgainers e ectomorfos que precisam aumentar o aporte calórico, este alimento pode ser uma excelente opção para atingir o superávit calórico diário necessário para ganhar massa muscular.</p>
      <a href="/" data-route class="blog-cta-btn" style="display:inline-block;margin-top:16px">Calcular os meus macros grátis →</a>
    </div>
  `;
}

function renderFoodSeoSection(foodId, food, seoContent) {
  const pairingLinks = renderFoodLinkList(seoContent.pairingIds);

  return `
    <section class="calc-alimento-seo-block" data-testid="food-seo-content" data-food-id="${escapeHtml(foodId)}">
      <div class="calc-alimento-seo-copy">
        <h2>${escapeHtml(food.name)} para hardgainers</h2>
        <p>${escapeHtml(seoContent.intro)}</p>
        <p>${escapeHtml(seoContent.macroContext)}</p>
        <h3>Como incluir ${escapeHtml(food.name)} na alimentação</h3>
        <p>${escapeHtml(seoContent.bestUse)}</p>
        <h3>${escapeHtml(seoContent.pairingHeading)}</h3>
        <p>${escapeHtml(seoContent.pairingText)} ${pairingLinks}</p>
      </div>
      <aside class="calc-alimento-seo-cta" data-testid="food-seo-cta">
        <span class="calc-alimento-seo-cta__eyebrow">Próximo passo</span>
        <h3>Quer transformar esses valores em um plano completo?</h3>
        <p>Calcule suas necessidades e receba uma distribuição personalizada de calorias, macronutrientes e refeições para 14 dias.</p>
        <div class="calc-alimento-seo-cta__actions">
          <a href="${PLAN_START_ROUTE}" data-route class="blog-cta-btn">Criar meu plano alimentar de 14 dias</a>
          <a href="/calcular-alimento" data-route class="calc-alimento-seo-cta__secondary">Consultar outros alimentos</a>
        </div>
      </aside>
    </section>
  `;
}

const CATEGORY_DESC = {
  protein: 'fonte de proteína de alta qualidade, essencial para hardgainers ganharem massa muscular',
  carb: 'fonte de carboidratos complexos, ideal para fornecer energia e apoiar o superávit calórico',
  fat: 'fonte de gorduras saudáveis e calorias densas, perfeita para hardgainers aumentarem o aporte calórico',
  fruit: 'fonte natural de carboidratos e micronutrientes, útil para complementar as calorias diárias',
  veg: 'fonte de micronutrientes e fibras, importante para a saúde digestiva durante o processo de ganho de massa',
  dairy: 'fonte combinada de proteína e calorias, excelente para hardgainers que precisam de volume alimentar',
  extra: 'ingrediente complementar que pode ajudar a aumentar as calorias e melhorar o sabor das refeições',
};

const CATEGORIES = {
  protein: 'Proteínas',
  dairy: 'Laticínios',
  carb: 'Carboidratos',
  fruit: 'Frutas',
  fat: 'Gorduras',
  veg: 'Vegetais',
  extra: 'Extras',
};

export function renderCalcularAlimentoPage(mount) {
  document.title = 'Calculadora de Macros por Alimento | Hardgainer Macros';
  setMetaDescription('Calcule as calorias, proteína, carboidratos e gordura de mais de 75 alimentos. Calculadora gratuita de macros para hardgainers e ectomorfos.');
  ensureCanonical().href = 'https://hardgainermacros.com/calcular-alimento';
  removeFoodSchema();

  const foodsList = Object.entries(FOODS);

  mount.innerHTML = `
    <div class="container">
      <div class="calc-alimento-wrapper">
        <div class="calc-alimento-header">
          <h1 class="calc-alimento-title">Calculadora de Macros por Alimento</h1>
          <p class="calc-alimento-sub">Descubra as calorias, proteína, carboidratos e gordura de qualquer alimento. Mais de 75 alimentos para hardgainers e ectomorfos.</p>
        </div>
        <div class="calc-alimento-form">
          <div class="calc-alimento-search-wrap">
            <input type="text" id="food-search" class="calc-alimento-input" placeholder="Pesquise um alimento (ex: frango, ovo, arroz...)" autocomplete="off" />
            <div class="calc-alimento-suggestions" id="suggestions"></div>
          </div>
          <div class="calc-alimento-qty-wrap">
            <input type="number" id="food-qty" class="calc-alimento-qty" value="100" min="1" max="5000" />
            <span class="calc-alimento-qty-label">gramas</span>
          </div>
        </div>
        <div class="calc-alimento-result" id="food-result" style="display:none">
          <div class="calc-alimento-result-head">
            <div id="result-visual"></div>
            <div class="calc-alimento-result-copy">
              <div class="calc-alimento-food-name" id="result-name"></div>
            </div>
          </div>
          <div class="calc-alimento-cards">
            <div class="calc-alimento-card kcal"><span class="calc-alimento-card-val" id="res-kcal">—</span><span class="calc-alimento-card-label">kcal</span></div>
            <div class="calc-alimento-card prot"><span class="calc-alimento-card-val" id="res-prot">—</span><span class="calc-alimento-card-label">proteína (g)</span></div>
            <div class="calc-alimento-card carb"><span class="calc-alimento-card-val" id="res-carb">—</span><span class="calc-alimento-card-label">carboidratos (g)</span></div>
            <div class="calc-alimento-card fat"><span class="calc-alimento-card-val" id="res-fat">—</span><span class="calc-alimento-card-label">gordura (g)</span></div>
          </div>
          <div class="calc-alimento-note">Valores para <span id="res-qty">100</span>g de <span id="res-food">—</span> — <a id="res-link" href="#" data-route class="calc-alimento-ver-mais">Ver página completa →</a></div>
        </div>
        ${Object.entries(CATEGORIES).map(([catId, catName]) => {
          const items = foodsList.filter(([, food]) => food.category === catId);
          if (!items.length) return '';
          return '<div class="calc-alimento-category"><h2 class="calc-alimento-cat-title">' + catName + '</h2><div class="calc-alimento-grid">' +
            items.map(([id, food]) => renderFoodCard(id, food)).join('') +
            '</div></div>';
        }).join('')}
      </div>
    </div>
  `;

  const searchInput = mount.querySelector('#food-search');
  const qtyInput = mount.querySelector('#food-qty');
  const suggestions = mount.querySelector('#suggestions');
  const result = mount.querySelector('#food-result');
  let selectedFood = null;
  let selectedId = null;

  function updateResult() {
    if (!selectedFood) return;
    const qty = parseFloat(qtyInput.value) || 100;
    const ratio = qty / 100;
    mount.querySelector('#result-visual').innerHTML = renderFoodVisual(selectedId, selectedFood.name, {
      className: 'calc-alimento-result-visual',
      size: 72,
    });
    mount.querySelector('#result-name').textContent = selectedFood.name;
    mount.querySelector('#res-kcal').textContent = Math.round(selectedFood.per100.kcal * ratio);
    mount.querySelector('#res-prot').textContent = (selectedFood.per100.prot * ratio).toFixed(1);
    mount.querySelector('#res-carb').textContent = (selectedFood.per100.carb * ratio).toFixed(1);
    mount.querySelector('#res-fat').textContent = (selectedFood.per100.fat * ratio).toFixed(1);
    mount.querySelector('#res-qty').textContent = qty;
    mount.querySelector('#res-food').textContent = selectedFood.name;
    mount.querySelector('#res-link').href = '/calcular-alimento/' + idToSlug(selectedId);
    result.style.display = 'block';
    bindFoodImageFallback(result);
  }

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (q.length < 2) {
      suggestions.style.display = 'none';
      return;
    }

    const matches = foodsList.filter(([, food]) => food.name.toLowerCase().includes(q)).slice(0, 8);
    if (!matches.length) {
      suggestions.style.display = 'none';
      return;
    }

    suggestions.innerHTML = matches.map(([id, food]) => renderSuggestionItem(id, food)).join('');
    suggestions.style.display = 'block';
    bindFoodImageFallback(suggestions);

    suggestions.querySelectorAll('.calc-suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        selectedId = item.dataset.id;
        selectedFood = FOODS[selectedId];
        searchInput.value = selectedFood.name;
        suggestions.style.display = 'none';
        updateResult();
      });
    });
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.calc-alimento-search-wrap')) suggestions.style.display = 'none';
  });

  qtyInput.addEventListener('input', updateResult);
  bindFoodImageFallback(mount);
}

export function renderCalcularAlimentoItemPage(mount) {
  const slug = location.pathname.replace('/calcular-alimento/', '').replace(/\/$/, '');
  const id = slugToId(slug);
  const food = FOODS[id];

  if (!food) {
    document.title = 'Alimento não encontrado | Hardgainer Macros';
    setMetaDescription('O alimento pesquisado não foi encontrado. Volte para a calculadora de alimentos e consulte calorias e macronutrientes de outros itens.');
    ensureCanonical().href = 'https://hardgainermacros.com/calcular-alimento';
    removeFoodSchema();
    mount.innerHTML = '<div class="container"><div class="legal-page"><a href="/calcular-alimento" data-route class="blog-back">← Ver todos os alimentos</a><h1>Alimento não encontrado</h1></div></div>';
    return;
  }

  const catDesc = CATEGORY_DESC[food.category] || '';
  const seoContent = getFoodSeoContent(id);

  document.title = 'Calorias e Macros de ' + food.name + ' | Hardgainer Macros';
  setMetaDescription(seoContent?.metaDescription || ('Descubra quantas calorias, proteína, carboidratos e gordura tem ' + food.name + ' por 100g. Calcule para qualquer quantidade.'));
  ensureCanonical().href = 'https://hardgainermacros.com/calcular-alimento/' + slug;

  let schema = document.getElementById('schema-food');
  if (!schema) {
    schema = document.createElement('script');
    schema.id = 'schema-food';
    schema.type = 'application/ld+json';
    document.head.appendChild(schema);
  }
  schema.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NutritionInformation',
    name: food.name,
    calories: food.per100.kcal + ' kcal',
    proteinContent: food.per100.prot + ' g',
    carbohydrateContent: food.per100.carb + ' g',
    fatContent: food.per100.fat + ' g',
    servingSize: '100 g',
  });

  const substitutes = (food.substitutes || [])
    .map(substituteId => ({ id: substituteId, food: FOODS[substituteId] }))
    .filter(item => item.food);

  mount.innerHTML = `
    <div class="container">
      <div class="calc-alimento-wrapper">
        <a href="/calcular-alimento" data-route class="blog-back">← Ver todos os alimentos</a>
        <div class="calc-alimento-header calc-alimento-header-has-visual">
          ${renderFoodVisual(id, food.name, { className: 'calc-alimento-header-visual', size: 96 })}
          <div class="calc-alimento-header-copy">
            <h1 class="calc-alimento-title">Calorias e Macros de ${escapeHtml(food.name)}</h1>
            <p class="calc-alimento-sub">${escapeHtml(food.name)} é uma ${escapeHtml(catDesc)}. Calcule os macros para qualquer quantidade abaixo.</p>
          </div>
        </div>
        <div class="calc-alimento-form">
          <div class="calc-alimento-qty-wrap">
            <input type="number" id="food-qty" class="calc-alimento-qty" value="100" min="1" max="5000" />
            <span class="calc-alimento-qty-label">gramas de ${escapeHtml(food.name)}</span>
          </div>
        </div>
        <div class="calc-alimento-result" style="display:block">
          <div class="calc-alimento-result-head">
            ${renderFoodVisual(id, food.name, { className: 'calc-alimento-result-visual', size: 72 })}
            <div class="calc-alimento-result-copy">
              <div class="calc-alimento-food-name">${escapeHtml(food.name)}</div>
            </div>
          </div>
          <div class="calc-alimento-cards">
            <div class="calc-alimento-card kcal"><span class="calc-alimento-card-val" id="res-kcal">${food.per100.kcal}</span><span class="calc-alimento-card-label">kcal</span></div>
            <div class="calc-alimento-card prot"><span class="calc-alimento-card-val" id="res-prot">${food.per100.prot}</span><span class="calc-alimento-card-label">proteína (g)</span></div>
            <div class="calc-alimento-card carb"><span class="calc-alimento-card-val" id="res-carb">${food.per100.carb}</span><span class="calc-alimento-card-label">carboidratos (g)</span></div>
            <div class="calc-alimento-card fat"><span class="calc-alimento-card-val" id="res-fat">${food.per100.fat}</span><span class="calc-alimento-card-label">gordura (g)</span></div>
          </div>
          <div class="calc-alimento-note">Valores para <span id="res-qty">100</span>g de ${escapeHtml(food.name)}</div>
        </div>
        <div class="calc-alimento-info-block">
          <h2>Tabela nutricional completa de ${escapeHtml(food.name)} (por 100g)</h2>
          <table class="calc-alimento-table">
            <tbody>
              <tr><td>Calorias</td><td><strong>${food.per100.kcal} kcal</strong></td></tr>
              <tr><td>Proteína</td><td><strong>${food.per100.prot}g</strong></td></tr>
              <tr><td>Carboidratos</td><td><strong>${food.per100.carb}g</strong></td></tr>
              <tr><td>Gordura total</td><td><strong>${food.per100.fat}g</strong></td></tr>
              ${food.digestibility ? '<tr><td>Digestibilidade</td><td><strong>' + escapeHtml(food.digestibility) + '</strong></td></tr>' : ''}
              ${food.source ? '<tr><td>Fonte dos dados</td><td><strong>' + escapeHtml(food.source) + '</strong></td></tr>' : ''}
            </tbody>
          </table>
        </div>
        ${seoContent ? renderFoodSeoSection(id, food, seoContent) : renderLegacyFoodInfoBlock(food, catDesc)}
        ${substitutes.length ? '<div class="calc-alimento-info-block"><h2>Alternativas a ' + escapeHtml(food.name) + '</h2><div class="calc-alimento-grid">' +
          substitutes.map(item => renderFoodCard(item.id, item.food)).join('') +
          '</div></div>' : ''}
      </div>
    </div>
  `;

  bindFoodImageFallback(mount);

  mount.querySelectorAll('.calc-alimento-item-card[data-route]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const href = link.getAttribute('href');
      history.pushState({}, '', href);
      renderCalcularAlimentoItemPage(mount);
    });
  });

  const qtyInput = mount.querySelector('#food-qty');
  qtyInput.addEventListener('input', () => {
    const qty = parseFloat(qtyInput.value) || 100;
    const ratio = qty / 100;
    mount.querySelector('#res-kcal').textContent = Math.round(food.per100.kcal * ratio);
    mount.querySelector('#res-prot').textContent = (food.per100.prot * ratio).toFixed(1);
    mount.querySelector('#res-carb').textContent = (food.per100.carb * ratio).toFixed(1);
    mount.querySelector('#res-fat').textContent = (food.per100.fat * ratio).toFixed(1);
    mount.querySelector('#res-qty').textContent = qty;
  });
}
