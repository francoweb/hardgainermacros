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
  loadCustomFoods, saveCustomFoods,
  loadAdditions, saveAdditions,
  loadFormData,
} from '../modules/storage.js';
import { formatKcal } from '../modules/calculator.js';
import {
  FOODS, calcFoodMacros, getSubstitutes, formatQty, getFood,
} from '../data/foods.js';

export function renderPlanoPage(mount) {
  const plan = loadPlan();
  const results = loadResults();
  if (!plan || !results) { navigate('/'); return; }
  rebuildAndRender(mount);
}

/** Recarrega estado do localStorage e re-renderiza a página completa. */
function rebuildAndRender(mount) {
  const originalPlan = loadPlan();
  const results = loadResults();
  if (!originalPlan || !results) return;
  const subs = loadSubstitutions();
  const additions = loadAdditions();
  const effective = applyAdditions(applySubstitutions(originalPlan, subs), additions);
  render(mount, effective, results, subs, originalPlan, additions);
}

const PLAN_STRATEGY_LABEL = {
  solid: 'Mais Refeições Sólidas',
  hybrid: 'Sistema Híbrido',
  practical: 'Máxima Praticidade',
};

function render(mount, plan, results, subs, originalPlan, additions) {
  const strategy = results.routine?.strategy;
  const strategyLabel = PLAN_STRATEGY_LABEL[strategy] || 'Sistema Híbrido';
  const solidCount = countSolid(plan[0]);
  const shakeCount = countShake(plan[0]);
  const solidText = solidCount === 1 ? '1 Refeição Sólida' : `${solidCount} Refeições Sólidas`;
  const shakeText = shakeCount === 1 ? '1 Shake Anabólico' : `${shakeCount} Shakes Anabólicos`;

  // P1: texto de "Princípios das Receitas" condicional por estratégia
  const principiosText = strategy === 'solid'
    ? 'Todas as refeições são sólidas: carboidratos de digestão leve (arroz branco, pão francês, macarrão, batata) e proteínas completas (ovos, frango, carne magra, peixe) em cada bloco. A estrutura valoriza volume e variedade para atingir o superávit calórico com comida de verdade.'
    : 'Todas as refeições seguem o Sistema Híbrido do ebook: refeições sólidas com carboidratos de digestão leve (arroz branco, pão francês, macarrão, batata) e proteínas completas (ovos, frango, carne magra, peixe). Os shakes combinam whey, leite integral, fruta e uma fonte de gordura boa (pasta de amendoim, aveia ou azeite) para concentrar calorias.';

  // P2: item 2 de "Como Aplicar" condicional por estratégia
  const item2Text = strategy === 'solid'
    ? '<strong>Monte a proteína antes:</strong> cozinhe frango, ovo ou carne magra com antecedência. Uma fonte de proteína pronta elimina a principal barreira das refeições sólidas.'
    : '<strong>Shakes prontos em 2 minutos:</strong> tenha whey, leite e aveia sempre à mão. Um shake não pode ser "projeto".';
  mount.innerHTML = `
    <div class="container container-wide">
      <!-- Toolbar (escondida na impressão) -->
      <div class="plan-toolbar no-print">
        <button type="button" class="btn btn-secondary" id="btn-back-results">${icons.arrowLeft(16)} Voltar aos Resultados</button>
        <div class="plan-toolbar-right">
          <button type="button" class="btn btn-ghost" id="btn-print-compact">${icons.print(16)} PDF Compacto</button>
          <button type="button" class="btn btn-primary" id="btn-print">${icons.print(16)} Imprimir Plano Completo</button>
        </div>
      </div>

      <!-- Hero -->
      <div class="plan-hero">
        <h1 class="hero-title">Seu Plano Alimentar de 14 Dias</h1>
        <p class="hero-sub">${strategyLabel}: ${solidText} + ${shakeText}</p>
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

      <!-- Nota informativa sobre variação de valores -->
      <details class="no-print" style="margin-bottom: 20px; background: #f0f6fa; border: 1px solid #c5dde8; border-left: 4px solid #6ba8b8; border-radius: 0 8px 8px 0; padding: 10px 16px; font-size: 13px; color: #2e4a55; line-height: 1.6; box-sizing: border-box; width: 100%;">
        <summary style="cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
          <span style="font-size: 13px; font-weight: 600; color: #1e3a44;">ℹ️ Por que os valores podem variar?</span>
          <span style="font-size: 11px; white-space: nowrap; color: #6ba8b8; flex-shrink: 0;">▸ Ver mais</span>
        </summary>
        <div style="margin: 10px 0 2px; padding-top: 10px; border-top: 1px solid #c5dde8; color: #3a5a66; font-size: 13px;">
          <p style="margin: 0 0 8px;">Os valores podem variar ligeiramente porque o plano usa alimentos reais, porções práticas e arredondamentos naturais. Mesmo assim, continuam próximos do alvo calculado.</p>
          <p style="margin: 0 0 8px;">Exemplo: se a sua meta diária é <strong>${formatKcal(results.calories)} kcal</strong>, um dia com ${formatKcal(results.calories - 30)} kcal ou ${formatKcal(results.calories + 30)} kcal continua dentro de uma margem normal. Alimentos reais não encaixam sempre em números matemáticos perfeitos. O mais importante é manter a consistência ao longo da semana, seguir a estrutura das refeições e ajustar pequenas quantidades apenas se necessário.</p>
          <strong style="color: #1e3a44;">Pequenas diferenças não significam erro no plano.</strong>
        </div>
      </details>

      <!-- Aviso: dados locais -->
      <div class="local-data-notice no-print" data-testid="local-data-notice">
        <span class="local-data-notice-icon">🔒</span>
        <span>Os seus alimentos personalizados ficam guardados apenas neste navegador. Se limpar a cache, trocar de dispositivo ou clicar em Resetar, estes dados podem ser apagados.</span>
      </div>

      <!-- Days -->
      <div id="days-container">
        ${plan.map((day, idx) => renderDayCard(day, idx, subs, originalPlan?.[idx], results.calories, additions)).join('')}
      </div>

      <!-- Receitas base (no-print friendly) -->
      <div class="card card-section">
        <h3 class="card-title">${icons.utensils(18)} Princípios das Receitas</h3>
        <p class="card-body">${principiosText}</p>
        <p class="card-body">
          Você pode substituir qualquer ingrediente por outro da mesma categoria — basta clicar no ícone <span style="display:inline-flex; vertical-align:middle;">${icons.swap(14)}</span> ao lado do ingrediente. A substituição mantém as calorias e proporção de macros.
        </p>
      </div>

      <!-- Lista de compras -->
      <div class="card card-section">
        <div class="day-head" id="shopping-head" role="button" aria-expanded="true" tabindex="0">
          <div class="day-num">${icons.list(18)}</div>
          <div class="day-info">
            <div class="day-name">Lista de Compras (7 Primeiros Dias)</div>
            <div class="day-summary">Agregada de todas as refeições • Quantidades aproximadas</div>
          </div>
          <div class="day-chev" style="transform:rotate(180deg)">${icons.chevDown(18)}</div>
        </div>
        <div class="day-body" id="shopping-body" style="display:block;">
          ${renderShoppingList(plan.slice(0, 7))}
        </div>
      </div>

      <!-- Como aplicar -->
      <div class="card card-section">
        <h3 class="card-title">${icons.target(18)} Como Aplicar Sem Falhar</h3>
        <ol class="rec-list">
          <li class="rec-item"><span class="rec-num">1</span><div><strong>Prepare com antecedência:</strong> domingo à noite, cozinhe arroz, carnes e deixe frutas cortadas. Reduz fricção nos dias de semana.</div></li>
          <li class="rec-item"><span class="rec-num">2</span><div>${item2Text}</div></li>
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
  document.getElementById('btn-print-compact').addEventListener('click', () => exportCompactPlanPDF(plan, results));
  document.getElementById('btn-print').addEventListener('click', () => exportFullPlanPDF(plan, results));

  // Day collapse — accordion exclusivo: apenas 1 dia aberto por vez
  mount.querySelectorAll('[data-day-head]').forEach(head => {
    const toggle = () => {
      const idx = head.dataset.dayHead;
      const body = document.getElementById(`day-body-${idx}`);
      const chev = head.querySelector('.day-chev');
      const open = body.style.display !== 'none';

      // Se vai abrir, fecha todos os outros dias primeiro
      if (!open) {
        mount.querySelectorAll('[data-day-head]').forEach(otherHead => {
          if (otherHead === head) return;
          const otherBody = document.getElementById(`day-body-${otherHead.dataset.dayHead}`);
          const otherChev = otherHead.querySelector('.day-chev');
          if (otherBody && otherBody.style.display !== 'none') {
            otherBody.style.display = 'none';
            otherHead.setAttribute('aria-expanded', 'false');
            if (otherChev) otherChev.style.transform = 'rotate(0deg)';
          }
        });
      }

      body.style.display = open ? 'none' : 'block';
      head.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (chev) chev.style.transform = open ? 'rotate(0deg)' : 'rotate(180deg)';

      // Rola suavemente para o início do dia recém-aberto
      if (!open) {
        requestAnimationFrame(() => {
          const card = head.closest('.day');
          const top = card.getBoundingClientRect().top + window.scrollY - 12;
          window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        });
      }
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
      openSubModal(Number(dayIdx), Number(mealIdx), Number(ingIdx), mount, results);
    });
  });

  // Revert buttons — inline nos ingredientes já substituídos
  mount.querySelectorAll('[data-revert]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const { dayIdx, mealIdx, ingIdx } = btn.dataset;
      const currentSubs = loadSubstitutions();
      const subKey = `${dayIdx}:${mealIdx}:${ingIdx}`;
      if (currentSubs[subKey]) {
        delete currentSubs[subKey];
        saveSubstitutions(currentSubs);
      }
      rebuildAndRender(mount);
    });
  });

  // Add food buttons
  mount.querySelectorAll('[data-add-food]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const { dayIdx, mealIdx } = btn.dataset;
      openAddFoodModal(Number(dayIdx), Number(mealIdx), mount);
    });
  });

  // Edit addition buttons
  mount.querySelectorAll('[data-edit-addition]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const { additionId, dayIdx, mealIdx } = btn.dataset;
      openEditFoodModal(additionId, Number(dayIdx), Number(mealIdx), mount);
    });
  });

  // Remove addition buttons
  mount.querySelectorAll('[data-remove-addition]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const { additionId, dayIdx, mealIdx } = btn.dataset;
      const currentAdditions = loadAdditions();
      const addKey = `${dayIdx}:${mealIdx}`;
      if (currentAdditions[addKey]) {
        currentAdditions[addKey] = currentAdditions[addKey].filter(a => a.id !== additionId);
        if (currentAdditions[addKey].length === 0) delete currentAdditions[addKey];
      }
      saveAdditions(currentAdditions);
      rebuildAndRender(mount);
    });
  });

  // PDF por dia — abre popup limpa com apenas o dia selecionado
  mount.querySelectorAll('[data-pdf-day]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dayIdx = Number(btn.dataset.pdfDay);
      exportDayPDF(plan[dayIdx], dayIdx, results);
    });
  });

  // Botão flutuante Voltar ao Topo — remove anterior se existir (re-render seguro)
  const existingBackTop = document.getElementById('back-to-top-btn');
  if (existingBackTop) existingBackTop.remove();

  const backTopBtn = document.createElement('button');
  backTopBtn.id = 'back-to-top-btn';
  backTopBtn.className = 'no-print';
  backTopBtn.setAttribute('aria-label', 'Voltar ao topo');
  backTopBtn.setAttribute('title', 'Voltar ao topo');
  backTopBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>';
  backTopBtn.style.cssText = [
    'position:fixed', 'bottom:28px', 'right:28px',
    'width:36px', 'height:36px', 'border-radius:50%',
    'background:#c26d5a', 'color:#fff', 'border:none',
    'cursor:pointer', 'display:none', 'align-items:center', 'justify-content:center',
    'box-shadow:0 1px 5px rgba(194,109,90,0.25)',
    'z-index:900', 'transition:transform 0.15s ease,box-shadow 0.15s ease,background 0.15s ease',
    'outline:none',
  ].join(';');
  document.body.appendChild(backTopBtn);

  backTopBtn.addEventListener('mouseenter', () => {
    backTopBtn.style.transform = 'translateY(-1px)';
    backTopBtn.style.background = '#b45d4a';
    backTopBtn.style.boxShadow = '0 4px 12px rgba(194,109,90,0.32)';
  });
  backTopBtn.addEventListener('mouseleave', () => {
    backTopBtn.style.transform = '';
    backTopBtn.style.background = '#c26d5a';
    backTopBtn.style.boxShadow = '0 2px 8px rgba(194,109,90,0.25)';
  });

  backTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  const onBackTopScroll = () => {
    // Auto-remove listener se o botão já não existe (navegação SPA)
    if (!document.getElementById('back-to-top-btn')) {
      window.removeEventListener('scroll', onBackTopScroll);
      return;
    }
    backTopBtn.style.display = window.scrollY > 300 ? 'flex' : 'none';
  };
  window.addEventListener('scroll', onBackTopScroll, { passive: true });
}

/* ============================================================================ */
/* Day card rendering                                                           */
/* ============================================================================ */

function renderDayCard(day, idx, subs, originalDay, targetKcal, additions) {
  const isOpen = idx === 0;
  const dayHasSubs      = Object.keys(subs      || {}).some(k => k.startsWith(`${idx}:`));
  const dayHasAdditions = Object.keys(additions  || {}).some(k => k.startsWith(`${idx}:`));
  const dayHasChanges   = dayHasSubs || dayHasAdditions;
  const origT = originalDay?.totals;
  const curT = day.totals;
  let dayCompBlock = '';
  if (dayHasChanges && origT) {
    const dKcal = curT.kcal - origT.kcal;
    const dProt = Math.round(curT.prot) - Math.round(origT.prot);
    const dCarb = Math.round(curT.carb) - Math.round(origT.carb);
    const dFat  = Math.round(curT.fat)  - Math.round(origT.fat);
    const withinGoal = targetKcal ? isWithinGoalTolerance(curT.kcal, targetKcal) : true;
    const statusCls  = withinGoal ? 'day-comp-status day-comp-ok'  : 'day-comp-status day-comp-warn';
    const statusTxt  = withinGoal ? 'Dentro do objetivo ✅' : 'Atenção: fora da margem ⚠️';
    dayCompBlock = `
      <div class="day-comparison-block no-print" data-testid="day-comp-block">
        <div class="day-comp-row day-comp-row-current">
          <span class="day-comp-lbl">Com substituições</span>
          <span class="day-comp-vals" data-testid="day-current-totals">${curT.kcal} kcal • P:${Math.round(curT.prot)}g • C:${Math.round(curT.carb)}g • G:${Math.round(curT.fat)}g</span>
        </div>
        <div class="day-comp-row day-comp-row-orig">
          <span class="day-comp-lbl">Original</span>
          <span class="day-comp-vals" data-testid="day-original-totals">${origT.kcal} kcal • P:${Math.round(origT.prot)}g • C:${Math.round(origT.carb)}g • G:${Math.round(origT.fat)}g</span>
        </div>
        <div class="day-comp-row day-comp-row-delta">
          <span class="day-comp-lbl">Diferença</span>
          <span class="day-comp-vals" data-testid="day-delta-totals">${signStr(dKcal)}${dKcal} kcal • ${signStr(dProt)}${dProt}g P • ${signStr(dCarb)}${dCarb}g C • ${signStr(dFat)}${dFat}g G</span>
        </div>
        <div class="${statusCls}">${statusTxt}</div>
      </div>`;
  }
  return `
    <div class="day ${isOpen ? 'open' : ''}">
      <div class="day-head" data-day-head="${idx}" role="button" aria-expanded="${isOpen}" tabindex="0">
        <div class="day-num">${idx + 1}</div>
        <div class="day-info">
          <div class="day-name">Dia ${idx + 1} • ${day.dayName}</div>
          <div class="day-summary">
            <span class="day-sum-item">${day.meals.length} refeições</span>
            <span class="day-sum-sep">•</span>
            <span class="day-sum-item"><strong>${formatKcal(day.totals.kcal)}</strong> kcal</span>
            <span class="day-sum-sep">•</span>
            <span class="day-sum-item">P:${Math.round(day.totals.prot)}g</span>
            <span class="day-sum-sep">•</span>
            <span class="day-sum-item">C:${Math.round(day.totals.carb)}g</span>
            <span class="day-sum-sep">•</span>
            <span class="day-sum-item">G:${Math.round(day.totals.fat)}g</span>
          </div>
          ${dayCompBlock}
        </div>
        <!-- Botão PDF compacto no cabeçalho — visível mesmo com o dia colapsado -->
        <button
          type="button"
          class="btn btn-primary no-print"
          data-pdf-day="${idx}"
          aria-label="Baixar PDF do Dia ${idx + 1}"
          title="Baixar PDF do Dia ${idx + 1}"
          style="padding: 6px 12px; font-size: 12px; line-height: 1.4; white-space: nowrap; margin-right: 8px; flex-shrink: 0;"
        >${icons.download(13)} Baixar PDF</button>
        <div class="day-chev" style="${isOpen ? 'transform: rotate(180deg);' : ''}">${icons.chevDown(18)}</div>
      </div>
      <div class="day-body" id="day-body-${idx}" style="display:${isOpen ? 'block' : 'none'};">
        ${day.meals.map((meal, mIdx) => renderMealCard(meal, idx, mIdx, subs)).join('')}
      </div>
    </div>
  `;
}

function renderMealCard(meal, dayIdx, mealIdx, subs) {
  const safeSubs = subs || {};
  const isImperial = loadFormData()?.unit === 'imperial';
  return `
    <div class="meal-card ${meal.type}">
      <div class="meal-card-head">
        <div>
          <div style="font-size: 11px; font-weight: 700; color: #7a5235; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">Refeição ${mealIdx + 1}<span style="font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #8a7f75; background: #f0ede8; border-radius: 3px; padding: 1px 5px; flex-shrink: 0;">Dia ${dayIdx + 1}</span></div>
          <div class="meal-card-time">${meal.time || ''}</div>
          <div class="meal-card-name">${meal.slotLabel} — ${meal.name}</div>
        </div>
        <span class="meal-card-badge ${meal.type}">${meal.type === 'solid' ? 'Sólida' : 'Shake'}</span>
      </div>

      <div class="meal-totals" data-meal-totals="${dayIdx}-${mealIdx}">
        <span class="meal-total"><span class="meal-total-dot" style="background: var(--cal-color)"></span> ${formatKcal(meal.totals.kcal)} kcal</span>
        <span class="meal-total"><span class="meal-total-dot" style="background: var(--protein-color)"></span> ${meal.totals.prot}g P</span>
        <span class="meal-total"><span class="meal-total-dot" style="background: var(--carb-color)"></span> ${meal.totals.carb}g C</span>
        <span class="meal-total"><span class="meal-total-dot" style="background: var(--fat-color)"></span> ${meal.totals.fat}g G</span>
      </div>

      <div class="ingredient-label">Detalhamento Por Alimento</div>
      <ul class="ingredient-list">
        ${meal.ingredients.map((ing, iIdx) => {
          const isAdded = ing.isAddition === true;
          const subKey  = `${dayIdx}:${mealIdx}:${iIdx}`;
          const isSub   = !isAdded && !!(safeSubs[subKey]);
          const liClass = `ingredient${isSub ? ' ingredient-substituted' : ''}${isAdded ? ' ingredient-added' : ''}`;
          return `
            <li class="${liClass}">
              <div class="ingredient-main">
                <div class="ingredient-name">
                  ${ing.label || (getFoodWithCustom(ing.food)?.name || ing.food)}
                  ${isSub   ? '<span class="ing-badge-subst">Substituído</span>' : ''}
                  ${isAdded ? '<span class="ing-badge-added">Adicionado</span>' : ''}
                </div>
                <div class="ingredient-qty">${isImperial && !ing.isAddition ? toImperialDisplay(ing.display) : ing.display}</div>
                <div class="ingredient-macros">${ing.macros.kcal} kcal • P:${ing.macros.prot}g C:${ing.macros.carb}g G:${ing.macros.fat}g</div>
                ${isAdded && ing.micronutrients ? buildNutriDetailsHtml(ing.micronutrients, ing.grams) : ''}
                ${isSub   ? `<button type="button" class="ing-revert-btn no-print" data-revert data-day-idx="${dayIdx}" data-meal-idx="${mealIdx}" data-ing-idx="${iIdx}" aria-label="Reverter para original">${icons.refresh(11)} Reverter para original</button>` : ''}
                ${isAdded ? `<button type="button" class="ing-edit-btn no-print" data-edit-addition data-addition-id="${ing.additionId}" data-day-idx="${dayIdx}" data-meal-idx="${mealIdx}" aria-label="Editar alimento adicionado">✎ Editar</button>` : ''}
                ${isAdded ? `<button type="button" class="ing-remove-btn no-print" data-remove-addition data-addition-id="${ing.additionId}" data-day-idx="${dayIdx}" data-meal-idx="${mealIdx}" aria-label="Remover alimento adicionado">✕ Remover</button>` : ''}
              </div>
              ${!isAdded ? `<button type="button" class="ingredient-sub-btn no-print" data-swap data-day-idx="${dayIdx}" data-meal-idx="${mealIdx}" data-ing-idx="${iIdx}" aria-label="Substituir ${ing.label || ing.food}">${icons.swap(14)} Substituir</button>` : ''}
            </li>
          `;
        }).join('')}
      </ul>
      <div class="ing-add-row no-print">
        <button type="button" class="ing-add-btn" data-add-food data-testid="add-food-button"
                data-day-idx="${dayIdx}" data-meal-idx="${mealIdx}"
                aria-label="Adicionar alimento extra à refeição ${mealIdx + 1}">
          + Adicionar alimento
        </button>
      </div>

      ${(meal.steps && meal.steps.length) || meal.note ? `
        <details class="prep-details">
          <summary class="prep-summary">
            ${icons.utensils(14)}
            <span class="prep-show-text">Ver preparação</span>
            <span class="prep-hide-text">Ocultar preparação</span>
            ${icons.chevDown(12)}
          </summary>
          ${meal.steps && meal.steps.length ? `
            <div class="prep-section">
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
        </details>
      ` : ''}
    </div>
  `;
}

/* ============================================================================ */
/* Substitution helpers                                                         */
/* ============================================================================ */

/** Proteins that require a practical minimum/floor when suggested as substitutes. */
const SUB_PROTEIN_PESAVEL = new Set([
  'peito_frango', 'carne_moida', 'peixe_tilapia', 'peixe_pescada',
  'peixe_salmao', 'atum_agua',
  'coxa_frango', 'peito_peru', 'alcatra_grelhada', 'camarao', 'bacalhau_fresco',
]);
/** Carbs that should be rounded to 10g multiples in substitutions. */
const SUB_CARB_FLEX = new Set([
  'arroz_branco_cozido', 'arroz_basmati_cozido', 'macarrao_cozido',
  'aveia_flocos', 'feijao_carioca', 'lentilha_cozida', 'pure_batata',
  'polenta', 'cuscuz', 'tapioca',
  'arroz_integral_cozido', 'arroz_jasmine_cozido', 'quinoa_cozida', 'creme_arroz',
]);

/**
 * Applies practical rounding to a raw substitute quantity.
 * Mirrors the plan-generation rules so substituted quantities
 * are never impractical (e.g. 43g of chicken, 73g of rice).
 */
function subPracticalGrams(foodId, rawGrams) {
  const food = getFood(foodId);
  if (!food) return Math.round(rawGrams);
  if (foodId === 'ovo_inteiro') return Math.max(50, Math.round(rawGrams / 50) * 50);
  if (foodId === 'whey') return Math.max(15, Math.round(rawGrams / 15) * 15);
  if (SUB_PROTEIN_PESAVEL.has(foodId)) {
    const r10 = Math.round(rawGrams / 10) * 10;
    if (r10 < 50) return 50;
    if (r10 < 100) return 100;
    return r10;
  }
  if (SUB_CARB_FLEX.has(foodId)) return Math.max(50, Math.round(rawGrams / 10) * 10);
  if (food.category === 'dairy') return Math.max(20, Math.round(rawGrams / 10) * 10);
  if (food.countableUnit && food.units && food.units.length) {
    const u = food.units[0];
    return Math.max(u.grams, Math.round(rawGrams / u.grams) * u.grams);
  }
  if (rawGrams < 30) return Math.max(3, Math.round(rawGrams / 2) * 2);
  if (rawGrams < 100) return Math.round(rawGrams / 5) * 5;
  return Math.round(rawGrams / 10) * 10;
}

/**
 * Classifies a substitution option based on the PROJECTED DAY TOTAL after the swap,
 * compared against the user's actual daily targets (kcal + macros).
 * The projected totals already include: plano original + subs anteriores + adições manuais
 * + a nova substituição simulada.
 *
 * Todas as comparações são projected vs alvo diário:
 *   Calorie window  :  target − 100 ≤ projected.kcal ≤ target + 200
 *   Fat alert       :  projected.fat > results.fat.grams + 15g
 *   Protein floor   :  projected.prot < results.protein.grams − 25g
 *   Carb range      :  |projected.carb − results.carb.grams| > 60g
 *
 * @param {{ kcal:number, prot:number, carb:number, fat:number }} projected  Totais do dia após swap
 * @param {{ calories:number, protein:{grams:number}, carb:{grams:number}, fat:{grams:number} }} results
 */
function getDailyImpact(projected, results) {
  const dKcal = projected.kcal - results.calories;
  const dFat  = projected.fat  - results.fat.grams;       // gordura projetada vs alvo diário
  const dProt = projected.prot - results.protein.grams;
  const dCarb = projected.carb - results.carb.grams;

  // Calorias muito abaixo do alvo diário
  if (dKcal < -100)
    return { cls: 'sub-impact-low',   label: 'Fora da margem: muito baixo' };

  // Calorias muito acima do alvo diário
  if (dKcal >  200)
    return { cls: 'sub-impact-high',  label: 'Fora da margem: muito alto' };

  // Gordura projetada > alvo + 15g (1g gordura = 9 kcal — sobe rápido)
  if (dFat  >   15)
    return { cls: 'sub-impact-macro', label: 'Atenção: gorduras acima do alvo' };

  // Macros desequilibrados — proteína muito baixa ou carboidratos muito fora do alvo
  if (dProt <  -25 || Math.abs(dCarb) > 60)
    return { cls: 'sub-impact-macro', label: 'Atenção: macros desequilibrados' };

  // Kcal ligeiramente abaixo do alvo (aceitável mas não ideal)
  if (dKcal < -50)
    return { cls: 'sub-impact-ok',   label: 'Atenção: abaixo do alvo' };

  // Kcal ligeiramente acima do alvo (aceitável mas não ideal)
  if (dKcal > 100)
    return { cls: 'sub-impact-ok',   label: 'Atenção: acima do alvo' };

  // Dentro da janela ideal
  return { cls: 'sub-impact-safe', label: 'Troca segura' };
}

/**
 * Builds the display string for a whey substitution quantity.
 * Mirrors the scaleMeal whey handler.
 */
function buildWheyDisplay(grams) {
  const ratio = grams / 30;
  if (ratio <= 0.5) return `meio scoop/medidor (${grams}g)`;
  if (ratio === 1) return `1 scoop/medidor (${grams}g)`;
  if (ratio === 1.5) return `1 scoop e meio/medidor (${grams}g)`;
  if (Number.isInteger(ratio)) return `${ratio} scoops/medidor (${grams}g)`;
  return `${grams}g`;
}

/* ============================================================================ */
/* Substitution totals summary (hero + day card)                               */
/* ============================================================================ */

/** Returns '+' for non-negative numbers, '' otherwise. */
function signStr(n) { return n >= 0 ? '+' : ''; }

/**
 * Returns the sorted list of day indices that have at least one substitution.
 */
function getAffectedDayIndices(subs) {
  const affected = new Set();
  Object.keys(subs || {}).forEach(key => {
    const idx = parseInt(key.split(':')[0], 10);
    if (!isNaN(idx)) affected.add(idx);
  });
  return [...affected].sort((a, b) => a - b);
}

/**
 * True if actualKcal is within the asymmetric safe window:
 *   targetKcal − 100  ≤  actualKcal  ≤  targetKcal + 200
 * Consistent with the getDailyImpact() calorie window.
 */
function isWithinGoalTolerance(actualKcal, targetKcal) {
  const diff = actualKcal - targetKcal;
  return diff >= -100 && diff <= 200;
}

/**
 * Builds the HTML banner shown in the plan hero when substitutions are active.
 * For each affected day: compares original totals vs effective totals.
 * If multiple days: shows the average.
 */
function renderSubsHeroSummary(originalPlan, effectivePlan, affectedDays, targetKcal) {
  let origKcal = 0, origProt = 0, origCarb = 0, origFat = 0;
  let currKcal = 0, currProt = 0, currCarb = 0, currFat = 0;

  affectedDays.forEach(idx => {
    const o = originalPlan[idx]?.totals || {};
    const c = effectivePlan[idx]?.totals || {};
    origKcal += o.kcal || 0; origProt += o.prot || 0;
    origCarb += o.carb || 0; origFat  += o.fat  || 0;
    currKcal += c.kcal || 0; currProt += c.prot || 0;
    currCarb += c.carb || 0; currFat  += c.fat  || 0;
  });

  const n = affectedDays.length;
  // Average when multiple days, round single day
  origKcal = Math.round(origKcal / n); origProt = Math.round(origProt / n);
  origCarb = Math.round(origCarb / n); origFat  = Math.round(origFat  / n);
  currKcal = Math.round(currKcal / n); currProt = Math.round(currProt / n);
  currCarb = Math.round(currCarb / n); currFat  = Math.round(currFat  / n);

  const dKcal = currKcal - origKcal;
  const dProt = currProt - origProt;
  const dCarb = currCarb - origCarb;
  const dFat  = currFat  - origFat;
  const inGoal = isWithinGoalTolerance(currKcal, targetKcal);

  const dayLabel = n === 1
    ? `Dia ${affectedDays[0] + 1}`
    : `${n} dias (${affectedDays.map(i => `Dia ${i + 1}`).join(', ')})`;

  return `
    <div class="plan-subs-banner no-print" data-testid="plan-subs-banner">
      <div class="plan-subs-banner-title">🔄 Com substituições — ${dayLabel}</div>
      <div class="plan-subs-rows">
        <div class="plan-subs-row plan-subs-row-current">
          <span class="plan-subs-lbl">Atual</span>
          <span class="plan-subs-vals plan-subs-vals-current"><strong>${currKcal} kcal</strong> • P:${currProt}g • C:${currCarb}g • G:${currFat}g</span>
        </div>
        <div class="plan-subs-row plan-subs-row-orig">
          <span class="plan-subs-lbl">Original</span>
          <span class="plan-subs-vals">${origKcal} kcal • P:${origProt}g • C:${origCarb}g • G:${origFat}g</span>
        </div>
        <div class="plan-subs-row plan-subs-row-delta">
          <span class="plan-subs-lbl">Diferença</span>
          <span class="plan-subs-vals">${signStr(dKcal)}${dKcal} kcal • ${signStr(dProt)}${dProt}g P • ${signStr(dCarb)}${dCarb}g C • ${signStr(dFat)}${dFat}g G</span>
        </div>
      </div>
      <div class="plan-subs-status ${inGoal ? 'plan-subs-ok' : 'plan-subs-warn'}">
        ${inGoal ? '✅ Dentro do objetivo' : '⚠️ Atenção: fora da margem do objetivo (±4%)'}
      </div>
    </div>
  `;
}

/* ============================================================================ */
/* Substitution modal                                                           */
/* ============================================================================ */

const SUB_CAT_LABEL = {
  protein: 'Proteínas',
  dairy:   'Laticínios',
  carb:    'Carboidratos',
  fat:     'Gorduras',
  fruit:   'Frutas',
  veg:     'Vegetais',
  extra:   'Extras',
};
const SUB_CAT_ORDER = ['protein', 'dairy', 'carb', 'fat', 'fruit', 'veg', 'extra'];

function openSubModal(dayIdx, mealIdx, ingIdx, mount, results) {
  const plan      = loadPlan();
  let subs        = loadSubstitutions();
  const additions = loadAdditions();

  // effective: subs aplicadas, mas SEM adições — preserva os índices originais dos ingredientes
  const effective     = applySubstitutions(plan, subs);
  // effectiveFull: subs + adições — total real que o utilizador vê no dia
  const effectiveFull = applyAdditions(effective, additions);
  // Total actual do dia (inclui subs já feitas + alimentos adicionados manualmente)
  const currentDayTotal = effectiveFull[dayIdx].totals;

  const meal = effective[dayIdx].meals[mealIdx];
  const ing = meal.ingredients[ingIdx];
  const subKey = `${dayIdx}:${mealIdx}:${ingIdx}`;
  const isAlreadySubstituted = !!(subs[subKey]);

  // Original ingredient (from base plan — used for revert label)
  const originalIng = plan[dayIdx].meals[mealIdx].ingredients[ingIdx];
  const originalFoodName = originalIng.label
    || getFood(originalIng.food)?.name
    || originalIng.food;

  // Current food (may be the substituted food) — supports custom foods
  const currentFood = getFoodWithCustom(ing.food);
  if (!currentFood) return;

  // Build substitute candidates with practical rounding applied (official foods only)
  const rawOpts = getSubstitutes(ing.food, ing.grams);
  const options = rawOpts.map(opt => {
    const practicalG = subPracticalGrams(opt.id, opt.grams);
    const macros = calcFoodMacros(opt.id, practicalG);
    const delta = macros.kcal - ing.macros.kcal;
    // Projecção do total do dia se esta opção for escolhida
    const projected = {
      kcal: currentDayTotal.kcal - ing.macros.kcal + macros.kcal,
      prot: currentDayTotal.prot - ing.macros.prot + macros.prot,
      carb: currentDayTotal.carb - ing.macros.carb + macros.carb,
      fat:  currentDayTotal.fat  - ing.macros.fat  + macros.fat,
    };
    const impact = getDailyImpact(projected, results);
    const display = opt.id === 'whey'
      ? buildWheyDisplay(practicalG)
      : formatQty(opt.id, practicalG);
    return { id: opt.id, food: opt.food, grams: practicalG, macros, display, delta, impact, projected };
  });

  // Add custom foods of the same category as substitute options
  const customFoods = loadCustomFoods();
  const targetKcalForSub = ing.macros.kcal;
  const customOpts = customFoods
    .filter(f => f.category === (currentFood.category || 'extra'))
    .map(f => {
      if (!f.per100 || f.per100.kcal <= 0) return null;
      const equivG = targetKcalForSub > 0
        ? Math.max(5, Math.round((targetKcalForSub / f.per100.kcal * 100) / 5) * 5)
        : (f.baseQuantity || 100);
      const macros = calcMacrosFromFood(f, equivG);
      const delta  = macros.kcal - ing.macros.kcal;
      const projected = {
        kcal: currentDayTotal.kcal - ing.macros.kcal + macros.kcal,
        prot: currentDayTotal.prot - ing.macros.prot + macros.prot,
        carb: currentDayTotal.carb - ing.macros.carb + macros.carb,
        fat:  currentDayTotal.fat  - ing.macros.fat  + macros.fat,
      };
      const impact = getDailyImpact(projected, results);
      const sign   = delta >= 0 ? '+' : '';
      return { id: f.id, food: f, grams: equivG, macros, display: `${equivG}g`, delta, impact, sign, projected, isCustom: true };
    })
    .filter(Boolean);

  // Group official options by category
  const grouped = {};
  options.forEach(opt => {
    const cat = opt.food.category || 'extra';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(opt);
  });

  const renderSubOpt = (opt) => {
    const sign = opt.sign !== undefined ? opt.sign : (opt.delta >= 0 ? '+' : '');
    // Linha de projecção do total diário (apenas quando results disponível)
    let projLine = '';
    if (opt.projected && results) {
      const projKcal = Math.round(opt.projected.kcal);
      const projDiff = projKcal - results.calories;
      const projSign = projDiff >= 0 ? '+' : '';
      projLine = `<div class="sub-option-proj">Dia projetado: <strong>${projKcal} kcal</strong> (${projSign}${projDiff} vs alvo ${results.calories})</div>`;
    }
    return `
      <li class="sub-option${opt.isCustom ? ' sub-option-custom' : ''}" data-sub-id="${opt.id}" data-sub-grams="${opt.grams}">
        <div class="sub-option-head">
          <div class="sub-option-name">${opt.food.name}</div>
          <div class="sub-option-qty">${opt.display}</div>
        </div>
        <div class="sub-option-macros">
          ${opt.macros.kcal} kcal (${sign}${opt.delta}) •
          P:${opt.macros.prot}g • C:${opt.macros.carb}g • G:${opt.macros.fat}g
        </div>
        ${projLine}
        <span class="sub-impact ${opt.impact.cls}">${opt.impact.label}</span>
      </li>
    `;
  };

  const optionsHtml = SUB_CAT_ORDER
    .filter(c => grouped[c])
    .map(cat => {
      const items = grouped[cat];
      return `
        <div class="sub-cat-group">
          <div class="sub-cat-label">${SUB_CAT_LABEL[cat] || cat}</div>
          ${items.map(renderSubOpt).join('')}
        </div>
      `;
    }).join('');

  const customOptsHtml = customOpts.length > 0 ? `
    <div class="sub-cat-group">
      <div class="sub-cat-label sub-cat-custom">⭐ Meus alimentos</div>
      ${customOpts.map(renderSubOpt).join('')}
    </div>
  ` : '';

  const contentHtml = `
    <div class="modal-head">
      <div>
        <div class="modal-title">Substituir alimento</div>
        <div class="modal-sub">Escolha um substituto equivalente</div>
      </div>
      <button type="button" class="modal-close" data-modal-close aria-label="Fechar">${icons.x(18)}</button>
    </div>
    <div class="modal-body">
      <div class="sub-current">
        <div class="sub-current-label">Alimento atual</div>
        <div class="sub-current-name">${ing.label || currentFood.name}</div>
        <div class="sub-current-qty">${ing.display}</div>
        <div class="sub-current-macros">${ing.macros.kcal} kcal • P:${ing.macros.prot}g • C:${ing.macros.carb}g • G:${ing.macros.fat}g</div>
      </div>
      ${options.length === 0 && customOpts.length === 0 ? `
        <p class="card-body" style="margin-top:14px;">Não há substituições equivalentes registadas para este alimento. Considere manter o original.</p>
      ` : `
        <p style="margin-top:14px; margin-bottom:0; font-size:12.5px; color:var(--ink-muted);">Clique para aplicar. Quantidade calculada para manter calorias aproximadas. Afeta apenas este ingrediente neste dia.</p>
        <ul class="sub-options" style="margin-top:10px;">${optionsHtml}${customOptsHtml}</ul>
      `}
      <div class="btn-row" style="margin-top:16px; flex-wrap:wrap;">
        ${isAlreadySubstituted ? `<button type="button" class="btn btn-ghost" id="btn-reset-ing" style="font-size:13px;">${icons.refresh(14)} Reverter: ${escapeHtml(originalFoodName)}</button>` : ''}
        <button type="button" class="btn btn-secondary" data-modal-close>Cancelar</button>
      </div>
    </div>
  `;

  const close = openModal(contentHtml);

  // Apply substitution on option click
  document.querySelectorAll('.sub-option').forEach(li => {
    li.addEventListener('click', () => {
      const subId   = li.dataset.subId;
      const subGrams = Number(li.dataset.subGrams);
      subs[subKey] = { food: subId, grams: subGrams };
      saveSubstitutions(subs);
      close();
      rebuildAndRender(mount);
    });
  });

  // Revert — only rendered when already substituted
  const resetBtn = document.getElementById('btn-reset-ing');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      delete subs[subKey];
      saveSubstitutions(subs);
      close();
      rebuildAndRender(mount);
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
        const newFood = getFoodWithCustom(sub.food);
        if (!newFood) return ing;
        const macros = calcMacrosFromFood(newFood, sub.grams);
        return {
          food: sub.food,
          label: newFood.name,
          grams: sub.grams,
          display: newFood.source === 'custom'
            ? `${sub.grams}g`
            : formatQty(sub.food, sub.grams),
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

/* ============================================================================ */
/* Custom food helpers                                                          */
/* ============================================================================ */

/** Procura alimento oficial ou personalizado pelo ID. */
function getFoodWithCustom(id) {
  return getFood(id) || (loadCustomFoods().find(f => f.id === id) || null);
}

/** Calcula macros a partir de um objeto food (suporta oficial + personalizado). */
function calcMacrosFromFood(food, grams) {
  const factor = grams / 100;
  return {
    kcal: Math.round(food.per100.kcal * factor),
    prot: Math.round(food.per100.prot * factor * 10) / 10,
    carb: Math.round(food.per100.carb * factor * 10) / 10,
    fat:  Math.round(food.per100.fat  * factor * 10) / 10,
  };
}

/** Aplica alimentos adicionados ao plano (após applySubstitutions). */
function applyAdditions(plan, additions) {
  if (!additions || Object.keys(additions).length === 0) return plan;

  return plan.map((day, dayIdx) => {
    const newMeals = day.meals.map((meal, mealIdx) => {
      const key = `${dayIdx}:${mealIdx}`;
      const mealAdds = additions[key];
      if (!mealAdds || mealAdds.length === 0) return meal;

      const addedIngredients = mealAdds.map(add => {
        const food = getFoodWithCustom(add.food) || add.snapshot;
        if (!food || !food.per100) return null;
        const macros = calcMacrosFromFood(food, add.grams);
        return {
          food: add.food,
          label: food.name,
          grams: add.grams,
          display: `${add.grams} ${add.unit || 'g'}`,
          macros,
          isAddition: true,
          additionId: add.id,
          micronutrients: food.micronutrients || null,
        };
      }).filter(Boolean);

      if (addedIngredients.length === 0) return meal;

      const newIngredients = [...meal.ingredients, ...addedIngredients];
      const totals = newIngredients.reduce((acc, i) => ({
        kcal: acc.kcal + i.macros.kcal,
        prot: acc.prot + i.macros.prot,
        carb: acc.carb + i.macros.carb,
        fat:  acc.fat  + i.macros.fat,
      }), { kcal: 0, prot: 0, carb: 0, fat: 0 });

      return {
        ...meal,
        ingredients: newIngredients,
        totals: {
          kcal: Math.round(totals.kcal),
          prot: Math.round(totals.prot * 10) / 10,
          carb: Math.round(totals.carb * 10) / 10,
          fat:  Math.round(totals.fat  * 10) / 10,
        },
      };
    });

    const dayTotals = newMeals.reduce((acc, m) => ({
      kcal: acc.kcal + m.totals.kcal,
      prot: acc.prot + m.totals.prot,
      carb: acc.carb + m.totals.carb,
      fat:  acc.fat  + m.totals.fat,
    }), { kcal: 0, prot: 0, carb: 0, fat: 0 });

    return {
      ...day,
      meals: newMeals,
      totals: {
        kcal: Math.round(dayTotals.kcal),
        prot: Math.round(dayTotals.prot),
        carb: Math.round(dayTotals.carb),
        fat:  Math.round(dayTotals.fat),
      },
    };
  });
}

/**
 * Valida os campos do formulário "Adicionar/Editar alimento".
 * @param {object} data
 * @param {string|null} excludeFoodId — em modo edição, excluir este ID do check de duplicado
 */
function validateAddFoodForm(data, excludeFoodId = null) {
  const errors = [];
  if (!data.name || !data.name.trim())
    errors.push('Preenche o nome do alimento.');
  if (!data.category)
    errors.push('Seleciona uma categoria.');
  if (!(data.baseQuantity > 0))
    errors.push('Quantidade base deve ser maior que zero.');
  if (data.kcal < 0 || data.prot < 0 || data.carb < 0 || data.fat < 0)
    errors.push('Os valores nutricionais não podem ser negativos.');
  if (data.kcal === 0 && data.prot === 0 && data.carb === 0 && data.fat === 0)
    errors.push('O alimento deve ter pelo menos algum valor nutricional.');
  const customs = loadCustomFoods();
  const lower = data.name.trim().toLowerCase();
  if (customs.some(f =>
    f.name.toLowerCase() === lower &&
    f.category === data.category &&
    f.baseQuantity === data.baseQuantity &&
    f.id !== excludeFoodId
  )) {
    errors.push('Já tens um alimento com este nome, categoria e quantidade.');
  }
  return errors;
}

/**
 * Converte um display métrico para imperial (só para exibição visual).
 *   "150 g"                → "5.3 oz"
 *   "250 ml"               → "8.5 fl oz"
 *   "2 ovos (100g)"        → "2 ovos (3.5 oz)"
 *   "1 banana (~80g)"      → "1 banana (~2.8 oz)"
 *   "1 colher de sopa (~12g)" → "1 colher de sopa (~0.4 oz)"
 *   outros formatos        → inalterado
 */
function toImperialDisplay(displayStr) {
  // 1. Bare "Xg" or "X g" → "Y oz"
  const gMatch = displayStr.match(/^([\d.]+)\s*g$/);
  if (gMatch) {
    const oz = Math.round(parseFloat(gMatch[1]) / 28.35 * 10) / 10;
    return `${oz} oz`;
  }
  // 2. Bare "X ml" → "Y fl oz"
  const mlMatch = displayStr.match(/^([\d.]+)\s*ml$/);
  if (mlMatch) {
    const floz = Math.round(parseFloat(mlMatch[1]) / 29.574 * 10) / 10;
    return `${floz} fl oz`;
  }
  // 3. "(~?Xg)" embutido no display → "(~?Y oz)"
  //    ex: "2 ovos (100g)" → "2 ovos (3.5 oz)"
  //    ex: "1 banana pequena (~80g)" → "1 banana pequena (~2.8 oz)"
  return displayStr.replace(/\((~?)(\d+(?:\.\d+)?)g\)/g, (_, tilde, n) => {
    const oz = Math.round(parseFloat(n) / 28.35 * 10) / 10;
    return `(${tilde}${oz} oz)`;
  });
}

/**
 * Devolve as <option> do select de unidade alimentar ordenadas pela preferência
 * do utilizador (métrico → g primeiro; imperial → oz primeiro).
 * @param {string|null} selected  Valor pré-selecionado (para modal de edição).
 */
function buildUnitOpts(selected = null) {
  const isImperial = loadFormData()?.unit === 'imperial';
  const units = isImperial
    ? ['oz','fl oz','lb','cup','tbsp','tsp','unidade','porção','g','ml','colher de chá','colher de sobremesa','colher de sopa','scoop/medidor']
    : ['g','ml','unidade','colher de chá','colher de sobremesa','colher de sopa','scoop/medidor','porção'];
  // Se o valor pré-selecionado não estiver na lista (ex: unidade guardada antes desta feature), adiciona no fim
  if (selected && !units.includes(selected)) units.push(selected);
  return units.map(u => `<option value="${u}"${u === selected ? ' selected' : ''}>${u}</option>`).join('');
}

/** Abre o modal de adição de alimento personalizado. */
function openAddFoodModal(dayIdx, mealIdx, mount) {
  const cats = [
    { v: 'protein', l: 'Proteínas' },
    { v: 'carb',    l: 'Carboidratos' },
    { v: 'fat',     l: 'Gorduras' },
    { v: 'dairy',   l: 'Laticínios' },
    { v: 'fruit',   l: 'Frutas' },
    { v: 'veg',     l: 'Vegetais / Legumes' },
    { v: 'extra',   l: 'Suplementos / Outro' },
  ];

  const contentHtml = `
    <div class="modal-head">
      <div>
        <div class="modal-title">Adicionar alimento</div>
        <div class="modal-sub">Cria um alimento personalizado e adiciona-o à refeição</div>
        <p class="local-data-modal-note" data-testid="local-data-modal-note">🔒 Este alimento ficará guardado apenas neste navegador.</p>
      </div>
      <button type="button" class="modal-close" data-modal-close aria-label="Fechar">${icons.x(18)}</button>
    </div>
    <div class="modal-body">
      <form id="add-food-form" novalidate autocomplete="off">
        <div id="add-food-errors" class="add-food-error-box" style="display:none;"></div>

        <div class="add-food-grid">
          <div class="add-food-field add-food-field-full">
            <label class="add-food-label" for="aff-name">Nome do alimento *</label>
            <input type="text" id="aff-name" class="add-food-input"
                   placeholder="Ex: Skyr proteico Lidl" maxlength="80">
          </div>
          <div class="add-food-field">
            <label class="add-food-label" for="aff-category">Categoria *</label>
            <select id="aff-category" class="add-food-input">
              <option value="">Escolher…</option>
              ${cats.map(c => `<option value="${c.v}">${c.l}</option>`).join('')}
            </select>
          </div>
          <div class="add-food-field">
            <label class="add-food-label">Porção base *</label>
            <div class="add-food-qty-row">
              <input type="text" inputmode="decimal" autocomplete="off" id="aff-qty" class="add-food-input add-food-qty"
                     placeholder="—">
              <select id="aff-unit" class="add-food-input add-food-unit">
                ${buildUnitOpts()}
              </select>
            </div>
          </div>
        </div>

        <div class="add-food-macros-title">Macros desta porção *</div>
        <div class="add-food-macros-grid">
          <div class="add-food-macro-field">
            <label class="add-food-label" for="aff-kcal">Kcal</label>
            <input type="text" inputmode="decimal" autocomplete="off" id="aff-kcal" class="add-food-input"
                   placeholder="0">
          </div>
          <div class="add-food-macro-field">
            <label class="add-food-label" for="aff-prot">Proteína (g)</label>
            <input type="text" inputmode="decimal" autocomplete="off" id="aff-prot" class="add-food-input"
                   placeholder="0">
          </div>
          <div class="add-food-macro-field">
            <label class="add-food-label" for="aff-carb">Carbs (g)</label>
            <input type="text" inputmode="decimal" autocomplete="off" id="aff-carb" class="add-food-input"
                   placeholder="0">
          </div>
          <div class="add-food-macro-field">
            <label class="add-food-label" for="aff-fat">Gorduras (g)</label>
            <input type="text" inputmode="decimal" autocomplete="off" id="aff-fat" class="add-food-input"
                   placeholder="0">
          </div>
        </div>

        ${buildOptionalNutriSections('aff')}

        ${buildSuggestSection()}

        <div class="btn-row" style="margin-top:20px;flex-wrap:wrap;">
          <button type="button" class="btn btn-secondary" data-modal-close>Cancelar</button>
          <button type="submit" class="btn btn-primary">+ Adicionar à refeição</button>
        </div>
      </form>
    </div>
  `;

  const close = openModal(contentHtml);

  document.getElementById('add-food-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const name     = (document.getElementById('aff-name').value || '').trim();
    const category = document.getElementById('aff-category').value;
    const qty      = parseFloat(document.getElementById('aff-qty').value) || 0;
    const unit     = document.getElementById('aff-unit').value;
    const kcal     = parseFloat(document.getElementById('aff-kcal').value)  || 0;
    const prot     = parseFloat(document.getElementById('aff-prot').value)  || 0;
    const carb     = parseFloat(document.getElementById('aff-carb').value)  || 0;
    const fat      = parseFloat(document.getElementById('aff-fat').value)   || 0;
    const notes    = (document.getElementById('aff-notes').value || '').trim();

    const data = { name, category, baseQuantity: qty, unit, kcal, prot, carb, fat };
    const errors = validateAddFoodForm(data);

    if (errors.length > 0) {
      const errBox = document.getElementById('add-food-errors');
      errBox.innerHTML = errors.map(err => `<div>• ${escapeHtml(err)}</div>`).join('');
      errBox.style.display = 'block';
      return;
    }

    // Convert per-portion macros + micronutrients to per100g for storage
    const f100 = 100 / qty;
    const customFood = {
      id: `custom_${Date.now()}`,
      name,
      category,
      per100: {
        kcal: Math.round(kcal * f100 * 10) / 10,
        prot: Math.round(prot * f100 * 10) / 10,
        carb: Math.round(carb * f100 * 10) / 10,
        fat:  Math.round(fat  * f100 * 10) / 10,
      },
      units: [{ label: unit, grams: qty }],
      digestibility: 'leve',
      substitutes: [],
      source: 'custom',
      baseQuantity: qty,
      baseUnit: unit,
      micronutrients: microToP100(readNutriVals('aff'), qty),
      notes: notes || null,
      createdAt: new Date().toISOString(),
    };

    // Save to personal foods library
    const customs = loadCustomFoods();
    customs.push(customFood);
    saveCustomFoods(customs);

    // Add to plan additions for this meal
    const additions = loadAdditions();
    const addKey = `${dayIdx}:${mealIdx}`;
    if (!additions[addKey]) additions[addKey] = [];
    additions[addKey].push({
      id: `addition_${Date.now()}`,
      food: customFood.id,
      grams: qty,
      unit,
      snapshot: {
        name: customFood.name,
        per100: customFood.per100,
        category: customFood.category,
        source: 'custom',
        micronutrients: customFood.micronutrients,
      },
    });
    saveAdditions(additions);

    close();
    rebuildAndRender(mount);
  });
}

/** Abre o modal em modo edição para um alimento já adicionado. */
function openEditFoodModal(additionId, dayIdx, mealIdx, mount) {
  // 1. Encontrar a adição
  const additions = loadAdditions();
  const addKey = `${dayIdx}:${mealIdx}`;
  const addList = additions[addKey] || [];
  const addition = addList.find(a => a.id === additionId);
  if (!addition) return;

  // 2. Obter food (custom food ou snapshot)
  const customs = loadCustomFoods();
  const storedFood = customs.find(f => f.id === addition.food);
  const foodData = storedFood || addition.snapshot;
  if (!foodData || !foodData.per100) return;

  // 3. Recalcular macros + micronutrients por porção actual para pré-preencher o formulário
  const qty = addition.grams;
  const f100to = (v) => v != null ? Math.round(v * qty / 100 * 100) / 100 : null;
  const kcalP = Math.round(f100to(foodData.per100.kcal) * 10) / 10;
  const protP = Math.round(f100to(foodData.per100.prot) * 10) / 10;
  const carbP = Math.round(f100to(foodData.per100.carb) * 10) / 10;
  const fatP  = Math.round(f100to(foodData.per100.fat)  * 10) / 10;
  const notesV  = foodData.notes || '';
  const currentUnit = addition.unit || foodData.baseUnit || 'g';
  // Pre-fill micronutrient values (per-portion from per100g)
  const mPre = scaleMicroToPortionVals(foodData.micronutrients, qty);

  const cats = [
    { v: 'protein', l: 'Proteínas' }, { v: 'carb', l: 'Carboidratos' },
    { v: 'fat', l: 'Gorduras' },      { v: 'dairy', l: 'Laticínios' },
    { v: 'fruit', l: 'Frutas' },      { v: 'veg', l: 'Vegetais / Legumes' },
    { v: 'extra', l: 'Suplementos / Outro' },
  ];
  const contentHtml = `
    <div class="modal-head">
      <div>
        <div class="modal-title">Editar alimento adicionado</div>
        <div class="modal-sub">Os dados desta refeição serão actualizados</div>
        <p class="local-data-modal-note" data-testid="local-data-modal-note">🔒 Este alimento ficará guardado apenas neste navegador.</p>
      </div>
      <button type="button" class="modal-close" data-modal-close aria-label="Fechar">${icons.x(18)}</button>
    </div>
    <div class="modal-body">
      <form id="edit-food-form" novalidate autocomplete="off">
        <div id="edit-food-errors" class="add-food-error-box" style="display:none;"></div>
        <div class="add-food-grid">
          <div class="add-food-field add-food-field-full">
            <label class="add-food-label" for="eff-name">Nome do alimento *</label>
            <input type="text" id="eff-name" class="add-food-input" value="${escapeHtml(foodData.name)}" maxlength="80">
          </div>
          <div class="add-food-field">
            <label class="add-food-label" for="eff-category">Categoria *</label>
            <select id="eff-category" class="add-food-input">
              ${cats.map(c => `<option value="${c.v}"${foodData.category === c.v ? ' selected' : ''}>${c.l}</option>`).join('')}
            </select>
          </div>
          <div class="add-food-field">
            <label class="add-food-label">Porção base *</label>
            <div class="add-food-qty-row">
              <input type="text" inputmode="decimal" autocomplete="off" id="eff-qty" class="add-food-input add-food-qty" value="${qty}">
              <select id="eff-unit" class="add-food-input add-food-unit">
                ${buildUnitOpts(currentUnit)}
              </select>
            </div>
          </div>
        </div>
        <div class="add-food-macros-title">Macros desta porção *</div>
        <div class="add-food-macros-grid">
          <div class="add-food-macro-field">
            <label class="add-food-label" for="eff-kcal">Kcal</label>
            <input type="text" inputmode="decimal" autocomplete="off" id="eff-kcal" class="add-food-input" value="${kcalP}">
          </div>
          <div class="add-food-macro-field">
            <label class="add-food-label" for="eff-prot">Proteína (g)</label>
            <input type="text" inputmode="decimal" autocomplete="off" id="eff-prot" class="add-food-input" value="${protP}">
          </div>
          <div class="add-food-macro-field">
            <label class="add-food-label" for="eff-carb">Carbs (g)</label>
            <input type="text" inputmode="decimal" autocomplete="off" id="eff-carb" class="add-food-input" value="${carbP}">
          </div>
          <div class="add-food-macro-field">
            <label class="add-food-label" for="eff-fat">Gorduras (g)</label>
            <input type="text" inputmode="decimal" autocomplete="off" id="eff-fat" class="add-food-input" value="${fatP}">
          </div>
        </div>
        ${buildOptionalNutriSections('eff', { ...mPre, notes: notesV })}

        ${buildSuggestSection()}

        <div class="btn-row" style="margin-top:20px;flex-wrap:wrap;">
          <button type="button" class="btn btn-secondary" data-modal-close>Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar alterações</button>
        </div>
      </form>
    </div>
  `;

  const close = openModal(contentHtml);

  document.getElementById('edit-food-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const name     = (document.getElementById('eff-name').value || '').trim();
    const category = document.getElementById('eff-category').value;
    const newQty   = parseFloat(document.getElementById('eff-qty').value)  || 0;
    const unit     = document.getElementById('eff-unit').value;
    const kcal     = parseFloat(document.getElementById('eff-kcal').value) || 0;
    const prot     = parseFloat(document.getElementById('eff-prot').value) || 0;
    const carb     = parseFloat(document.getElementById('eff-carb').value) || 0;
    const fat      = parseFloat(document.getElementById('eff-fat').value)  || 0;
    const notes    = (document.getElementById('eff-notes').value || '').trim();

    const data = { name, category, baseQuantity: newQty, unit, kcal, prot, carb, fat };
    // Pass excludeFoodId so the current food is not flagged as duplicate of itself
    const errors = validateAddFoodForm(data, addition.food);

    if (errors.length > 0) {
      const errBox = document.getElementById('edit-food-errors');
      errBox.innerHTML = errors.map(err => `<div>• ${escapeHtml(err)}</div>`).join('');
      errBox.style.display = 'block';
      return;
    }

    // Convert per-portion macros + micronutrients to per100g
    const f100 = 100 / newQty;
    const newPer100 = {
      kcal: Math.round(kcal * f100 * 10) / 10,
      prot: Math.round(prot * f100 * 10) / 10,
      carb: Math.round(carb * f100 * 10) / 10,
      fat:  Math.round(fat  * f100 * 10) / 10,
    };
    const newMicroP100 = microToP100(readNutriVals('eff'), newQty);

    // Update custom food in library (if it exists there)
    const updatedCustoms = loadCustomFoods().map(f => {
      if (f.id !== addition.food) return f;
      return {
        ...f,
        name,
        category,
        per100: newPer100,
        units: [{ label: unit, grams: newQty }],
        baseQuantity: newQty,
        baseUnit: unit,
        micronutrients: newMicroP100,
        notes: notes || null,
        updatedAt: new Date().toISOString(),
      };
    });
    saveCustomFoods(updatedCustoms);

    // Update the addition: new grams, unit, snapshot (with micronutrients)
    const updatedAdditions = loadAdditions();
    const key2 = `${dayIdx}:${mealIdx}`;
    if (updatedAdditions[key2]) {
      updatedAdditions[key2] = updatedAdditions[key2].map(a => {
        if (a.id !== additionId) return a;
        return {
          ...a,
          grams: newQty,
          unit,
          snapshot: { name, per100: newPer100, category, source: 'custom', micronutrients: newMicroP100 },
        };
      });
    }
    saveAdditions(updatedAdditions);

    close();
    rebuildAndRender(mount);
  });
}

/* ============================================================================ */
/* Optional nutrition fields helpers                                            */
/* ============================================================================ */

/** Etiquetas e unidades de todos os micronutrientes (para display no plano). */
const NUTRI_LABELS = [
  { key: 'saturated',     label: 'G. saturada',      unit: 'g'  },
  { key: 'mono',          label: 'G. monoinsaturada', unit: 'g'  },
  { key: 'poly',          label: 'G. poli-insaturada',unit: 'g'  },
  { key: 'trans',         label: 'G. trans',          unit: 'g'  },
  { key: 'sugar',         label: 'Açúcares',          unit: 'g'  },
  { key: 'fiber',         label: 'Fibra',             unit: 'g'  },
  { key: 'salt',          label: 'Sal',               unit: 'g'  },
  { key: 'sodium',        label: 'Sódio',             unit: 'mg' },
  { key: 'cholesterol',   label: 'Colesterol',        unit: 'mg' },
  { key: 'vitA',          label: 'Vit. A',            unit: 'µg' },
  { key: 'vitC',          label: 'Vit. C',            unit: 'mg' },
  { key: 'vitD',          label: 'Vit. D',            unit: 'µg' },
  { key: 'vitE',          label: 'Vit. E',            unit: 'mg' },
  { key: 'vitK',          label: 'Vit. K',            unit: 'µg' },
  { key: 'vitB1',         label: 'Vit. B1',           unit: 'mg' },
  { key: 'vitB2',         label: 'Vit. B2',           unit: 'mg' },
  { key: 'vitB3',         label: 'Vit. B3',           unit: 'mg' },
  { key: 'vitB6',         label: 'Vit. B6',           unit: 'mg' },
  { key: 'vitB12',        label: 'Vit. B12',          unit: 'µg' },
  { key: 'folate',        label: 'Ác. fólico',        unit: 'µg' },
  { key: 'calcium',       label: 'Cálcio',            unit: 'mg' },
  { key: 'iron',          label: 'Ferro',             unit: 'mg' },
  { key: 'magnesium',     label: 'Magnésio',          unit: 'mg' },
  { key: 'potassium',     label: 'Potássio',          unit: 'mg' },
  { key: 'zinc',          label: 'Zinco',             unit: 'mg' },
  { key: 'phosphorus',    label: 'Fósforo',           unit: 'mg' },
  { key: 'selenium',      label: 'Selénio',           unit: 'µg' },
  { key: 'iodine',        label: 'Iodo',              unit: 'µg' },
];

/**
 * Lê todos os valores opcionais do formulário, em per-porção.
 * @param {string} prefix — 'aff' ou 'eff'
 */
function readNutriVals(prefix) {
  const n = (id) => {
    const v = parseFloat(document.getElementById(`${prefix}-${id}`)?.value);
    return isNaN(v) ? null : v;
  };
  return {
    saturated: n('saturated'), mono: n('mono'), poly: n('poly'), trans: n('trans'),
    sugar: n('sugar'), fiber: n('fiber'),
    salt: n('salt'), sodium: n('sodium'), cholesterol: n('cholesterol'),
    vitA: n('vitA'), vitC: n('vitC'), vitD: n('vitD'), vitE: n('vitE'),
    vitK: n('vitK'), vitB1: n('vitB1'), vitB2: n('vitB2'), vitB3: n('vitB3'),
    vitB6: n('vitB6'), vitB12: n('vitB12'), folate: n('folate'),
    calcium: n('calcium'), iron: n('iron'), magnesium: n('magnesium'),
    potassium: n('potassium'), zinc: n('zinc'), phosphorus: n('phosphorus'),
    selenium: n('selenium'), iodine: n('iodine'),
  };
}

/** Converte micronutrients de per-porção para per100g para armazenamento. */
function microToP100(vals, baseQty) {
  const f = 100 / baseQty;
  const c = (v) => v != null ? Math.round(v * f * 1000) / 1000 : null;
  return {
    saturated: c(vals.saturated), mono: c(vals.mono),
    poly: c(vals.poly),           trans: c(vals.trans),
    sugar: c(vals.sugar),         fiber: c(vals.fiber),
    salt: c(vals.salt),           sodium: c(vals.sodium),
    cholesterol: c(vals.cholesterol),
    vitA: c(vals.vitA),   vitC: c(vals.vitC),   vitD: c(vals.vitD),
    vitE: c(vals.vitE),   vitK: c(vals.vitK),   vitB1: c(vals.vitB1),
    vitB2: c(vals.vitB2), vitB3: c(vals.vitB3), vitB6: c(vals.vitB6),
    vitB12: c(vals.vitB12), folate: c(vals.folate),
    calcium: c(vals.calcium),     iron: c(vals.iron),
    magnesium: c(vals.magnesium), potassium: c(vals.potassium),
    zinc: c(vals.zinc),           phosphorus: c(vals.phosphorus),
    selenium: c(vals.selenium),   iodine: c(vals.iodine),
  };
}

/** Converte micronutrients de per100g para per-porção (para pré-preencher edição). */
function scaleMicroToPortionVals(micro, grams) {
  if (!micro) return {};
  const s = grams / 100;
  const c = (v) => v != null ? Math.round(v * s * 1000) / 1000 : null;
  const r = {};
  NUTRI_LABELS.forEach(({ key }) => { r[key] = c(micro[key]); });
  return r;
}

/**
 * Gera o HTML dos micronutrientes como accordion recolhível.
 * Fechado por padrão; abre ao clicar. Oculto no PDF via .no-print.
 * Mostra apenas valores != null, escalados de per100g para per-grams.
 */
function buildNutriDetailsHtml(micronutrients, grams) {
  if (!micronutrients) return '';
  const scale = grams / 100;
  const items = NUTRI_LABELS
    .filter(({ key }) => micronutrients[key] != null)
    .map(({ key, label, unit }) => {
      const raw = micronutrients[key] * scale;
      const val = raw < 1 ? Math.round(raw * 100) / 100 : Math.round(raw * 10) / 10;
      return `<span class="ing-nutri-item">${label}: ${val}${unit}</span>`;
    });
  if (items.length === 0) return '';
  return `<details class="ing-nutri-accordion no-print" data-testid="ing-nutri-details">
    <summary class="ing-nutri-toggle">
      <span class="ing-nutri-show-text">Ver fatos nutricionais adicionais</span>
      <span class="ing-nutri-hide-text">Ocultar fatos nutricionais adicionais</span>
      ${icons.chevDown(12)}
    </summary>
    <div class="ing-nutri-body">${items.join('')}</div>
  </details>`;
}

/**
 * Gera as secções HTML de campos opcionais (para openAddFoodModal e openEditFoodModal).
 * @param {string} prefix — 'aff' | 'eff'
 * @param {object} vals   — valores pré-preenchidos (per-porção), keyed por field id
 */
function buildOptionalNutriSections(prefix, vals = {}) {
  const inp = (id, label, unit, step = '0.1') => {
    const v = vals[id];
    const attr = (v != null && v !== '') ? `value="${v}"` : 'placeholder="—"';
    return `<div class="add-food-optional-field">
      <label class="add-food-label" for="${prefix}-${id}">${label} (${unit})</label>
      <input type="text" inputmode="decimal" autocomplete="off" id="${prefix}-${id}" class="add-food-input" ${attr}>
    </div>`;
  };
  const notesVal = vals.notes ? escapeHtml(String(vals.notes)) : '';
  // Auto-abrir se já existem valores pré-preenchidos (modo edição)
  const hasValues = NUTRI_LABELS.some(({ key }) => vals[key] != null && vals[key] !== '');

  return `
    <details ${hasValues ? 'open' : ''} class="add-food-accordion" data-testid="${prefix}-optional-block">
      <summary>
        <span>Campos opcionais (fibras, açúcares…)</span>
        <span class="add-food-accordion-chevron">${icons.chevDown(14)}</span>
      </summary>
      <div class="add-food-accordion-body">

        <div class="add-food-optional-group-label">Gorduras detalhadas</div>
        <div class="add-food-optional-fields-grid">
          ${inp('saturated', 'Gordura saturada',         'g')}
          ${inp('mono',      'Gordura monoinsaturada',    'g')}
          ${inp('poly',      'Gordura poli-insaturada',   'g')}
          ${inp('trans',     'Gordura trans',             'g')}
        </div>

        <div class="add-food-optional-group-label">Carboidratos detalhados</div>
        <div class="add-food-optional-fields-grid">
          ${inp('sugar', 'Açúcares',        'g')}
          ${inp('fiber', 'Fibra alimentar', 'g')}
        </div>

        <div class="add-food-optional-group-label">Outros dados</div>
        <div class="add-food-optional-fields-grid">
          ${inp('salt',        'Sal',        'g')}
          ${inp('sodium',      'Sódio',      'mg', '1')}
          ${inp('cholesterol', 'Colesterol', 'mg', '1')}
        </div>

        <div class="add-food-optional-group-label">Vitaminas</div>
        <div class="add-food-optional-fields-grid">
          ${inp('vitA',   'Vitamina A',   'µg')}
          ${inp('vitC',   'Vitamina C',   'mg')}
          ${inp('vitD',   'Vitamina D',   'µg')}
          ${inp('vitE',   'Vitamina E',   'mg')}
          ${inp('vitK',   'Vitamina K',   'µg')}
          ${inp('vitB1',  'Vitamina B1',  'mg')}
          ${inp('vitB2',  'Vitamina B2',  'mg')}
          ${inp('vitB3',  'Vitamina B3',  'mg')}
          ${inp('vitB6',  'Vitamina B6',  'mg')}
          ${inp('vitB12', 'Vitamina B12', 'µg')}
          ${inp('folate', 'Ácido fólico', 'µg')}
        </div>

        <div class="add-food-optional-group-label">Minerais</div>
        <div class="add-food-optional-fields-grid">
          ${inp('calcium',    'Cálcio',    'mg', '1')}
          ${inp('iron',       'Ferro',     'mg')}
          ${inp('magnesium',  'Magnésio',  'mg', '1')}
          ${inp('potassium',  'Potássio',  'mg', '1')}
          ${inp('zinc',       'Zinco',     'mg')}
          ${inp('phosphorus', 'Fósforo',   'mg', '1')}
          ${inp('selenium',   'Selénio',   'µg')}
          ${inp('iodine',     'Iodo',      'µg')}
        </div>

        <div class="add-food-optional-group-label">Notas</div>
        <div class="add-food-field add-food-field-full">
          <input type="text" id="${prefix}-notes" class="add-food-input"
                 ${notesVal ? `value="${notesVal}"` : 'placeholder="Ex: Rótulo do produto"'}
                 maxlength="200">
        </div>
      </div>
    </details>
  `;
}

/* ============================================================================ */
/* Suggest section helper                                                       */
/* ============================================================================ */

/** HTML estático da secção "Sugerir para biblioteca oficial" (igual nos dois modais). */
function buildSuggestSection() {
  return `
    <details class="add-food-accordion suggest-section" data-testid="suggest-section">
      <summary>
        <span>💡 Sugerir alimento…</span>
        <span class="add-food-accordion-chevron">${icons.chevDown(14)}</span>
      </summary>
      <div class="add-food-accordion-body">
        <p style="font-size:13px;font-weight:600;color:var(--ink);margin:0 0 8px;line-height:1.5;">
          Quer sugerir este alimento para entrar na biblioteca oficial da app?
        </p>
        <p style="font-size:13px;color:var(--ink-muted);margin:0 0 6px;">Envie a sugestão para:</p>
        <p style="margin:0 0 14px;">
          <a href="mailto:hardgainerhibrido@gmail.com"
             data-testid="suggest-email-link"
             style="font-size:14px;font-weight:700;color:var(--accent);text-decoration:none;word-break:break-all;">
            hardgainerhibrido@gmail.com
          </a>
        </p>
        <p style="font-size:12.5px;font-weight:600;color:var(--ink);margin:0 0 4px;">Para produtos com embalagem, envie:</p>
        <ul style="font-size:12.5px;color:var(--ink-muted);margin:0 0 12px;padding-left:18px;line-height:1.7;">
          <li data-testid="suggest-packaged-name">Nome do produto</li>
          <li data-testid="suggest-packaged-photos">Fotos do produto</li>
          <li data-testid="suggest-packaged-label">Foto da tabela nutricional bem legível</li>
        </ul>
        <p style="font-size:12.5px;font-weight:600;color:var(--ink);margin:0 0 4px;">Para frutas, vegetais ou alimentos sem tabela nutricional, envie:</p>
        <ul style="font-size:12.5px;color:var(--ink-muted);margin:0 0 12px;padding-left:18px;line-height:1.7;">
          <li data-testid="suggest-natural-name">Nome do alimento</li>
          <li data-testid="suggest-natural-origin">Origem ou tipo do alimento, se souber</li>
          <li data-testid="suggest-natural-photos">Fotos do alimento</li>
        </ul>
        <p style="font-size:11.5px;color:var(--ink-muted);margin:0;font-style:italic;line-height:1.5;">
          A sugestão será analisada antes de entrar na biblioteca oficial. Nada é adicionado automaticamente para todos os usuários.
        </p>
      </div>
    </details>
  `;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ============================================================================ */
/* Exportação PDF por dia                                                        */
/* ============================================================================ */

/** Constrói o bloco HTML de uma refeição para o documento PDF por dia. */
function buildMealHtml(meal, mealIdx, dayIdx = null) {
  const isImperial = loadFormData()?.unit === 'imperial';
  const badgeLabel = meal.type === 'solid' ? 'Sólida' : 'Shake';

  const ingsHtml = meal.ingredients.map(ing => `
    <li class="ing-row">
      <div class="ing-info">
        <div class="ing-name">${ing.label || ing.food}</div>
        <div class="ing-macros">${ing.macros.kcal} kcal · P:${ing.macros.prot}g · C:${ing.macros.carb}g · G:${ing.macros.fat}g</div>
      </div>
      <div class="ing-qty">${isImperial && !ing.isAddition ? toImperialDisplay(ing.display) : ing.display}</div>
    </li>
  `).join('');

  const stepsHtml = meal.steps && meal.steps.length ? `
    <div class="meal-section">
      <div class="section-label">Preparo</div>
      <ol class="prep-list">
        ${meal.steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
      </ol>
    </div>
  ` : '';

  const noteHtml = meal.note ? `
    <div class="meal-note">${escapeHtml(meal.note)}</div>
  ` : '';

  return `
    <div class="meal-block" data-type="${meal.type}">
      <div class="meal-header">
        <div class="meal-header-left">
          <div class="meal-num">Refeição ${mealIdx + 1}${dayIdx !== null ? `<span class="meal-day-badge">Dia ${dayIdx + 1}</span>` : ''}</div>
          <div class="meal-time">${meal.time || ''}</div>
          <div class="meal-name">${meal.slotLabel}</div>
          <div class="meal-recipe">${meal.name}</div>
        </div>
        <span class="meal-badge meal-badge-${meal.type}">${badgeLabel}</span>
      </div>
      <div class="meal-macros-row">
        <span class="macro-chip">${meal.totals.kcal} kcal</span>
        <span class="macro-chip">P: ${meal.totals.prot}g</span>
        <span class="macro-chip">C: ${meal.totals.carb}g</span>
        <span class="macro-chip">G: ${meal.totals.fat}g</span>
      </div>
      <div class="meal-section">
        <div class="section-label">Ingredientes</div>
        <ul class="ing-list">${ingsHtml}</ul>
      </div>
      ${stepsHtml}
      ${noteHtml}
    </div>
  `;
}

/** Imprime apenas o dia especificado usando área temporária na própria página. */
function exportDayPDF(day, dayIdx, results) {
  const mealsHtml = day.meals.map((meal, mIdx) => buildMealHtml(meal, mIdx, dayIdx)).join('');

  // Conteúdo limpo do dia — sem botões, navegação ou elementos da página
  const contentHtml = `
    <div class="pdf-header">
      <div class="pdf-brand">Hardgainer Macros</div>
      <div class="pdf-tagline">${PLAN_STRATEGY_LABEL[results.routine?.strategy] || 'Sistema Híbrido'} · ${results.calories} kcal/dia</div>
      <div class="pdf-header-divider"></div>
      <div class="pdf-title">Plano Alimentar — Dia ${dayIdx + 1}</div>
      <div class="pdf-dayname">${day.dayName}</div>
    </div>
    <div class="pdf-totals">
      <div class="tot-item">
        <span class="tot-val">${day.totals.kcal}</span>
        <span class="tot-label">kcal</span>
      </div>
      <div class="tot-item">
        <span class="tot-val">${Math.round(day.totals.prot)}g</span>
        <span class="tot-label">Proteína</span>
      </div>
      <div class="tot-item">
        <span class="tot-val">${Math.round(day.totals.carb)}g</span>
        <span class="tot-label">Carboidrato</span>
      </div>
      <div class="tot-item">
        <span class="tot-val">${Math.round(day.totals.fat)}g</span>
        <span class="tot-label">Gordura</span>
      </div>
    </div>
    <div class="pdf-meals">
      ${mealsHtml}
    </div>
    <div class="pdf-footer">
      <div class="pdf-footer-url">hardgainermacros.com</div>
      <div class="pdf-footer-note">Use este plano como referência e ajuste à sua rotina.</div>
    </div>
  `;

  // Limpa execução anterior se existir
  const prevArea = document.getElementById('day-pdf-print-area');
  if (prevArea) prevArea.remove();
  const prevStyle = document.getElementById('day-pdf-print-style');
  if (prevStyle) prevStyle.remove();

  // Injeta área de impressão no body
  const printArea = document.createElement('div');
  printArea.id = 'day-pdf-print-area';
  printArea.className = 'day-pdf-print-area';
  printArea.innerHTML = contentHtml;
  document.body.appendChild(printArea);

  // Injeta CSS de impressão por dia — estilos isolados, não alteram styles.css
  const style = document.createElement('style');
  style.id = 'day-pdf-print-style';
  style.textContent = `
    .day-pdf-print-area { display: none; }
    @page { margin: 15mm; }
    @media print {
      .day-pdf-print-area, .day-pdf-print-area * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

      body.printing-day-pdf > * { display: none !important; }
      body.printing-day-pdf .day-pdf-print-area {
        display: block !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        color: #1a1814;
        font-size: 14px;
        line-height: 1.6;
        background: #fff;
      }

      /* ── HEADER ── */
      .day-pdf-print-area .pdf-header { background: #c26d5a; padding: 28px 32px 24px; }
      .day-pdf-print-area .pdf-brand { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.85); margin-bottom: 4px; }
      .day-pdf-print-area .pdf-tagline { font-size: 11px; color: rgba(255,255,255,0.72); margin-bottom: 18px; }
      .day-pdf-print-area .pdf-header-divider { width: 36px; height: 2px; background: rgba(255,255,255,0.4); margin-bottom: 18px; }
      .day-pdf-print-area .pdf-title { font-size: 26px; font-weight: 700; color: #ffffff; margin-bottom: 5px; }
      .day-pdf-print-area .pdf-dayname { font-size: 13px; color: rgba(255,255,255,0.80); }

      /* ── TOTALS ── */
      .day-pdf-print-area .pdf-totals { display: flex; background: #fbeee8; border-bottom: 3px solid #c26d5a; }
      .day-pdf-print-area .tot-item { flex: 1; text-align: center; padding: 18px 8px; border-right: 1px solid #e2dbd2; }
      .day-pdf-print-area .tot-item:last-child { border-right: none; }
      .day-pdf-print-area .tot-val { display: block; font-size: 22px; font-weight: 700; color: #1a1814; line-height: 1.1; }
      .day-pdf-print-area .tot-label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #8a7f75; margin-top: 4px; }

      /* ── MEALS CONTAINER ── */
      .day-pdf-print-area .pdf-meals { padding: 22px 28px 8px; }

      /* ── MEAL CARD ── */
      .day-pdf-print-area .meal-block { border: 1px solid #e6e0d3; border-left: 4px solid #6b8e5a; border-radius: 0 8px 8px 0; margin-bottom: 18px; background: #fff; page-break-inside: avoid; break-inside: avoid; }
      .day-pdf-print-area .meal-block[data-type="shake"] { border-left-color: #c26d5a; }

      /* Meal card header band */
      .day-pdf-print-area .meal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 13px 18px 11px; background: #f3f7ef; border-bottom: 1px solid #e6e0d3; }
      .day-pdf-print-area .meal-block[data-type="shake"] .meal-header { background: #fbeee8; }
      .day-pdf-print-area .meal-num { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #7a5235; margin-bottom: 2px; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
      .day-pdf-print-area .meal-day-badge { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #8a7f75; background: #f0ede8; border-radius: 3px; padding: 1px 5px; flex-shrink: 0; }
      .day-pdf-print-area .meal-time { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #8a7f75; margin-bottom: 4px; }
      .day-pdf-print-area .meal-name { font-size: 15px; font-weight: 700; color: #1a1814; margin-bottom: 2px; }
      .day-pdf-print-area .meal-recipe { font-size: 12px; color: #5a5048; }

      /* Type badge */
      .day-pdf-print-area .meal-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 3px 8px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; margin-top: 3px; }
      .day-pdf-print-area .meal-badge-solid { background: #e3ebd7; color: #4e6b42; }
      .day-pdf-print-area .meal-badge-shake { background: #f4dcd3; color: #a35342; }

      /* Macros chips */
      .day-pdf-print-area .meal-macros-row { display: flex; gap: 6px; flex-wrap: wrap; padding: 10px 18px; border-bottom: 1px solid #f0ebe4; }
      .day-pdf-print-area .macro-chip { font-size: 12px; font-weight: 600; color: #3a3330; background: #f7f4f0; padding: 3px 9px; border-radius: 4px; }

      /* Sections (ingredients / prep) */
      .day-pdf-print-area .meal-section { padding: 10px 18px 8px; }
      .day-pdf-print-area .meal-section + .meal-section { border-top: 1px solid #f0ebe4; padding-top: 10px; }
      .day-pdf-print-area .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #8a7f75; margin-bottom: 8px; }
      .day-pdf-print-area .ing-list { list-style: none; }
      .day-pdf-print-area .ing-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 5px 0; border-bottom: 1px solid #f5f1ec; }
      .day-pdf-print-area .ing-row:last-child { border-bottom: none; }
      .day-pdf-print-area .ing-info { flex: 1; }
      .day-pdf-print-area .ing-name { font-size: 13px; font-weight: 500; color: #1a1814; }
      .day-pdf-print-area .ing-macros { font-size: 11px; color: #8a7f75; margin-top: 1px; }
      .day-pdf-print-area .ing-qty { font-size: 13px; font-weight: 700; color: #1a1814; white-space: nowrap; padding-left: 16px; text-align: right; }
      .day-pdf-print-area .prep-list { padding-left: 18px; font-size: 13px; color: #3a3330; }
      .day-pdf-print-area .prep-list li { margin-bottom: 5px; line-height: 1.5; }

      /* Note block */
      .day-pdf-print-area .meal-note { margin: 0 18px 14px; background: #fbeee8; border-left: 3px solid #c26d5a; padding: 8px 12px; border-radius: 0 4px 4px 0; font-size: 12px; color: #585048; line-height: 1.5; }

      /* ── FOOTER ── */
      .day-pdf-print-area .pdf-footer { padding: 18px 28px 28px; text-align: center; border-top: 1px solid #e2dbd2; }
      .day-pdf-print-area .pdf-footer-url { font-size: 12px; font-weight: 600; color: #8a7f75; margin-bottom: 3px; }
      .day-pdf-print-area .pdf-footer-note { font-size: 11px; color: #b8a898; }
    }
  `;
  document.head.appendChild(style);

  // Ativa modo de impressão por dia e imprime
  document.body.classList.add('printing-day-pdf');
  window.print();

  // Limpeza após print — afterprint + fallback timeout
  const cleanup = () => {
    document.body.classList.remove('printing-day-pdf');
    printArea.remove();
    style.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  setTimeout(cleanup, 10000);
}

/* ============================================================================ */
/* Exportação PDF — Plano Completo (14 dias)                                    */
/* ============================================================================ */

/** Imprime o plano completo dos 14 dias usando área temporária na própria página. */
function exportFullPlanPDF(plan, results) {
  const daysHtml = plan.map((day, dIdx) => {
    const mealsHtml = day.meals.map((meal, mIdx) => buildMealHtml(meal, mIdx, dIdx)).join('');
    return `
      <div class="full-pdf-day${dIdx > 0 ? ' page-break' : ''}">
        <div class="full-pdf-day-header">
          <div class="full-pdf-day-left">
            <div class="full-pdf-day-num">Dia ${dIdx + 1}</div>
            <div class="full-pdf-day-name">${day.dayName}</div>
          </div>
          <div class="full-pdf-day-totals">
            <div class="full-pdf-tot-item">
              <span class="full-pdf-tot-val">${day.totals.kcal}</span>
              <span class="full-pdf-tot-label">kcal</span>
            </div>
            <div class="full-pdf-tot-item">
              <span class="full-pdf-tot-val">${Math.round(day.totals.prot)}g</span>
              <span class="full-pdf-tot-label">Proteína</span>
            </div>
            <div class="full-pdf-tot-item">
              <span class="full-pdf-tot-val">${Math.round(day.totals.carb)}g</span>
              <span class="full-pdf-tot-label">Carboidrato</span>
            </div>
            <div class="full-pdf-tot-item">
              <span class="full-pdf-tot-val">${Math.round(day.totals.fat)}g</span>
              <span class="full-pdf-tot-label">Gordura</span>
            </div>
          </div>
        </div>
        <div class="full-pdf-meals">
          ${mealsHtml}
        </div>
      </div>
    `;
  }).join('');

  const contentHtml = `
    <div class="full-pdf-header">
      <div class="full-pdf-brand">Hardgainer Macros</div>
      <div class="full-pdf-tagline">Plano alimentar personalizado para hardgainers</div>
      <div class="full-pdf-header-divider"></div>
      <div class="full-pdf-title">Plano Alimentar Completo — 14 Dias</div>
      <div class="full-pdf-meta">
        <span>${formatKcal(results.calories)} kcal/dia</span>
        <span>·</span>
        <span>P: ${results.protein.grams}g</span>
        <span>·</span>
        <span>C: ${results.carb.grams}g</span>
        <span>·</span>
        <span>G: ${results.fat.grams}g</span>
      </div>
    </div>
    <div class="full-pdf-body">
      ${daysHtml}
    </div>
    <div class="full-pdf-footer">
      <div class="full-pdf-footer-url">hardgainermacros.com</div>
      <div class="full-pdf-footer-note">Use este plano como referência e ajuste à sua rotina.</div>
    </div>
  `;

  const prevArea = document.getElementById('full-pdf-print-area');
  if (prevArea) prevArea.remove();
  const prevStyle = document.getElementById('full-pdf-print-style');
  if (prevStyle) prevStyle.remove();

  const printArea = document.createElement('div');
  printArea.id = 'full-pdf-print-area';
  printArea.innerHTML = contentHtml;
  document.body.appendChild(printArea);

  const style = document.createElement('style');
  style.id = 'full-pdf-print-style';
  style.textContent = `
    #full-pdf-print-area { display: none; }
    @page { margin: 15mm; }
    @media print {
      #full-pdf-print-area, #full-pdf-print-area * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

      body.printing-full-pdf > * { display: none !important; }
      body.printing-full-pdf #full-pdf-print-area {
        display: block !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        color: #1a1814;
        font-size: 14px;
        line-height: 1.6;
        background: #fff;
      }

      /* ── DOCUMENT HEADER ── */
      #full-pdf-print-area .full-pdf-header { background: #c26d5a; padding: 28px 32px 24px; }
      #full-pdf-print-area .full-pdf-brand { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.85); margin-bottom: 4px; }
      #full-pdf-print-area .full-pdf-tagline { font-size: 11px; color: rgba(255,255,255,0.72); margin-bottom: 18px; }
      #full-pdf-print-area .full-pdf-header-divider { width: 36px; height: 2px; background: rgba(255,255,255,0.4); margin-bottom: 18px; }
      #full-pdf-print-area .full-pdf-title { font-size: 26px; font-weight: 700; color: #ffffff; margin-bottom: 8px; }
      #full-pdf-print-area .full-pdf-meta { font-size: 13px; color: rgba(255,255,255,0.80); display: flex; gap: 8px; flex-wrap: wrap; }

      /* ── DAY SECTION ── */
      #full-pdf-print-area .full-pdf-day.page-break { page-break-before: always; break-before: page; }
      #full-pdf-print-area .full-pdf-day-header { display: flex; justify-content: space-between; align-items: center; background: #fbeee8; border-bottom: 3px solid #c26d5a; padding: 16px 28px; }
      #full-pdf-print-area .full-pdf-day-num { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #8a8078; margin-bottom: 2px; }
      #full-pdf-print-area .full-pdf-day-name { font-size: 20px; font-weight: 700; color: #2b2622; }
      #full-pdf-print-area .full-pdf-day-totals { display: flex; }
      #full-pdf-print-area .full-pdf-tot-item { text-align: center; padding: 8px 14px; border-left: 1px solid #e2dbd2; }
      #full-pdf-print-area .full-pdf-tot-val { display: block; font-size: 18px; font-weight: 700; color: #1a1814; line-height: 1.1; }
      #full-pdf-print-area .full-pdf-tot-label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #8a7f75; margin-top: 3px; }

      /* ── MEALS ── */
      #full-pdf-print-area .full-pdf-meals { padding: 16px 28px 8px; }
      #full-pdf-print-area .meal-block { border: 1px solid #e6e0d3; border-left: 4px solid #6b8e5a; border-radius: 0 8px 8px 0; margin-bottom: 14px; background: #fff; page-break-inside: avoid; break-inside: avoid; }
      #full-pdf-print-area .meal-block[data-type="shake"] { border-left-color: #c26d5a; }
      #full-pdf-print-area .meal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 11px 16px 9px; background: #f3f7ef; border-bottom: 1px solid #e6e0d3; }
      #full-pdf-print-area .meal-block[data-type="shake"] .meal-header { background: #fbeee8; }
      #full-pdf-print-area .meal-num { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #7a5235; margin-bottom: 2px; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
      #full-pdf-print-area .meal-day-badge { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #8a7f75; background: #f0ede8; border-radius: 3px; padding: 1px 5px; flex-shrink: 0; }
      #full-pdf-print-area .meal-time { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #8a7f75; margin-bottom: 4px; }
      #full-pdf-print-area .meal-name { font-size: 14px; font-weight: 700; color: #1a1814; margin-bottom: 2px; }
      #full-pdf-print-area .meal-recipe { font-size: 12px; color: #5a5048; }
      #full-pdf-print-area .meal-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 3px 8px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; margin-top: 3px; }
      #full-pdf-print-area .meal-badge-solid { background: #e3ebd7; color: #4e6b42; }
      #full-pdf-print-area .meal-badge-shake { background: #f4dcd3; color: #a35342; }
      #full-pdf-print-area .meal-macros-row { display: flex; gap: 6px; flex-wrap: wrap; padding: 8px 16px; border-bottom: 1px solid #f0ebe4; }
      #full-pdf-print-area .macro-chip { font-size: 11px; font-weight: 600; color: #3a3330; background: #f7f4f0; padding: 2px 8px; border-radius: 4px; }
      #full-pdf-print-area .meal-section { padding: 8px 16px 6px; }
      #full-pdf-print-area .meal-section + .meal-section { border-top: 1px solid #f0ebe4; padding-top: 8px; }
      #full-pdf-print-area .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #8a7f75; margin-bottom: 6px; }
      #full-pdf-print-area .ing-list { list-style: none; padding: 0; margin: 0; }
      #full-pdf-print-area .ing-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 4px 0; border-bottom: 1px solid #f5f1ec; }
      #full-pdf-print-area .ing-row:last-child { border-bottom: none; }
      #full-pdf-print-area .ing-info { flex: 1; }
      #full-pdf-print-area .ing-name { font-size: 12px; font-weight: 500; color: #1a1814; }
      #full-pdf-print-area .ing-macros { font-size: 10px; color: #8a7f75; margin-top: 1px; }
      #full-pdf-print-area .ing-qty { font-size: 12px; font-weight: 700; color: #1a1814; white-space: nowrap; padding-left: 14px; text-align: right; }
      #full-pdf-print-area .prep-list { padding-left: 16px; font-size: 12px; color: #3a3330; margin: 0; }
      #full-pdf-print-area .prep-list li { margin-bottom: 4px; line-height: 1.5; }
      #full-pdf-print-area .meal-note { margin: 0 16px 12px; background: #fbeee8; border-left: 3px solid #c26d5a; padding: 6px 10px; border-radius: 0 4px 4px 0; font-size: 11px; color: #585048; line-height: 1.5; }

      /* ── FOOTER ── */
      #full-pdf-print-area .full-pdf-footer { padding: 16px 28px 24px; text-align: center; border-top: 1px solid #e2dbd2; }
      #full-pdf-print-area .full-pdf-footer-url { font-size: 12px; font-weight: 600; color: #8a7f75; margin-bottom: 3px; }
      #full-pdf-print-area .full-pdf-footer-note { font-size: 11px; color: #b8a898; }
    }
  `;
  document.head.appendChild(style);

  document.body.classList.add('printing-full-pdf');
  window.print();

  const cleanup = () => {
    document.body.classList.remove('printing-full-pdf');
    printArea.remove();
    style.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  setTimeout(cleanup, 10000);
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF Compacto
// ─────────────────────────────────────────────────────────────────────────────

function buildCompactMealHtml(meal, mealIdx) {
  const isImperial = loadFormData()?.unit === 'imperial';
  const ingsHtml = meal.ingredients.map(ing => `
    <li class="c-ing-row">
      <span class="c-ing-name">${ing.label || ing.food}</span>
      <span class="c-ing-qty">${isImperial && !ing.isAddition ? toImperialDisplay(ing.display) : ing.display}</span>
    </li>
  `).join('');
  return `
    <div class="c-meal" data-type="${meal.type}">
      <div class="c-meal-header">
        <div class="c-meal-left">
          <span class="c-meal-label">${mealIdx + 1}. ${meal.slotLabel}</span>
          <span class="c-meal-time">${meal.time || ''}</span>
        </div>
        <div class="c-meal-macros">
          <span>${meal.totals.kcal} kcal</span>
          <span>P:${meal.totals.prot}g</span>
          <span>C:${meal.totals.carb}g</span>
          <span>G:${meal.totals.fat}g</span>
        </div>
      </div>
      <ul class="c-ing-list">${ingsHtml}</ul>
    </div>
  `;
}

function exportCompactPlanPDF(plan, results) {
  const stratLabel = PLAN_STRATEGY_LABEL[results.routine?.strategy] || results.routine?.strategy || '';
  const profileName = results.profile?.name || '';
  const dailyKcal = results.totals?.kcal ?? '';

  const daysHtml = plan.map((day, dayIdx) => {
    const mealsHtml = day.meals.map((meal, mealIdx) => buildCompactMealHtml(meal, mealIdx)).join('');
    return `
      <div class="c-day">
        <div class="c-day-header">
          <span class="c-day-title">Dia ${dayIdx + 1}</span>
          <span class="c-day-macros">${day.totals.kcal} kcal · P:${day.totals.prot}g · C:${day.totals.carb}g · G:${day.totals.fat}g</span>
        </div>
        ${mealsHtml}
      </div>
    `;
  }).join('');

  const bodyHtml = `
    <div class="cp-header">
      <div class="cp-title">Plano Alimentar de 14 Dias — Compacto</div>
      <div class="cp-sub">${profileName}${profileName && stratLabel ? ' · ' : ''}${stratLabel}${dailyKcal ? ' · ' + dailyKcal + ' kcal/dia' : ''}</div>
    </div>
    ${daysHtml}
  `;

  const css = `
    @page { margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; font-size: 9pt; color: #2b2622; background: #fff; print-color-adjust: exact; -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
    .cp-header { background: #c26d5a; color: #fff; padding: 6px 10px; margin-bottom: 8px; border-radius: 4px; }
    .cp-title { font-size: 13pt; font-weight: 700; }
    .cp-sub { font-size: 9pt; margin-top: 2px; opacity: 0.92; }
    .c-day { border: 1px solid #ddd; border-radius: 4px; margin-bottom: 6px; page-break-inside: avoid; break-inside: avoid; }
    .c-day-header { background: #f6f3ec; padding: 4px 8px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ddd; }
    .c-day-title { font-weight: 700; font-size: 10pt; color: #c26d5a; }
    .c-day-macros { font-size: 8pt; color: #555; }
    .c-meal { border-bottom: 1px solid #eee; padding: 3px 8px; }
    .c-meal:last-child { border-bottom: none; }
    .c-meal[data-type="solid"] .c-meal-label { color: #6b8e5a; }
    .c-meal[data-type="shake"] .c-meal-label { color: #c26d5a; }
    .c-meal-header { display: flex; justify-content: space-between; align-items: baseline; gap: 4px; margin-bottom: 2px; }
    .c-meal-left { display: flex; gap: 6px; align-items: baseline; }
    .c-meal-label { font-weight: 600; font-size: 9pt; }
    .c-meal-time { font-size: 8pt; color: #888; }
    .c-meal-macros { font-size: 8pt; color: #555; display: flex; gap: 5px; flex-shrink: 0; }
    .c-ing-list { list-style: none; margin: 0; padding: 0; }
    .c-ing-row { display: flex; justify-content: space-between; font-size: 8pt; padding: 1px 0; color: #444; }
    .c-ing-name { flex: 1; }
    .c-ing-qty { flex-shrink: 0; margin-left: 6px; color: #666; }
  `;

  // Iframe isolado — o DOM principal nunca é tocado
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;visibility:hidden;';
  document.body.appendChild(iframe);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    window.removeEventListener('afterprint', cleanup);
    try { iframe.contentWindow.removeEventListener('afterprint', cleanup); } catch (_) {}
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(`<!DOCTYPE html><html><head><style>${css}</style></head><body>${bodyHtml}</body></html>`);
  iframeDoc.close();

  // Registar listeners ANTES de print() para garantir que o evento é apanhado
  iframe.contentWindow.addEventListener('afterprint', cleanup);
  window.addEventListener('afterprint', cleanup);
  setTimeout(cleanup, 30000);

  iframe.contentWindow.focus();
  iframe.contentWindow.print();
}
