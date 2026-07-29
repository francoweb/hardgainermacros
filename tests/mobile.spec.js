// @ts-check
'use strict';

/**
 * mobile.spec.js
 *
 * Testes de paridade mobile/desktop.
 *
 * A app é uma SPA que serve o mesmo JS para todos os dispositivos.
 * Apenas o CSS usa media queries para layout responsivo — nunca para
 * esconder/mostrar campos funcionais de forma diferente.
 *
 * Estes testes confirmam que o mobile tem exactamente as mesmas funções
 * que o desktop, apenas com layout responsivo.
 */

const { test, expect } = require('@playwright/test');
const { injectState, gotoResultados, gotoPlano } = require('./helpers/inject-state');
const { CENARIO_4, CENARIO_6 } = require('./fixtures/scenarios');

const MOBILE_390 = { width: 390, height: 844 };
const DESKTOP    = { width: 1440, height: 900 };

/** Navega para /perfil injectando estado mínimo */
async function gotoPerfil(page) {
  await injectState(page, CENARIO_4);
  await page.goto('/');
  await page.waitForLoadState('load');
  await page.evaluate(() => {
    history.pushState({}, '', '/perfil');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForSelector('[data-difficulty]', { timeout: 10_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Paridade Mobile/Desktop
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Paridade Mobile / Desktop', () => {

  // ── C-MOBILE-PARITY1 ─────────────────────────────────────────────────────
  test('C-MOBILE-PARITY1 — Desktop: "Tenho dificuldade em comer muito volume" não existe', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await gotoPerfil(page);
    const txt = (await page.locator('body').textContent()) || '';
    expect(txt).not.toMatch(/Tenho dificuldade em comer muito volume/i);
  });

  // ── C-MOBILE-PARITY2 ─────────────────────────────────────────────────────
  test('C-MOBILE-PARITY2 — Mobile 390px: "Tenho dificuldade em comer muito volume" não existe', async ({ page }) => {
    await page.setViewportSize(MOBILE_390);
    await gotoPerfil(page);
    const txt = (await page.locator('body').textContent()) || '';
    expect(txt).not.toMatch(/Tenho dificuldade em comer muito volume/i);
  });

  // ── C-MOBILE-PARITY3 ─────────────────────────────────────────────────────
  test('C-MOBILE-PARITY3 — Mobile e desktop têm as mesmas opções de dificuldade', async ({ page }) => {
    const EXPECTED_DIFFICULTIES = [
      'Hardgainer Clássico',
      'Apetite Muito Baixo',
      'Metabolismo Ultra Acelerado',
      'Dificuldade com Volume',
      'Rotina Muito Corrida',
      'Falta de Consistência',
    ];

    // Desktop
    await page.setViewportSize(DESKTOP);
    await gotoPerfil(page);
    const desktopTxt = (await page.locator('#g-difficulty').textContent()) || '';
    for (const d of EXPECTED_DIFFICULTIES) {
      expect(desktopTxt, `Desktop deve ter: ${d}`).toContain(d);
    }

    // Mobile
    await page.setViewportSize(MOBILE_390);
    await gotoPerfil(page);
    const mobileTxt = (await page.locator('#g-difficulty').textContent()) || '';
    for (const d of EXPECTED_DIFFICULTIES) {
      expect(mobileTxt, `Mobile deve ter: ${d}`).toContain(d);
    }

    // Ambos iguais
    expect(mobileTxt.trim()).toBe(desktopTxt.trim());
  });

  // ── C-MOBILE-PARITY4 ─────────────────────────────────────────────────────
  test('C-MOBILE-PARITY4 — Mobile não tem opções antigas removidas do desktop', async ({ page }) => {
    await page.setViewportSize(MOBILE_390);
    await gotoPerfil(page);
    const txt = (await page.locator('body').textContent()) || '';
    // Strings que não devem existir
    expect(txt).not.toMatch(/comer muito volume/i);
    expect(txt).not.toMatch(/muito volume/i);
    expect(txt).not.toMatch(/checkbox.*volume/i);
  });

  // ── C-MOBILE-PARITY5 ─────────────────────────────────────────────────────
  test('C-MOBILE-PARITY5 — Mobile não tem lógica própria divergente (sem JS mobile-only)', async ({ page }) => {
    // A app não tem user-agent/viewport detection no JS — mesma lógica em todos os tamanhos
    await page.setViewportSize(MOBILE_390);
    await gotoPerfil(page);
    // Verificar que os mesmos elementos interactivos existem
    const diffBtns = await page.locator('[data-difficulty]').count();
    expect(diffBtns, 'Deve ter 6 opções de dificuldade no mobile').toBe(6);
    const actBtns = await page.locator('[data-activity]').count();
    expect(actBtns, 'Deve ter 5 opções de atividade no mobile').toBe(5);
    const goalBtns = await page.locator('[data-goal]').count();
    expect(goalBtns, 'Deve ter 3 opções de objetivo no mobile').toBe(3);
  });

  // ── C-MOBILE-PARITY6 ─────────────────────────────────────────────────────
  test('C-MOBILE-PARITY6 — Fluxo completo mobile até Resultados funciona', async ({ page }) => {
    await page.setViewportSize(MOBILE_390);
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    // Página de resultados carrega
    await expect(page.locator('.meal-row').first()).toBeVisible();
    // Kcal aparece
    const txt = (await page.locator('body').textContent()) || '';
    expect(txt).toMatch(/kcal/i);
  });

  // ── C-MOBILE-PARITY7 ─────────────────────────────────────────────────────
  test('C-MOBILE-PARITY7 — Fluxo completo mobile até Plano de 14 Dias funciona', async ({ page }) => {
    await page.setViewportSize(MOBILE_390);
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    // Plano carrega com ingredientes
    await expect(page.locator('.ingredient-list').first()).toBeVisible();
    // Botão + Adicionar existe
    const addBtns = await page.locator('[data-add-food]').count();
    expect(addBtns).toBeGreaterThanOrEqual(1);
  });

  // ── C-MOBILE-PARITY8 ─────────────────────────────────────────────────────
  test('C-MOBILE-PARITY8 — Modal "+ Criar Alimento" no mobile: accordion e scroll', async ({ page }) => {
    await page.setViewportSize(MOBILE_390);
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');

    // Accordion dos opcionais existe e está fechado
    const block = page.locator('[data-testid="aff-optional-block"]');
    await expect(block).toBeVisible();
    const isOpen = await block.evaluate(el => el.open);
    expect(isOpen, 'Accordion de opcionais deve estar fechado por padrão').toBe(false);

    // Abrir e preencher campo opcional
    await page.locator('[data-testid="aff-optional-block"] summary').click();
    await page.locator('#aff-saturated').fill('3');

    // Simular wheel (no mobile = scroll touch, mas o campo type=text ignora)
    await page.locator('#aff-saturated').dispatchEvent('wheel', { deltaY: 100, bubbles: true });
    const val = await page.locator('#aff-saturated').inputValue();
    expect(val, `Campo deve manter "3" após wheel`).toBe('3');

    // Campos principais são type=text (sem scroll bug)
    const qtyType = await page.locator('#aff-qty').getAttribute('type');
    expect(qtyType).toBe('text');
    const kcalType = await page.locator('#aff-kcal').getAttribute('type');
    expect(kcalType).toBe('text');
  });

  // ── C-MOBILE-PARITY9 ─────────────────────────────────────────────────────
  test('C-MOBILE-PARITY9 — Imperial no mobile: Resultados em lb/ft-in, Plano em oz/fl oz', async ({ page }) => {
    await page.setViewportSize(MOBILE_390);

    const cenarioImp = {
      ...CENARIO_6,
      form: { ...CENARIO_6.form, unit: 'imperial', weight: '180', height: '70' },
      results: {
        ...CENARIO_6.results,
        weightKg: 81.6,
        heightCm: 177.8,
      },
    };

    await injectState(page, cenarioImp);
    await gotoResultados(page);

    // Perfil mostra lb
    const profileTxt = (await page.locator('body').textContent()) || '';
    expect(profileTxt).toMatch(/\d+ lb/);

    // Plano mostra oz
    await gotoPlano(page);
    const nativeQtys = await page.locator('#day-body-0 li:not(.ingredient-added) .ingredient-qty').evaluateAll(
      els => els.map(e => (e.textContent || '').trim())
    );
    const hasOz = nativeQtys.some(t => /\d+(\.\d+)?\s*(fl\s+)?oz/.test(t));
    expect(hasOz, `Plano mobile imperial deve mostrar oz/fl oz. Qtys: ${JSON.stringify(nativeQtys.slice(0, 6))}`).toBe(true);
  });

});

test.describe('Plano 14 Dias no mobile - imagens dos alimentos', () => {
  test('C-MOBILE-FOOD-IMG-1 - Mobile 390px mostra miniaturas sem overflow horizontal', async ({ page }) => {
    await page.setViewportSize(MOBILE_390);
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    await expect(page.locator('#day-body-0 .ingredient [data-food-image]').first()).toBeVisible();
    await expect(page.locator('#day-body-0 .ingredient [data-swap]').first()).toBeVisible();

    const scrollW = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollW, 'Mobile 390px deve continuar sem overflow com miniaturas de ingredientes').toBeLessThanOrEqual(395);
  });

  test('C-MOBILE-MODAL-IMG-1 - Mobile 390px em modo escuro mostra imagens nos modais sem overflow', async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await gotoPlanoMobile(page);
    await page.locator('#header-theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('[data-testid="sub-current-visual"] [data-food-image]')).toBeVisible();
    let scrollW = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollW).toBeLessThanOrEqual(395);
    await page.locator('[data-modal-close]').first().click();

    await page.locator('[data-add-library]').first().click();
    await expect(page.locator('.lib-food-item [data-food-image]').first()).toBeVisible();
    scrollW = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollW).toBeLessThanOrEqual(395);
    await page.locator('[data-modal-close]').first().click();

    await page.locator('[data-use-recipe]').first().click();
    await expect(page.locator('.recipe-modal-item [data-food-image]').first()).toBeVisible();
    await page.locator('.recipe-modal-item').first().click();
    await expect(page.locator('[data-testid="recipe-preview-visual"] [data-food-image]').first()).toBeVisible();

    scrollW = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollW).toBeLessThanOrEqual(395);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('C-MOBILE-MODAL-SEARCH-1 - Mobile 390px mostra pesquisa sticky nos três modais sem overflow', async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await gotoPlanoMobile(page);
    await page.locator('#header-theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('#sub-modal-search')).toBeVisible();
    await page.locator('#sub-modal-search').fill('atum');
    expect(await page.locator('.sub-option:visible').count()).toBeGreaterThan(0);
    let scrollW = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollW).toBeLessThanOrEqual(395);
    await page.locator('[data-modal-close]').first().click();

    await page.locator('[data-add-library]').first().click();
    await expect(page.locator('#add-library-search')).toBeVisible();
    await page.locator('#add-library-search').fill('mamao');
    const mobileFilteredNames = await page.locator('.lib-food-item').evaluateAll(els =>
      els.filter(el => !el.hidden).map(el => el.querySelector('.lib-food-name')?.textContent?.trim() || '')
    );
    expect(mobileFilteredNames).toContain('Mamão');
    scrollW = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollW).toBeLessThanOrEqual(395);
    await page.locator('[data-modal-close]').first().click();

    await page.locator('[data-use-recipe]').first().click();
    await expect(page.locator('#recipe-modal-search')).toBeVisible();
    await page.locator('#recipe-modal-search').fill('frango');
    expect(await page.locator('.recipe-modal-item:visible').count()).toBeGreaterThan(0);
    scrollW = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollW).toBeLessThanOrEqual(395);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});

test('C-MOBILE-MODAL-SEARCH-2 - Mobile 390px filtra frango sem mostrar ovo nem criar overflow', async ({ page }) => {
  await gotoPlanoMobile(page);

  await page.locator('[data-add-library]').first().click();
  const search = page.locator('#add-library-search');
  await expect(search).toBeVisible();
  await expect(page.locator('[data-modal-search-clear]')).toHaveCount(1);

  await search.fill('frango');
  const mobileFilteredNames = await page.locator('.lib-food-item:visible .lib-food-name').allTextContents();
  expect(mobileFilteredNames.some(name => /frango/i.test(name))).toBe(true);
  expect(mobileFilteredNames).not.toContain('Ovo inteiro');
  expect(mobileFilteredNames).not.toContain('Clara de ovo');

  const scrollW = await page.evaluate(() => document.body.scrollWidth);
  expect(scrollW).toBeLessThanOrEqual(395);
});

test.describe('Plano 14 Dias no mobile - imagem da refeicao', () => {
  test('C-MOBILE-MEAL-IMG-1 - Mobile 390px mostra imagem sem overflow no card', async ({ page }) => {
    await page.setViewportSize(MOBILE_390);
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    const firstMeal = page.locator('#day-body-0 .meal-card').first();
    await expect(firstMeal.locator('.meal-card-visual')).toBeVisible();
    await expect(firstMeal.locator('[data-meal-image]')).toBeVisible();

    const scrollW = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollW, 'Mobile 390px deve continuar sem overflow com imagem no card').toBeLessThanOrEqual(395);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: UX Mobile — Plano Alimentar 14 Dias
// ─────────────────────────────────────────────────────────────────────────────

const { CENARIO_4: C4, CENARIO_6: C6 } = require('./fixtures/scenarios');

/** Abre o plano em mobile e retorna a page */
async function gotoPlanoMobile(page, cenario = C6, viewport = { width: 390, height: 844 }) {
  await page.setViewportSize(viewport);
  await injectState(page, cenario);
  await gotoResultados(page);
  await gotoPlano(page);
}

test.describe('UX Mobile — Plano Alimentar 14 Dias', () => {

  // ── C-MOBILE-PLAN-UX1 ────────────────────────────────────────────────────
  test('C-MOBILE-PLAN-UX1 — Desktop 1440px: página permanece visualmente intacta', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await injectState(page, C6);
    await gotoResultados(page);
    await gotoPlano(page);

    // Elementos principais ainda visíveis no desktop
    await expect(page.locator('.plan-toolbar')).toBeVisible();
    await expect(page.locator('.plan-hero')).toBeVisible();
    await expect(page.locator('.ingredient-list').first()).toBeVisible();
    // Prep section: no desktop o summary é visível (accordion igual ao mobile)
    // e a preparação começa fechada por padrão
    const prepDetails = page.locator('.prep-details').first();
    if (await prepDetails.count() > 0) {
      await expect(prepDetails.locator('summary'), 'Desktop: summary do prep deve estar visível').toBeVisible();
      const isOpen = await prepDetails.evaluate(el => el.open);
      expect(isOpen, 'Desktop: prep deve começar fechado').toBe(false);
    }
  });

  // ── C-MOBILE-PLAN-UX2 ────────────────────────────────────────────────────
  test('C-MOBILE-PLAN-UX2 — Mobile 390px: sem overflow horizontal', async ({ page }) => {
    await gotoPlanoMobile(page);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth, `Overflow horizontal: body=${bodyWidth}px, viewport=${viewWidth}px`).toBeLessThanOrEqual(viewWidth + 2);
  });

  // ── C-MOBILE-PLAN-UX3 ────────────────────────────────────────────────────
  test('C-MOBILE-PLAN-UX3 — Mobile 390px: hero compacto visível', async ({ page }) => {
    await gotoPlanoMobile(page);
    await expect(page.locator('.plan-hero')).toBeVisible();
    const heroBox = await page.locator('.plan-hero').boundingBox();
    // O hero não deve ocupar mais de 65% do viewport height (844px)
    expect(heroBox?.height, 'Hero muito alto no mobile').toBeLessThan(560);
    // kcal visível no hero
    const heroTxt = (await page.locator('.plan-hero').textContent()) || '';
    expect(heroTxt).toMatch(/kcal/i);
  });

  // ── C-MOBILE-PLAN-UX4 ────────────────────────────────────────────────────
  test('C-MOBILE-PLAN-UX4 — Mobile 390px: navegação por dias funciona', async ({ page }) => {
    await gotoPlanoMobile(page);
    // Pelo menos 2 botões de dia visíveis
    const dayHeads = await page.locator('[data-day-head]').count();
    expect(dayHeads, 'Deve ter 14 cabeçalhos de dias').toBe(14);
    // Clicar no Dia 2 abre-o
    await page.locator('[data-day-head="1"]').click();
    const day2Body = page.locator('#day-body-1');
    await expect(day2Body).toBeVisible();
  });

  // ── C-MOBILE-PLAN-UX5 ────────────────────────────────────────────────────
  test('C-MOBILE-PLAN-UX5 — Mobile 390px: apenas um dia aberto por vez', async ({ page }) => {
    await gotoPlanoMobile(page);
    // Dia 1 começa aberto
    await expect(page.locator('#day-body-0')).toBeVisible();
    // Clicar no Dia 2
    await page.locator('[data-day-head="1"]').click();
    await expect(page.locator('#day-body-1')).toBeVisible();
    // Dia 1 deve ter fechado
    const day1Visible = await page.locator('#day-body-0').isVisible();
    expect(day1Visible, 'Dia 1 deve fechar quando Dia 2 é aberto').toBe(false);
  });

  // ── C-MOBILE-PLAN-UX6 ────────────────────────────────────────────────────
  test('C-MOBILE-PLAN-UX6 — Mobile 390px: refeição mostra horário, nome, kcal, P/C/G, tipo', async ({ page }) => {
    await gotoPlanoMobile(page);
    const firstMeal = page.locator('.meal-card').first();
    await expect(firstMeal).toBeVisible();
    const mealTxt = (await firstMeal.textContent()) || '';
    expect(mealTxt).toMatch(/\d+:\d+/);         // horário
    expect(mealTxt).toMatch(/kcal/i);           // kcal
    expect(mealTxt).toMatch(/P:?\s*\d/);        // proteína
    expect(mealTxt).toMatch(/C:?\s*\d/);        // carbs
    expect(mealTxt).toMatch(/G:?\s*\d/);        // gorduras
    expect(mealTxt).toMatch(/sólida|shake/i);   // tipo
  });

  // ── C-MOBILE-PLAN-UX7 ────────────────────────────────────────────────────
  test('C-MOBILE-PLAN-UX7 — Mobile 390px: preparação em accordion (fechado por padrão)', async ({ page }) => {
    await gotoPlanoMobile(page);
    // Localizar um .prep-details no Dia 1
    const prepDetails = page.locator('#day-body-0 .prep-details').first();
    if (await prepDetails.count() === 0) {
      // Algumas refeições podem não ter passos de preparo — aceitar
      return;
    }
    // Summary visível no mobile
    await expect(prepDetails.locator('summary.prep-summary')).toBeVisible();

    // Accordion começa FECHADO por padrão (sem open attr)
    const isOpen = await prepDetails.evaluate(el => el.open);
    expect(isOpen, 'Prep deve estar fechado por padrão').toBe(false);

    // Clicar abre
    await prepDetails.locator('summary').click();
    const isOpenAfter = await prepDetails.evaluate(el => el.open);
    expect(isOpenAfter, 'Prep deve abrir após click').toBe(true);
    await expect(prepDetails.locator('.prep-section')).toBeVisible();

    // Clicar de novo fecha
    await prepDetails.locator('summary').click();
    const isOpenAgain = await prepDetails.evaluate(el => el.open);
    expect(isOpenAgain, 'Prep deve fechar após segundo click').toBe(false);
  });

  // ── C-MOBILE-PLAN-UX8 ────────────────────────────────────────────────────
  test('C-MOBILE-PLAN-UX8 — Mobile 390px: Substituir abre modal', async ({ page }) => {
    await gotoPlanoMobile(page);
    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();
    await page.locator('.modal-close').first().click();
  });

  // ── C-MOBILE-PLAN-UX9 ────────────────────────────────────────────────────
  test('C-MOBILE-PLAN-UX9 — Mobile 390px: + Criar Alimento funciona', async ({ page }) => {
    await gotoPlanoMobile(page, C4);
    await page.locator('[data-add-food]').first().click();
    await expect(page.locator('#add-food-form')).toBeVisible();
    await page.locator('.modal-close').first().click();
  });

  // ── C-MOBILE-PLAN-UX10 ───────────────────────────────────────────────────
  test('C-MOBILE-PLAN-UX10 — Mobile 390px: Editar/Remover alimento adicionado funciona', async ({ page }) => {
    await gotoPlanoMobile(page, C4);
    // Adicionar alimento
    await page.locator('[data-add-food]').first().click();
    await page.locator('#aff-name').fill('Teste Mobile Edit');
    await page.locator('#aff-category').selectOption('protein');
    await page.locator('#aff-qty').fill('100');
    await page.locator('#aff-kcal').fill('120');
    await page.locator('#aff-prot').fill('20');
    await page.locator('#aff-carb').fill('5');
    await page.locator('#aff-fat').fill('2');
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();
    // Editar
    await page.locator('[data-edit-addition]').first().click();
    await expect(page.locator('#edit-food-form')).toBeVisible();
    await page.locator('.modal-close').first().click();
    // Remover
    await page.locator('[data-remove-addition]').first().click();
    const count = await page.locator('.ing-badge-added').count();
    expect(count).toBe(0);
  });

  // ── C-MOBILE-PLAN-UX11 ───────────────────────────────────────────────────
  test('C-MOBILE-PLAN-UX11 — Mobile 390px: accordion de fatos nutricionais fechado por padrão', async ({ page }) => {
    await gotoPlanoMobile(page, C4);
    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await page.locator('#aff-name').fill('Nutri Mobile');
    await page.locator('#aff-category').selectOption('protein');
    await page.locator('#aff-qty').fill('100');
    await page.locator('#aff-kcal').fill('100');
    await page.locator('#aff-prot').fill('20');
    await page.locator('#aff-carb').fill('0');
    await page.locator('#aff-fat').fill('2');
    await page.locator('[data-testid="aff-optional-block"] summary').click();
    await page.locator('#aff-saturated').fill('2');
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();
    // Accordion fechado por padrão
    const acc = page.locator('[data-testid="ing-nutri-details"]').first();
    await expect(acc).toBeVisible();
    const isOpen = await acc.evaluate(el => el.open);
    expect(isOpen, 'Accordion nutri deve estar fechado').toBe(false);
  });

  // ── C-MOBILE-PLAN-UX12 ───────────────────────────────────────────────────
  test('C-MOBILE-PLAN-UX12 — Mobile 390px: scroll não altera campos numéricos', async ({ page }) => {
    await gotoPlanoMobile(page, C4);
    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await page.locator('#aff-qty').fill('150');
    await page.locator('#aff-qty').dispatchEvent('wheel', { deltaY: 100, bubbles: true });
    const val = await page.locator('#aff-qty').inputValue();
    expect(val, 'Campo qty não deve mudar com wheel').toBe('150');
    const qtyType = await page.locator('#aff-qty').getAttribute('type');
    expect(qtyType).toBe('text');
  });

  // ── C-MOBILE-PLAN-UX13 ───────────────────────────────────────────────────
  test('C-MOBILE-PLAN-UX13 — Mobile 390px imperial: oz/fl oz corretos', async ({ page }) => {
    const cenarioImp = { ...C6, form: { ...C6.form, unit: 'imperial', weight: '180', height: '70' },
      results: { ...C6.results, weightKg: 81.6, heightCm: 177.8 } };
    await gotoPlanoMobile(page, cenarioImp);
    const qtys = await page.locator('#day-body-0 li:not(.ingredient-added) .ingredient-qty').evaluateAll(
      els => els.map(e => (e.textContent || '').trim())
    );
    const hasOz = qtys.some(t => /\d+(\.\d+)?\s*(fl\s+)?oz/.test(t));
    expect(hasOz, `Mobile imperial deve mostrar oz. Qtys: ${JSON.stringify(qtys.slice(0,6))}`).toBe(true);
  });

  // ── C-MOBILE-PLAN-UX14 ───────────────────────────────────────────────────
  test('C-MOBILE-PLAN-UX14 — Mobile 390px: PDF por dia funciona', async ({ page }) => {
    await gotoPlanoMobile(page);
    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('[data-pdf-day="0"]').first().click();
    await page.waitForSelector('#day-pdf-print-area', { state: 'attached', timeout: 5000 });
    const qtys = await page.locator('#day-pdf-print-area .ing-qty').count();
    expect(qtys, 'PDF dia deve ter ingredientes').toBeGreaterThan(0);
    // Prep sempre visível no PDF (buildMealHtml não usa <details>)
    const prepVisible = await page.locator('#day-pdf-print-area .prep-list').count();
    expect(prepVisible, 'Prep deve aparecer no PDF').toBeGreaterThan(0);
  });

  // ── C-MOBILE-PLAN-UX15 ───────────────────────────────────────────────────
  test('C-MOBILE-PLAN-UX15 — Mobile 390px: kcal/macros/totais inalterados', async ({ page }) => {
    // Comparar totais do Dia 1 entre mobile e desktop — devem ser iguais
    await injectState(page, C6);
    await page.setViewportSize(DESKTOP);
    await gotoResultados(page);
    await gotoPlano(page);
    const desktopTotal = (await page.locator('[data-day-head="0"] .day-summary').textContent() || '').replace(/\s+/g, ' ').trim();

    await page.evaluate(() => { try { sessionStorage.clear(); localStorage.clear(); } catch {} });
    await injectState(page, C6);
    await page.setViewportSize(MOBILE_390);
    await gotoResultados(page);
    await gotoPlano(page);
    const mobileTotal = (await page.locator('[data-day-head="0"] .day-summary').textContent() || '').replace(/\s+/g, ' ').trim();

    expect(mobileTotal, 'Totais mobile vs desktop devem ser iguais').toBe(desktopTotal);
  });

});

test.describe('Plano 14 Dias no mobile - tema e espacamento visual', () => {
  test('C-MOBILE-THEME-1 - botao de tema visivel em 390px alterna e nao cria pageerror', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await gotoPlanoMobile(page);

    const themeBtn = page.locator('#header-theme-toggle');
    await expect(themeBtn).toBeVisible();
    await expect(themeBtn).toHaveAttribute('aria-label', /modo escuro/i);

    await themeBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(themeBtn).toHaveAttribute('aria-label', /modo claro/i);

    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollW).toBeLessThanOrEqual(390);
    expect(pageErrors).toEqual([]);
  });

  test('C-MOBILE-THEME-2 - persistencia do tema, macros com espacamento e imagens visiveis em 390px', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await gotoPlanoMobile(page);

    await page.locator('#header-theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.goto('/');
    await page.waitForLoadState('load');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await gotoResultados(page);
    await gotoPlano(page);
    await expect(page.locator('#header-theme-toggle')).toHaveAttribute('aria-label', /modo claro/i);
    await expect(page.locator('#day-body-0 .meal-card').first().locator('[data-meal-image]')).toBeVisible();
    await expect(page.locator('#day-body-0 .ingredient [data-food-image]').first()).toBeVisible();

    const totals = page.locator('#day-body-0 .meal-card .meal-totals').first();
    const layout = await totals.evaluate(el => {
      const cs = getComputedStyle(el);
      const first = el.querySelector('.meal-total');
      const last = el.querySelector('.meal-total:last-child');
      const rect = el.getBoundingClientRect();
      const firstRect = first.getBoundingClientRect();
      const lastRect = last.getBoundingClientRect();
      return {
        paddingLeft: cs.paddingLeft,
        paddingRight: cs.paddingRight,
        gap: cs.gap,
        offsetLeft: Math.round(firstRect.left - rect.left),
        offsetRight: Math.round(rect.right - lastRect.right),
        bodyWidth: document.documentElement.scrollWidth,
      };
    });

    expect(layout.paddingLeft).toBe('12px');
    expect(layout.paddingRight).toBe('12px');
    expect(layout.gap).toBe('8px 10px');
    expect(layout.offsetLeft).toBeGreaterThanOrEqual(12);
    expect(layout.offsetRight).toBeGreaterThanOrEqual(12);
    expect(layout.bodyWidth).toBeLessThanOrEqual(390);
    expect(pageErrors).toEqual([]);
  });

  test('C-MOBILE-THEME-3 - home em modo escuro mantém contraste legivel dos controlos em 390px', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize(MOBILE_390);
    await page.addInitScript(() => {
      localStorage.setItem('hg:cookies', JSON.stringify('accepted'));
      localStorage.setItem('hg:theme', JSON.stringify('dark'));
    });

    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForSelector('[data-unit="metric"]');
    await page.waitForSelector('[data-sex="male"]');

    await page.locator('[data-sex="female"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#header-theme-toggle')).toBeVisible();

    const styles = await page.evaluate(() => {
      const metric = document.querySelector('[data-unit="metric"]');
      const female = document.querySelector('[data-sex="female"]');
      const metricCs = getComputedStyle(metric);
      const femaleCs = getComputedStyle(female);
      return {
        metric: { bg: metricCs.backgroundColor, color: metricCs.color },
        female: { bg: femaleCs.backgroundColor, color: femaleCs.color, border: femaleCs.borderColor },
        bodyWidth: document.documentElement.scrollWidth,
      };
    });

    expect(styles.metric.bg).not.toBe('rgb(255, 255, 255)');
    expect(styles.metric.color).not.toBe(styles.metric.bg);
    expect(styles.female.bg).not.toBe('rgb(255, 255, 255)');
    expect(styles.female.color).not.toBe(styles.female.bg);
    expect(styles.female.border).not.toBe('rgb(255, 255, 255)');
    expect(styles.bodyWidth).toBeLessThanOrEqual(390);
    expect(pageErrors).toEqual([]);
  });
});
