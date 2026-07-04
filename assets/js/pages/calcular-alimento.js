import { FOODS } from '../data/foods.js';

function idToSlug(id) { return id.replace(/_/g, '-'); }
function slugToId(slug) { return slug.replace(/-/g, '_'); }

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
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', 'Calcule as calorias, proteína, carboidratos e gordura de mais de 75 alimentos. Calculadora gratuita de macros para hardgainers e ectomorfos.');
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
  canonical.href = 'https://hardgainermacros.com/calcular-alimento';

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
          <div class="calc-alimento-food-name" id="result-name"></div>
          <div class="calc-alimento-cards">
            <div class="calc-alimento-card kcal"><span class="calc-alimento-card-val" id="res-kcal">—</span><span class="calc-alimento-card-label">kcal</span></div>
            <div class="calc-alimento-card prot"><span class="calc-alimento-card-val" id="res-prot">—</span><span class="calc-alimento-card-label">proteína (g)</span></div>
            <div class="calc-alimento-card carb"><span class="calc-alimento-card-val" id="res-carb">—</span><span class="calc-alimento-card-label">carboidratos (g)</span></div>
            <div class="calc-alimento-card fat"><span class="calc-alimento-card-val" id="res-fat">—</span><span class="calc-alimento-card-label">gordura (g)</span></div>
          </div>
          <div class="calc-alimento-note">Valores para <span id="res-qty">100</span>g de <span id="res-food">—</span> — <a id="res-link" href="#" data-route class="calc-alimento-ver-mais">Ver página completa →</a></div>
        </div>
        ${Object.entries(CATEGORIES).map(([catId, catName]) => {
          const items = foodsList.filter(([, f]) => f.category === catId);
          if (!items.length) return '';
          return '<div class="calc-alimento-category"><h2 class="calc-alimento-cat-title">' + catName + '</h2><div class="calc-alimento-grid">' +
            items.map(([id, f]) => '<a href="/calcular-alimento/' + idToSlug(id) + '" data-route class="calc-alimento-item-card"><span class="calc-alimento-item-name">' + f.name + '</span><span class="calc-alimento-item-kcal">' + f.per100.kcal + ' kcal</span><span class="calc-alimento-item-prot">' + f.per100.prot + 'g prot</span></a>').join('') +
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
    mount.querySelector('#result-name').textContent = selectedFood.name;
    mount.querySelector('#res-kcal').textContent = Math.round(selectedFood.per100.kcal * ratio);
    mount.querySelector('#res-prot').textContent = (selectedFood.per100.prot * ratio).toFixed(1);
    mount.querySelector('#res-carb').textContent = (selectedFood.per100.carb * ratio).toFixed(1);
    mount.querySelector('#res-fat').textContent = (selectedFood.per100.fat * ratio).toFixed(1);
    mount.querySelector('#res-qty').textContent = qty;
    mount.querySelector('#res-food').textContent = selectedFood.name;
    mount.querySelector('#res-link').href = '/calcular-alimento/' + idToSlug(selectedId);
    result.style.display = 'block';
  }

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (q.length < 2) { suggestions.style.display = 'none'; return; }
    const matches = foodsList.filter(([, f]) => f.name.toLowerCase().includes(q)).slice(0, 8);
    if (!matches.length) { suggestions.style.display = 'none'; return; }
    suggestions.innerHTML = matches.map(([id, f]) => '<div class="calc-suggestion-item" data-id="' + id + '">' + f.name + '</div>').join('');
    suggestions.style.display = 'block';
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

  document.addEventListener('click', e => {
    if (!e.target.closest('.calc-alimento-search-wrap')) suggestions.style.display = 'none';
  });

  qtyInput.addEventListener('input', updateResult);
}

export function renderCalcularAlimentoItemPage(mount) {
  const slug = location.pathname.replace('/calcular-alimento/', '').replace(/\/$/, '');
  const id = slugToId(slug);
  const food = FOODS[id];

  if (!food) {
    mount.innerHTML = '<div class="container"><div class="legal-page"><a href="/calcular-alimento" data-route class="blog-back">← Ver todos os alimentos</a><h1>Alimento não encontrado</h1></div></div>';
    return;
  }

  const catDesc = CATEGORY_DESC[food.category] || '';
  document.title = 'Calorias e Macros de ' + food.name + ' | Hardgainer Macros';
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', 'Descubra quantas calorias, proteína, carboidratos e gordura tem ' + food.name + ' por 100g. Calcule para qualquer quantidade.');
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
  canonical.href = 'https://hardgainermacros.com/calcular-alimento/' + slug;

  let schema = document.getElementById('schema-food');
  if (!schema) { schema = document.createElement('script'); schema.id = 'schema-food'; schema.type = 'application/ld+json'; document.head.appendChild(schema); }
  schema.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'NutritionInformation', name: food.name, calories: food.per100.kcal + ' kcal', proteinContent: food.per100.prot + ' g', carbohydrateContent: food.per100.carb + ' g', fatContent: food.per100.fat + ' g', servingSize: '100 g' });

  const substitutes = (food.substitutes || []).map(sid => ({ id: sid, food: FOODS[sid] })).filter(s => s.food);

  mount.innerHTML = `
    <div class="container">
      <div class="calc-alimento-wrapper">
        <a href="/calcular-alimento" data-route class="blog-back">← Ver todos os alimentos</a>
        <div class="calc-alimento-header">
          <h1 class="calc-alimento-title">Calorias e Macros de ${food.name}</h1>
          <p class="calc-alimento-sub">${food.name} é uma ${catDesc}. Calcule os macros para qualquer quantidade abaixo.</p>
        </div>
        <div class="calc-alimento-form">
          <div class="calc-alimento-qty-wrap">
            <input type="number" id="food-qty" class="calc-alimento-qty" value="100" min="1" max="5000" />
            <span class="calc-alimento-qty-label">gramas de ${food.name}</span>
          </div>
        </div>
        <div class="calc-alimento-result" style="display:block">
          <div class="calc-alimento-food-name">${food.name}</div>
          <div class="calc-alimento-cards">
            <div class="calc-alimento-card kcal"><span class="calc-alimento-card-val" id="res-kcal">${food.per100.kcal}</span><span class="calc-alimento-card-label">kcal</span></div>
            <div class="calc-alimento-card prot"><span class="calc-alimento-card-val" id="res-prot">${food.per100.prot}</span><span class="calc-alimento-card-label">proteína (g)</span></div>
            <div class="calc-alimento-card carb"><span class="calc-alimento-card-val" id="res-carb">${food.per100.carb}</span><span class="calc-alimento-card-label">carboidratos (g)</span></div>
            <div class="calc-alimento-card fat"><span class="calc-alimento-card-val" id="res-fat">${food.per100.fat}</span><span class="calc-alimento-card-label">gordura (g)</span></div>
          </div>
          <div class="calc-alimento-note">Valores para <span id="res-qty">100</span>g de ${food.name}</div>
        </div>
        <div class="calc-alimento-info-block">
          <h2>Tabela nutricional completa de ${food.name} (por 100g)</h2>
          <table class="calc-alimento-table">
            <tbody>
              <tr><td>Calorias</td><td><strong>${food.per100.kcal} kcal</strong></td></tr>
              <tr><td>Proteína</td><td><strong>${food.per100.prot}g</strong></td></tr>
              <tr><td>Carboidratos</td><td><strong>${food.per100.carb}g</strong></td></tr>
              <tr><td>Gordura total</td><td><strong>${food.per100.fat}g</strong></td></tr>
              ${food.digestibility ? '<tr><td>Digestibilidade</td><td><strong>' + food.digestibility + '</strong></td></tr>' : ''}
              ${food.source ? '<tr><td>Fonte dos dados</td><td><strong>' + food.source + '</strong></td></tr>' : ''}
            </tbody>
          </table>
        </div>
        <div class="calc-alimento-info-block">
          <h2>${food.name} para Hardgainers</h2>
          <p>${food.name} é uma ${catDesc}. Para hardgainers e ectomorfos que precisam aumentar o aporte calórico, este alimento pode ser uma excelente opção para atingir o superávit calórico diário necessário para ganhar massa muscular.</p>
          <a href="/" data-route class="blog-cta-btn" style="display:inline-block;margin-top:16px">Calcular os meus macros grátis →</a>
        </div>
        ${substitutes.length ? '<div class="calc-alimento-info-block"><h2>Alternativas a ' + food.name + '</h2><div class="calc-alimento-grid">' +
          substitutes.map(s => '<a href="/calcular-alimento/' + idToSlug(s.id) + '" data-route class="calc-alimento-item-card"><span class="calc-alimento-item-name">' + s.food.name + '</span><span class="calc-alimento-item-kcal">' + s.food.per100.kcal + ' kcal</span><span class="calc-alimento-item-prot">' + s.food.per100.prot + 'g prot</span></a>').join('') +
          '</div></div>' : ''}
      </div>
    </div>
  `;

  mount.querySelectorAll('.calc-alimento-item-card[data-route]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
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
