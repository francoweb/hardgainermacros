// @ts-check
'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MOBILE_390 = { width: 390, height: 844 };
const HOME_TITLE = 'Hardgainer Macros — Calculadora para ectomorfos';
const HOME_META_DESCRIPTION = 'Hardgainer Macros — calculadora especializada para ectomorfos. Descubra suas calorias, macros e receba um plano alimentar de 14 dias baseado no Sistema Híbrido.';
const HOME_CANONICAL = 'https://hardgainermacros.com/';
const PREVIOUSLY_APPROVED_IDS = [
  'clara_ovo', 'ovo_inteiro', 'peito_frango', 'arroz_branco_cozido', 'aveia_flocos', 'banana_prata', 'azeite', 'whey', 'lentilha_cozida', 'skyr',
  'carne_moida', 'peixe_tilapia', 'peixe_pescada', 'peixe_salmao', 'atum_agua', 'coxa_frango', 'peito_peru', 'alcatra_grelhada', 'camarao', 'bacalhau_fresco',
  'queijo_mussarela', 'queijo_branco', 'caseina', 'tofu', 'tempeh', 'lombo_porco', 'sardinha_lata', 'proteina_ervilha', 'proteina_arroz', 'leite_integral',
  'leite_lactose_free', 'bebida_aveia', 'bebida_amendoa', 'iogurte_natural', 'iogurte_grego', 'leite_po', 'queijo_cottage', 'queijo_parmesao', 'ricotta',
];
const FORBIDDEN_TERMS = [
  'ebook', 'vitamina', 'vitaminas', 'vitaminico', 'vitaminica', 'mineral', 'minerais', 'fibra', 'fibras', 'indice glicemico', 'glicemia', 'insulina',
  'glicogenio', 'probiotico', 'probioticos', 'saude intestinal', 'beneficios osseos', 'fortalece os ossos', 'absorcao rapida', 'absorcao lenta',
  'energia rapida', 'energia lenta', 'liberacao lenta', 'digestao facil', 'digestao dificil', 'carboidrato simples', 'carboidrato complexo', 'saciedade',
  'anti-inflamatorio', 'melhora hormonal', 'melhora de desempenho', 'recuperacao muscular', 'ganho muscular', 'ganho de peso garantido', 'resultado garantido',
  'alimento obrigatorio', 'melhor alimento', 'consumo ilimitado', 'sem gluten', 'baixo indice glicemico',
];
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
  skyr: {
    metaDescription: 'Confira as calorias e os macronutrientes do skyr natural por 100g, ajuste a porção e veja como usar esse laticínio em lanches e combinações práticas.',
    intro: 'O skyr natural é uma alternativa prática quando a meta é incluir proteína em lanches, cafés da manhã ou combinações frias sem recorrer sempre a carnes, ovos ou suplementos. Para hardgainers, isso ajuda a variar o plano e a manter uma distribuição proteica mais estável em momentos do dia em que a refeição precisa ser rápida.',
    pairingIds: ['banana_prata', 'aveia_flocos', 'mel'],
  },
};

function normalize(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function normalizeForTermAudit(text) {
  return normalize(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseExportedObject(source, exportName) {
  const match = source.match(new RegExp(`export const ${exportName} = (\\{[\\s\\S]*?\\n\\});`));
  if (!match) throw new Error(`${exportName} não encontrado`);
  return Function(`return (${match[1]});`)();
}

async function loadFoodSeoModule() {
  const sourcePath = path.resolve(__dirname, '../assets/js/data/food-seo-content.js');
  const source = fs.readFileSync(sourcePath, 'utf8');
  return { FOOD_SEO_CONTENT: parseExportedObject(source, 'FOOD_SEO_CONTENT') };
}

async function loadFoodsModule() {
  const sourcePath = path.resolve(__dirname, '../assets/js/data/foods.js');
  const source = fs.readFileSync(sourcePath, 'utf8');
  return { FOODS: parseExportedObject(source, 'FOODS') };
}

function loadSeoContentFromHead() {
  const source = execFileSync('git', ['show', 'HEAD:assets/js/data/food-seo-content.js'], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
  });
  return parseExportedObject(source, 'FOOD_SEO_CONTENT');
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

function getRepresentativeIds() {
  return {
    carb: ['arroz_basmati_cozido', 'wrap_tortilha'],
    fruit: ['maca'],
    fat: ['abacate'],
    veg: ['brocolis'],
    extra: ['mass_gainer'],
    protein: ['clara_ovo'],
    dairy: ['skyr'],
  };
}

test.describe('Calcular alimento - SEO editorial individual', () => {
  test('CA-SEO-1 - clara de ovo preserva cálculo, tabela, schema e bloco editorial', async ({ page }) => {
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
    await expect(page.locator('[data-testid="food-seo-content"] a[href^="/calcular-alimento/"]')).toHaveCount(3);

    await page.locator('#food-qty').fill('200');
    await expect(page.locator('#res-kcal')).toHaveText('104');
    await expect(page.locator('#res-prot')).toHaveText('21.8');
    await expect(page.locator('#res-qty')).toHaveText('200');

    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', FOOD_SEO_CONTENT.clara_ovo.metaDescription);
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

  test('CA-SEO-2 - azeite mantém conteúdo específico sem duplicação com clara de ovo', async ({ page }) => {
    const { FOOD_SEO_CONTENT } = await loadFoodSeoModule();

    await gotoCalcItem(page, 'azeite');

    await expect(page.locator('h1')).toHaveText('Calorias e Macros de Azeite de oliva');
    await expect(page.locator('[data-testid="food-seo-content"] h2')).toHaveText('Azeite de oliva para hardgainers');
    expect(normalize(FOOD_SEO_CONTENT.azeite.intro)).not.toBe(normalize(FOOD_SEO_CONTENT.clara_ovo.intro));

    const pageText = normalize(await page.locator('[data-testid="food-seo-content"]').textContent());
    expect(pageText).toContain(normalize(FOOD_SEO_CONTENT.azeite.bestUse).slice(0, 60));
    expect(pageText).not.toContain(normalize(FOOD_SEO_CONTENT.clara_ovo.intro).slice(0, 80));
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', FOOD_SEO_CONTENT.azeite.metaDescription);
  });

  test('CA-SEO-3 - dados cobrem os 100 alimentos, preservam as 39 entradas anteriores e não deixam fallback editorial', async () => {
    const { FOOD_SEO_CONTENT } = await loadFoodSeoModule();
    const { FOODS } = await loadFoodsModule();
    const headSeo = loadSeoContentFromHead();
    const allFoodIds = Object.keys(FOODS);
    const seoIds = Object.keys(FOOD_SEO_CONTENT);
    const newIds = seoIds.filter((foodId) => !PREVIOUSLY_APPROVED_IDS.includes(foodId));
    const missingIds = allFoodIds.filter((foodId) => !FOOD_SEO_CONTENT[foodId]);
    const extraIds = seoIds.filter((foodId) => !FOODS[foodId]);
    const duplicateIds = seoIds.filter((foodId, index) => seoIds.indexOf(foodId) !== index);
    const requiredFields = ['metaDescription', 'intro', 'macroContext', 'bestUse', 'pairingHeading', 'pairingText', 'pairingIds'];
    const missingFields = [];
    const duplicateParagraphs = [];
    const invalidPairings = [];
    const invalidMetaLengths = [];
    const duplicateMetas = [];
    const termProblems = [];
    const literalProblems = [];

    expect(allFoodIds).toHaveLength(100);
    expect(seoIds).toHaveLength(100);
    expect(PREVIOUSLY_APPROVED_IDS).toHaveLength(39);
    expect(newIds).toHaveLength(61);
    expect(missingIds).toEqual([]);
    expect(extraIds).toEqual([]);
    expect(duplicateIds).toEqual([]);

    for (const foodId of PREVIOUSLY_APPROVED_IDS) {
      expect(FOOD_SEO_CONTENT[foodId]).toEqual(headSeo[foodId]);
    }

    const metaMap = new Map();
    const paragraphMap = new Map();

    for (const foodId of seoIds) {
      const entry = FOOD_SEO_CONTENT[foodId];
      for (const field of requiredFields) {
        const value = entry[field];
        if (field === 'pairingIds') {
          if (!Array.isArray(value) || value.length !== 3) missingFields.push({ foodId, field, value });
          continue;
        }
        if (!normalize(value)) missingFields.push({ foodId, field, value });
      }

      const normalizedMeta = normalize(entry.metaDescription);
      if (metaMap.has(normalizedMeta)) duplicateMetas.push({ foodId, duplicateOf: metaMap.get(normalizedMeta) });
      else metaMap.set(normalizedMeta, foodId);

      for (const field of ['intro', 'macroContext', 'bestUse', 'pairingText']) {
        const text = normalize(entry[field]);
        if (paragraphMap.has(text)) duplicateParagraphs.push({ foodId, field, duplicateOf: paragraphMap.get(text) });
        else paragraphMap.set(text, `${foodId}.${field}`);
      }

      const pairings = entry.pairingIds || [];
      if (pairings.length !== 3 || new Set(pairings).size !== pairings.length || pairings.includes(foodId) || pairings.some((pairingId) => !FOODS[pairingId])) {
        invalidPairings.push({ foodId, pairings });
      }

      const flattened = [entry.metaDescription, entry.intro, entry.macroContext, entry.bestUse, entry.pairingHeading, entry.pairingText].map(normalize).join(' ');
      if (/undefined|NaN|Infinity/.test(flattened)) literalProblems.push({ foodId });

      if (newIds.includes(foodId)) {
        const metaLength = normalizedMeta.length;
        if (metaLength < 130 || metaLength > 165) invalidMetaLengths.push({ foodId, metaLength });
        for (const field of ['metaDescription', 'intro', 'macroContext', 'bestUse', 'pairingHeading', 'pairingText']) {
          const text = normalizeForTermAudit(entry[field]);
          for (const term of FORBIDDEN_TERMS) {
            const pattern = new RegExp(`\\b${term}\\b`, 'i');
            if (pattern.test(text)) termProblems.push({ foodId, field, term });
          }
        }
      }
    }

    expect(missingFields).toEqual([]);
    expect(duplicateMetas).toEqual([]);
    expect(duplicateParagraphs).toEqual([]);
    expect(invalidPairings).toEqual([]);
    expect(invalidMetaLengths).toEqual([]);
    expect(termProblems).toEqual([]);
    expect(literalProblems).toEqual([]);
  });

  test('CA-SEO-4 - navegação SPA remove schema residual e protege metadados da home e da listagem', async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await gotoCalcItem(page, 'arroz-basmati-cozido');
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
    await expect(page.locator('#schema-food')).toHaveCount(1);

    await page.evaluate(() => {
      history.pushState({}, '', '/calcular-alimento');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('#food-search', { timeout: 10000 });
    await expect(page.locator('#schema-food')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://hardgainermacros.com/calcular-alimento');

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('CA-SEO-5 - páginas representativas das categorias cobertas preservam cálculo, CTA, schema e conteúdo', async ({ page }) => {
    const { FOOD_SEO_CONTENT } = await loadFoodSeoModule();
    const { FOODS } = await loadFoodsModule();
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const reps = getRepresentativeIds();
    const foodIds = [...reps.carb, ...reps.fruit, ...reps.fat, ...reps.veg, ...reps.extra, ...reps.protein, ...reps.dairy];

    for (const foodId of foodIds) {
      const slug = foodId.replace(/_/g, '-');
      const food = FOODS[foodId];
      const content = FOOD_SEO_CONTENT[foodId];
      await gotoCalcItem(page, slug);
      await expect(page.locator('h1')).toHaveText(`Calorias e Macros de ${food.name}`);
      await expect(page.locator('.calc-alimento-table')).toBeVisible();
      await expect(page.locator('[data-testid="food-seo-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="food-seo-cta"]')).toBeVisible();
      await expect(page.locator('[data-testid="food-seo-cta"] .blog-cta-btn')).toHaveAttribute('href', '/');
      await expect(page.locator('[data-testid="food-seo-cta"] .calc-alimento-seo-cta__secondary')).toHaveAttribute('href', '/calcular-alimento');
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

  test('CA-SEO-6 - conteúdos preservados de clara_ovo, whey e skyr permanecem inalterados', async () => {
    const { FOOD_SEO_CONTENT } = await loadFoodSeoModule();

    expect(FOOD_SEO_CONTENT.clara_ovo.metaDescription).toBe(PILOT_SNAPSHOTS.clara_ovo.metaDescription);
    expect(FOOD_SEO_CONTENT.clara_ovo.intro).toBe(PILOT_SNAPSHOTS.clara_ovo.intro);
    expect(FOOD_SEO_CONTENT.clara_ovo.pairingIds).toEqual(PILOT_SNAPSHOTS.clara_ovo.pairingIds);

    expect(FOOD_SEO_CONTENT.whey.metaDescription).toBe(PILOT_SNAPSHOTS.whey.metaDescription);
    expect(FOOD_SEO_CONTENT.whey.intro).toBe(PILOT_SNAPSHOTS.whey.intro);
    expect(FOOD_SEO_CONTENT.whey.pairingIds).toEqual(PILOT_SNAPSHOTS.whey.pairingIds);

    expect(FOOD_SEO_CONTENT.skyr.metaDescription).toBe(PILOT_SNAPSHOTS.skyr.metaDescription);
    expect(FOOD_SEO_CONTENT.skyr.intro).toBe(PILOT_SNAPSHOTS.skyr.intro);
    expect(FOOD_SEO_CONTENT.skyr.pairingIds).toEqual(PILOT_SNAPSHOTS.skyr.pairingIds);
  });

  test('CA-SEO-7 - todas as páginas individuais possuem bloco editorial próprio e nenhum caso recai no fallback legado', async ({ page }) => {
    const { FOODS } = await loadFoodsModule();
    for (const foodId of Object.keys(FOODS)) {
      const slug = foodId.replace(/_/g, '-');
      await gotoCalcItem(page, slug);
      await expect(page.locator('[data-testid="food-seo-content"]'), foodId).toHaveCount(1);
      await expect(page.locator('[data-testid="food-seo-content"] a[href^="/calcular-alimento/"]'), foodId).toHaveCount(3);
      const bodyText = normalize(await page.locator('body').textContent());
      expect(bodyText, foodId).not.toContain('undefined');
    }
  });

  test('CA-SEO-8 - mobile 390 em página nova mantém conteúdo legível, dark mode e sem overflow', async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.setViewportSize(MOBILE_390);
    await gotoCalcItem(page, 'brocolis');
    await expect(page.locator('[data-testid="food-seo-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="food-seo-cta"] .blog-cta-btn')).toBeVisible();
    await expect(page.locator('[data-testid="food-seo-content"] a[href^="/calcular-alimento/"]')).toHaveCount(3);

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
