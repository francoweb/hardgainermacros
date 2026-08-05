// @ts-check
'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const MOBILE_390 = { width: 390, height: 844 };
const HOME_TITLE = 'Hardgainer Macros — Calculadora para ectomorfos';
const HOME_META_DESCRIPTION = 'Hardgainer Macros — calculadora especializada para ectomorfos. Descubra suas calorias, macros e receba um plano alimentar de 14 dias baseado no Sistema Híbrido.';
const HOME_CANONICAL = 'https://hardgainermacros.com/';
const PILOT_SNAPSHOTS = {
  clara_ovo: {
    metaDescription: 'Veja as calorias e os macronutrientes da clara de ovo por 100g, ajuste a quantidade e entenda como usar essa fonte proteica nas refeições.',
    intro: 'A clara de ovo é uma forma direta de elevar a proteína da refeição sem aumentar muito as calorias vindas de gordura ou carboidratos. Para hardgainers, isso ajuda a ajustar o total proteico do dia com mais precisão quando o restante do prato já está carregado de arroz, frutas, pães ou outras fontes de energia.',
    pairingIds: ['arroz_branco_cozido', 'aveia_flocos', 'azeite'],
  },
  whey: {
    metaDescription: 'Veja as calorias e os macronutrientes da proteína whey por 100g, ajuste a quantidade e entenda como usar esse suplemento no seu planejamento.',
    intro: 'A proteína whey é uma opção prática para aumentar a ingestão proteica quando a rotina não permite depender apenas de refeições sólidas. Para hardgainers, isso pode facilitar a distribuição de proteína ao longo do dia, especialmente em horários de pressa, lanches mais leves ou shakes montados com outras fontes de energia.',
    pairingIds: ['banana_prata', 'aveia_flocos', 'leite_integral'],
  },
};

async function loadFoodSeoModule() {
  const sourcePath = path.resolve(__dirname, '../assets/js/data/food-seo-content.js');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const objectMatch = source.match(/export const FOOD_SEO_CONTENT = (\{[\s\S]*\});\s*export function/);
  if (!objectMatch) throw new Error('FOOD_SEO_CONTENT não encontrado');
  return { FOOD_SEO_CONTENT: Function(`return (${objectMatch[1]});`)() };
}

async function loadFoodsModule() {
  const sourcePath = path.resolve(__dirname, '../assets/js/data/foods.js');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const objectMatch = source.match(/export const FOODS = (\{[\s\S]*\});\s*(?:export|\/\*|$)/);
  if (!objectMatch) throw new Error('FOODS não encontrado');
  return { FOODS: Function(`return (${objectMatch[1]});`)() };
}

async function gotoCalcList(page) {
  await page.goto('/');
  await page.waitForLoadState('load');
  await page.waitForSelector('#app-mount');
  await page.waitForSelector('#f-dados', { timeout: 10000 });
  await page.evaluate(() => {
    history.pushState({}, '', '/calcular-alimento');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForSelector('.calc-alimento-title', { timeout: 10000 });
}

async function gotoCalcItem(page, slug) {
  await page.goto('/');
  await page.waitForLoadState('load');
  await page.waitForSelector('#app-mount');
  await page.waitForSelector('#f-dados', { timeout: 10000 });
  await page.evaluate((targetSlug) => {
    history.pushState({}, '', `/calcular-alimento/${targetSlug}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, slug);
  await page.waitForSelector('.calc-alimento-title', { timeout: 10000 });
}

function normalize(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

test.describe('Calcular alimento - SEO editorial individual', () => {
  test('CA-SEO-1 - clara de ovo preserva calculo, tabela, schema e novo bloco editorial', async ({ page }) => {
    const { FOOD_SEO_CONTENT } = await loadFoodSeoModule();
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await gotoCalcItem(page, 'clara-ovo');

    await expect(page.locator('h1')).toHaveText('Calorias e Macros de Clara de ovo');
    await expect(page.locator('.calc-alimento-cards')).toBeVisible();
    await expect(page.locator('.calc-alimento-table')).toBeVisible();
    await expect(page.locator('[data-testid="food-seo-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="food-seo-content"] h2')).toHaveText('Clara de ovo para hardgainers');
    await expect(page.locator('.calc-alimento-seo-copy h3')).toHaveCount(2);
    await expect(page.locator('[data-testid="food-seo-cta"]')).toBeVisible();

    const cta = page.locator('[data-testid="food-seo-cta"] .blog-cta-btn');
    await expect(cta).toHaveAttribute('href', '/');
    await expect(page.locator('[data-testid="food-seo-cta"] .calc-alimento-seo-cta__secondary')).toHaveAttribute('href', '/calcular-alimento');

    const relatedLinks = page.locator('[data-testid="food-seo-content"] a[href^="/calcular-alimento/"]');
    expect(await relatedLinks.count()).toBeGreaterThanOrEqual(2);
    expect(await relatedLinks.count()).toBeLessThanOrEqual(4);

    await page.locator('#food-qty').fill('200');
    await expect(page.locator('#res-kcal')).toHaveText('104');
    await expect(page.locator('#res-prot')).toHaveText('21.8');
    await expect(page.locator('#res-qty')).toHaveText('200');

    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDescription).toBe(FOOD_SEO_CONTENT.clara_ovo.metaDescription);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://hardgainermacros.com/calcular-alimento/clara-ovo');
    await expect(page.locator('#schema-food')).toHaveCount(1);

    const schema = await page.locator('#schema-food').evaluate((node) => JSON.parse(node.textContent || '{}'));
    expect(schema['@type']).toBe('NutritionInformation');
    expect(schema.name).toBe('Clara de ovo');
    expect(schema.calories).toBe('52 kcal');
    expect(schema.proteinContent).toBe('10.9 g');

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('CA-SEO-2 - azeite tem texto e meta diferentes sem paragrafos duplicados com clara de ovo', async ({ page }) => {
    const { FOOD_SEO_CONTENT } = await loadFoodSeoModule();

    await gotoCalcItem(page, 'azeite');

    await expect(page.locator('h1')).toHaveText('Calorias e Macros de Azeite de oliva');
    await expect(page.locator('[data-testid="food-seo-content"] h2')).toHaveText('Azeite de oliva para hardgainers');

    const clarIntro = normalize(FOOD_SEO_CONTENT.clara_ovo.intro);
    const azeiteIntro = normalize(FOOD_SEO_CONTENT.azeite.intro);
    expect(azeiteIntro).not.toBe(clarIntro);

    const pageText = normalize(await page.locator('[data-testid="food-seo-content"]').textContent());
    expect(pageText).toContain(normalize(FOOD_SEO_CONTENT.azeite.bestUse).slice(0, 60));
    expect(pageText).not.toContain(normalize(FOOD_SEO_CONTENT.clara_ovo.intro).slice(0, 80));

    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDescription).toBe(FOOD_SEO_CONTENT.azeite.metaDescription);
    expect(metaDescription).not.toBe(FOOD_SEO_CONTENT.clara_ovo.metaDescription);
  });

  test('CA-SEO-3 - alimento fora do lote preserva comportamento anterior sem bloco vazio', async ({ page }) => {
    await gotoCalcItem(page, 'maca');

    await expect(page.locator('.calc-alimento-title')).toHaveText('Calorias e Macros de Maçã sem casca');
    await expect(page.locator('.calc-alimento-table')).toBeVisible();
    await expect(page.locator('[data-testid="food-seo-content"]')).toHaveCount(0);
    await expect(page.locator('.calc-alimento-info-block h2').nth(1)).toHaveText('Maçã sem casca para Hardgainers');

    const bodyText = normalize(await page.locator('body').textContent());
    expect(bodyText).not.toContain('undefined');
  });

  test('CA-SEO-4 - navegação SPA remove schema residual e protege metadados de slug inexistente', async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await gotoCalcItem(page, 'clara-ovo');
    await expect(page.locator('#schema-food')).toHaveCount(1);

    const cta = page.locator('[data-testid="food-seo-cta"] .blog-cta-btn');
    await expect(cta).toHaveAttribute('href', '/');
    await cta.click();
    await page.waitForURL('**/');
    await expect(page.locator('#f-dados')).toBeVisible();
    await expect(page).toHaveTitle(HOME_TITLE);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', HOME_META_DESCRIPTION);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', HOME_CANONICAL);
    await expect(page.locator('#schema-food')).toHaveCount(0);

    await page.evaluate(() => {
      history.pushState({}, '', '/calcular-alimento/skyr');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('h1', { timeout: 10000 });
    await expect(page).toHaveTitle('Calorias e Macros de Skyr natural | Hardgainer Macros');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://hardgainermacros.com/calcular-alimento/skyr');
    await expect(page.locator('#schema-food')).toHaveCount(1);
    const schemaNameAfterReturn = await page.locator('#schema-food').evaluate((node) => JSON.parse(node.textContent || '{}').name);
    expect(schemaNameAfterReturn).toBe('Skyr natural');

    await page.evaluate(() => {
      history.pushState({}, '', '/calcular-alimento');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('#food-search', { timeout: 10000 });
    await expect(page.locator('#schema-food')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://hardgainermacros.com/calcular-alimento');

    await page.evaluate(() => {
      history.pushState({}, '', '/calcular-alimento/skyr');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('h1', { timeout: 10000 });
    await expect(page.locator('#schema-food')).toHaveCount(1);
    const schemaName = await page.locator('#schema-food').evaluate((node) => JSON.parse(node.textContent || '{}').name);
    expect(schemaName).toBe('Skyr natural');

    await page.evaluate(() => {
      history.pushState({}, '', '/calcular-alimento/slug-inexistente');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('.legal-page h1', { timeout: 10000 });
    await expect(page.locator('.legal-page h1')).toHaveText('Alimento não encontrado');
    await expect(page.locator('#schema-food')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://hardgainermacros.com/calcular-alimento');
    await expect(page).toHaveTitle('Alimento não encontrado | Hardgainer Macros');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /não foi encontrado/i);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('CA-SEO-5 - mobile 390px light e dark mantém CTA e links sem overflow', async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.setViewportSize(MOBILE_390);
    await gotoCalcItem(page, 'banana-prata');

    await expect(page.locator('[data-testid="food-seo-cta"] .blog-cta-btn')).toBeVisible();
    let scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390);

    await page.locator('#header-theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('[data-testid="food-seo-content"] a[href^="/calcular-alimento/"]')).toHaveCount(3);

    scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('CA-SEO-6 - todos os alimentos protein possuem cobertura individual com metas e links válidos', async () => {
    const { FOOD_SEO_CONTENT } = await loadFoodSeoModule();
    const { FOODS } = await loadFoodsModule();

    const proteinIds = Object.entries(FOODS)
      .filter(([, food]) => food.category === 'protein')
      .map(([foodId]) => foodId);

    expect(proteinIds).toHaveLength(23);

    const missingProteinIds = proteinIds.filter((foodId) => !FOOD_SEO_CONTENT[foodId]);
    expect(missingProteinIds).toEqual([]);

    const requiredFields = ['metaDescription', 'intro', 'macroContext', 'bestUse', 'pairingHeading', 'pairingText'];
    const invalidEntries = [];
    const invalidPairings = [];
    const selfPairings = [];
    const duplicatedPairings = [];

    for (const foodId of proteinIds) {
      const entry = FOOD_SEO_CONTENT[foodId];
      const missingFields = requiredFields.filter((field) => !normalize(entry?.[field]));
      if (missingFields.length) invalidEntries.push({ foodId, missingFields });

      const pairings = entry?.pairingIds || [];
      if (pairings.length !== 3) invalidPairings.push({ foodId, pairings });
      if (pairings.includes(foodId)) selfPairings.push(foodId);
      if (new Set(pairings).size !== pairings.length) duplicatedPairings.push(foodId);
      if (pairings.some((pairingId) => !FOODS[pairingId])) invalidPairings.push({ foodId, pairings });

      const metaLength = normalize(entry.metaDescription).length;
      expect(metaLength).toBeGreaterThanOrEqual(130);
      expect(metaLength).toBeLessThanOrEqual(165);
    }

    expect(invalidEntries).toEqual([]);
    expect(invalidPairings).toEqual([]);
    expect(selfPairings).toEqual([]);
    expect(duplicatedPairings).toEqual([]);

    const metaDescriptions = Object.values(FOOD_SEO_CONTENT).map((content) => normalize(content.metaDescription));
    expect(new Set(metaDescriptions).size).toBe(metaDescriptions.length);

    const paragraphs = Object.entries(FOOD_SEO_CONTENT).flatMap(([foodId, content]) => [
      { foodId, field: 'intro', text: normalize(content.intro) },
      { foodId, field: 'macroContext', text: normalize(content.macroContext) },
      { foodId, field: 'bestUse', text: normalize(content.bestUse) },
      { foodId, field: 'pairingText', text: normalize(content.pairingText) },
    ]);

    const duplicates = paragraphs.filter((paragraph, index) =>
      paragraphs.findIndex((candidate) => candidate.text === paragraph.text) !== index
    );
    expect(duplicates).toEqual([]);
  });

  test('CA-SEO-7 - páginas representativas de protein preservam cálculo, CTA, schema e conteúdo específico', async ({ page }) => {
    const { FOOD_SEO_CONTENT } = await loadFoodSeoModule();
    const { FOODS } = await loadFoodsModule();
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    for (const foodId of ['carne_moida', 'peixe_tilapia', 'atum_agua', 'caseina']) {
      const slug = foodId.replace(/_/g, '-');
      const food = FOODS[foodId];
      const content = FOOD_SEO_CONTENT[foodId];

      await gotoCalcItem(page, slug);
      await expect(page.locator('h1')).toHaveText(`Calorias e Macros de ${food.name}`);
      await expect(page.locator('.calc-alimento-table')).toBeVisible();
      await expect(page.locator('[data-testid="food-seo-content"] h2')).toHaveText(`${food.name} para hardgainers`);
      await expect(page.locator('.calc-alimento-seo-copy h3')).toHaveCount(2);
      await expect(page.locator('[data-testid="food-seo-cta"]')).toBeVisible();
      await expect(page.locator('[data-testid="food-seo-cta"] .blog-cta-btn')).toHaveAttribute('href', '/');
      await expect(page.locator('[data-testid="food-seo-content"] a[href^="/calcular-alimento/"]')).toHaveCount(3);
      await expect(page.locator('.calc-alimento-info-block h2').filter({ hasText: `Alternativas a ${food.name}` })).toHaveCount(1);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', content.metaDescription);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://hardgainermacros.com/calcular-alimento/${slug}`);
      await expect(page.locator('#schema-food')).toHaveCount(1);

      await page.locator('#food-qty').fill('200');
      await expect(page.locator('#res-kcal')).not.toHaveText(String(food.per100.kcal));

      const bodyText = normalize(await page.locator('body').textContent());
      expect(bodyText).toContain(normalize(content.bestUse).slice(0, 60));
      expect(bodyText).not.toContain('undefined');
    }

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('CA-SEO-8 - conteúdos piloto de clara_ovo e whey permanecem inalterados', async () => {
    const { FOOD_SEO_CONTENT } = await loadFoodSeoModule();

    expect(FOOD_SEO_CONTENT.clara_ovo.metaDescription).toBe(PILOT_SNAPSHOTS.clara_ovo.metaDescription);
    expect(FOOD_SEO_CONTENT.clara_ovo.intro).toBe(PILOT_SNAPSHOTS.clara_ovo.intro);
    expect(FOOD_SEO_CONTENT.clara_ovo.pairingIds).toEqual(PILOT_SNAPSHOTS.clara_ovo.pairingIds);

    expect(FOOD_SEO_CONTENT.whey.metaDescription).toBe(PILOT_SNAPSHOTS.whey.metaDescription);
    expect(FOOD_SEO_CONTENT.whey.intro).toBe(PILOT_SNAPSHOTS.whey.intro);
    expect(FOOD_SEO_CONTENT.whey.pairingIds).toEqual(PILOT_SNAPSHOTS.whey.pairingIds);
  });

  test('CA-SEO-9 - fallback legado continua ativo fora da categoria protein expandida', async ({ page }) => {
    for (const [slug, heading] of [
      ['iogurte-grego', 'Iogurte grego natural para Hardgainers'],
      ['arroz-basmati-cozido', 'Arroz basmati cozido para Hardgainers'],
      ['pasta-amendoim', 'Pasta de amendoim para Hardgainers'],
    ]) {
      await gotoCalcItem(page, slug);
      await expect(page.locator('[data-testid="food-seo-content"]')).toHaveCount(0);
      await expect(page.locator('.calc-alimento-info-block h2').nth(1)).toHaveText(heading);
      await page.locator('#food-qty').fill('200');
      const bodyText = normalize(await page.locator('body').textContent());
      expect(bodyText).not.toContain('undefined');
    }
  });

  test('CA-SEO-10 - mobile 390px em novo alimento protein mantém conteúdo legível e sem overflow', async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.setViewportSize(MOBILE_390);
    await gotoCalcItem(page, 'atum-agua');
    await expect(page.locator('[data-testid="food-seo-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="food-seo-cta"] .blog-cta-btn')).toBeVisible();
    await expect(page.locator('[data-testid="food-seo-content"] a[href^="/calcular-alimento/"]')).toHaveCount(3);
    await expect(page.locator('.calc-alimento-info-block h2').filter({ hasText: 'Alternativas a Atum em água' })).toHaveCount(1);

    let scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390);

    await page.locator('#header-theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
