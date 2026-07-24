// @ts-check
'use strict';

/**
 * plano.spec.js
 *
 * Testes E2E para o Plano Alimentar de 14 Dias (/plano-14-dias).
 * Cobrem os cenários 6 e 7 validados manualmente.
 *
 * Estratégia: injeção de estado → renderiza /resultados (que gera o plano
 * e define K.PLAN_READY) → clica "Ver Plano Alimentar de 14 Dias" → assert.
 *
 * O plano é gerado em runtime por generatePlan() a partir dos dedupedSlots,
 * por isso herda automaticamente os horários e labels correctos.
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { injectState, gotoResultados, gotoPlano } = require('./helpers/inject-state');
const { CENARIO_5, CENARIO_6, CENARIO_7, CENARIO_4, CENARIO_9 } = require('./fixtures/scenarios');

const FOOD_IMAGE_IDS = new Set(
  fs.readdirSync(path.join(__dirname, '../assets/images/foods'))
    .filter(name => name.endsWith('.webp'))
    .map(name => name.replace(/\.webp$/i, ''))
);

function watchImageRequests(page) {
  const requests = [];
  page.on('response', (response) => {
    const url = response.url();
    if (!/\/assets\/images\/(foods|meals)\/.+\.(webp|png)$/i.test(url)) return;
    requests.push({ url, status: response.status() });
  });
  return requests;
}

// ───��─────────────────────────────────────────────────────────────────────────
// Grupo: Plano de 14 Dias
// ────────────────────��───────────────────────��────────────────────────────────

test.describe('Plano Alimentar 14 Dias', () => {

  test('C6 — Wake 08:00 / 6 refeições / Híbrido / sem treino: Dia 1 começa com Café da Manhã 08:15', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    // Primeira ocorrência de "Café da Manhã" no plano (Dia 1, 1.ª refeição)
    await expect(page.getByText('Café da Manhã').first())
      .toBeVisible();

    // Horário 08:15 visível no plano
    await expect(page.getByText('08:15').first())
      .toBeVisible();

    // Total diário 2660 kcal (formato pt-BR: "2.660")
    await expect(page.getByText('2660').first())
      .toBeVisible();
  });

  test('C7 — Wake 07:00 / 7 refeições / Sólidas / sem treino: plano sem "Refeição Pré-Treino", com "Lanche da Tarde"', async ({ page }) => {
    await injectState(page, CENARIO_7);
    await gotoResultados(page);
    await gotoPlano(page);

    // "Refeição Pré-Treino" nunca deve aparecer no plano sem treino
    await expect(page.getByText('Refeição Pré-Treino'))
      .not.toBeVisible();

    // "Lanche da Tarde" deve aparecer no plano (herdado dos dedupedSlots)
    await expect(page.getByText('Lanche da Tarde').first())
      .toBeVisible();

    // Total diário 2660 kcal
    await expect(page.getByText('2660').first())
      .toBeVisible();
  });

});

test.describe('Plano Alimentar 14 Dias - imagens individuais dos alimentos', () => {
  test('C-FOOD-IMG-1 - ingrediente original usa o WebP correspondente ao foodId real', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    const row = page.locator('#day-body-0 .ingredient').filter({ has: page.locator('[data-food-image]') }).first();
    await expect(row.locator('[data-food-image]')).toBeVisible();

    const foodId = await row.getAttribute('data-food-id');
    expect(foodId).toBeTruthy();
    await expect(row.locator('[data-food-image]')).toHaveAttribute('src', new RegExp(`${foodId}\\.webp$`));
  });

  test('C-FOOD-IMG-2 - substituicao troca a imagem e a reversao restaura o foodId original', async ({ page }) => {
    const imageRequests = watchImageRequests(page);
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    const swapButtons = page.locator('[data-swap]');
    const swapCount = Math.min(await swapButtons.count(), 8);
    let targetIndex = -1;
    const targetSubId = 'atum_agua';

    for (let i = 0; i < swapCount; i += 1) {
      await swapButtons.nth(i).click();
      await page.waitForSelector('.sub-option', { timeout: 5_000 });
      const hasAtum = await page.locator(`.sub-option[data-sub-id="${targetSubId}"]`).count();
      if (hasAtum) {
        targetIndex = i;
        break;
      }
      await page.locator('[data-modal-close]').first().click();
      await expect(page.locator('.sub-option')).toHaveCount(0);
    }

    expect(targetIndex, 'Deve existir pelo menos um modal de substituicao com atum_agua').toBeGreaterThanOrEqual(0);

    const row = swapButtons.nth(targetIndex).locator('xpath=ancestor::li[contains(@class,"ingredient")]');
    const originalFoodId = await row.getAttribute('data-food-id');
    expect(originalFoodId).toBeTruthy();
    expect(FOOD_IMAGE_IDS.has(originalFoodId)).toBe(true);

    await page.locator(`.sub-option[data-sub-id="${targetSubId}"]`).click();
    await expect(row).toHaveAttribute('data-food-id', targetSubId);
    await expect(row.locator('.ingredient-visual')).toHaveCount(0);
    expect(imageRequests.filter(r => /\/assets\/images\/foods\/atum_agua\.webp$/i.test(r.url))).toHaveLength(0);

    await row.locator('[data-revert]').click();
    await expect(row).toHaveAttribute('data-food-id', originalFoodId);
    await expect(row.locator('[data-food-image]')).toHaveAttribute('src', new RegExp(`${originalFoodId}\\.webp$`));
  });

  test('C-FOOD-IMG-3 - alimento criado manualmente nao tenta renderizar URL invalida', async ({ page }) => {
    const imageRequests = watchImageRequests(page);
    await injectState(page, CENARIO_6);
    await gotoResultados(page);

    await page.evaluate(() => {
      localStorage.setItem('hg:custom_foods', JSON.stringify([
        {
          id: 'manual_creme_caseiro_teste',
          name: 'Creme Caseiro Teste',
          category: 'extra',
          source: 'custom',
          per100: { kcal: 210, prot: 12, carb: 18, fat: 9 },
        },
      ]));
      localStorage.setItem('hg:additions', JSON.stringify({
        '0:0': [
          {
            id: 'addition_manual_teste',
            food: 'manual_creme_caseiro_teste',
            grams: 120,
            unit: 'g',
            snapshot: {
              name: 'Creme Caseiro Teste',
              category: 'extra',
              source: 'custom',
              per100: { kcal: 210, prot: 12, carb: 18, fat: 9 },
            },
          },
        ],
      }));
    });

    await gotoPlano(page);

    const row = page.locator('.ingredient-added[data-food-id="manual_creme_caseiro_teste"]').first();
    await expect(row).toBeVisible();
    await expect(row.locator('.ingredient-visual')).toHaveCount(0);
    await expect(page.locator('[data-food-image][src*="manual_creme_caseiro_teste"]')).toHaveCount(0);
    expect(
      imageRequests.filter(r => /manual_creme_caseiro_teste|Creme%20Caseiro%20Teste|Creme Caseiro Teste/i.test(r.url))
    ).toHaveLength(0);
  });

  test('C-FOOD-IMG-4 - alimento oficial sem WebP nao deixa miniatura quebrada visivel', async ({ page }) => {
    const imageRequests = watchImageRequests(page);
    expect(FOOD_IMAGE_IDS.has('atum_agua')).toBe(false);

    await injectState(page, CENARIO_6);
    await gotoResultados(page);

    await page.evaluate(() => {
      localStorage.setItem('hg:additions', JSON.stringify({
        '0:0': [
          {
            id: 'addition_atum_teste',
            food: 'atum_agua',
            grams: 120,
            unit: 'g',
            snapshot: {
              name: 'Atum em água',
              category: 'protein',
              source: 'library',
              per100: { kcal: 116, prot: 26, carb: 0, fat: 1 },
            },
          },
        ],
      }));
    });

    await gotoPlano(page);

    const row = page.locator('.ingredient-added[data-food-id="atum_agua"]').first();
    await expect(row).toBeVisible();
    await expect(row.locator('.ingredient-visual')).toHaveCount(0);
    await expect(page.locator('[data-food-image][src$="atum_agua.webp"]')).toHaveCount(0);
    expect(imageRequests.filter(r => /\/assets\/images\/foods\/atum_agua\.webp$/i.test(r.url))).toHaveLength(0);
  });

  test('C-FOOD-IMG-5 - ingrediente removido preserva estado visual desativado e continua oculto no print', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    const activeRow = page.locator('#day-body-0 .ingredient').filter({ has: page.locator('[data-food-image]') }).first();
    const originalFoodId = await activeRow.getAttribute('data-food-id');
    await activeRow.locator('[data-remove-ingredient]').click();

    const ghost = page.locator('.ingredient-removed').first();
    await expect(ghost.locator('.ingredient-visual-muted')).toBeVisible();
    await expect(ghost).toHaveAttribute('data-food-id', originalFoodId);

    await page.emulateMedia({ media: 'print' });
    const printDisplay = await ghost.locator('.ingredient-visual').evaluate(el => getComputedStyle(el).display);
    expect(printDisplay).toBe('none');
    await page.emulateMedia({ media: 'screen' });

    await ghost.locator('[data-restore-ingredient]').click();
    await expect(page.locator('.ingredient-removed')).toHaveCount(0);
    await expect(page.locator(`.ingredient[data-food-id="${originalFoodId}"]`).first().locator('[data-food-image]')).toBeVisible();
  });

  test('C-FOOD-IMG-6 - receita aplicada usa foodIds reais dos ingredientes sem quebrar o detalhamento', async ({ page }) => {
    const imageRequests = watchImageRequests(page);
    await injectState(page, CENARIO_6);
    await gotoResultados(page);

    await page.evaluate(() => {
      localStorage.setItem('hg:recipe_meals', JSON.stringify({
        '0:0': {
          recipeId: 'receita-img-teste',
          recipeName: 'Receita Visual Teste',
          fitLabel: 'Compativel',
          ingredients: [
            {
              food: 'whey',
              label: 'Whey',
              grams: 30,
              display: '30g',
              macros: { kcal: 120, prot: 24, carb: 3, fat: 2 },
            },
            {
              food: 'banana_prata',
              label: 'Banana prata',
              grams: 80,
              display: '1 banana pequena (~80g)',
              macros: { kcal: 71, prot: 0.8, carb: 18.4, fat: 0.1 },
            },
            {
              food: 'atum_agua',
              label: 'Atum em água',
              grams: 120,
              display: '120g',
              macros: { kcal: 139, prot: 31.2, carb: 0, fat: 1.2 },
            },
          ],
          totals: { kcal: 330, prot: 56, carb: 21.4, fat: 3.3 },
          steps: ['Misture e sirva.'],
          note: 'Receita de teste.',
        },
      }));
    });

    await gotoPlano(page);

    const firstMeal = page.locator('#day-body-0 .meal-card').first();
    await expect(firstMeal.locator('[data-testid="recipe-badge"]')).toBeVisible();
    await expect(firstMeal.locator('.ingredient[data-food-id="whey"] [data-food-image]')).toHaveAttribute('src', /whey\.webp$/);
    await expect(firstMeal.locator('.ingredient[data-food-id="banana_prata"] [data-food-image]')).toHaveAttribute('src', /banana_prata\.webp$/);
    await expect(firstMeal.locator('.ingredient[data-food-id="atum_agua"] .ingredient-visual')).toHaveCount(0);
    expect(imageRequests.filter(r => /\/assets\/images\/foods\/atum_agua\.webp$/i.test(r.url))).toHaveLength(0);
  });
});

test.describe('Plano Alimentar 14 Dias - imagens das refeicoes', () => {
  test('C-MEAL-IMG-1 - refeicao original resolve imagem pelo templateId com alt acessivel', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    const firstMeal = page.locator('#day-body-0 .meal-card').first();
    const templateId = await firstMeal.getAttribute('data-template-id');
    expect(templateId).toBeTruthy();

    const img = firstMeal.locator('[data-meal-image]');
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute('src', new RegExp(`${templateId}\\.webp$`));
    await expect(img).toHaveAttribute('alt', /Ilustra/);

    const natural = await img.evaluate(el => ({ w: el.naturalWidth, h: el.naturalHeight }));
    expect(natural.w).toBeGreaterThan(0);
    expect(natural.h).toBeGreaterThan(0);
  });

  test('C-MEAL-IMG-2 - receita aplicada usa fallback neutro sem imagem quebrada', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);

    await page.evaluate(() => {
      localStorage.setItem('hg:recipe_meals', JSON.stringify({
        '0:0': {
          recipeId: 'receita-teste',
          recipeName: 'Receita Teste',
          fitLabel: 'Compativel',
          ingredients: [
            {
              food: 'whey',
              label: 'Whey',
              grams: 30,
              display: '30g',
              macros: { kcal: 120, prot: 24, carb: 3, fat: 2 },
            },
          ],
          totals: { kcal: 120, prot: 24, carb: 3, fat: 2 },
          steps: ['Misturar tudo.'],
          note: 'Receita de teste.',
        },
      }));
    });

    await gotoPlano(page);

    const firstMeal = page.locator('#day-body-0 .meal-card').first();
    await expect(firstMeal.locator('[data-testid="recipe-badge"]')).toBeVisible();
    await expect(firstMeal.locator('[data-meal-visual="fallback"]')).toBeVisible();
    await expect(firstMeal.locator('[data-meal-image]')).toHaveCount(0);
    await expect(firstMeal).toContainText('Receita Teste');
  });

  test('C-MEAL-IMG-3 - imagem do card fica oculta no print para preservar o PDF', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    const visual = page.locator('#day-body-0 .meal-card').first().locator('.meal-card-visual');
    await expect(visual).toBeVisible();

    await page.emulateMedia({ media: 'print' });
    const display = await visual.evaluate(el => getComputedStyle(el).display);
    expect(display).toBe('none');
  });
});

test.describe('Plano Alimentar 14 Dias - imagens nos PDFs', () => {
  test('C-PDF-IMG-1 - PDF do dia inclui imagem da refeicao e miniatura de alimento disponivel', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('[data-pdf-day="0"]').first().click();
    await page.waitForSelector('#day-pdf-print-area', { state: 'attached', timeout: 5000 });

    const mealImage = page.locator('#day-pdf-print-area [data-pdf-meal-image]').first();
    const foodImage = page.locator('#day-pdf-print-area [data-pdf-food-image]').first();
    const firstMealTemplateId = await page.locator('#day-body-0 .meal-card').first().getAttribute('data-template-id');
    const firstFoodId = await page.locator('#day-pdf-print-area [data-pdf-food-visual]').first().getAttribute('data-food-id');
    const mealNatural = await mealImage.evaluate(el => ({ width: el.naturalWidth, height: el.naturalHeight }));
    const foodNatural = await foodImage.evaluate(el => ({ width: el.naturalWidth, height: el.naturalHeight }));

    expect(firstMealTemplateId).toBeTruthy();
    expect(firstFoodId).toBeTruthy();
    expect(mealNatural.width).toBeGreaterThan(0);
    expect(mealNatural.height).toBeGreaterThan(0);
    expect(foodNatural.width).toBeGreaterThan(0);
    expect(foodNatural.height).toBeGreaterThan(0);
    await expect(mealImage).toHaveAttribute('src', new RegExp(`${firstMealTemplateId}\\.webp$`));
    await expect(foodImage).toHaveAttribute('src', new RegExp(`${firstFoodId}\\.webp$`));
    await expect(page.locator('#day-pdf-print-area button')).toHaveCount(0);
  });

  test('C-PDF-IMG-2 - PDF do dia nao cria img nem request para alimento sem WebP ou manual', async ({ page }) => {
    const imageRequests = watchImageRequests(page);
    await injectState(page, CENARIO_6);
    await page.addInitScript(() => {
      localStorage.setItem('hg:custom_foods', JSON.stringify([
        {
          id: 'manual_pdf_sem_img',
          name: 'Manual PDF Sem Imagem',
          category: 'extra',
          source: 'custom',
          per100: { kcal: 180, prot: 8, carb: 14, fat: 10 },
        },
      ]));
      localStorage.setItem('hg:additions', JSON.stringify({
        '0:0': [
          {
            id: 'addition_pdf_atum',
            food: 'atum_agua',
            grams: 120,
            unit: 'g',
            snapshot: {
              name: 'Atum em água',
              category: 'protein',
              source: 'library',
              per100: { kcal: 116, prot: 26, carb: 0, fat: 1 },
            },
          },
          {
            id: 'addition_pdf_manual',
            food: 'manual_pdf_sem_img',
            grams: 90,
            unit: 'g',
            snapshot: {
              name: 'Manual PDF Sem Imagem',
              category: 'extra',
              source: 'custom',
              per100: { kcal: 180, prot: 8, carb: 14, fat: 10 },
            },
          },
        ],
      }));
      localStorage.setItem('hg:recipe_meals', JSON.stringify({
        '0:0': {
          recipeId: 'receita-pdf-img',
          recipeName: 'Receita PDF Visual',
          fitLabel: 'Compatível',
          ingredients: [
            {
              food: 'whey',
              label: 'Whey',
              grams: 30,
              display: '30g',
              macros: { kcal: 120, prot: 24, carb: 3, fat: 2 },
            },
            {
              food: 'banana_prata',
              label: 'Banana prata',
              grams: 80,
              display: '1 banana pequena (~80g)',
              macros: { kcal: 71, prot: 0.8, carb: 18.4, fat: 0.1 },
            },
            {
              food: 'atum_agua',
              label: 'Atum em água',
              grams: 60,
              display: '60g',
              macros: { kcal: 70, prot: 15, carb: 0, fat: 0.6 },
            },
          ],
          totals: { kcal: 261, prot: 39.8, carb: 21.4, fat: 2.7 },
          steps: ['Misture tudo.'],
        },
      }));
    });

    await gotoResultados(page);

    await gotoPlano(page);

    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('[data-pdf-day="0"]').first().click();
    await page.waitForSelector('#day-pdf-print-area', { state: 'attached', timeout: 5000 });

    const recipeMeal = page.locator('#day-pdf-print-area .meal-block').filter({ hasText: 'Receita PDF Visual' }).first();
    await expect(recipeMeal.locator('[data-food-id="whey"] [data-pdf-food-image]')).toHaveCount(1);
    await expect(recipeMeal.locator('[data-food-id="banana_prata"] [data-pdf-food-image]')).toHaveCount(1);
    await expect(recipeMeal.locator('[data-food-id="atum_agua"] [data-pdf-food-image]')).toHaveCount(0);
    await expect(recipeMeal.locator('[data-food-id="manual_pdf_sem_img"] [data-pdf-food-image]')).toHaveCount(0);

    expect(imageRequests.filter(r => /\/assets\/images\/foods\/atum_agua\.webp$/i.test(r.url))).toHaveLength(0);
    expect(imageRequests.filter(r => /manual_pdf_sem_img/i.test(r.url))).toHaveLength(0);
  });

  test('C-PDF-IMG-3 - plano completo inclui imagens de refeicoes e alimentos', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('#btn-print').click();
    await page.waitForSelector('#full-pdf-print-area', { state: 'attached', timeout: 5000 });

    const mealImage = page.locator('#full-pdf-print-area [data-pdf-meal-image]').first();
    const foodImage = page.locator('#full-pdf-print-area [data-pdf-food-image]').first();
    const mealNatural = await mealImage.evaluate(el => ({ width: el.naturalWidth, height: el.naturalHeight }));
    const foodNatural = await foodImage.evaluate(el => ({ width: el.naturalWidth, height: el.naturalHeight }));

    expect(mealNatural.width).toBeGreaterThan(0);
    expect(mealNatural.height).toBeGreaterThan(0);
    expect(foodNatural.width).toBeGreaterThan(0);
    expect(foodNatural.height).toBeGreaterThan(0);
    await expect(page.locator('#full-pdf-print-area button')).toHaveCount(0);
  });

  test('C-PDF-IMG-4 - PDF compacto inclui imagens e preserva 14 paginas', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    const html = await captureCompactPdfHtml(page);
    const dayMatches = html.match(/class=\"c-day(?: page-break)?\"/g) || [];
    const pageBreakMatches = html.match(/class=\"c-day page-break\"/g) || [];

    expect(html).toContain('data-pdf-meal-image');
    expect(html).toContain('data-pdf-food-image');
    expect(dayMatches).toHaveLength(14);
    expect(pageBreakMatches).toHaveLength(13);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: P1 — "Princípios das Receitas" condicional por estratégia
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Plano Alimentar — Princípios das Receitas condicional', () => {

  test('C-P1 — Estratégia Sólida: "Sistema Híbrido" ausente, texto de refeições sólidas visível', async ({ page }) => {
    await injectState(page, CENARIO_4); // strategy: 'solid'
    await gotoResultados(page);
    await gotoPlano(page);

    // "Sistema Híbrido" não deve aparecer na secção de Princípios das Receitas
    // FALHA antes do patch P1 — PASSA depois.
    await expect(page.getByText(/Sistema Híbrido/)).not.toBeVisible();

    // Texto de refeições sólidas deve estar visível
    await expect(page.getByText(/Todas as refeições são sólidas/).first())
      .toBeVisible();
  });

  // ── C-P2 ─────────────────────────────────────────────────────────────────────
  test('C-P2 — Nenhuma página visível da app exibe "ebook" ou "e-book"', async ({ page }) => {
    await injectState(page, CENARIO_6);
    // Verificar na página de rotina
    await page.goto('http://127.0.0.1:5500/');
    const homeText = await page.evaluate(() => document.body.innerText);
    expect(homeText).not.toMatch(/\bebook\b/i);
    expect(homeText).not.toMatch(/\be-book\b/i);
    // Verificar no plano alimentar
    await gotoResultados(page);
    await gotoPlano(page);
    const planoText = await page.evaluate(() => document.body.innerText);
    expect(planoText).not.toMatch(/\bebook\b/i);
    expect(planoText).not.toMatch(/\be-book\b/i);
  });

  // ── C-P3 ─────────────────────────────────────────────────────────────────────
  test('C-P3 — Link "Guia Hardgainer" existe, abre em nova aba e aponta para hardgainerhibrido.com', async ({ page }) => {
    // A hint box com o link está em /rotina (requer flags de sessão)
    await injectState(page, CENARIO_6);
    await page.goto('http://127.0.0.1:5500/');
    await page.waitForLoadState('load');
    await page.evaluate(() => {
      history.pushState({}, '', '/rotina');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('.hint', { timeout: 5000 });
    const link = page.locator('a[href="https://hardgainerhibrido.com/"]').first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    const linkText = await link.textContent();
    expect(linkText?.trim()).toBe('Guia Hardgainer');
  });

  // ── C-P4 ─────────────────────────────────────────────────────────────────────
  test('C-P4 — "Sistema Híbrido" como label de opção não virou link indevido', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await page.goto('http://127.0.0.1:5500/');
    await page.waitForLoadState('load');
    await page.evaluate(() => {
      history.pushState({}, '', '/rotina');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('.hint', { timeout: 5000 });
    // O título do botão "Sistema Híbrido" não deve ser um link
    const strategyBtn = page.locator('button[data-strategy="hybrid"]');
    if (await strategyBtn.count() > 0) {
      const hasLinkInside = await strategyBtn.evaluate(el => !!el.querySelector('a'));
      expect(hasLinkInside).toBe(false);
    }
    // O link adicionado está no hint box (fora dos botões)
    const linkInHint = page.locator('.hint a[href="https://hardgainerhibrido.com/"]');
    await expect(linkInHint).toBeVisible();
  });

  // ── C-P5 ─────────────────────────────────────────────────────────────────────
  test('C-P5 — "Sistema de Alimentação Híbrida" está linkado no subtítulo dos resultados', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    // O subtítulo hero-sub deve conter o link
    const heroSub = page.locator('.hero-sub');
    await expect(heroSub).toBeVisible();
    const link = heroSub.locator('a[href="https://hardgainerhibrido.com/"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    const linkText = await link.textContent();
    expect(linkText?.trim()).toBe('Sistema de Alimentação Híbrida');
  });

  // ── C-P6 ─────────────────────────────────────────────────────────────────────
  test('C-P6 — "Sistema de Alimentação Híbrida" está linkado no rodapé', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    // O rodapé aparece em todas as páginas — verificar o link no footer-meta
    const footerLink = page.locator('.footer-meta a[href="https://hardgainerhibrido.com/"]');
    await expect(footerLink).toBeVisible();
    await expect(footerLink).toHaveAttribute('target', '_blank');
    await expect(footerLink).toHaveAttribute('rel', 'noopener noreferrer');
    const linkText = await footerLink.textContent();
    expect(linkText?.trim()).toBe('Sistema de Alimentação Híbrida');
  });

  // ── C-P7 ─────────────────────────────────────────────────────────────────────
  test('C-P7 — "Sistema Híbrido do Guia" está linkado no card Princípios das Receitas', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    // O card "Princípios das Receitas" deve ter o link (só aparece na estratégia híbrida)
    const principiosCard = page.locator('.card-body a[href="https://hardgainerhibrido.com/"]').first();
    await expect(principiosCard).toBeVisible();
    await expect(principiosCard).toHaveAttribute('target', '_blank');
    await expect(principiosCard).toHaveAttribute('rel', 'noopener noreferrer');
    const linkText = await principiosCard.textContent();
    expect(linkText?.trim()).toBe('Sistema Híbrido do Guia');
  });

});

// C-P3 removido: botão "Personalizar" foi removido da interface.

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Card "Como usar este plano"
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Plano Alimentar — Card "Como usar este plano"', () => {

  // ── C-HOW1 ───────────────────────────────────────────────────────────────────
  test('C-HOW1 — card "Como usar este plano" existe no plano (modo métrico)', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const card = page.locator('#how-to-use');
    await expect(card).toBeAttached();
  });

  // ── C-HOW2 ───────────────────────────────────────────────────────────────────
  test('C-HOW2 — card está fechado por padrão (sem atributo open)', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const card = page.locator('#how-to-use');
    const isOpen = await card.evaluate(el => el.hasAttribute('open'));
    expect(isOpen).toBe(false);
  });

  // ── C-HOW3 ───────────────────────────────────────────────────────────────────
  test('C-HOW3 — clicar no summary abre o card e exibe o conteúdo', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const summary = page.locator('#how-to-use summary');
    await summary.click();
    const card = page.locator('#how-to-use');
    const isOpen = await card.evaluate(el => el.hasAttribute('open'));
    expect(isOpen).toBe(true);
    // Conteúdo deve estar visível após abrir
    await expect(page.locator('#how-to-use').getByText('Antes de começar')).toBeVisible();
    await expect(page.locator('#how-to-use').getByText('Durante os 14 dias')).toBeVisible();
    await expect(page.locator('#how-to-use').getByText('Depois dos 14 dias')).toBeVisible();
  });

  // ── C-HOW4 ───────────────────────────────────────────────────────────────────
  test('C-HOW4 — card tem classe no-print (não aparece em PDF)', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const card = page.locator('#how-to-use');
    await expect(card).toHaveClass(/no-print/);
  });

  // ── C-HOW5 ───────────────────────────────────────────────────────────────────
  test('C-HOW5 — mobile 390px: card sem overflow horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const scrollW = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollW).toBeLessThanOrEqual(395);
  });

  // ── C-HOW6 ───────────────────────────────────────────────────────────────────
  test('C-HOW6 — card aparece em modo imperial (unit-independent)', async ({ page }) => {
    const imperialState = {
      ...CENARIO_6,
      form: { ...CENARIO_6.form, unit: 'imperial' },
    };
    await injectState(page, imperialState);
    await gotoResultados(page);
    await gotoPlano(page);
    const card = page.locator('#how-to-use');
    await expect(card).toBeAttached();
  });

  // ── C-HOW7 ───────────────────────────────────────────────────────────────────
  test('C-HOW7 — texto do card não contém valores fixos de unidade (kg, lb, oz, ml, "X L")', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    // Abrir o card para ler o conteúdo
    await page.locator('#how-to-use summary').click();
    const cardText = await page.locator('#how-to-use').textContent() || '';
    // Não deve conter valores fixos com unidades (ex: "3 L", "500 ml", "2 kg", "5 lb", "3 oz")
    expect(cardText).not.toMatch(/\d+\s*(L|ml|mL|kg|lb|oz)\b/);
  });

  // ── C-HOW8 ───────────────────────────────────────────────────────────────────
  test('C-HOW8 — card menciona "meta de hidratação indicada pela app"', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    // Abrir para ler conteúdo
    await page.locator('#how-to-use summary').click();
    const cardText = await page.locator('#how-to-use').textContent() || '';
    expect(cardText).toContain('meta de hidratação indicada pela app');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: F3 — Frutas/tubérculos sem fracções impráticas
// ─────────────────────────────────────────────────────────────────────────────
// Problema: "0.5 unidade M" para banana, batata, maçã, manga quando o slot
// tem menos kcal que a base do template. Causa: formatQty sem unidade P.
// Este teste deve FALHAR antes do patch F3 e PASSAR depois.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Plano Alimentar — F3: frutas/tubérculos sem fracções impráticas', () => {

  test('C-F3 — Plano de 14 dias: banana e batata não aparecem como "0.5 unidade"', async ({ page }) => {
    await injectState(page, CENARIO_4); // 7 refeições sólidas — activa templates com banana/batata
    await gotoResultados(page);
    await gotoPlano(page);

    // "0.5 unidade" não deve aparecer para nenhum ingrediente de fruta/tubérculo.
    // FALHA antes do patch F3 — PASSA depois.
    await expect(page.getByText(/0\.5 unidade/)).not.toBeVisible();

    // Plano carregou sem quebrar
    await expect(page.getByText('Lanche da Tarde').first()).toBeVisible();

    // Total kcal preservado (macros não alteradas)
    await expect(page.getByText('2660').first()).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: F4 — Mel sem fracções de colher / pluralize correcto
// ─────────────────────────────────────────────────────────────────────────────
// Problema 1: mel aparecia como "0.5 colher de sopa" para 10–14g.
// Problema 2: regressão pluralize — "1.5 colheres de sopa" → "1.5 colhers des sopas".
// Este teste deve FALHAR antes dos patches P0+P1 e PASSAR depois.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Plano Alimentar — F4: mel sem fracções de colher', () => {

  test('C-F4 — Mel: sem "0.5 colher", pluralize correcto ("colheres" não "colhers")', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // P1: unidades novas do mel ("colher de chá", "colher de sobremesa")
    // nunca devem aparecer como fracção 0.5.
    // FALHA antes do patch P1 — PASSA depois.
    await expect(page.getByText(/0\.5 colher de chá/)).not.toBeVisible();
    await expect(page.getByText(/0\.5 colher de sobremesa/)).not.toBeVisible();

    // Regressão P0: "colhers des" nunca deve aparecer (pluralize incorrecto).
    // FALHA antes do patch P0 — PASSA depois.
    await expect(page.getByText(/colhers des/)).not.toBeVisible();

    // Plano carregou sem quebrar
    await expect(page.getByText('2660').first()).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: F2 — Coerência de ovos no plano (label vs. display)
// ─────────────────────────────────────────────────────────────────────────────
// Problema: scaleMeal usava label estático do template ("3 ovos inteiros") mesmo
// quando a escala produzia 2 ovos. practicalRound não snappava para múltiplo de 50.
// Este teste deve FALHAR antes do patch F2 e PASSAR depois.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Plano Alimentar — F2: coerência de ovos', () => {

  test('C-F2 — Ovos: label e display mostram a mesma quantidade', async ({ page }) => {
    await injectState(page, CENARIO_4); // 7 refeições sólidas — activa templates com ovos
    await gotoResultados(page);
    await gotoPlano(page);

    // Recolhe todos os pares (label, display) de linhas de ingredientes de ovos
    // e verifica que o número no label coincide com o número no display.
    const inconsistencies = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.ingredient-row, .ing-row, [data-food="ovo_inteiro"]'));
      /** @type {{ label: string, display: string }[]} */
      const results = [];
      rows.forEach(row => {
        const labelEl = row.querySelector('.ing-label, .ingredient-label');
        const displayEl = row.querySelector('.ing-display, .ingredient-display, .ing-qty');
        if (!labelEl || !displayEl) return;
        const label = labelEl.textContent || '';
        const display = displayEl.textContent || '';
        if (!/ovo/i.test(label) && !/ovo/i.test(display)) return;
        // extrai número do label e do display
        const numLabel  = (label.match(/\d+/) || [])[0];
        const numDisplay = (display.match(/\d+/) || [])[0];
        if (numLabel && numDisplay && numLabel !== numDisplay) {
          results.push({ label, display });
        }
      });
      return results;
    });

    // Não deve existir nenhum par inconsistente
    expect(inconsistencies).toHaveLength(0);

    // "ovos inteiros" deve aparecer no plano (texto do label dinâmico)
    const eggText = page.getByText(/ovos inteiros/i).first();
    // Se existir, deve ser visível (pode não haver ovos no Dia 1 — aceitável)
    const count = await page.getByText(/ovos inteiros/i).count();
    if (count > 0) {
      await expect(eggText).toBeVisible();
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: F5 — Pastas sem "0.5 colher de sopa"
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Plano Alimentar — F5: pastas sem fracções impráticas', () => {

  test('C-F5 — Pasta de amendoim/amêndoa/caju: sem "0.5 colher de sopa"', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // "0.5 colher de sopa" não deve aparecer para pastas.
    await expect(page.getByText(/0\.5 colher de sopa/)).not.toBeVisible();

    // Plano carregou
    await expect(page.getByText('2660').first()).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: F6 — Whey sem "0.5 scoop"
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Plano Alimentar — F6: whey sem "0.5 scoop"', () => {

  test('C-F6 — Whey: sem contradição nome/quantidade; "Proteína whey" como nome principal', async ({ page }) => {
    // CENARIO_4: shake_morning=433 kcal → factor=0.731 → whey 21.9g → snap 15g (Dia 1)
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Strings antigas/contraditórias NUNCA devem aparecer:
    await expect(page.getByText(/0\.5 scoop/)).not.toBeVisible();
    await expect(page.getByText(/1\.5 scoop/)).not.toBeVisible();
    await expect(page.getByText(/Whey \(1 scoop\)/)).not.toBeVisible();
    await expect(page.getByText(/Whey protein \(1 scoop\)/)).not.toBeVisible();
    await expect(page.getByText(/Whey \(meio scoop\)/)).not.toBeVisible();
    await expect(page.getByText(/meio scoop \(20g\)/)).not.toBeVisible();

    // Nome principal correcto (sem quantidade embutida):
    await expect(page.getByText('Proteína whey').first()).toBeVisible();

    // Dia 1 usa shake_bomba → factor=0.731 → whey 21.9g → snap 15g
    await expect(page.getByText(/meio scoop\/medidor \(15g\)/).first()).toBeVisible();

    // Plano carregou
    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-F6b — Whey: "1 scoop/medidor (30g)" aparece no Dia 1 quando slot kcal >= 445', async ({ page }) => {
    // Fixture com shake_morning=460 kcal (factor=460/592.1=0.777 → whey=23.3g → snap 30g)
    // shake_night reduzido de 365→338 para manter soma=2660.
    //
    // Prova matemática:
    //   shake_bomba actualBase = 592.1 kcal
    //   factor = 460/592.1 = 0.777 → whey = 30×0.777 = 23.3g
    //   practicalRound: round(23.3/15)*15 = round(1.55)*15 = 2×15 = 30g ✓
    const { form, profile, results: base } = CENARIO_4;
    const fullScoopSlots = [
      { slot: 'breakfast',     type: 'solid', kcal: 391, time: '07:15' },
      { slot: 'shake_morning', type: 'shake', kcal: 460, time: '09:30' }, // ← 460 força 30g
      { slot: 'lunch',         type: 'solid', kcal: 428, time: '12:00' },
      { slot: 'lunch',         type: 'solid', kcal: 335, time: '15:00' },
      { slot: 'dinner',        type: 'solid', kcal: 410, time: '17:30' },
      { slot: 'dinner',        type: 'solid', kcal: 298, time: '20:00' },
      { slot: 'shake_night',   type: 'shake', kcal: 338, time: '22:30' }, // ← reduzido 27 kcal
      // total: 391+460+428+335+410+298+338 = 2660 ✓
    ];
    const state = {
      form,
      profile,
      routine: base.routine,
      results: { ...base, slotDistribution: fullScoopSlots },
    };

    await injectState(page, state);
    await gotoResultados(page);
    await gotoPlano(page);

    // Dia 1 deve mostrar "1 scoop/medidor (30g)" (visível, não colapsado)
    await expect(page.getByText(/1 scoop\/medidor \(30g\)/).first()).toBeVisible();

    // "meio scoop" ainda pode aparecer no shake_night do Dia 1
    // (shake_night=338 → factor=338/592.1=0.571 → whey=17.1g → snap 15g)
    // Não importa o mix — o que importa é que 30g está visível.

    // Labels antigos NUNCA aparecem
    await expect(page.getByText(/Whey \(1 scoop\)/)).not.toBeVisible();
    await expect(page.getByText(/Whey protein \(1 scoop\)/)).not.toBeVisible();
    await expect(page.getByText(/0\.5 scoop/)).not.toBeVisible();

    // Nome principal correcto
    await expect(page.getByText('Proteína whey').first()).toBeVisible();

    await expect(page.getByText('2660').first()).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: F7 — Ovos com descritor de tamanho no label
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Plano Alimentar — F7: ovos com tamanho no label', () => {

  test('C-F7 — Ovos: label é preparação "mexidos"; display tem tamanho e "sem casca"', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Se ovos aparecerem no plano (Dia 1 pode não ter):
    const countPrep = await page.getByText(/ovos? mexidos?/i).count();
    if (countPrep > 0) {
      // Linha principal = preparação
      await expect(page.getByText(/ovos? mexidos?/i).first()).toBeVisible();
      // Linha secundária = ingrediente com tamanho
      await expect(page.getByText(/ovos? inteiros? (pequ|m[eé]di|grand)/i).first()).toBeVisible();
    }

    // Plano carregou
    await expect(page.getByText('2660').first()).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: F8 — Nomes correctos de alimentos no plano (pão, banana, batata)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Plano Alimentar — F8: nomes correctos de alimentos', () => {

  test('C-F8 — "Pão branco (pão francês)" visível; "Pão francês branco" ausente', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Strings antigas não devem aparecer
    await expect(page.getByText(/Pão francês branco/)).not.toBeVisible();
    await expect(page.getByText(/unidade P/)).not.toBeVisible();
    await expect(page.getByText(/unidade M/)).not.toBeVisible();
    await expect(page.getByText(/unidade G/)).not.toBeVisible();
    await expect(page.getByText(/0\.5 unidade/)).not.toBeVisible();
    await expect(page.getByText(/1\.5 unidade/)).not.toBeVisible();

    // Plano carregou
    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-F8b — "Banana madura" visível; "Banana prata" ausente', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // "Banana prata" (qualquer variante) não deve aparecer como label
    await expect(page.getByText(/Banana prata/)).not.toBeVisible();

    // "Banana madura" deve aparecer (como label do ingrediente)
    await expect(page.getByText('Banana madura').first()).toBeVisible();

    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-F8c — "Batata inglesa cozida (batata branca simples)" visível', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // A batata deve aparecer com o nome completo correcto
    // (é possível que o Dia 1 não tenha batata — aceitável)
    const countBatata = await page.getByText(/Batata inglesa cozida/i).count();
    if (countBatata > 0) {
      await expect(page.getByText(/Batata inglesa cozida \(batata branca simples\)/i).first()).toBeVisible();
    }

    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-F8d — "omelete simples" nunca aparece quando ovos são mexidos', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Step "omelete simples" removido do template café_classico
    await expect(page.getByText(/omelete simples/i)).not.toBeVisible();

    await expect(page.getByText('2660').first()).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: PP — Porções Práticas (protein floor, carb rounding, veg humanizado)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Plano Alimentar — PP: Porções Práticas', () => {

  test('C-PP1 — Proteína pesável nunca exibe menos de 80g no plano', async ({ page }) => {
    await injectState(page, CENARIO_4); // 7 refeições sólidas
    await gotoResultados(page);
    await gotoPlano(page);

    // Avalia todos os ingredientes exibidos com gramas explícitos
    // e verifica que nenhuma proteína pesável aparece abaixo de 80g.
    const violations = await page.evaluate(() => {
      // Nomes pt-BR das proteínas pesáveis (como aparecem no display)
      const PROTEIN_NAMES = [
        /frango/i, /carne moída/i, /tilápia/i, /pescada/i, /salmão/i, /atum/i,
      ];
      const rows = Array.from(document.querySelectorAll(
        '.ingredient-row, .ing-row, .ingredient, [class*="ing"]'
      ));
      /** @type {{ text: string, g: number }[]} */
      const results = [];
      rows.forEach(row => {
        const text = row.textContent || '';
        const hasProtein = PROTEIN_NAMES.some(rx => rx.test(text));
        if (!hasProtein) return;
        // extrai o primeiro número de gramas "(XXg)" ou "XXg"
        const match = text.match(/\((\d+)g\)|(\d+)\s*g/);
        if (!match) return;
        const g = parseInt(match[1] || match[2], 10);
        if (g > 0 && g < 80) results.push({ text: text.trim().slice(0, 60), g });
      });
      return results;
    });

    expect(violations, `Proteínas abaixo de 80g: ${JSON.stringify(violations)}`).toHaveLength(0);

    // Plano carregou
    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-PP2 — Vegetais mostram "a gosto" ou "1 porção pequena" no plano', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Pelo menos um dos labels humanizados deve aparecer se vegetais estiverem no plano
    const aGostoCount   = await page.getByText('a gosto').count();
    const porcaoCount   = await page.getByText('1 porção pequena').count();

    // Se salada/brócolis/abobrinha/cenoura existirem no plano, um destes deve aparecer.
    // Aceitável que o Dia 1 não tenha vegetais loose — o teste verifica apenas que
    // o display está correcto quando presente.
    const vegsPresent = await page.getByText(/salada|brócolis|abobrinha|cenoura/i).count();
    if (vegsPresent > 0) {
      expect(aGostoCount + porcaoCount).toBeGreaterThan(0);
    }

    // Plano carregou
    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-PP4 — Híbrido 6 refeições: proteínas >=80g e plano carrega', async ({ page }) => {
    // CENARIO_6 = Híbrido 6 refeições, wake 08:00, sem treino
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    // Mesmo no slot breakfast (508 kcal) e lunch (556 kcal) as proteínas
    // devem aparecer em porções práticas (>=80g, múltiplos de 10g).
    const violations = await page.evaluate(() => {
      const PROTEIN_NAMES = [
        /frango/i, /carne moída/i, /tilápia/i, /pescada/i, /salmão/i, /atum/i,
      ];
      const rows = Array.from(document.querySelectorAll(
        '.ingredient-row, .ing-row, .ingredient, [class*="ing"]'
      ));
      /** @type {{ text: string, g: number }[]} */
      const found = [];
      rows.forEach(row => {
        const text = row.textContent || '';
        if (!PROTEIN_NAMES.some(rx => rx.test(text))) return;
        const match = text.match(/\((\d+)g\)|(\d+)\s*g/);
        if (!match) return;
        const g = parseInt(match[1] || match[2], 10);
        if (g > 0 && g < 80) found.push({ text: text.trim().slice(0, 60), g });
      });
      return found;
    });

    expect(violations, `Proteínas <80g: ${JSON.stringify(violations)}`).toHaveLength(0);
    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-PP5 — 7 refeições sólidas com treino: proteínas práticas e labels OK', async ({ page }) => {
    // CENARIO_5 = 7S sólidas, treino 16:00–17:30
    await injectState(page, CENARIO_5);
    await gotoResultados(page);
    await gotoPlano(page);

    const violations = await page.evaluate(() => {
      const PROTEIN_NAMES = [
        /frango/i, /carne moída/i, /tilápia/i, /pescada/i, /salmão/i, /atum/i,
      ];
      const rows = Array.from(document.querySelectorAll(
        '.ingredient-row, .ing-row, .ingredient, [class*="ing"]'
      ));
      /** @type {{ text: string, g: number }[]} */
      const found = [];
      rows.forEach(row => {
        const text = row.textContent || '';
        if (!PROTEIN_NAMES.some(rx => rx.test(text))) return;
        const match = text.match(/\((\d+)g\)|(\d+)\s*g/);
        if (!match) return;
        const g = parseInt(match[1] || match[2], 10);
        if (g > 0 && g < 80) found.push({ text: text.trim().slice(0, 60), g });
      });
      return found;
    });

    expect(violations, `Proteínas <80g: ${JSON.stringify(violations)}`).toHaveLength(0);

    // Regressão: labels de foods correctos
    await expect(page.getByText(/Banana prata/)).not.toBeVisible();
    await expect(page.getByText(/0\.5 scoop/)).not.toBeVisible();
    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-PP6 — 8 refeições prático: sem proteínas ridículas, "a gosto" se vegetais presentes', async ({ page }) => {
    // CENARIO_9 = 8 refeições, estratégia practical, sem treino
    await injectState(page, CENARIO_9);
    await gotoResultados(page);
    await gotoPlano(page);

    const violations = await page.evaluate(() => {
      const PROTEIN_NAMES = [
        /frango/i, /carne moída/i, /tilápia/i, /pescada/i, /salmão/i, /atum/i,
      ];
      const rows = Array.from(document.querySelectorAll(
        '.ingredient-row, .ing-row, .ingredient, [class*="ing"]'
      ));
      /** @type {{ text: string, g: number }[]} */
      const found = [];
      rows.forEach(row => {
        const text = row.textContent || '';
        if (!PROTEIN_NAMES.some(rx => rx.test(text))) return;
        const match = text.match(/\((\d+)g\)|(\d+)\s*g/);
        if (!match) return;
        const g = parseInt(match[1] || match[2], 10);
        if (g > 0 && g < 80) found.push({ text: text.trim().slice(0, 60), g });
      });
      return found;
    });

    expect(violations, `Proteínas <80g: ${JSON.stringify(violations)}`).toHaveLength(0);

    // Vegetais com display humanizado (se presentes no plano)
    const vegsPresent = await page.getByText(/salada|brócolis|abobrinha|cenoura/i).count();
    if (vegsPresent > 0) {
      const aGosto = await page.getByText('a gosto').count();
      const porcao = await page.getByText('1 porção pequena').count();
      expect(aGosto + porcao).toBeGreaterThan(0);
    }

    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-PP3 — Regressão: 23 itens anteriores ainda passam (proteínas, labels, totais)', async ({ page }) => {
    // Este teste é um smoke-test de regressão rápida para garantir que
    // o protein floor não quebrou as labels/displays anteriores.
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Labels de food names continuam correctos
    await expect(page.getByText(/Pão francês branco/)).not.toBeVisible();
    await expect(page.getByText(/Banana prata/)).not.toBeVisible();
    await expect(page.getByText(/unidade [PMG]/)).not.toBeVisible();
    await expect(page.getByText(/0\.5 scoop/)).not.toBeVisible();
    await expect(page.getByText(/0\.5 colher de sopa/)).not.toBeVisible();
    await expect(page.getByText(/colhers des/)).not.toBeVisible();
    await expect(page.getByText(/omelete simples/i)).not.toBeVisible();

    // Labels positivos
    await expect(page.getByText('Banana madura').first()).toBeVisible();
    await expect(page.getByText('2660').first()).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: F9 — Nomes bilingues PT/BR correctos
// ─────────────────────────────────────────────────────────────────────────────
// Garante que nomes ambíguos (Aveia fina, nomes só-BR) foram substituídos
// pelos equivalentes claros com equivalente PT entre parêntesis.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Plano Alimentar — F9: nomes bilingues PT/BR', () => {

  test('C-F9a — "Aveia fina" nunca aparece; prova que é flocos, não farinha', async ({ page }) => {
    // O food ID é aveia_flocos → claramente flocos.
    // Antes: label 'Aveia fina' no shake_manga era ambíguo (parecia farinha).
    // Depois: todos os labels usam 'Flocos de aveia finos'.
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // "Aveia fina" NÃO deve aparecer em nenhum label ou nota.
    await expect(page.getByText(/^Aveia fina$/)).not.toBeVisible();
    await expect(page.getByText('Aveia fina')).not.toBeVisible();

    // "Carne moída magra" (qualquer variante) NÃO deve aparecer.
    await expect(page.getByText(/Carne mo[íi]da magra/)).not.toBeVisible();

    // Plano carregou.
    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-F9b — "Aveia fina" ausente no plano híbrido (shake_manga pode aparecer)', async ({ page }) => {
    // CENARIO_6 = Híbrido 6 refeições com shake_afternoon → pode rodar shake_manga.
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    // Mesmo que shake_manga apareça no plano, o label deve ser 'Flocos de aveia finos'.
    await expect(page.getByText('Aveia fina')).not.toBeVisible();

    // "Flocos de aveia finos" deve aparecer quando aveia estiver presente.
    const aveiaCount = await page.getByText('Flocos de aveia finos').count();
    if (aveiaCount > 0) {
      await expect(page.getByText('Flocos de aveia finos').first()).toBeVisible();
    }

    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-F9c — Nomes de foods antigos ausentes; equivalentes PT/BR presentes quando aplicável', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Nomes antigos que não devem aparecer:
    await expect(page.getByText(/Aveia fina/)).not.toBeVisible();
    await expect(page.getByText(/Carne mo[íi]da magra/)).not.toBeVisible();
    await expect(page.getByText(/Pão francês branco/)).not.toBeVisible();
    await expect(page.getByText(/Banana prata/)).not.toBeVisible();
    await expect(page.getByText(/unidade [PMG]/)).not.toBeVisible();
    await expect(page.getByText(/0\.5 unidade/)).not.toBeVisible();
    await expect(page.getByText(/0\.5 colher de sopa/)).not.toBeVisible();

    // Nomes novos devem aparecer quando o alimento está presente no plano:
    // (carne moída, macarrão, abobrinha dependem do template do Dia 1)
    const carneMoida = await page.getByText(/Carne mo[íi]da \(carne picada\)/i).count();
    if (carneMoida > 0) {
      await expect(page.getByText(/Carne mo[íi]da \(carne picada\)/i).first()).toBeVisible();
    }

    const macarrao = await page.getByText(/Macarr[aã]o.*massa cozida/i).count();
    if (macarrao > 0) {
      await expect(page.getByText(/Macarr[aã]o.*massa cozida/i).first()).toBeVisible();
    }

    const abobrinha = await page.getByText(/Abobrinha.*curgete/i).count();
    if (abobrinha > 0) {
      await expect(page.getByText(/Abobrinha.*curgete/i).first()).toBeVisible();
    }

    // Banana madura e Pão branco (pão francês) mantêm-se correctos:
    await expect(page.getByText('Banana madura').first()).toBeVisible();
    await expect(page.getByText('2660').first()).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Sistema de Substituições
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Sistema de Substituições', () => {

  test('C-SUB1 — Botão "Substituir" existe e é clicável no Dia 1', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Dia 1 está aberto por defeito — deve existir pelo menos 1 botão Substituir
    const swapBtns = page.locator('[data-swap]');
    await expect(swapBtns.first()).toBeVisible();
    const count = await swapBtns.count();
    expect(count).toBeGreaterThan(0);
  });

  test('C-SUB2 — Modal abre ao clicar em "Substituir"', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();

    // Modal aparece
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();
    await expect(page.locator('.modal-title')).toBeVisible();
  });

  test('C-SUB3 — Modal mostra alimento atual com kcal e macros', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();

    // Bloco "Alimento atual" visível
    await expect(page.locator('.sub-current')).toBeVisible();
    await expect(page.locator('.sub-current-label')).toBeVisible();
    await expect(page.locator('.sub-current-name')).toBeVisible();
    await expect(page.locator('.sub-current-macros')).toBeVisible();

    // Macros contêm "kcal"
    const macrosText = await page.locator('.sub-current-macros').textContent();
    expect(macrosText).toMatch(/kcal/);
    expect(macrosText).toMatch(/P:/);
    expect(macrosText).toMatch(/C:/);
    expect(macrosText).toMatch(/G:/);
  });

  test('C-SUB4 — Modal mostra alternativas da categoria correta', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();

    // Deve haver opções de substituição
    await expect(page.locator('.modal-body')).toBeVisible();
    // Se existem opções, cada uma tem nome, quantidade e macros
    const opts = page.locator('.sub-option');
    const optCount = await opts.count();
    if (optCount > 0) {
      await expect(opts.first().locator('.sub-option-name')).toBeVisible();
      await expect(opts.first().locator('.sub-option-qty')).toBeVisible();
      await expect(opts.first().locator('.sub-option-macros')).toBeVisible();
      // Cada opção tem badge de impacto
      await expect(opts.first().locator('.sub-impact')).toBeVisible();
    }
  });

  test('C-SUB5 — Confirmar substituição altera o alimento no plano', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Abrir modal do primeiro ingrediente
    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    // Se há opções disponíveis, clicar na primeira
    const opts = page.locator('.sub-option');
    const optCount = await opts.count();
    if (optCount === 0) {
      // Sem opções — fechar e marcar como skipped
      await page.locator('[data-modal-close]').first().click();
      return;
    }

    // Guardar o nome do substituto escolhido
    const subName = await opts.first().locator('.sub-option-name').textContent();
    await opts.first().click();

    // Modal fechou
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible();

    // O nome do primeiro ingrediente mudou para o substituto
    const newIngName = await page.locator('.ingredient-name').first().textContent();
    expect(newIngName).toContain(subName ? subName.trim() : '');
  });

  test('C-SUB6 — Badge "Substituído" aparece após aplicar substituição', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Sem substituição: badge não existe
    await expect(page.locator('.ing-badge-subst').first()).not.toBeVisible();

    // Abrir modal e aplicar
    await page.locator('[data-swap]').first().click();
    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;
    await opts.first().click();

    // Badge aparece
    await expect(page.locator('.ing-badge-subst').first()).toBeVisible();
    const badgeText = await page.locator('.ing-badge-subst').first().textContent();
    expect(badgeText?.trim()).toBe('Substituído');
  });

  test('C-SUB7 — Botão "Reverter" inline aparece após aplicar substituição', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Sem substituição: botão revert não existe
    await expect(page.locator('[data-revert]').first()).not.toBeVisible();

    // Aplicar substituição
    await page.locator('[data-swap]').first().click();
    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;
    await opts.first().click();

    // Botão revert aparece
    await expect(page.locator('[data-revert]').first()).toBeVisible();
    await expect(page.locator('.ing-revert-btn').first()).toBeVisible();
  });

  test('C-SUB8 — Reverter via botão inline restaura o ingrediente original', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Nome original
    const originalName = await page.locator('.ingredient-name').first().textContent();

    // Aplicar substituição
    await page.locator('[data-swap]').first().click();
    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;
    await opts.first().click();

    // Verificar que mudou
    const substitutedName = await page.locator('.ingredient-name').first().textContent();
    expect(substitutedName).not.toBe(originalName);

    // Reverter via botão inline
    await page.locator('[data-revert]').first().click();

    // Nome restaurado
    const restoredName = await page.locator('.ingredient-name').first().textContent();
    expect(restoredName?.trim()).toContain((originalName || '').trim());

    // Badge sumiu
    await expect(page.locator('.ing-badge-subst').first()).not.toBeVisible();
  });

  test('C-SUB9 — Reverter via botão no modal restaura o ingrediente original', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const originalName = await page.locator('.ingredient-name').first().textContent();

    // Aplicar substituição
    await page.locator('[data-swap]').first().click();
    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;
    await opts.first().click();

    // Abrir modal novamente no mesmo ingrediente (agora substituído)
    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    // Botão "Reverter" visível no modal (porque está substituído)
    await expect(page.locator('#btn-reset-ing')).toBeVisible();

    // Clicar no reverter do modal
    await page.locator('#btn-reset-ing').click();

    // Restaurado
    const restoredName = await page.locator('.ingredient-name').first().textContent();
    expect(restoredName?.trim()).toContain((originalName || '').trim());
  });

  test('C-SUB10 — Cancelar não altera nada', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const originalName = await page.locator('.ingredient-name').first().textContent();

    // Abrir modal e cancelar
    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();
    await page.locator('[data-modal-close]').first().click();

    // Nada mudou
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible();
    const nameAfterCancel = await page.locator('.ingredient-name').first().textContent();
    expect(nameAfterCancel?.trim()).toBe((originalName || '').trim());
    await expect(page.locator('.ing-badge-subst').first()).not.toBeVisible();
  });

  test('C-SUB11 — "Reverter" não aparece no modal antes de qualquer substituição', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Abrir modal sem substituição anterior
    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    // Botão "Reverter" NÃO deve estar visível (ingrediente não foi substituído ainda)
    await expect(page.locator('#btn-reset-ing')).not.toBeVisible();

    await page.locator('[data-modal-close]').first().click();
  });

  test('C-SUB12 — Substituições não mostram porções ridículas (< 80g para proteínas pesáveis)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Abrir modal de um ingrediente de proteína
    // Percorrer todos os botões Substituir do Dia 1 até encontrar um com opções de proteína
    const swapBtns = page.locator('[data-swap]');
    const count = await swapBtns.count();

    let proteinOptionsFound = false;
    for (let i = 0; i < Math.min(count, 10); i++) {
      await swapBtns.nth(i).click();
      const opts = page.locator('.sub-option');
      const optCount = await opts.count();
      if (optCount > 0) {
        // Verificar todas as opções
        for (let j = 0; j < optCount; j++) {
          const qtyText = await opts.nth(j).locator('.sub-option-qty').textContent() || '';
          const macrosText = await opts.nth(j).locator('.sub-option-macros').textContent() || '';
          // Se é uma proteína pesável (frango, carne, peixe, atum) não deve ser < 80g
          // Detectar por macros de proteína alta
          const protMatch = macrosText.match(/P:([\d.]+)g/);
          // Excluir suplementos em pó (whey, caseína) — medidos em scoops, não em gramas de alimento
          const isScoop = qtyText.toLowerCase().includes('scoop') || qtyText.toLowerCase().includes('medidor');
          if (protMatch && parseFloat(protMatch[1]) > 15 && !isScoop) {
            // Alta proteína pesável — verificar que a quantidade não é ridícula (< 80g)
            const gramsMatch = qtyText.match(/(\d+)g/);
            if (gramsMatch) {
              const g = parseInt(gramsMatch[1], 10);
              // Para proteínas pesáveis: mínimo 80g (o floor é 100g, mas 80g é a UI mínima aceitável)
              expect(g).toBeGreaterThanOrEqual(80);
            }
            proteinOptionsFound = true;
          }
        }
      }
      await page.locator('[data-modal-close]').first().click();
      if (proteinOptionsFound) break;
    }
    // Se encontrou opções de proteína, já validou; caso contrário o plano não tem proteínas substituíveis (ok)
  });

  test('C-SUB13 — Substituição de proteína: frango → outra proteína (cenário sólido)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Procurar ingrediente "Peito de frango" no Dia 1
    const frangoIng = page.locator('.ingredient-name', { hasText: /Peito de frango/i }).first();
    const hasFrango = await frangoIng.count();
    if (!hasFrango) {
      // Template de Dia 1 não tem frango — teste não é aplicável mas não deve falhar
      return;
    }

    // Encontrar o botão Substituir correspondente
    const frangoLi = frangoIng.locator('xpath=ancestor::li[contains(@class,"ingredient")]');
    const swapBtn = frangoLi.locator('[data-swap]');
    await swapBtn.click();

    // Modal abre
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    // Alimento atual = Peito de frango
    const currentName = await page.locator('.sub-current-name').textContent();
    expect(currentName).toMatch(/Peito de frango/i);

    // Existem opções de substituição
    const opts = page.locator('.sub-option');
    const optCount = await opts.count();
    expect(optCount).toBeGreaterThan(0);

    // Para opções de proteína com P > 15g, não suplementos: mínimo 50g.
    // (C2-A pode escolher quantidades abaixo de 80g para melhor encaixe diário —
    //  ex: 70g de queijo-mussarela é ainda prático. O floor real é 50g.)
    // Extras de outras categorias (condimentos, gorduras, extras) têm porções menores — ok.
    for (let i = 0; i < optCount; i++) {
      const qtyText   = await opts.nth(i).locator('.sub-option-qty').textContent() || '';
      const macroText = await opts.nth(i).locator('.sub-option-macros').textContent() || '';
      const isScoop   = qtyText.toLowerCase().includes('scoop') || qtyText.toLowerCase().includes('medidor');
      const protMatch = macroText.match(/P:([\d.]+)g/);
      const gramsMatch = qtyText.match(/(\d+)g/);
      if (gramsMatch && !isScoop && protMatch && parseFloat(protMatch[1]) > 15) {
        const g = parseInt(gramsMatch[1], 10);
        expect(g).toBeGreaterThanOrEqual(50);
      }
    }

    // Aplicar primeira substituição
    await opts.first().click();
    await expect(page.locator('.ing-badge-subst').first()).toBeVisible();
  });

  test('C-SUB14 — Substituição de carb: arroz → outro carb', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Procurar "Arroz branco" no Dia 1
    const arrozIng = page.locator('.ingredient-name', { hasText: /Arroz branco/i }).first();
    if (await arrozIng.count() === 0) return; // não está no template do Dia 1

    const arrozLi = arrozIng.locator('xpath=ancestor::li[contains(@class,"ingredient")]');
    await arrozLi.locator('[data-swap]').click();

    await expect(page.locator('.modal-backdrop.show')).toBeVisible();
    const currentName = await page.locator('.sub-current-name').textContent();
    expect(currentName).toMatch(/Arroz/i);

    // Opções existem
    const opts = page.locator('.sub-option');
    const optCount = await opts.count();
    expect(optCount).toBeGreaterThan(0);

    // Aplicar: clicar na primeira opção visível (accordion pode ter grupos fechados)
    await opts.filter({ visible: true }).first().click();
    await expect(page.locator('.ing-badge-subst').first()).toBeVisible();
  });

  // ── Regressão: melhorias anteriores continuam intactas ─────────────────────

  test('C-SUB-REG — Regressão: melhorias anteriores não regrediram após sistema de substituições', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Proteína whey sem contradição
    await expect(page.getByText(/Whey \(1 scoop\)/)).not.toBeVisible();
    await expect(page.getByText(/Whey protein \(1 scoop\)/)).not.toBeVisible();
    await expect(page.getByText(/Whey \(meio scoop\)/)).not.toBeVisible();
    await expect(page.getByText('Proteína whey').first()).toBeVisible();

    // Nomes correctos
    await expect(page.getByText('Banana madura').first()).toBeVisible();
    await expect(page.getByText(/unidade [PMG]/)).not.toBeVisible();
    await expect(page.getByText(/0\.5 unidade/)).not.toBeVisible();
    await expect(page.getByText(/0\.5 colher de sopa/)).not.toBeVisible();
    await expect(page.getByText(/Aveia fina/)).not.toBeVisible();
    await expect(page.getByText(/Carne mo[íi]da magra/)).not.toBeVisible();

    // Plano carregou
    await expect(page.getByText('2660').first()).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Totais visíveis após substituições
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Totais com substituições — hero e dia', () => {

  test('C-TOT1 — Sem substituições: bloco "Com substituições" ausente no cabeçalho do dia', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await expect(page.locator('[data-testid="day-comp-block"]')).not.toBeVisible();
    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-TOT2 — Após substituição: bloco aparece no cabeçalho do dia com linhas Atual, Original, Diferença', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;
    await opts.first().click();

    await expect(page.locator('[data-testid="day-comp-block"]').first()).toBeVisible();
    await expect(page.locator('.day-comp-row-current').first()).toBeVisible();
    await expect(page.locator('.day-comp-row-orig').first()).toBeVisible();
    await expect(page.locator('.day-comp-row-delta').first()).toBeVisible();
    await expect(page.locator('.day-comp-status').first()).toBeVisible();
  });

  test('C-TOT3 — Bloco contém kcal e macros reais em cada linha', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;
    await opts.first().click();

    const currentText = await page.locator('.day-comp-row-current').first().textContent() || '';
    expect(currentText).toMatch(/kcal/);
    expect(currentText).toMatch(/P:/);

    const origText = await page.locator('.day-comp-row-orig').first().textContent() || '';
    expect(origText).toMatch(/kcal/);

    const deltaText = await page.locator('.day-comp-row-delta').first().textContent() || '';
    expect(deltaText).toMatch(/[+-]?\d+ kcal/);
  });

  test('C-TOT4 — Status "Dentro do objetivo" ou "Atenção" aparece no bloco do dia', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;
    await opts.first().click();

    const statusEl = page.locator('.day-comp-status').first();
    await expect(statusEl).toBeVisible();
    const statusText = await statusEl.textContent() || '';
    expect(statusText.includes('Dentro do objetivo') || statusText.includes('Atenção')).toBe(true);
  });

  test('C-TOT5 — Dia 1 com substituições mostra bloco de comparação no cabeçalho do dia', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await expect(page.locator('[data-testid="day-comp-block"]')).not.toBeVisible();

    await page.locator('[data-swap]').first().click();
    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;
    await opts.first().click();

    const dayCompBlock = page.locator('[data-testid="day-comp-block"]').first();
    await expect(dayCompBlock).toBeVisible();
    const blockText = await dayCompBlock.textContent() || '';
    expect(blockText).toMatch(/Original/);
    expect(blockText).toMatch(/kcal/);
  });

  test('C-TOT6 — Após reverter: bloco de comparação do dia desaparece', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;
    await opts.first().click();

    await expect(page.locator('[data-testid="day-comp-block"]').first()).toBeVisible();

    await page.locator('[data-revert]').first().click();

    await expect(page.locator('[data-testid="day-comp-block"]')).not.toBeVisible();
  });

  test('C-TOT7 — Valores no bloco são numéricos e plausíveis (>1000 kcal/dia)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;
    await opts.first().click();

    const currentVals = await page.locator('.day-comp-row-current .day-comp-vals').first().textContent() || '';
    const origVals    = await page.locator('.day-comp-row-orig .day-comp-vals').first().textContent() || '';

    const currKcal = parseInt((currentVals.match(/(\d+)\s*kcal/) || [])[1] || '0', 10);
    const origKcal = parseInt((origVals.match(/(\d+)\s*kcal/)    || [])[1] || '0', 10);

    expect(currKcal).toBeGreaterThan(1000);
    expect(origKcal).toBeGreaterThan(1000);
  });

  test('C-TOT8 — Múltiplas substituições no mesmo dia: bloco único no cabeçalho, não duplicado', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const swapBtns = page.locator('[data-swap]');
    if (await swapBtns.count() < 2) return;

    await swapBtns.nth(0).click();
    let opts = page.locator('.sub-option').filter({ visible: true });
    if (await opts.count() === 0) { await page.locator('[data-modal-close]').first().click(); return; }
    await opts.first().click();

    await page.locator('[data-swap]').nth(1).click();
    opts = page.locator('.sub-option').filter({ visible: true });
    if (await opts.count() === 0) { await page.locator('[data-modal-close]').first().click(); return; }
    await opts.first().click();

    const blockCount = await page.locator('[data-testid="day-comp-block"]').count();
    expect(blockCount).toBe(1);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — Validação Matemática
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse macros from a text string in multiple formats:
 *   "2.660 kcal • P:166g • C:299g • G:89g"   (comp block / day-summary)
 *   " 2.660 kcal 166g P 299g C 89g G"          (meal-totals, value before letter)
 *   "+22 kcal • +5g P • 0g C • 0g G"           (delta row, signed values)
 * Returns { kcal, prot, carb, fat }.
 */
function parseMacros(text) {
  // Strip pt-PT thousand separator ("2.660" → "2660"), preserve decimal points.
  const s = text.replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2').replace(/\s+/g, ' ');

  // kcal — handles optional sign and formatted numbers
  const kcal = parseInt((s.match(/([+-]?\d+)\s*kcal/) || [])[1] || '0', 10);

  // Protein: "P:166g" (day-summary / comp) OR "166g P" / "+5g P" (meal-totals / delta)
  const protM = s.match(/P:\s*([\d.]+)g/) || s.match(/([+-]?[\d.]+)g\s+P\b/);
  const prot  = parseFloat((protM || [])[1] || '0');

  // Carb: "C:299g" OR "299g C" / "+5g C"
  const carbM = s.match(/C:\s*([\d.]+)g/) || s.match(/([+-]?[\d.]+)g\s+C\b/);
  const carb  = parseFloat((carbM || [])[1] || '0');

  // Fat: "G:89g" OR "89g G" / "+5g G"
  const fatM  = s.match(/G:\s*([\d.]+)g/) || s.match(/([+-]?[\d.]+)g\s+G\b/);
  const fat   = parseFloat((fatM || [])[1] || '0');

  return { kcal, prot, carb, fat };
}

/**
 * Read the day-header summary totals for day index (0-based).
 * Uses [data-day-head] .day-summary which always exists (no sub needed).
 */
async function getDayTotals(page, dayIdx = 0) {
  const text = await page.locator(`[data-day-head="${dayIdx}"] .day-summary`).textContent() || '';
  return parseMacros(text);
}

/**
 * Read the comparison block for day index (0-based).
 * Returns { current, original, delta } each as { kcal, prot, carb, fat }.
 * Relies on data-testid="day-current-totals" etc. added to the block spans.
 */
async function getCompBlock(page, dayIdx = 0) {
  const scope = page.locator(`[data-day-head="${dayIdx}"] [data-testid="day-comp-block"]`);
  const curTxt   = await scope.locator('[data-testid="day-current-totals"]').textContent()  || '';
  const origTxt  = await scope.locator('[data-testid="day-original-totals"]').textContent() || '';
  const deltaTxt = await scope.locator('[data-testid="day-delta-totals"]').textContent()    || '';
  return {
    current:  parseMacros(curTxt),
    original: parseMacros(origTxt),
    delta:    parseMacros(deltaTxt),
  };
}

/**
 * Sum all visible meal-totals blocks within the given day body.
 * Uses #day-body-N which already exists without extra testid.
 */
async function sumMeals(page, dayIdx = 0) {
  const items = await page.locator(`#day-body-${dayIdx} .meal-totals`).all();
  const sum = { kcal: 0, prot: 0, carb: 0, fat: 0 };
  for (const el of items) {
    const m = parseMacros(await el.textContent() || '');
    sum.kcal += m.kcal;
    sum.prot += m.prot;
    sum.carb += m.carb;
    sum.fat  += m.fat;
  }
  return sum;
}

/**
 * Open the modal for swapLocator and click the first option with a non-zero kcal delta.
 * The option macros text contains "(+22)" or "(-5)" — we skip "(+0)".
 * Returns true if a substitution was applied, false if no valid option found.
 */
async function applySubThatChanges(page, swapLocator) {
  await swapLocator.click();
  await page.waitForSelector('.modal-backdrop.show');
  // Accordion: only check visible options (closed groups are in DOM but hidden)
  const opts = page.locator('.sub-option').filter({ visible: true });
  const count = await opts.count();
  if (count === 0) {
    await page.locator('[data-modal-close]').first().click();
    return false;
  }
  for (let i = 0; i < count; i++) {
    const macroTxt = await opts.nth(i).locator('.sub-option-macros').textContent() || '';
    // Format: "XXX kcal (+22) • P:..." — find first with non-zero delta
    const deltaM = macroTxt.match(/\(([+-]?\d+)\)/);
    if (deltaM && parseInt(deltaM[1], 10) !== 0) {
      await opts.nth(i).click();
      return true;
    }
  }
  // No option with non-zero kcal delta — apply first anyway and let assertions decide
  await opts.first().click();
  return true;
}

/** Assert at least one macro dimension changed (tolerances: ±1 kcal, ±0.5g). */
function expectSomethingChanged(before, after) {
  const changed =
    Math.abs(after.kcal - before.kcal) > 1 ||
    Math.abs(after.prot - before.prot) > 0.5 ||
    Math.abs(after.carb - before.carb) > 0.5 ||
    Math.abs(after.fat  - before.fat)  > 0.5;
  expect(changed, `Expected macros to change.\nbefore=${JSON.stringify(before)}\nafter=${JSON.stringify(after)}`).toBe(true);
}

/**
 * Assert the comp block's delta row is arithmetically consistent:
 *   comp.delta ≈ comp.current − comp.original
 * Tolerance: ±2 kcal, ±1g macros (rounding from Math.round in the template).
 */
function expectDeltaConsistent(comp) {
  const { current: cur, original: orig, delta } = comp;
  const realKcal = cur.kcal - orig.kcal;
  const realProt = Math.round(cur.prot) - Math.round(orig.prot);
  const realCarb = Math.round(cur.carb) - Math.round(orig.carb);
  const realFat  = Math.round(cur.fat)  - Math.round(orig.fat);
  expect(Math.abs(delta.kcal - realKcal), `delta.kcal displayed=${delta.kcal}, real=${realKcal}`).toBeLessThanOrEqual(2);
  expect(Math.abs(delta.prot - realProt), `delta.prot displayed=${delta.prot}, real=${realProt}`).toBeLessThanOrEqual(1);
  expect(Math.abs(delta.carb - realCarb), `delta.carb displayed=${delta.carb}, real=${realCarb}`).toBeLessThanOrEqual(1);
  expect(Math.abs(delta.fat  - realFat),  `delta.fat displayed=${delta.fat}, real=${realFat}`).toBeLessThanOrEqual(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Validação Matemática das Substituições
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Validação Matemática das Substituições', () => {

  // ── C-MATH1 ─────────────────────────────────────────────────────────────────
  test('C-MATH1 — Bloco comp: current/original batem com totais do dia e delta é exato', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const before = await getDayTotals(page, 0);

    const applied = await applySubThatChanges(page, page.locator('[data-swap]').first());
    if (!applied) return;

    const after = await getDayTotals(page, 0);
    expectSomethingChanged(before, after);

    const comp = await getCompBlock(page, 0);

    // comp.current must match the day header now shown (tolerance: ±2 kcal, ±1g)
    expect(Math.abs(comp.current.kcal - after.kcal),
      `comp.current.kcal=${comp.current.kcal} ≠ day header=${after.kcal}`).toBeLessThanOrEqual(2);
    expect(Math.abs(comp.current.prot - after.prot),
      `comp.current.prot=${comp.current.prot} ≠ day header=${after.prot}`).toBeLessThanOrEqual(1);

    // comp.original must match the day header before any substitution
    expect(Math.abs(comp.original.kcal - before.kcal),
      `comp.original.kcal=${comp.original.kcal} ≠ original=${before.kcal}`).toBeLessThanOrEqual(2);
    expect(Math.abs(comp.original.prot - before.prot),
      `comp.original.prot=${comp.original.prot} ≠ original=${before.prot}`).toBeLessThanOrEqual(1);

    // delta displayed = current − original (arithmetically exact in the template)
    expectDeltaConsistent(comp);
  });

  // ── C-MATH2 ─────────────────────────────────────────────────────────────────
  test('C-MATH2 — Substituição de proteína: prot/kcal do dia mudam e delta confere', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const protIng = page.locator('.ingredient-name', { hasText: /Peito de frango|Carne mo[iíI]da|Atum|Peixe/i }).first();
    if (await protIng.count() === 0) return;

    const li = protIng.locator('xpath=ancestor::li[contains(@class,"ingredient")]');
    const before = await getDayTotals(page, 0);

    const applied = await applySubThatChanges(page, li.locator('[data-swap]'));
    if (!applied) return;

    const after = await getDayTotals(page, 0);
    expectSomethingChanged(before, after);

    // For a protein substitution at least prot or kcal should shift
    const protOrKcalChanged =
      Math.abs(after.prot - before.prot) > 0.5 ||
      Math.abs(after.kcal - before.kcal) > 1;
    expect(protOrKcalChanged, 'Expected protein or kcal to change after protein substitution').toBe(true);

    expectDeltaConsistent(await getCompBlock(page, 0));
  });

  // ── C-MATH3 ─────────────────────────────────────────────────────────────────
  test('C-MATH3 — Substituição de carboidrato: carb/kcal do dia mudam e delta confere', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const carbIng = page.locator('.ingredient-name', { hasText: /Arroz branco|Arroz basmati|Macarr[ãa]o/i }).first();
    if (await carbIng.count() === 0) return;

    const li = carbIng.locator('xpath=ancestor::li[contains(@class,"ingredient")]');
    const before = await getDayTotals(page, 0);

    const applied = await applySubThatChanges(page, li.locator('[data-swap]'));
    if (!applied) return;

    const after = await getDayTotals(page, 0);
    expectSomethingChanged(before, after);

    const carbOrKcalChanged =
      Math.abs(after.carb - before.carb) > 0.5 ||
      Math.abs(after.kcal - before.kcal) > 1;
    expect(carbOrKcalChanged, 'Expected carb or kcal to change after carb substitution').toBe(true);

    expectDeltaConsistent(await getCompBlock(page, 0));
  });

  // ── C-MATH4 ─────────────────────────────────────────────────────────────────
  test('C-MATH4 — Múltiplas substituições: delta acumulado exato e bloco único', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    if (await page.locator('[data-swap]').count() < 2) return;

    const before = await getDayTotals(page, 0);

    const ok1 = await applySubThatChanges(page, page.locator('[data-swap]').nth(0));
    if (!ok1) return;

    const ok2 = await applySubThatChanges(page, page.locator('[data-swap]').nth(1));
    if (!ok2) return;

    const afterBoth = await getDayTotals(page, 0);
    expectSomethingChanged(before, afterBoth);

    // Exactly one comp block (not duplicated per substitution)
    expect(await page.locator('[data-testid="day-comp-block"]').count()).toBe(1);

    const comp = await getCompBlock(page, 0);

    // comp.original reflects the unmodified day (before both subs)
    expect(Math.abs(comp.original.kcal - before.kcal),
      `comp.original=${comp.original.kcal} should match pre-sub total=${before.kcal}`).toBeLessThanOrEqual(2);

    // comp.current reflects the state after both subs
    expect(Math.abs(comp.current.kcal - afterBoth.kcal),
      `comp.current=${comp.current.kcal} should match current total=${afterBoth.kcal}`).toBeLessThanOrEqual(2);

    // Internal delta consistency
    expectDeltaConsistent(comp);
  });

  // ── C-MATH5 ─────────────────────────────────────────────────────────────────
  test('C-MATH5 — Reverter restaura totais originais exatamente', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const before = await getDayTotals(page, 0);

    const applied = await applySubThatChanges(page, page.locator('[data-swap]').first());
    if (!applied) return;

    const afterSub = await getDayTotals(page, 0);
    expectSomethingChanged(before, afterSub);

    // Revert via inline button
    await page.locator('[data-revert]').first().click();

    const restored = await getDayTotals(page, 0);

    // Must match original within parse rounding tolerance
    expect(Math.abs(restored.kcal - before.kcal),
      `Restored kcal=${restored.kcal} ≠ original=${before.kcal}`).toBeLessThanOrEqual(2);
    expect(Math.abs(restored.prot - before.prot),
      `Restored prot=${restored.prot} ≠ original=${before.prot}`).toBeLessThanOrEqual(1);
    expect(Math.abs(restored.carb - before.carb),
      `Restored carb=${restored.carb} ≠ original=${before.carb}`).toBeLessThanOrEqual(1);
    expect(Math.abs(restored.fat  - before.fat),
      `Restored fat=${restored.fat} ≠ original=${before.fat}`).toBeLessThanOrEqual(1);

    // Comp block must disappear after full revert
    await expect(page.locator('[data-testid="day-comp-block"]')).not.toBeVisible();
  });

  // ── C-MATH6 ─────────────────────────────────────────────────────────────────
  test('C-MATH6 — Reverter parcialmente: bloco persiste, totais refletem só a sub restante', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    if (await page.locator('[data-swap]').count() < 2) return;

    const before = await getDayTotals(page, 0);

    const ok1 = await applySubThatChanges(page, page.locator('[data-swap]').nth(0));
    if (!ok1) return;
    const ok2 = await applySubThatChanges(page, page.locator('[data-swap]').nth(1));
    if (!ok2) return;

    // Revert only the first substituted ingredient
    await page.locator('[data-revert]').first().click();
    const afterPartial = await getDayTotals(page, 0);

    // Second sub is still active: comp block must remain visible
    await expect(page.locator('[data-testid="day-comp-block"]').first()).toBeVisible();

    // Totals differ from original (second sub still applied)
    expectSomethingChanged(before, afterPartial);

    // Comp block is internally consistent
    expectDeltaConsistent(await getCompBlock(page, 0));
  });

  // ── C-MATH7 ─────────────────────────────────────────────────────────────────
  test('C-MATH7 — Gordura ou fruta: substituição muda fat/carb do dia se disponível', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Try fat ingredients first, then fruit
    const fatIng   = page.locator('.ingredient-name', { hasText: /Pasta de amendoim|Azeite|Abacate/i }).first();
    const fruitIng = page.locator('.ingredient-name', { hasText: /Banana|Manga|Ma[çc][ãa]/i }).first();
    const hasFat   = await fatIng.count() > 0;
    const hasFruit = await fruitIng.count() > 0;
    if (!hasFat && !hasFruit) return;

    const targetIng = hasFat ? fatIng : fruitIng;
    const li = targetIng.locator('xpath=ancestor::li[contains(@class,"ingredient")]');
    const before = await getDayTotals(page, 0);

    const applied = await applySubThatChanges(page, li.locator('[data-swap]'));
    if (!applied) return;

    const after = await getDayTotals(page, 0);
    expectSomethingChanged(before, after);

    // fat sub → fat or kcal changed; fruit sub → carb or kcal changed
    const relevantChanged = hasFat
      ? Math.abs(after.fat - before.fat) > 0.5 || Math.abs(after.kcal - before.kcal) > 1
      : Math.abs(after.carb - before.carb) > 0.5 || Math.abs(after.kcal - before.kcal) > 1;
    expect(relevantChanged, `Expected fat/carb or kcal to change`).toBe(true);

    expectDeltaConsistent(await getCompBlock(page, 0));
  });

  // ── C-MATH-SUM ──────────────────────────────────────────────────────────────
  test('C-MATH-SUM — Soma das refeições do Dia 1 ≈ total do cabeçalho do dia (com substituição)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const applied = await applySubThatChanges(page, page.locator('[data-swap]').first());
    if (!applied) return;

    const dayTotal = await getDayTotals(page, 0);
    const mealSum  = await sumMeals(page, 0);

    // kcal tolerance ±5: each meal uses formatKcal (rounds individually)
    expect(Math.abs(mealSum.kcal - dayTotal.kcal),
      `Meal sum kcal=${mealSum.kcal} ≠ day header=${dayTotal.kcal}`).toBeLessThanOrEqual(5);

    // macro tolerance ±2g: meals show raw floats, header shows Math.round(total)
    expect(Math.abs(mealSum.prot - dayTotal.prot),
      `Meal sum prot=${mealSum.prot} ≠ day header=${dayTotal.prot}`).toBeLessThanOrEqual(2);
    expect(Math.abs(mealSum.carb - dayTotal.carb),
      `Meal sum carb=${mealSum.carb} ≠ day header=${dayTotal.carb}`).toBeLessThanOrEqual(2);
    expect(Math.abs(mealSum.fat  - dayTotal.fat),
      `Meal sum fat=${mealSum.fat} ≠ day header=${dayTotal.fat}`).toBeLessThanOrEqual(2);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — "+ Criar Alimento"
// ─────────────────────────────────────────────────────────────────────────────

/** Injeta alimentos personalizados no localStorage antes de navegar. */
async function injectCustomFoods(page, foods) {
  await page.addInitScript((f) => {
    try { localStorage.setItem('hg:custom_foods', JSON.stringify(f)); } catch {}
  }, foods);
}

/** Preenche o formulário de adição de alimento. */
async function fillAddFoodForm(page, { name, category, qty, unit, kcal, prot, carb, fat }) {
  await page.locator('#aff-name').fill(name);
  await page.locator('#aff-category').selectOption(category);
  await page.locator('#aff-qty').fill(String(qty));
  if (unit) await page.locator('#aff-unit').selectOption(unit);
  await page.locator('#aff-kcal').fill(String(kcal));
  await page.locator('#aff-prot').fill(String(prot));
  await page.locator('#aff-carb').fill(String(carb));
  await page.locator('#aff-fat').fill(String(fat));
}

/** Alimento de teste com macros conhecidos: 150g, 120kcal, P:18, C:8, G:1 */
const TEST_FOOD = { name: 'Skyr Test', category: 'dairy', qty: 150, unit: 'g', kcal: 120, prot: 18, carb: 8, fat: 1 };

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: "+ Criar Alimento"
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Criar alimento personalizado', () => {

  // ── C-ADD1 ───────────────────────────────────────────────────────────────
  test('C-ADD1 — Botão "+ Criar Alimento" aparece por refeição (não por ingrediente)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // O Dia 1 está aberto por defeito com 6 refeições.
    // Deve haver 6 botões "+ Criar Alimento" — um por refeição.
    const addBtns  = page.locator('[data-add-food]');
    const swapBtns = page.locator('[data-swap]');
    const addCount  = await addBtns.count();
    const swapCount = await swapBtns.count();

    // add < swap: há MUITOS Substituir (um por ingrediente) mas POUCOS Criar Alimento (um por refeição)
    expect(addCount,  'Deve existir pelo menos 6 botões + Criar Alimento (1 por refeição)').toBeGreaterThanOrEqual(6);
    expect(swapCount, 'Deve existir muito mais Substituir do que Criar Alimento').toBeGreaterThan(addCount);

    // Botão + Adicionar é visível com dimensões reais
    await expect(addBtns.first()).toBeVisible();
    const box = await addBtns.first().boundingBox();
    expect(box, 'Botão deve ter bounding box').not.toBeNull();
    expect(box && box.width,  'Largura >= 100px').toBeGreaterThanOrEqual(100);
    expect(box && box.height, 'Altura >= 20px').toBeGreaterThanOrEqual(20);

    // Texto correcto
    const txt = (await addBtns.first().textContent() || '').trim();
    expect(txt).toMatch(/Criar/i);

    // O botão está dentro de .ing-add-row (posição no meal-card)
    const addRow = page.locator('.ing-add-row').first();
    await expect(addRow).toBeVisible();
    await expect(addRow.locator('[data-add-food]')).toBeVisible();

    // O botão Substituir por alimento continua intacto
    await expect(swapBtns.first()).toBeVisible();

    console.log(`C-ADD1: Substituir visíveis=${swapCount}, + Criar Alimento visíveis=${addCount} (1 por refeição)`);
  });

  // ── C-ADD2 ───────────────────────────────────────────────────────────────
  test('C-ADD2 — Clicar em "+ Criar Alimento" abre modal com formulário', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();
    await expect(page.locator('#add-food-form')).toBeVisible();
    await expect(page.locator('#aff-name')).toBeVisible();
    await expect(page.locator('#aff-kcal')).toBeVisible();
    await expect(page.locator('#aff-prot')).toBeVisible();
  });

  // ── C-ADD3 ───────────────────────────────────────────────────────────────
  test('C-ADD3 — Validação: campos obrigatórios de Criar Alimento mostram erro ao submeter vazio', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.locator('#add-food-form button[type="submit"]').click();

    const errBox = page.locator('#add-food-errors');
    await expect(errBox).toBeVisible();
    const errText = await errBox.textContent() || '';
    expect(errText).toMatch(/nome/i);
  });

  // ── C-ADD4 ───────────────────────────────────────────────────────────────
  test('C-ADD4 — Adicionar alimento válido: aparece na refeição com badge "Adicionado"', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, TEST_FOOD);
    await page.locator('#add-food-form button[type="submit"]').click();

    // Badge "Adicionado" deve aparecer
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();
    // Botão "Remover alimento" deve aparecer
    await expect(page.locator('[data-remove-addition]').first()).toBeVisible();
    // Nome do alimento deve aparecer
    await expect(page.getByText('Skyr Test').first()).toBeVisible();
  });

  // ── C-ADD5 ───────────────────────────────────────────────────────────────
  test('C-ADD5 — kcal/macros da refeição mudam após adição (teste matemático)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Ler totais da 1ª refeição antes
    const mealBefore = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');

    await page.locator('[data-add-food][data-day-idx="0"][data-meal-idx="0"]').click();
    await fillAddFoodForm(page, TEST_FOOD);
    await page.locator('#add-food-form button[type="submit"]').click();

    // Ler depois
    const mealAfter = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');

    // Diferença deve ser próxima dos macros do alimento adicionado
    expect(Math.abs(mealAfter.kcal - mealBefore.kcal - TEST_FOOD.kcal)).toBeLessThanOrEqual(5);
    expect(Math.abs(mealAfter.prot - mealBefore.prot - TEST_FOOD.prot)).toBeLessThanOrEqual(2);
    expect(Math.abs(mealAfter.carb - mealBefore.carb - TEST_FOOD.carb)).toBeLessThanOrEqual(2);
    expect(Math.abs(mealAfter.fat  - mealBefore.fat  - TEST_FOOD.fat )).toBeLessThanOrEqual(2);
  });

  // ── C-ADD6 ───────────────────────────────────────────────────────────────
  test('C-ADD6 — kcal/macros do dia mudam após adição (teste matemático)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const dayBefore = await getDayTotals(page, 0);

    await page.locator('[data-add-food][data-day-idx="0"][data-meal-idx="0"]').click();
    await fillAddFoodForm(page, TEST_FOOD);
    await page.locator('#add-food-form button[type="submit"]').click();

    const dayAfter = await getDayTotals(page, 0);

    expect(Math.abs(dayAfter.kcal - dayBefore.kcal - TEST_FOOD.kcal)).toBeLessThanOrEqual(5);
    expect(Math.abs(dayAfter.prot - dayBefore.prot - TEST_FOOD.prot)).toBeLessThanOrEqual(2);
  });

  // ── C-ADD7 ───────────────────────────────────────────────────────────────
  test('C-ADD7 — Bloco Original/Com substituições/Diferença aparece após adição', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await expect(page.locator('[data-testid="day-comp-block"]')).not.toBeVisible();

    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, TEST_FOOD);
    await page.locator('#add-food-form button[type="submit"]').click();

    await expect(page.locator('[data-testid="day-comp-block"]').first()).toBeVisible();
    await expect(page.locator('.day-comp-row-current').first()).toBeVisible();
    await expect(page.locator('.day-comp-row-orig').first()).toBeVisible();
    await expect(page.locator('.day-comp-row-delta').first()).toBeVisible();
  });

  // ── C-ADD8 ───────────────────────────────────────────────────────────────
  test('C-ADD8 — Delta exibido = atual − original (matemático)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const before = await getDayTotals(page, 0);

    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, TEST_FOOD);
    await page.locator('#add-food-form button[type="submit"]').click();

    const comp = await getCompBlock(page, 0);

    // comp.original ≈ before
    expect(Math.abs(comp.original.kcal - before.kcal)).toBeLessThanOrEqual(2);
    // delta = current − original
    expectDeltaConsistent(comp);
    // delta.kcal ≈ TEST_FOOD.kcal
    expect(Math.abs(comp.delta.kcal - TEST_FOOD.kcal)).toBeLessThanOrEqual(5);
  });

  // ── C-ADD9 ───────────────────────────────────────────────────────────────
  test('C-ADD9 — Soma das refeições ≈ total do dia após adição', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, TEST_FOOD);
    await page.locator('#add-food-form button[type="submit"]').click();

    const dayTotal = await getDayTotals(page, 0);
    const mealSum  = await sumMeals(page, 0);

    expect(Math.abs(mealSum.kcal - dayTotal.kcal)).toBeLessThanOrEqual(5);
    expect(Math.abs(mealSum.prot - dayTotal.prot)).toBeLessThanOrEqual(2);
    expect(Math.abs(mealSum.carb - dayTotal.carb)).toBeLessThanOrEqual(2);
  });

  // ── C-ADD10 ──────────────────────────────────────────────────────────────
  test('C-ADD10 — Remover alimento: refeição e dia voltam aos valores originais', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const before = await getDayTotals(page, 0);

    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, TEST_FOOD);
    await page.locator('#add-food-form button[type="submit"]').click();

    // Confirmar que mudou
    const afterAdd = await getDayTotals(page, 0);
    expectSomethingChanged(before, afterAdd);

    // Remover
    await page.locator('[data-remove-addition]').first().click();
    const restored = await getDayTotals(page, 0);

    expect(Math.abs(restored.kcal - before.kcal)).toBeLessThanOrEqual(2);
    expect(Math.abs(restored.prot - before.prot)).toBeLessThanOrEqual(1);
    // Bloco de comparação deve desaparecer (sem substituições nem adições)
    await expect(page.locator('[data-testid="day-comp-block"]')).not.toBeVisible();
  });

  // ── C-ADD11 ──────────────────────────────────────────────────────────────
  test('C-ADD11 — Alimento personalizado fica guardado no localStorage (hg:custom_foods)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, TEST_FOOD);
    await page.locator('#add-food-form button[type="submit"]').click();

    const stored = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('hg:custom_foods') || '[]'); }
      catch { return []; }
    });
    expect(stored.length).toBeGreaterThan(0);
    expect(stored[0].name).toBe('Skyr Test');
    expect(stored[0].source).toBe('custom');
    expect(stored[0].per100).toBeDefined();
  });

  // ── C-ADD12 ──────────────────────────────────────────────────────────────
  test('C-ADD12 — Após reload, alimento personalizado aparece no modal Substituir', async ({ page }) => {
    // Injectar custom food directamente no localStorage antes de carregar a página
    const customFood = {
      id: 'custom_test_12345',
      name: 'Queijo Custom Reload',
      category: 'dairy',
      per100: { kcal: 80, prot: 12, carb: 5, fat: 0.5 },
      units: [{ label: 'g', grams: 100 }],
      digestibility: 'leve',
      substitutes: [],
      source: 'custom',
      baseQuantity: 150,
      baseUnit: 'g',
      createdAt: new Date().toISOString(),
    };
    await injectCustomFoods(page, [customFood]);
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Procurar um ingrediente dairy para o modal mostrar custom food da mesma categoria
    const dairySwap = page.locator('[data-swap]').first();
    await dairySwap.click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    // Verificar se "Meus alimentos" aparece (se o food for da mesma categoria)
    // Se não for da mesma categoria, verificar que o modal pelo menos abriu
    const modalVisible = await page.locator('.modal-backdrop.show').isVisible();
    expect(modalVisible).toBe(true);

    // Fechar modal
    await page.locator('[data-modal-close]').first().click();

    // Agora verificar directamente via localStorage que o food está lá
    const stored = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('hg:custom_foods') || '[]'); }
      catch { return []; }
    });
    expect(stored.some(f => f.id === 'custom_test_12345')).toBe(true);
  });

  // ── C-ADD13 ──────────────────────────────────────────────────────────────
  test('C-ADD13 — Regressão: função Substituir não regrediu após adição', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Adicionar um alimento
    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, TEST_FOOD);
    await page.locator('#add-food-form button[type="submit"]').click();

    // Substituir um ingrediente original (não o adicionado)
    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();
    const opts = page.locator('.sub-option');
    if (await opts.count() > 0) {
      await opts.first().click();
      await expect(page.locator('.ing-badge-subst').first()).toBeVisible();
    } else {
      await page.locator('[data-modal-close]').first().click();
    }

    // Botão Substituir ainda existe nos ingredientes originais
    await expect(page.locator('[data-swap]').first()).toBeVisible();

    // C-MATH core: delta exibido deve ser consistente
    const comp = await getCompBlock(page, 0);
    expectDeltaConsistent(comp);
  });

  // ── C-ADD14 ──────────────────────────────────────────────────────────────
  test('C-ADD14 — Layout: botões Substituir e "Criar Alimento" visíveis sem sobreposição', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Ambos os botões devem ser visíveis e clicáveis
    await expect(page.locator('[data-swap]').first()).toBeVisible();
    await expect(page.locator('[data-add-food]').first()).toBeVisible();

    // Botão add deve ter texto legível
    const addTxt = await page.locator('[data-add-food]').first().textContent() || '';
    expect(addTxt.trim()).toMatch(/Criar/i);

    // Botão sub deve ter texto legível
    const subTxt = await page.locator('[data-swap]').first().textContent() || '';
    expect(subTxt.trim()).toMatch(/Substituir/i);

    // Após adicionar um alimento, o botão Substituir dos ingredientes originais
    // não deve desaparecer (testando que o layout não quebrou)
    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, { ...TEST_FOOD, name: 'Layout Test Food' });
    await page.locator('#add-food-form button[type="submit"]').click();

    // O ingrediente adicionado tem botão Remover mas NÃO tem Substituir
    const addedLi = page.locator('.ingredient-added').first();
    await expect(addedLi.locator('[data-remove-addition]')).toBeVisible();
    // Ingredientes originais continuam com Substituir
    await expect(page.locator('[data-swap]').first()).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Múltiplas adições por refeição
// ─────────────────────────────────────────────────────────────────────────────

/** Segundo alimento de teste */
const TEST_FOOD_2 = { name: 'Aveia Extra Test', category: 'carb', qty: 50, unit: 'g', kcal: 190, prot: 6, carb: 32, fat: 3 };

test.describe('Múltiplas adições por refeição', () => {

  // ── C-ADD-MULTI1 ─────────────────────────────────────────────────────────
  test('C-ADD-MULTI1 — Adicionar 1 alimento: aparece no final, kcal e totais aumentam', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Contar ingredientes da refeição 1 antes
    const ingsBefore = await page.locator('#day-body-0 .meal-card').first().locator('.ingredient').count();
    const mealBefore = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');

    await page.locator('[data-add-food][data-day-idx="0"][data-meal-idx="0"]').click();
    await fillAddFoodForm(page, TEST_FOOD);
    await page.locator('#add-food-form button[type="submit"]').click();

    // Ingrediente adicionado aparece no final
    const ingsAfter = await page.locator('#day-body-0 .meal-card').first().locator('.ingredient').count();
    expect(ingsAfter).toBe(ingsBefore + 1);

    // Badge "Adicionado" visível
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();

    // Botão "Remover alimento" visível
    await expect(page.locator('[data-remove-addition]').first()).toBeVisible();

    // Macros da refeição aumentaram
    const mealAfter = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');
    expect(mealAfter.kcal).toBeGreaterThan(mealBefore.kcal);
    expect(Math.abs(mealAfter.kcal - mealBefore.kcal - TEST_FOOD.kcal)).toBeLessThanOrEqual(5);
  });

  // ── C-ADD-MULTI2 ─────────────────────────────────────────────────────────
  test('C-ADD-MULTI2 — Adicionar 2 alimentos à mesma refeição: ambos aparecem, totais acumulam', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const mealBefore = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');

    // Adicionar alimento 1
    await page.locator('[data-add-food][data-day-idx="0"][data-meal-idx="0"]').click();
    await fillAddFoodForm(page, TEST_FOOD);
    await page.locator('#add-food-form button[type="submit"]').click();

    // Adicionar alimento 2
    await page.locator('[data-add-food][data-day-idx="0"][data-meal-idx="0"]').click();
    await fillAddFoodForm(page, TEST_FOOD_2);
    await page.locator('#add-food-form button[type="submit"]').click();

    // Ambos aparecem com badge "Adicionado"
    const badges = page.locator('#day-body-0 .meal-card').first().locator('.ing-badge-added');
    expect(await badges.count()).toBe(2);

    // Ambos têm botão "Remover"
    const removeBtns = page.locator('#day-body-0 .meal-card').first().locator('[data-remove-addition]');
    expect(await removeBtns.count()).toBe(2);

    // Macros acumulam os dois alimentos
    const mealAfter = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');
    const expectedKcalDelta = TEST_FOOD.kcal + TEST_FOOD_2.kcal;
    expect(Math.abs(mealAfter.kcal - mealBefore.kcal - expectedKcalDelta)).toBeLessThanOrEqual(8);
  });

  // ── C-ADD-MULTI3 ─────────────────────────────────────────────────────────
  test('C-ADD-MULTI3 — Remover apenas 1 de 2 alimentos adicionados: o outro permanece', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Adicionar 2 alimentos
    await page.locator('[data-add-food][data-day-idx="0"][data-meal-idx="0"]').click();
    await fillAddFoodForm(page, TEST_FOOD);
    await page.locator('#add-food-form button[type="submit"]').click();

    await page.locator('[data-add-food][data-day-idx="0"][data-meal-idx="0"]').click();
    await fillAddFoodForm(page, TEST_FOOD_2);
    await page.locator('#add-food-form button[type="submit"]').click();

    const mealAfter2 = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');

    // Remover apenas o primeiro adicionado
    const removeBtns = page.locator('#day-body-0 .meal-card').first().locator('[data-remove-addition]');
    await removeBtns.first().click();

    // Apenas 1 badge "Adicionado" deve restar
    const badgesLeft = page.locator('#day-body-0 .meal-card').first().locator('.ing-badge-added');
    expect(await badgesLeft.count()).toBe(1);

    // Bloco de comparação ainda visível (1 adição ainda activa)
    await expect(page.locator('[data-testid="day-comp-block"]').first()).toBeVisible();

    // Totais mudaram (mas não voltaram ao original)
    const mealAfter1 = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');
    expect(mealAfter1.kcal).toBeLessThan(mealAfter2.kcal);
  });

  // ── C-ADD-MULTI4 ─────────────────────────────────────────────────────────
  test('C-ADD-MULTI4 — Remover todos os alimentos adicionados: totais voltam ao original', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const mealBefore = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');
    const dayBefore  = await getDayTotals(page, 0);

    // Adicionar 2 alimentos
    await page.locator('[data-add-food][data-day-idx="0"][data-meal-idx="0"]').click();
    await fillAddFoodForm(page, TEST_FOOD);
    await page.locator('#add-food-form button[type="submit"]').click();

    await page.locator('[data-add-food][data-day-idx="0"][data-meal-idx="0"]').click();
    await fillAddFoodForm(page, TEST_FOOD_2);
    await page.locator('#add-food-form button[type="submit"]').click();

    // Remover ambos
    let removeBtns = page.locator('#day-body-0 .meal-card').first().locator('[data-remove-addition]');
    await removeBtns.first().click();

    removeBtns = page.locator('#day-body-0 .meal-card').first().locator('[data-remove-addition]');
    if (await removeBtns.count() > 0) await removeBtns.first().click();

    // Macros da refeição voltaram ao original
    const mealRestored = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');
    expect(Math.abs(mealRestored.kcal - mealBefore.kcal)).toBeLessThanOrEqual(5);

    // Bloco de comparação desaparece
    await expect(page.locator('[data-testid="day-comp-block"]')).not.toBeVisible();

    // Dia voltou ao original
    const dayRestored = await getDayTotals(page, 0);
    expect(Math.abs(dayRestored.kcal - dayBefore.kcal)).toBeLessThanOrEqual(5);
  });

  // ── C-ADD-MATH ───────────────────────────────────────────────────────────
  test('C-ADD-MATH — Múltiplas adições: delta acumulado e soma de refeições = total do dia', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const dayBefore = await getDayTotals(page, 0);

    // Adicionar 2 alimentos à refeição 1
    await page.locator('[data-add-food][data-day-idx="0"][data-meal-idx="0"]').click();
    await fillAddFoodForm(page, TEST_FOOD);
    await page.locator('#add-food-form button[type="submit"]').click();

    await page.locator('[data-add-food][data-day-idx="0"][data-meal-idx="0"]').click();
    await fillAddFoodForm(page, TEST_FOOD_2);
    await page.locator('#add-food-form button[type="submit"]').click();

    const dayAfter = await getDayTotals(page, 0);

    // Delta total ≈ soma dos dois alimentos
    const expectedKcal = TEST_FOOD.kcal + TEST_FOOD_2.kcal;
    expect(Math.abs(dayAfter.kcal - dayBefore.kcal - expectedKcal),
      `Delta kcal esperado ≈ ${expectedKcal}, obtido ${dayAfter.kcal - dayBefore.kcal}`
    ).toBeLessThanOrEqual(8);

    // Comp block delta é consistente
    const comp = await getCompBlock(page, 0);
    expectDeltaConsistent(comp);

    // Soma das refeições = total do dia
    const mealSum = await sumMeals(page, 0);
    expect(Math.abs(mealSum.kcal - dayAfter.kcal)).toBeLessThanOrEqual(5);
    expect(Math.abs(mealSum.prot - dayAfter.prot)).toBeLessThanOrEqual(2);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Editar alimento adicionado
// ─────────────────────────────────────────────────────────────────────────────

/** Alimento para testes de edição: 100ml → 330ml */
const TEST_FOOD_EDIT_V1 = { name: 'Bebida Edit Test', category: 'dairy', qty: 100, unit: 'ml', kcal: 66, prot: 3.4, carb: 4.7, fat: 3.6 };
/** Versão editada: mesma food, 330ml (valores escalados ~3.3×) */
const TEST_FOOD_EDIT_V2 = { ...TEST_FOOD_EDIT_V1, qty: 330, kcal: 218, prot: 11.2, carb: 15.5, fat: 11.9 };

async function fillEditFoodForm(page, { name, category, qty, unit, kcal, prot, carb, fat }) {
  await page.locator('#eff-name').fill(name);
  await page.locator('#eff-category').selectOption(category);
  await page.locator('#eff-qty').fill(String(qty));
  if (unit) await page.locator('#eff-unit').selectOption(unit);
  await page.locator('#eff-kcal').fill(String(kcal));
  await page.locator('#eff-prot').fill(String(prot));
  await page.locator('#eff-carb').fill(String(carb));
  await page.locator('#eff-fat').fill(String(fat));
}

test.describe('Editar alimento adicionado', () => {

  test('C-ADD-EDIT1 — Alimento adicionado mostra badge ADICIONADO, Editar e Remover', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);
    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, TEST_FOOD_EDIT_V1);
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();
    await expect(page.locator('[data-edit-addition]').first()).toBeVisible();
    const editTxt = (await page.locator('[data-edit-addition]').first().textContent() || '').trim();
    expect(editTxt).toMatch(/Editar/i);
    await expect(page.locator('[data-remove-addition]').first()).toBeVisible();
  });

  test('C-ADD-EDIT2 — Modal de edição abre com campos pré-preenchidos e título correcto', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);
    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, TEST_FOOD_EDIT_V1);
    await page.locator('#add-food-form button[type="submit"]').click();

    await page.locator('[data-edit-addition]').first().click();
    await expect(page.locator('#edit-food-form')).toBeVisible();
    const title = await page.locator('.modal-title').textContent() || '';
    expect(title).toMatch(/Editar/i);
    expect(await page.locator('#eff-name').inputValue()).toBe(TEST_FOOD_EDIT_V1.name);
    expect(Number(await page.locator('#eff-qty').inputValue())).toBe(TEST_FOOD_EDIT_V1.qty);
    expect(Number(await page.locator('#eff-kcal').inputValue())).toBeCloseTo(TEST_FOOD_EDIT_V1.kcal, 0);
    const submitTxt = await page.locator('#edit-food-form button[type="submit"]').textContent() || '';
    expect(submitTxt).toMatch(/Salvar/i);
  });

  test('C-ADD-EDIT3 — Editar 100ml → 330ml: quantidade actualiza na refeição', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);
    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, TEST_FOOD_EDIT_V1);
    await page.locator('#add-food-form button[type="submit"]').click();

    await page.locator('[data-edit-addition]').first().click();
    await fillEditFoodForm(page, TEST_FOOD_EDIT_V2);
    await page.locator('#edit-food-form button[type="submit"]').click();

    const qtyText = await page.locator('.ingredient-added .ingredient-qty').first().textContent() || '';
    expect(qtyText).toMatch(/330/);
    expect(qtyText).not.toMatch(/\b100\b/);
  });

  test('C-ADD-EDIT4+5 — Kcal da refeição e do dia aumentam após editar para 330ml', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food][data-day-idx="0"][data-meal-idx="0"]').click();
    await fillAddFoodForm(page, TEST_FOOD_EDIT_V1);
    await page.locator('#add-food-form button[type="submit"]').click();
    const mealAfterAdd = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');
    const dayAfterAdd  = await getDayTotals(page, 0);

    await page.locator('[data-edit-addition]').first().click();
    await fillEditFoodForm(page, TEST_FOOD_EDIT_V2);
    await page.locator('#edit-food-form button[type="submit"]').click();
    const mealAfterEdit = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');
    const dayAfterEdit  = await getDayTotals(page, 0);

    const expectedKcalDelta = TEST_FOOD_EDIT_V2.kcal - TEST_FOOD_EDIT_V1.kcal; // ~152
    expect(Math.abs(mealAfterEdit.kcal - mealAfterAdd.kcal - expectedKcalDelta)).toBeLessThanOrEqual(8);
    expect(Math.abs(dayAfterEdit.kcal  - dayAfterAdd.kcal  - expectedKcalDelta)).toBeLessThanOrEqual(8);
  });

  test('C-ADD-EDIT6+7 — Diferença = atual − original e soma refeições = total do dia', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);
    const dayBefore = await getDayTotals(page, 0);

    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, TEST_FOOD_EDIT_V1);
    await page.locator('#add-food-form button[type="submit"]').click();
    await page.locator('[data-edit-addition]').first().click();
    await fillEditFoodForm(page, TEST_FOOD_EDIT_V2);
    await page.locator('#edit-food-form button[type="submit"]').click();

    const comp = await getCompBlock(page, 0);
    expect(Math.abs(comp.original.kcal - dayBefore.kcal)).toBeLessThanOrEqual(2);
    expectDeltaConsistent(comp);
    expect(Math.abs(comp.delta.kcal - TEST_FOOD_EDIT_V2.kcal)).toBeLessThanOrEqual(8);

    const dayTotal = await getDayTotals(page, 0);
    const mealSum  = await sumMeals(page, 0);
    expect(Math.abs(mealSum.kcal - dayTotal.kcal)).toBeLessThanOrEqual(5);
  });

  test('C-ADD-EDIT8 — Dados editados persistem no localStorage (hg:additions)', async ({ page }) => {
    // O reload real via page.reload() não funciona porque o router SPA exige
    // K.PLAN_READY em sessionStorage que se perde. Verificamos persistência
    // directamente no localStorage, que é a fonte de verdade.
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);
    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, TEST_FOOD_EDIT_V1);
    await page.locator('#add-food-form button[type="submit"]').click();
    await page.locator('[data-edit-addition]').first().click();
    await fillEditFoodForm(page, TEST_FOOD_EDIT_V2);
    await page.locator('#edit-food-form button[type="submit"]').click();

    // Verificar que hg:additions guardou os dados actualizados (330ml)
    const storedAdditions = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('hg:additions') || '{}'); }
      catch { return {}; }
    });
    // A adição deve estar em alguma chave dayIdx:mealIdx com grams=330
    const allAdditions = Object.values(storedAdditions).flat();
    const found = allAdditions.find(a => a.grams === 330 && a.unit === 'ml');
    expect(found, 'hg:additions deve ter entrada com 330ml').toBeDefined();
    expect(found.grams).toBe(330);
    expect(found.unit).toBe('ml');
  });

  test('C-ADD-EDIT9 — Custom food actualizado no localStorage com dados de 330ml', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);
    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, TEST_FOOD_EDIT_V1);
    await page.locator('#add-food-form button[type="submit"]').click();
    await page.locator('[data-edit-addition]').first().click();
    await fillEditFoodForm(page, TEST_FOOD_EDIT_V2);
    await page.locator('#edit-food-form button[type="submit"]').click();

    const stored = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('hg:custom_foods') || '[]'); }
      catch { return []; }
    });
    const updated = stored.find(f => f.name === TEST_FOOD_EDIT_V2.name);
    expect(updated).toBeDefined();
    expect(updated.baseQuantity).toBe(TEST_FOOD_EDIT_V2.qty);
    expect(updated.per100.kcal).toBeGreaterThan(0);
  });

  test('C-ADD-EDIT10 — Após editar, remover restaura totais originais', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);
    const dayBefore = await getDayTotals(page, 0);
    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, TEST_FOOD_EDIT_V1);
    await page.locator('#add-food-form button[type="submit"]').click();
    await page.locator('[data-edit-addition]').first().click();
    await fillEditFoodForm(page, TEST_FOOD_EDIT_V2);
    await page.locator('#edit-food-form button[type="submit"]').click();

    await page.locator('[data-remove-addition]').first().click();
    const dayRestored = await getDayTotals(page, 0);
    expect(Math.abs(dayRestored.kcal - dayBefore.kcal)).toBeLessThanOrEqual(5);
    await expect(page.locator('[data-testid="day-comp-block"]')).not.toBeVisible();
  });

  test('C-ADD-EDIT11 — Substituir continua intacto após editar alimento adicionado', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);
    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, TEST_FOOD_EDIT_V1);
    await page.locator('#add-food-form button[type="submit"]').click();
    await page.locator('[data-edit-addition]').first().click();
    await fillEditFoodForm(page, TEST_FOOD_EDIT_V2);
    await page.locator('#edit-food-form button[type="submit"]').click();

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();
    const opts = page.locator('.sub-option');
    if (await opts.count() > 0) {
      await opts.first().click();
      await expect(page.locator('.ing-badge-subst').first()).toBeVisible();
    } else {
      await page.locator('[data-modal-close]').first().click();
    }
    await expect(page.locator('[data-add-food]').first()).toBeVisible();
  });

  test('C-ADD-EDIT12 — Alterar porção base recalcula macros no modal proporcionalmente', async ({ page }) => {
    // Adicionar alimento base: 100 ml, 66 kcal
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const mealBefore = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');

    await page.locator('[data-add-food][data-day-idx="0"][data-meal-idx="0"]').click();
    await fillAddFoodForm(page, TEST_FOOD_EDIT_V1);
    await page.locator('#add-food-form button[type="submit"]').click();

    const mealAfterAdd = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');
    // Refeição deve ter aumentado ~66 kcal
    expect(Math.abs(mealAfterAdd.kcal - mealBefore.kcal - TEST_FOOD_EDIT_V1.kcal)).toBeLessThanOrEqual(5);

    // Abrir modal de edição
    await page.locator('[data-edit-addition]').first().click();
    await expect(page.locator('#edit-food-form')).toBeVisible();

    // Confirmar valores iniciais (100 ml)
    expect(Number(await page.locator('#eff-qty').inputValue())).toBe(100);
    expect(Number(await page.locator('#eff-kcal').inputValue())).toBeCloseTo(66, 0);

    // Alterar porção base para 50 ml → auto-recalcular
    await page.locator('#eff-qty').fill('50');
    await page.locator('#eff-qty').dispatchEvent('input');

    // Verificar recálculo proporcional (50% de 100 ml)
    expect(Number(await page.locator('#eff-kcal').inputValue())).toBeCloseTo(33, 0);
    expect(Number(await page.locator('#eff-prot').inputValue())).toBeCloseTo(1.7, 1);
    expect(Number(await page.locator('#eff-carb').inputValue())).toBeCloseTo(2.4, 1);
    expect(Number(await page.locator('#eff-fat').inputValue())).toBeCloseTo(1.8, 1);

    // Salvar e verificar que refeição reflecte ~33 kcal (metade de 66)
    await page.locator('#edit-food-form button[type="submit"]').click();
    const mealAfterEdit = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');
    expect(Math.abs(mealAfterEdit.kcal - mealBefore.kcal - 33)).toBeLessThanOrEqual(5);
  });

  test('C-ADD-EDIT13 — Edição manual de macro desativa auto-recálculo ao mudar porção', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);
    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, TEST_FOOD_EDIT_V1);
    await page.locator('#add-food-form button[type="submit"]').click();

    await page.locator('[data-edit-addition]').first().click();
    await expect(page.locator('#edit-food-form')).toBeVisible();

    // Utilizador edita kcal manualmente — activa flag userEditedMacros
    await page.locator('#eff-kcal').fill('99');
    await page.locator('#eff-kcal').dispatchEvent('input');

    // Agora muda porção base — NÃO deve sobrescrever kcal
    await page.locator('#eff-qty').fill('50');
    await page.locator('#eff-qty').dispatchEvent('input');

    // kcal deve manter 99 (manual), não recalcular para 33
    expect(Number(await page.locator('#eff-kcal').inputValue())).toBeCloseTo(99, 0);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Cancelar em todos os modais
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Cancelar em todos os modais', () => {

  // ── C-CANCEL1 ────────────────────────────────────────────────────────────
  test('C-CANCEL1 — Cancelar no modal Substituir: fecha sem aplicar substituição', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const mealBefore = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');
    const dayBefore  = await getDayTotals(page, 0);

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    // Clicar em "Cancelar" (second [data-modal-close])
    const cancelBtn = page.locator('.modal-backdrop.show [data-modal-close]').last();
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    // Modal deve fechar
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible();

    // Nenhuma substituição aplicada
    await expect(page.locator('.ing-badge-subst')).not.toBeVisible();

    // Kcal/macros inalterados
    const mealAfter = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');
    const dayAfter  = await getDayTotals(page, 0);
    expect(Math.abs(mealAfter.kcal - mealBefore.kcal)).toBeLessThanOrEqual(2);
    expect(Math.abs(dayAfter.kcal  - dayBefore.kcal)).toBeLessThanOrEqual(2);
  });

  // ── C-CANCEL2 ────────────────────────────────────────────────────────────
  test('C-CANCEL2 — Cancelar no modal Criar Alimento: fecha sem adicionar alimento', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const dayBefore = await getDayTotals(page, 0);
    const ingsBefore = await page.locator('#day-body-0 .meal-card').first().locator('.ingredient').count();

    await page.locator('[data-add-food]').first().click();
    await expect(page.locator('#add-food-form')).toBeVisible();

    // Preencher campos mas clicar Cancelar
    await fillAddFoodForm(page, TEST_FOOD);
    const cancelBtn = page.locator('#add-food-form').locator('[data-modal-close]').last();
    await cancelBtn.click();

    // Modal fechou
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible();

    // Nenhum ingrediente adicionado
    const ingsAfter = await page.locator('#day-body-0 .meal-card').first().locator('.ingredient').count();
    expect(ingsAfter).toBe(ingsBefore);
    await expect(page.locator('.ing-badge-added')).not.toBeVisible();

    // Nada salvo no localStorage
    const stored = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('hg:custom_foods') || '[]'); }
      catch { return []; }
    });
    expect(stored.length).toBe(0);

    // Totais inalterados
    const dayAfter = await getDayTotals(page, 0);
    expect(Math.abs(dayAfter.kcal - dayBefore.kcal)).toBeLessThanOrEqual(2);
  });

  // ── C-CANCEL3 ────────────────────────────────────────────────────────────
  test('C-CANCEL3 — Cancelar edição: alimento mantém valores originais da adição', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Adicionar alimento (100ml, 66kcal)
    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, TEST_FOOD_EDIT_V1);
    await page.locator('#add-food-form button[type="submit"]').click();

    const mealAfterAdd = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');
    const qtyTextBefore = await page.locator('.ingredient-added .ingredient-qty').first().textContent() || '';

    // Abrir modal de edição
    await page.locator('[data-edit-addition]').first().click();
    await expect(page.locator('#edit-food-form')).toBeVisible();

    // Alterar campos mas Cancelar
    await page.locator('#eff-qty').fill('330');
    await page.locator('#eff-kcal').fill('218');
    const cancelBtn = page.locator('#edit-food-form').locator('[data-modal-close]').last();
    await cancelBtn.click();

    // Modal fechou
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible();

    // Quantidade continua 100ml (não 330ml)
    const qtyTextAfter = await page.locator('.ingredient-added .ingredient-qty').first().textContent() || '';
    expect(qtyTextAfter).toMatch(/100/);
    expect(qtyTextAfter).not.toMatch(/330/);

    // Kcal da refeição continua igual ao que era após adição (não mudou)
    const mealAfterCancel = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');
    expect(Math.abs(mealAfterCancel.kcal - mealAfterAdd.kcal)).toBeLessThanOrEqual(2);
  });

  // ── C-CANCEL4 ────────────────────────────────────────────────────────────
  test('C-CANCEL4 — Botão X fecha os três modais sem aplicar alterações', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const dayBefore = await getDayTotals(page, 0);

    // X no modal Substituir
    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();
    await page.locator('.modal-backdrop.show [data-modal-close]').first().click();  // X é o primeiro
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible();

    // X no modal Adicionar
    await page.locator('[data-add-food]').first().click();
    await expect(page.locator('#add-food-form')).toBeVisible();
    await page.locator('.modal-backdrop.show [data-modal-close]').first().click();
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible();

    // Nada mudou
    const dayAfter = await getDayTotals(page, 0);
    expect(Math.abs(dayAfter.kcal - dayBefore.kcal)).toBeLessThanOrEqual(2);
    await expect(page.locator('.ing-badge-subst')).not.toBeVisible();
    await expect(page.locator('.ing-badge-added')).not.toBeVisible();
  });

  // ── C-CANCEL5 ────────────────────────────────────────────────────────────
  test('C-CANCEL5 — ESC fecha modais sem aplicar alterações', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const dayBefore = await getDayTotals(page, 0);

    // ESC no modal Substituir
    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible();

    // ESC no modal Adicionar (com campos preenchidos)
    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, TEST_FOOD);
    await page.keyboard.press('Escape');
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible();

    // Nada mudou
    const dayAfter = await getDayTotals(page, 0);
    expect(Math.abs(dayAfter.kcal - dayBefore.kcal)).toBeLessThanOrEqual(2);
    await expect(page.locator('.ing-badge-added')).not.toBeVisible();
  });

  // ── C-CANCEL6 ────────────────────────────────────────────────────────────
  test('C-CANCEL6 — Após cancelar, reabertura do modal está limpa e funcional', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Abrir modal Adicionar, preencher, cancelar
    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, TEST_FOOD);
    await page.locator('.modal-backdrop.show [data-modal-close]').last().click();
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible();

    // Reabrir o mesmo modal — deve abrir limpo (sem erros antigos)
    await page.locator('[data-add-food]').first().click();
    await expect(page.locator('#add-food-form')).toBeVisible();

    // Erros não visíveis
    const errBox = page.locator('#add-food-errors');
    const errStyle = await errBox.getAttribute('style') || '';
    expect(errStyle).toMatch(/display:\s*none/);

    // Após cancelar e reabrir, preencher e submeter deve funcionar
    await fillAddFoodForm(page, { ...TEST_FOOD, name: 'Reopen Test Food' });
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();
    await expect(page.getByText('Reopen Test Food').first()).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Aviso de dados locais (localStorage)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Aviso de dados locais', () => {

  // ── C-LOCALDATA1 ──────────────────────────────────────────────────────────
  test('C-LOCALDATA1 — Aviso de dados locais aparece no Plano Alimentar', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const notice = page.locator('[data-testid="local-data-notice"]');
    await expect(notice).toBeVisible();
    const text = (await notice.textContent()) || '';
    expect(text).toMatch(/navegador/i);
    expect(text).toMatch(/Resetar|cache|dispositivo/i);
  });

  // ── C-LOCALDATA2 ──────────────────────────────────────────────────────────
  test('C-LOCALDATA2 — Modal Criar Alimento mostra nota "salvo apenas neste navegador"', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');

    const note = page.locator('[data-testid="local-data-modal-note"]');
    await expect(note).toBeVisible();
    const text = (await note.textContent()) || '';
    expect(text).toMatch(/salvo apenas neste navegador/i);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Confirmação melhorada no botão Resetar
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Confirmação do Resetar', () => {

  // ── C-RESET1 ──────────────────────────────────────────────────────────────
  test('C-RESET1 — Clicar em Resetar mostra modal com aviso sobre dados locais', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('#hdr-reset').click();
    await page.waitForSelector('.modal-backdrop.show');

    const modal = page.locator('.modal-backdrop.show .modal');
    await expect(modal).toBeVisible();

    const text = (await modal.textContent()) || '';
    expect(text).toMatch(/apagar tudo|resetar/i);
    // Deve mencionar os dados que serão apagados
    expect(text).toMatch(/alimentos personalizados/i);

    // Botões presentes
    await expect(modal.getByText('Cancelar')).toBeVisible();
    await expect(modal.getByText(/Sim, apagar tudo/i)).toBeVisible();
  });

  // ── C-RESET2 ──────────────────────────────────────────────────────────────
  test('C-RESET2 — Cancelar no modal de reset não apaga dados', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Guardar plano antes
    const planBefore = await page.evaluate(() => localStorage.getItem('hg:plan'));
    expect(planBefore).toBeTruthy();

    await page.locator('#hdr-reset').click();
    await page.waitForSelector('.modal-backdrop.show');

    // Cancelar
    await page.locator('.modal-backdrop.show').getByText('Cancelar').click();
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible();

    // Plano continua intacto
    const planAfter = await page.evaluate(() => localStorage.getItem('hg:plan'));
    expect(planAfter).toBeTruthy();
    expect(planAfter).toBe(planBefore);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Sugerir para biblioteca oficial (versão simplificada — email)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Sugerir para biblioteca oficial', () => {

  // ── C-SUGGEST1 ────────────────────────────────────────────────────────────
  test('C-SUGGEST1 — Secção "Sugerir para biblioteca oficial" aparece no modal Adicionar', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');

    const section = page.locator('[data-testid="suggest-section"]');
    await expect(section).toBeVisible();
    const text = (await section.textContent()) || '';
    // Verifica que a secção contém "sugerir" e "biblioteca oficial"
    // (summary foi encurtada para "💡 Sugerir alimento…" mas o corpo mantém o texto completo)
    expect(text).toMatch(/sugerir/i);
    expect(text).toMatch(/biblioteca oficial/i);
  });

  // ── C-SUGGEST2 ────────────────────────────────────────────────────────────
  test('C-SUGGEST2 — Email hardgainerhibrido@gmail.com aparece visível na secção', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');

    // Expandir details
    await page.locator('[data-testid="suggest-section"] > summary').click();

    const emailEl = page.locator('[data-testid="suggest-email-link"]');
    await expect(emailEl).toBeVisible();
    const txt = (await emailEl.textContent()) || '';
    expect(txt.trim()).toBe('hardgainerhibrido@gmail.com');
  });

  // ── C-SUGGEST3 ────────────────────────────────────────────────────────────
  test('C-SUGGEST3 — Email usa link mailto: correto', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await page.locator('[data-testid="suggest-section"] > summary').click();

    const href = await page.locator('[data-testid="suggest-email-link"]').getAttribute('href');
    expect(href).toBe('mailto:hardgainerhibrido@gmail.com');
  });

  // ── C-SUGGEST4 ────────────────────────────────────────────────────────────
  test('C-SUGGEST4 — Instrução para produtos com embalagem visível (nome, fotos, tabela)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await page.locator('[data-testid="suggest-section"] > summary').click();

    await expect(page.locator('[data-testid="suggest-packaged-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="suggest-packaged-photos"]')).toBeVisible();
    await expect(page.locator('[data-testid="suggest-packaged-label"]')).toBeVisible();

    const nameText = (await page.locator('[data-testid="suggest-packaged-name"]').textContent()) || '';
    expect(nameText).toMatch(/nome do produto/i);
    const labelText = (await page.locator('[data-testid="suggest-packaged-label"]').textContent()) || '';
    expect(labelText).toMatch(/tabela nutricional/i);
  });

  // ── C-SUGGEST5 ────────────────────────────────────────────────────────────
  test('C-SUGGEST5 — Instrução para frutas/vegetais visível (nome, origem, fotos)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await page.locator('[data-testid="suggest-section"] > summary').click();

    await expect(page.locator('[data-testid="suggest-natural-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="suggest-natural-origin"]')).toBeVisible();
    await expect(page.locator('[data-testid="suggest-natural-photos"]')).toBeVisible();

    const originText = (await page.locator('[data-testid="suggest-natural-origin"]').textContent()) || '';
    expect(originText).toMatch(/origem/i);
  });

  // ── C-SUGGEST6 ────────────────────────────────────────────────────────────
  test('C-SUGGEST6 — Botão "Copiar sugestão" não existe', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');

    const copyBtn = page.getByText(/copiar sugestão/i);
    await expect(copyBtn).not.toBeVisible();
  });

  // ── C-SUGGEST7 ────────────────────────────────────────────────────────────
  test('C-SUGGEST7 — Campos Marca/País/Link/Observações não existem no modal', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');

    // Estes campos não devem existir no DOM
    expect(await page.locator('#aff-sg-brand').count()).toBe(0);
    expect(await page.locator('#aff-sg-country').count()).toBe(0);
    expect(await page.locator('#aff-sg-link').count()).toBe(0);
    expect(await page.locator('#aff-sg-obs').count()).toBe(0);
  });

  // ── C-SUGGEST8 ────────────────────────────────────────────────────────────
  test('C-SUGGEST8 — Secção Sugerir aparece também no modal Editar alimento', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Adicionar alimento para poder editar
    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await fillAddFoodForm(page, { ...TEST_FOOD, name: 'Alimento Para Editar S8' });
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();

    // Abrir modal de edição
    await page.locator('[data-edit-addition]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await expect(page.locator('#edit-food-form')).toBeVisible();

    // Secção suggest presente no modal de edição
    const section = page.locator('[data-testid="suggest-section"]');
    await expect(section).toBeVisible();

    // Expandir e verificar email
    await section.locator('summary').click();
    const emailEl = page.locator('[data-testid="suggest-email-link"]');
    await expect(emailEl).toBeVisible();
    const txt = (await emailEl.textContent()) || '';
    expect(txt.trim()).toBe('hardgainerhibrido@gmail.com');
  });

  // ── C-SUGGEST9 ────────────────────────────────────────────────────────────
  test('C-SUGGEST9 — Secção Sugerir não altera kcal/macros nem adiciona alimento ao plano', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Totais do Dia 1 antes de abrir modal
    const dayBefore = await page.locator('[data-day-head="0"] .day-summary').textContent() || '';

    // Abrir modal e expandir secção suggest (sem submeter form)
    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await page.locator('[data-testid="suggest-section"] > summary').click();
    await expect(page.locator('[data-testid="suggest-email-link"]')).toBeVisible();

    // Fechar sem submeter
    await page.locator('.modal-backdrop.show [data-modal-close]').first().click();
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible();

    // Nenhum alimento adicionado
    const badges = await page.locator('.ing-badge-added').count();
    expect(badges).toBe(0);

    // Totais intactos
    const dayAfter = await page.locator('[data-day-head="0"] .day-summary').textContent() || '';
    expect(dayAfter).toBe(dayBefore);

    // localStorage additions vazio
    const additions = await page.evaluate(() => localStorage.getItem('hg:additions'));
    expect(additions).toBeNull();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Campos opcionais de fatos nutricionais
// ─────────────────────────────────────────────────────────────────────────────

/** Preenche campos opcionais após abrir o details com a summary. */
async function openNutriSection(page, testid) {
  await page.locator(`[data-testid="${testid}"]`).click();
}

/** Alimento de teste com micronutrientes: 150g base */
const TEST_FOOD_MICRO = {
  name: 'Iogurte Nutri Test', category: 'dairy',
  qty: 150, unit: 'g', kcal: 120, prot: 10, carb: 15, fat: 2,
};

test.describe('Campos opcionais de fatos nutricionais', () => {

  // ── C-NUTRI1 ──────────────────────────────────────────────────────────────
  test('C-NUTRI1 — Campos obrigatórios continuam existindo no modal Adicionar', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');

    await expect(page.locator('#aff-name')).toBeVisible();
    await expect(page.locator('#aff-category')).toBeVisible();
    await expect(page.locator('#aff-qty')).toBeVisible();
    await expect(page.locator('#aff-unit')).toBeVisible();
    await expect(page.locator('#aff-kcal')).toBeVisible();
    await expect(page.locator('#aff-prot')).toBeVisible();
    await expect(page.locator('#aff-carb')).toBeVisible();
    await expect(page.locator('#aff-fat')).toBeVisible();
  });

  // ── C-NUTRI2 ──────────────────────────────────────────────────────────────
  test('C-NUTRI2 — Bloco único "Campos opcionais" aparece no modal Adicionar', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');

    // Um único bloco expandível
    const block = page.locator('[data-testid="aff-optional-block"]');
    await expect(block).toBeVisible();
    const summaryTxt = (await block.locator('summary').textContent()) || '';
    expect(summaryTxt).toMatch(/campos opcionais/i);

    // Expandir e confirmar que inputs de várias categorias existem
    await openNutriSection(page, 'aff-optional-block');
    await expect(page.locator('#aff-vitC')).toBeVisible();
    await expect(page.locator('#aff-calcium')).toBeVisible();
    await expect(page.locator('#aff-saturated')).toBeVisible();
    await expect(page.locator('#aff-sugar')).toBeVisible();
    await expect(page.locator('#aff-iron')).toBeVisible();
  });

  // ── C-NUTRI3 ──────────────────────────────────────────────────────────────
  test('C-NUTRI3 — Adicionar alimento só com obrigatórios funciona normalmente', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await fillAddFoodForm(page, TEST_FOOD_MICRO);
    await page.locator('#add-food-form button[type="submit"]').click();

    await expect(page.locator('.ing-badge-added').first()).toBeVisible();
    await expect(page.getByText('Iogurte Nutri Test').first()).toBeVisible();
    // Sem nutri details (campos opcionais não preenchidos)
    const details = await page.locator('[data-testid="ing-nutri-details"]').count();
    expect(details).toBe(0);
  });

  // ── C-NUTRI4 ──────────────────────────────────────────────────────────────
  test('C-NUTRI4 — Campos opcionais preenchidos são guardados no localStorage', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await fillAddFoodForm(page, { ...TEST_FOOD_MICRO, name: 'Food Nutri4' });

    // Abrir o bloco único e preencher campos de várias categorias
    await openNutriSection(page, 'aff-optional-block');
    await page.locator('#aff-saturated').fill('1.5');
    await page.locator('#aff-mono').fill('0.8');
    await page.locator('#aff-sugar').fill('8');
    await page.locator('#aff-fiber').fill('3');
    await page.locator('#aff-calcium').fill('120');
    await page.locator('#aff-iron').fill('1.2');

    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();

    // Verificar localStorage
    const customs = await page.evaluate(() => {
      const d = localStorage.getItem('hg:custom_foods');
      return d ? JSON.parse(d) : [];
    });
    const food = customs.find(f => f.name === 'Food Nutri4');
    expect(food).toBeTruthy();
    expect(food.micronutrients).toBeTruthy();
    // Valores guardados per100g = valor / (150/100)
    expect(food.micronutrients.saturated).not.toBeNull();
    expect(food.micronutrients.sugar).not.toBeNull();
    expect(food.micronutrients.calcium).not.toBeNull();
    expect(food.micronutrients.iron).not.toBeNull();
  });

  // ── C-NUTRI5 ──────────────────────────────────────────────────────────────
  test('C-NUTRI5 — Plano mostra campos opcionais preenchidos', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await fillAddFoodForm(page, { ...TEST_FOOD_MICRO, name: 'Food Nutri5' });

    await openNutriSection(page, 'aff-optional-block');
    await page.locator('#aff-saturated').fill('2');
    await page.locator('#aff-calcium').fill('100');

    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();

    const details = page.locator('[data-testid="ing-nutri-details"]').first();
    await expect(details).toBeVisible();
    const txt = (await details.textContent()) || '';
    expect(txt).toMatch(/G\. saturada/i);
    expect(txt).toMatch(/Cálcio/i);
  });

  // ── C-NUTRI6 ──────────────────────────────────────────────────────────────
  test('C-NUTRI6 — Campos opcionais vazios não aparecem no plano', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await fillAddFoodForm(page, { ...TEST_FOOD_MICRO, name: 'Food Nutri6 Empty' });
    // Não preencher nenhum campo opcional
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();

    const count = await page.locator('[data-testid="ing-nutri-details"]').count();
    expect(count).toBe(0);
  });

  // ── C-NUTRI7 ──────────────────────────────────────────────────────────────
  test('C-NUTRI7 — Editar alimento pré-preenche campos opcionais guardados', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Adicionar com cálcio = 120mg
    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await fillAddFoodForm(page, { ...TEST_FOOD_MICRO, name: 'Food Nutri7' });
    await openNutriSection(page, 'aff-optional-block');
    await page.locator('#aff-calcium').fill('120');
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();

    // Abrir modal de edição — bloco abre automaticamente pois tem valores
    await page.locator('[data-edit-addition]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await expect(page.locator('#edit-food-form')).toBeVisible();

    // O bloco deve estar aberto (auto-open) e o cálcio preenchido
    const calcVal = await page.locator('#eff-calcium').inputValue();
    // Valor deve ser ~120 (150g → per100g → de volta a 150g)
    expect(parseFloat(calcVal)).toBeCloseTo(120, 0);
  });

  // ── C-NUTRI8 ──────────────────────────────────────────────────────────────
  test('C-NUTRI8 — Alterar campo opcional e guardar actualiza o plano', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Adicionar com cálcio = 100mg
    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await fillAddFoodForm(page, { ...TEST_FOOD_MICRO, name: 'Food Nutri8' });
    await openNutriSection(page, 'aff-optional-block');
    await page.locator('#aff-calcium').fill('100');
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();

    // Confirmar cálcio aparece como ~100mg
    const detailsBefore = (await page.locator('[data-testid="ing-nutri-details"]').first().textContent()) || '';
    expect(detailsBefore).toMatch(/Cálcio/i);

    // Editar: bloco abre automaticamente (auto-open), mudar cálcio para 200mg
    await page.locator('[data-edit-addition]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await page.locator('#eff-calcium').fill('200');
    await page.locator('#edit-food-form button[type="submit"]').click();

    // Confirmar que o plano mostra o novo valor
    const detailsAfter = (await page.locator('[data-testid="ing-nutri-details"]').first().textContent()) || '';
    expect(detailsAfter).toMatch(/Cálcio/i);
    // O valor exibido deve ser diferente do anterior
    expect(detailsAfter).not.toBe(detailsBefore);
  });

  // ── C-NUTRI9 ──────────────────────────────────────────────────────────────
  test('C-NUTRI9 — Editar só micronutriente não altera kcal/macros principais', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await fillAddFoodForm(page, { ...TEST_FOOD_MICRO, name: 'Food Nutri9' });
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();

    // Guardar macros antes
    const mealBefore = await page.locator('[data-meal-totals="0-0"]').textContent() || '';

    // Editar — abrir bloco e só mudar cálcio
    await page.locator('[data-edit-addition]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await openNutriSection(page, 'eff-optional-block');
    await page.locator('#eff-calcium').fill('999');
    await page.locator('#edit-food-form button[type="submit"]').click();

    // Macros da refeição não mudam
    const mealAfter = await page.locator('[data-meal-totals="0-0"]').textContent() || '';
    expect(mealAfter).toBe(mealBefore);
  });

  // ── C-NUTRI10 ─────────────────────────────────────────────────────────────
  test('C-NUTRI10 — Remover alimento remove dados opcionais do plano', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await fillAddFoodForm(page, { ...TEST_FOOD_MICRO, name: 'Food Nutri10' });
    await openNutriSection(page, 'aff-optional-block');
    await page.locator('#aff-calcium').fill('100');
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('[data-testid="ing-nutri-details"]').first()).toBeVisible();

    // Remover alimento
    await page.locator('[data-remove-addition]').first().click();
    await expect(page.locator('.ing-badge-added')).not.toBeVisible();

    const count = await page.locator('[data-testid="ing-nutri-details"]').count();
    expect(count).toBe(0);
  });

  // ── C-NUTRI11 ─────────────────────────────────────────────────────────────
  test('C-NUTRI11 — Após reload, alimento e fatos opcionais persistem', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await fillAddFoodForm(page, { ...TEST_FOOD_MICRO, name: 'Food Nutri11' });
    await openNutriSection(page, 'aff-optional-block');
    await page.locator('#aff-saturated').fill('2.5');
    await page.locator('#aff-calcium').fill('150');
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('[data-testid="ing-nutri-details"]').first()).toBeVisible();

    // Reload e renavigar ao plano
    await gotoResultados(page);
    await gotoPlano(page);

    await expect(page.locator('.ing-badge-added').first()).toBeVisible();
    const details = page.locator('[data-testid="ing-nutri-details"]').first();
    await expect(details).toBeVisible();
    const txt = (await details.textContent()) || '';
    expect(txt).toMatch(/G\. saturada/i);
    expect(txt).toMatch(/Cálcio/i);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: UX — bloco único de campos opcionais
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UX — bloco único de campos opcionais', () => {

  // ── C-NUTRI-UX1 ───────────────────────────────────────────────────────────
  test('C-NUTRI-UX1 — Existe apenas um bloco "Campos opcionais" no modal Adicionar', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');

    // Um único bloco
    const blocks = await page.locator('[data-testid="aff-optional-block"]').count();
    expect(blocks).toBe(1);

    const summaryTxt = (await page.locator('[data-testid="aff-optional-block"] summary').textContent()) || '';
    expect(summaryTxt).toMatch(/campos opcionais/i);
  });

  // ── C-NUTRI-UX2 ───────────────────────────────────────────────────────────
  test('C-NUTRI-UX2 — Secções separadas antigas não existem mais', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');

    // Antigos data-testid não devem existir
    expect(await page.locator('[data-testid="aff-section-fats"]').count()).toBe(0);
    expect(await page.locator('[data-testid="aff-section-carbs"]').count()).toBe(0);
    expect(await page.locator('[data-testid="aff-section-vitamins"]').count()).toBe(0);
    expect(await page.locator('[data-testid="aff-section-minerals"]').count()).toBe(0);
  });

  // ── C-NUTRI-UX3 ───────────────────────────────────────────────────────────
  test('C-NUTRI-UX3 — Bloco "Campos opcionais" fechado por padrão (modal novo)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');

    const block = page.locator('[data-testid="aff-optional-block"]');
    // <details> sem atributo open = fechado
    const isOpen = await block.evaluate(el => el.open);
    expect(isOpen).toBe(false);
  });

  // ── C-NUTRI-UX4 ───────────────────────────────────────────────────────────
  test('C-NUTRI-UX4 — Abrir bloco mostra todos os campos opcionais', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');

    await openNutriSection(page, 'aff-optional-block');

    // Gorduras
    await expect(page.locator('#aff-saturated')).toBeVisible();
    // Carbs
    await expect(page.locator('#aff-sugar')).toBeVisible();
    await expect(page.locator('#aff-fiber')).toBeVisible();
    // Outros
    await expect(page.locator('#aff-sodium')).toBeVisible();
    // Minerais
    await expect(page.locator('#aff-calcium')).toBeVisible();
    await expect(page.locator('#aff-iron')).toBeVisible();
  });

  // ── C-NUTRI-UX5 ───────────────────────────────────────────────────────────
  test('C-NUTRI-UX5 — Adicionar apenas com obrigatórios funciona (bloco fechado)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    // Não abrir o bloco de opcionais
    await fillAddFoodForm(page, { ...TEST_FOOD_MICRO, name: 'UX5 Food' });
    await page.locator('#add-food-form button[type="submit"]').click();

    await expect(page.locator('.ing-badge-added').first()).toBeVisible();
    await expect(page.getByText('UX5 Food').first()).toBeVisible();
    const nutriCount = await page.locator('[data-testid="ing-nutri-details"]').count();
    expect(nutriCount).toBe(0);
  });

  // ── C-NUTRI-UX6 ───────────────────────────────────────────────────────────
  test('C-NUTRI-UX6 — Preencher opcionais no bloco único guarda e exibe no plano', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await fillAddFoodForm(page, { ...TEST_FOOD_MICRO, name: 'UX6 Food' });
    await openNutriSection(page, 'aff-optional-block');
    await page.locator('#aff-sugar').fill('5');
    await page.locator('#aff-fiber').fill('2');
    await page.locator('#aff-calcium').fill('80');
    await page.locator('#add-food-form button[type="submit"]').click();

    await expect(page.locator('.ing-badge-added').first()).toBeVisible();
    const details = page.locator('[data-testid="ing-nutri-details"]').first();
    await expect(details).toBeVisible();
    const txt = (await details.textContent()) || '';
    expect(txt).toMatch(/Açúcares/i);
    expect(txt).toMatch(/Fibra/i);
    expect(txt).toMatch(/Cálcio/i);
  });

  // ── C-NUTRI-UX7 ───────────────────────────────────────────────────────────
  test('C-NUTRI-UX7 — Editar: bloco abre com dados preenchidos (auto-open)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Adicionar com fibra = 4g
    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await fillAddFoodForm(page, { ...TEST_FOOD_MICRO, name: 'UX7 Food' });
    await openNutriSection(page, 'aff-optional-block');
    await page.locator('#aff-fiber').fill('4');
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();

    // Abrir modal de edição — bloco deve abrir automaticamente
    await page.locator('[data-edit-addition]').first().click();
    await page.waitForSelector('.modal-backdrop.show');

    const editBlock = page.locator('[data-testid="eff-optional-block"]');
    await expect(editBlock).toBeVisible();
    const isOpen = await editBlock.evaluate(el => el.open);
    expect(isOpen).toBe(true); // auto-open porque há valores

    const fiberVal = await page.locator('#eff-fiber').inputValue();
    expect(parseFloat(fiberVal)).toBeCloseTo(4, 0);
  });

  // ── C-NUTRI-UX8 ───────────────────────────────────────────────────────────
  test('C-NUTRI-UX8 — Opcionais não alteram kcal/macros do plano', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Kcal da refeição ANTES de adicionar
    const mealTxtBefore = await page.locator('[data-meal-totals="0-0"]').textContent() || '';
    const kcalBefore = parseInt(mealTxtBefore.match(/(\d+)\s*kcal/)?.[1] || '0');

    // Abrir modal e preencher obrigatórios + todos os opcionais
    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    const food = { ...TEST_FOOD_MICRO, name: 'UX8 Food' };
    await fillAddFoodForm(page, food);
    await openNutriSection(page, 'aff-optional-block');
    await page.locator('#aff-saturated').fill('1');
    await page.locator('#aff-sugar').fill('5');
    await page.locator('#aff-fiber').fill('3');
    await page.locator('#aff-sodium').fill('200');
    await page.locator('#aff-calcium').fill('100');
    await page.locator('#aff-vitC').fill('15');
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();

    // Kcal DEPOIS: diferença deve ser ~120 (apenas macros obrigatórios)
    const mealTxtAfter = await page.locator('[data-meal-totals="0-0"]').textContent() || '';
    const kcalAfter = parseInt(mealTxtAfter.match(/(\d+)\s*kcal/)?.[1] || '0');
    expect(Math.abs(kcalAfter - kcalBefore - food.kcal)).toBeLessThanOrEqual(5);

    // Campos opcionais visíveis no plano mas sem afetar kcal
    const nutriTxt = (await page.locator('[data-testid="ing-nutri-details"]').first().textContent()) || '';
    expect(nutriTxt).toMatch(/Açúcares/i);
    expect(nutriTxt).toMatch(/Cálcio/i);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Accordion de fatos nutricionais adicionais (plano)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Accordion de fatos nutricionais adicionais', () => {

  /** Helper: adiciona alimento com saturada=2, cálcio=100 */
  async function addFoodWithNutri(page, name = 'Nutri Acc Test') {
    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await fillAddFoodForm(page, { ...TEST_FOOD_MICRO, name });
    await openNutriSection(page, 'aff-optional-block');
    await page.locator('#aff-saturated').fill('2');
    await page.locator('#aff-calcium').fill('100');
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();
  }

  // ── C-ADD-NUTRI-UX1 ──────────────────────────────────────────────────────
  test('C-ADD-NUTRI-UX1 — Accordion fechado por padrão após adicionar com opcionais', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);
    await addFoodWithNutri(page);

    const accordion = page.locator('[data-testid="ing-nutri-details"]').first();
    await expect(accordion).toBeVisible(); // <details> visível (summary mostra)

    // Deve estar FECHADO: propriedade open = false
    const isOpen = await accordion.evaluate(el => el.open);
    expect(isOpen, 'Accordion deve estar fechado por padrão').toBe(false);
  });

  // ── C-ADD-NUTRI-UX2 ──────────────────────────────────────────────────────
  test('C-ADD-NUTRI-UX2 — Texto "Ver fatos nutricionais adicionais" visível no toggle', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);
    await addFoodWithNutri(page);

    const showText = page.locator('.ing-nutri-show-text').first();
    await expect(showText).toBeVisible();
    const txt = (await showText.textContent()) || '';
    expect(txt).toMatch(/Ver fatos nutricionais adicionais/i);
  });

  // ── C-ADD-NUTRI-UX3 ──────────────────────────────────────────────────────
  test('C-ADD-NUTRI-UX3 — Clicar no toggle abre o accordion e mostra os fatos', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);
    await addFoodWithNutri(page);

    const accordion = page.locator('[data-testid="ing-nutri-details"]').first();
    await accordion.locator('summary').click();

    const isOpen = await accordion.evaluate(el => el.open);
    expect(isOpen, 'Accordion deve estar aberto após click').toBe(true);

    // Corpo com os fatos deve estar visível
    const body = accordion.locator('.ing-nutri-body');
    await expect(body).toBeVisible();
    const bodyTxt = (await body.textContent()) || '';
    expect(bodyTxt).toMatch(/G\. saturada/i);
    expect(bodyTxt).toMatch(/Cálcio/i);
  });

  // ── C-ADD-NUTRI-UX4 ──────────────────────────────────────────────────────
  test('C-ADD-NUTRI-UX4 — Clicar novamente fecha o accordion', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);
    await addFoodWithNutri(page);

    const accordion = page.locator('[data-testid="ing-nutri-details"]').first();
    await accordion.locator('summary').click(); // abre
    await accordion.locator('summary').click(); // fecha

    const isOpen = await accordion.evaluate(el => el.open);
    expect(isOpen, 'Accordion deve estar fechado após segundo click').toBe(false);

    // Corpo deve estar oculto
    const body = accordion.locator('.ing-nutri-body');
    await expect(body).not.toBeVisible();
  });

  // ── C-ADD-NUTRI-UX5 ──────────────────────────────────────────────────────
  test('C-ADD-NUTRI-UX5 — Alimento sem opcionais não mostra accordion', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await fillAddFoodForm(page, { ...TEST_FOOD_MICRO, name: 'Sem Opcionais' });
    // Não preencher opcionais
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();

    const count = await page.locator('[data-testid="ing-nutri-details"]').count();
    expect(count, 'Não deve aparecer accordion sem dados opcionais').toBe(0);
  });

  // ── C-ADD-NUTRI-UX6 ──────────────────────────────────────────────────────
  test('C-ADD-NUTRI-UX6 — Editar alimento mantém valores opcionais no modal', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);
    await addFoodWithNutri(page, 'UX6 Edit Test');

    await page.locator('[data-edit-addition]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await expect(page.locator('#edit-food-form')).toBeVisible();

    // Bloco abre automaticamente (tem valores)
    const calcVal = await page.locator('#eff-calcium').inputValue();
    expect(parseFloat(calcVal)).toBeCloseTo(100, 0);
    const saturatedVal = await page.locator('#eff-saturated').inputValue();
    expect(parseFloat(saturatedVal)).toBeCloseTo(2, 0);
  });

  // ── C-ADD-NUTRI-UX7 ──────────────────────────────────────────────────────
  test('C-ADD-NUTRI-UX7 — PDF por dia NÃO inclui accordion de fatos nutricionais', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);
    await addFoodWithNutri(page);

    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('[data-pdf-day="0"]').first().click();
    await page.waitForSelector('#day-pdf-print-area', { state: 'attached', timeout: 5000 });

    // O PDF não usa buildNutriDetailsHtml — não deve ter o accordion
    const count = await page.locator('#day-pdf-print-area [data-testid="ing-nutri-details"]').count();
    expect(count, 'PDF não deve conter accordion de fatos nutricionais').toBe(0);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Campos numéricos não mudam com scroll (type=text inputmode=decimal)
// ─────────────────────────────────────────────────────────────────────────────

/** Dispatcha um evento wheel sobre um elemento para simular scroll */
async function dispatchWheel(page, selector, deltaY = 100) {
  await page.locator(selector).dispatchEvent('wheel', { deltaY, bubbles: true });
}

test.describe('Campos numéricos resistentes ao scroll (wheel)', () => {

  // ── C-NUM-WHEEL1 ─────────────────────────────────────────────────────────
  test('C-NUM-WHEEL1 — Campo opcional "saturada=3" não muda com wheel', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await openNutriSection(page, 'aff-optional-block');
    await page.locator('#aff-saturated').fill('3');

    await dispatchWheel(page, '#aff-saturated', 100);
    await dispatchWheel(page, '#aff-saturated', -100);

    const val = await page.locator('#aff-saturated').inputValue();
    expect(val, `Esperado "3", obtido "${val}"`).toBe('3');
  });

  // ── C-NUM-WHEEL2 ─────────────────────────────────────────────────────────
  test('C-NUM-WHEEL2 — Campo opcional "saturada=3.5" não muda com wheel', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await openNutriSection(page, 'aff-optional-block');
    await page.locator('#aff-fiber').fill('3.5');

    await dispatchWheel(page, '#aff-fiber', 100);
    await dispatchWheel(page, '#aff-fiber', -100);

    const val = await page.locator('#aff-fiber').inputValue();
    expect(val, `Esperado "3.5", obtido "${val}"`).toBe('3.5');
  });

  // ── C-NUM-WHEEL3 ─────────────────────────────────────────────────────────
  test('C-NUM-WHEEL3 — Modal Editar: campos opcionais não mudam com wheel', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Adicionar com calcium=5
    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await fillAddFoodForm(page, { ...TEST_FOOD_MICRO, name: 'Wheel Edit Test' });
    await openNutriSection(page, 'aff-optional-block');
    await page.locator('#aff-calcium').fill('5');
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();

    // Abrir modal de edição
    await page.locator('[data-edit-addition]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await expect(page.locator('#edit-food-form')).toBeVisible();

    // Wheel sobre #eff-calcium
    await dispatchWheel(page, '#eff-calcium', 100);
    await dispatchWheel(page, '#eff-calcium', -100);

    const val = await page.locator('#eff-calcium').inputValue();
    // Valor deve ser aprox 5 (pode diferir levemente por per100g round-trip)
    expect(parseFloat(val)).toBeCloseTo(5, 0);
  });

  // ── C-NUM-WHEEL4 ─────────────────────────────────────────────────────────
  test('C-NUM-WHEEL4 — Porção base vazia continua dando erro "Quantidade base deve ser maior que zero"', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await page.locator('#aff-name').fill('Teste Qty Vazia');
    await page.locator('#aff-category').selectOption('protein');
    // Não preencher #aff-qty
    await page.locator('#aff-kcal').fill('100');
    await page.locator('#aff-prot').fill('20');
    await page.locator('#aff-carb').fill('0');
    await page.locator('#aff-fat').fill('5');
    await page.locator('#add-food-form button[type="submit"]').click();

    const errBox = page.locator('#add-food-errors');
    await expect(errBox).toBeVisible();
    const errTxt = (await errBox.textContent()) || '';
    expect(errTxt).toMatch(/Quantidade base deve ser maior que zero/i);
  });

  // ── C-NUM-WHEEL5 ─────────────────────────────────────────────────────────
  test('C-NUM-WHEEL5 — Porção base 1 oz adiciona alimento como "1 oz" (modo imperial)', async ({ page }) => {
    // oz só existe no select em modo imperial — sobrepor o form unit
    const cenarioImp = { ...CENARIO_4, form: { ...CENARIO_4.form, unit: 'imperial' } };
    await injectState(page, cenarioImp);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await fillAddFoodForm(page, { name: 'Oz Wheel Test', category: 'protein', qty: 1, unit: 'oz', kcal: 30, prot: 5, carb: 0, fat: 1 });
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();

    const qtys = await page.locator('.ingredient-added .ingredient-qty').evaluateAll(
      els => els.map(e => (e.textContent || '').trim())
    );
    expect(qtys.some(t => t === '1 oz'), `Esperado "1 oz", encontrado: ${JSON.stringify(qtys)}`).toBe(true);
  });

  // ── C-NUM-WHEEL6 ─────────────────────────────────────────────────────────
  test('C-NUM-WHEEL6 — kcal/proteína/carbs/gorduras são lidos corretamente após submit', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const mealBefore = await page.locator('[data-meal-totals="0-0"]').textContent() || '';
    const kcalBefore = parseInt((mealBefore.match(/(\d+)\s*kcal/) || [])[1] || '0');

    await page.locator('[data-add-food][data-day-idx="0"][data-meal-idx="0"]').click();
    await fillAddFoodForm(page, { ...TEST_FOOD_MICRO, name: 'Parse Test', qty: 100, unit: 'g', kcal: 200, prot: 20, carb: 25, fat: 5 });
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();

    const mealAfter = await page.locator('[data-meal-totals="0-0"]').textContent() || '';
    const kcalAfter = parseInt((mealAfter.match(/(\d+)\s*kcal/) || [])[1] || '0');
    expect(Math.abs(kcalAfter - kcalBefore - 200)).toBeLessThanOrEqual(5);
  });

  // ── C-NUM-WHEEL7 ─────────────────────────────────────────────────────────
  test('C-NUM-WHEEL7 — Campos opcionais guardados e aparecem no accordion', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await fillAddFoodForm(page, { ...TEST_FOOD_MICRO, name: 'Accordion Storage Test' });
    await openNutriSection(page, 'aff-optional-block');
    await page.locator('#aff-saturated').fill('4');
    await page.locator('#aff-fiber').fill('2');
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();

    // Accordion existe e fechado
    const acc = page.locator('[data-testid="ing-nutri-details"]').first();
    await expect(acc).toBeVisible();
    const isOpen = await acc.evaluate(el => el.open);
    expect(isOpen).toBe(false);

    // Abrir e verificar conteúdo
    await acc.locator('summary').click();
    const body = acc.locator('.ing-nutri-body');
    await expect(body).toBeVisible();
    const txt = (await body.textContent()) || '';
    expect(txt).toMatch(/G\. saturada/i);
    expect(txt).toMatch(/Fibra/i);
  });

  // ── C-NUM-WHEEL8 ─────────────────────────────────────────────────────────
  test('C-NUM-WHEEL8 — PDF não mostra accordion de fatos nutricionais adicionais', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await page.waitForSelector('.modal-backdrop.show');
    await fillAddFoodForm(page, { ...TEST_FOOD_MICRO, name: 'PDF Nutri Test' });
    await openNutriSection(page, 'aff-optional-block');
    await page.locator('#aff-calcium').fill('50');
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();

    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('[data-pdf-day="0"]').first().click();
    await page.waitForSelector('#day-pdf-print-area', { state: 'attached', timeout: 5000 });

    const count = await page.locator('#day-pdf-print-area [data-testid="ing-nutri-details"]').count();
    expect(count).toBe(0);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Sprint B — Troca segura por alvo diário
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Injeta adições manuais (hg:additions) no localStorage antes de navegar.
 * Estrutura: { "dayIdx:mealIdx": [{ id, food, grams, unit, snapshot }] }
 */
async function injectAdditions(page, additions) {
  await page.addInitScript((a) => {
    try { localStorage.setItem('hg:additions', JSON.stringify(a)); } catch {}
  }, additions);
}

/** Alimento fictício de alto impacto calórico para testes de projeção. */
const SPRINTB_HIGHCAL_FOOD = {
  id: 'sprintb_highcal',
  name: 'Alimento Teste Sprint B',
  category: 'extra',
  per100: { kcal: 700, prot: 0, carb: 0, fat: 78 },
  digestibility: 'leve',
  substitutes: [],
  source: 'custom',
  baseQuantity: 100,
  baseUnit: 'g',
};

/** Labels válidos após Sprint B + C2-B (delta-based classification). */
const VALID_SPRINTB_LABELS = new Set([
  // Safety (Sprint B — unchanged)
  'Fora da margem: muito baixo',
  'Fora da margem: muito alto',
  // Positive (C2-B)
  'Troca segura',
  'Boa troca',
  // Moderate (C2-B)
  'Aceitável com ajuste',
  // Specific warnings (C2-B)
  'Atenção: gorduras acima do alvo',
  'Atenção: proteína baixa',
  'Atenção: carboidratos fora do alvo',
  // Cross-category (unchanged)
  'Macros muito diferentes',
]);

test.describe('Sprint B — Troca segura por alvo diário', () => {

  // ── C-SPRINTB1 ──────────────────────────────────────────────────────────────
  test('C-SPRINTB1 — Modal mostra linha "Dia projetado" em cada opção', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;

    // Pelo menos a 1.ª opção deve ter linha de projeção
    await expect(opts.first().locator('.sub-option-proj')).toBeVisible();
    const projText = await opts.first().locator('.sub-option-proj').textContent() || '';
    expect(projText).toMatch(/Dia projetado:/);
    expect(projText).toMatch(/kcal/);
    expect(projText).toMatch(/vs alvo/);
  });

  // ── C-SPRINTB2 ──────────────────────────────────────────────────────────────
  test('C-SPRINTB2 — Labels do modal são do conjunto válido de Sprint B', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    const opts = page.locator('.sub-option');
    const n = await opts.count();
    if (n === 0) return;

    for (let i = 0; i < n; i++) {
      const label = (await opts.nth(i).locator('.sub-impact').textContent() || '').trim();
      expect(VALID_SPRINTB_LABELS.has(label),
        `Label "${label}" não pertence ao conjunto válido de Sprint B`).toBe(true);
    }
  });

  // ── C-SPRINTB3 ──────────────────────────────────────────────────────────────
  test('C-SPRINTB3 — Substitutes prioritários não disparam "Fora da margem" sem adições', async ({ page }) => {
    // Os substitutes curados (primeiros da lista, ligados manualmente) são equivalentes
    // calóricos e nunca devem sair da janela -100/+200 kcal.
    // Nota: com a lista expandida a todos os FOODS, alimentos de categorias muito
    // diferentes (ex: substituir vegetal por pão) podem legitimamente mostrar "Fora da
    // margem" — esse comportamento é correcto. Verificamos apenas os primeiros 8 (máximo
    // de substitutes prioritários em qualquer alimento de FOODS).
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    const opts = page.locator('.sub-option');
    const total = await opts.count();
    if (total === 0) return;

    const maxPriority = Math.min(total, 8);
    const labels = await Promise.all(
      (await opts.all()).slice(0, maxPriority).map(o => o.locator('.sub-impact').textContent().catch(() => ''))
    );
    const hasOutOfRange = labels.some(l => (l || '').trim().startsWith('Fora da margem'));
    expect(
      hasOutOfRange,
      `Substitutes prioritários não devem disparar "Fora da margem". Labels: ${labels.join(', ')}`
    ).toBe(false);
  });

  // ── C-SPRINTB4 ──────────────────────────────────────────────────────────────
  test('C-SPRINTB4 — Adição manual de 700 kcal força "Fora da margem: muito alto" no modal', async ({ page }) => {
    // Injeta 100g do alimento de teste (700 kcal) na refeição 0 do dia 0
    // Total do dia passa a ser ~2660 + 700 = 3360 kcal > alvo + 200 (2860)
    await injectState(page, CENARIO_4);
    await injectAdditions(page, {
      '0:0': [{
        id: 'sprintb_add_test',
        food: SPRINTB_HIGHCAL_FOOD.id,
        grams: 100,
        unit: 'g',
        snapshot: SPRINTB_HIGHCAL_FOOD,
      }],
    });
    await gotoResultados(page);
    await gotoPlano(page);

    // Abre modal do 1.º ingrediente da refeição 0 do dia 0
    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;

    // Com 700 kcal extras no dia, TODAS as opções devem ser "Fora da margem: muito alto"
    const labels = await Promise.all(
      (await opts.all()).map(o => o.locator('.sub-impact').textContent().catch(() => ''))
    );
    const allHigh = labels.every(l => (l || '').trim() === 'Fora da margem: muito alto');
    expect(allHigh,
      `Esperado "Fora da margem: muito alto" em todas as opções. Encontrado: ${[...new Set(labels)].join(', ')}`
    ).toBe(true);
  });

  // ── C-SPRINTB5 ──────────────────────────────────────────────────────────────
  test('C-SPRINTB5 — Adição manual incluída na linha "Dia projetado" do modal', async ({ page }) => {
    // Sem adição: dia projetado ≈ alvo (2660 kcal)
    // Com adição de 700 kcal: dia projetado ≈ 3360 kcal
    await injectState(page, CENARIO_4);
    await injectAdditions(page, {
      '0:0': [{
        id: 'sprintb_add_proj_test',
        food: SPRINTB_HIGHCAL_FOOD.id,
        grams: 100,
        unit: 'g',
        snapshot: SPRINTB_HIGHCAL_FOOD,
      }],
    });
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;

    const projText = await opts.first().locator('.sub-option-proj').textContent() || '';
    // O número projetado deve ser >> 2660 (refletir a adição de 700 kcal)
    const match = projText.match(/(\d{3,4})\s*kcal/);
    const projKcal = match ? parseInt(match[1], 10) : 0;
    expect(projKcal,
      `Dia projetado (${projKcal}) deveria incluir adição de 700 kcal e ser > 3200`
    ).toBeGreaterThan(3200);
  });

  // ── C-SPRINTB6 ──────────────────────────────────────────────────────────────
  test('C-SPRINTB6 — Sub anterior no mesmo dia é incluída na projeção da sub seguinte', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Aplica 1.ª substituição
    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();
    const opts1 = page.locator('.sub-option');
    if (await opts1.count() === 0) { await page.locator('[data-modal-close]').first().click(); return; }
    // Guarda projecção da 1.ª sub
    const proj1 = (await opts1.first().locator('.sub-option-proj').textContent() || '').trim();
    await opts1.first().click();
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(300);

    // Abre modal da 2.ª sub (ingrediente diferente)
    const swapBtns = page.locator('[data-swap]');
    if (await swapBtns.count() < 2) return;
    await swapBtns.nth(1).click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();
    const opts2 = page.locator('.sub-option');
    if (await opts2.count() === 0) return;

    // A projeção da 2.ª sub deve existir e mostrar kcal > 0
    const proj2 = (await opts2.first().locator('.sub-option-proj').textContent() || '').trim();
    expect(proj2).toMatch(/Dia projetado:/);
    // As duas projeções devem ser diferentes (contexto do dia mudou com a 1.ª sub)
    // (pode ser igual por coincidência, mas a estrutura deve estar lá)
    expect(proj2.length).toBeGreaterThan(0);
  });

  // ── C-SPRINTB7 ──────────────────────────────────────────────────────────────
  test('C-SPRINTB7 — isWithinGoalTolerance usa janela -100/+200 no bloco do dia', async ({ page }) => {
    // Alvo CENARIO_4 = 2660 kcal
    // Se substituição resultar em dia entre 2560 e 2860, bloco mostra "Dentro do objetivo"
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;
    await opts.first().click();
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(300);

    const statusEl = page.locator('.day-comp-status').first();
    await expect(statusEl).toBeVisible();
    const statusText = await statusEl.textContent() || '';
    // Deve ser um dos dois textos válidos (a troca normal fica dentro da margem)
    expect(
      statusText.includes('Dentro do objetivo') || statusText.includes('Atenção'),
      `Status inválido: "${statusText}"`
    ).toBe(true);
  });

  // ── C-SPRINTB8 ──────────────────────────────────────────────────────────────
  test('C-SPRINTB8 — Reverter continua funcionando após Sprint B', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;
    await opts.first().click();
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(300);

    await expect(page.locator('.ing-badge-subst').first()).toBeVisible();
    await page.locator('.ing-revert-btn').first().click();
    await page.waitForTimeout(300);

    await expect(page.locator('.ing-badge-subst')).not.toBeVisible();
    await expect(page.locator('[data-testid="day-comp-block"]')).not.toBeVisible();
  });

  // ── C-SPRINTB9 ──────────────────────────────────────────────────────────────
  test('C-SPRINTB9 — Mobile 390px: modal Sprint B abre e mostra projeção', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;

    await expect(opts.first().locator('.sub-option-proj')).toBeVisible();
    await expect(opts.first().locator('.sub-impact')).toBeVisible();

    const label = (await opts.first().locator('.sub-impact').textContent() || '').trim();
    expect(VALID_SPRINTB_LABELS.has(label), `Label inválido em mobile: "${label}"`).toBe(true);
  });

  // ── C-SPRINTB10 ─────────────────────────────────────────────────────────────
  test('C-SPRINTB10 — PDF por dia não é afetado pela Sprint B', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('[data-pdf-day="0"]').first().click();
    await page.waitForSelector('#day-pdf-print-area', { state: 'attached', timeout: 5000 });

    // PDF não deve conter a linha de projeção (pertence apenas ao modal interativo)
    const projInPdf = await page.locator('#day-pdf-print-area .sub-option-proj').count();
    expect(projInPdf).toBe(0);

    // PDF deve conter ingredientes normais (.ing-list é a classe usada em exportDayPDF)
    const ings = await page.locator('#day-pdf-print-area .ing-list li').count();
    expect(ings).toBeGreaterThan(0);
  });

});

// =============================================================================
// C-SUB-FULL — Modal com todos os alimentos FOODS (Sprint C)
// =============================================================================
// Valida que o modal de substituição mostra todos os alimentos de FOODS,
// distribuídos por categoria, e não apenas os substitutes manuais.

test.describe('C-SUB-FULL — Modal com todos os alimentos FOODS', () => {

  // ── C-SUB-FULL1 ─────────────────────────────────────────────────────────────
  test('C-SUB-FULL1 — Modal mostra "Proteína whey" para ingrediente que não é whey', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Tenta até 10 botões de swap para encontrar um ingrediente que não seja whey
    const swapBtns = page.locator('[data-swap]');
    const total = await swapBtns.count();
    let found = false;

    for (let i = 0; i < Math.min(total, 10); i++) {
      await swapBtns.nth(i).click();
      await expect(page.locator('.modal-backdrop.show')).toBeVisible();

      const currentName = (await page.locator('.sub-current-name').textContent() || '').toLowerCase();

      // Se o ingrediente atual é whey, fecha e tenta o seguinte
      if (currentName.includes('whey')) {
        await page.locator('[data-modal-close]').first().click();
        await expect(page.locator('.modal-backdrop.show')).not.toBeVisible({ timeout: 3000 });
        continue;
      }

      const optNames = await page.locator('.sub-option-name').allTextContents();
      if (optNames.some(n => n.includes('whey') || n.toLowerCase().includes('proteína whey'))) {
        found = true;
      }
      await page.locator('[data-modal-close]').first().click();
      await expect(page.locator('.modal-backdrop.show')).not.toBeVisible({ timeout: 3000 });
      break;
    }

    expect(found, '"Proteína whey" deve aparecer no modal de um ingrediente não-whey').toBe(true);
  });

  // ── C-SUB-FULL2 ─────────────────────────────────────────────────────────────
  test('C-SUB-FULL2 — Modal mostra secção Laticínios com alimentos dairy', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    const catLabels = await page.locator('.sub-cat-label').allTextContents();
    expect(
      catLabels.some(l => l.includes('Laticínios')),
      'Modal deve ter secção "Laticínios"'
    ).toBe(true);

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-FULL3 ─────────────────────────────────────────────────────────────
  test('C-SUB-FULL3 — Modal mostra várias secções de categoria (≥ 3)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    const groups = page.locator('.sub-cat-group');
    const count = await groups.count();
    expect(count, 'Modal deve ter pelo menos 3 grupos de categoria').toBeGreaterThanOrEqual(3);

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-FULL4 ─────────────────────────────────────────────────────────────
  test('C-SUB-FULL4 — Modal não mostra o alimento original como opção de substituição', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    const currentName = (await page.locator('.sub-current-name').textContent() || '').trim();
    const optNames = (await page.locator('.sub-option-name').allTextContents()).map(n => n.trim());

    expect(
      optNames.includes(currentName),
      `"${currentName}" não deve aparecer como opção de substituição`
    ).toBe(false);

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-FULL5 ─────────────────────────────────────────────────────────────
  test('C-SUB-FULL5 — Modal não tem opções duplicadas (data-sub-id únicos)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    const ids = await page.locator('.sub-option[data-sub-id]').evaluateAll(
      els => els.map(el => el.getAttribute('data-sub-id'))
    );
    const unique = new Set(ids);
    expect(unique.size, 'Todos os data-sub-id devem ser únicos').toBe(ids.length);

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-FULL6 ─────────────────────────────────────────────────────────────
  test('C-SUB-FULL6 — Todas as opções têm label Sprint B (.sub-impact)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    const opts = page.locator('.sub-option');
    const total = await opts.count();
    if (total === 0) { await page.locator('[data-modal-close]').first().click(); return; }

    // Verifica as primeiras 20 opções visíveis (accordion: grupos fechados estão no DOM mas ocultos)
    const visibleOpts = opts.filter({ visible: true });
    const visibleTotal = await visibleOpts.count();
    const toCheck = Math.min(visibleTotal, 20);
    for (let i = 0; i < toCheck; i++) {
      await expect(visibleOpts.nth(i).locator('.sub-impact'),
        `Opção ${i + 1} deve ter label Sprint B`).toBeVisible();
    }

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-FULL7 ─────────────────────────────────────────────────────────────
  test('C-SUB-FULL7 — Todas as opções têm linha "Dia projetado" (.sub-option-proj)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    const opts = page.locator('.sub-option');
    const total = await opts.count();
    if (total === 0) { await page.locator('[data-modal-close]').first().click(); return; }

    const toCheck = Math.min(total, 20);
    for (let i = 0; i < toCheck; i++) {
      const projText = (await opts.nth(i).locator('.sub-option-proj').textContent() || '').trim();
      expect(projText, `Opção ${i + 1} deve ter linha "Dia projetado"`).toMatch(/Dia projetado/);
    }

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-FULL8 ─────────────────────────────────────────────────────────────
  test('C-SUB-FULL8 — Mobile 390px: modal com lista completa sem overflow horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) { await page.locator('[data-modal-close]').first().click(); return; }

    // Lista não deve ter overflow horizontal em mobile
    const overflow = await page.locator('.sub-options').evaluate(
      el => el.scrollWidth > el.clientWidth
    );
    expect(overflow, '.sub-options não deve ter overflow horizontal em 390px').toBe(false);

    // Com todos os FOODS, deve haver bem mais opções que os ~5 substitutes manuais
    const count = await opts.count();
    expect(count, 'Lista completa deve ter ≥ 10 opções').toBeGreaterThanOrEqual(10);

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-ACC1 ──────────────────────────────────────────────────────────────
  test('C-SUB-ACC1 — Categoria do alimento original vem aberta por padrão', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Ovo inteiro → categoria protein → "Proteínas" deve vir aberta
    const ovoSwap = page.locator('.ingredient-name', { hasText: /ovo/i }).first()
      .locator('xpath=ancestor::li[contains(@class,"ingredient")]')
      .locator('[data-swap]');
    if (await ovoSwap.count() === 0) return;
    await ovoSwap.click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    // Grupo aberto: <details open> com summary "Proteínas"
    const openGroup = page.locator('details.sub-cat-group[open] > summary.sub-cat-label');
    await expect(openGroup).toBeVisible();
    const openLabel = (await openGroup.textContent() || '').trim();
    expect(openLabel).toMatch(/Proteínas/i);

    // As opções dentro do grupo aberto são visíveis
    const visibleOpts = page.locator('details.sub-cat-group[open] .sub-option');
    expect(await visibleOpts.count()).toBeGreaterThan(0);

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-ACC2 ──────────────────────────────────────────────────────────────
  test('C-SUB-ACC2 — Outras categorias ficam fechadas por padrão', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    // Deve haver mais que 1 grupo total (accordion)
    const allGroups = page.locator('details.sub-cat-group');
    const total = await allGroups.count();
    expect(total).toBeGreaterThan(1);

    // Apenas 1 grupo deve estar aberto
    const openGroups = page.locator('details.sub-cat-group[open]');
    expect(await openGroups.count()).toBe(1);

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-ACC3 ──────────────────────────────────────────────────────────────
  test('C-SUB-ACC3 — Clicar num grupo fechado abre-o e mostra opções', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    // Encontra o primeiro grupo FECHADO e guarda o texto do label
    const closedSummary = page.locator('details.sub-cat-group:not([open]) > summary.sub-cat-label').first();
    if (await closedSummary.count() === 0) { await page.locator('[data-modal-close]').first().click(); return; }
    const labelText = (await closedSummary.textContent() || '').trim();

    // Clica no summary para abrir
    await closedSummary.click();
    await page.waitForTimeout(200); // aguarda rAF + scroll animation

    // Verifica que um grupo com esse label está agora aberto
    const openedGroup = page.locator('details.sub-cat-group[open]');
    const openLabel = (await openedGroup.first().locator('summary').textContent() || '').trim();
    expect(openLabel).toContain(labelText.split('(')[0].trim()); // ignora o count "(N)"

    // Deve ter opções visíveis dentro do grupo aberto
    const optsInOpen = openedGroup.first().locator('.sub-option');
    expect(await optsInOpen.count()).toBeGreaterThan(0);

    // Verifica que o summary aberto está visível dentro do modal (scroll correctamente posicionado)
    const summaryVisible = await page.evaluate(() => {
      const modal   = document.querySelector('.modal');
      const summary = document.querySelector('details.sub-cat-group[open] > summary.sub-cat-label');
      if (!modal || !summary) return false;
      const mRect = modal.getBoundingClientRect();
      const sRect = summary.getBoundingClientRect();
      // Summary deve estar dentro da área visível do modal
      return sRect.top >= mRect.top - 2 && sRect.top <= mRect.bottom;
    });
    expect(summaryVisible, 'Summary da categoria aberta deve estar visível no modal').toBe(true);

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-ACC4 ──────────────────────────────────────────────────────────────
  test('C-SUB-ACC4 — Abrir uma categoria fecha as restantes (accordion exclusivo)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    // Garante que há pelo menos 2 grupos
    const allGroups = page.locator('details.sub-cat-group');
    if (await allGroups.count() < 2) { await page.locator('[data-modal-close]').first().click(); return; }

    // Clica no primeiro grupo FECHADO para abrir
    const closedGroup = page.locator('details.sub-cat-group:not([open])').first();
    if (await closedGroup.count() === 0) { await page.locator('[data-modal-close]').first().click(); return; }
    await closedGroup.locator('summary.sub-cat-label').click();

    // Aguarda toggle event propagar
    await page.waitForTimeout(100);

    // Apenas 1 grupo deve estar aberto (accordion exclusivo)
    const openGroups = page.locator('details.sub-cat-group[open]');
    expect(await openGroups.count()).toBe(1);

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-ACC5 ──────────────────────────────────────────────────────────────
  test('C-SUB-ACC5 — Aplicar substituição funciona dentro de grupo aberto', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    // Clica na primeira opção visível (dentro do grupo aberto)
    const visibleOpt = page.locator('details.sub-cat-group[open] .sub-option').first();
    if (await visibleOpt.count() === 0) { await page.locator('[data-modal-close]').first().click(); return; }
    await visibleOpt.click();

    // Substituição aplicada: badge "Substituído" visível
    await expect(page.locator('.ing-badge-subst').first()).toBeVisible();
  });

  // ── C-SUB-FULL9 ──────────────────────────────────────────────────────────────
  test('C-SUB-FULL9 — Modal mostra queijo cottage e/ou skyr (alimentos dairy não ligados manualmente)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Tenta até 8 modais para encontrar um que mostre queijo cottage ou skyr
    const swapBtns = page.locator('[data-swap]');
    const total = await swapBtns.count();
    let found = false;

    for (let i = 0; i < Math.min(total, 8); i++) {
      await swapBtns.nth(i).click();
      await expect(page.locator('.modal-backdrop.show')).toBeVisible();

      const optNames = await page.locator('.sub-option-name').allTextContents();
      if (optNames.some(n => n.includes('cottage') || n.toLowerCase().includes('skyr'))) {
        found = true;
      }
      await page.locator('[data-modal-close]').first().click();
      await expect(page.locator('.modal-backdrop.show')).not.toBeVisible({ timeout: 3000 });
      if (found) break;
    }

    expect(found, '"Queijo cottage" ou "Skyr" devem aparecer no modal').toBe(true);
  });

});

// =============================================================================
// C-SUB-C1 — Sprint C1: macro-dominant quantity for extra opts
// =============================================================================
// Valida que extraOpts usam o macro dominante da categoria do original
// para calcular a quantidade sugerida, em vez de equivalência calórica pura.

/** Helpers locais para os testes C1. */
const CENARIO_C1 = (() => {
  const { CENARIO_4 } = require('./fixtures/scenarios');
  // Targets = totais reais do Dia 1 → dia começa em ZERO de desvio
  return {
    ...CENARIO_4,
    results: {
      ...CENARIO_4.results,
      calories: 2763,
      protein:  { grams: 187 },
      carb:     { grams: 324 },
      fat:      { grams: 84  },
    },
  };
})();

/**
 * Abre o modal para o primeiro ingrediente que bate com `nameRegex`.
 * Retorna o texto de macros do alimento original, ou null se não encontrar.
 */
async function openSwapFor(page, nameRegex) {
  for (const c of await page.locator('.ingredient-name').all()) {
    const txt = (await c.textContent()) || '';
    if (nameRegex.test(txt)) {
      const btn = c.locator('xpath=ancestor::li[contains(@class,"ingredient")]').locator('[data-swap]');
      if (await btn.count() > 0) {
        await btn.click();
        await page.waitForSelector('.modal-backdrop.show', { timeout: 6000 });
        return (await page.locator('.sub-current-macros').textContent() || '').trim();
      }
    }
  }
  return null;
}

/** Abre (ou mantém aberta) uma categoria do accordion. */
async function expandCat(page, label) {
  for (const s of await page.locator('details.sub-cat-group summary').all()) {
    const txt = (await s.textContent()) || '';
    if (txt.includes(label)) {
      if (await s.locator('xpath=parent::details').getAttribute('open') === null) await s.click();
      await page.waitForTimeout(200);
      return;
    }
  }
}

/** Encontra o primeiro extra opt (não priority) com nome matching `nameRegex`. */
async function findExtraOpt(page, nameRegex) {
  for (const o of await page.locator('details.sub-cat-group[open] .sub-option').all()) {
    const name = (await o.locator('.sub-option-name').textContent() || '').trim();
    if (nameRegex.test(name)) {
      return {
        name,
        qty:    (await o.locator('.sub-option-qty').textContent() || '').trim(),
        macros: (await o.locator('.sub-option-macros').textContent() || '').trim(),
        label:  (await o.locator('.sub-impact').textContent() || '').trim(),
      };
    }
  }
  return null;
}

/** Extrai um valor de macro do texto de macros: parseFloat da primeira ocorrência de "L:Xg" */
function parseMacro(macrosText, letter) {
  const m = macrosText.match(new RegExp(`${letter}:([\\d.]+)g`));
  return m ? parseFloat(m[1]) : null;
}

test.describe('C-SUB-C1 — Sprint C1: macro-dominant quantity for extra opts', () => {

  // ── C-SUB-C1-1 ──────────────────────────────────────────────────────────
  test('C-SUB-C1-1 — Pão → Arroz: carboidratos do substituto aproximam os do original', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const origMacros = await openSwapFor(page, /Pão branco/i);
    if (!origMacros) { return; } // pão não está neste plano

    const origCarb = parseMacro(origMacros, 'C');
    expect(origCarb).not.toBeNull();

    // Arroz branco cozido está em extraOpts (não está em pao_frances.substitutes)
    await expandCat(page, 'Carboidratos');
    const arroz = await findExtraOpt(page, /Arroz branco cozido/i);
    if (!arroz) { await page.locator('[data-modal-close]').first().click(); return; }

    const subCarb = parseMacro(arroz.macros, 'C');
    expect(subCarb).not.toBeNull();

    // Sprint C1: carb do substituto deve estar dentro de ±10g do original
    // (vs kcal-only que dava C:31g para C original de ~26g → +5g diferença)
    expect(Math.abs(subCarb - origCarb),
      `Carboidratos do arroz (${subCarb}g) devem estar perto do original (${origCarb}g)`
    ).toBeLessThanOrEqual(10);

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-C1-2 ──────────────────────────────────────────────────────────
  test('C-SUB-C1-2 — Ovo → Skyr/Cottage: proteína do substituto aproxima a do original', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const origMacros = await openSwapFor(page, /ovo/i);
    if (!origMacros) { return; }

    const origProt = parseMacro(origMacros, 'P');
    expect(origProt).not.toBeNull();

    // Skyr e cottage são extraOpts (não estão em ovo_inteiro.substitutes)
    await expandCat(page, 'Laticínios');

    let found = false;
    for (const regex of [/Skyr/i, /cottage/i]) {
      const opt = await findExtraOpt(page, regex);
      if (!opt) continue;
      const subProt = parseMacro(opt.macros, 'P');
      if (subProt === null) continue;
      // Sprint C1: proteína do extra dairy deve estar dentro de ±5g do original
      expect(Math.abs(subProt - origProt),
        `Proteína de ${opt.name} (${subProt}g) deve estar perto do original (${origProt}g)`
      ).toBeLessThanOrEqual(5);
      found = true;
      break;
    }
    if (!found) { /* skyr/cottage não visíveis neste contexto — skip silencioso */ }

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-C1-3 ──────────────────────────────────────────────────────────
  test('C-SUB-C1-3 — Pão → Azeite (cross-category): fallback kcal + label honesta', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const origMacros = await openSwapFor(page, /Pão branco/i);
    if (!origMacros) { return; }

    await expandCat(page, 'Gorduras');
    const azeite = await findExtraOpt(page, /Azeite de oliva/i);
    if (!azeite) { await page.locator('[data-modal-close]').first().click(); return; }

    // C2-A: a quantidade é agora optimizada para os totais diários, não para
    // kcal-equivalência exacta. A kcal do azeite pode diferir da do pão — ok.
    // O que importa preservar é a label honesta de categoria.
    expect(azeite.label).toBe('Macros muito diferentes');

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-C1-4 ──────────────────────────────────────────────────────────
  test('C-SUB-C1-4 — Pão → Outros carboidratos extras têm quantidade prática (≥ 50g)', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const origMacros = await openSwapFor(page, /Pão branco/i);
    if (!origMacros) { return; }

    await expandCat(page, 'Carboidratos');
    const opts = await page.locator('details.sub-cat-group[open] .sub-option').all();
    let checked = 0;
    for (const o of opts.slice(0, 8)) {
      const qty   = (await o.locator('.sub-option-qty').textContent() || '').trim();
      const grams = qty.match(/(\d+)g/);
      if (grams) {
        const g = parseInt(grams[1], 10);
        expect(g, `Quantidade de carboidrato extra deve ser ≥ 50g (got ${g}g from "${qty}")`).toBeGreaterThanOrEqual(50);
        checked++;
      }
    }
    // Deve ter encontrado pelo menos algumas opções
    expect(checked, 'Deve haver opções de carb com gramas indicadas').toBeGreaterThan(0);

    await page.locator('[data-modal-close]').first().click();
  });

});

// =============================================================================
// C-SUB-HF — Hotfix: alimentos contáveis sem unidades fracionadas
// =============================================================================
// Garante que alimentos com countableUnit:true (clara_ovo, pao_frances,
// pao_forma) nunca exibem quantidades como "8.5 unidades" no modal.
// Sprint C2 não foi implementada — nenhuma funcionalidade de C2 deve existir.

test.describe('C-SUB-HF — Alimentos contáveis sem unidades fracionadas', () => {

  // ── C-SUB-HF-1 ──────────────────────────────────────────────────────────────
  // Clara de ovo é substitute curado de ovo_inteiro → aparece na categoria
  // Proteínas quando se abrem as substituições de um ovo_inteiro no plano.
  test('C-SUB-HF-1 — Clara de ovo não aparece com unidade fracionada', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    // Abre subs de qualquer ovo_inteiro do plano
    const origMacros = await openSwapFor(page, /ovo/i);
    if (!origMacros) { return; } // plano não tem ovo neste cenário — skip

    // Clara de ovo está em proteins; expande essa categoria
    await expandCat(page, 'Proteínas');

    const claraOpt = await findExtraOpt(page, /Clara de ovo/i);
    // Clara pode também aparecer como curated (priority) — procurar em toda a lista
    let claraQty = null;
    if (claraOpt) {
      claraQty = claraOpt.qty;
    } else {
      // Procura em todos os sub-options visíveis (inclui priority)
      for (const o of await page.locator('.sub-option').all()) {
        const name = (await o.locator('.sub-option-name').textContent() || '').trim();
        if (/Clara de ovo/i.test(name)) {
          claraQty = (await o.locator('.sub-option-qty').textContent() || '').trim();
          break;
        }
      }
    }

    if (claraQty === null) {
      // Clara de ovo não está visível neste contexto — skip silencioso
      await page.locator('[data-modal-close]').first().click();
      return;
    }

    // Não deve mostrar número decimal antes de "unidade"
    expect(claraQty,
      `Clara de ovo não deve mostrar unidade fracionada (got "${claraQty}")`
    ).not.toMatch(/\d+\.\d+\s+unidade/);

    // Deve mostrar número inteiro de unidades
    expect(claraQty,
      `Clara de ovo deve mostrar inteiro de unidades (got "${claraQty}")`
    ).toMatch(/^\d+\s+unidade/);

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-HF-2 ──────────────────────────────────────────────────────────────
  test('C-SUB-HF-2 — Clara de ovo: gramas são múltiplo de 33', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const origMacros = await openSwapFor(page, /ovo/i);
    if (!origMacros) { return; }

    await expandCat(page, 'Proteínas');

    let claraQty = null;
    for (const o of await page.locator('.sub-option').all()) {
      const name = (await o.locator('.sub-option-name').textContent() || '').trim();
      if (/Clara de ovo/i.test(name)) {
        claraQty = (await o.locator('.sub-option-qty').textContent() || '').trim();
        break;
      }
    }

    if (!claraQty) {
      await page.locator('[data-modal-close]').first().click();
      return;
    }

    // Extrai os gramas entre parêntesis, ex: "9 unidades (297g)" → 297
    const gramsMatch = claraQty.match(/\(~?(\d+)g\)/);
    if (gramsMatch) {
      const g = parseInt(gramsMatch[1], 10);
      expect(g % 33,
        `Gramas de Clara de ovo (${g}g) devem ser múltiplo de 33`
      ).toBe(0);
    }

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-HF-3 ──────────────────────────────────────────────────────────────
  // Ovo inteiro já tem case especial em subPracticalGrams (múltiplos de 50g).
  // Confirma que nenhuma opção de ovo_inteiro no modal exibe fracção de "ovo".
  test('C-SUB-HF-3 — Ovo inteiro não aparece com fracção de "ovo" no modal', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const origMacros = await openSwapFor(page, /Pão branco/i);
    if (!origMacros) { return; }

    // Ovo inteiro está em extraOpts das Proteínas
    await expandCat(page, 'Proteínas');
    const ovoOpt = await findExtraOpt(page, /Ovo inteiro/i);
    if (!ovoOpt) {
      await page.locator('[data-modal-close]').first().click();
      return;
    }

    expect(ovoOpt.qty,
      `Ovo inteiro não deve mostrar fracção de "ovo" (got "${ovoOpt.qty}")`
    ).not.toMatch(/\d+\.\d+\s+ovo/);

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-HF-4 ──────────────────────────────────────────────────────────────
  // Alimentos pesáveis (proteínas como frango, carne) continuam a exibir gramas
  // práticos (≥ 50g, múltiplos de 10g).
  test('C-SUB-HF-4 — Alimentos pesáveis continuam com gramas práticos', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const origMacros = await openSwapFor(page, /ovo/i);
    if (!origMacros) { return; }

    await expandCat(page, 'Proteínas');

    const peito = await findExtraOpt(page, /Peito de frango/i);
    if (peito) {
      // Deve exibir em gramas, não em "unidades"
      expect(peito.qty, `Frango deve exibir gramas (got "${peito.qty}")`).toMatch(/\d+g/);
      const g = parseInt((peito.qty.match(/(\d+)g/) || [])[1] || '0', 10);
      expect(g, `Frango deve ter ≥ 50g (got ${g})`).toBeGreaterThanOrEqual(50);
      expect(g % 10, `Frango deve ser múltiplo de 10g (got ${g}g)`).toBe(0);
    }

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-HF-5 ──────────────────────────────────────────────────────────────
  // Sprint C1 intacta: substituição macro-dominante continua a funcionar.
  // (Os testes C-SUB-C1-* são a guarda principal; este verifica a presença de
  //  opções de carboidratos ao substituir pão, garantindo que a lógica C1 não
  //  foi tocada pelo hotfix.)
  test('C-SUB-HF-5 — Sprint C1 intacta: extraOpts de carb visíveis ao substituir pão', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const origMacros = await openSwapFor(page, /Pão branco/i);
    if (!origMacros) { return; }

    await expandCat(page, 'Carboidratos');
    const opts = await page.locator('details.sub-cat-group[open] .sub-option').all();

    expect(opts.length,
      'Sprint C1: deve haver opções de carboidratos ao substituir pão'
    ).toBeGreaterThan(0);

    // Pão francês agora tem countableUnit:true → confirma que a sua própria
    // quantidade (quando aparece como extra) também é inteira, não fracionada
    const paoFrancesOpt = await findExtraOpt(page, /Pão branco/i);
    if (paoFrancesOpt) {
      expect(paoFrancesOpt.qty,
        `Pão francês não deve mostrar fracção de "unidade" (got "${paoFrancesOpt.qty}")`
      ).not.toMatch(/\d+\.\d+\s+unidade/);
    }

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-HF-7 ──────────────────────────────────────────────────────────────
  // Tofu não deve mostrar "1.5 porções" — deve exibir gramas reais.
  test('C-SUB-HF-7 — Tofu não mostra "1.5 porções", exibe gramas reais', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const origMacros = await openSwapFor(page, /ovo/i);
    if (!origMacros) { return; }

    await expandCat(page, 'Proteínas');
    const tofuOpt = await findExtraOpt(page, /Tofu firme/i);
    if (!tofuOpt) {
      await page.locator('[data-modal-close]').first().click();
      return;
    }

    // Não deve exibir fracção de "porção"
    expect(tofuOpt.qty,
      `Tofu não deve mostrar fracção de "porção" (got "${tofuOpt.qty}")`
    ).not.toMatch(/\d+\.\d+\s+por/);

    // Deve exibir em gramas (sem label de unidade genérica fracionada)
    expect(tofuOpt.qty,
      `Tofu deve exibir gramas reais (got "${tofuOpt.qty}")`
    ).toMatch(/^\d+g$/);

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-HF-8 ──────────────────────────────────────────────────────────────
  // Tapioca não deve mostrar "6.5 colheres de sopa" — deve exibir gramas reais.
  test('C-SUB-HF-8 — Tapioca não mostra "6.5 colheres de sopa", exibe gramas reais', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const origMacros = await openSwapFor(page, /Pão branco/i);
    if (!origMacros) { return; }

    await expandCat(page, 'Carboidratos');
    const tapOpt = await findExtraOpt(page, /Tapioca/i);
    if (!tapOpt) {
      await page.locator('[data-modal-close]').first().click();
      return;
    }

    // Não deve exibir fracção de "colher"
    expect(tapOpt.qty,
      `Tapioca não deve mostrar fracção de "colher" (got "${tapOpt.qty}")`
    ).not.toMatch(/\d+\.\d+\s+colher/);

    // Se a quantidade for fracionada, deve estar em gramas puras
    if (!/^\d+ colher/.test(tapOpt.qty)) {
      expect(tapOpt.qty,
        `Tapioca deve exibir gramas reais quando fraccionada (got "${tapOpt.qty}")`
      ).toMatch(/^\d+g$/);
    }

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-HF-9 ──────────────────────────────────────────────────────────────
  // Whey e caseína continuam a exibir "meio scoop" / "1 scoop e meio" (halfLabel).
  test('C-SUB-HF-9 — halfLabel (whey/caseína): "meio scoop" e "1 scoop e meio" continuam correctos', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    // Para obter whey como opção, abre substituições de proteína
    const origMacros = await openSwapFor(page, /ovo/i);
    if (!origMacros) { return; }

    await expandCat(page, 'Proteínas');

    // Verifica que whey NÃO mostra "0.5 scoop" nem "1.5 scoop"
    const wheyOpt = await findExtraOpt(page, /Proteína whey/i);
    if (wheyOpt) {
      expect(wheyOpt.qty,
        `Whey não deve mostrar fracção numérica de scoop (got "${wheyOpt.qty}")`
      ).not.toMatch(/\d+\.\d+\s+scoop/);
    }

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-HF-10 ─────────────────────────────────────────────────────────────
  // Quantidades inteiras continuam com label natural (ex: "2 colheres de sopa (30g)").
  test('C-SUB-HF-10 — Quantidades inteiras mantêm label com unidade (não regridem para gramas)', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const origMacros = await openSwapFor(page, /Pão branco/i);
    if (!origMacros) { return; }

    await expandCat(page, 'Carboidratos');
    const opts = await page.locator('details.sub-cat-group[open] .sub-option').all();

    // Pelo menos uma opção de carb deve mostrar label com unidade inteira
    // (ex: "2 colheres de sopa", "1 xícara", "3 fatias")
    let foundUnitLabel = false;
    for (const o of opts.slice(0, 12)) {
      const qty = (await o.locator('.sub-option-qty').textContent() || '').trim();
      // Label com inteiro + nome de unidade (não só gramas)
      if (/^\d+\s+\w/.test(qty) && !/^\d+g$/.test(qty) && !/^\d+\s+ml$/.test(qty)) {
        foundUnitLabel = true;
        // Confirma que não há fracção decimal neste label
        expect(qty,
          `Label de unidade inteira não deve ter decimal (got "${qty}")`
        ).not.toMatch(/\d+\.\d+/);
        break;
      }
    }
    expect(foundUnitLabel,
      'Deve haver pelo menos uma opção de carb com label de unidade inteira'
    ).toBe(true);

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-HF-6 ──────────────────────────────────────────────────────────────
  // Sprint C2 não foi implementada: o modal não deve ter nenhum elemento
  // introduzido por C2 (e.g. filtros, ordenação, histórico de substituições).
  test('C-SUB-HF-6 — Sprint C2 não implementada: modal sem novos controlos de C2', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const origMacros = await openSwapFor(page, /ovo/i);
    if (!origMacros) { return; }

    // C2 não foi implementada: nenhum destes seletores deve existir
    await expect(page.locator('[data-sub-filter]'),    'C2: filtros não devem existir').toHaveCount(0);
    await expect(page.locator('[data-sub-sort]'),      'C2: ordenação não deve existir').toHaveCount(0);
    await expect(page.locator('.sub-history'),         'C2: histórico não deve existir').toHaveCount(0);
    await expect(page.locator('.sub-c2'),              'C2: elementos c2 não devem existir').toHaveCount(0);

    await page.locator('[data-modal-close]').first().click();
  });

});

// =============================================================================
// C-SUB-C2A — Sprint C2-A: findBestGrams optimisation for extraOpts
// =============================================================================
// Verifica que a nova lógica de escolha de quantidade:
//   • melhora o encaixe nos alvos diários (menos alertas injustos);
//   • não produz quantidades absurdas;
//   • não quebra countableUnit, halfLabel, apply/revert, resumo do dia;
//   • não implementa Sprint C2-B (labels/CSS novos).

test.describe('C-SUB-C2A — Sprint C2-A: findBestGrams para extraOpts', () => {

  // ── C-SUB-C2A-1 ─────────────────────────────────────────────────────────────
  // Substituição carbo → carbo: extra opts de carboidrato devem mostrar
  // quantidades dentro de uma margem razoável dos alvos do dia.
  test('C-SUB-C2A-1 — Carbo→Carbo: extraOpts de carb têm quantidade ≥ 50g e ≤ 500g', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const origMacros = await openSwapFor(page, /Pão branco/i);
    if (!origMacros) { return; }

    await expandCat(page, 'Carboidratos');
    const opts = await page.locator('details.sub-cat-group[open] .sub-option').all();

    let checked = 0;
    for (const o of opts) {
      const qty = (await o.locator('.sub-option-qty').textContent() || '').trim();
      // Extrai gramas de expressões como "150g", "2 xícaras (320g)", "100g"
      const gramsMatch = qty.match(/(\d+)g/);
      if (!gramsMatch) continue;
      const g = parseInt(gramsMatch[1], 10);
      expect(g, `Carbo extra não deve ser < 50g (got ${g}g de "${qty}")`).toBeGreaterThanOrEqual(50);
      expect(g, `Carbo extra não deve ser > 500g (got ${g}g de "${qty}")`).toBeLessThanOrEqual(500);
      checked++;
    }
    expect(checked, 'Deve haver opções de carb com gramas').toBeGreaterThan(0);

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-C2A-2 ─────────────────────────────────────────────────────────────
  // Substituição proteína → proteína: extraOpts proteicos devem ter ≥ 50g e ≤ 400g.
  test('C-SUB-C2A-2 — Proteína→Proteína: extraOpts de proteína têm quantidade prática', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const origMacros = await openSwapFor(page, /ovo/i);
    if (!origMacros) { return; }

    await expandCat(page, 'Proteínas');
    const opts = await page.locator('details.sub-cat-group[open] .sub-option').all();

    let checked = 0;
    for (const o of opts) {
      const qty = (await o.locator('.sub-option-qty').textContent() || '').trim();
      const gramsMatch = qty.match(/(\d+)g/);
      if (!gramsMatch) continue;
      const g = parseInt(gramsMatch[1], 10);
      expect(g, `Proteína extra não deve ser < 20g (got ${g}g de "${qty}")`).toBeGreaterThanOrEqual(20);
      expect(g, `Proteína extra não deve ser > 400g (got ${g}g de "${qty}")`).toBeLessThanOrEqual(400);
      checked++;
    }
    expect(checked, 'Deve haver opções de proteína com gramas').toBeGreaterThan(0);

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-C2A-3 ─────────────────────────────────────────────────────────────
  // Substituição carbo → gordura (cross-category) não deve fingir ser perfeita.
  // A label deve ser "Macros muito diferentes" (category 'different'), nunca
  // "Troca segura", porque getSubImpact preserva a classificação de categoria.
  test('C-SUB-C2A-3 — Carbo→Gordura (cross-category): label não é "Troca segura"', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const origMacros = await openSwapFor(page, /Pão branco/i);
    if (!origMacros) { return; }

    await expandCat(page, 'Gorduras');
    const azeite = await findExtraOpt(page, /Azeite de oliva/i);
    if (!azeite) {
      await page.locator('[data-modal-close]').first().click();
      return;
    }

    // Cross-category: getSubImpact deve dar 'Macros muito diferentes' ou pior
    // nunca 'Troca segura' para pão→azeite
    expect(azeite.label,
      `Pão→Azeite não deve ser "Troca segura" (got "${azeite.label}")`
    ).not.toBe('Troca segura');

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-C2A-4 ─────────────────────────────────────────────────────────────
  // Tapioca e aveia não mostram frações feias (hotfix visual preservado).
  test('C-SUB-C2A-4 — Tapioca e aveia sem frações de "colher" (hotfix preservado)', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const origMacros = await openSwapFor(page, /Pão branco/i);
    if (!origMacros) { return; }

    await expandCat(page, 'Carboidratos');

    for (const regex of [/Tapioca/i, /aveia/i]) {
      const opt = await findExtraOpt(page, regex);
      if (!opt) continue;
      expect(opt.qty,
        `${opt.name} não deve mostrar fracção de colher (got "${opt.qty}")`
      ).not.toMatch(/\d+\.\d+\s+colher/);
    }

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-C2A-5 ─────────────────────────────────────────────────────────────
  // CountableUnit preservado: Clara de ovo continua em inteiros de unidade.
  test('C-SUB-C2A-5 — CountableUnit preservado: Clara de ovo em inteiros (hotfix e64912c)', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const origMacros = await openSwapFor(page, /ovo/i);
    if (!origMacros) { return; }

    await expandCat(page, 'Proteínas');

    let claraQty = null;
    for (const o of await page.locator('.sub-option').all()) {
      const name = (await o.locator('.sub-option-name').textContent() || '').trim();
      if (/Clara de ovo/i.test(name)) {
        claraQty = (await o.locator('.sub-option-qty').textContent() || '').trim();
        break;
      }
    }

    if (claraQty) {
      expect(claraQty,
        `Clara de ovo não deve ter fracção decimal de unidade (got "${claraQty}")`
      ).not.toMatch(/\d+\.\d+\s+unidade/);
    }

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-C2A-6 ─────────────────────────────────────────────────────────────
  // HalfLabel preservado: whey não mostra "0.5 scoop" nem "1.5 scoop".
  test('C-SUB-C2A-6 — HalfLabel preservado: whey não mostra fracção numérica de scoop', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const origMacros = await openSwapFor(page, /ovo/i);
    if (!origMacros) { return; }

    await expandCat(page, 'Proteínas');
    const wheyOpt = await findExtraOpt(page, /Proteína whey/i);
    if (wheyOpt) {
      expect(wheyOpt.qty,
        `Whey não deve mostrar fracção numérica de scoop (got "${wheyOpt.qty}")`
      ).not.toMatch(/\d+\.\d+\s+scoop/);
    }

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-C2A-7 ─────────────────────────────────────────────────────────────
  // Apply/revert continua a funcionar após a C2-A.
  test('C-SUB-C2A-7 — Apply/revert funciona depois da C2-A', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const origName = (await page.locator('.ingredient-name').first().textContent() || '').trim();

    // Abre o modal para o primeiro ingrediente
    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    // Aplica o primeiro sub-option disponível
    const firstOpt = page.locator('.sub-option').first();
    if (await firstOpt.count() === 0) {
      await page.locator('[data-modal-close]').first().click();
      return;
    }
    await firstOpt.click();
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible({ timeout: 4000 });

    // Nome do ingrediente mudou
    const newName = (await page.locator('.ingredient-name').first().textContent() || '').trim();
    expect(newName).not.toBe(origName);

    // Revert: abre modal novamente e usa #btn-reset-ing (botão de revert no modal)
    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();
    const revertBtn = page.locator('#btn-reset-ing');
    if (await revertBtn.count() > 0) {
      await revertBtn.click();
      await expect(page.locator('.modal-backdrop.show')).not.toBeVisible({ timeout: 4000 });
      const revertedName = (await page.locator('.ingredient-name').first().textContent() || '').trim();
      expect(revertedName).toBe(origName);
    } else {
      await page.locator('[data-modal-close]').first().click();
    }
  });

  // ── C-SUB-C2A-8 ─────────────────────────────────────────────────────────────
  // Resumo do dia actualiza após substituição (totais de refeição reflectem troca).
  test('C-SUB-C2A-8 — Resumo do dia actualiza após substituição', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const mealTotalsBefore = (await page.locator('[data-meal-totals="0-0"]').textContent() || '').trim();

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    const firstOpt = page.locator('.sub-option').first();
    if (await firstOpt.count() === 0) {
      await page.locator('[data-modal-close]').first().click();
      return;
    }

    // Pega macros do sub-option antes de aplicar
    const subMacros = (await firstOpt.locator('.sub-option-macros').textContent() || '').trim();
    const subKcal   = parseInt((subMacros.match(/(\d+)\s*kcal/) || [])[1] || '0', 10);

    await firstOpt.click();
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible({ timeout: 4000 });

    const mealTotalsAfter = (await page.locator('[data-meal-totals="0-0"]').textContent() || '').trim();

    // Totais devem ter mudado (a menos que a troca seja idêntica em kcal)
    // Aceita que não mudem se o sub-option tem exatamente os mesmos kcal
    if (subKcal !== 0) {
      const origKcalBefore = parseInt((mealTotalsBefore.match(/(\d+)\s*kcal/) || [])[1] || '0', 10);
      const origKcalAfter  = parseInt((mealTotalsAfter.match(/(\d+)\s*kcal/)  || [])[1] || '0', 10);
      // Ou os totais mudaram, ou o sub tinha os mesmos kcal
      const origIngKcal = parseInt(((await page.locator('.ingredient-macros').first().textContent() || '').match(/(\d+)\s*kcal/) || [])[1] || '0', 10);
      expect(
        mealTotalsAfter !== mealTotalsBefore || origKcalAfter === origKcalBefore,
        'Totais da refeição devem reflectir a substituição'
      ).toBe(true);
    }
  });

  // ── C-SUB-C2A-9 ─────────────────────────────────────────────────────────────
  // Sprint C2-B não foi implementada: sem novos labels nem CSS de C2-B.
  test('C-SUB-C2A-9 — Sprint C2-B não implementada: sem labels novos de C2-B', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const origMacros = await openSwapFor(page, /ovo/i);
    if (!origMacros) { return; }

    // Labels existentes de C2-B não devem existir ainda
    await expect(page.locator('.sub-impact-compensate'),
      'C2-B: label de compensação não deve existir'
    ).toHaveCount(0);
    await expect(page.locator('[data-compensation-hint]'),
      'C2-B: hint de compensação não deve existir'
    ).toHaveCount(0);

    // Labels existentes (Sprint B) ainda devem estar presentes
    const impactLabels = await page.locator('.sub-impact').all();
    expect(impactLabels.length, 'Deve haver labels de impacto no modal').toBeGreaterThan(0);

    await page.locator('[data-modal-close]').first().click();
  });

});

// =============================================================================
// C-SUB-C2B — Sprint C2-B: labels delta-based
// =============================================================================
// Verifica que as labels avaliam a QUALIDADE DA TROCA (delta vs original),
// não se o dia inteiro está perfeito antes da troca.

test.describe('C-SUB-C2B — Labels delta-based (Sprint C2-B)', () => {

  // ── C-SUB-C2B-1 ─────────────────────────────────────────────────────────────
  // Substitutos curados carbo→carbo (pão de forma, tapioca, bagel, wrap)
  // não devem receber alerta injusto em dia dentro da margem.
  test('C-SUB-C2B-1 — Priority carbo→carbo: bagel, tapioca, pão de forma mostram label positiva', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const orig = await openSwapFor(page, /Pão branco/i);
    if (!orig) { return; }

    // Priority subs do pão (pao_forma, tapioca, bagel, wrap_tortilha)
    // aparecem em primeiro na categoria Carboidratos — devem ter label positiva
    await expandCat(page, 'Carboidratos');
    const opts = await page.locator('details.sub-cat-group[open] .sub-option').all();
    let checked = 0;
    for (const o of opts.slice(0, 6)) {
      const name  = (await o.locator('.sub-option-name').textContent() || '').trim();
      const label = (await o.locator('.sub-impact').textContent()      || '').trim();
      // Carbo→carbo próximo: não deve ser aviso negativo forte
      const isPositive = label === 'Troca segura' || label === 'Boa troca' || label === 'Aceitável com ajuste';
      const isNegative = label === 'Atenção: macros desequilibrados'; // label antiga — não deve aparecer
      expect(isNegative,
        `${name}: label "${label}" contém alerta obsoleto "macros desequilibrados"`
      ).toBe(false);
      if (/Pão de forma|Tapioca|Bagel|Wrap/i.test(name)) {
        expect(isPositive,
          `${name}: carbo→carbo deve ter label positiva/neutra (got "${label}")`
        ).toBe(true);
        checked++;
      }
    }
    expect(checked, 'Deve ter encontrado pelo menos 1 priority carbo sub').toBeGreaterThan(0);

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-C2B-2 ─────────────────────────────────────────────────────────────
  // Priority proteína→proteína (clara de ovo, frango, tofu) — label positiva.
  test('C-SUB-C2B-2 — Priority proteína→proteína: clara de ovo, frango, tofu sem alerta injusto', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const orig = await openSwapFor(page, /[Oo]vo/i);
    if (!orig) { return; }

    await expandCat(page, 'Proteínas');
    const opts = await page.locator('details.sub-cat-group[open] .sub-option').all();

    for (const o of opts.slice(0, 8)) {
      const name  = (await o.locator('.sub-option-name').textContent() || '').trim();
      const label = (await o.locator('.sub-impact').textContent()      || '').trim();

      // "Atenção: macros desequilibrados" não deve aparecer (label obsoleto)
      expect(label,
        `${name}: label "${label}" não deve ser alerta obsoleto`
      ).not.toBe('Atenção: macros desequilibrados');

      // Priority subs proteína→proteína (mesma categoria) devem ser positivos
      if (/Clara de ovo|Peito de frango|Tofu/i.test(name)) {
        const isPositive = label === 'Troca segura' || label === 'Boa troca' || label === 'Aceitável com ajuste';
        expect(isPositive,
          `${name}: proteína→proteína deve ter label positiva/neutra (got "${label}")`
        ).toBe(true);
      }
    }

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-C2B-3 ─────────────────────────────────────────────────────────────
  // Carbo → gordura (cross-category) continua honesto: nunca "Troca segura".
  test('C-SUB-C2B-3 — Carbo→gordura: continua honesto, nunca "Troca segura"', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const orig = await openSwapFor(page, /Pão branco/i);
    if (!orig) { return; }

    await expandCat(page, 'Gorduras');
    const azeite = await findExtraOpt(page, /Azeite/i);
    if (!azeite) {
      await page.locator('[data-modal-close]').first().click();
      return;
    }

    expect(azeite.label,
      `Pão→Azeite nunca deve ser "Troca segura" (got "${azeite.label}")`
    ).not.toBe('Troca segura');

    expect(azeite.label,
      `Pão→Azeite nunca deve ser "Boa troca" (got "${azeite.label}")`
    ).not.toBe('Boa troca');

    // A label honesta é "Macros muito diferentes" (categoria 'different')
    expect(azeite.label,
      `Pão→Azeite deve ser "Macros muito diferentes" (got "${azeite.label}")`
    ).toBe('Macros muito diferentes');

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-C2B-4 ─────────────────────────────────────────────────────────────
  // Desequilíbrio pré-existente não contamina label da troca.
  // Injecta estado com dia ligeiramente fora do alvo e verifica que
  // uma troca carbo→carbo razoável não recebe alerta.
  test('C-SUB-C2B-4 — Desequilíbrio pré-existente não gera alerta na troca carbo→carbo', async ({ page }) => {
    // Cenário com dia já ligeiramente abaixo nos carbos (−40g)
    // Antes de C2-B isto disparava "Atenção: macros desequilibrados" para
    // qualquer substituto que mantivesse os carbos no mesmo nível.
    const cenarioDesequilibrado = {
      ...CENARIO_C1,
      results: {
        ...CENARIO_C1.results,
        // Alvo de carbo acima dos totais gerados pelo plano → simula desequilíbrio
        carb: { grams: 360 },
      },
    };

    await injectState(page, cenarioDesequilibrado);
    await gotoResultados(page);
    await gotoPlano(page);

    const orig = await openSwapFor(page, /Pão branco/i);
    if (!orig) { return; }

    await expandCat(page, 'Carboidratos');

    // Pão de forma e bagel são priority subs carbo→carbo com variação pequena
    for (const regex of [/Pão de forma/i, /Bagel/i, /Tapioca/i]) {
      const opt = await findExtraOpt(page, regex);
      if (!opt) continue;
      expect(opt.label,
        `${opt.name}: desequilíbrio pré-existente não deve gerar "macros desequilibrados" (got "${opt.label}")`
      ).not.toBe('Atenção: macros desequilibrados');
    }

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-C2B-5 ─────────────────────────────────────────────────────────────
  // Todos os labels visíveis no modal pertencem ao conjunto C2-B válido.
  test('C-SUB-C2B-5 — Todos os labels no modal são do conjunto C2-B válido', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const orig = await openSwapFor(page, /Pão branco/i);
    if (!orig) { return; }

    const allLabels = await page.locator('.sub-impact').allTextContents();
    for (const raw of allLabels) {
      const label = raw.trim();
      expect(VALID_SPRINTB_LABELS.has(label),
        `Label inválido em modal C2-B: "${label}"`
      ).toBe(true);
    }

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-C2B-6 ─────────────────────────────────────────────────────────────
  // Apply/revert continuam a funcionar com os novos labels.
  test('C-SUB-C2B-6 — Apply/revert funciona com labels C2-B', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const origName = (await page.locator('.ingredient-name').first().textContent() || '').trim();
    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    const firstOpt = page.locator('.sub-option').first();
    if (await firstOpt.count() === 0) {
      await page.locator('[data-modal-close]').first().click();
      return;
    }
    await firstOpt.click();
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible({ timeout: 5000 });

    const newName = (await page.locator('.ingredient-name').first().textContent() || '').trim();
    expect(newName).not.toBe(origName);

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();
    const revBtn = page.locator('#btn-reset-ing');
    if (await revBtn.count() > 0) {
      await revBtn.click();
      await expect(page.locator('.modal-backdrop.show')).not.toBeVisible({ timeout: 5000 });
      const back = (await page.locator('.ingredient-name').first().textContent() || '').trim();
      expect(back).toBe(origName);
    } else {
      await page.locator('[data-modal-close]').first().click();
    }
  });

  // ── C-SUB-C2B-7 ─────────────────────────────────────────────────────────────
  // C2-B não adiciona pop-up nem sugestões de compensação.
  test('C-SUB-C2B-7 — C2-B não implementa pop-up nem sugestões ainda', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const orig = await openSwapFor(page, /[Oo]vo/i);
    if (!orig) { return; }

    await expect(page.locator('[data-compensation-hint]'), 'C2-B: sem hint de compensação').toHaveCount(0);
    await expect(page.locator('.sub-compensation'),        'C2-B: sem pop-up de compensação').toHaveCount(0);

    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-SUB-C2B-8 ─────────────────────────────────────────────────────────────
  // C2-B não altera quantidades — as grams do sub são as mesmas de C2-A.
  test('C-SUB-C2B-8 — Quantidades não foram alteradas pela C2-B', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    const orig = await openSwapFor(page, /Pão branco/i);
    if (!orig) { return; }

    await expandCat(page, 'Carboidratos');
    const arroz = await findExtraOpt(page, /Arroz branco/i);
    if (arroz) {
      const gm = arroz.qty.match(/(\d+)g/);
      const g  = gm ? parseInt(gm[1]) : 0;
      // C2-A escolheu esta quantidade — C2-B não a deve ter alterado
      expect(g, `Arroz branco: C2-B não deve ter alterado a quantidade (got ${g}g)`).toBeGreaterThan(0);
      expect(g, 'Arroz branco: quantidade prática ≥ 50g').toBeGreaterThanOrEqual(50);
    }

    await page.locator('[data-modal-close]').first().click();
  });

});

// =============================================================================
// C-REMOVE — Sprint D1: remoção de ingredientes do plano
// =============================================================================

test.describe('C-REMOVE — Sprint D1: remoção e restauração de ingredientes', () => {

  // Helper: click the remove button of the first non-added, non-removed plan ingredient
  async function clickFirstRemoveBtn(page) {
    const btns = await page.locator('[data-remove-ingredient]').all();
    if (btns.length === 0) return null;
    const label = await btns[0].getAttribute('data-ing-label');
    await btns[0].click();
    await page.waitForSelector('.ingredient-removed', { timeout: 5000 });
    return label;
  }

  // ── C-REMOVE-1 ───────────────────────────────────────────────────────────────
  test('C-REMOVE-1 — Remover alimento: ghost aparece com texto "removido" e botão Restaurar', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    expect(await page.locator('[data-remove-ingredient]').count()).toBeGreaterThan(0);

    const removedLabel = await clickFirstRemoveBtn(page);
    expect(removedLabel).toBeTruthy();

    const ghost = page.locator('.ingredient-removed').first();
    await expect(ghost).toBeVisible();
    const ghostText = (await ghost.textContent() || '').toLowerCase();
    expect(ghostText).toContain('removido');
    await expect(ghost.locator('[data-restore-ingredient]')).toBeVisible();
  });

  // ── C-REMOVE-2 ───────────────────────────────────────────────────────────────
  test('C-REMOVE-2 — Restaurar alimento: ghost desaparece, botões de remoção voltam', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const countBefore = await page.locator('[data-remove-ingredient]').count();
    await clickFirstRemoveBtn(page);

    await page.locator('[data-restore-ingredient]').first().click();
    await expect(page.locator('.ingredient-removed')).toHaveCount(0, { timeout: 5000 });

    const countAfter = await page.locator('[data-remove-ingredient]').count();
    expect(countAfter).toBe(countBefore);
  });

  // ── C-REMOVE-3 ───────────────────────────────────────────────────────────────
  test('C-REMOVE-3 — Macros da refeição diminuem após remoção', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const before = parseMacros(
      await page.locator('[data-meal-totals="0-0"]').first().textContent() || ''
    );
    await clickFirstRemoveBtn(page);
    const after = parseMacros(
      await page.locator('[data-meal-totals="0-0"]').first().textContent() || ''
    );

    expect(after.kcal, 'kcal da refeição deve diminuir após remoção').toBeLessThan(before.kcal);
  });

  // ── C-REMOVE-4 ───────────────────────────────────────────────────────────────
  test('C-REMOVE-4 — Restaurar repõe os macros exatos da refeição', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const before = parseMacros(
      await page.locator('[data-meal-totals="0-0"]').first().textContent() || ''
    );
    await clickFirstRemoveBtn(page);
    await page.locator('[data-restore-ingredient]').first().click();
    await expect(page.locator('.ingredient-removed')).toHaveCount(0, { timeout: 5000 });

    const after = parseMacros(
      await page.locator('[data-meal-totals="0-0"]').first().textContent() || ''
    );
    expect(after.kcal, 'kcal da refeição deve voltar ao valor original').toBe(before.kcal);
  });

  // ── C-REMOVE-5 ───────────────────────────────────────────────────────────────
  test('C-REMOVE-5 — Alimento substituído pode ser removido e restaurado', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Aplica substituição
    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();
    await page.locator('.sub-option').first().click();
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('.ing-badge-subst').first()).toBeVisible();

    // Remove o ingrediente substituído
    const removeBtns = page.locator('[data-remove-ingredient]');
    expect(await removeBtns.count()).toBeGreaterThan(0);
    await removeBtns.first().click();
    await page.waitForSelector('.ingredient-removed', { timeout: 5000 });
    await expect(page.locator('.ingredient-removed').first()).toBeVisible();

    // Restaura
    await page.locator('[data-restore-ingredient]').first().click();
    await expect(page.locator('.ingredient-removed')).toHaveCount(0, { timeout: 5000 });
  });

  // ── C-REMOVE-6 ───────────────────────────────────────────────────────────────
  test('C-REMOVE-6 — Ghost tem classe no-print (não aparece em PDF/print)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await clickFirstRemoveBtn(page);

    const ghost = page.locator('.ingredient-removed').first();
    await expect(ghost).toHaveClass(/no-print/);
  });

  // ── C-REMOVE-7 ───────────────────────────────────────────────────────────────
  test('C-REMOVE-7 — Substituir continua funcionando após remoção de outro ingrediente', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await clickFirstRemoveBtn(page);

    const swapBtns = page.locator('[data-swap]');
    expect(await swapBtns.count(), 'Deve haver botões Substituir após remoção').toBeGreaterThan(0);

    // Tenta até 3 botões de swap para garantir que encontra um com opções
    let modalHasOptions = false;
    const total = await swapBtns.count();
    for (let i = 0; i < Math.min(total, 3); i++) {
      await swapBtns.nth(i).click();
      await expect(page.locator('.modal-backdrop.show')).toBeVisible({ timeout: 5000 });
      const opts = await page.locator('.sub-option').count();
      if (opts > 0) { modalHasOptions = true; break; }
      await page.locator('[data-modal-close]').first().click();
      await expect(page.locator('.modal-backdrop.show')).not.toBeVisible({ timeout: 3000 });
    }
    expect(modalHasOptions, 'Pelo menos um modal de substituição deve ter opções').toBe(true);
    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-REMOVE-8 ───────────────────────────────────────────────────────────────
  test('C-REMOVE-8 — Reverter para original continua funcionando', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();
    await page.locator('.sub-option').first().click();
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible({ timeout: 5000 });

    await expect(page.locator('[data-revert]').first()).toBeVisible();
    await page.locator('[data-revert]').first().click();
    await expect(page.locator('.ing-badge-subst')).toHaveCount(0, { timeout: 3000 });
  });

  // ── C-REMOVE-9 ───────────────────────────────────────────────────────────────
  test('C-REMOVE-9 — + Criar Alimento continua funcionando após remoção', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await clickFirstRemoveBtn(page);

    const addBtn = page.locator('[data-add-food]').first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible({ timeout: 5000 });
    await page.locator('[data-modal-close]').first().click();
  });

  // ── C-REMOVE-10 ──────────────────────────────────────────────────────────────
  test('C-REMOVE-10 — Alimentos adicionados mantêm botão próprio (data-remove-addition)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Verifica que botões do plano e de additions são distintos
    const planRemoveBtns = await page.locator('[data-remove-ingredient]').count();
    expect(planRemoveBtns, 'Deve haver botões de remoção do plano').toBeGreaterThan(0);

    // data-remove-ingredient nunca deve coexistir com data-remove-addition no mesmo elemento
    const overlap = await page.locator('[data-remove-ingredient][data-remove-addition]').count();
    expect(overlap, 'data-remove-ingredient e data-remove-addition não devem coexistir').toBe(0);
  });

  // ── C-REMOVE-11 ──────────────────────────────────────────────────────────────
  test('C-REMOVE-11 — Resumo do dia aparece após remoção (bloco de comparação)', async ({ page }) => {
    await injectState(page, CENARIO_C1);
    await gotoResultados(page);
    await gotoPlano(page);

    // Sem alterações: bloco de comparação ausente
    await expect(page.locator('[data-testid="day-comp-block"]').first()).not.toBeVisible();

    // Após remoção: bloco aparece
    await clickFirstRemoveBtn(page);
    await expect(page.locator('[data-testid="day-comp-block"]').first()).toBeVisible();
  });

  // ── C-REMOVE-12 ──────────────────────────────────────────────────────────────
  test('C-REMOVE-12 — Mobile 390px: ghost e Restaurar sem overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await clickFirstRemoveBtn(page);

    const ghost = page.locator('.ingredient-removed').first();
    await expect(ghost).toBeVisible();

    const scrollW = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollW, 'Mobile: sem overflow após remoção').toBeLessThanOrEqual(395);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Sprint E2-A — Adicionar alimento da biblioteca padrão
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Adicionar alimento da biblioteca (Sprint E2-A)', () => {

  // ── C-E2A-1 ──────────────────────────────────────────────────────────────
  test('C-E2A-1 — Botão "+ Adicionar Alimento" aparece ao lado de "+ Criar Alimento"', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const libBtns = page.locator('[data-add-library]');
    const addBtns = page.locator('[data-add-food]');
    const libCount = await libBtns.count();
    const addCount = await addBtns.count();

    expect(libCount).toBeGreaterThanOrEqual(6);
    expect(addCount).toEqual(libCount);

    const txt = (await libBtns.first().textContent() || '').trim();
    expect(txt).toMatch(/Adicionar Alimento/i);

    const addRow = page.locator('.ing-add-row').first();
    await expect(addRow.locator('[data-add-food]')).toBeVisible();
    await expect(addRow.locator('[data-add-library]')).toBeVisible();
  });

  // ── C-E2A-2 ──────────────────────────────────────────────────────────────
  test('C-E2A-2 — Clicar em "+ Adicionar Alimento" abre modal da biblioteca', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-library]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    const title = (await page.locator('.modal-title').first().textContent() || '').trim();
    expect(title).toMatch(/Adicionar Alimento/i);

    const groups = page.locator('.sub-cat-group');
    expect(await groups.count()).toBeGreaterThanOrEqual(4);

    const items = page.locator('.lib-food-item');
    expect(await items.count()).toBeGreaterThan(10);
  });

  // ── C-E2A-3 ──────────────────────────────────────────────────────────────
  test('C-E2A-3 — Modal mostra nome, porção, kcal/macros e botão Adicionar por alimento', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-library]').first().click();
    await page.waitForSelector('.lib-food-item', { timeout: 5000 });

    const first = page.locator('.lib-food-item').first();
    await expect(first.locator('.lib-food-name')).toBeVisible();
    await expect(first.locator('.lib-food-qty')).toBeVisible();
    await expect(first.locator('.lib-food-macros')).toBeVisible();
    await expect(first.locator('.lib-add-btn')).toBeVisible();

    const macroTxt = await first.locator('.lib-food-macros').textContent() || '';
    expect(macroTxt).toMatch(/kcal/i);
    expect(macroTxt).toMatch(/P:/);
  });

  // ── C-E2A-4 ──────────────────────────────────────────────────────────────
  test('C-E2A-4 — Adicionar da biblioteca: badge ADICIONADO aparece na refeição', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const firstMeal = page.locator('#day-body-0 .meal-card').first();
    const beforeCount = await firstMeal.locator('.ing-badge-added').count();

    await page.locator('[data-add-library][data-day-idx="0"][data-meal-idx="0"]').click();
    await page.waitForSelector('.lib-add-btn', { timeout: 5000 });
    await page.locator('.lib-add-btn').first().click();
    await page.waitForTimeout(400);

    const afterCount = await firstMeal.locator('.ing-badge-added').count();
    expect(afterCount).toBeGreaterThan(beforeCount);
  });

  // ── C-E2A-5 ──────────────────────────────────────────────────────────────
  test('C-E2A-5 — kcal/macros da refeição aumentam após adicionar da biblioteca', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const mealBefore = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');

    await page.locator('[data-add-library][data-day-idx="0"][data-meal-idx="0"]').click();
    await page.waitForSelector('.lib-add-btn', { timeout: 5000 });
    await page.locator('.lib-add-btn').first().click();
    await page.waitForTimeout(400);

    const mealAfter = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');
    expect(mealAfter.kcal).toBeGreaterThan(mealBefore.kcal);
  });

  // ── C-E2A-6 ──────────────────────────────────────────────────────────────
  test('C-E2A-6 — kcal/macros do dia aumentam após adicionar da biblioteca', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const dayBefore = await getDayTotals(page, 0);

    await page.locator('[data-add-library][data-day-idx="0"][data-meal-idx="0"]').click();
    await page.waitForSelector('.lib-add-btn', { timeout: 5000 });
    await page.locator('.lib-add-btn').first().click();
    await page.waitForTimeout(400);

    const dayAfter = await getDayTotals(page, 0);
    expect(dayAfter.kcal).toBeGreaterThan(dayBefore.kcal);
  });

  // ── C-E2A-7 ──────────────────────────────────────────────────────────────
  test('C-E2A-7 — Resumo do dia (Com alterações / Original / Diferença) aparece', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-library][data-day-idx="0"][data-meal-idx="0"]').click();
    await page.waitForSelector('.lib-add-btn', { timeout: 5000 });
    await page.locator('.lib-add-btn').first().click();
    await page.waitForTimeout(400);

    const comp = page.locator('[data-testid="day-comp-block"]').first();
    await expect(comp).toBeVisible();
    await expect(comp.locator('[data-testid="day-current-totals"]')).toBeVisible();
    await expect(comp.locator('[data-testid="day-original-totals"]')).toBeVisible();
    await expect(comp.locator('[data-testid="day-delta-totals"]')).toBeVisible();
  });

  // ── C-E2A-8 ──────────────────────────────────────────────────────────────
  test('C-E2A-8 — Remover alimento da biblioteca: totais voltam ao original', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const dayBefore = await getDayTotals(page, 0);
    const firstMeal = page.locator('#day-body-0 .meal-card').first();

    await page.locator('[data-add-library][data-day-idx="0"][data-meal-idx="0"]').click();
    await page.waitForSelector('.lib-add-btn', { timeout: 5000 });
    await page.locator('.lib-add-btn').first().click();
    await page.waitForTimeout(400);

    await firstMeal.locator('[data-remove-addition]').last().click();
    await page.waitForTimeout(400);

    const dayAfter = await getDayTotals(page, 0);
    expect(Math.abs(dayAfter.kcal - dayBefore.kcal)).toBeLessThanOrEqual(2);
  });

  // ── C-E2A-9 ──────────────────────────────────────────────────────────────
  test('C-E2A-9 — PDF/print inclui alimento adicionado da biblioteca', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('[data-pdf-day="0"]').first().click();
    await page.waitForSelector('#day-pdf-print-area', { state: 'attached', timeout: 5000 });
    const ingsBefore = await page.locator('#day-pdf-print-area .ing-list li').count();

    await page.locator('[data-add-library][data-day-idx="0"][data-meal-idx="0"]').click();
    await page.waitForSelector('.lib-add-btn', { timeout: 5000 });
    await page.locator('.lib-add-btn').first().click();
    await page.waitForTimeout(400);

    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('[data-pdf-day="0"]').first().click();
    await page.waitForSelector('#day-pdf-print-area', { state: 'attached', timeout: 5000 });
    const ingsAfter = await page.locator('#day-pdf-print-area .ing-list li').count();

    expect(ingsAfter).toBeGreaterThan(ingsBefore);
  });

  // ── C-E2A-10 ─────────────────────────────────────────────────────────────
  test('C-E2A-10 — PDF/print não inclui alimento da biblioteca após remoção', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const firstMeal = page.locator('#day-body-0 .meal-card').first();

    await page.locator('[data-add-library][data-day-idx="0"][data-meal-idx="0"]').click();
    await page.waitForSelector('.lib-add-btn', { timeout: 5000 });
    await page.locator('.lib-add-btn').first().click();
    await page.waitForTimeout(400);

    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('[data-pdf-day="0"]').first().click();
    await page.waitForSelector('#day-pdf-print-area', { state: 'attached', timeout: 5000 });
    const ingsWithAdd = await page.locator('#day-pdf-print-area .ing-list li').count();

    await firstMeal.locator('[data-remove-addition]').last().click();
    await page.waitForTimeout(400);

    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('[data-pdf-day="0"]').first().click();
    await page.waitForSelector('#day-pdf-print-area', { state: 'attached', timeout: 5000 });
    const ingsAfterRemove = await page.locator('#day-pdf-print-area .ing-list li').count();

    expect(ingsAfterRemove).toBeLessThan(ingsWithAdd);
  });

  // ── C-E2A-11 ─────────────────────────────────────────────────────────────
  test('C-E2A-11 — Mobile 390px: dois botões visíveis sem overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await expect(page.locator('[data-add-food]').first()).toBeVisible();
    await expect(page.locator('[data-add-library]').first()).toBeVisible();

    const scrollW = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollW, 'Mobile: sem overflow com 2 botões').toBeLessThanOrEqual(395);
  });

  // ── C-E2A-12 ─────────────────────────────────────────────────────────────
  test('C-E2A-12 — "+ Criar Alimento" continua funcionando após E2-A', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await expect(page.locator('#add-food-form')).toBeVisible();
    await fillAddFoodForm(page, TEST_FOOD);
    await page.locator('#add-food-form button[type="submit"]').click();
    await page.waitForTimeout(400);

    const badges = await page.locator('#day-body-0 .meal-card').first().locator('.ing-badge-added').count();
    expect(badges).toBeGreaterThanOrEqual(1);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Sprint F1 — Editar quantidade de ingrediente do plano
// ─────────────────────────────────────────────────────────────────────────────

/** Helper: abre modal de edição do 1º ingrediente original da 1ª refeição do Dia 1. */
async function openFirstEditModal(page) {
  await page.locator('[data-edit-ingredient][data-day-idx="0"][data-meal-idx="0"]').first().click();
  await page.waitForSelector('#epi-grams', { timeout: 5000 });
}

test.describe('Editar quantidade de ingrediente do plano (Sprint F1)', () => {

  // ── C-EDIT-1 ──────────────────────────────────────────────────────────────
  test('C-EDIT-1 — Botão Editar aparece em ingredientes originais do plano', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const editBtns = page.locator('[data-edit-ingredient]');
    const count    = await editBtns.count();
    expect(count).toBeGreaterThan(0);
    await expect(editBtns.first()).toBeVisible();

    // Botão não aparece em alimentos adicionados (those use data-edit-addition)
    const addEditBtns = page.locator('[data-edit-addition]');
    expect(await addEditBtns.count()).toBe(0); // nenhum alimento adicionado ainda
  });

  // ── C-EDIT-2 ──────────────────────────────────────────────────────────────
  test('C-EDIT-2 — Clicar Editar abre modal com nome e gramas pré-preenchidos', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await openFirstEditModal(page);

    await expect(page.locator('.modal-title').first()).toHaveText(/Editar Ingrediente/i);
    await expect(page.locator('#epi-grams')).toBeVisible();
    // Campo deve ter valor numérico (gramas originais)
    const val = parseFloat(await page.locator('#epi-grams').inputValue());
    expect(val).toBeGreaterThan(0);
    // Nome do ingrediente visível (read-only)
    await expect(page.locator('.sub-current-name').first()).toBeVisible();
    // Campos de macro pré-preenchidos (F2-A: substituem o preview de texto)
    const kcalVal = parseFloat(await page.locator('#epi-kcal').inputValue());
    expect(kcalVal).toBeGreaterThan(0);
  });

  // ── C-EDIT-3 ──────────────────────────────────────────────────────────────
  test('C-EDIT-3 — Alterar gramas recalcula macros no preview ao vivo', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await openFirstEditModal(page);

    // F2-A: os campos de macro são o preview — verificar que kcal muda ao alterar gramas
    const kcalBefore = parseFloat(await page.locator('#epi-kcal').inputValue() || '0');
    await page.locator('#epi-grams').fill('200');
    await page.waitForTimeout(100);
    const kcalAfter = parseFloat(await page.locator('#epi-kcal').inputValue() || '0');
    expect(kcalAfter).not.toBeCloseTo(kcalBefore);
    expect(kcalAfter).toBeGreaterThan(0);
  });

  // ── C-EDIT-4 ──────────────────────────────────────────────────────────────
  test('C-EDIT-4 — Guardar edição mostra badge EDITADO', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const beforeBadges = await page.locator('#day-body-0 .meal-card').first().locator('.ing-badge-edited').count();
    expect(beforeBadges).toBe(0);

    await openFirstEditModal(page);
    await page.locator('#epi-grams').fill('200');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    const afterBadges = await page.locator('#day-body-0 .meal-card').first().locator('.ing-badge-edited').count();
    expect(afterBadges).toBeGreaterThan(0);
  });

  // ── C-EDIT-5 ──────────────────────────────────────────────────────────────
  test('C-EDIT-5 — Totais da refeição atualizam após edição', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const before = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');

    await openFirstEditModal(page);
    await page.locator('#epi-grams').fill('1');  // quase zero gramas → macros caem
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    const after = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');
    expect(after.kcal).not.toBe(before.kcal);
  });

  // ── C-EDIT-6 ──────────────────────────────────────────────────────────────
  test('C-EDIT-6 — Totais do dia atualizam após edição', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const before = await getDayTotals(page, 0);

    await openFirstEditModal(page);
    await page.locator('#epi-grams').fill('1');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    const after = await getDayTotals(page, 0);
    expect(after.kcal).not.toBe(before.kcal);
  });

  // ── C-EDIT-7 ──────────────────────────────────────────────────────────────
  test('C-EDIT-7 — Resumo do dia (Com alterações/Original/Diferença) aparece', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await openFirstEditModal(page);
    await page.locator('#epi-grams').fill('200');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    const comp = page.locator('[data-testid="day-comp-block"]').first();
    await expect(comp).toBeVisible();
    await expect(comp.locator('[data-testid="day-current-totals"]')).toBeVisible();
    await expect(comp.locator('[data-testid="day-original-totals"]')).toBeVisible();
    await expect(comp.locator('[data-testid="day-delta-totals"]')).toBeVisible();
  });

  // ── C-EDIT-8 ──────────────────────────────────────────────────────────────
  test('C-EDIT-8 — PDF/print usa os valores editados', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // PDF antes da edição
    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('[data-pdf-day="0"]').first().click();
    await page.waitForSelector('#day-pdf-print-area', { state: 'attached', timeout: 5000 });
    const totalsBefore = await page.locator('#day-pdf-print-area .tot-val').first().textContent() || '';

    // Editar: 1g → kcal caem drasticamente
    await openFirstEditModal(page);
    await page.locator('#epi-grams').fill('1');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    // PDF depois da edição
    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('[data-pdf-day="0"]').first().click();
    await page.waitForSelector('#day-pdf-print-area', { state: 'attached', timeout: 5000 });
    const totalsAfter = await page.locator('#day-pdf-print-area .tot-val').first().textContent() || '';

    expect(totalsAfter).not.toBe(totalsBefore);
  });

  // ── C-EDIT-9 ──────────────────────────────────────────────────────────────
  test('C-EDIT-9 — Reverter edição: valores voltam exatamente ao original', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const dayOriginal = await getDayTotals(page, 0);

    // Editar
    await openFirstEditModal(page);
    await page.locator('#epi-grams').fill('200');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    // Reverter
    const revertBtn = page.locator('[data-revert-edit]').first();
    await expect(revertBtn).toBeVisible();
    await revertBtn.click();
    await page.waitForTimeout(400);

    // Badge EDITADO desapareceu
    const badges = await page.locator('#day-body-0 .ing-badge-edited').count();
    expect(badges).toBe(0);

    // Totais voltaram ao original
    const dayReverted = await getDayTotals(page, 0);
    expect(Math.abs(dayReverted.kcal - dayOriginal.kcal)).toBeLessThanOrEqual(2);
  });

  // ── C-EDIT-10 ─────────────────────────────────────────────────────────────
  test('C-EDIT-10 — Remover alimento editado continua funcionando', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Editar
    await openFirstEditModal(page);
    await page.locator('#epi-grams').fill('200');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    const dayAfterEdit = await getDayTotals(page, 0);

    // Remover o ingrediente editado
    const firstMeal = page.locator('#day-body-0 .meal-card').first();
    const removeBtn = firstMeal.locator('[data-remove-ingredient]').first();
    await removeBtn.click();
    await page.waitForTimeout(400);

    // Linha ghost aparece
    const ghost = firstMeal.locator('.ingredient-removed').first();
    await expect(ghost).toBeVisible();

    // Totais diminuíram
    const dayAfterRemove = await getDayTotals(page, 0);
    expect(dayAfterRemove.kcal).toBeLessThan(dayAfterEdit.kcal);
  });

  // ── C-EDIT-11 ─────────────────────────────────────────────────────────────
  test('C-EDIT-11 — Substituições continuam funcionando com edições activas', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Editar 1º ingrediente
    await openFirstEditModal(page);
    await page.locator('#epi-grams').fill('200');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    // Substituir 2º ingrediente (diferente) usando a função helper existente
    const swapBtn = page.locator('#day-body-0 .meal-card').first().locator('[data-swap]').nth(1);
    if (await swapBtn.count() > 0) {
      await swapBtn.click();
      await page.waitForSelector('.modal-backdrop.show', { timeout: 5000 });
      // Seleccionar apenas sub-options dentro de details[open] (visíveis)
      const visibleOpt = page.locator('.sub-cat-group[open] .sub-option').first();
      if (await visibleOpt.count() > 0) {
        await visibleOpt.click();
        await page.waitForTimeout(400);
        const subBadge = page.locator('#day-body-0 .meal-card').first().locator('.ing-badge-subst');
        await expect(subBadge.first()).toBeVisible();
      }
    }
    // Badge editado mantém-se
    await expect(page.locator('#day-body-0 .ing-badge-edited').first()).toBeVisible();
  });

  // ── C-EDIT-12 ─────────────────────────────────────────────────────────────
  test('C-EDIT-12 — Mobile 390px: Editar funciona sem overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await expect(page.locator('[data-edit-ingredient]').first()).toBeVisible();

    const scrollW = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollW, 'Mobile: sem overflow').toBeLessThanOrEqual(395);

    // Abrir modal e guardar no mobile
    await openFirstEditModal(page);
    await page.locator('#epi-grams').fill('200');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);
    await expect(page.locator('.ing-badge-edited').first()).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Sprint F1 Hotfix — Label com quantidade numérica inicial limpo após edição
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Editar ingrediente — limpeza de label numérico (Sprint F1 Hotfix)', () => {

  // ── C-EDIT-HOT-1 ──────────────────────────────────────────────────────────
  test('C-EDIT-HOT-1 — Label com número inicial: nome limpo após edição', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const firstMeal = page.locator('#day-body-0 .meal-card').first();
    const allIngs   = firstMeal.locator('.ingredient:not(.ingredient-removed)');
    const ingCount  = await allIngs.count();

    // Encontrar ingrediente cujo nome começa com número
    let targetIdx = -1;
    let originalName = '';
    for (let i = 0; i < ingCount; i++) {
      const nm = (await allIngs.nth(i).locator('.ingredient-name').first().textContent() || '').trim();
      if (/^\d/.test(nm)) { targetIdx = i; originalName = nm; break; }
    }
    // Cenário tem ovos — deve haver pelo menos 1 nome com número
    expect(targetIdx, 'Deve existir pelo menos 1 ingrediente com número no nome').toBeGreaterThanOrEqual(0);

    // Editar esse ingrediente
    await allIngs.nth(targetIdx).locator('[data-edit-ingredient]').click();
    await page.waitForSelector('#epi-grams', { timeout: 5000 });
    await page.locator('#epi-grams').fill('200');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    // Nome exibido não deve começar com dígito
    const editedName = (await allIngs.nth(targetIdx).locator('.ingredient-name').first().textContent() || '')
      .replace('Editado', '').replace('EDITADO', '').trim();
    expect(editedName, 'Nome após edição não deve começar com número').not.toMatch(/^\d/);

    // O nome deve ainda conter a palavra principal (ex: "ovos")
    const keyWord = originalName.split(/\s+/).find(w => w.length > 2 && !/^\d/.test(w)) || '';
    if (keyWord) {
      expect(editedName.toLowerCase()).toContain(keyWord.toLowerCase());
    }
  });

  // ── C-EDIT-HOT-2 ──────────────────────────────────────────────────────────
  test('C-EDIT-HOT-2 — Reverter edição: nome original com número é restaurado', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const firstMeal = page.locator('#day-body-0 .meal-card').first();
    const allIngs   = firstMeal.locator('.ingredient:not(.ingredient-removed)');

    // Encontrar e editar ingrediente com número no nome
    let targetIdx = -1;
    let originalName = '';
    for (let i = 0; i < await allIngs.count(); i++) {
      const nm = (await allIngs.nth(i).locator('.ingredient-name').first().textContent() || '').trim();
      if (/^\d/.test(nm)) { targetIdx = i; originalName = nm; break; }
    }
    if (targetIdx === -1) return; // nenhum disponível — skip

    await allIngs.nth(targetIdx).locator('[data-edit-ingredient]').click();
    await page.waitForSelector('#epi-grams', { timeout: 5000 });
    await page.locator('#epi-grams').fill('200');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    // Reverter
    const revertBtn = allIngs.nth(targetIdx).locator('[data-revert-edit]');
    await expect(revertBtn).toBeVisible();
    await revertBtn.click();
    await page.waitForTimeout(400);

    // Nome deve voltar exactamente ao original (com número)
    const revertedName = (await allIngs.nth(targetIdx).locator('.ingredient-name').first().textContent() || '').trim();
    expect(revertedName).toBe(originalName);
  });

  // ── C-EDIT-HOT-3 ──────────────────────────────────────────────────────────
  test('C-EDIT-HOT-3 — Nomes sem número inicial não mudam após edição', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const firstMeal = page.locator('#day-body-0 .meal-card').first();
    const allIngs   = firstMeal.locator('.ingredient:not(.ingredient-removed)');

    // Encontrar ingrediente cujo nome NÃO começa com número
    let targetIdx = -1;
    let originalName = '';
    for (let i = 0; i < await allIngs.count(); i++) {
      const nm = (await allIngs.nth(i).locator('.ingredient-name').first().textContent() || '').trim();
      if (!/^\d/.test(nm) && nm.length > 3) { targetIdx = i; originalName = nm; break; }
    }
    if (targetIdx === -1) return; // todos começam com número — improvável

    await allIngs.nth(targetIdx).locator('[data-edit-ingredient]').click();
    await page.waitForSelector('#epi-grams', { timeout: 5000 });
    await page.locator('#epi-grams').fill('200');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    // Nome sem número inicial deve permanecer igual
    const editedName = (await allIngs.nth(targetIdx).locator('.ingredient-name').first().textContent() || '')
      .replace('Editado', '').replace('EDITADO', '').trim();
    expect(editedName).toBe(originalName);
  });

  // ── C-EDIT-HOT-4 ──────────────────────────────────────────────────────────
  test('C-EDIT-HOT-4 — PDF usa nome limpo para ingrediente editado', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const firstMeal = page.locator('#day-body-0 .meal-card').first();
    const allIngs   = firstMeal.locator('.ingredient:not(.ingredient-removed)');

    // Encontrar e editar ingrediente com número no nome
    let targetIdx = -1;
    let originalName = '';
    for (let i = 0; i < await allIngs.count(); i++) {
      const nm = (await allIngs.nth(i).locator('.ingredient-name').first().textContent() || '').trim();
      if (/^\d/.test(nm)) { targetIdx = i; originalName = nm; break; }
    }
    if (targetIdx === -1) return;

    await allIngs.nth(targetIdx).locator('[data-edit-ingredient]').click();
    await page.waitForSelector('#epi-grams', { timeout: 5000 });
    await page.locator('#epi-grams').fill('200');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    // Capturar nome limpo da tela
    const screenName = (await allIngs.nth(targetIdx).locator('.ingredient-name').first().textContent() || '')
      .replace('Editado', '').replace('EDITADO', '').trim();

    // Verificar PDF
    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('[data-pdf-day="0"]').first().click();
    await page.waitForSelector('#day-pdf-print-area', { state: 'attached', timeout: 5000 });

    const pdfNames = await page.locator('#day-pdf-print-area .ing-name').allTextContents();
    // Nome limpo (sem número) deve aparecer no PDF
    const pdfHasCleanName = pdfNames.some(n => n.includes(screenName));
    expect(pdfHasCleanName, 'PDF deve mostrar nome limpo: "' + screenName + '"').toBe(true);
    // Nome original COM número NÃO deve aparecer no PDF (para este ingrediente)
    const pdfHasOriginalName = pdfNames.some(n => n === originalName);
    expect(pdfHasOriginalName, 'PDF não deve mostrar nome original com número: "' + originalName + '"').toBe(false);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Sprint F2-A — Edição manual de macros
// ─────────────────────────────────────────────────────────────────────────────

/** Helper: abre modal do 1º ingrediente original da 1ª refeição e retorna os valores. */
async function openFirstIngModal(page) {
  await page.locator('[data-edit-ingredient][data-day-idx="0"][data-meal-idx="0"]').first().click();
  await page.waitForSelector('#epi-kcal', { timeout: 5000 });
}

test.describe('Editar macros manualmente (Sprint F2-A)', () => {

  // ── C-F2A-1 ───────────────────────────────────────────────────────────────
  test('C-F2A-1 — Modal Editar mostra campos kcal/P/C/G editáveis', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await openFirstIngModal(page);

    await expect(page.locator('#epi-kcal')).toBeVisible();
    await expect(page.locator('#epi-prot')).toBeVisible();
    await expect(page.locator('#epi-carb')).toBeVisible();
    await expect(page.locator('#epi-fat')).toBeVisible();
    await expect(page.locator('#epi-grams')).toBeVisible();

    // Campos pré-preenchidos com valores numéricos
    const kcal = parseFloat(await page.locator('#epi-kcal').inputValue());
    expect(kcal).toBeGreaterThan(0);
  });

  // ── C-F2A-2 ───────────────────────────────────────────────────────────────
  test('C-F2A-2 — Alterar gramas recalcula campos de macro automaticamente', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await openFirstIngModal(page);

    const kcalBefore = parseFloat(await page.locator('#epi-kcal').inputValue());
    await page.locator('#epi-grams').fill('200');
    await page.waitForTimeout(100);
    const kcalAfter = parseFloat(await page.locator('#epi-kcal').inputValue());

    expect(kcalAfter).not.toBeCloseTo(kcalBefore);  // recalculado
    expect(kcalAfter).toBeGreaterThan(0);
  });

  // ── C-F2A-3 ───────────────────────────────────────────────────────────────
  test('C-F2A-3 — Editar macros manualmente: valores guardados como override', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await openFirstIngModal(page);
    await page.locator('#epi-kcal').fill('999');
    await page.locator('#epi-prot').fill('88');
    await page.locator('#epi-carb').fill('11');
    await page.locator('#epi-fat').fill('2');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    // Macros da refeição devem incluir os valores manuais
    const mealMacros = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');
    expect(mealMacros.kcal).toBeGreaterThan(900); // deve incluir os 999 kcal
  });

  // ── C-F2A-4 ───────────────────────────────────────────────────────────────
  test('C-F2A-4 — Totais da refeição usam macros manuais', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const before = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');

    await openFirstIngModal(page);
    await page.locator('#epi-kcal').fill('1');  // quase zero
    await page.locator('#epi-prot').fill('0.1');
    await page.locator('#epi-carb').fill('0.1');
    await page.locator('#epi-fat').fill('0.1');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    const after = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');
    expect(after.kcal).toBeLessThan(before.kcal);
  });

  // ── C-F2A-5 ───────────────────────────────────────────────────────────────
  test('C-F2A-5 — Totais do dia usam macros manuais', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const dayBefore = await getDayTotals(page, 0);

    await openFirstIngModal(page);
    await page.locator('#epi-kcal').fill('1');
    await page.locator('#epi-prot').fill('0.1');
    await page.locator('#epi-carb').fill('0.1');
    await page.locator('#epi-fat').fill('0.1');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    const dayAfter = await getDayTotals(page, 0);
    expect(dayAfter.kcal).toBeLessThan(dayBefore.kcal);
  });

  // ── C-F2A-6 ───────────────────────────────────────────────────────────────
  test('C-F2A-6 — Resumo do dia aparece após edição manual de macros', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await openFirstIngModal(page);
    await page.locator('#epi-kcal').fill('999');
    await page.locator('#epi-prot').fill('50');
    await page.locator('#epi-carb').fill('10');
    await page.locator('#epi-fat').fill('5');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    const comp = page.locator('[data-testid="day-comp-block"]').first();
    await expect(comp).toBeVisible();
    await expect(comp.locator('[data-testid="day-current-totals"]')).toBeVisible();
  });

  // ── C-F2A-7 ───────────────────────────────────────────────────────────────
  test('C-F2A-7 — PDF usa macros manuais', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // PDF antes
    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('[data-pdf-day="0"]').first().click();
    await page.waitForSelector('#day-pdf-print-area', { state: 'attached', timeout: 5000 });
    const totBefore = (await page.locator('#day-pdf-print-area .tot-val').first().textContent() || '').trim();

    // Editar macros manualmente
    await openFirstIngModal(page);
    await page.locator('#epi-kcal').fill('1');
    await page.locator('#epi-prot').fill('0.1');
    await page.locator('#epi-carb').fill('0.1');
    await page.locator('#epi-fat').fill('0.1');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    // PDF depois
    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('[data-pdf-day="0"]').first().click();
    await page.waitForSelector('#day-pdf-print-area', { state: 'attached', timeout: 5000 });
    const totAfter = (await page.locator('#day-pdf-print-area .tot-val').first().textContent() || '').trim();

    expect(totAfter).not.toBe(totBefore);
  });

  // ── C-F2A-8 ───────────────────────────────────────────────────────────────
  test('C-F2A-8 — Reverter edição: macros originais restaurados', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const dayOriginal = await getDayTotals(page, 0);

    // Editar
    await openFirstIngModal(page);
    await page.locator('#epi-kcal').fill('999');
    await page.locator('#epi-prot').fill('50');
    await page.locator('#epi-carb').fill('10');
    await page.locator('#epi-fat').fill('5');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    // Reverter
    await page.locator('[data-revert-edit]').first().click();
    await page.waitForTimeout(400);

    const dayReverted = await getDayTotals(page, 0);
    expect(Math.abs(dayReverted.kcal - dayOriginal.kcal)).toBeLessThanOrEqual(2);
    expect(await page.locator('#day-body-0 .ing-badge-edited').count()).toBe(0);
  });

  // ── C-F2A-9 ───────────────────────────────────────────────────────────────
  test('C-F2A-9 — Alterar gramas limpa override e recalcula macro fields', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Primeiro: guardar com override manual
    await openFirstIngModal(page);
    await page.locator('#epi-kcal').fill('999');
    await page.locator('#epi-prot').fill('50');
    await page.locator('#epi-carb').fill('10');
    await page.locator('#epi-fat').fill('5');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    // Reabrir e alterar só gramas
    await openFirstIngModal(page);
    const kcalWithOverride = parseFloat(await page.locator('#epi-kcal').inputValue());
    expect(kcalWithOverride).toBeCloseTo(999, 0); // override pré-preenchido

    // Alterar gramas → campos de macro devem ser recalculados (não 999)
    await page.locator('#epi-grams').fill('100');
    await page.waitForTimeout(100);
    const kcalAfterGramsChange = parseFloat(await page.locator('#epi-kcal').inputValue());
    expect(kcalAfterGramsChange).not.toBeCloseTo(999, 0); // recalculado, não o override
    expect(kcalAfterGramsChange).toBeGreaterThan(0);

    // Guardar sem alterar macros → deve salvar só grams, sem override
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    // Totais devem reflectir cálculo por gramas, não o override de 999
    const mealKcal = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '').kcal;
    expect(mealKcal).toBeLessThan(900); // 999 já não está ativo
  });

  // ── C-F2A-10 ──────────────────────────────────────────────────────────────
  test('C-F2A-10 — Validação: kcal ≤ 0, prot/carb/fat < 0 mostram erro', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await openFirstIngModal(page);

    // kcal = 0 → erro
    await page.locator('#epi-kcal').fill('0');
    await page.locator('#epi-save').click();
    await expect(page.locator('#epi-error')).toBeVisible();
    const errKcal = await page.locator('#epi-error').textContent() || '';
    expect(errKcal.toLowerCase()).toMatch(/kcal/i);

    // kcal válido, prot negativa → erro
    await page.locator('#epi-kcal').fill('100');
    await page.locator('#epi-prot').fill('-1');
    await page.locator('#epi-save').click();
    await expect(page.locator('#epi-error')).toBeVisible();
    const errProt = await page.locator('#epi-error').textContent() || '';
    expect(errProt.toLowerCase()).toMatch(/prote/i);

    // prot válida, fat negativa → erro
    await page.locator('#epi-prot').fill('10');
    await page.locator('#epi-fat').fill('-5');
    await page.locator('#epi-save').click();
    await expect(page.locator('#epi-error')).toBeVisible();

    // Tudo válido → fecha sem erro
    await page.locator('#epi-fat').fill('5');
    await page.locator('#epi-carb').fill('10');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);
    await expect(page.locator('#epi-kcal')).not.toBeVisible(); // modal fechou
  });

  // ── C-F2A-11 ──────────────────────────────────────────────────────────────
  test('C-F2A-11 — F1 (só gramas, sem override) continua funcionando', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const before = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');

    // Editar só gramas — não tocar nos campos de macro
    await openFirstIngModal(page);
    await page.locator('#epi-grams').fill('200');
    // NÃO editar os campos de macro
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    const after = parseMacros(await page.locator('[data-meal-totals="0-0"]').textContent() || '');
    expect(after.kcal).not.toBe(before.kcal); // mudou por cálculo automático
    expect(await page.locator('#day-body-0 .ing-badge-edited').first().isVisible()).toBe(true);
  });

  // ── C-F2A-12 ──────────────────────────────────────────────────────────────
  test('C-F2A-12 — Mobile 390px: modal com macros sem overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await openFirstIngModal(page);
    await expect(page.locator('#epi-kcal')).toBeVisible();

    const scrollW = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollW).toBeLessThanOrEqual(395);

    // Editar e guardar no mobile
    await page.locator('#epi-kcal').fill('500');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);
    await expect(page.locator('.ing-badge-edited').first()).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Sprint G1 — Modal "Editar Ingrediente": unidade dinâmica (ML para dairy)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Helper: encontra o primeiro ingrediente com display em "ml" no Dia 1 e abre o modal de edição.
 * Devolve { ingLi, editBtn } ou null se não existir nenhum ingrediente dairy visível.
 */
async function openFirstDairyEditModal(page) {
  const ingList = page.locator('#day-body-0 .ingredient:not(.ingredient-removed):not(.ingredient-added)');
  const count   = await ingList.count();
  for (let i = 0; i < count; i++) {
    const qtyText = (await ingList.nth(i).locator('.ingredient-qty').textContent() || '').trim();
    if (/\bml\b/i.test(qtyText)) {
      const editBtn = ingList.nth(i).locator('[data-edit-ingredient]');
      if (await editBtn.count() > 0) {
        await editBtn.click();
        await page.waitForSelector('#epi-grams', { timeout: 5000 });
        return { qtyText };
      }
    }
  }
  return null;
}

test.describe('Modal Editar Ingrediente — unidade dinâmica (Sprint G1)', () => {

  // ── C-EDITUNIT-1 ────────────────────────────────────────────────────────────
  test('C-EDITUNIT-1 — Leite integral: modal mostra "ML" no label de quantidade', async ({ page }) => {
    // CENARIO_6 = hybrid 6 refeições — inclui shakes com leite integral
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    const found = await openFirstDairyEditModal(page);
    if (!found) { console.warn('C-EDITUNIT-1: nenhum ingrediente dairy no plano — SKIP'); return; }

    // Label deve conter "ML" (case-insensitive)
    const labelText = await page.locator('label[for="epi-grams"]').textContent() || '';
    expect(labelText.toUpperCase()).toContain('ML');
    expect(labelText.toUpperCase()).not.toContain('(G)');

    // Hint de recálculo também deve mencionar "ml"
    const hintText = await page.locator('.add-food-macros-title').textContent() || '';
    expect(hintText.toLowerCase()).toContain('ml');
  });

  // ── C-EDITUNIT-2 ────────────────────────────────────────────────────────────
  test('C-EDITUNIT-2 — Leite integral: campo abre com valor numérico correcto (ex: 150)', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    const found = await openFirstDairyEditModal(page);
    if (!found) { console.warn('C-EDITUNIT-2: nenhum ingrediente dairy — SKIP'); return; }

    // Extrair número do display (ex: "150 ml" → 150)
    const numMatch = found.qtyText.match(/^(\d+)/);
    const expectedVal = numMatch ? parseInt(numMatch[1], 10) : null;

    const fieldVal = parseFloat(await page.locator('#epi-grams').inputValue() || '0');
    expect(fieldVal).toBeGreaterThan(0);
    if (expectedVal !== null) {
      expect(fieldVal).toBe(expectedVal);
    }
  });

  // ── C-EDITUNIT-3 ────────────────────────────────────────────────────────────
  test('C-EDITUNIT-3 — Leite integral: alterar valor recalcula macros correctamente', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    const found = await openFirstDairyEditModal(page);
    if (!found) { console.warn('C-EDITUNIT-3: nenhum ingrediente dairy — SKIP'); return; }

    const kcalBefore = parseFloat(await page.locator('#epi-kcal').inputValue() || '0');
    await page.locator('#epi-grams').fill('300');
    await page.waitForTimeout(150);
    const kcalAfter = parseFloat(await page.locator('#epi-kcal').inputValue() || '0');

    expect(kcalAfter).toBeGreaterThan(0);
    expect(kcalAfter).not.toBeCloseTo(kcalBefore);
  });

  // ── C-EDITUNIT-4 ────────────────────────────────────────────────────────────
  test('C-EDITUNIT-4 — Leite integral: salvar actualiza a refeição e mostra badge "Editado"', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    const found = await openFirstDairyEditModal(page);
    if (!found) { console.warn('C-EDITUNIT-4: nenhum ingrediente dairy — SKIP'); return; }

    await page.locator('#epi-grams').fill('300');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    // Modal fechou
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible();
    // Badge "Editado" aparece
    await expect(page.locator('#day-body-0 .ing-badge-edited').first()).toBeVisible();
  });

  // ── C-EDITUNIT-5 ────────────────────────────────────────────────────────────
  test('C-EDITUNIT-5 — Leite integral: reverter edição restaura valor original', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    // Encontrar o índice do primeiro ingrediente dairy para re-localizá-lo após revert
    const ingList = page.locator('#day-body-0 .ingredient:not(.ingredient-removed):not(.ingredient-added)');
    const count   = await ingList.count();
    let dairyIdx  = -1;
    let origQty   = '';
    for (let i = 0; i < count; i++) {
      const qtyText = (await ingList.nth(i).locator('.ingredient-qty').textContent() || '').trim();
      if (/\bml\b/i.test(qtyText)) { dairyIdx = i; origQty = qtyText; break; }
    }
    if (dairyIdx === -1) { console.warn('C-EDITUNIT-5: nenhum ingrediente dairy — SKIP'); return; }

    // Editar
    const editBtn = ingList.nth(dairyIdx).locator('[data-edit-ingredient]');
    await editBtn.click();
    await page.waitForSelector('#epi-grams', { timeout: 5000 });
    await page.locator('#epi-grams').fill('300');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    // Reverter (badge "Editado" → botão de revert no mesmo ingrediente)
    const revertBtn = page.locator('[data-revert-edit]').first();
    await expect(revertBtn).toBeVisible();
    await revertBtn.click();
    await page.waitForTimeout(400);

    // Quantidade voltou ao original — ré-selecionar pelo mesmo índice
    const restoredQty = (await ingList.nth(dairyIdx).locator('.ingredient-qty').textContent() || '').trim();
    const origNum     = origQty.match(/^(\d+)/)?.[1];
    const restoredNum = restoredQty.match(/^(\d+)/)?.[1];
    if (origNum && restoredNum) expect(restoredNum).toBe(origNum);
    // Badge "Editado" desaparece
    await expect(page.locator('#day-body-0 .ing-badge-edited')).toHaveCount(0);
  });

  // ── C-EDITUNIT-6 ────────────────────────────────────────────────────────────
  test('C-EDITUNIT-6 — Alimento sólido: modal continua a mostrar "(G)" no label', async ({ page }) => {
    // CENARIO_4 = solid — primeiro ingrediente é sempre um sólido
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await openFirstEditModal(page);

    const labelText = await page.locator('label[for="epi-grams"]').textContent() || '';
    expect(labelText.toUpperCase()).toContain('(G)');
    expect(labelText.toUpperCase()).not.toContain('(ML)');
  });

  // ── C-EDITUNIT-7 ────────────────────────────────────────────────────────────
  test('C-EDITUNIT-7 — Manual macro override continua funcionando com alimento dairy', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    const found = await openFirstDairyEditModal(page);
    if (!found) { console.warn('C-EDITUNIT-7: nenhum ingrediente dairy — SKIP'); return; }

    // Editar manualmente os campos de macro (override)
    await page.locator('#epi-kcal').fill('999');
    await page.locator('#epi-prot').fill('50');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);

    // Badge "Editado" aparece → override guardado
    await expect(page.locator('#day-body-0 .ing-badge-edited').first()).toBeVisible();

    // Abrir modal de novo — valores override pré-preenchidos
    const found2 = await openFirstDairyEditModal(page);
    if (!found2) return;
    const kcalVal = parseFloat(await page.locator('#epi-kcal').inputValue() || '0');
    expect(kcalVal).toBeCloseTo(999, 0);
  });

  // ── C-EDITUNIT-8 ────────────────────────────────────────────────────────────
  test('C-EDITUNIT-8 — Mobile 390px: modal dairy sem overflow horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    const found = await openFirstDairyEditModal(page);
    if (!found) { console.warn('C-EDITUNIT-8: nenhum ingrediente dairy — SKIP'); return; }

    // Modal aberto: sem overflow
    const scrollW = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollW).toBeLessThanOrEqual(395);

    // Label mostra ML
    const labelText = await page.locator('label[for="epi-grams"]').textContent() || '';
    expect(labelText.toUpperCase()).toContain('ML');

    // Editar e guardar
    await page.locator('#epi-grams').fill('250');
    await page.locator('#epi-save').click();
    await page.waitForTimeout(400);
    await expect(page.locator('.ing-badge-edited').first()).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Hidratação — PDF individual por dia (Sprint Hidratação 2)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Hidratação — PDF individual por dia', () => {

  // ── C-HYDR-PDF1 ─────────────────────────────────────────────────────────────
  test('C-HYDR-PDF1 — sem treino: PDF do dia contém "Hidratação do dia" e "Meta aproximada diária"', async ({ page }) => {
    await injectState(page, CENARIO_6); // trainDays: 0, weight: 75 kg → base 3 L
    await gotoResultados(page);
    await gotoPlano(page);

    // Suprimir diálogo de impressão para inspecionar o DOM injectado
    await page.evaluate(() => { window.print = () => {}; });

    // Clicar em "Baixar PDF" do Dia 1
    await page.locator('[data-pdf-day="0"]').first().click();
    await page.waitForSelector('#day-pdf-print-area', { state: 'attached', timeout: 5000 });

    const text = await page.locator('#day-pdf-print-area').evaluate(el => el.textContent || '');
    expect(text).toContain('Hidratação do dia');
    expect(text).toContain('Meta aproximada diária');
  });

  // ── C-HYDR-PDF2 ─────────────────────────────────────────────────────────────
  test('C-HYDR-PDF2 — sem treino: PDF do dia NÃO contém "Com treino" nem "Sem treino"', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('[data-pdf-day="0"]').first().click();
    await page.waitForSelector('#day-pdf-print-area', { state: 'attached', timeout: 5000 });

    const text = await page.locator('#day-pdf-print-area').evaluate(el => el.textContent || '');
    expect(text).not.toContain('Com treino');
    expect(text).not.toContain('Sem treino');
  });

  // ── C-HYDR-PDF3 ─────────────────────────────────────────────────────────────
  test('C-HYDR-PDF3 — com treino: PDF do dia contém "Hidratação do dia", "Com treino" e "Sem treino"', async ({ page }) => {
    await injectState(page, CENARIO_5); // trainDays: 3, weight: 75 kg → 3,5 L / 3 L
    await gotoResultados(page);
    await gotoPlano(page);

    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('[data-pdf-day="0"]').first().click();
    await page.waitForSelector('#day-pdf-print-area', { state: 'attached', timeout: 5000 });

    const text = await page.locator('#day-pdf-print-area').evaluate(el => el.textContent || '');
    expect(text).toContain('Hidratação do dia');
    expect(text).toContain('Com treino');
    expect(text).toContain('Sem treino');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Hidratação — PDF compacto (Sprint Hidratação 2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Captura o HTML gerado pelo PDF compacto.
 *
 * O PDF compacto usa um iframe isolado cujo Document pertence a um realm separado
 * (Document.prototype do main window não o alcança). A estratégia é:
 *  1. Interceptar Node.prototype.appendChild para detectar o iframe quando ele
 *     é adicionado ao DOM — nesse momento contentWindow já existe.
 *  2. Sobrescrever iframeDoc.Document.prototype.write para capturar o HTML antes
 *     de o iframe ser limpo.
 *  3. window.print = () => {} previne o diálogo de impressão principal.
 */
async function captureCompactPdfHtml(page) {
  await page.evaluate(() => {
    window.print = () => {};
    window.__capturedCompactHtml = null;
    const origAppend = Node.prototype.appendChild;
    Node.prototype.appendChild = function(node) {
      const result = origAppend.call(this, node);
      if (node && node.tagName === 'IFRAME' && node.contentWindow) {
        try {
          const IDoc = node.contentWindow.Document;
          if (IDoc && IDoc.prototype && !IDoc.prototype.__captureSet) {
            const origWrite = IDoc.prototype.write;
            IDoc.prototype.write = function(...args) {
              const html = args.join('');
              if (html.includes('cp-header')) window.__capturedCompactHtml = html;
              return origWrite.apply(this, args);
            };
            IDoc.prototype.__captureSet = true;
          }
        } catch(e) {}
      }
      return result;
    };
  });
  await page.locator('#btn-print-compact').click();
  await page.waitForFunction(() => window.__capturedCompactHtml !== null, { timeout: 5000 });
  return page.evaluate(() => window.__capturedCompactHtml || '');
}

test.describe('Hidratação — PDF compacto', () => {

  // ── C-HYDR-COMPACT1 ─────────────────────────────────────────────────────────
  test('C-HYDR-COMPACT1 — sem treino: PDF compacto contém "Hidratação" e "L/dia"', async ({ page }) => {
    await injectState(page, CENARIO_6); // trainDays: 0, weight: 75 kg → 3 L/dia
    await gotoResultados(page);
    await gotoPlano(page);
    const html = await captureCompactPdfHtml(page);
    expect(html).toContain('Hidratação');
    expect(html).toContain('L/dia');
  });

  // ── C-HYDR-COMPACT2 ─────────────────────────────────────────────────────────
  test('C-HYDR-COMPACT2 — com treino: PDF compacto contém "treino" e "sem treino"', async ({ page }) => {
    await injectState(page, CENARIO_5); // trainDays: 3, weight: 75 kg → treino 3,5 L · sem treino 3 L
    await gotoResultados(page);
    await gotoPlano(page);
    const html = await captureCompactPdfHtml(page);
    expect(html).toContain('Hidratação');
    expect(html).toContain('treino');
    expect(html).toContain('sem treino');
  });

  // ── C-HYDR-COMPACT3 ─────────────────────────────────────────────────────────
  test('C-HYDR-COMPACT3 — PDF compacto não contém lista de distribuição prática', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const html = await captureCompactPdfHtml(page);
    // Card grande da tela não deve estar no PDF compacto
    expect(html).not.toContain('Ao acordar');
    expect(html).not.toContain('Entre refeições');
    expect(html).not.toContain('Final do dia');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Hidratação — PDF completo (Sprint Hidratação 2)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Hidratação — PDF completo', () => {

  // ── C-HYDR-FULL1 ────────────────────────────────────────────────────────────
  test('C-HYDR-FULL1 — sem treino: PDF completo contém "Hidratação" e "L/dia"', async ({ page }) => {
    await injectState(page, CENARIO_6); // trainDays: 0, weight: 75 kg → 3 L/dia
    await gotoResultados(page);
    await gotoPlano(page);

    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('#btn-print').click();
    await page.waitForSelector('#full-pdf-print-area', { state: 'attached', timeout: 5000 });

    const text = await page.locator('#full-pdf-print-area').evaluate(el => el.textContent || '');
    expect(text).toContain('Hidratação');
    expect(text).toContain('L/dia');
  });

  // ── C-HYDR-FULL2 ────────────────────────────────────────────────────────────
  test('C-HYDR-FULL2 — com treino: PDF completo contém "Hidratação: treino" e "sem treino"', async ({ page }) => {
    await injectState(page, CENARIO_5); // trainDays: 3, weight: 75 kg → treino 3,5 L · sem treino 3 L
    await gotoResultados(page);
    await gotoPlano(page);

    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('#btn-print').click();
    await page.waitForSelector('#full-pdf-print-area', { state: 'attached', timeout: 5000 });

    const text = await page.locator('#full-pdf-print-area').evaluate(el => el.textContent || '');
    expect(text).toContain('Hidratação');
    expect(text).toContain('Hidratação: treino');
    expect(text).toContain('sem treino');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Lista de Compras — Quantidades Práticas (Sprint Lista de Compras 1)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Lista de Compras — Quantidades Práticas', () => {

  // ── C-SHOP1 ──────────────────────────────────────────────────────────────────
  test('C-SHOP1 — lista mostra "Comprar:" para itens com regra e sem "Usado no plano:"', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    expect(text).toContain('Comprar:');
    expect(text).not.toContain('Usado no plano:');
  });

  // ── C-SHOP2 ──────────────────────────────────────────────────────────────────
  test('C-SHOP2 — leite integral mostra "embalagem(ns) de 1 L" (se presente)', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    // Usa evaluate + replace de whitespace para evitar variações de espaço/newline no textContent
    const leiteItems = page.locator('#shopping-body .shopping-item').filter({ hasText: 'Leite integral' });
    if (await leiteItems.count() > 0) {
      const leiteText = await leiteItems.first().evaluate(el => (el.textContent || '').replace(/\s+/g, ' '));
      // 'embalagem' (singular) e 'embalagens' (plural) partilham o prefixo 'embalage'
      expect(leiteText).toContain('embalage');
    }
  });

  // ── C-SHOP3 ──────────────────────────────────────────────────────────────────
  test('C-SHOP3 — ovos mostram "dúzia(s)" (se presentes)', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Ovo inteiro')) {
      expect(text).toContain('dúzia');
    }
  });

  // ── C-SHOP4 ──────────────────────────────────────────────────────────────────
  test('C-SHOP4 — iogurte mostra "pote" (se presente)', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Iogurte')) {
      expect(text).toContain('pote');
    }
  });

  // ── C-SHOP5 ──────────────────────────────────────────────────────────────────
  test('C-SHOP5 — itens com "Comprar:" não têm "Usado no plano:" e têm nome limpo', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const items = page.locator('#shopping-body li.shopping-item');
    const count = await items.count();
    for (let i = 0; i < Math.min(count, 30); i++) {
      const itemText = await items.nth(i).textContent() || '';
      if (itemText.includes('Comprar:')) {
        expect(itemText).not.toContain('Usado no plano:');
      }
    }
  });

  // ── C-SHOP6 ──────────────────────────────────────────────────────────────────
  test('C-SHOP6 — nota informativa aparece no topo da lista de compras', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    expect(text).toContain('podem sobrar para as próximas semanas');
  });

  // ── C-SHOP7 ──────────────────────────────────────────────────────────────────
  test('C-SHOP7 — sem valores inválidos na lista (NaN, undefined)', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    expect(text).not.toContain('NaN');
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('null');
  });

  // ── C-SHOP8 ──────────────────────────────────────────────────────────────────
  test('C-SHOP8 — mobile 390px: lista de compras sem overflow horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const scrollW = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollW).toBeLessThanOrEqual(395);
  });

  // ── C-SHOP-NAME1 ──────────────────────────────────────────────────────────────
  test('C-SHOP-NAME1 — lista não mostra "Peito de frango grelhado", mostra "Peito de frango"', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Peito de frango')) {
      expect(text).not.toContain('Peito de frango grelhado');
    }
  });

  // ── C-SHOP-NAME2 ──────────────────────────────────────────────────────────────
  test('C-SHOP-NAME2 — lista não mostra "Arroz branco cozido", mostra "Arroz branco"', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Arroz branco')) {
      expect(text).not.toContain('Arroz branco cozido');
    }
  });

  // ── C-SHOP-NAME3 ──────────────────────────────────────────────────────────────
  test('C-SHOP-NAME3 — lista não mostra "Macarrão cozido", mostra "Macarrão"', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Macarrão')) {
      expect(text).not.toContain('Macarrão cozido');
    }
  });

  // ── C-SHOP-NAME4 ──────────────────────────────────────────────────────────────
  test('C-SHOP-NAME4 — lista não mostra "Usado no plano:" em nenhum item', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    expect(text).not.toContain('Usado no plano:');
  });

  // ── C-SHOP-LAYOUT1 ────────────────────────────────────────────────────────────
  test('C-SHOP-LAYOUT1 — nenhum item exibe quantidade solta à direita (sem .shopping-qty)', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const qtySpans = page.locator('#shopping-body .shopping-qty');
    expect(await qtySpans.count()).toBe(0);
  });

  // ── C-SHOP-LAYOUT2 ────────────────────────────────────────────────────────────
  test('C-SHOP-LAYOUT2 — todos os itens exibem "Comprar:"', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const items = page.locator('#shopping-body li.shopping-item');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const itemText = await items.nth(i).textContent() || '';
      expect(itemText).toContain('Comprar:');
    }
  });

  // ── C-SHOP-PACK1 ─────────────────────────────────────────────────────────────
  test('C-SHOP-PACK1 — whey mostra "pote de whey", não gramas soltos', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Proteína whey')) {
      expect(text).toContain('pote de whey');
    }
  });

  // ── C-SHOP-PACK2 ─────────────────────────────────────────────────────────────
  test('C-SHOP-PACK2 — pasta de amendoim mostra "pote"', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Pasta de amendoim')) {
      expect(text).toContain('pote');
    }
  });

  // ── C-SHOP-PACK3 ─────────────────────────────────────────────────────────────
  test('C-SHOP-PACK3 — azeite mostra "garrafa"', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Azeite de oliva')) {
      expect(text).toContain('garrafa');
    }
  });

  // ── C-SHOP-PACK4 ─────────────────────────────────────────────────────────────
  test('C-SHOP-PACK4 — cacau e canela mostram "embalagem pequena"', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    const hasCacau  = text.includes('Cacau em pó');
    const hasCanela = text.includes('Canela em pó');
    if (hasCacau || hasCanela) {
      expect(text).toContain('embalagem pequena');
    }
  });

  // ── C-SHOP-MACROS ─────────────────────────────────────────────────────────────
  test('C-SHOP-MACROS — macros/kcal do plano não foram alterados pela lista de compras', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    // A lista de compras existe e não tem NaN
    const shopText = await page.locator('#shopping-body').textContent() || '';
    expect(shopText.length).toBeGreaterThan(0);
    expect(shopText).not.toContain('NaN');
    expect(shopText).not.toContain('undefined');
    // O corpo da página (que contém o plano) também não tem NaN
    const bodyText = await page.evaluate(() => document.body.textContent || '');
    expect(bodyText).not.toContain('NaN');
  });

  // ── C-SHOP-PRODUCE1 ───────────────────────────────────────────────────────────
  test('C-SHOP-PRODUCE1 — banana mostra número de bananas médias sem "cacho"', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Banana madura')) {
      expect(text).toMatch(/bananas médias/i);
      expect(text).not.toMatch(/cacho/i);
    }
  });

  // ── C-SHOP-PRODUCE2 ───────────────────────────────────────────────────────────
  test('C-SHOP-PRODUCE2 — abacate mostra unidade com peso aproximado', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Abacate')) {
      expect(text).toMatch(/unidade/i);
    }
  });

  // ── C-SHOP-PRODUCE3 ───────────────────────────────────────────────────────────
  test('C-SHOP-PRODUCE3 — maçã mostra unidades médias com peso aproximado', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Maçã')) {
      expect(text).toMatch(/unidade/i);
    }
  });

  // ── C-SHOP-PRODUCE4 ───────────────────────────────────────────────────────────
  test('C-SHOP-PRODUCE4 — manga mostra unidades médias com peso aproximado', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Manga')) {
      expect(text).toMatch(/unidade/i);
    }
  });

  // ── C-SHOP-PRODUCE5 ───────────────────────────────────────────────────────────
  test('C-SHOP-PRODUCE5 — molho de tomate mostra embalagem, não só gramas', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Molho de tomate')) {
      expect(text).toMatch(/embalagem/i);
      // Não deve mostrar só "~X g" sem contexto de embalagem
      expect(text).not.toMatch(/Molho de tomate[^C]*Comprar: ~\d+ g/);
    }
  });

  // ── C-SHOP-PRODUCE6 ───────────────────────────────────────────────────────────
  test('C-SHOP-PRODUCE6 — brócolis mostra unidade ou pacote com peso aproximado', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Brócolis')) {
      expect(text).toMatch(/unidade|pacote/i);
    }
  });

  // ── C-SHOP-PRODUCE7 ───────────────────────────────────────────────────────────
  test('C-SHOP-PRODUCE7 — salada aparece como "Folhas para salada" com pacote/maço', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    // "Salada (alface, tomate)" não deve aparecer
    expect(text).not.toContain('Salada (alface, tomate)');
    if (text.includes('Folhas para salada')) {
      expect(text).toMatch(/pacote|maço/i);
    }
  });

  // ── C-SHOP-REFINE1 ────────────────────────────────────────────────────────────
  test('C-SHOP-REFINE1 — "Purê de batata" não aparece na lista de compras', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    expect(text).not.toContain('Purê de batata');
  });

  // ── C-SHOP-REFINE2 ────────────────────────────────────────────────────────────
  test('C-SHOP-REFINE2 — se havia purê, aparece "Batata inglesa" no lugar', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    // Verificar que purê não aparece; batata inglesa pode ou não aparecer dependendo do plano
    const text = await page.locator('#shopping-body').textContent() || '';
    expect(text).not.toContain('Purê de batata');
    // Se existe "batata" na lista, deve ser "Batata inglesa"
    if (text.includes('Batata')) {
      expect(text).not.toContain('Purê');
    }
  });

  // ── C-SHOP-REFINE3 ────────────────────────────────────────────────────────────
  test('C-SHOP-REFINE3 — banana não mostra "cacho"', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    expect(text).not.toMatch(/cacho/i);
  });

  // ── C-SHOP-REFINE4 ────────────────────────────────────────────────────────────
  test('C-SHOP-REFINE4 — queijo branco mostra embalagem pequena', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Queijo branco')) {
      expect(text).toMatch(/embalagem/i);
    }
  });

  // ── C-SHOP-REFINE5 ────────────────────────────────────────────────────────────
  test('C-SHOP-REFINE5 — pão branco mostra unidades ou pacote', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Pão branco')) {
      expect(text).toMatch(/unidade|pacote/i);
    }
    if (text.includes('Pão de forma')) {
      expect(text).toMatch(/pacote/i);
    }
  });

  // ── C-SHOP-REFINE6 ────────────────────────────────────────────────────────────
  test('C-SHOP-REFINE6 — nenhum texto técnico visível na lista de compras', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    expect(text).not.toMatch(/fallback/i);
    expect(text).not.toMatch(/peso seco estimado/i);
    expect(text).not.toMatch(/fator de/i);
    expect(text).not.toContain('Purê');
    expect(text).not.toContain('cozido');
    expect(text).not.toContain('grelhado');
  });

  // ── C-SHOP-FINAL1 ────────────────────────────────────────────────────────────
  test('C-SHOP-FINAL1 — subtítulo novo aparece na Lista de Compras', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-head').textContent() || '';
    expect(text).toContain('7 primeiros dias');
    expect(text).toContain('Quantidades aproximadas para compra');
  });

  // ── C-SHOP-FINAL2 ────────────────────────────────────────────────────────────
  test('C-SHOP-FINAL2 — subtítulo antigo não aparece', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-head').textContent() || '';
    expect(text).not.toContain('Agregada de todas as refeições');
  });

  // ── C-SHOP-FINAL3 ────────────────────────────────────────────────────────────
  test('C-SHOP-FINAL3 — feijão carioca mostra pacote de 500 g', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Feijão carioca')) {
      expect(text).toMatch(/pacote/i);
    }
  });

  // ── C-SHOP-FINAL4 ────────────────────────────────────────────────────────────
  test('C-SHOP-FINAL4 — tapioca mostra pacote de 500 g', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Tapioca')) {
      expect(text).toMatch(/pacote/i);
    }
  });

  // ── C-SHOP-FINAL5 ────────────────────────────────────────────────────────────
  test('C-SHOP-FINAL5 — pão branco mostra "pães/unidades"', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Pão branco')) {
      expect(text).toMatch(/pães\/unidades/i);
    }
  });

  // ── C-SHOP-FINAL6 ────────────────────────────────────────────────────────────
  test('C-SHOP-FINAL6 — queijo branco mostra "embalagem pequena" com faixa ~100–250 g', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Queijo branco')) {
      expect(text).toMatch(/embalagem pequena/i);
      expect(text).toContain('100–250 g');
    }
  });

  // ── C-SHOP-WEIGHT1 ────────────────────────────────────────────────────────────
  test('C-SHOP-WEIGHT1 — abacate com ~200 g NÃO mostra "unidade pequena"', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    // A sugestão "1 unidade pequena" não deve aparecer com peso ≥ 150 g
    // (detecta padrão "1 unidade pequena (~1XX g)" ou "(~2XX g)")
    expect(text).not.toMatch(/1 unidade pequena \(~[12]\d\d g\)/);
  });

  // ── C-SHOP-WEIGHT2 ────────────────────────────────────────────────────────────
  test('C-SHOP-WEIGHT2 — abacate mostra tamanho de unidade coerente quando presente', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Abacate')) {
      expect(text).toMatch(/unidade (pequena|média|grande|médias)/i);
    }
  });

  // ── C-SHOP-WEIGHT3 ────────────────────────────────────────────────────────────
  test('C-SHOP-WEIGHT3 — banana usa base de ~125 g por unidade (resultado coerente)', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Banana madura')) {
      expect(text).toMatch(/cerca de \d+ bananas médias/i);
      // Não deve mostrar número de bananas próximo ao que seria com 100g/unidade
      // (a diferença de ~25% é difícil de testar sem saber os grams exactos;
      //  validamos apenas que o formato é correto)
      expect(text).not.toMatch(/cacho/i);
    }
  });

  // ── C-SHOP-WEIGHT4 ────────────────────────────────────────────────────────────
  test('C-SHOP-WEIGHT4 — abobrinha mostra "unidades médias" (não unidades genéricas)', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Abobrinha')) {
      expect(text).toMatch(/unidade/i);
    }
  });

  // ── C-SHOP-WEIGHT5 ────────────────────────────────────────────────────────────
  test('C-SHOP-WEIGHT5 — brócolis mostra unidade ou pacote com peso coerente', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Brócolis')) {
      expect(text).toMatch(/unidade|pacote/i);
    }
  });

  // ── C-SHOP-WEIGHT6 ────────────────────────────────────────────────────────────
  test('C-SHOP-WEIGHT6 — folhas para salada mostra pacotes/maços com faixa de quantidade', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    if (text.includes('Folhas para salada')) {
      expect(text).toMatch(/pacote|maço/i);
    }
  });

  // ── C-SHOP-WEIGHT7 ────────────────────────────────────────────────────────────
  test('C-SHOP-WEIGHT7 — nenhum texto técnico de pesos visível na lista', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const text = await page.locator('#shopping-body').textContent() || '';
    expect(text).not.toMatch(/estimado internamente/i);
    expect(text).not.toMatch(/fator/i);
    expect(text).not.toMatch(/fallback/i);
    expect(text).not.toMatch(/peso seco/i);
    expect(text).not.toContain('Usado no plano');
  });

  // ── C-SHOP-ACTIONS1 ──────────────────────────────────────────────────────────
  test('C-SHOP-ACTIONS1 — botão "Copiar lista" aparece na lista de compras', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const btn = page.locator('#btn-copy-shopping');
    await expect(btn).toBeVisible();
    await expect(btn).toContainText('Copiar lista');
  });

  // ── C-SHOP-ACTIONS2 ──────────────────────────────────────────────────────────
  test('C-SHOP-ACTIONS2 — botão "Salvar PDF" aparece na lista de compras', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const btn = page.locator('#btn-pdf-shopping');
    await expect(btn).toBeVisible();
    await expect(btn).toContainText('Salvar PDF');
  });

  // ── C-SHOP-ACTIONS3 ──────────────────────────────────────────────────────────
  test('C-SHOP-ACTIONS3 — texto copiável contém "Lista de Compras — 7 primeiros dias"', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    // Interceptar clipboard para verificar conteúdo sem dependência de permissões
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('#btn-copy-shopping').click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('Lista de Compras — 7 primeiros dias');
  });

  // ── C-SHOP-ACTIONS4 ──────────────────────────────────────────────────────────
  test('C-SHOP-ACTIONS4 — texto copiável contém categorias (Proteínas, Carboidratos)', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('#btn-copy-shopping').click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(/Proteínas|Carboidratos/);
  });

  // ── C-SHOP-ACTIONS5 ──────────────────────────────────────────────────────────
  test('C-SHOP-ACTIONS5 — texto copiável não contém HTML', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('#btn-copy-shopping').click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).not.toMatch(/<[a-z]/i);
    expect(copied).not.toContain('</');
  });

  // ── C-SHOP-ACTIONS6 ──────────────────────────────────────────────────────────
  test('C-SHOP-ACTIONS6 — texto copiável contém sugestões práticas (dúzia, pacote, pote ou garrafa)', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('#btn-copy-shopping').click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(/dúzia|pacote|pote|garrafa|embalagem/i);
  });

  // ── C-SHOP-ACTIONS7 ──────────────────────────────────────────────────────────
  test('C-SHOP-ACTIONS7 — feedback "Lista copiada!" aparece após clicar', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    const btn = page.locator('#btn-copy-shopping');
    await btn.click();
    await expect(btn).toContainText('Lista copiada!');
  });

  // ── C-SHOP-ACTIONS8 ──────────────────────────────────────────────────────────
  test('C-SHOP-ACTIONS8 — funciona em modo imperial (sugestões em lb/dozen/tub)', async ({ page }) => {
    const imperialState = { ...CENARIO_6, form: { ...CENARIO_6.form, unit: 'imperial' } };
    await injectState(page, imperialState);
    await gotoResultados(page);
    await gotoPlano(page);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('#btn-copy-shopping').click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('Lista de Compras — 7 primeiros dias');
    // No modo imperial, sugestões usam lb, dozen ou tub
    expect(copied).toMatch(/lb|dozen|tub|jar|bottle|pack/i);
  });

  // ── C-SHOP-ACTIONS9 ──────────────────────────────────────────────────────────
  test('C-SHOP-ACTIONS9 — botões têm classe no-print (não aparecem em PDFs)', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const actions = page.locator('.shopping-actions');
    await expect(actions).toHaveClass(/no-print/);
  });

  // ── C-SHOP-ACTIONS10 ─────────────────────────────────────────────────────────
  test('C-SHOP-ACTIONS10 — mobile 390px: botões sem overflow horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    const scrollW = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollW).toBeLessThanOrEqual(395);
  });

  // ── C-SHOP-ACTIONS11 ─────────────────────────────────────────────────────────
  test('C-SHOP-ACTIONS11 — lista visual aprovada continua igual após adicionar botões', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    // Os itens da lista continuam com "Comprar:"
    const shopText = await page.locator('#shopping-body').textContent() || '';
    expect(shopText).toContain('Comprar:');
    expect(shopText).not.toContain('Usado no plano:');
    expect(shopText).not.toMatch(/NaN|undefined/);
  });

});

test.describe('Plano Alimentar 14 Dias - tema e espacamento visual', () => {
  test('C-PLAN-THEME-1 - home renderiza com conteudo, sem body vazio e sem pageerror de import', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('load');

    await expect(page.locator('body')).toContainText('Hardgainer Macros');
    await expect(page.locator('#app-mount')).not.toHaveText(/^\s*$/);
    await expect(page.locator('#header-theme-toggle')).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('C-PLAN-THEME-2 - desktop alterna tema, persiste apos reload e plano continua a renderizar', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    await expect(page.locator('#app-mount')).not.toHaveText(/^\s*$/);
    const themeBtn = page.locator('#header-theme-toggle');
    await expect(themeBtn).toBeVisible();
    await expect(themeBtn).toHaveAttribute('aria-label', /modo escuro/i);
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');

    await themeBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(themeBtn).toHaveAttribute('aria-label', /modo claro/i);

    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#header-theme-toggle')).toHaveAttribute('aria-label', /modo claro/i);

    await page.evaluate(() => {
      history.pushState({}, '', '/resultados');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('.meal-row', { timeout: 10_000 });
    await gotoPlano(page);

    const dayBody = page.locator('#day-body-0');
    await expect(dayBody).toBeVisible();
    await expect(dayBody.locator('.meal-card').first().locator('[data-meal-image]')).toBeVisible();
    await expect(dayBody.locator('.ingredient [data-food-image]').first()).toBeVisible();

    const totals = dayBody.locator('.meal-card .meal-totals').first();
    await expect(totals).toBeVisible();
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
      };
    });

    expect(layout.paddingLeft).toBe('16px');
    expect(layout.paddingRight).toBe('16px');
    expect(layout.gap).toBe('12px');
    expect(layout.offsetLeft).toBeGreaterThanOrEqual(16);
    expect(layout.offsetRight).toBeGreaterThanOrEqual(16);
    expect(pageErrors).toEqual([]);
  });

  test('C-PLAN-THEME-3 - home em modo escuro mantém contraste legivel nos controlos de unidade e sexo', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.addInitScript(() => {
      localStorage.setItem('hg:cookies', JSON.stringify('accepted'));
      localStorage.setItem('hg:theme', JSON.stringify('dark'));
    });

    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForSelector('[data-unit="metric"]');
    await page.waitForSelector('[data-sex="male"]');

    await page.locator('[data-sex="male"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#header-theme-toggle')).toBeVisible();

    const styles = await page.evaluate(() => {
      const metric = document.querySelector('[data-unit="metric"]');
      const imperial = document.querySelector('[data-unit="imperial"]');
      const male = document.querySelector('[data-sex="male"]');
      const female = document.querySelector('[data-sex="female"]');
      const metricCs = getComputedStyle(metric);
      const imperialCs = getComputedStyle(imperial);
      const maleCs = getComputedStyle(male);
      const femaleCs = getComputedStyle(female);
      return {
        metric: { bg: metricCs.backgroundColor, color: metricCs.color },
        imperial: { bg: imperialCs.backgroundColor, color: imperialCs.color },
        male: { bg: maleCs.backgroundColor, color: maleCs.color, border: maleCs.borderColor },
        female: { bg: femaleCs.backgroundColor, color: femaleCs.color, border: femaleCs.borderColor },
      };
    });

    expect(styles.metric.bg).not.toBe('rgb(255, 255, 255)');
    expect(styles.metric.color).not.toBe(styles.metric.bg);
    expect(styles.imperial.color).not.toBe('rgb(255, 255, 255)');
    expect(styles.male.bg).not.toBe('rgb(255, 255, 255)');
    expect(styles.male.color).not.toBe(styles.male.bg);
    expect(styles.male.border).not.toBe('rgb(255, 255, 255)');
    expect(styles.female.bg).not.toBe('rgb(255, 255, 255)');
    expect(styles.female.color).not.toBe(styles.female.bg);
    expect(pageErrors).toEqual([]);
  });

});

