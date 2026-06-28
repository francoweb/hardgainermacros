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
  loadRemovals, saveRemovals,
  loadEdits, saveEdits,
  loadFormData,
  loadRecipeMeals, saveRecipeMeals,   // Sprint R4-C
} from '../modules/storage.js';
import { formatKcal } from '../modules/calculator.js';
import {
  FOODS, calcFoodMacros, getSubstitutes, formatQty, getFood,
} from '../data/foods.js';
import { RECIPES } from '../data/recipes.js';                    // Sprint R4-A
import { scaleRecipe } from '../modules/recipe-scaler.js';      // Sprint R4-B

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
  const subs        = loadSubstitutions();
  const removals    = loadRemovals();
  const additions   = loadAdditions();
  const edits       = loadEdits();
  const recipeMeals = loadRecipeMeals();                           // Sprint R4-C
  // Pipeline: recipeMeals → edits → subs → removals → additions
  const effective = applyAdditions(
    applyRemovals(
      applySubstitutions(
        applyEdits(
          applyRecipeMeals(originalPlan, recipeMeals),             // Sprint R4-C
          edits
        ),
        subs
      ),
      removals
    ),
    additions,
  );
  render(mount, effective, results, subs, originalPlan, additions, removals, edits);
}

const PLAN_STRATEGY_LABEL = {
  solid: 'Mais Refeições Sólidas',
  hybrid: 'Sistema Híbrido',
  practical: 'Máxima Praticidade',
};

function render(mount, plan, results, subs, originalPlan, additions, removals, edits) {
  const strategy = results.routine?.strategy;
  const strategyLabel = PLAN_STRATEGY_LABEL[strategy] || 'Sistema Híbrido';
  const solidCount = countSolid(plan[0]);
  const shakeCount = countShake(plan[0]);
  const solidText = solidCount === 1 ? '1 Refeição Sólida' : `${solidCount} Refeições Sólidas`;
  const shakeText = shakeCount === 1 ? '1 Shake Anabólico' : `${shakeCount} Shakes Anabólicos`;

  // P1: texto de "Princípios das Receitas" condicional por estratégia
  const principiosText = strategy === 'solid'
    ? 'Todas as refeições são sólidas: carboidratos de digestão leve (arroz branco, pão francês, macarrão, batata) e proteínas completas (ovos, frango, carne magra, peixe) em cada bloco. A estrutura valoriza volume e variedade para atingir o superávit calórico com comida de verdade.'
    : 'Todas as refeições seguem o <a href="https://hardgainerhibrido.com/" target="_blank" rel="noopener noreferrer">Sistema Híbrido do Guia</a>: refeições sólidas com carboidratos de digestão leve (arroz branco, pão francês, macarrão, batata) e proteínas completas (ovos, frango, carne magra, peixe). Os shakes combinam whey, leite integral, fruta e uma fonte de gordura boa (pasta de amendoim, aveia ou azeite) para concentrar calorias.';

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

      <!-- F2-B: UX copy — plano como base prática, valores como referências -->
      <p class="no-print" style="margin:0 0 14px;padding:9px 14px;border-radius:8px;background:#f0f7fa;border:1px solid #c5dde8;font-size:12.5px;color:#3a5a66;line-height:1.6;box-sizing:border-box;">Você pode seguir este plano como uma base prática para o seu objetivo. O que mais importa é repetir o plano com consistência todos os dias. Os valores nutricionais são referências gerais e podem variar por marca, rótulo e preparo. Se quiser mais precisão, use <strong>"Editar"</strong>.</p>

      <!-- Aviso: dados locais -->
      <div class="local-data-notice no-print" data-testid="local-data-notice">
        <span class="local-data-notice-icon">🔒</span>
        <span>Seus alimentos personalizados ficam salvos apenas neste navegador. Se limpar o cache, trocar de dispositivo ou clicar em Resetar, esses dados podem ser perdidos.</span>
      </div>

      <!-- Como usar este plano -->
      <details id="how-to-use" class="no-print" style="margin-bottom: 20px; background: #f0f6fa; border: 1px solid #c5dde8; border-left: 4px solid #6ba8b8; border-radius: 0 8px 8px 0; padding: 10px 16px; font-size: 13px; color: #2e4a55; line-height: 1.6; box-sizing: border-box; width: 100%;">
        <summary style="cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
          <span style="font-size: 13px; font-weight: 600; color: #1e3a44;">📋 Como usar este plano</span>
          <span style="font-size: 11px; white-space: nowrap; color: #6ba8b8; flex-shrink: 0;">▸ Ver orientações</span>
        </summary>
        <div style="margin: 10px 0 2px; padding-top: 10px; border-top: 1px solid #c5dde8; color: #3a5a66; font-size: 13px;">
          <p style="margin: 0 0 6px; font-weight: 600; color: #1e3a44;">Antes de começar</p>
          <ul style="margin: 0 0 14px; padding-left: 18px;">
            <li style="margin-bottom: 4px;">Confira os horários das refeições no plano.</li>
            <li style="margin-bottom: 4px;">Veja a lista de compras dos 7 primeiros dias antes de ir ao mercado.</li>
            <li>Prepare o básico com antecedência para não depender de improviso durante a semana.</li>
          </ul>
          <p style="margin: 0 0 6px; font-weight: 600; color: #1e3a44;">Durante os 14 dias</p>
          <ul style="margin: 0 0 14px; padding-left: 18px;">
            <li style="margin-bottom: 4px;">Use o plano como base prática, não como regra absoluta.</li>
            <li style="margin-bottom: 4px;">Evite mudar tudo logo no primeiro dia — adapte aos poucos se necessário.</li>
            <li style="margin-bottom: 4px;">Se algum alimento não fizer sentido para você, use a substituição ou ajuste a quantidade.</li>
            <li style="margin-bottom: 4px;">Se estiver difícil comer tudo sólido, use os shakes do plano para facilitar.</li>
            <li style="margin-bottom: 4px;">Veja a meta de hidratação indicada pela app e distribua a água em pequenas doses ao longo do dia.</li>
            <li style="margin-bottom: 4px;">Evite beber grandes volumes junto das refeições para não atrapalhar o apetite.</li>
            <li>O mais importante é repetir com consistência.</li>
          </ul>
          <p style="margin: 0 0 6px; font-weight: 600; color: #1e3a44;">Depois dos 14 dias</p>
          <ul style="margin: 0; padding-left: 18px;">
            <li style="margin-bottom: 4px;">Veja se conseguiu cumprir o plano na maior parte dos dias.</li>
            <li style="margin-bottom: 4px;">Veja se o peso subiu, ficou igual ou desceu.</li>
            <li style="margin-bottom: 4px;">Se não conseguiu seguir bem, melhore a consistência antes de mudar as calorias.</li>
            <li style="margin-bottom: 4px;">Se seguiu bem e mesmo assim não evoluiu, ajuste as porções ou calorias aos poucos.</li>
            <li>Se o ganho vier com muito desconforto ou gordura abdominal, reduza um pouco o excesso e ajuste com calma.</li>
          </ul>
        </div>
      </details>

      ${renderHydrationCard(results)}

      <!-- Days -->
      <div id="days-container">
        ${plan.map((day, idx) => renderDayCard(day, idx, subs, originalPlan?.[idx], results.calories, additions, removals, edits)).join('')}
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
            <div class="day-summary">Lista baseada nos 7 primeiros dias • Quantidades aproximadas para compra</div>
          </div>
          <div class="day-chev" style="transform:rotate(180deg)">${icons.chevDown(18)}</div>
        </div>
        <div class="day-body" id="shopping-body" style="display:block;">
          <div class="shopping-actions no-print" style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px;">
            <button type="button" class="btn btn-ghost" id="btn-copy-shopping" style="font-size:13px;padding:6px 12px;">📋 Copiar lista</button>
            <button type="button" class="btn btn-ghost" id="btn-pdf-shopping" style="font-size:13px;padding:6px 12px;">${icons.download(14)} Salvar PDF</button>
          </div>
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

  // Shopping list actions — Copiar e Salvar PDF
  const _plan7 = plan.slice(0, 7);
  document.getElementById('btn-copy-shopping').addEventListener('click', () => copyShoppingList(_plan7));
  document.getElementById('btn-pdf-shopping').addEventListener('click', () => exportShoppingListPDF(_plan7));

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

  // Add food buttons (+ Criar Alimento — manual form)
  mount.querySelectorAll('[data-add-food]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const { dayIdx, mealIdx } = btn.dataset;
      openAddFoodModal(Number(dayIdx), Number(mealIdx), mount);
    });
  });

  // Add from library buttons (+ Adicionar Alimento — Sprint E2-A)
  mount.querySelectorAll('[data-add-library]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const { dayIdx, mealIdx } = btn.dataset;
      openAddLibraryModal(Number(dayIdx), Number(mealIdx), mount);
    });
  });

  // Reverter receita — Sprint R4-C
  mount.querySelectorAll('[data-revert-recipe]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const { dayIdx, mealIdx } = btn.dataset;
      const key    = `${dayIdx}:${mealIdx}`;
      const prefix = `${key}:`;

      // Remove receita aplicada
      const recipeMeals = loadRecipeMeals();
      delete recipeMeals[key];
      saveRecipeMeals(recipeMeals);

      // Clean slate: limpa ajustes deixados sobre a receita
      const subs = loadSubstitutions();
      Object.keys(subs).forEach(k => { if (k.startsWith(prefix)) delete subs[k]; });
      saveSubstitutions(subs);

      const edits = loadEdits();
      Object.keys(edits).forEach(k => { if (k.startsWith(prefix)) delete edits[k]; });
      saveEdits(edits);

      const removals = loadRemovals();
      Object.keys(removals).forEach(k => { if (k.startsWith(prefix)) delete removals[k]; });
      saveRemovals(removals);

      const additions = loadAdditions();
      if (additions[key]) { delete additions[key]; saveAdditions(additions); }

      // Feedback breve no botão antes de re-renderizar
      btn.textContent = 'Refeição original restaurada ✓';
      btn.disabled = true;
      setTimeout(() => rebuildAndRender(mount), 500);
    });
  });

  // Ver receitas buttons — Sprint R4-A/B/C
  mount.querySelectorAll('[data-use-recipe]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const { dayIdx, mealIdx, mealSlot } = btn.dataset;
      openRecipeModal(Number(dayIdx), Number(mealIdx), mealSlot || '', mount);  // mount passado para R4-C
    });
  });

  // Edit plan ingredient buttons — Sprint F1
  mount.querySelectorAll('[data-edit-ingredient]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const { dayIdx, mealIdx, ingIdx } = btn.dataset;
      openEditPlanIngModal(Number(dayIdx), Number(mealIdx), Number(ingIdx), mount);
    });
  });

  // Revert edit buttons — Sprint F1
  mount.querySelectorAll('[data-revert-edit]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const { dayIdx, mealIdx, ingIdx } = btn.dataset;
      const currentEdits = loadEdits();
      delete currentEdits[`${dayIdx}:${mealIdx}:${ingIdx}`];
      saveEdits(currentEdits);
      rebuildAndRender(mount);
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

  // Remove ingredient buttons — Sprint D1
  mount.querySelectorAll('[data-remove-ingredient]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const { dayIdx, mealIdx, ingIdx, ingLabel } = btn.dataset;
      const currentRemovals = loadRemovals();
      currentRemovals[`${dayIdx}:${mealIdx}:${ingIdx}`] = { label: ingLabel || '' };
      saveRemovals(currentRemovals);
      rebuildAndRender(mount);
    });
  });

  // Restore ingredient buttons — Sprint D1
  mount.querySelectorAll('[data-restore-ingredient]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const { dayIdx, mealIdx, ingIdx } = btn.dataset;
      const currentRemovals = loadRemovals();
      delete currentRemovals[`${dayIdx}:${mealIdx}:${ingIdx}`];
      saveRemovals(currentRemovals);
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

  // Botão "Voltar ao topo" agora é global — montado por mountBackToTop() em app.js.
}

/* ============================================================================ */
/* Day card rendering                                                           */
/* ============================================================================ */

function renderDayCard(day, idx, subs, originalDay, targetKcal, additions, removals, edits) {
  const isOpen = idx === 0;
  const dayHasSubs      = Object.keys(subs      || {}).some(k => k.startsWith(`${idx}:`));
  const dayHasAdditions = Object.keys(additions  || {}).some(k => k.startsWith(`${idx}:`));
  const dayHasRemovals  = Object.keys(removals   || {}).some(k => k.startsWith(`${idx}:`));
  const dayHasEdits     = Object.keys(edits      || {}).some(k => k.startsWith(`${idx}:`));
  const dayHasRecipes   = day.meals.some(m => m.isRecipeMeal);    // Sprint R4-C
  const dayHasChanges   = dayHasSubs || dayHasAdditions || dayHasRemovals || dayHasEdits || dayHasRecipes;
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
          <span class="day-comp-lbl">Com alterações</span>
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
        ${day.meals.map((meal, mIdx) => renderMealCard(meal, idx, mIdx, subs, removals, edits)).join('')}
      </div>
    </div>
  `;
}

function renderMealCard(meal, dayIdx, mealIdx, subs, removals, edits) {
  const safeSubs     = subs    || {};
  const safeRemovals = removals || {};
  const safeEdits    = edits   || {};
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
        ${meal.isRecipeMeal ? `<span class="meal-card-badge-recipe no-print" data-testid="recipe-badge">Receita</span>` : ''}
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
          const isAdded   = ing.isAddition === true;
          const isRemoved = ing.isRemoved  === true;
          const subKey    = `${dayIdx}:${mealIdx}:${iIdx}`;
          const isSub     = !isAdded && !isRemoved && !!(safeSubs[subKey]);
          const isEdited  = !isAdded && !isRemoved && !isSub && !!(safeEdits[subKey]);
          const ingName   = ing.label || (getFoodWithCustom(ing.food)?.name || ing.food) || '';

          // Ghost placeholder for removed plan ingredients (no-print: invisible in PDF)
          if (isRemoved) {
            const ghostLabel = ing.removedLabel || ingName;
            return `
              <li class="ingredient ingredient-removed no-print">
                <div class="ingredient-main" style="opacity:0.55;font-style:italic;">
                  <div class="ingredient-name" style="color:#999;">${escapeHtml(ghostLabel)} removido</div>
                </div>
                <button type="button" class="ingredient-sub-btn no-print"
                        data-restore-ingredient
                        data-day-idx="${dayIdx}" data-meal-idx="${mealIdx}" data-ing-idx="${iIdx}"
                        aria-label="Restaurar ${escapeHtml(ghostLabel)}">Restaurar</button>
              </li>`;
          }

          const liClass = `ingredient${isSub ? ' ingredient-substituted' : ''}${isAdded ? ' ingredient-added' : ''}${isEdited ? ' ingredient-edited' : ''}`;
          return `
            <li class="${liClass}">
              <div class="ingredient-main">
                <div class="ingredient-name">
                  ${escapeHtml(ingName)}
                  ${isSub    ? '<span class="ing-badge-subst">Substituído</span>' : ''}
                  ${isAdded  ? '<span class="ing-badge-added">Adicionado</span>' : ''}
                  ${isEdited ? '<span class="ing-badge-edited">Editado</span>' : ''}
                </div>
                <div class="ingredient-qty">${isImperial && !ing.isAddition ? toImperialDisplay(ing.display) : ing.display}</div>
                <div class="ingredient-macros">${ing.macros.kcal} kcal • P:${ing.macros.prot}g C:${ing.macros.carb}g G:${ing.macros.fat}g</div>
                ${isAdded && ing.micronutrients ? buildNutriDetailsHtml(ing.micronutrients, ing.grams) : ''}
                ${isSub    ? `<button type="button" class="ing-revert-btn no-print" data-revert data-day-idx="${dayIdx}" data-meal-idx="${mealIdx}" data-ing-idx="${iIdx}" aria-label="Reverter para original">${icons.refresh(11)} Reverter para original</button>` : ''}
                ${isAdded  ? `<button type="button" class="ing-edit-btn no-print" data-edit-addition data-addition-id="${ing.additionId}" data-day-idx="${dayIdx}" data-meal-idx="${mealIdx}" aria-label="Editar alimento adicionado">✎ Editar</button>` : ''}
                ${isAdded  ? `<button type="button" class="ing-remove-btn no-print" data-remove-addition data-addition-id="${ing.additionId}" data-day-idx="${dayIdx}" data-meal-idx="${mealIdx}" aria-label="Remover alimento adicionado">✕ Remover</button>` : ''}
                ${!isAdded && !isRemoved && !isSub ? `<button type="button" class="ing-edit-btn no-print" data-edit-ingredient data-day-idx="${dayIdx}" data-meal-idx="${mealIdx}" data-ing-idx="${iIdx}" aria-label="Editar ${escapeHtml(ingName)}">✎ Editar</button>` : ''}
                ${isEdited ? `<button type="button" class="ing-revert-edit-btn no-print" data-revert-edit data-day-idx="${dayIdx}" data-meal-idx="${mealIdx}" data-ing-idx="${iIdx}" aria-label="Reverter edição">${icons.refresh(11)} Reverter edição</button>` : ''}
                ${!isAdded ? `<button type="button" class="ing-remove-btn no-print" data-remove-ingredient data-day-idx="${dayIdx}" data-meal-idx="${mealIdx}" data-ing-idx="${iIdx}" data-ing-label="${escapeHtml(ingName)}" aria-label="Remover ${escapeHtml(ingName)}">${icons.trash(12)} Remover</button>` : ''}
              </div>
              ${!isAdded ? `<button type="button" class="ingredient-sub-btn no-print" data-swap data-day-idx="${dayIdx}" data-meal-idx="${mealIdx}" data-ing-idx="${iIdx}" aria-label="Substituir ${ing.label || ing.food}">${icons.swap(14)} Substituir</button>` : ''}
            </li>
          `;
        }).join('')}
      </ul>
      <div class="ing-add-row no-print">
        <button type="button" class="ing-add-btn" data-add-food data-testid="add-food-button"
                data-day-idx="${dayIdx}" data-meal-idx="${mealIdx}"
                aria-label="Criar alimento personalizado para a refeição ${mealIdx + 1}">
          + Criar Alimento
        </button>
        <button type="button" class="ing-add-btn ing-lib-btn" data-add-library data-testid="add-library-button"
                data-day-idx="${dayIdx}" data-meal-idx="${mealIdx}"
                aria-label="Adicionar alimento da biblioteca à refeição ${mealIdx + 1}">
          + Adicionar Alimento
        </button>
        <button type="button" class="ing-add-btn ing-recipe-btn no-print" data-use-recipe
                data-day-idx="${dayIdx}" data-meal-idx="${mealIdx}"
                data-meal-slot="${meal.slot || ''}"
                data-testid="use-recipe-button"
                aria-label="Ver receitas para esta refeição">
          ${icons.list(13)} Ver receitas
        </button>
        ${meal.isRecipeMeal ? `
        <button type="button" class="ing-add-btn ing-revert-recipe-btn no-print" data-revert-recipe
                data-day-idx="${dayIdx}" data-meal-idx="${mealIdx}"
                data-testid="revert-recipe-button"
                aria-label="Voltar à refeição original">
          ${icons.refresh(13)} Voltar à refeição original
        </button>` : ''}
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
 * Dominant macro per food category (Sprint C1).
 * Defines the primary nutritional metric used to compute substitute quantities
 * for same-category and compatible swaps.
 */
const SUB_DOMINANT_MACRO = {
  protein: 'prot',
  dairy:   'prot',  // laticínios usados como fonte proteica
  carb:    'carb',
  fat:     'fat',
  fruit:   'carb',  // fruta = carboidrato natural
  veg:     'kcal',  // vegetais são residuais — kcal suficiente
  extra:   'kcal',  // condimentos/extras — kcal suficiente
};

/**
 * Computes the raw gram quantity of a substitute food that best approximates
 * the dominant macro of the original ingredient (Sprint C1).
 *
 * For same-category / compatible swaps the dominant macro (carb for bread,
 * prot for chicken, fat for olive oil, …) is used instead of pure kcal
 * equivalence, so the suggested portion is nutritionally closer to the original.
 *
 * Falls back to kcal-equivalence when:
 *   — the substitute has near-zero density in the dominant macro (cross-category,
 *     e.g. pão → azeite: bread.dominant = carb, oil.carb ≈ 0)
 *   — the original has near-zero dominant macro (avoids division noise)
 *   — the macro-optimised portion would produce kcal far from the original
 *     (guard: ratio > 3.0 or < 0.25) — prevents absurd quantities such as
 *     252g of dried dates to replace one egg
 *
 * subPracticalGrams() is always applied afterwards to keep portions practical.
 *
 * @param {{ kcal:number, prot:number, carb:number, fat:number }} origMacros
 * @param {string}  origCat   category of the original ingredient
 * @param {{ per100: { kcal:number, prot:number, carb:number, fat:number } }} subFood
 * @returns {number}  raw grams (before practical rounding by subPracticalGrams)
 */
function calcOptimalGrams(origMacros, origCat, subFood) {
  const macro = SUB_DOMINANT_MACRO[origCat] || 'kcal';

  // Calorie-equivalence (existing behaviour) used as fallback
  const kcalG = () => origMacros.kcal > 0
    ? (origMacros.kcal / subFood.per100.kcal) * 100
    : 100;

  // veg / extra: caloric reference is the right target
  if (macro === 'kcal') return kcalG();

  const origTarget = origMacros[macro];     // e.g. 26.1 g carb
  const subDensity = subFood.per100[macro]; // e.g. 28.2 g carb / 100 g

  // Cross-category: substitute has near-zero dominant macro → fallback kcal
  // (e.g. pão → azeite: azeite.per100.carb = 0 < 1)
  if (!subDensity || subDensity < 1) return kcalG();

  // Original has near-zero dominant macro → fallback kcal to avoid division noise
  if (origTarget < 1) return kcalG();

  const rawByMacro = (origTarget / subDensity) * 100;

  // Safety guard: if macro-matched portion produces kcal very different from the
  // original (>3× or <25%), the foods are too different in caloric density →
  // fallback to kcal.  Example: egg → dates produces 252g (710 kcal vs 72 kcal) —
  // the guard catches it (ratio 9.9 > 3.0) and uses kcal-equivalence instead.
  const estKcal   = subFood.per100.kcal * rawByMacro / 100;
  const kcalRatio = estKcal / Math.max(origMacros.kcal, 1);
  if (kcalRatio > 3.0 || kcalRatio < 0.25) return kcalG();

  return rawByMacro;
}

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
 * Sprint C2-A — Selects the practical gram quantity for an extra-opt substitute
 * that best fits the user's projected daily targets (kcal + macros).
 *
 * Steps:
 *   1. Compute the C1 dominant-macro anchor (calcOptimalGrams → subPracticalGrams).
 *   2. Generate up to ~9 candidate quantities around the anchor by stepping
 *      up/down in food-appropriate increments (unit size, 10g, 20g, 30g…).
 *   3. Score each candidate against projected day totals using a weighted
 *      normalised error; prefer candidates that stay within getDailyImpact bounds.
 *   4. Return the candidate with the lowest score.
 *
 * getDailyImpact, getSubImpact, subPracticalGrams, formatQty and all labels
 * remain fully unchanged — only the quantity fed into them may differ from C1.
 *
 * @param {string} id              FOODS key of the substitute
 * @param {object} food            FOODS[id]
 * @param {{ kcal,prot,carb,fat }} origMacros  macros of the ingredient being replaced
 * @param {string} origCat         category of the ingredient being replaced
 * @param {{ kcal,prot,carb,fat }} currentDayTotal  day totals before this swap
 * @param {object} results         user daily targets (calories, protein.grams, …)
 * @returns {number}  practical gram quantity
 */
function findBestGrams(id, food, origMacros, origCat, currentDayTotal, results) {
  // Guard: if targets not available, fall back to C1 behaviour
  if (!results || !currentDayTotal) {
    const rawG = calcOptimalGrams(origMacros, origCat, food);
    return subPracticalGrams(id, Math.max(5, Math.round(rawG / 5) * 5));
  }

  // ── 1. Anchor: C1 dominant-macro quantity ───────────────────────────────────
  const rawBase = calcOptimalGrams(origMacros, origCat, food);
  const base    = subPracticalGrams(id, Math.max(5, Math.round(rawBase / 5) * 5));

  // ── 2. Step size tuned by food type ─────────────────────────────────────────
  const step = (
    (food.countableUnit && food.units && food.units.length) ? food.units[0].grams :
    SUB_PROTEIN_PESAVEL.has(id)                             ? 30  :
    SUB_CARB_FLEX.has(id)                                   ? 20  :
    food.category === 'fat'                                 ? 12  :
    food.category === 'dairy'                               ? 20  :
    20
  );

  // ── 3. Build candidate list ──────────────────────────────────────────────────
  const rawCandidates = [];
  for (let m = -3; m <= 3; m++) rawCandidates.push(base + m * step);
  rawCandidates.push(Math.round(base * 0.5)); // smaller portion
  rawCandidates.push(Math.round(base * 1.5)); // larger  portion

  const seen = new Set();
  const candidates = rawCandidates
    .map(g => subPracticalGrams(id, Math.max(5, g))) // snap each to practical value
    .filter(g => {
      if (g < 10 || g > 600) return false; // absolute safety bounds
      if (seen.has(g))        return false; // deduplicate
      seen.add(g);
      return true;
    });

  if (candidates.length === 0) return base;

  // ── 4. Score each candidate — lower is better ────────────────────────────────
  // Normalised weighted deviations against daily targets.
  // Weights: protein (1.5×) critical for hardgainer; fat (1.2×) rises fast;
  // carb (0.8×) has the widest acceptable range; kcal (1.0×) baseline.
  let bestG     = base;
  let bestScore = Infinity;

  for (const g of candidates) {
    const m    = calcFoodMacros(id, g);
    const dKcal = (currentDayTotal.kcal - origMacros.kcal + m.kcal) - results.calories;
    const dProt = (currentDayTotal.prot - origMacros.prot + m.prot) - results.protein.grams;
    const dCarb = (currentDayTotal.carb - origMacros.carb + m.carb) - results.carb.grams;
    const dFat  = (currentDayTotal.fat  - origMacros.fat  + m.fat)  - results.fat.grams;

    let score = 0;
    score += 1.0 * Math.abs(dKcal) / Math.max(results.calories,       1);
    score += 1.5 * Math.abs(dProt) / Math.max(results.protein.grams,  1);
    score += 0.8 * Math.abs(dCarb) / Math.max(results.carb.grams,     1);
    score += 1.2 * Math.abs(dFat)  / Math.max(results.fat.grams,      1);

    // Breach penalties — mirror getDailyImpact thresholds so the scorer
    // and the label agree on what "bad" means.
    if (dKcal < -100 || dKcal > 200) score += 0.8;
    if (dFat  >  15)                  score += 0.5;
    if (dProt < -25)                  score += 0.5;
    if (Math.abs(dCarb) > 60)         score += 0.3;

    // Penalise impractically small quantities for non-countable foods
    if (g < 20 && !food.countableUnit) score += 1.0;

    if (score < bestScore) { bestScore = score; bestG = g; }
  }

  return bestG;
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
 * Sprint C2-B — Classifies a substitution by the DELTA it introduces, not by
 * whether the entire day meets its target.  This prevents the modal from
 * penalising a substitute for pre-existing day imbalances.
 *
 * Evaluation priority:
 *   1. Absolute kcal safety limits (unchanged thresholds — day must stay viable).
 *   2. Fat: only warn when the swap itself causes the excess (delta + absolute).
 *   3. Protein: only warn when the swap significantly reduces protein.
 *   4. Carb: only warn when the swap creates a large carb swing vs the original.
 *   5. "Boa troca": swap corrects a protein deficit without adding fat.
 *   6. "Troca segura": swap stays close to the original in all macros.
 *   7. "Aceitável com ajuste": moderate deviation, within absolute safety.
 *
 * @param {{ kcal,prot,carb,fat }} origMacros  macros of the ingredient being replaced
 * @param {{ kcal,prot,carb,fat }} subMacros   macros of the substitute at chosen grams
 * @param {{ kcal,prot,carb,fat }} projected   projected day totals after this swap
 * @param {object}                 results     user daily targets
 */
function classifySwap(origMacros, subMacros, projected, results) {
  // ── Delta: what this swap changes vs the original ingredient ───────────────
  const dKcal = subMacros.kcal - origMacros.kcal;
  const dProt = subMacros.prot - origMacros.prot;
  const dCarb = subMacros.carb - origMacros.carb;
  const dFat  = subMacros.fat  - origMacros.fat;

  // ── Absolute day state after swap (used for safety limits only) ────────────
  const absKcal = projected.kcal - results.calories;
  const absFat  = projected.fat  - results.fat.grams;

  // ── 1. Absolute kcal safety (unchanged thresholds from Sprint B) ───────────
  if (absKcal < -100) return { cls: 'sub-impact-low',   label: 'Fora da margem: muito baixo' };
  if (absKcal >  200) return { cls: 'sub-impact-high',  label: 'Fora da margem: muito alto'  };

  // ── 2. Fat: only warn if the swap causes the overshoot ────────────────────
  //    Requires both: the swap adds >10g fat AND the projected day total
  //    exceeds the fat target by >15g.  Pre-existing fat excess is not blamed.
  if (dFat > 10 && absFat > 15)
    return { cls: 'sub-impact-macro', label: 'Atenção: gorduras acima do alvo' };

  // ── 3. Protein: only warn if this swap significantly reduces protein ────────
  if (dProt < -20)
    return { cls: 'sub-impact-macro', label: 'Atenção: proteína baixa' };

  // ── 4. Carb: only warn when the swap itself creates a large carb swing ──────
  if (Math.abs(dCarb) > 50)
    return { cls: 'sub-impact-macro', label: 'Atenção: carboidratos fora do alvo' };

  // ── 5. "Boa troca": swap corrects a protein deficit without adding fat ───────
  //    The day had prot deficit before this swap AND the swap adds protein.
  const preAbsProt = projected.prot - dProt - results.protein.grams;
  if (preAbsProt < -15 && dProt > 10 && dFat <= 4)
    return { cls: 'sub-impact-safe', label: 'Boa troca' };

  // ── 6. "Troca segura": swap is close to the original in all dimensions ───────
  //    dProt: allowed to increase freely (only floor at −12g loss)
  //    dFat:  allowed to decrease freely (only cap increases at +8g)
  if (Math.abs(dKcal) <= 80 && dProt >= -12 && Math.abs(dCarb) <= 30 && dFat <= 8)
    return { cls: 'sub-impact-safe', label: 'Troca segura' };

  // ── 7. Moderate deviation — acceptable with awareness ────────────────────────
  return { cls: 'sub-impact-ok', label: 'Aceitável com ajuste' };
}

/**
 * Returns how compatible two food categories are for substitution purposes.
 *   'close'      — same category or nutritionally equivalent role
 *   'compatible' — adjacent categories (similar caloric role, different macros)
 *   'different'  — very different macro profile
 */
function getSwapCompatibility(origCat, subCat) {
  if (origCat === subCat) return 'close';
  // Adjacent pairs that share a nutritional role without being the same category
  const compatPairs = new Set([
    'protein-dairy', 'dairy-protein',   // iogurte/skyr/queijo como fonte proteica
    'carb-fruit',    'fruit-carb',       // fruta é carboidrato natural
    'carb-extra',    'extra-carb',       // mel/açúcar como carboidrato calórico
    'carb-veg',      'veg-carb',         // vegetais têm algum carb
    'fruit-extra',   'extra-fruit',      // tâmaras/mel — frutas/extras similares
  ]);
  return compatPairs.has(`${origCat}-${subCat}`) ? 'compatible' : 'different';
}

/**
 * Combined impact label — Sprint C2-B update.
 *
 * Two-layer evaluation:
 *   Layer 1 — Swap quality (classifySwap, delta-based):
 *     Evaluates how much this specific swap changes the day vs the original.
 *     Avoids false alerts from pre-existing day imbalances.
 *   Layer 2 — Category compatibility (unchanged from Sprint C):
 *     Extra opts from structurally different categories get an honest label.
 *
 * @param {boolean} isPriority    true = curated substitute; false = extra from FOODS
 * @param {string}  origCat       category of the original ingredient
 * @param {string}  subCat        category of the substitute food
 * @param {{ kcal,prot,carb,fat }} origMacros  macros of the ingredient being replaced
 * @param {{ kcal,prot,carb,fat }} subMacros   macros of the substitute at chosen grams
 * @param {{ kcal,prot,carb,fat }} projected   projected day totals after this swap
 * @param {object}  results       user daily targets
 */
function getSubImpact(isPriority, origCat, subCat, origMacros, subMacros, projected, results) {
  const swap = classifySwap(origMacros, subMacros, projected, results);

  // Absolute safety limits always take precedence
  if (swap.cls === 'sub-impact-low' || swap.cls === 'sub-impact-high') return swap;

  // Curated priority subs: category is already vetted — swap quality is the signal
  if (isPriority) return swap;

  // Extra opts: add category-compatibility layer
  const compat = getSwapCompatibility(origCat, subCat);

  // Same category or nutritionally close → swap quality alone determines label
  if (compat === 'close') return swap;

  // Adjacent categories (carb↔fruit, protein↔dairy, …):
  // downgrade positive labels to signal the macro profile difference
  if (compat === 'compatible') {
    if (swap.cls === 'sub-impact-safe')
      return { cls: 'sub-impact-ok', label: 'Aceitável com ajuste' };
    return swap;
  }

  // Truly different categories (carb↔fat, protein↔carb, …):
  // the category mismatch is the dominant honest signal — always amber
  return { cls: 'sub-impact-macro', label: 'Macros muito diferentes' };
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
    // isPriority=true: curated substitute — C2-B delta-based quality label
    const impact = getSubImpact(true, currentFood.category, opt.food.category, ing.macros, macros, projected, results);
    const display = opt.id === 'whey'
      ? buildWheyDisplay(practicalG)
      : formatQty(opt.id, practicalG);
    return { id: opt.id, food: opt.food, grams: practicalG, macros, display, delta, impact, projected };
  });

  // Extend with ALL remaining FOODS not yet included, grouped by their own category.
  // Priority substitutes (options) stay first within each category group because they
  // are inserted before the extras in the combined array used for grouping below.
  const priorityIds = new Set([ing.food, ...options.map(o => o.id)]);
  const extraOpts = Object.entries(FOODS)
    .filter(([id, food]) => !priorityIds.has(id) && food.per100 && food.per100.kcal > 0)
    .map(([id, food]) => {
      // Sprint C2-A: search among practical candidates for the quantity that best
      // fits the projected day totals. Falls back to C1 anchor automatically.
      const practicalG = findBestGrams(id, food, ing.macros, currentFood.category, currentDayTotal, results);
      const macros = calcFoodMacros(id, practicalG);
      const delta = macros.kcal - ing.macros.kcal;
      const projected = {
        kcal: currentDayTotal.kcal - ing.macros.kcal + macros.kcal,
        prot: currentDayTotal.prot - ing.macros.prot + macros.prot,
        carb: currentDayTotal.carb - ing.macros.carb + macros.carb,
        fat:  currentDayTotal.fat  - ing.macros.fat  + macros.fat,
      };
      // isPriority=false: extra from FOODS — C2-B delta-based + category compatibility
      const impact = getSubImpact(false, currentFood.category, food.category, ing.macros, macros, projected, results);
      const display = id === 'whey'
        ? buildWheyDisplay(practicalG)
        : formatQty(id, practicalG);
      return { id, food, grams: practicalG, macros, display, delta, impact, projected };
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
      // Custom foods: same category as current — use delta-based classification
      const impact = classifySwap(ing.macros, macros, projected, results);
      const sign   = delta >= 0 ? '+' : '';
      return { id: f.id, food: f, grams: equivG, macros, display: `${equivG}g`, delta, impact, sign, projected, isCustom: true };
    })
    .filter(Boolean);

  // Group all official options (priority first, then extras) by category
  const grouped = {};
  [...options, ...extraOpts].forEach(opt => {
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

  // Primary category: the category of the original food, open by default.
  // Fallback to the first populated category if the food's category has no options.
  const primaryCat = (currentFood.category && grouped[currentFood.category])
    ? currentFood.category
    : (SUB_CAT_ORDER.find(c => grouped[c]) || 'protein');

  const optionsHtml = SUB_CAT_ORDER
    .filter(c => grouped[c])
    .map(cat => {
      const items = grouped[cat];
      const isOpen = cat === primaryCat;
      return `
        <details class="sub-cat-group"${isOpen ? ' open' : ''}>
          <summary class="sub-cat-label">${SUB_CAT_LABEL[cat] || cat}<span class="sub-cat-count"> (${items.length})</span></summary>
          <ul class="sub-cat-items">${items.map(renderSubOpt).join('')}</ul>
        </details>
      `;
    }).join('');

  const customOptsHtml = customOpts.length > 0 ? `
    <details class="sub-cat-group" open>
      <summary class="sub-cat-label sub-cat-custom">⭐ Meus alimentos<span class="sub-cat-count"> (${customOpts.length})</span></summary>
      <ul class="sub-cat-items">${customOpts.map(renderSubOpt).join('')}</ul>
    </details>
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
        <div class="sub-options">${optionsHtml}${customOptsHtml}</div>
      `}
      <div class="btn-row" style="margin-top:16px; flex-wrap:wrap;">
        ${isAlreadySubstituted ? `<button type="button" class="btn btn-ghost" id="btn-reset-ing" style="font-size:13px;">${icons.refresh(14)} Reverter: ${escapeHtml(originalFoodName)}</button>` : ''}
        <button type="button" class="btn btn-secondary" data-modal-close>Cancelar</button>
      </div>
    </div>
  `;

  const close = openModal(contentHtml);

  // Accordion: close other categories when one opens, then scroll its summary
  // to the top of the modal (not the page) so the user sees the start of the list.
  document.querySelectorAll('.sub-cat-group').forEach(det => {
    det.addEventListener('toggle', () => {
      if (det.open) {
        // 1. Close all other groups (exclusive accordion)
        document.querySelectorAll('.sub-cat-group').forEach(other => {
          if (other !== det) other.removeAttribute('open');
        });
        // 2. After the DOM has painted the expanded content, scroll the modal
        //    so the opened summary appears near the top — without touching page scroll.
        requestAnimationFrame(() => {
          const summary = det.querySelector('summary.sub-cat-label');
          const modal   = det.closest('.modal');
          if (!summary || !modal) return;
          const delta = summary.getBoundingClientRect().top
                      - modal.getBoundingClientRect().top;
          modal.scrollTop += delta - 8; // 8 px breathing room above the label
        });
      }
    });
  });

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
/* Sprint F1 — Edit application                                                 */
/* ============================================================================ */

/**
 * Remove quantidade numérica inicial do label de um ingrediente.
 * Usado apenas para display quando o ingrediente está EDITADO,
 * evitando contradição entre o nome ("2 ovos") e a porção editada ("6 ovos").
 *
 * "2 ovos mexidos"  → "Ovos mexidos"
 * "3 claras de ovo" → "Claras de ovo"
 * "1 ovo inteiro"   → "Ovo inteiro"
 * "Pão branco"      → "Pão branco"   (inalterado — não começa com número)
 * "Banana madura"   → "Banana madura" (inalterado)
 */
function stripLeadingQty(label) {
  if (!label) return label;
  const stripped = label.replace(/^\d+(?:[.,]\d+)?\s+/, '');
  if (stripped === label) return label;          // sem número inicial — não muda
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

/**
 * Aplica edições de quantidade a ingredientes originais do plano.
 *
 * Corre PRIMEIRO no pipeline (antes de applySubstitutions), de modo a que:
 *  - substituições posteriores tenham precedência sobre edições;
 *  - os índices de ingrediente (ingIdx) permaneçam estáveis.
 *
 * Storage: hg:edits keyed por "dayIdx:mealIdx:ingIdx" → { grams: number }.
 * Macros recalculados via calcFoodMacros() — zero alteração a FOODS global.
 *
 * @param {object[]} plan   plano original (hg:plan)
 * @param {object}   edits  { "d:m:i": { grams: number } }
 */
function applyEdits(plan, edits) {
  if (!edits || Object.keys(edits).length === 0) return plan;

  return plan.map((day, dayIdx) => {
    let dayChanged = false;
    const newMeals = day.meals.map((meal, mealIdx) => {
      let mealChanged = false;
      const newIngredients = meal.ingredients.map((ing, ingIdx) => {
        const key  = `${dayIdx}:${mealIdx}:${ingIdx}`;
        const edit = edits[key];
        if (!edit) return ing;
        mealChanged = true;
        const newGrams = edit.grams;
        // Sprint F2-A: macrosOverride (manual entry) takes precedence.
        // Falls back to calcFoodMacros() when no override is present.
        const macros = edit.macrosOverride
          ? edit.macrosOverride
          : (getFood(ing.food)
              ? calcFoodMacros(ing.food, newGrams)
              : (() => {
                  const f = newGrams / (ing.grams || 100);
                  return {
                    kcal: Math.round(ing.macros.kcal * f),
                    prot: Math.round(ing.macros.prot * f * 10) / 10,
                    carb: Math.round(ing.macros.carb * f * 10) / 10,
                    fat:  Math.round(ing.macros.fat  * f * 10) / 10,
                  };
                })()
            );
        const display = getFood(ing.food) ? formatQty(ing.food, newGrams) : `${newGrams}g`;
        // Limpar quantidade numérica inicial do label para evitar contradição visual.
        // "2 ovos mexidos" editado para 300g → "Ovos mexidos" (porção: "6 ovos (300g)").
        const label   = stripLeadingQty(ing.label) || ing.label;
        return { ...ing, grams: newGrams, display, macros, isEdited: true, label };
      });
      if (!mealChanged) return meal;
      dayChanged = true;

      const totals = newIngredients
        .filter(i => !i.isRemoved)
        .reduce((acc, i) => ({
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
    if (!dayChanged) return day;

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
 * Devolve a unidade visual do campo de quantidade no modal de edição.
 * Para alimentos dairy (exibidos em ml por formatQty), devolve 'ml'.
 * Para todos os restantes devolve 'g' — nenhuma conversão de valor é necessária.
 */
function getIngEditUnit(foodId) {
  const food = getFood(foodId);
  if (food && food.category === 'dairy') return 'ml';
  return 'g';
}

/**
 * Sprint F1/F2-A — Abre modal para editar quantidade e macros de um ingrediente do plano.
 *
 * F1: edita gramas → macros recalculados automaticamente via calcFoodMacros().
 * F2-A: adiciona campos editáveis de kcal/P/C/G.
 *   - Gramas → recalcula e preenche os campos de macro (userEditedMacros = false).
 *   - Campo de macro editado → userEditedMacros = true.
 *   - Guardar com userEditedMacros = true → guarda macrosOverride.
 *   - Guardar com userEditedMacros = false → guarda só grams (F1 behaviour).
 *   - Reverter = delete da chave → pipeline original restaurado.
 */
function openEditPlanIngModal(dayIdx, mealIdx, ingIdx, mount) {
  const originalPlan = loadPlan();
  if (!originalPlan) return;
  const origIng = originalPlan[dayIdx]?.meals[mealIdx]?.ingredients[ingIdx];
  if (!origIng) return;

  const edits         = loadEdits();
  const editKey       = `${dayIdx}:${mealIdx}:${ingIdx}`;
  const existingEdit  = edits[editKey];
  const currentGrams  = existingEdit?.grams ?? origIng.grams;
  const origGrams     = origIng.grams;
  const ingName       = origIng.label || getFood(origIng.food)?.name || origIng.food || '';
  const editUnit      = getIngEditUnit(origIng.food);

  const origMacros = getFood(origIng.food)
    ? calcFoodMacros(origIng.food, origGrams)
    : origIng.macros;

  // Se existe um override guardado, pré-preencher com ele; caso contrário calcular.
  const initMacros = existingEdit?.macrosOverride ?? calcFoodMacros(origIng.food, currentGrams) ?? origIng.macros;

  const contentHtml = `
    <div class="modal-head">
      <div>
        <div class="modal-title">Editar Ingrediente</div>
        <div class="modal-sub">Ajuste a quantidade e os macros nesta refeição</div>
      </div>
      <button type="button" class="modal-close" data-modal-close aria-label="Fechar">${icons.x(18)}</button>
    </div>
    <div class="modal-body">
      <div class="sub-current" style="margin-bottom: 12px;">
        <div class="sub-current-label">Ingrediente</div>
        <div class="sub-current-name">${escapeHtml(ingName)}</div>
        <div class="sub-current-macros">Original: ${origMacros.kcal} kcal · P:${origMacros.prot}g · C:${origMacros.carb}g · G:${origMacros.fat}g (${origGrams}${editUnit})</div>
      </div>

      <!-- F2-B: UX copy — hint sobre valores -->
      <p style="margin:0 0 14px;font-size:12px;color:var(--ink-muted);line-height:1.5;">Pode manter os valores sugeridos pela app ou ajustar conforme o rótulo do seu alimento.</p>

      <div class="add-food-grid">
        <div class="add-food-field">
          <label class="add-food-label" for="epi-grams">Quantidade (${editUnit.toUpperCase()}) *</label>
          <input type="text" inputmode="decimal" autocomplete="off"
                 id="epi-grams" class="add-food-input" value="${currentGrams}">
        </div>
      </div>

      <div class="add-food-macros-title" style="margin-top: 14px;">
        Macros desta porção
        <span style="font-weight:400; color:var(--ink-muted); font-size:10px; margin-left:6px;">
          — alterar ${editUnit === 'ml' ? 'ml' : 'gramas'} recalcula automaticamente
        </span>
      </div>
      <div class="add-food-macros-grid">
        <div class="add-food-macro-field">
          <label class="add-food-label" for="epi-kcal">Kcal *</label>
          <input type="text" inputmode="decimal" autocomplete="off"
                 id="epi-kcal" class="add-food-input" value="${initMacros.kcal}">
        </div>
        <div class="add-food-macro-field">
          <label class="add-food-label" for="epi-prot">Proteína (g) *</label>
          <input type="text" inputmode="decimal" autocomplete="off"
                 id="epi-prot" class="add-food-input" value="${initMacros.prot}">
        </div>
        <div class="add-food-macro-field">
          <label class="add-food-label" for="epi-carb">Carbs (g) *</label>
          <input type="text" inputmode="decimal" autocomplete="off"
                 id="epi-carb" class="add-food-input" value="${initMacros.carb}">
        </div>
        <div class="add-food-macro-field">
          <label class="add-food-label" for="epi-fat">Gorduras (g) *</label>
          <input type="text" inputmode="decimal" autocomplete="off"
                 id="epi-fat" class="add-food-input" value="${initMacros.fat}">
        </div>
      </div>

      <div id="epi-error" style="display:none; color: #b91c1c; font-size: 13px; margin-top: 10px;"></div>
      <div class="btn-row" style="margin-top: 20px; flex-wrap: wrap;">
        <button type="button" class="btn btn-secondary" data-modal-close>Cancelar</button>
        <button type="button" class="btn btn-primary" id="epi-save">Salvar</button>
      </div>
    </div>
  `;

  const close = openModal(contentHtml);

  const gramsInput = document.getElementById('epi-grams');
  const kcalInput  = document.getElementById('epi-kcal');
  const protInput  = document.getElementById('epi-prot');
  const carbInput  = document.getElementById('epi-carb');
  const fatInput   = document.getElementById('epi-fat');
  const errorEl    = document.getElementById('epi-error');

  // Flag: true quando o utilizador edita manualmente os campos de macro.
  // Gramas → recalcula → reset para false. Salvar com true → guarda macrosOverride.
  let userEditedMacros = !!(existingEdit?.macrosOverride);

  /** Calcula macros para uma quantidade g (usa FOODS ou escala proporcional). */
  function calcMacrosFromGrams(g) {
    if (getFood(origIng.food)) return calcFoodMacros(origIng.food, g);
    const f = g / (origGrams || 100);
    return {
      kcal: Math.round(origMacros.kcal * f),
      prot: Math.round(origMacros.prot * f * 10) / 10,
      carb: Math.round(origMacros.carb * f * 10) / 10,
      fat:  Math.round(origMacros.fat  * f * 10) / 10,
    };
  }

  // Gramas → recalcula e preenche os campos de macro, reseta o flag.
  gramsInput.addEventListener('input', () => {
    const g = parseFloat(gramsInput.value);
    if (!g || g <= 0 || isNaN(g)) return;
    const m = calcMacrosFromGrams(g);
    kcalInput.value = m.kcal;
    protInput.value = m.prot;
    carbInput.value = m.carb;
    fatInput.value  = m.fat;
    userEditedMacros = false; // recalculo automático — sem override
  });

  // Qualquer campo de macro editado activa o flag de override manual.
  [kcalInput, protInput, carbInput, fatInput].forEach(inp => {
    inp.addEventListener('input', () => { userEditedMacros = true; });
  });

  // Guardar
  document.getElementById('epi-save').addEventListener('click', () => {
    errorEl.style.display = 'none';

    const g    = parseFloat(gramsInput.value);
    const kcal = parseFloat(kcalInput.value);
    const prot = parseFloat(protInput.value);
    const carb = parseFloat(carbInput.value);
    const fat  = parseFloat(fatInput.value);

    // Validação
    if (!g || g <= 0 || isNaN(g)) {
      errorEl.textContent = 'Quantidade deve ser maior que zero.';
      errorEl.style.display = 'block'; return;
    }
    if (isNaN(kcal) || kcal <= 0) {
      errorEl.textContent = 'Kcal deve ser maior que zero.';
      errorEl.style.display = 'block'; return;
    }
    if (isNaN(prot) || prot < 0) {
      errorEl.textContent = 'Proteína não pode ser negativa.';
      errorEl.style.display = 'block'; return;
    }
    if (isNaN(carb) || carb < 0) {
      errorEl.textContent = 'Carboidratos não podem ser negativos.';
      errorEl.style.display = 'block'; return;
    }
    if (isNaN(fat) || fat < 0) {
      errorEl.textContent = 'Gorduras não podem ser negativas.';
      errorEl.style.display = 'block'; return;
    }

    const editData = { grams: Math.round(g) };
    if (userEditedMacros) {
      editData.macrosOverride = {
        kcal: Math.round(kcal),
        prot: Math.round(prot * 10) / 10,
        carb: Math.round(carb * 10) / 10,
        fat:  Math.round(fat  * 10) / 10,
      };
    }

    const currentEdits = loadEdits();
    currentEdits[editKey] = editData;
    saveEdits(currentEdits);
    close();
    rebuildAndRender(mount);
  });
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

/**
 * Mapa de IDs de alimentos para tipos de regra de compra prática.
 * IDs ausentes mantêm o formato de exibição atual sem sugestão de compra.
 */
const SHOPPING_RULE_MAP = {
  // carnes/frango/peixe/carne moída → blocos de 500 g
  peito_frango:          'meat',
  carne_moida:           'meat',
  peixe_tilapia:         'meat',
  peixe_pescada:         'meat',
  peixe_salmao:          'meat',
  coxa_frango:           'meat',
  peito_peru:            'meat',
  alcatra_grelhada:      'meat',
  camarao:               'meat',
  bacalhau_fresco:       'meat',
  // ovos → dúzias
  ovo_inteiro:           'eggs',
  // leite e bebidas vegetais → embalagens de 1 L
  leite_integral:        'dairy_liquid',
  leite_lactose_free:    'dairy_liquid',
  bebida_aveia:          'dairy_liquid',
  bebida_amendoa:        'dairy_liquid',
  // iogurte/skyr/cottage → potes
  iogurte_grego:         'dairy_solid',
  iogurte_natural:       'dairy_solid',
  skyr:                  'dairy_solid',
  queijo_cottage:        'dairy_solid',
  // atum → latas de ~120 g
  atum_agua:             'canned',
  // secos comprados secos → pacotes
  aveia_flocos:          'dry_goods',
  creme_arroz:           'dry_goods',
  // cereais e leguminosas cozidos → estimar peso seco (÷ fator de cozimento)
  arroz_branco_cozido:   'cooked_grain',
  arroz_basmati_cozido:  'cooked_grain',
  arroz_integral_cozido: 'cooked_grain',
  arroz_jasmine_cozido:  'cooked_grain',
  quinoa_cozida:         'cooked_grain',
  macarrao_cozido:       'cooked_grain',
  feijao_carioca:        'cooked_grain',
  // tapioca → goma seca em pacote
  tapioca:               'dry_goods',
  // batatas/raízes → peso aproximado in natura
  batata_cozida:         'produce',
  batata_doce_cozida:    'produce',
  mandioca_cozida:       'produce',
  // frutas → unidades ou cachos práticos
  banana_prata:          'produce',
  maca:                  'produce',
  pera:                  'produce',
  manga:                 'produce',
  mamao:                 'produce',
  datil:                 'small_pack',
  // gordura-fruta → unidade prática
  abacate:               'produce',
  // vegetais → unidade ou pacote
  brocolis:              'produce',
  abobrinha:             'produce',
  cenoura:               'produce',
  salada_mista:          'produce',
  // molhos e extratos → embalagem
  molho_tomate:          'sauce_pack',
  // purê → reagrupado com batata inglesa na lista de compras
  pure_batata:           'produce',
  // queijos → embalagem pequena
  queijo_branco:         'cheese_pack',
  queijo_mussarela:      'cheese_pack',
  // pão → unidades ou pacote
  pao_frances:           'bread_roll',
  pao_forma:             'bread_loaf',
  // whey / caseína → pote
  whey:                  'whey',
  caseina:               'whey',
  // pastas de oleaginosas → pote
  pasta_amendoim:        'nut_butter',
  pasta_amendoa:         'nut_butter',
  pasta_castanha_caju:   'nut_butter',
  // óleos → garrafa
  azeite:                'oil',
  oleo_coco:             'oil',
  // mel → frasco
  mel:                   'honey',
  // cacau/canela/temperos → embalagem pequena
  cacau_po:              'small_pack',
  canela:                'small_pack',
};

/**
 * Fator de conversão peso cozido → peso seco para cereais.
 * Ex.: arroz: 100 g seco → ~300 g cozido, logo fator = 1/3.
 */
const COOKED_GRAIN_FACTOR = {
  arroz_branco_cozido:   1 / 3,
  arroz_basmati_cozido:  1 / 3,
  arroz_integral_cozido: 1 / 3,
  arroz_jasmine_cozido:  1 / 3,
  quinoa_cozida:         1 / 3,
  macarrao_cozido:       0.4,
  feijao_carioca:        0.4,   // ~100g seco → ~250g cozido
};

/**
 * Nomes limpos para exibição na Lista de Compras.
 * Mostra o alimento como é comprado no mercado, não como aparece preparado no plano.
 * IDs ausentes caem no regex de limpeza de termos de preparo.
 */
const SHOPPING_DISPLAY_NAMES = {
  ovo_inteiro:           'Ovos',
  carne_moida:           'Carne moída',
  peito_frango:          'Peito de frango',
  peixe_pescada:         'Pescada',
  peixe_tilapia:         'Tilápia',
  peixe_salmao:          'Salmão',
  coxa_frango:           'Coxa de frango',
  peito_peru:            'Peito de peru',
  alcatra_grelhada:      'Alcatra',
  camarao:               'Camarão',
  bacalhau_fresco:       'Bacalhau',
  arroz_branco_cozido:   'Arroz branco',
  arroz_basmati_cozido:  'Arroz basmati',
  arroz_integral_cozido: 'Arroz integral',
  arroz_jasmine_cozido:  'Arroz jasmine',
  quinoa_cozida:         'Quinoa',
  macarrao_cozido:       'Macarrão',
  // frutas/veg com nome não-limpo pelo regex
  maca:                  'Maçã',
  molho_tomate:          'Molho de tomate',
  // itens cujo nome de compra difere do nome preparado
  pure_batata:           'Batata inglesa',   // agrupado com batata_cozida
  salada_mista:          'Folhas para salada',
  pao_forma:             'Pão de forma',
};

/**
 * Retorna o nome do alimento como deve ser exibido na Lista de Compras.
 * Remove termos de preparo e parênteses explicativos — apenas visual,
 * nunca altera o nome original do alimento no plano.
 */
function getShoppingDisplayName(foodId, originalName) {
  if (SHOPPING_DISPLAY_NAMES[foodId]) return SHOPPING_DISPLAY_NAMES[foodId];
  return originalName
    .replace(/\s+(grelhad[ao]s?|cozid[ao]s?|assad[ao]s?|mexid[ao]s?)\b/gi, '')
    .replace(/\s*\([^)]*\)/g, '')
    .trim();
}

/** Formata gramas como kg com vírgula decimal (pt-BR). Ex: 1500 → "1,5 kg". */
function fmtKg(g) {
  const kg = g / 1000;
  const s = kg % 1 === 0 ? String(Math.round(kg)) : kg.toFixed(1);
  return `${s.replace('.', ',')} kg`;
}

/**
 * Sugestão prática de compra para a lista de compras (display-only).
 * Retorna null quando o alimento não tem regra — o display antigo é mantido.
 * Nunca altera item.grams nem qualquer valor usado em cálculo nutricional.
 */
function getPurchaseSuggestion(foodId, grams, isImperial) {
  const rule = SHOPPING_RULE_MAP[foodId];

  if (!isImperial) {
    // ── MÉTRICO ──────────────────────────────────────────────────────────────
    if (rule === 'meat') {
      const p = Math.ceil(grams / 500) * 500;
      return p >= 1000 ? `~${fmtKg(p)}` : `~${p} g`;
    }
    if (rule === 'eggs') {
      const doz = Math.ceil(Math.ceil(grams / 50) / 12);
      return doz === 1 ? '1 dúzia' : `${doz} dúzias`;
    }
    if (rule === 'dairy_liquid') {
      const lt = Math.ceil(grams / 1000);
      return lt === 1 ? '1 embalagem de 1 L' : `${lt} embalagens de 1 L`;
    }
    if (rule === 'dairy_solid') {
      if (grams <= 500)  return '1 pote de 500 g';
      if (grams <= 1000) return '1 pote de 1 kg';
      const potes = Math.ceil(grams / 1000);
      return `${potes} potes de 1 kg`;
    }
    if (rule === 'canned') {
      const cans = Math.ceil(grams / 120);
      return cans === 1 ? '~1 lata' : `~${cans} latas`;
    }
    if (rule === 'dry_goods') {
      if (grams <= 500) return '1 pacote de 500 g';
      const kg = Math.ceil(grams / 1000);
      return `~${kg} kg`;
    }
    if (rule === 'cooked_grain') {
      const factor  = COOKED_GRAIN_FACTOR[foodId] || (1 / 3);
      const dryG    = Math.round(grams * factor);
      const rounded = Math.ceil(dryG / 500) * 500;
      if (rounded <= 500)  return '1 pacote de 500 g';
      if (rounded <= 1000) return '1 kg';
      return `~${Math.ceil(rounded / 1000)} kg`;
    }
    if (rule === 'produce') {
      // Quantidade aproximada usada como referência visual
      const qty = grams >= 1000
        ? `~${fmtKg(Math.ceil(grams / 100) * 100)}`
        : `~${Math.ceil(grams / 50) * 50} g`;
      // ── Frutas ───────────────────────────────────────────────────────────
      // Pesos práticos por unidade (usados só para sugestão visual de compra):
      //   banana média  ~125 g  |  maçã/pera média ~150 g  |  manga média ~200 g
      //   abacate peq.   ~85 g  |  abacate médio   ~155 g  |  abacate grande ~205 g
      //   abobrinha média ~150 g|  brócolis un.    ~300 g  |  salada pacote ~225 g
      if (foodId === 'banana_prata') {
        const n = Math.max(1, Math.round(grams / 125));
        return `cerca de ${n} bananas médias (${qty})`;
      }
      if (foodId === 'maca' || foodId === 'pera') {
        const n = Math.max(1, Math.round(grams / 150));
        return n === 1 ? `1 unidade média (${qty})` : `${n} unidades médias (${qty})`;
      }
      if (foodId === 'manga') {
        const n = Math.max(1, Math.round(grams / 200));
        return n === 1 ? `1 unidade média (${qty})` : `${n} unidades médias (${qty})`;
      }
      if (foodId === 'mamao') {
        const n = Math.max(1, Math.round(grams / 800));
        return n === 1 ? `1 unidade (${qty})` : `${n} unidades (${qty})`;
      }
      if (foodId === 'abacate') {
        // Limiares baseados em peso real: pequeno ≤100 g, médio 101–170 g, grande 171–230 g
        if (grams <= 100) return `1 unidade pequena (${qty})`;
        if (grams <= 170) return `1 unidade média (${qty})`;
        if (grams <= 230) return `1 unidade grande (${qty})`;
        const n = Math.ceil(grams / 155);
        return `${n} unidades médias (${qty})`;
      }
      // ── Vegetais ─────────────────────────────────────────────────────────
      if (foodId === 'brocolis') {
        const n = Math.max(1, Math.ceil(grams / 300));
        return n === 1 ? `1 unidade ou 1 pacote (${qty})` : `${n} unidades ou pacotes (${qty})`;
      }
      if (foodId === 'abobrinha') {
        const n = Math.max(1, Math.ceil(grams / 150));
        return n === 1 ? `1 unidade (${qty})` : `${n} unidades médias (${qty})`;
      }
      if (foodId === 'cenoura') {
        const n = Math.max(1, Math.ceil(grams / 80));
        return n === 1 ? `1 unidade (${qty})` : `${n} unidades (${qty})`;
      }
      if (foodId === 'salada_mista') {
        const n   = Math.max(1, Math.ceil(grams / 225));
        const low = Math.max(1, n - 1);
        if (n === 1) return `1 pacote ou 1 maço (${qty})`;
        return `${low}–${n} pacotes/maços pequenos (${qty})`;
      }
      // ── Raízes/batatas → só peso ──────────────────────────────────────────
      const p = Math.ceil(grams / 500) * 500;
      return p >= 1000 ? `~${fmtKg(p)}` : `~${p} g`;
    }
    if (rule === 'sauce_pack') {
      return '1 embalagem de 300–500 g';
    }
    if (rule === 'cheese_pack') {
      const qty = grams >= 1000
        ? `~${fmtKg(Math.ceil(grams / 100) * 100)}`
        : `~${Math.ceil(grams / 50) * 50} g`;
      if (grams <= 250) return `1 embalagem pequena (~100–250 g)`;
      if (grams <= 500) return `1–2 embalagens (${qty})`;
      return `${Math.ceil(grams / 250)} embalagens (${qty})`;
    }
    if (rule === 'bread_roll') {
      const qty = grams >= 1000
        ? `~${fmtKg(Math.ceil(grams / 100) * 100)}`
        : `~${Math.ceil(grams / 50) * 50} g`;
      const n = Math.max(1, Math.round(grams / 50));
      return `cerca de ${n} pães/unidades (${qty})`;
    }
    if (rule === 'bread_loaf') {
      const qty = grams >= 1000
        ? `~${fmtKg(Math.ceil(grams / 100) * 100)}`
        : `~${Math.ceil(grams / 50) * 50} g`;
      const n = Math.max(1, Math.ceil(grams / 450));
      return n === 1 ? `1 pacote (${qty})` : `${n} pacotes (${qty})`;
    }
    if (rule === 'whey') {
      return grams > 900 ? '2 potes de whey' : '1 pote de whey';
    }
    if (rule === 'nut_butter') {
      if (grams <= 500)  return '1 pote de 500 g';
      if (grams <= 1000) return '1 pote de 1 kg';
      const potes = Math.ceil(grams / 1000);
      return `${potes} potes de 1 kg`;
    }
    if (rule === 'oil') {
      return grams <= 500 ? '1 garrafa de 500 ml' : '1 garrafa de 1 L';
    }
    if (rule === 'honey') {
      return grams <= 500 ? '1 frasco de 500 g' : '1 frasco de 1 kg';
    }
    if (rule === 'small_pack') {
      return '1 embalagem pequena';
    }
    // fallback genérico — exibe quantidade aproximada
    const rounded = Math.ceil(grams / 50) * 50;
    return rounded >= 1000 ? `~${fmtKg(rounded)}` : `~${rounded} g`;
  } else {
    // ── IMPERIAL ─────────────────────────────────────────────────────────────
    if (rule === 'meat') {
      const lbs = grams / 453.592;
      const p   = Math.ceil(lbs / 0.5) * 0.5;
      const s   = p % 1 === 0 ? String(p) : p.toFixed(1);
      return `~${s} lb`;
    }
    if (rule === 'eggs') {
      const doz = Math.ceil(Math.ceil(grams / 50) / 12);
      return doz === 1 ? '1 dozen' : `${doz} dozen`;
    }
    if (rule === 'dairy_liquid') {
      const ml = grams;
      if (ml <= 946)  return '~1 qt';
      if (ml <= 1893) return '~1 half-gal';
      const gals = Math.ceil(ml / 3785);
      return gals === 1 ? '~1 gal' : `~${gals} gal`;
    }
    if (rule === 'dairy_solid') {
      const oz = grams / 28.35;
      if (oz <= 16) return '~1 tub (16 oz)';
      const tubs = Math.ceil(oz / 32);
      return tubs === 1 ? '~1 tub (32 oz)' : `~${tubs} tubs (32 oz)`;
    }
    if (rule === 'canned') {
      const cans = Math.ceil(grams / 120);
      return cans === 1 ? '~1 can' : `~${cans} cans`;
    }
    if (rule === 'dry_goods') {
      const p = Math.ceil(grams / 453.592);
      return p === 1 ? '~1 lb' : `~${p} lb`;
    }
    if (rule === 'cooked_grain') {
      const factor = COOKED_GRAIN_FACTOR[foodId] || (1 / 3);
      const dryOz  = Math.round(grams * factor / 28.35);
      return dryOz <= 16 ? '~1 lb' : `~${Math.ceil(dryOz / 16)} lb`;
    }
    if (rule === 'produce') {
      const lbs = grams / 453.592;
      const p   = Math.ceil(lbs / 0.5) * 0.5;
      const s   = p % 1 === 0 ? String(p) : p.toFixed(1);
      return `~${s} lb`;
    }
    if (rule === 'sauce_pack')  return '1 can or pack (10–16 oz)';
    if (rule === 'cheese_pack') return '1 package';
    if (rule === 'bread_roll')  return `~${Math.max(1, Math.round(grams / 50))} rolls`;
    if (rule === 'bread_loaf')  return '1 loaf';
    if (rule === 'whey')        return grams > 900 ? '2 tubs of whey' : '1 tub of whey';
    if (rule === 'nut_butter') return '1 jar';
    if (rule === 'oil')        return '1 bottle';
    if (rule === 'honey')      return '1 jar';
    if (rule === 'small_pack') return '1 small pack';
    // fallback genérico imperial
    const lbs = grams / 453.592;
    if (lbs >= 1) {
      const p = Math.ceil(lbs / 0.5) * 0.5;
      const s = p % 1 === 0 ? String(p) : p.toFixed(1);
      return `~${s} lb`;
    }
    return `~${Math.round(grams / 28.35)} oz`;
  }
}

function renderShoppingList(days) {
  const isImperial = loadFormData()?.unit === 'imperial';
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

  // Mesclar itens com o mesmo nome de compra dentro da mesma categoria
  // Ex.: purê de batata + batata cozida → Batata inglesa (grams somados)
  Object.keys(byCategory).forEach(cat => {
    const seen = {};
    byCategory[cat].forEach(item => {
      const key = getShoppingDisplayName(item.foodId, item.food.name);
      if (seen[key]) {
        seen[key].grams += item.grams;
      } else {
        seen[key] = { ...item };
      }
    });
    byCategory[cat] = Object.values(seen);
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

  const shopNote = `<p class="shopping-note" style="font-size:12.5px;color:var(--ink-muted);margin:0 0 12px;font-style:italic;">Alguns produtos, como whey, azeite, mel e pastas, podem sobrar para as próximas semanas.</p>`;

  return shopNote + catOrder.filter(c => byCategory[c]).map(cat => `
    <div class="shopping-cat">
      <h4 class="shopping-cat-title">${CAT_LABEL[cat] || cat}</h4>
      <ul class="shopping-list">
        ${byCategory[cat].sort((a, b) => b.grams - a.grams).map(item => {
          const displayName = getShoppingDisplayName(item.foodId, item.food.name);
          const suggestion  = getPurchaseSuggestion(item.foodId, item.grams, isImperial);
          return `
            <li class="shopping-item" style="flex-direction:column;align-items:flex-start;gap:2px;">
              <span class="shopping-name">${displayName}</span>
              <span style="font-size:13px;font-weight:600;color:var(--ink);">Comprar: ${suggestion}</span>
            </li>`;
        }).join('')}
      </ul>
    </div>
  `).join('');
}

function formatGramsHumans(g) {
  if (g >= 1000) return `${(g / 1000).toFixed(1).replace('.', ',')} kg`;
  return `${g} g`;
}

/* ============================================================================ */
/* Shopping list — Copiar e Salvar PDF                                          */
/* ============================================================================ */

/** Constantes partilhadas para texto/PDF da lista de compras. */
const SHOPPING_CAT_LABEL = {
  protein: 'Proteínas',
  carb: 'Carboidratos',
  fat: 'Gorduras e oleaginosas',
  fruit: 'Frutas',
  veg: 'Vegetais',
  dairy: 'Lácteos',
  extra: 'Extras e temperos',
};
const SHOPPING_CAT_ORDER = ['protein', 'carb', 'dairy', 'fruit', 'veg', 'fat', 'extra'];

/**
 * Processa os dados da lista de compras e devolve {byCategory, isImperial}.
 * Replica a mesma lógica de renderShoppingList — apenas sem gerar HTML.
 */
function _getShoppingData(days) {
  const isImperial = loadFormData()?.unit === 'imperial';
  const totals = {};
  days.forEach(day => {
    day.meals.forEach(meal => {
      meal.ingredients.forEach(ing => {
        if (!totals[ing.food]) totals[ing.food] = 0;
        totals[ing.food] += ing.grams;
      });
    });
  });
  const byCategory = {};
  Object.entries(totals).forEach(([foodId, grams]) => {
    const f = FOODS[foodId];
    if (!f) return;
    const cat = f.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push({ foodId, food: f, grams: Math.ceil(grams / 50) * 50 });
  });
  Object.keys(byCategory).forEach(cat => {
    const seen = {};
    byCategory[cat].forEach(item => {
      const key = getShoppingDisplayName(item.foodId, item.food.name);
      if (seen[key]) {
        seen[key].grams += item.grams;
      } else {
        seen[key] = { ...item };
      }
    });
    byCategory[cat] = Object.values(seen);
  });
  return { byCategory, isImperial };
}

/**
 * Gera texto simples da lista de compras para clipboard.
 * Não contém HTML, botões nem linguagem técnica.
 */
function buildShoppingListText(days) {
  const { byCategory, isImperial } = _getShoppingData(days);
  let text = 'Lista de Compras — 7 primeiros dias\n';
  text += 'Quantidades aproximadas para compra.\n';
  SHOPPING_CAT_ORDER.filter(c => byCategory[c]).forEach(cat => {
    text += `\n${SHOPPING_CAT_LABEL[cat] || cat}\n`;
    byCategory[cat].sort((a, b) => b.grams - a.grams).forEach(item => {
      const name = getShoppingDisplayName(item.foodId, item.food.name);
      const sug  = getPurchaseSuggestion(item.foodId, item.grams, isImperial);
      text += `- ${name}: ${sug}\n`;
    });
  });
  return text.trim();
}

/**
 * Copia a lista de compras em texto simples para o clipboard.
 * Mostra feedback visual temporário no botão.
 */
async function copyShoppingList(days) {
  const text = buildShoppingListText(days);
  const btn  = document.getElementById('btn-copy-shopping');

  const showFeedback = () => {
    if (!btn) return;
    btn.textContent = '✓ Lista copiada!';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = '📋 Copiar lista';
      btn.disabled = false;
    }, 2000);
  };

  try {
    await navigator.clipboard.writeText(text);
    showFeedback();
  } catch (_) {
    // Fallback para browsers sem Clipboard API
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); showFeedback(); } catch (err) { /* silently fail */ }
    finally { document.body.removeChild(ta); }
  }
}

/**
 * Gera PDF isolado da Lista de Compras via iframe (não toca nos PDFs existentes).
 */
function exportShoppingListPDF(days) {
  const { byCategory, isImperial } = _getShoppingData(days);

  const catsHtml = SHOPPING_CAT_ORDER.filter(c => byCategory[c]).map(cat => `
    <div class="sl-cat">
      <div class="sl-cat-title">${SHOPPING_CAT_LABEL[cat] || cat}</div>
      <ul class="sl-items">
        ${byCategory[cat].sort((a, b) => b.grams - a.grams).map(item => {
          const name = getShoppingDisplayName(item.foodId, item.food.name);
          const sug  = getPurchaseSuggestion(item.foodId, item.grams, isImperial);
          return `<li class="sl-item"><span class="sl-name">${name}</span><span class="sl-sug">${sug}</span></li>`;
        }).join('')}
      </ul>
    </div>
  `).join('');

  const bodyHtml = `
    <div class="sl-header">
      <div class="sl-title">Lista de Compras — 7 primeiros dias</div>
      <div class="sl-sub">Quantidades aproximadas para compra, baseadas no plano alimentar.</div>
    </div>
    <div class="sl-note">Alguns produtos, como whey, azeite, mel e pastas, podem sobrar para as próximas semanas.</div>
    <div class="sl-body">${catsHtml}</div>
    <div class="sl-footer">hardgainermacros.com</div>
  `;

  const css = `
    @page { margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; font-size: 10pt; color: #2b2622; background: #fff; margin: 0; padding: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .sl-header { background: #2e5d4b; color: #fff; padding: 14px 18px 12px; margin-bottom: 10px; }
    .sl-title  { font-size: 17pt; font-weight: 700; margin-bottom: 4px; }
    .sl-sub    { font-size: 9pt; opacity: 0.85; }
    .sl-note   { font-size: 8.5pt; color: #5a7060; border-left: 3px solid #b5c9b0; padding: 4px 10px; margin: 0 0 14px; font-style: italic; background: #f4f8f4; }
    .sl-body   { columns: 2; column-gap: 18px; }
    .sl-cat    { break-inside: avoid; margin-bottom: 14px; }
    .sl-cat-title { font-size: 9.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #2e5d4b; border-bottom: 1.5px solid #2e5d4b; padding-bottom: 3px; margin-bottom: 6px; }
    .sl-items  { list-style: none; margin: 0; padding: 0; }
    .sl-item   { display: flex; justify-content: space-between; align-items: flex-start; padding: 3px 0; border-bottom: 1px dotted #ddd; font-size: 9.5pt; gap: 6px; }
    .sl-item:last-child { border-bottom: none; }
    .sl-name   { flex: 1; color: #1a1814; }
    .sl-sug    { flex-shrink: 0; color: #2e5d4b; font-weight: 600; font-size: 9pt; text-align: right; }
    .sl-footer { margin-top: 14px; font-size: 8pt; color: #aaa; text-align: right; }
  `;

  // Iframe isolado — não toca o DOM principal nem os PDFs existentes
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
  iframeDoc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${bodyHtml}</body></html>`);
  iframeDoc.close();

  iframe.contentWindow.addEventListener('afterprint', cleanup);
  window.addEventListener('afterprint', cleanup);
  setTimeout(cleanup, 30000);

  iframe.contentWindow.focus();
  iframe.contentWindow.print();
}

/* ============================================================================ */
/* Utils                                                                        */
/* ============================================================================ */

function countSolid(day) { return day.meals.filter(m => m.type === 'solid').length; }
function countShake(day) { return day.meals.filter(m => m.type === 'shake').length; }

/* ============================================================================ */
/* Hydration card — Sprint Hidratação 1                                         */
/* ============================================================================ */

/**
 * Formata mililitros como litros no padrão brasileiro.
 * 3200 → "3,2 L" · 3000 → "3 L" · 3750 → "3,8 L"
 */
function formatHydrationLiters(ml) {
  const liters = ml / 1000;
  const formatted = liters % 1 === 0
    ? String(Math.round(liters))
    : liters.toFixed(1);
  return formatted.replace('.', ',') + ' L';
}

/**
 * Calcula metas de hidratação com base no peso e dias de treino.
 * Base: peso corporal × 40 ml/dia.
 * Dias com treino: base + 500 ml.
 */
function getHydrationTargets(results) {
  const weightKg = results.weightKg || 0;
  const trainDays = results.routine?.trainDays ?? 0;
  const baseMl = Math.round(weightKg * 40);
  const trainMl = baseMl + 500;
  return { baseMl, trainMl, hasTraining: trainDays > 0 };
}

/**
 * Renderiza o card de hidratação do dia.
 * Inserido antes dos cards dos 14 dias, após o aviso de dados locais.
 * Classe no-print: invisível em PDFs e impressões.
 */
function renderHydrationCard(results) {
  const { baseMl, trainMl, hasTraining } = getHydrationTargets(results);
  const baseL = formatHydrationLiters(baseMl);
  const trainL = formatHydrationLiters(trainMl);

  if (hasTraining) {
    return `
      <div class="card card-section no-print" data-testid="hydration-card" style="border-left:4px solid #6ba8b8;">
        <h3 class="card-title">💧 Hidratação do dia</h3>
        <p class="card-body" style="text-align:center;margin-bottom:4px;">Meta aproximada em dias com treino: <strong>${trainL}</strong></p>
        <p class="card-body" style="text-align:center;margin-bottom:14px;">Meta aproximada em dias sem treino: <strong>${baseL}</strong></p>
        <p class="card-body">Beba em pequenas doses ao longo do dia. Evite beber muita água junto das refeições para não atrapalhar o apetite.</p>
        <p style="margin:8px 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--ink-muted);">Distribuição prática</p>
        <ul class="check-list">
          <li>🌅 <strong>Ao acordar:</strong> 400–500 ml</li>
          <li>🍽️ <strong>Entre refeições:</strong> 200–300 ml</li>
          <li>⚡ <strong>Antes do treino:</strong> 300–400 ml</li>
          <li>🏋️ <strong>Durante o treino:</strong> pequenos goles</li>
          <li>💪 <strong>Depois do treino:</strong> 400–600 ml</li>
          <li>🌙 <strong>Final do dia:</strong> 200–300 ml</li>
        </ul>
        <p class="card-body" style="margin-top:12px;">Em dias sem treino, mantenha a meta base e distribua ao longo do dia.</p>
      </div>
    `;
  }

  return `
    <div class="card card-section no-print" data-testid="hydration-card" style="border-left:4px solid #6ba8b8;">
      <h3 class="card-title">💧 Hidratação do dia</h3>
      <p class="card-body" style="text-align:center;margin-bottom:14px;">Meta aproximada diária: <strong>${baseL}</strong></p>
      <p class="card-body">Beba em pequenas doses ao longo do dia. Evite beber muita água junto das refeições para não atrapalhar o apetite.</p>
      <p style="margin:8px 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--ink-muted);">Distribuição prática</p>
      <ul class="check-list">
        <li>🌅 <strong>Ao acordar:</strong> 400–500 ml</li>
        <li>🍽️ <strong>Entre refeições:</strong> 200–300 ml</li>
        <li>💧 <strong>Ao longo do dia:</strong> pequenos goles</li>
        <li>🌙 <strong>Final do dia:</strong> 200–300 ml</li>
      </ul>
    </div>
  `;
}

/**
 * Constrói o bloco compacto de hidratação para o PDF individual do dia.
 * Reutiliza getHydrationTargets e formatHydrationLiters (Sprint Hidratação 1).
 */
function buildHydrationPdfBlock(results) {
  const { baseMl, trainMl, hasTraining } = getHydrationTargets(results);
  const baseL  = formatHydrationLiters(baseMl);
  const trainL = formatHydrationLiters(trainMl);

  const metaLine = hasTraining
    ? `Com treino: <strong>${trainL}</strong> &nbsp;·&nbsp; Sem treino: <strong>${baseL}</strong>`
    : `Meta aproximada diária: <strong>${baseL}</strong>`;

  return `
    <div class="pdf-hydration">
      <div class="pdf-hydration-line1">💧 <strong>Hidratação do dia</strong> &nbsp;—&nbsp; ${metaLine}</div>
      <div class="pdf-hydration-line2">Beba em pequenas doses ao longo do dia. Evite grandes volumes junto das refeições.</div>
    </div>
  `;
}

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
        // Alimentos da biblioteca usam formatQty para display prático (ex: "1 porção média").
        // Alimentos criados manualmente mantêm o display em quantidade + unidade inseridas.
        const isLibrary = add.snapshot?.source === 'library' && !!getFood(add.food);
        return {
          food: add.food,
          label: food.name,
          grams: add.grams,
          display: isLibrary ? formatQty(add.food, add.grams) : `${add.grams} ${add.unit || 'g'}`,
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
 * Sprint D1 — Marks plan ingredients as removed and recalculates meal/day totals.
 *
 * Removed ingredients are flagged with isRemoved:true instead of being spliced
 * out of the array — this preserves indices (used by subs/removals keys) and
 * allows ghost rendering + restore in the UI.  The PDF sees only active items
 * because the ghost <li> carries class="no-print".
 *
 * @param {object[]} plan     effective plan (after applySubstitutions)
 * @param {object}   removals { "dayIdx:mealIdx:ingIdx": { label } }
 */
function applyRemovals(plan, removals) {
  if (!removals || Object.keys(removals).length === 0) return plan;

  return plan.map((day, dayIdx) => {
    let dayChanged = false;
    const newMeals = day.meals.map((meal, mealIdx) => {
      let mealChanged = false;
      const newIngredients = meal.ingredients.map((ing, ingIdx) => {
        const key = `${dayIdx}:${mealIdx}:${ingIdx}`;
        if (!removals[key]) return ing;
        mealChanged = true;
        return { ...ing, isRemoved: true, removedLabel: removals[key].label };
      });
      if (!mealChanged) return meal;
      dayChanged = true;

      // Recalculate meal totals excluding removed ingredients
      const totals = newIngredients
        .filter(i => !i.isRemoved)
        .reduce((acc, i) => ({
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

    if (!dayChanged) return day;

    // Recalculate day totals
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
        <div class="modal-title">Criar Alimento</div>
        <div class="modal-sub">Cria um alimento personalizado e adiciona-o à refeição</div>
        <p class="local-data-modal-note" data-testid="local-data-modal-note">🔒 Este alimento ficará salvo apenas neste navegador.</p>
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
                   placeholder="Ex: Iogurte proteico natural" maxlength="80">
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

/**
 * Sprint E2-A — Abre modal para adicionar alimento da biblioteca padrão.
 *
 * Fluxo:
 *   1. Agrupa FOODS por categoria (accordion) — sem busca nesta sprint.
 *   2. Cada item mostra: nome, porção prática, kcal, P/C/G, botão "Adicionar".
 *   3. Ao clicar "Adicionar": guarda em hg:additions com source:'library'.
 *      applyAdditions() resolve o alimento via FOODS (getFood) — sem custom_foods.
 *   4. rebuildAndRender() recalcula totais, comparação e PDF.
 *
 * Storage reutilizado: hg:additions — mesmo estrutura de openAddFoodModal.
 * Pipeline reutilizado: applyAdditions() → totais → PDF → remoção.
 */
function openAddLibraryModal(dayIdx, mealIdx, mount) {
  const LIB_CAT_LABEL = {
    protein: 'Proteínas',
    carb:    'Carboidratos',
    dairy:   'Laticínios',
    fruit:   'Frutas',
    fat:     'Gorduras',
    veg:     'Vegetais',
    extra:   'Extras',
  };
  const LIB_CAT_ORDER = ['protein', 'carb', 'dairy', 'fruit', 'fat', 'veg', 'extra'];

  /** Porção padrão prática: prefere primeira unidade do food, com fallbacks por categoria. */
  function defaultGrams(foodId, food) {
    if (food.units && food.units.length) return food.units[0].grams;
    if (food.category === 'fat')   return 15;
    if (food.category === 'extra') return 15;
    if (food.category === 'veg')   return 80;
    return 100;
  }

  // Agrupar FOODS por categoria
  const grouped = {};
  Object.entries(FOODS).forEach(([id, food]) => {
    if (!food.per100 || food.per100.kcal <= 0) return;
    const cat = food.category || 'extra';
    if (!grouped[cat]) grouped[cat] = [];
    const grams   = defaultGrams(id, food);
    const macros  = calcFoodMacros(id, grams);
    const display = formatQty(id, grams);
    grouped[cat].push({ id, food, grams, macros, display });
  });

  const renderItems = (items) => items.map(({ id, food, grams, macros, display }) => `
    <li class="lib-food-item">
      <div class="lib-food-info">
        <div class="lib-food-name">${escapeHtml(food.name)}</div>
        <div class="lib-food-qty">${escapeHtml(display)}</div>
        <div class="lib-food-macros">${macros.kcal} kcal · P:${macros.prot}g · C:${macros.carb}g · G:${macros.fat}g</div>
      </div>
      <button type="button" class="btn btn-primary lib-add-btn"
              data-lib-id="${id}" data-lib-grams="${grams}"
              aria-label="Adicionar ${escapeHtml(food.name)}">Adicionar</button>
    </li>
  `).join('');

  const catGroupsHtml = LIB_CAT_ORDER
    .filter(cat => grouped[cat])
    .map((cat, i) => `
      <details class="sub-cat-group"${i === 0 ? ' open' : ''}>
        <summary class="sub-cat-label">${LIB_CAT_LABEL[cat] || cat}<span class="sub-cat-count"> (${grouped[cat].length})</span></summary>
        <ul class="sub-cat-items">${renderItems(grouped[cat])}</ul>
      </details>
    `).join('');

  const contentHtml = `
    <div class="modal-head">
      <div>
        <div class="modal-title">Adicionar Alimento</div>
        <div class="modal-sub">Escolha um alimento da biblioteca para adicionar à refeição</div>
      </div>
      <button type="button" class="modal-close" data-modal-close aria-label="Fechar">${icons.x(18)}</button>
    </div>
    <div class="modal-body">
      <p style="margin: 0 0 12px; font-size: 12.5px; color: var(--ink-muted);">Clique em <strong>Adicionar</strong> para incluir o alimento com a porção padrão. Os macros são recalculados automaticamente.</p>
      <div class="sub-options">${catGroupsHtml}</div>
      <div class="btn-row" style="margin-top: 16px;">
        <button type="button" class="btn btn-secondary" data-modal-close>Fechar</button>
      </div>
    </div>
  `;

  const close = openModal(contentHtml);

  // Accordion exclusivo (igual ao modal de substituições)
  document.querySelectorAll('.sub-cat-group').forEach(det => {
    det.addEventListener('toggle', () => {
      if (det.open) {
        document.querySelectorAll('.sub-cat-group').forEach(other => {
          if (other !== det) other.removeAttribute('open');
        });
      }
    });
  });

  // Botões Adicionar
  document.querySelectorAll('.lib-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const foodId = btn.dataset.libId;
      const grams  = Number(btn.dataset.libGrams);
      const food   = FOODS[foodId];
      if (!food) return;

      const additions = loadAdditions();
      const addKey    = `${dayIdx}:${mealIdx}`;
      if (!additions[addKey]) additions[addKey] = [];
      additions[addKey].push({
        id:   `addition_${Date.now()}`,
        food: foodId,
        grams,
        unit: 'g',
        snapshot: {
          name:     food.name,
          per100:   food.per100,
          category: food.category,
          source:   'library',
        },
      });
      saveAdditions(additions);
      close();
      rebuildAndRender(mount);
    });
  });
}

/* ============================================================================ */
/* Recipe modal — Sprint R4-A/B/C                                               */
/* Visualização, pré-visualização escalada e substituição de refeição.          */
/* ============================================================================ */

/**
 * Nomes legíveis em português para cada slot de refeição.
 * Usado para humanizar os avisos técnicos do recipe-scaler — Sprint R4-C fix.
 */
const SLOT_LABEL_PT = {
  breakfast:          'café da manhã',
  shake_morning:      'shake da manhã',
  lunch:              'almoço',
  shake_afternoon:    'shake da tarde',
  dinner:             'jantar',
  shake_night:        'shake noturno',
  shake_extra:        'shake extra',
  shake_extra2:       'shake extra',
  pre_workout_light:  'pré-treino',
  post_workout_night: 'shake noturno',
};

/** Converte um slotId em nome legível; remove underscores como fallback seguro. */
function humanSlot(slotId) {
  return SLOT_LABEL_PT[slotId] || slotId.replace(/_/g, ' ');
}

/**
 * Substitui o aviso técnico de slot (gerado pelo recipe-scaler) por uma
 * mensagem amigável em português. Não toca nos outros avisos (clamping, etc.).
 *
 * @param {string[]} warnings   - lista de warnings de scaleRecipe
 * @param {object}   recipe     - objecto de RECIPES
 * @param {string}   mealSlot   - slot da refeição actual
 * @returns {string[]}
 */
function humanizeSlotWarnings(warnings, recipe, mealSlot) {
  if (!mealSlot || (recipe.suggestedSlots || []).includes(mealSlot)) return warnings;

  // Remove o aviso técnico (começa com 'Slot "')
  const filtered = warnings.filter(w => !w.startsWith('Slot "'));

  // Adiciona aviso amigável
  const suggestedNames = (recipe.suggestedSlots || []).map(humanSlot).join(', ');
  const currentName    = humanSlot(mealSlot);
  filtered.push(
    `Esta receita não é das mais indicadas para ${currentName}. ` +
    `Costuma encaixar melhor em ${suggestedNames}.`
  );

  return filtered;
}

/**
 * Abre o modal de receitas da biblioteca, filtrado pelo slot da refeição.
 * Ao clicar numa receita, mostra pré-visualização escalada contra a refeição
 * efectiva. Não altera o plano, ingredientes, totais nem localStorage.
 *
 * @param {number} dayIdx   - índice do dia no plano (0-13)
 * @param {number} mealIdx  - índice da refeição no dia
 * @param {string} mealSlot - slot da refeição (ex: 'breakfast', 'lunch', 'shake_morning')
 */
function openRecipeModal(dayIdx, mealIdx, mealSlot, mount) {  // mount adicionado em R4-C
  const TYPE_LABEL = { solid: 'Sólida', shake: 'Shake' };

  // ── Target macros: refeição efectiva (com edições e subs aplicadas) ────────
  const effectivePlan = applySubstitutions(
    applyEdits(loadPlan(), loadEdits()),
    loadSubstitutions()
  );
  const targetMeal = (effectivePlan[dayIdx]?.meals[mealIdx]?.totals) || { kcal: 500, prot: 35, carb: 45, fat: 18 };

  const compatible   = RECIPES.filter(r => Array.isArray(r.suggestedSlots) && r.suggestedSlots.includes(mealSlot));
  const incompatible = RECIPES.filter(r => !Array.isArray(r.suggestedSlots) || !r.suggestedSlots.includes(mealSlot));

  function renderItem(r, isCompat) {
    const typeCls  = r.type === 'shake' ? 'recipe-modal-badge-shake' : 'recipe-modal-badge-solid';
    const typeTxt  = TYPE_LABEL[r.type] || r.type;
    const compatEl = isCompat
      ? '<span class="recipe-modal-compat">✅ Compatível</span>'
      : '<span class="recipe-modal-incompat">⚠️ Fora dos slots sugeridos</span>';
    return `
      <li class="recipe-modal-item" data-recipe-id="${r.id}"
          role="button" tabindex="0"
          aria-label="Ver pré-visualização: ${escapeHtml(r.name)}">
        <div class="recipe-modal-item-head">
          <span class="recipe-modal-name">${escapeHtml(r.name)}</span>
          <span class="recipe-modal-badge ${typeCls}">${typeTxt}</span>
        </div>
        <div class="recipe-modal-desc">${escapeHtml(r.description)}</div>
        <div class="recipe-modal-meta">~${r.baseKcal} kcal &nbsp;·&nbsp; ${compatEl}</div>
      </li>`;
  }

  const compatHtml = compatible.length
    ? `<ul class="recipe-modal-list">${compatible.map(r => renderItem(r, true)).join('')}</ul>`
    : `<p class="recipe-modal-empty">Ainda não há receitas sugeridas para esta refeição.</p>`;

  const incompatSection = incompatible.length ? `
    <div class="recipe-modal-section-label">Outras receitas da biblioteca</div>
    <ul class="recipe-modal-list">${incompatible.map(r => renderItem(r, false)).join('')}</ul>
  ` : '';

  const contentHtml = `
    <div class="modal-head">
      <div>
        <div class="modal-title">Receitas para esta refeição</div>
        <div class="modal-sub">Clique numa receita para ver a pré-visualização ajustada a esta refeição.</div>
      </div>
      <button type="button" class="modal-close" data-modal-close aria-label="Fechar">${icons.x(18)}</button>
    </div>
    <div class="modal-body">
      <div class="recipe-list-section">
        ${compatHtml}
        ${incompatSection}
      </div>
      <div id="recipe-preview-panel" class="recipe-preview-panel" style="display:none;" data-testid="recipe-preview-panel"></div>
      <div class="btn-row" style="margin-top: 16px;">
        <button type="button" class="btn btn-secondary" data-modal-close>Fechar</button>
      </div>
    </div>
  `;

  const closeModal = openModal(contentHtml);  // Sprint R4-C: captura close para usar em applySelectedRecipe

  // ── Handlers de clique nas receitas — após openModal reconstruir o DOM ─────
  document.querySelectorAll('.recipe-modal-item[data-recipe-id]').forEach(item => {
    const handleSelect = () => {
      const recipe = RECIPES.find(r => r.id === item.dataset.recipeId);
      if (!recipe) return;

      // Destaque visual do item seleccionado
      document.querySelectorAll('.recipe-modal-item').forEach(i => i.classList.remove('recipe-modal-item--selected'));
      item.classList.add('recipe-modal-item--selected');

      // Calcular pré-visualização (puro — sem efeitos laterais)
      const result = scaleRecipe(recipe, targetMeal, { slot: mealSlot });

      // Sprint R4-C fix: traduzir avisos técnicos de slot para português legível
      const displayResult = {
        ...result,
        warnings: humanizeSlotWarnings(result.warnings, recipe, mealSlot),
      };

      // Renderizar painel
      const panel = document.getElementById('recipe-preview-panel');
      if (panel) {
        panel.innerHTML = renderRecipePreview(displayResult);
        panel.style.display = 'block';
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Sprint R4-C: registar handler do botão "Aplicar receita"
        const applyBtn = panel.querySelector('[data-apply-recipe]');
        if (applyBtn) {
          applyBtn.addEventListener('click', () => {
            applyBtn.textContent = '✓ Receita aplicada';
            applyBtn.disabled = true;
            // Usa displayResult (warnings humanizados) — lógica de apply usa result original
            setTimeout(() => applySelectedRecipe(dayIdx, mealIdx, result, mount, closeModal), 500);
          });
        }
      }
    };

    item.addEventListener('click', handleSelect);
    // Acessibilidade — teclas Enter e Espaço
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(); }
    });
  });
}

/**
 * Sprint R4-C fix — Gera até 2 avisos de perfil de macros baseados nos
 * totais da receita escalada vs o target da refeição.
 *
 * Não é técnico, não bloqueia a aplicação, não usa IDs internos.
 * Funciona para qualquer receita actual ou futura.
 *
 * Thresholds:
 *  - Carboidrato baixo:  totals.carb ≤ 10 g  OU  (target.carb > 20 g E deltas.carb < −25 g)
 *  - Proteína baixa:     target.prot > 0 E deltas.prot < −15 g
 *  - Gordura alta:       target.fat > 0 E deltas.fat > 20 g
 *  - Carboidrato alto:   deltas.carb > 30 g
 *
 * @param {object} result - output de scaleRecipe() (com deltas e target)
 * @returns {string[]} lista de avisos, máx. 2
 */
function macroProfileWarnings(result) {
  const { totals, target, deltas } = result;
  const w = [];

  // 1. Proteína muito abaixo do alvo (> 15 g a menos)
  if (target.prot > 0 && deltas.prot < -15) {
    w.push('Esta receita tem pouca proteína para esta refeição. Pode ser útil escolher uma opção mais proteica ou ajustar os ingredientes.');
  }

  // 2. Carboidrato muito baixo (absoluto ≤ 10 g OU muito abaixo do alvo)
  if (totals.carb <= 10 || (target.carb > 20 && deltas.carb < -25)) {
    w.push('Esta receita tem poucos carboidratos. Se esta refeição deve sustentar treino ou trabalho físico, considere acompanhar com uma fonte de carboidrato.');
  }

  // 3. Gordura muito acima do alvo (> 20 g a mais)
  if (target.fat > 0 && deltas.fat > 20) {
    w.push('Esta receita concentra mais gordura do que o habitual nesta refeição. Costuma ser boa para calorias, mas pode pesar mais na digestão.');
  }

  // 4. Carboidrato muito acima do alvo (> 30 g a mais)
  if (deltas.carb > 30) {
    w.push('Esta receita concentra mais carboidratos. Pode ser útil perto do treino, mas veja se encaixa no resto do dia.');
  }

  // Máximo 2 avisos para não poluir o modal
  return w.slice(0, 2);
}

/**
 * Sprint R4-B/C — Gera o HTML do painel de pré-visualização da receita escalada.
 * Apenas apresentação — sem efeitos laterais.
 *
 * @param {object} result - output de scaleRecipe() (com warnings já humanizados)
 * @returns {string} HTML do painel
 */
function renderRecipePreview(result) {
  const FIT_CLS = {
    good:            'recipe-preview-fit--good',
    approximate:     'recipe-preview-fit--approx',
    macro_mismatch:  'recipe-preview-fit--mismatch',
    not_recommended: 'recipe-preview-fit--bad',
  };
  const fitCls = FIT_CLS[result.fitScore] || '';

  const ingsHtml = result.scaledIngredients.map(ing => {
    const display = formatQty(ing.foodId, ing.grams);
    return `<li class="recipe-preview-ing"><span class="recipe-preview-ing-name">${escapeHtml(ing.name)}</span> <strong>${escapeHtml(display)}</strong></li>`;
  }).join('');

  const warningsHtml = result.warnings.length
    ? `<div class="recipe-preview-warnings" data-testid="recipe-preview-warnings">
        ${result.warnings.map(w => `<div class="recipe-preview-warning">⚠️ ${escapeHtml(w)}</div>`).join('')}
       </div>`
    : '';

  const dKcal  = result.deltas.kcal;
  const dSign  = dKcal > 0 ? '+' : '';
  const deltaNote = `${dSign}${dKcal} kcal em relação ao alvo (${result.target.kcal} kcal)`;

  return `
    <div class="recipe-preview" data-testid="recipe-preview">
      <div class="recipe-preview-head">
        <div class="recipe-preview-title">Pré-visualização</div>
        <div class="recipe-preview-sub">Ajustada para esta refeição</div>
      </div>
      <div class="recipe-preview-macros" data-testid="recipe-preview-macros">
        <span class="recipe-preview-kcal">${result.totals.kcal} kcal</span>
        <span class="recipe-preview-macro">P: <strong>${result.totals.prot}g</strong></span>
        <span class="recipe-preview-macro">C: <strong>${result.totals.carb}g</strong></span>
        <span class="recipe-preview-macro">G: <strong>${result.totals.fat}g</strong></span>
      </div>
      <div class="recipe-preview-delta">${escapeHtml(deltaNote)}</div>
      <div class="recipe-preview-fit ${fitCls}" data-testid="recipe-preview-fit">${escapeHtml(result.fitLabel)}</div>
      <div class="recipe-preview-ings-label">Ingredientes ajustados:</div>
      <ul class="recipe-preview-ings" data-testid="recipe-preview-ings">
        ${ingsHtml}
      </ul>
      ${warningsHtml}
      ${(() => {
        const profileW = macroProfileWarnings(result);
        return profileW.length
          ? `<div class="recipe-preview-profile-advice" data-testid="recipe-preview-profile-advice">
              ${profileW.map(w => `<div class="recipe-preview-profile-tip">ℹ️ ${escapeHtml(w)}</div>`).join('')}
             </div>`
          : '';
      })()}
      <div class="recipe-preview-apply no-print">
        <button type="button" class="btn btn-primary" data-apply-recipe
                data-testid="apply-recipe-button"
                aria-label="Aplicar esta receita à refeição">
          Aplicar receita
        </button>
      </div>
    </div>
  `;
}

/* ============================================================================ */
/* applyRecipeMeals + applySelectedRecipe — Sprint R4-C                         */
/* ============================================================================ */

/**
 * Substitui refeições marcadas com a receita escalada correspondente.
 * Corre PRIMEIRO no pipeline (antes de applyEdits).
 * Adiciona `isRecipeMeal: true` ao objecto meal para que `renderMealCard`
 * possa mostrar o badge e o botão de reversão.
 *
 * @param {object[]} plan
 * @param {object}   recipeMeals  { "dayIdx:mealIdx": { recipeId, recipeName, fitLabel, ingredients, totals } }
 * @returns {object[]}
 */
function applyRecipeMeals(plan, recipeMeals) {
  if (!recipeMeals || Object.keys(recipeMeals).length === 0) return plan;

  return plan.map((day, dayIdx) => {
    let dayChanged = false;
    const newMeals = day.meals.map((meal, mealIdx) => {
      const key     = `${dayIdx}:${mealIdx}`;
      const applied = recipeMeals[key];
      if (!applied) return meal;

      dayChanged = true;
      return {
        ...meal,                         // preserva slot, slotLabel, type, time
        name:         applied.recipeName,
        ingredients:  applied.ingredients,
        totals:       applied.totals,
        // Sprint R4-C fix: sobrescrever steps/note com os da receita aplicada
        steps:        applied.steps  || [],
        note:         applied.note   || '',
        isRecipeMeal: true,
        recipeId:     applied.recipeId,
        recipeName:   applied.recipeName,
        fitLabel:     applied.fitLabel,
      };
    });

    if (!dayChanged) return day;

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
 * Aplica uma receita escalada a uma refeição específica.
 *
 * 1. Mapeia scaledIngredients → formato do plano (food, label, grams, display, macros)
 * 2. Limpa ajustes existentes naquela refeição (clean slate)
 * 3. Guarda em hg:recipe_meals
 * 4. Re-renderiza o plano
 * 5. Fecha o modal
 *
 * @param {number}   dayIdx
 * @param {number}   mealIdx
 * @param {object}   result     - output de scaleRecipe()
 * @param {object}   mount      - elemento de montagem
 * @param {Function} closeModal - fecha o modal
 */
function applySelectedRecipe(dayIdx, mealIdx, result, mount, closeModal) {
  const key    = `${dayIdx}:${mealIdx}`;
  const prefix = `${key}:`;

  // 1. Mapear scaledIngredients para formato do plano
  const ingredients = result.scaledIngredients.map(ing => ({
    food:    ing.foodId,                          // compatível com shopping list e substitutions
    label:   ing.name,
    grams:   ing.grams,
    display: formatQty(ing.foodId, ing.grams),   // compatível com imperial (toImperialDisplay)
    macros:  ing.macros,
  }));

  // 2. Salvar receita aplicada (incluindo steps e note para substituir bloco de preparação)
  const recipe = RECIPES.find(r => r.id === result.recipeId);
  const recipeMeals = loadRecipeMeals();
  recipeMeals[key] = {
    recipeId:   result.recipeId,
    recipeName: result.recipeName,
    fitLabel:   result.fitLabel,
    ingredients,
    totals:     result.totals,
    steps:      recipe?.steps || [],   // Sprint R4-C fix: preparação da receita
    note:       recipe?.note  || '',   // Sprint R4-C fix: nota prática da receita
  };
  saveRecipeMeals(recipeMeals);

  // 3. Clean slate: limpar ajustes anteriores naquela refeição
  const subs = loadSubstitutions();
  Object.keys(subs).forEach(k => { if (k.startsWith(prefix)) delete subs[k]; });
  saveSubstitutions(subs);

  const edits = loadEdits();
  Object.keys(edits).forEach(k => { if (k.startsWith(prefix)) delete edits[k]; });
  saveEdits(edits);

  const removals = loadRemovals();
  Object.keys(removals).forEach(k => { if (k.startsWith(prefix)) delete removals[k]; });
  saveRemovals(removals);

  const additions = loadAdditions();
  if (additions[key]) { delete additions[key]; saveAdditions(additions); }

  // 4. Fechar modal primeiro, depois re-renderizar
  closeModal();
  rebuildAndRender(mount);
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
        <div class="modal-sub">Os dados desta refeição serão atualizados</div>
        <p class="local-data-modal-note" data-testid="local-data-modal-note">🔒 Este alimento ficará salvo apenas neste navegador.</p>
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
          <button type="submit" class="btn btn-primary">Salvar alterações</button>
        </div>
      </form>
    </div>
  `;

  const close = openModal(contentHtml);

  // Hotfix R4-C — recalcular macros ao alterar porção base.
  // Usa foodData.per100 como baseline (mesma fórmula do pre-fill acima).
  const effQtyInput  = document.getElementById('eff-qty');
  const effKcalInput = document.getElementById('eff-kcal');
  const effProtInput = document.getElementById('eff-prot');
  const effCarbInput = document.getElementById('eff-carb');
  const effFatInput  = document.getElementById('eff-fat');

  // Flag: true quando o utilizador edita manualmente um campo macro.
  // Enquanto false, mudar a porção base recalcula automaticamente.
  let userEditedMacros = false;

  effQtyInput.addEventListener('input', () => {
    if (userEditedMacros) return;
    const q = parseFloat(effQtyInput.value);
    if (!q || q <= 0 || isNaN(q)) return;
    const scl = (v) => v != null ? Math.round(v * q / 100 * 10) / 10 : 0;
    effKcalInput.value = scl(foodData.per100.kcal);
    effProtInput.value = scl(foodData.per100.prot);
    effCarbInput.value = scl(foodData.per100.carb);
    effFatInput.value  = scl(foodData.per100.fat);
  });

  [effKcalInput, effProtInput, effCarbInput, effFatInput].forEach(inp => {
    inp.addEventListener('input', () => { userEditedMacros = true; });
  });

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
                 ${notesVal ? `value="${notesVal}"` : 'placeholder="Ex: Fonte dos dados ou observações"'}
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

  const ingsHtml = meal.ingredients.filter(ing => !ing.isRemoved).map(ing => `
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
    ${buildHydrationPdfBlock(results)}
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

      /* ── HYDRATION BLOCK ── */
      .day-pdf-print-area .pdf-hydration { padding: 5px 28px 6px; background: #f5f9fb; border-bottom: 1px solid #c8dce3; page-break-inside: avoid; break-inside: avoid; }
      .day-pdf-print-area .pdf-hydration-line1 { font-size: 11px; font-weight: 600; color: #1a3a44; line-height: 1.4; }
      .day-pdf-print-area .pdf-hydration-line2 { font-size: 10px; color: #4a6a74; line-height: 1.4; }

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

  // Sprint Hidratação 2 — linha compacta de hidratação para PDF completo
  const { baseMl: fpBaseMl, trainMl: fpTrainMl, hasTraining: fpHasTrain } = getHydrationTargets(results);
  const fpBaseL  = formatHydrationLiters(fpBaseMl);
  const fpTrainL = formatHydrationLiters(fpTrainMl);
  const fullHydration = fpHasTrain
    ? `treino ${fpTrainL} · sem treino ${fpBaseL}`
    : `${fpBaseL}/dia`;

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
    <div class="full-pdf-hydration">💧 Hidratação: ${fullHydration}</div>
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
      #full-pdf-print-area .full-pdf-hydration { padding: 6px 32px 7px; font-size: 11px; color: #2e4050; background: #f5f9fb; border-bottom: 1px solid #c8dce3; }

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
  const ingsHtml = meal.ingredients.filter(ing => !ing.isRemoved).map(ing => `
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

  // Sprint Hidratação 2 — linha compacta de hidratação para PDF compacto
  const { baseMl: cpBaseMl, trainMl: cpTrainMl, hasTraining: cpHasTrain } = getHydrationTargets(results);
  const cpBaseL  = formatHydrationLiters(cpBaseMl);
  const cpTrainL = formatHydrationLiters(cpTrainMl);
  const cpHydration = cpHasTrain
    ? `treino ${cpTrainL} · sem treino ${cpBaseL}`
    : `${cpBaseL}/dia`;

  const bodyHtml = `
    <div class="cp-header">
      <div class="cp-title">Plano Alimentar de 14 Dias — Compacto</div>
      <div class="cp-sub">${profileName}${profileName && stratLabel ? ' · ' : ''}${stratLabel}${dailyKcal ? ' · ' + dailyKcal + ' kcal/dia' : ''}</div>
    </div>
    <div class="cp-hydration">💧 Hidratação: ${cpHydration}</div>
    ${daysHtml}
  `;

  const css = `
    @page { margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; font-size: 9pt; color: #2b2622; background: #fff; print-color-adjust: exact; -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
    .cp-header { background: #c26d5a; color: #fff; padding: 6px 10px; margin-bottom: 8px; border-radius: 4px; }
    .cp-title { font-size: 13pt; font-weight: 700; }
    .cp-sub { font-size: 9pt; margin-top: 2px; opacity: 0.92; }
    .cp-hydration { font-size: 8pt; color: #3a5a66; padding: 2px 10px 4px; margin-bottom: 6px; }
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
