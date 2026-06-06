// @ts-check
'use strict';

/**
 * imperial.spec.js
 *
 * Validação automática da experiência imperial no Plano Alimentar de 14 Dias.
 * Cenário: 180 lb / 70 in / treino 16:00–17:30 / sono 23:00–07:00 / 6 refeições / Híbrido.
 *
 * Testes cobertos:
 *  C-UNIT-ADD1  — métrico: 150 g aparece como 150 g
 *  C-UNIT-ADD2  — imperial: 1 oz adicionado aparece como 1 oz
 *  C-UNIT-ADD3  — imperial: editar oz pré-seleciona oz no select
 *  C-UNIT-ADD4  — imperial: 1 cup adicionado aparece como 1 cup
 *  C-UNIT-PLAN1 — imperial: nativos em g/ml aparecem como oz/fl oz
 *  C-UNIT-TEXT1 — imperial: .ingredient-qty não contém "X g" / "X ml" puros
 *  C-UNIT-PDF1  — imperial: área de print contém oz (nunca X g puro)
 *  C-UNIT-TEXT3 — métrico: ingredientes nativos continuam em g/ml
 *  C-UNIT-MATH1 — kcal/macros idênticos entre imperial e métrico
 *  C-UNIT-MACRO1— macros P/C/G continuam em gramas em modo imperial
 */

const { test, expect } = require('@playwright/test');
const { injectState, gotoResultados, gotoPlano } = require('./helpers/inject-state');

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const HYBRID_6_SLOTS = [
  { slot: 'breakfast',       type: 'solid', kcal: 508, time: '07:00' },
  { slot: 'shake_morning',   type: 'shake', kcal: 374, time: '10:00' },
  { slot: 'lunch',           type: 'solid', kcal: 556, time: '12:30' },
  { slot: 'shake_afternoon', type: 'shake', kcal: 374, time: '15:30' },
  { slot: 'dinner',          type: 'solid', kcal: 532, time: '19:00' },
  { slot: 'shake_night',     type: 'shake', kcal: 315, time: '22:00' },
];

const ROUTINE_IMP = {
  sleepEndTime: '07:00',
  sleepStartTime: '23:00',
  trainDays: 4,
  trainStartTime: '16:00',
  trainEndTime: '17:30',
  trainFasted: false,
  trainDurationMinutes: 90,
  mealsPerDay: 6,
  strategy: 'hybrid',
};

const BASE_RESULTS = {
  bmr: 1842,
  tdee: 2310,
  surplus: 350,
  calories: 2660,
  weeklyGainLowKg: 0.3,
  weeklyGainHighKg: 0.5,
  protein: { grams: 200, kcal: 800,  pct: 30, perKg: 2.7 },
  carb:    { grams: 332, kcal: 1328, pct: 50 },
  fat:     { grams: 59,  kcal: 531,  pct: 20 },
  macroNote: null,
  slotDistribution: HYBRID_6_SLOTS,
  computedAt: '2026-06-05T10:00:00.000Z',
};

/** Cenário imperial: 180 lb / 70 in */
const CENARIO_IMPERIAL = {
  form: { unit: 'imperial', weight: '180', height: '70', age: '23', sex: 'male' },
  profile: { activity: 'moderate', goal: 'gain', difficulty: 'classico', falsoMagro: false, mealsPerDay: 6, strategy: 'hybrid' },
  routine: { ...ROUTINE_IMP },
  results: {
    ...BASE_RESULTS,
    weightKg: 81.6,   // 180 lb / 2.205
    heightCm: 177.8,  // 70 in * 2.54
    profile: { activity: 'moderate', goal: 'gain', difficulty: 'classico', falsoMagro: false, mealsPerDay: 6, strategy: 'hybrid' },
    routine: { ...ROUTINE_IMP },
  },
};

/** Cenário métrico equivalente (regressão) */
const CENARIO_METRIC_REF = {
  form: { unit: 'metric', weight: '75', height: '176', age: '23', sex: 'male' },
  profile: { activity: 'moderate', goal: 'gain', difficulty: 'classico', falsoMagro: false, mealsPerDay: 6, strategy: 'hybrid' },
  routine: { ...ROUTINE_IMP },
  results: {
    ...BASE_RESULTS,
    weightKg: 75,
    heightCm: 176,
    profile: { activity: 'moderate', goal: 'gain', difficulty: 'classico', falsoMagro: false, mealsPerDay: 6, strategy: 'hybrid' },
    routine: { ...ROUTINE_IMP },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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

/** Recolhe todos os .ingredient-qty do Dia 1 */
async function getDayQtys(page) {
  return page.locator('#day-body-0 .ingredient-qty').evaluateAll(
    els => els.map(e => (e.textContent || '').trim())
  );
}

/** Regex: "X g" ou "Xg" puro (sem mais texto) */
const METRIC_G_RE  = /^\d+(\.\d+)?\s*g$/;
/** Regex: "X ml" puro */
const METRIC_ML_RE = /^\d+(\.\d+)?\s*ml$/;

// ─────────────────────────────────────────────────────────────────────────────
// Testes
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Validação imperial — Plano 14 Dias', () => {

  // ── C-UNIT-ADD1 ───────────────────────────────────────────────────────────
  test('C-UNIT-ADD1 — Modo métrico: alimento adicionado 150 g aparece como "150 g"', async ({ page }) => {
    await injectState(page, CENARIO_METRIC_REF);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, { name: 'Skyr Métrico', category: 'dairy', qty: 150, unit: 'g', kcal: 120, prot: 18, carb: 8, fat: 1 });
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();

    const qtys = await page.locator('.ingredient-added .ingredient-qty').evaluateAll(
      els => els.map(e => (e.textContent || '').trim())
    );
    expect(qtys.some(t => t === '150 g'), `Esperado "150 g", encontrado: ${JSON.stringify(qtys)}`).toBe(true);
  });

  // ── C-UNIT-ADD2 ───────────────────────────────────────────────────────────
  test('C-UNIT-ADD2 — Modo imperial: alimento adicionado 1 oz aparece como "1 oz"', async ({ page }) => {
    await injectState(page, CENARIO_IMPERIAL);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, { name: 'Teste imperial', category: 'protein', qty: 1, unit: 'oz', kcal: 28, prot: 5, carb: 0, fat: 1 });
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();

    const qtys = await page.locator('.ingredient-added .ingredient-qty').evaluateAll(
      els => els.map(e => (e.textContent || '').trim())
    );
    expect(qtys.some(t => t === '1 oz'), `Esperado "1 oz", encontrado: ${JSON.stringify(qtys)}`).toBe(true);
  });

  // ── C-UNIT-ADD3 ───────────────────────────────────────────────────────────
  test('C-UNIT-ADD3 — Modo imperial: editar alimento 1 oz pré-seleciona "oz" no select', async ({ page }) => {
    await injectState(page, CENARIO_IMPERIAL);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, { name: 'Teste imperial', category: 'protein', qty: 1, unit: 'oz', kcal: 28, prot: 5, carb: 0, fat: 1 });
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();

    await page.locator('[data-edit-addition]').first().click();
    await expect(page.locator('#edit-food-form')).toBeVisible();

    const selectedUnit = await page.locator('#eff-unit').inputValue();
    expect(selectedUnit, `Esperado "oz", encontrado: "${selectedUnit}"`).toBe('oz');
  });

  // ── C-UNIT-ADD4 ───────────────────────────────────────────────────────────
  test('C-UNIT-ADD4 — Modo imperial: alimento adicionado 1 cup aparece como "1 cup"', async ({ page }) => {
    await injectState(page, CENARIO_IMPERIAL);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-add-food]').first().click();
    await fillAddFoodForm(page, { name: 'Aveia cup Test', category: 'carb', qty: 1, unit: 'cup', kcal: 150, prot: 5, carb: 27, fat: 3 });
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();

    const qtys = await page.locator('.ingredient-added .ingredient-qty').evaluateAll(
      els => els.map(e => (e.textContent || '').trim())
    );
    expect(qtys.some(t => t === '1 cup'), `Esperado "1 cup", encontrado: ${JSON.stringify(qtys)}`).toBe(true);
  });

  // ── C-UNIT-PLAN1 ─────────────────────────────────────────────────────────
  test('C-UNIT-PLAN1 — Modo imperial: ingredientes nativos em g/ml são exibidos em oz/fl oz', async ({ page }) => {
    await injectState(page, CENARIO_IMPERIAL);
    await gotoResultados(page);
    await gotoPlano(page);

    const qtys = await getDayQtys(page);

    // Deve existir pelo menos 1 display com "oz" ou "fl oz" (nativos convertidos)
    const hasOz = qtys.some(t => /\d+(\.\d+)?\s*(fl\s+)?oz/.test(t));
    expect(hasOz, `Nenhum oz/fl oz encontrado. Qtys: ${JSON.stringify(qtys.slice(0, 12))}`).toBe(true);

    // Nenhum nativo deve exibir "X g" ou "X ml" puros (adições excluídas — .ingredient-qty
    // dentro de .ingredient-added são geridas separadamente por C-UNIT-ADD2)
    const nativeQtys = await page.locator('#day-body-0 li:not(.ingredient-added) .ingredient-qty').evaluateAll(
      els => els.map(e => (e.textContent || '').trim())
    );
    const metricPure = nativeQtys.filter(t => METRIC_G_RE.test(t) || METRIC_ML_RE.test(t));
    expect(metricPure, `Displays métricos puros em nativos: ${JSON.stringify(metricPure)}`).toHaveLength(0);
  });

  // ── C-UNIT-TEXT1 ─────────────────────────────────────────────────────────
  test('C-UNIT-TEXT1 — Modo imperial: .ingredient-qty nativos não contêm "X g" ou "X ml" puros', async ({ page }) => {
    await injectState(page, CENARIO_IMPERIAL);
    await gotoResultados(page);
    await gotoPlano(page);

    const nativeQtys = await page.locator('#day-body-0 li:not(.ingredient-added) .ingredient-qty').evaluateAll(
      els => els.map(e => (e.textContent || '').trim())
    );
    const metricPure = nativeQtys.filter(t => METRIC_G_RE.test(t) || METRIC_ML_RE.test(t));
    expect(metricPure, `Displays métricos puros encontrados: ${JSON.stringify(metricPure)}`).toHaveLength(0);
  });

  // ── C-UNIT-PDF1 ──────────────────────────────────────────────────────────
  test('C-UNIT-PDF1 — Modo imperial: área de print contém oz e não contém "X g" puro em nativos', async ({ page }) => {
    await injectState(page, CENARIO_IMPERIAL);
    await gotoResultados(page);
    await gotoPlano(page);

    // O PDF/print usa o mesmo HTML do #day-body-0 (botões têm .no-print, quantidades não)
    const nativeQtys = await page.locator('#day-body-0 li:not(.ingredient-added) .ingredient-qty').evaluateAll(
      els => els.map(e => (e.textContent || '').trim())
    );

    // Deve ter oz no print
    const hasOz = nativeQtys.some(t => /\d+(\.\d+)?\s*(fl\s+)?oz/.test(t));
    expect(hasOz, `Print deve conter oz. Qtys: ${JSON.stringify(nativeQtys.slice(0, 8))}`).toBe(true);

    // Não deve ter "X g" puro
    const metricPure = nativeQtys.filter(t => METRIC_G_RE.test(t));
    expect(metricPure, `Print contém g puro: ${JSON.stringify(metricPure)}`).toHaveLength(0);
  });

  // ── C-UNIT-TEXT3 ─────────────────────────────────────────────────────────
  test('C-UNIT-TEXT3 — Modo métrico: ingredientes nativos continuam em g/ml (regressão)', async ({ page }) => {
    await injectState(page, CENARIO_METRIC_REF);
    await gotoResultados(page);
    await gotoPlano(page);

    const qtys = await getDayQtys(page);

    // Deve existir pelo menos 1 display com g ou ml para os nativos
    const hasMetric = qtys.some(t => METRIC_G_RE.test(t) || METRIC_ML_RE.test(t));
    expect(hasMetric, `Modo métrico: nenhum g/ml encontrado. Qtys: ${JSON.stringify(qtys.slice(0, 10))}`).toBe(true);

    // NÃO deve existir oz em modo métrico
    const hasOz = qtys.some(t => /\d+(\.\d+)?\s*(fl\s+)?oz/.test(t));
    expect(hasOz, `Modo métrico não deve ter oz: ${JSON.stringify(qtys.filter(t => /oz/.test(t)))}`).toBe(false);
  });

  // ── C-UNIT-MACRO1 ────────────────────────────────────────────────────────
  test('C-UNIT-MACRO1 — Modo imperial: macros P/C/G continuam em gramas', async ({ page }) => {
    await injectState(page, CENARIO_IMPERIAL);
    await gotoResultados(page);
    await gotoPlano(page);

    const macroTexts = await page.locator('#day-body-0 .ingredient-macros').evaluateAll(
      els => els.map(e => (e.textContent || '').trim())
    );
    const hasMacros = macroTexts.some(t => /P:\d+(\.\d+)?g/.test(t) && /C:\d+(\.\d+)?g/.test(t) && /G:\d+(\.\d+)?g/.test(t));
    expect(hasMacros, `Macros P/C/G em g não encontrados. Exemplo: "${macroTexts[0]}"`).toBe(true);
  });

  // ── C-UNIT-MATH1 ─────────────────────────────────────────────────────────
  test('C-UNIT-MATH1 — kcal/macros do dia idênticos em imperial e métrico (mesma base calórica)', async ({ page }) => {
    // Imperial
    await injectState(page, CENARIO_IMPERIAL);
    await gotoResultados(page);
    await gotoPlano(page);
    const summaryImp = (await page.locator('[data-day-head="0"] .day-summary').textContent() || '').replace(/\s+/g, ' ');

    // Limpar e recarregar em métrico
    await page.evaluate(() => { try { sessionStorage.clear(); localStorage.clear(); } catch {} });
    await injectState(page, CENARIO_METRIC_REF);
    await gotoResultados(page);
    await gotoPlano(page);
    const summaryMet = (await page.locator('[data-day-head="0"] .day-summary').textContent() || '').replace(/\s+/g, ' ');

    // Extrair kcal (strip separador de milhar ".")
    const parseKcal = s => parseInt((s.match(/(\d[\d.]*)\s*kcal/) || [])[1]?.replace(/\./g, '') || '0', 10);
    const impKcal = parseKcal(summaryImp);
    const metKcal = parseKcal(summaryMet);

    // Ambos usam 2660 kcal → devem ser idênticos (±5 arredondamento)
    expect(Math.abs(impKcal - metKcal), `kcal imperial (${impKcal}) ≠ métrico (${metKcal})`).toBeLessThanOrEqual(5);
  });

  // ── C-UNIT-PLAN1-PAREN ────────────────────────────────────────────────────
  test('C-UNIT-PLAN1-PAREN — Modo imperial: "(Xg)" embutido em display é convertido para "(Y oz)"', async ({ page }) => {
    await injectState(page, CENARIO_IMPERIAL);
    await gotoResultados(page);
    await gotoPlano(page);

    const qtys = await page.locator('#day-body-0 li:not(.ingredient-added) .ingredient-qty').evaluateAll(
      els => els.map(e => (e.textContent || '').trim())
    );

    // Nenhum "(Xg)" ou "(~Xg)" deve aparecer em modo imperial
    const parenG = qtys.filter(t => /\(\d+g\)/.test(t) || /\(~\d+g\)/.test(t));
    expect(parenG, `"(Xg)" ainda presente em modo imperial: ${JSON.stringify(parenG)}`).toHaveLength(0);
  });

  // ── C-UNIT-PDF-DAY1 ──────────────────────────────────────────────────────
  test('C-UNIT-PDF-DAY1 — Modo imperial: PDF por dia usa oz/fl oz, sem "(Xg)"/"X ml" puros', async ({ page }) => {
    await injectState(page, CENARIO_IMPERIAL);
    await gotoResultados(page);
    await gotoPlano(page);

    // Suprimir o diálogo de impressão para poder inspecionar o DOM injectado
    await page.evaluate(() => { window.print = () => {}; });

    // Clicar no botão "Baixar PDF" do Dia 1
    await page.locator('[data-pdf-day="0"]').first().click();

    // Aguardar área de impressão no DOM (está hidden por CSS — só visível em @media print)
    await page.waitForSelector('#day-pdf-print-area', { state: 'attached', timeout: 5000 });

    const qtys = await page.locator('#day-pdf-print-area .ing-qty').evaluateAll(
      els => els.map(e => (e.textContent || '').trim())
    );

    // Deve existir pelo menos um oz/fl oz
    const hasOz = qtys.some(t => /\d+(\.\d+)?\s*(fl\s+)?oz/.test(t));
    expect(hasOz, `PDF dia deve conter oz/fl oz. Qtys: ${JSON.stringify(qtys.slice(0, 8))}`).toBe(true);

    // Nenhum "(Xg)" ou "(~Xg)"
    const parenG = qtys.filter(t => /\(\d+g\)/.test(t) || /\(~\d+g\)/.test(t));
    expect(parenG, `PDF dia contém "(Xg)": ${JSON.stringify(parenG)}`).toHaveLength(0);

    // Nenhum "X ml" puro
    const pureMl = qtys.filter(t => METRIC_ML_RE.test(t));
    expect(pureMl, `PDF dia contém "X ml" puro: ${JSON.stringify(pureMl)}`).toHaveLength(0);

    // Nenhum "X g" puro
    const pureG = qtys.filter(t => METRIC_G_RE.test(t));
    expect(pureG, `PDF dia contém "X g" puro: ${JSON.stringify(pureG)}`).toHaveLength(0);
  });

  // ── C-UNIT-PDF-FULL1 ─────────────────────────────────────────────────────
  test('C-UNIT-PDF-FULL1 — Modo imperial: PDF completo usa oz/fl oz, sem métricas puras', async ({ page }) => {
    await injectState(page, CENARIO_IMPERIAL);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.evaluate(() => { window.print = () => {}; });

    // Abrir todos os dias (o botão imprimir imprime o plano completo)
    await page.locator('#btn-print').click();

    await page.waitForSelector('#full-pdf-print-area', { state: 'attached', timeout: 5000 });

    const qtys = await page.locator('#full-pdf-print-area .ing-qty').evaluateAll(
      els => els.map(e => (e.textContent || '').trim())
    );

    const hasOz = qtys.some(t => /\d+(\.\d+)?\s*(fl\s+)?oz/.test(t));
    expect(hasOz, `PDF completo deve conter oz/fl oz. Qtys (amostra): ${JSON.stringify(qtys.slice(0, 8))}`).toBe(true);

    const parenG = qtys.filter(t => /\(\d+g\)/.test(t) || /\(~\d+g\)/.test(t));
    expect(parenG, `PDF completo contém "(Xg)": ${JSON.stringify(parenG.slice(0, 5))}`).toHaveLength(0);

    const pureMl = qtys.filter(t => METRIC_ML_RE.test(t));
    expect(pureMl, `PDF completo contém "X ml" puro: ${JSON.stringify(pureMl.slice(0, 5))}`).toHaveLength(0);
  });

  // ── C-UNIT-PDF-ADD1 ──────────────────────────────────────────────────────
  test('C-UNIT-PDF-ADD1 — Modo imperial: alimento manual 1 oz aparece como "1 oz" no PDF por dia', async ({ page }) => {
    await injectState(page, CENARIO_IMPERIAL);
    await gotoResultados(page);
    await gotoPlano(page);

    // Adicionar alimento com unidade oz
    await page.locator('[data-add-food][data-day-idx="0"][data-meal-idx="0"]').click();
    await fillAddFoodForm(page, { name: 'Teste imperial', category: 'protein', qty: 1, unit: 'oz', kcal: 100, prot: 20, carb: 5, fat: 2 });
    await page.locator('#add-food-form button[type="submit"]').click();
    await expect(page.locator('.ing-badge-added').first()).toBeVisible();

    // Abrir PDF do dia 1
    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('[data-pdf-day="0"]').first().click();
    await page.waitForSelector('#day-pdf-print-area', { state: 'attached', timeout: 5000 });

    const qtys = await page.locator('#day-pdf-print-area .ing-qty').evaluateAll(
      els => els.map(e => (e.textContent || '').trim())
    );

    // "Teste imperial" adicionado com oz deve aparecer como "1 oz" (não convertido)
    expect(qtys.some(t => t === '1 oz'), `PDF deve conter "1 oz". Qtys: ${JSON.stringify(qtys)}`).toBe(true);
  });

  // ── C-UNIT-MATH-PDF1 ─────────────────────────────────────────────────────
  test('C-UNIT-MATH-PDF1 — PDF imperial: kcal/macros nos chips permanecem em g (não convertidos)', async ({ page }) => {
    await injectState(page, CENARIO_IMPERIAL);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('[data-pdf-day="0"]').first().click();
    await page.waitForSelector('#day-pdf-print-area', { state: 'attached', timeout: 5000 });

    // macro-chips: P:Xg, C:Xg, G:Xg — devem manter-se em gramas
    const macroTexts = await page.locator('#day-pdf-print-area .macro-chip').evaluateAll(
      els => els.map(e => (e.textContent || '').trim())
    );
    const hasGrams = macroTexts.some(t => /P:\s*\d+g/.test(t) || /C:\s*\d+g/.test(t));
    expect(hasGrams, `Macro chips devem conter g. Encontrado: ${JSON.stringify(macroTexts.slice(0, 6))}`).toBe(true);
  });

});
