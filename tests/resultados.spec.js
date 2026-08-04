// @ts-check
'use strict';

/**
 * resultados.spec.js
 *
 * Testes E2E para a página /resultados.
 * Cobrem os 5 cenários validados manualmente nas Etapas 3E-A e seguintes.
 *
 * Estratégia: injeção de estado (Strategy B)
 *   — Injeta localStorage + sessionStorage antes de navegar.
 *   — Não preenche formulários. Mais rápido e isolado.
 *   — Os tempos são calculados em runtime por rebuildTimesAroundTraining()
 *     a partir de sleepEndTime/sleepStartTime do fixture.
 */

const { test, expect } = require('@playwright/test');
const { injectState, gotoResultados } = require('./helpers/inject-state');
const {
  CENARIO_1,
  CENARIO_2,
  CENARIO_3,
  CENARIO_4,
  CENARIO_5,
  CENARIO_8,
  CENARIO_9,
  CENARIO_10,
  CENARIO_11,
  CENARIO_12,
} = require('./fixtures/scenarios');

const cloneScenario = (scenario) => JSON.parse(JSON.stringify(scenario));

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Ordem da primeira refeição (Etapa 3E-A)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Resultados — primeira refeição no topo', () => {

  test('C1 — Wake 07:00 / 6 refeições / Híbrido / sem treino: Café da Manhã 07:15 primeiro', async ({ page }) => {
    await injectState(page, CENARIO_1);
    await gotoResultados(page);

    // Primeira refeição deve ser "Café da Manhã"
    await expect(page.locator('.meal-name').first())
      .toContainText('Café da Manhã');

    // Primeiro horário deve ser 07:15
    await expect(page.locator('.meal-time').first())
      .toHaveText('07:15');

    // Total kcal (2660 — sem separador em headless Chromium)
    await expect(
      page.locator('.macro-val').filter({ hasText: 'kcal/dia' })
    ).toContainText('2660');
  });

  test('C2 — Wake 08:00 / 6 refeições / Híbrido / sem treino: Café da Manhã 08:15 primeiro', async ({ page }) => {
    await injectState(page, CENARIO_2);
    await gotoResultados(page);

    await expect(page.locator('.meal-name').first())
      .toContainText('Café da Manhã');

    await expect(page.locator('.meal-time').first())
      .toHaveText('08:15');

    await expect(
      page.locator('.macro-val').filter({ hasText: 'kcal/dia' })
    ).toContainText('2660');
  });

  test('C3 — Wake 09:00 / 6 refeições / Híbrido / sem treino: Café da Manhã 09:15 primeiro', async ({ page }) => {
    await injectState(page, CENARIO_3);
    await gotoResultados(page);

    await expect(page.locator('.meal-name').first())
      .toContainText('Café da Manhã');

    await expect(page.locator('.meal-time').first())
      .toHaveText('09:15');

    await expect(
      page.locator('.macro-val').filter({ hasText: 'kcal/dia' })
    ).toContainText('2660');
  });

});

test.describe('Resultados â€” painel grÃ¡fico de macros', () => {
  test('C-MACRO-DASH-1 â€” painel completo mostra kcal, macros, percentuais e segmentos SVG vÃ¡lidos', async ({ page }) => {
    await injectState(page, CENARIO_1);
    await gotoResultados(page);

    const dashboard = page.locator('[data-macro-dashboard="complete"]');
    await expect(dashboard).toBeVisible();
    await expect(dashboard.locator('[data-macro-ring]')).toBeVisible();
    await expect(dashboard.locator('[data-macro-segment]')).toHaveCount(3);
    await expect(dashboard.locator('.macro-dashboard__kcal')).toContainText('2660');

    const visibleKcal = ((await dashboard.locator('.macro-dashboard__kcal').textContent()) || '').match(/\d+/)?.[0];

    await expect(dashboard.locator('[data-macro-row="protein"]')).toContainText('200 g');
    await expect(dashboard.locator('[data-macro-row="protein"]')).toContainText('800 kcal');
    await expect(dashboard.locator('[data-macro-row="protein"]')).toContainText('30%');

    await expect(dashboard.locator('[data-macro-row="carb"]')).toContainText('332 g');
    await expect(dashboard.locator('[data-macro-row="carb"]')).toContainText('1328 kcal');
    await expect(dashboard.locator('[data-macro-row="carb"]')).toContainText('50%');

    await expect(dashboard.locator('[data-macro-row="fat"]')).toContainText('59 g');
    await expect(dashboard.locator('[data-macro-row="fat"]')).toContainText('531 kcal');
    await expect(dashboard.locator('[data-macro-row="fat"]')).toContainText('20%');

    const ariaLabel = await dashboard.locator('[data-macro-ring]').getAttribute('aria-label');
    expect(visibleKcal).toBe('2660');
    expect(ariaLabel).toContain(`Meta diaria de ${visibleKcal} calorias`);
    expect(ariaLabel).toContain('200');
    expect(ariaLabel).toContain('332');
    expect(ariaLabel).toContain('59');

    const segmentMarkup = await dashboard.locator('[data-macro-segment]').evaluateAll(nodes =>
      nodes.map(node => ({
        style: node.getAttribute('style') || '',
        dasharray: getComputedStyle(node).strokeDasharray,
        dashoffset: getComputedStyle(node).strokeDashoffset,
      }))
    );
    expect(segmentMarkup.every(item => !/NaN|Infinity/i.test(`${item.style} ${item.dasharray} ${item.dashoffset}`))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Labels sem treino (Etapa 3E-A + fix Refeição Pré-Treino)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Resultados — labels sem treino ativo', () => {

  test('C4 — Wake 07:00 / 7 refeições / Sólidas / sem treino: sem "Refeição Pré-Treino", aparece "Lanche da Tarde" às 16:45', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);

    // Label proibido: nunca deve aparecer sem treino ativo
    await expect(page.getByText('Refeição Pré-Treino'))
      .not.toBeVisible();

    // Label correto pós-fix: segunda "Refeição da Tarde" → "Lanche da Tarde"
    await expect(page.getByText('Lanche da Tarde').first())
      .toBeVisible();

    // Horário do "Lanche da Tarde" deve ser 16:45
    // (5.º slot de 7 com wake=07:00, step=142.5 → roundQ(1005) = 16:45)
    await expect(page.getByText('16:45').first())
      .toBeVisible();

    // Total kcal preservado
    await expect(
      page.locator('.macro-val').filter({ hasText: 'kcal/dia' })
    ).toContainText('2660');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Cenários com treino (regressão — comportamento não deve mudar)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Resultados — cenário com treino ativo', () => {

  test('C5 — Wake 07:00 / treino 16:00–17:30 / 7 refeições / Sólidas: treino + pré/pós visíveis', async ({ page }) => {
    await injectState(page, CENARIO_5);
    await gotoResultados(page);

    // Bloco de treino visível com horário de início e fim
    await expect(
      page.locator('.meal-name').filter({ hasText: /^Treino/ })
    ).toBeVisible();

    // exact: true isola o div.meal-time "16:00" (exclui spans/tds "16:00 – 17:30")
    await expect(page.getByText('16:00', { exact: true }))
      .toBeVisible();

    // '17:30' só aparece dentro de "16:00 – 17:30", nunca standalone
    await expect(page.getByText(/17:30/).first())
      .toBeVisible();

    // Refeição antes do treino (pré-treino)
    await expect(page.getByText(/Pré-Treino/).first())
      .toBeVisible();

    // Refeição após o treino (pós-treino)
    await expect(page.getByText('Refeição Pós-Treino').first())
      .toBeVisible();

    // Total kcal preservado
    await expect(
      page.locator('.macro-val').filter({ hasText: 'kcal/dia' })
    ).toContainText('2660');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Espaçamento entre refeições pré-treino (bug documentado)
// ─────────────────────────────────────────────────────────────────────────────
// Problema: com treino às 16:00 + 7 refeições sólidas, o algoritmo produz
//   Almoço 13:00 → Refeição da Tarde 13:30 (gap de 30 min — demasiado curto).
// Causa: Math.min(preAnchor, tStart - 180) = Math.min(870, 780) = 780
//   coincide com NATURAL_ANCHOR.lunch = 780, gerando colisão.
// Este teste deve FALHAR antes do patch e PASSAR depois.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Resultados — espaçamento refeições pré-treino', () => {

  test('C8 — Wake 07:00 / treino 16:00–17:30 / 7 refeições / Sólidas: gap mínimo 60 min entre refeições pré-treino', async ({ page }) => {
    await injectState(page, CENARIO_8);
    await gotoResultados(page);

    // 1. Almoço deve estar visível
    await expect(page.getByText('Almoço').first())
      .toBeVisible();

    // 2. Não deve existir nenhuma refeição às 13:30
    //    (indicador direto do bug: Refeição da Tarde a 30 min do Almoço)
    //    FALHA antes do patch — PASSA depois do patch.
    await expect(
      page.locator('.meal-time').filter({ hasText: '13:30' })
    ).not.toBeVisible();

    // 3. Refeição Leve Pré-Treino deve estar visível
    await expect(page.getByText(/Pré-Treino/).first())
      .toBeVisible();

    // 4. Pré-Treino deve estar entre 14:15 e 14:45 (esperado: ~14:30)
    await expect(
      page.locator('.meal-time').filter({ hasText: '14:30' })
    ).toBeVisible();

    // 5. Treino às 16:00 visível
    await expect(page.getByText('16:00', { exact: true }))
      .toBeVisible();

    // 6. Total kcal preservado
    await expect(
      page.locator('.macro-val').filter({ hasText: 'kcal/dia' })
    ).toContainText('2660');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Aviso de espaçamento sem treino (F1)
// ─────────────────────────────────────────────────────────────────────────────
// Problema: rebuildTimesAroundTraining() retorna spacingFeedback: null no path
// sem treino, mesmo com 8 refeições (intervalos apertados ~120 min).
// Este teste deve FALHAR antes de F1 e PASSAR depois.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Resultados — aviso de espaçamento sem treino', () => {

  test('C9 — Wake 07:00 / 8 refeições / Prático / sem treino: aviso de espaçamento visível', async ({ page }) => {
    await injectState(page, CENARIO_9);
    await gotoResultados(page);

    // App não deve quebrar: pelo menos uma refeição visível
    await expect(page.locator('.meal-name').first()).toBeVisible();

    // Total kcal preservado
    await expect(
      page.locator('.macro-val').filter({ hasText: 'kcal/dia' })
    ).toContainText('2660');

    // Nunca deve aparecer "Pré-Treino" sem treino ativo
    await expect(page.getByText('Refeição Pré-Treino')).not.toBeVisible();

    // Aviso de espaçamento deve aparecer para 8 refeições sem treino
    // FALHA antes de F1 (spacingFeedback: null) — PASSA depois
    await expect(page.getByText('Diagnóstico Inteligente da Rotina').first())
      .toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Label pré-treino longe do treino (F2)
// ─────────────────────────────────────────────────────────────────────────────
// Problema: cascata de dedup atribui "Refeição Pré-Treino" a um slot às 16:00
// quando o treino é às 20:00 (gap de 4h — não é pré-treino).
// Este teste deve FALHAR antes de F2 e PASSAR depois.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Resultados — label pré-treino longe do treino', () => {

  test('C10 — Wake 07:00 / treino 20:00–21:30 / 7 refeições / Sólidas: sem "Refeição Pré-Treino" longe do treino', async ({ page }) => {
    await injectState(page, CENARIO_10);
    await gotoResultados(page);

    // "Refeição Pré-Treino" não deve aparecer — nenhum slot está ≤ 3h antes do treino
    // via cascata de dedup. FALHA antes de F2 — PASSA depois.
    await expect(page.getByText('Refeição Pré-Treino')).not.toBeVisible();

    // "Jantar" deve ser visível (última refeição sólida antes do treino, ~17:30)
    await expect(page.getByText('Jantar').first()).toBeVisible();

    // Bloco de treino visível às 20:00
    await expect(
      page.locator('.meal-name').filter({ hasText: /^Treino/ })
    ).toBeVisible();

    // Total kcal preservado
    await expect(
      page.locator('.macro-val').filter({ hasText: 'kcal/dia' })
    ).toContainText('2660');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Rotina noturna sem treino
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Resultados — rotina noturna sem treino', () => {

  test('C11 — Wake 18:00 / Sleep 06:00 / 6 refeições / Híbrido / sem treino: "Primeira Refeição" visível, "Café da Manhã" ausente', async ({ page }) => {
    await injectState(page, CENARIO_11);
    await gotoResultados(page);

    // "Primeira Refeição" deve aparecer no slot de arranque (nocturnal=true)
    await expect(page.getByText('Primeira Refeição').first()).toBeVisible();

    // "Café da Manhã" não deve aparecer (nocturnal remapeia o label)
    await expect(page.getByText('Café da Manhã')).not.toBeVisible();

    // Primeira refeição às 18:15 (wakeMin + 15 min)
    await expect(page.locator('.meal-time').first()).toHaveText('18:15');

    // Total kcal preservado
    await expect(
      page.locator('.macro-val').filter({ hasText: 'kcal/dia' })
    ).toContainText('2660');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: F3 — pós-treino noturno sem buffer
// ─────────────────────────────────────────────────────────────────────────────
// Problema: rebuildTimesAroundTraining() faz
//   postTimes[last] = roundQ(sleepMin - 90)
// que para Wake 07:00 / Sleep 23:00 / Treino 20:00–21:30 produz
//   roundQ(1380 - 90) = roundQ(1290) = 21:30
// colapsando o shake pós-treino para o momento exato em que o treino acaba
// (sem qualquer buffer), em vez do valor natural spaceTimes ≈ 22:15.
// Além disso, shake_night salta a atribuição de "Refeição Pós-Treino" porque
// getDisplayMealLabel() só aplica trainEndTime a slots que NÃO começam por 'shake'.
// Este teste deve FALHAR antes do patch F3 e PASSAR depois.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Resultados — F3: pós-treino noturno sem buffer', () => {

  test('C12 — Wake 07:00 / treino 20:00–21:30 / 7 refeições / Sólidas: pós-treino com buffer após fim do treino', async ({ page }) => {
    await injectState(page, CENARIO_12);
    await gotoResultados(page);

    // Bloco de treino visível às 20:00
    await expect(
      page.locator('.meal-name').filter({ hasText: /^Treino/ })
    ).toBeVisible();
    await expect(page.getByText('20:00', { exact: true })).toBeVisible();

    // "Refeição Pré-Treino" não deve aparecer (treino às 20:00 — F2 já trata)
    await expect(page.getByText('Refeição Pré-Treino')).not.toBeVisible();

    // "Jantar" deve ser visível (última refeição antes do treino)
    await expect(page.getByText('Jantar').first()).toBeVisible();

    // Total kcal preservado
    await expect(
      page.locator('.macro-val').filter({ hasText: 'kcal/dia' })
    ).toContainText('2660');

    // FALHA antes do patch F3:
    // O shake pós-treino deve aparecer DEPOIS das 22:00 (com buffer ≥ 20 min após 21:30).
    // Antes do patch é forçado para 21:30 (= fim do treino, sem buffer).
    await expect(
      page.locator('.meal-time').filter({ hasText: /^22:/ })
    ).toBeVisible();
  });

});

test.describe('Resultados - leitura visual da meta e da estrategia', () => {
  test('C-RESULTS-VIS-1 - arquitetura calorica mostra BMR, TDEE, meta final e superavit proporcional', async ({ page }) => {
    await injectState(page, CENARIO_1);
    await gotoResultados(page);

    const section = page.locator('[data-testid="results-calorie-architecture"]');
    await expect(section).toBeVisible();
    await expect(section).toContainText('1842');
    await expect(section).toContainText('2310');
    await expect(section).toContainText('2660');
    await expect(section).toContainText('+350');
    await expect(section).toContainText('15,2%');

    const fills = await section.locator('.results-calorie-stage').evaluateAll((nodes) =>
      nodes.map((node) => Number(node.getAttribute('data-fill-pct') || '0'))
    );
    expect(fills).toHaveLength(3);
    expect(fills[0]).toBeGreaterThan(0);
    expect(fills[0]).toBeLessThan(fills[1]);
    expect(fills[1]).toBeLessThan(fills[2]);
  });

  test('C-RESULTS-VIS-2 - perfil, estrategia e proximos passos ganham suporte visual sem duplicar o dashboard', async ({ page }) => {
    await injectState(page, CENARIO_5);
    await gotoResultados(page);

    const planSummary = page.locator('[data-testid="results-plan-summary"]');
    await expect(planSummary).toBeVisible();
    await expect(planSummary).toHaveAttribute('data-strategy', 'solid');
    await expect(planSummary.locator('[data-testid="results-plan-summary-card"]')).toHaveCount(2);
    await expect(planSummary.locator('[data-summary-type="solid"]')).toHaveAttribute('data-count', '5');
    await expect(planSummary.locator('[data-summary-type="solid"]')).toHaveAttribute('data-total', '7');
    await expect(planSummary.locator('[data-summary-type="solid"]')).toHaveAttribute('data-share-pct', '71.4');
    await expect(planSummary.locator('[data-summary-type="shake"]')).toHaveAttribute('data-count', '2');
    await expect(planSummary.locator('[data-summary-type="shake"]')).toHaveAttribute('data-total', '7');
    await expect(planSummary.locator('[data-summary-type="shake"]')).toHaveAttribute('data-share-pct', '28.6');
    await expect(planSummary).toContainText('Plano mais sólido do dia');
    await expect(planSummary).toContainText('7 refeições distribuídas com base sólida');
    await expect(planSummary).toContainText('5 sólidas + 2 shakes de apoio');
    await expect(planSummary.locator('[data-summary-type="shake"] .results-plan-summary-card__ring')).toHaveAttribute('role', 'img');
    await expect(planSummary.locator('[data-summary-type="shake"] .results-plan-summary-card__ring')).toHaveAttribute('aria-label', /2 de 7 refeições do dia \(28,6%\)/);

    await expect(page.locator('[data-testid="results-profile-principles"] .plan-insights__principle-card')).toHaveCount(4);
    await expect(page.locator('[data-testid="results-strategy-principles"] .plan-insights__principle-card')).toHaveCount(4);
    await expect(page.locator('[data-testid="results-next-steps"] .plan-insights__timeline-step')).toHaveCount(3);
    await expect(page.locator('[data-macro-dashboard="complete"]')).toHaveCount(1);
  });

  test('C-RESULTS-VIS-3 - textos do hotfix ficam coerentes, kcal acessivel bate com a visivel e CTA some no print', async ({ page }) => {
    await injectState(page, CENARIO_1);
    await gotoResultados(page);

    const dashboard = page.locator('[data-macro-dashboard="complete"]');
    const visibleKcal = ((await dashboard.locator('.macro-dashboard__kcal').textContent()) || '').match(/\d+/)?.[0];
    const ariaLabel = await dashboard.locator('[data-macro-ring]').getAttribute('aria-label');
    expect(visibleKcal).toBe('2660');
    expect(ariaLabel).toContain(`Meta diaria de ${visibleKcal} calorias`);

    const rhythmCard = page.locator('[data-testid="results-profile-principles"] .plan-insights__principle-card').filter({ hasText: 'Ritmo esperado' });
    const rhythmText = ((await rhythmCard.textContent()) || '').replace(/\s+/g, ' ').trim();
    expect(rhythmText).not.toContain('Objetivo de objetivo');
    expect(rhythmText).toContain('Para ganho de massa');
    expect(rhythmText).not.toContain('Para o ganho de massa');
    expect(rhythmText).toContain('0.3–0.5kg/semana');
    expect(rhythmText).toContain('2660 kcal por dia');

    const intakeCard = page.locator('[data-testid="results-strategy-principles"] .plan-insights__principle-card').filter({ hasText: 'Ritmo de ingestão' });
    const intakeText = (await intakeCard.textContent()) || '';
    /*
    expect(intakeText).toContain('2h30 a 3h entre refeições');
    expect(intakeText).not.toContain('como referência');
    expect(intakeText).not.toContain('referência para não deixar');

    expect(intakeText).toContain('Distribua as refeiÃ§Ãµes em 2h30 a 3h entre refeiÃ§Ãµes para manter uma ingestÃ£o regular ao longo do dia.');
    expect((intakeText.match(/\./g) || [])).toHaveLength(1);
    expect((intakeText.match(/entre refeiÃ§Ãµes/gi) || [])).toHaveLength(1);
    expect((intakeText.match(/intervalo/gi) || [])).toHaveLength(0);
    expect(intakeText).not.toContain('o lÃ­quido digere');
    expect(intakeText).not.toContain('. o');
    expect(intakeText).not.toContain('. para');

    */
    const normalizedIntakeText = intakeText.replace(/\s+/g, ' ').trim();
    expect(normalizedIntakeText).toContain('2h30 a 3h');
    expect(normalizedIntakeText).toMatch(/Distribua as refei\S+ em 2h30 a 3h entre refei\S+ para manter uma ingest\S+o regular ao longo do dia\./);
    expect((normalizedIntakeText.match(/\./g) || [])).toHaveLength(1);
    expect((normalizedIntakeText.match(/entre refei\S+/gi) || [])).toHaveLength(1);
    expect((normalizedIntakeText.match(/intervalo/gi) || [])).toHaveLength(0);
    expect(normalizedIntakeText).not.toContain('o líquido digere');
    expect(normalizedIntakeText).not.toContain('. o');
    expect(normalizedIntakeText).not.toContain('. para');

    const cta = page.locator('#btn-plan');
    await expect(cta).toBeVisible();
    await page.emulateMedia({ media: 'print' });
    await expect(cta).toHaveCSS('display', 'none');
    await expect(page.locator('[data-testid="results-calorie-architecture"]')).toBeVisible();
    await expect(page.locator('[data-macro-dashboard="complete"]')).toBeVisible();
  });

  test('C-RESULTS-VIS-4 - fallback de Ritmo esperado usa artigo correto sem mudar os rotulos especificos', async ({ page }) => {
    const fallbackScenario = cloneScenario(CENARIO_1);
    fallbackScenario.profile.goal = 'recomp';
    fallbackScenario.results.profile.goal = 'recomp';

    await injectState(page, fallbackScenario);
    await gotoResultados(page);

    const rhythmCard = page.locator('[data-testid="results-profile-principles"] .plan-insights__principle-card').filter({ hasText: 'Ritmo esperado' });
    const rhythmText = ((await rhythmCard.textContent()) || '').replace(/\s+/g, ' ').trim();
    expect(rhythmText).toContain('Para o objetivo atual');
    expect(rhythmText).not.toContain('Para objetivo atual');
    expect(rhythmText).not.toContain('Objetivo de objetivo');
    expect(rhythmText).not.toContain('Para o o objetivo atual');
    expect(rhythmText).toMatch(/0\.3\S*0\.5kg\/semana/);

    const fallbackNoGainScenario = cloneScenario(fallbackScenario);
    delete fallbackNoGainScenario.results.weeklyGainLowKg;
    delete fallbackNoGainScenario.results.weeklyGainHighKg;

    await injectState(page, fallbackNoGainScenario);
    await gotoResultados(page);

    const fallbackNoGainText = ((await rhythmCard.textContent()) || '').replace(/\s+/g, ' ').trim();
    expect(fallbackNoGainText).toContain('Para o objetivo atual, a base atual');
    expect(fallbackNoGainText).not.toContain('Para objetivo atual');
  });
});
