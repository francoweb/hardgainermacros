// @ts-check
'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const MOBILE_390 = { width: 390, height: 844 };
const HOME_TITLE = 'Hardgainer Macros — Calculadora para ectomorfos';
const HOME_META_DESCRIPTION = 'Hardgainer Macros — calculadora especializada para ectomorfos. Descubra suas calorias, macros e receba um plano alimentar de 14 dias baseado no Sistema Híbrido.';
const HOME_CANONICAL = 'https://hardgainermacros.com/';
const SEO_SOURCE_PATH = path.resolve(__dirname, '../assets/js/data/food-seo-content.js');
const FOODS_SOURCE_PATH = path.resolve(__dirname, '../assets/js/data/foods.js');

const REQUIRED_FIELDS = [
  'metaDescription',
  'intro',
  'macroContext',
  'bestUse',
  'pairingHeading',
  'pairingText',
  'pairingIds',
];

const FORBIDDEN_TERMS = [
  'vitamina',
  'vitaminas',
  'mineral',
  'minerais',
  'fibra',
  'fibras',
  'calcio',
  'indice glicemico',
  'glicemia',
  'insulina',
  'glicogenio',
  'saude intestinal',
  'anti-inflamatorio',
  'antiinflamatorio',
  'recuperacao muscular',
  'ganho muscular garantido',
  'ganho de peso garantido',
  'resultado garantido',
  'alimento obrigatorio',
  'melhor alimento',
  'consumo ilimitado',
  'sem gluten',
  'baixo indice glicemico',
  'ebook',
];

const BLOCKED_PHRASES = [
  'pelos valores da base',
  'muda a leitura da porcao',
  'muda a leitura da porção',
  'referencia estavel',
  'referência estável',
  'clareza na conta final',
  'ajustar a refeicao com previsibilidade',
  'ajustar a refeição com previsibilidade',
];

const CORRUPTION_PATTERNS = [
  /ï¿½/u,
  /Ãƒ/u,
  /Ã‚/u,
  /Ã¢â‚¬/u,
  /\?\?/u,
  /\b\w+\?\w+\b/u,
  /\b(?:refei|por|pr|refer|est|vers)\?[a-z]+\b/ui,
  /undefined|NaN|Infinity/u,
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u,
];

const REPRESENTATIVE_IDS = [
  'clara_ovo',
  'peixe_salmao',
  'skyr',
  'queijo_parmesao',
  'arroz_basmati_cozido',
  'wrap_tortilha',
  'banana_prata',
  'azeite',
  'brocolis',
  'mass_gainer',
];

function normalize(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function normalizeForAudit(text) {
  return normalize(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function words(text) {
  return normalize(text)
    .split(/\s+/)
    .filter(Boolean);
}

function parseExportedObject(source, exportName) {
  const match = source.match(new RegExp(`export const ${exportName} = (\\{[\\s\\S]*?\\n\\});`));
  if (!match) throw new Error(`${exportName} nao encontrado`);
  return Function(`return (${match[1]});`)();
}

function readUtf8Strict(filePath) {
  const bytes = fs.readFileSync(filePath);
  const decoder = new TextDecoder('utf-8', { fatal: true });
  return decoder.decode(bytes);
}

function loadSeoData() {
  const source = readUtf8Strict(SEO_SOURCE_PATH);
  return {
    source,
    FOOD_SEO_CONTENT: parseExportedObject(source, 'FOOD_SEO_CONTENT'),
    hasGetter: /export function getFoodSeoContent\s*\(/.test(source),
  };
}

function loadFoodsData() {
  const source = readUtf8Strict(FOODS_SOURCE_PATH);
  return {
    source,
    FOODS: parseExportedObject(source, 'FOODS'),
  };
}

function collectFieldProblems(foodId, field, value) {
  const text = String(value || '');
  const problems = [];

  for (const pattern of CORRUPTION_PATTERNS) {
    if (pattern.test(text)) problems.push({ foodId, field, issue: `pattern:${pattern}` });
  }

  return problems;
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

function getRepresentativeIdsByCategory() {
  return {
    protein: ['clara_ovo', 'peixe_salmao'],
    dairy: ['skyr', 'queijo_parmesao'],
    carb: ['arroz_basmati_cozido', 'wrap_tortilha'],
    fruit: ['banana_prata'],
    fat: ['azeite'],
    veg: ['brocolis'],
    extra: ['mass_gainer'],
  };
}

test.describe('Calcular alimento - SEO copy quality', () => {
  test('CA-SEO-1 - estrutura, UTF-8, coerencia editorial e pairings cobrem os 100 alimentos', async () => {
    const seoData = loadSeoData();
    const foodsData = loadFoodsData();
    const { source: seoSource, FOOD_SEO_CONTENT } = seoData;
    const { source: foodsSource, FOODS } = foodsData;

    expect(Object.keys(FOODS)).toHaveLength(100);
    expect(Object.keys(FOOD_SEO_CONTENT)).toHaveLength(100);
    expect(/export const FOOD_SEO_CONTENT\s*=\s*\{/.test(seoSource)).toBe(true);
    expect(seoData.hasGetter).toBe(true);
    expect(/export const FOODS\s*=\s*\{/.test(foodsSource)).toBe(true);

    const foodIds = Object.keys(FOODS).sort();
    const seoIds = Object.keys(FOOD_SEO_CONTENT).sort();
    const missingIds = foodIds.filter((foodId) => !FOOD_SEO_CONTENT[foodId]);
    const extraIds = seoIds.filter((foodId) => !FOODS[foodId]);
    const duplicateIds = seoIds.filter((foodId, index) => seoIds.indexOf(foodId) !== index);
    const emptyFields = [];
    const invalidPairings = [];
    const duplicateMetas = [];
    const badMetaLengths = [];
    const duplicatedParagraphs = [];
    const corruptionProblems = [];
    const forbiddenTermProblems = [];
    const blockedPhraseProblems = [];
    const wordCountProblems = [];
    const paragraphSeen = new Map();
    const metaSeen = new Map();

    for (const foodId of seoIds) {
      const entry = FOOD_SEO_CONTENT[foodId];

      for (const field of REQUIRED_FIELDS) {
        const value = entry[field];
        if (field === 'pairingIds') {
          if (!Array.isArray(value) || value.length !== 3) {
            emptyFields.push({ foodId, field, value });
          }
          continue;
        }

        if (!normalize(value)) emptyFields.push({ foodId, field, value });
        corruptionProblems.push(...collectFieldProblems(foodId, field, value));
      }

      const meta = normalize(entry.metaDescription);
      if (meta.length < 130 || meta.length > 165) {
        badMetaLengths.push({ foodId, length: meta.length });
      }
      if (metaSeen.has(meta)) duplicateMetas.push({ foodId, duplicateOf: metaSeen.get(meta) });
      else metaSeen.set(meta, foodId);

      const bodyFields = ['intro', 'macroContext', 'bestUse', 'pairingText'];
      const totalWords = bodyFields.reduce((sum, field) => sum + words(entry[field]).length, 0);
      if (totalWords < 140 || totalWords > 210) {
        wordCountProblems.push({ foodId, totalWords });
      }

      for (const field of bodyFields) {
        const paragraph = normalize(entry[field]);
        if (paragraphSeen.has(paragraph)) {
          duplicateParagraphs.push({ foodId, field, duplicateOf: paragraphSeen.get(paragraph) });
        } else {
          paragraphSeen.set(paragraph, `${foodId}.${field}`);
        }
      }

      const normalizedText = normalizeForAudit([
        entry.metaDescription,
        entry.intro,
        entry.macroContext,
        entry.bestUse,
        entry.pairingHeading,
        entry.pairingText,
      ].join(' '));

      for (const term of FORBIDDEN_TERMS) {
        if (normalizedText.includes(term)) {
          forbiddenTermProblems.push({ foodId, term });
        }
      }

      for (const phrase of BLOCKED_PHRASES) {
        if (normalizedText.includes(phrase)) {
          blockedPhraseProblems.push({ foodId, phrase });
        }
      }

      const pairingIds = entry.pairingIds || [];
      const pairingSet = new Set(pairingIds);
      if (
        pairingIds.length !== 3 ||
        pairingSet.size !== pairingIds.length ||
        pairingIds.includes(foodId) ||
        pairingIds.some((pairingId) => !FOODS[pairingId])
      ) {
        invalidPairings.push({ foodId, pairingIds });
      }
    }

    expect(missingIds).toEqual([]);
    expect(extraIds).toEqual([]);
    expect(duplicateIds).toEqual([]);
    expect(emptyFields).toEqual([]);
    expect(invalidPairings).toEqual([]);
    expect(corruptionProblems).toEqual([]);
    expect(duplicateMetas).toEqual([]);
    expect(badMetaLengths).toEqual([]);
    expect(duplicatedParagraphs).toEqual([]);
    expect(forbiddenTermProblems).toEqual([]);
    expect(blockedPhraseProblems).toEqual([]);
    expect(wordCountProblems).toEqual([]);
  });

  test('CA-SEO-2 - arroz basmati preserva calculo, schema, CTA e texto especifico', async ({ page }) => {
    const { FOOD_SEO_CONTENT } = loadSeoData();
    const pageErrors = [];
    const consoleErrors = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await gotoCalcItem(page, 'arroz-basmati-cozido');

    await expect(page.locator('h1')).toHaveText('Calorias e Macros de Arroz basmati cozido');
    await expect(page.locator('.calc-alimento-table')).toBeVisible();
    await expect(page.locator('[data-testid="food-seo-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="food-seo-content"] a[href^="/calcular-alimento/"]')).toHaveCount(3);
    await expect(page.locator('[data-testid="food-seo-cta"] .blog-cta-btn')).toHaveAttribute('href', '/');
    await expect(page.locator('[data-testid="food-seo-cta"] .calc-alimento-seo-cta__secondary')).toHaveAttribute('href', '/calcular-alimento');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', FOOD_SEO_CONTENT.arroz_basmati_cozido.metaDescription);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://hardgainermacros.com/calcular-alimento/arroz-basmati-cozido');
    await expect(page.locator('#schema-food')).toHaveCount(1);

    await page.locator('#food-qty').fill('200');
    await expect(page.locator('#res-kcal')).not.toHaveText('130');
    await expect(page.locator('#res-qty')).toHaveText('200');

    const seoText = normalize(await page.locator('[data-testid="food-seo-content"]').textContent());
    expect(seoText).toContain(normalize(FOOD_SEO_CONTENT.arroz_basmati_cozido.intro).slice(0, 80));
    expect(seoText).toContain(normalize(FOOD_SEO_CONTENT.arroz_basmati_cozido.bestUse).slice(0, 80));
    expect(seoText).not.toMatch(/\?\?|\b\w+\?\w+\b|undefined|NaN|Infinity/u);

    const schema = await page.locator('#schema-food').evaluate((node) => JSON.parse(node.textContent || '{}'));
    expect(schema['@type']).toBe('NutritionInformation');
    expect(schema.name).toBe('Arroz basmati cozido');

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('CA-SEO-3 - navegacao SPA limpa schema e restaura metadados da home e da listagem', async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await gotoCalcItem(page, 'arroz-basmati-cozido');
    await expect(page.locator('#schema-food')).toHaveCount(1);

    await page.locator('[data-testid="food-seo-cta"] .blog-cta-btn').click();
    await page.waitForURL('**/');
    await expect(page).toHaveTitle(HOME_TITLE);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', HOME_META_DESCRIPTION);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', HOME_CANONICAL);
    await expect(page.locator('#schema-food')).toHaveCount(0);

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
    await page.waitForSelector('.calc-alimento-title', { timeout: 10000 });
    await expect(page.locator('#schema-food')).toHaveCount(1);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('CA-SEO-4 - amostra representativa preserva tabela, CTA, schema e links contextuais', async ({ page }) => {
    const { FOOD_SEO_CONTENT } = loadSeoData();
    const { FOODS } = loadFoodsData();
    const pageErrors = [];
    const consoleErrors = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const reps = getRepresentativeIdsByCategory();
    const foodIds = [
      ...reps.protein,
      ...reps.dairy,
      ...reps.carb,
      ...reps.fruit,
      ...reps.fat,
      ...reps.veg,
      ...reps.extra,
    ];

    expect(foodIds).toEqual(REPRESENTATIVE_IDS);

    for (const foodId of foodIds) {
      const slug = foodId.replace(/_/g, '-');
      const food = FOODS[foodId];
      const content = FOOD_SEO_CONTENT[foodId];

      await gotoCalcItem(page, slug);
      await expect(page.locator('h1')).toHaveText(`Calorias e Macros de ${food.name}`);
      await expect(page.locator('.calc-alimento-table')).toBeVisible();
      await expect(page.locator('[data-testid="food-seo-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="food-seo-content"] a[href^="/calcular-alimento/"]')).toHaveCount(3);
      await expect(page.locator('[data-testid="food-seo-cta"]')).toBeVisible();
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', content.metaDescription);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://hardgainermacros.com/calcular-alimento/${slug}`);
      await expect(page.locator('#schema-food')).toHaveCount(1);

      const pageText = normalize(await page.locator('body').textContent());
      expect(pageText).toContain(normalize(content.pairingText).slice(0, 60));
      expect(pageText).not.toMatch(/\?\?|\b\w+\?\w+\b|undefined|NaN|Infinity/u);
    }

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('CA-SEO-5 - as 100 paginas individuais exibem bloco editorial proprio com 3 links validos', async ({ page }) => {
    const { FOODS } = loadFoodsData();

    for (const foodId of Object.keys(FOODS)) {
      const slug = foodId.replace(/_/g, '-');
      await gotoCalcItem(page, slug);
      await expect(page.locator('[data-testid="food-seo-content"]'), foodId).toHaveCount(1);
      await expect(page.locator('[data-testid="food-seo-content"] a[href^="/calcular-alimento/"]'), foodId).toHaveCount(3);
      const bodyText = normalize(await page.locator('body').textContent());
      expect(bodyText, foodId).not.toMatch(/\?\?|\b\w+\?\w+\b|undefined|NaN|Infinity/u);
    }
  });

  test('CA-SEO-6 - mobile 390 e dark mode mantem conteudo legivel e sem overflow', async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.setViewportSize(MOBILE_390);
    await gotoCalcItem(page, 'mass-gainer');

    await expect(page.locator('[data-testid="food-seo-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="food-seo-cta"]')).toBeVisible();
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
