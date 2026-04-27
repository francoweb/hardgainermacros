/**
 * PAGE — Plano Alimentar de 14 Dias (Etapa 5)
 * =============================================================================
 * A página mais rica da app. Mostra:
 *  - toolbar: Voltar, Personalizar, Imprimir, Baixar PDF
 *  - 14 cards de dia colapsáveis (primeiro aberto por defeito)
 *  - Cada dia: 6 meal cards com ingredientes, macros, preparo, nota
 *  - Botão de substituição por ingrediente (abre modal)
 *  - Lista de compras semanal (agrega os 7 primeiros dias)
 *  - Princípios de consistência do ebook
 *
 * Substituições persistentes: guardadas em localStorage por par (dia, ingrediente).
 * =============================================================================
 */

import { icons } from '../modules/icons.js';
import { navigate } from '../modules/router.js';
import { openModal } from '../components/ui.js';
import {
  loadPlan, loadResults,
  loadSubstitutions, saveSubstitutions,
} from '../modules/storage.js';
import { formatKcal } from '../modules/calculator.js';
import {
  FOODS, calcFoodMacros, getSubstitutes, formatQty, getFood,
} from '../data/foods.js';

export function renderPlanoPage(mount) {
  const plan = loadPlan();
  const results = loadResults();
  if (!plan || !results) { navigate('/'); return; }

  // Carregar substituições aplicadas
  let subs = loadSubstitutions();

  // Aplicar substituições ao plano (cria plano efetivo)
  const effectivePlan = applySubstitutions(plan, subs);

  render(mount, effectivePlan, results, subs);
}

function render(mount, plan, results, subs) {
  mount.innerHTML = `
    <div class="container container-wide">
      <!-- Toolbar (escondida na impressão) -->
      <div class="plan-toolbar no-print">
        <button type="button" class="btn btn-secondary" id="btn-back-results">${icons.arrowLeft(16)} Voltar aos Resultados</button>
        <div class="plan-toolbar-right">
          <button type="button" class="btn btn-ghost" id="btn-edit-plan">${icons.edit(16)} Personalizar</button>
          <button type="button" class="btn btn-ghost" id="btn-print">${icons.print(16)} Imprimir</button>
          <button type="button" class="btn btn-primary" id="btn-download">${icons.download(16)} Baixar PDF</button>
        </div>
      </div>

      <!-- Hero -->
      <div class="plan-hero">
        <h1 class="hero-title">Seu Plano Alimentar de 14 Dias</h1>
        <p class="hero-sub">Sistema Híbrido: ${countSolid(plan[0])} Refeições Sólidas + ${countShake(plan[0])} Shakes Anabólicos</p>
        <div class="plan-hero-meta">
          <span><strong>${formatKcal(results.calories)}</strong> kcal/dia</span>
          <span>•</span>
          <span>P: <strong>${results.protein.grams}g</strong></span>
          <span>•</span>
          <span>C: <strong>${results.carb.grams}g</strong></span>
          <span>•</span>
          <span>G: <strong>${results.fat.grams}g</strong></span>
        </div>
      </div>

      <!-- Days -->
      <div id="days-container">
        ${plan.map((day, idx) => renderDayCard(day, idx)).join('')}
      </div>

      <!-- Receitas base (no-print friendly) -->
      <div class="card card-section">
        <h3 class="card-title">${icons.utensils(18)} Princípios das Receitas</h3>
        <p class="card-body">
          Todas as refeições seguem o Sistema Híbrido do ebook: refeições sólidas com carboidratos de digestão leve (arroz branco, pão francês, macarrão, batata) e proteínas completas (ovos, frango, carne magra, peixe). Os shakes combinam whey, leite integral, fruta e uma fonte de gordura boa (pasta de amendoim, aveia ou azeite) para concentrar calorias.
        </p>
        <p class="card-body">
          Você pode substituir qualquer ingrediente por outro da mesma categoria — basta clicar no ícone <span style="display:inline-flex; vertical-align:middle;">${icons.swap(14)}</span> ao lado do ingrediente. A substituição mantém as calorias e proporção de macros.
        </p>
      </div>

      <!-- Lista de compras -->
      <div class="card card-section">
        <div class="day-head" id="shopping-head" role="button" aria-expanded="false" tabindex="0">
          <div class="day-num">${icons.list(18)}</div>
          <div class="day-info">
            <div class="day-name">Lista de Compras (7 Primeiros Dias)</div>
            <div class="day-summary">Agregada de todas as refeições • Quantidades aproximadas</div>
          </div>
          <div class="day-chev">${icons.chevDown(18)}</div>
        </div>
        <div class="day-body" id="shopping-body" style="display:none;">
          ${renderShoppingList(plan.slice(0, 7))}
        </div>
      </div>

      <!-- Como aplicar -->
      <div class="card card-section">
        <h3 class="card-title">${icons.target(18)} Como Aplicar Sem Falhar</h3>
        <ol class="rec-list">
          <li class="rec-item"><span class="rec-num">1</span><div><strong>Prepare com antecedência:</strong> domingo à noite, cozinhe arroz, carnes e deixe frutas cortadas. Reduz fricção nos dias de semana.</div></li>
          <li class="rec-item"><span class="rec-num">2</span><div><strong>Shakes prontos em 2 minutos:</strong> tenha whey, leite e aveia sempre à mão. Um shake não pode ser "projeto".</div></li>
          <li class="rec-item"><span class="rec-num">3</span><div><strong>Coma mesmo sem fome:</strong> hardgainer come por relógio, não por apetite. 3h passou — hora do próximo ataque.</div></li>
          <li class="rec-item"><span class="rec-num">4</span><div><strong>Pese-se a cada 2 semanas:</strong> mesmo horário, estômago vazio. Ajuste ±150 kcal se sair fora da meta semanal.</div></li>
          <li class="rec-item"><span class="rec-num">5</span><div><strong>Nada é sagrado:</strong> substitua ingredientes, ajuste horários, adapte à sua vida. O que importa é atingir ${formatKcal(results.calories)} kcal por dia.</div></li>
        </ol>
      </div>

      <!-- Princípios de consistência -->
      <div class="card card-section">
        <h3 class="card-title">${icons.check(18)} Princípios de Consistência</h3>
        <ul class="check-list">
          <li>${icons.check(14)} Comer <strong>todos os dias</strong> — fim de semana também conta</li>
          <li>${icons.check(14)} Respeitar <strong>intervalos de 2h30 a 3h</strong> entre refeições</li>
          <li>${icons.check(14)} Priorizar <strong>carboidratos leves</strong> (arroz branco, pão francês)</li>
          <li>${icons.check(14)} <strong>Proteína em cada refeição</strong> sólida</li>
          <li>${icons.check(14)} Usar <strong>shakes quando a fome estiver baixa</strong> ou faltar tempo</li>
          <li>${icons.check(14)} <strong>Nunca pular a ceia pré-sono</strong> — é o período mais anabólico</li>
          <li>${icons.check(14)} <strong>Recalibrar a cada 2 semanas</strong> com base no peso e espelho</li>
        </ul>
      </div>
    </div>
  `;

  // ---------- Handlers ----------
  document.getElementById('btn-back-results').addEventListener('click', () => navigate('/resultados'));
  document.getElementById('btn-edit-plan').addEventListener('click', () => navigate('/'));
  document.getElementById('btn-print').addEventListener('click', () => window.print());
  document.getElementById('btn-download').addEventListener('click', () => {
    // Solução universal: imprimir para PDF via navegador (funciona em qualquer host)
    window.print();
  });

  // Day collapse
  mount.querySelectorAll('[data-day-head]').forEach(head => {
    const toggle = () => {
      const idx = head.dataset.dayHead;
      const body = document.getElementById(`day-body-${idx}`);
      const chev = head.querySelector('.day-chev');
      const open = body.style.display !== 'none';
      body.style.display = open ? 'none' : 'block';
      head.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (chev) chev.style.transform = open ? 'rotate(0deg)' : 'rotate(180deg)';
    };
    head.addEventListener('click', toggle);
    head.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });

  // Shopping collapse
  const shoppingHead = document.getElementById('shopping-head');
  shoppingHead.addEventListener('click', () => {
    const body = document.getElementById('shopping-body');
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    shoppingHead.setAttribute('aria-expanded', open ? 'false' : 'true');
    const chev = shoppingHead.querySelector('.day-chev');
    if (chev) chev.style.transform = open ? 'rotate(0deg)' : 'rotate(180deg)';
  });

  // Substitution buttons
  mount.querySelectorAll('[data-swap]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const { dayIdx, mealIdx, ingIdx } = btn.dataset;
      openSubModal(Number(dayIdx), Number(mealIdx), Number(ingIdx), mount);
    });
  });
}

/* ============================================================================ */
/* Day card rendering                                                           */
/* ============================================================================ */

function renderDayCard(day, idx) {
  const isOpen = idx === 0;
  return `
    <div class="day ${isOpen ? 'open' : ''}">
      <div class="day-head" data-day-head="${idx}" role="button" aria-expanded="${isOpen}" tabindex="0">
        <div class="day-num">${idx + 1}</div>
        <div class="day-info">
          <div class="day-name">Dia ${idx + 1} • ${day.dayName}</div>
          <div class="day-summary">
            ${day.meals.length} refeições • <strong>${formatKcal(day.totals.kcal)}</strong> kcal •
            P:${Math.round(day.totals.prot)}g C:${Math.round(day.totals.carb)}g G:${Math.round(day.totals.fat)}g
          </div>
        </div>
        <div class="day-chev" style="${isOpen ? 'transform: rotate(180deg);' : ''}">${icons.chevDown(18)}</div>
      </div>
      <div class="day-body" id="day-body-${idx}" style="display:${isOpen ? 'block' : 'none'};">
        ${day.meals.map((meal, mIdx) => renderMealCard(meal, idx, mIdx)).join('')}
      </div>
    </div>
  `;
}

function renderMealCard(meal, dayIdx, mealIdx) {
  return `
    <div class="meal-card ${meal.type}">
      <div class="meal-card-head">
        <div>
          <div class="meal-card-time">${meal.time || ''}</div>
          <div class="meal-card-name">${meal.slotLabel} — ${meal.name}</div>
        </div>
        <span class="meal-card-badge ${meal.type}">${meal.type === 'solid' ? 'Sólida' : 'Shake'}</span>
      </div>

      <div class="meal-totals">
        <span class="meal-total"><span class="meal-total-dot" style="background: var(--cal-color)"></span> ${formatKcal(meal.totals.kcal)} kcal</span>
        <span class="meal-total"><span class="meal-total-dot" style="background: var(--protein-color)"></span> ${meal.totals.prot}g P</span>
        <span class="meal-total"><span class="meal-total-dot" style="background: var(--carb-color)"></span> ${meal.totals.carb}g C</span>
        <span class="meal-total"><span class="meal-total-dot" style="background: var(--fat-color)"></span> ${meal.totals.fat}g G</span>
      </div>

      <div class="ingredient-label">Detalhamento Por Alimento</div>
      <ul class="ingredient-list">
        ${meal.ingredients.map((ing, iIdx) => `
          <li class="ingredient">
            <div class="ingredient-main">
              <div class="ingredient-name">${ing.label || (getFood(ing.food)?.name || ing.food)}</div>
              <div class="ingredient-qty">${ing.display}</div>
              <div class="ingredient-macros">${ing.macros.kcal} kcal • P:${ing.macros.prot}g C:${ing.macros.carb}g G:${ing.macros.fat}g</div>
            </div>
            <button type="button" class="ingredient-sub-btn no-print" data-swap data-day-idx="${dayIdx}" data-meal-idx="${mealIdx}" data-ing-idx="${iIdx}" aria-label="Substituir ${ing.label || ing.food}">
              ${icons.swap(14)} Substituir
            </button>
          </li>
        `).join('')}
      </ul>

      ${meal.steps && meal.steps.length ? `
        <div class="prep-section">
          <div class="prep-title">${icons.utensils(14)} Preparo</div>
          <ol class="prep-steps">
            ${meal.steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
          </ol>
        </div>
      ` : ''}

      ${meal.note ? `
        <div class="meal-note">
          <span class="meal-note-icon">${icons.info(16)}</span>
          <div>${escapeHtml(meal.note)}</div>
        </div>
      ` : ''}
    </div>
  `;
}

/* ============================================================================ */
/* Substitution modal                                                           */
/* ============================================================================ */

function openSubModal(dayIdx, mealIdx, ingIdx, mount) {
  // Lê o plano ATUAL (pode já ter substituições)
  const plan = loadPlan();
  let subs = loadSubstitutions();
  const effective = applySubstitutions(plan, subs);
  const meal = effective[dayIdx].meals[mealIdx];
  const ing = meal.ingredients[ingIdx];
  const originalFoodId = ing.food;
  const originalFood = getFood(originalFoodId);

  if (!originalFood) return;

  const options = getSubstitutes(originalFoodId, ing.grams);

  const contentHtml = `
    <div class="modal-head">
      <div>
        <div class="modal-title">Substituir: ${originalFood.name}</div>
        <div class="modal-sub">
          ${formatQty(originalFoodId, ing.grams)} •
          ${ing.macros.kcal} kcal • P:${ing.macros.prot}g C:${ing.macros.carb}g G:${ing.macros.fat}g
        </div>
      </div>
      <button type="button" class="modal-close" data-modal-close aria-label="Fechar">${icons.x(18)}</button>
    </div>
    <div class="modal-body">
      ${options.length === 0 ? `
        <p class="card-body">Não há substituições equivalentes registadas para este alimento. Considere manter o original.</p>
      ` : `
        <p class="card-sub">Quantidade calculada para manter ~ as mesmas calorias da original:</p>
        <ul class="sub-options">
          ${options.map(opt => {
            const deltaKcal = opt.macros.kcal - ing.macros.kcal;
            const sign = deltaKcal >= 0 ? '+' : '';
            return `
              <li class="sub-option" data-sub-id="${opt.id}" data-sub-grams="${opt.grams}">
                <div class="sub-option-head">
                  <div class="sub-option-name">${opt.food.name}</div>
                  <div class="sub-option-qty">${formatQty(opt.id, opt.grams)}</div>
                </div>
                <div class="sub-option-macros">
                  ${opt.macros.kcal} kcal (${sign}${deltaKcal}) •
                  P:${opt.macros.prot}g • C:${opt.macros.carb}g • G:${opt.macros.fat}g
                </div>
              </li>
            `;
          }).join('')}
        </ul>
        <div class="hint" style="margin-top: 12px;">
          <span class="hint-icon">${icons.info(16)}</span>
          <div>Clique numa opção para aplicar. A substituição afeta apenas este ingrediente neste dia, e fica guardada nas próximas visitas.</div>
        </div>
      `}
      <div class="btn-row" style="margin-top: 16px;">
        <button type="button" class="btn btn-ghost" id="btn-reset-ing">${icons.refresh(14)} Reverter para original</button>
        <button type="button" class="btn btn-secondary" data-modal-close>Cancelar</button>
      </div>
    </div>
  `;

  const close = openModal(contentHtml);

  // Apply substitution
  const subKey = `${dayIdx}:${mealIdx}:${ingIdx}`;
  document.querySelectorAll('.sub-option').forEach(li => {
    li.addEventListener('click', () => {
      const subId = li.dataset.subId;
      const subGrams = Number(li.dataset.subGrams);
      subs[subKey] = { food: subId, grams: subGrams };
      saveSubstitutions(subs);
      close();
      // re-render
      const newPlan = applySubstitutions(plan, subs);
      render(mount, newPlan, loadResults(), subs);
    });
  });

  // Revert
  const resetBtn = document.getElementById('btn-reset-ing');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (subs[subKey]) {
        delete subs[subKey];
        saveSubstitutions(subs);
      }
      close();
      const newPlan = applySubstitutions(plan, subs);
      render(mount, newPlan, loadResults(), subs);
    });
  }
}

/* ============================================================================ */
/* Substitution application                                                     */
/* ============================================================================ */

function applySubstitutions(plan, subs) {
  if (!subs || Object.keys(subs).length === 0) return plan;

  return plan.map((day, dayIdx) => {
    const newMeals = day.meals.map((meal, mealIdx) => {
      const newIngredients = meal.ingredients.map((ing, ingIdx) => {
        const key = `${dayIdx}:${mealIdx}:${ingIdx}`;
        const sub = subs[key];
        if (!sub) return ing;
        const newFood = getFood(sub.food);
        if (!newFood) return ing;
        const macros = calcFoodMacros(sub.food, sub.grams);
        return {
          food: sub.food,
          label: newFood.name,
          grams: sub.grams,
          display: formatQty(sub.food, sub.grams),
          macros,
        };
      });

      const totals = newIngredients.reduce((acc, i) => ({
        kcal: acc.kcal + i.macros.kcal,
        prot: acc.prot + i.macros.prot,
        carb: acc.carb + i.macros.carb,
        fat: acc.fat + i.macros.fat,
      }), { kcal: 0, prot: 0, carb: 0, fat: 0 });

      return {
        ...meal,
        ingredients: newIngredients,
        totals: {
          kcal: Math.round(totals.kcal),
          prot: Math.round(totals.prot * 10) / 10,
          carb: Math.round(totals.carb * 10) / 10,
          fat: Math.round(totals.fat * 10) / 10,
        },
      };
    });

    const dayTotals = newMeals.reduce((acc, m) => ({
      kcal: acc.kcal + m.totals.kcal,
      prot: acc.prot + m.totals.prot,
      carb: acc.carb + m.totals.carb,
      fat: acc.fat + m.totals.fat,
    }), { kcal: 0, prot: 0, carb: 0, fat: 0 });

    return {
      ...day,
      meals: newMeals,
      totals: {
        kcal: Math.round(dayTotals.kcal),
        prot: Math.round(dayTotals.prot),
        carb: Math.round(dayTotals.carb),
        fat: Math.round(dayTotals.fat),
      },
    };
  });
}

/* ============================================================================ */
/* Shopping list                                                                */
/* ============================================================================ */

function renderShoppingList(days) {
  const totals = {};
  days.forEach(day => {
    day.meals.forEach(meal => {
      meal.ingredients.forEach(ing => {
        if (!totals[ing.food]) totals[ing.food] = 0;
        totals[ing.food] += ing.grams;
      });
    });
  });

  // Agrupar por categoria
  const byCategory = {};
  Object.entries(totals).forEach(([foodId, grams]) => {
    const f = FOODS[foodId];
    if (!f) return;
    const cat = f.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push({ foodId, food: f, grams: Math.ceil(grams / 50) * 50 });
  });

  const CAT_LABEL = {
    protein: 'Proteínas',
    carb: 'Carboidratos',
    fat: 'Gorduras e oleaginosas',
    fruit: 'Frutas',
    veg: 'Vegetais',
    dairy: 'Lácteos',
    extra: 'Extras e temperos',
  };

  const catOrder = ['protein', 'carb', 'dairy', 'fruit', 'veg', 'fat', 'extra'];

  return catOrder.filter(c => byCategory[c]).map(cat => `
    <div class="shopping-cat">
      <h4 class="shopping-cat-title">${CAT_LABEL[cat] || cat}</h4>
      <ul class="shopping-list">
        ${byCategory[cat].sort((a, b) => b.grams - a.grams).map(item => `
          <li class="shopping-item">
            <span class="shopping-name">${item.food.name}</span>
            <span class="shopping-qty">
              ${item.food.category === 'dairy' ? `~${item.grams} ml` : `~${formatGramsHumans(item.grams)}`}
            </span>
          </li>
        `).join('')}
      </ul>
    </div>
  `).join('');
}

function formatGramsHumans(g) {
  if (g >= 1000) return `${(g / 1000).toFixed(1)} kg`;
  return `${g} g`;
}

/* ============================================================================ */
/* Utils                                                                        */
/* ============================================================================ */

function countSolid(day) { return day.meals.filter(m => m.type === 'solid').length; }
function countShake(day) { return day.meals.filter(m => m.type === 'shake').length; }

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
