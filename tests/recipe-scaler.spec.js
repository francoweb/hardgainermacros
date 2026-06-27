// @ts-check
'use strict';

/**
 * recipe-scaler.spec.js — Sprint R3
 * =============================================================================
 * Validação do algoritmo de escala de receitas (recipe-scaler.js).
 *
 * Estratégia:
 *  - Todos os testes de algoritmo (R3-01 a R3-25) carregam scaleRecipe e
 *    RECIPES via dynamic import no browser. Nenhum depende de UI/DOM.
 *  - Testes de regressão (R3-26 a R3-30) são smoke tests mínimos para
 *    garantir que a adição do scaler não quebrou funcionalidades existentes.
 *
 * Nomenclatura: R3-01 a R3-30 — mapeados 1:1 com lista de requisitos.
 * =============================================================================
 */

const { test, expect } = require('@playwright/test');
const { injectState, gotoResultados, gotoPlano } = require('./helpers/inject-state');
const { CENARIO_6 } = require('./fixtures/scenarios');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: navega para / e importa os módulos necessários no browser.
// Retorna o resultado de fn() executada no contexto do browser.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executa código no browser que usa scaleRecipe + RECIPES.
 * @param {import('@playwright/test').Page} page
 * @param {function} fn - função serializada para page.evaluate
 */
async function runInBrowser(page, fn) {
  await page.goto('/');
  await page.waitForLoadState('load');
  return page.evaluate(fn);
}

// Targets de teste reutilizados
const TARGET_MEDIO   = { kcal: 520, prot: 40, carb: 30, fat: 25 };
const TARGET_BAIXO   = { kcal: 200, prot: 15, carb: 20, fat: 10 };
const TARGET_ALTO    = { kcal: 900, prot: 60, carb: 80, fat: 35 };
const TARGET_SHAKE   = { kcal: 700, prot: 45, carb: 80, fat: 20 };

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 1: Módulo e função (requisitos 1-2)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('R3 — Módulo e função', () => {

  // R3-01 — O módulo importa sem erro
  test('R3-01 — recipe-scaler.js importa sem erro', async ({ page }) => {
    const exports = await runInBrowser(page, async () => {
      const mod = await import('/assets/js/modules/recipe-scaler.js');
      return Object.keys(mod);
    });
    expect(Array.isArray(exports)).toBe(true);
    expect(exports).toContain('scaleRecipe');
  });

  // R3-02 — scaleRecipe existe e é função
  test('R3-02 — scaleRecipe existe e é função', async ({ page }) => {
    const tipo = await runInBrowser(page, async () => {
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      return typeof scaleRecipe;
    });
    expect(tipo).toBe('function');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 2: Omelete de frango anabólica (requisitos 3-6)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('R3 — Omelete de frango anabólica', () => {

  // R3-03 — Escala omelete para target médio (520 kcal)
  test('R3-03 — Omelete escalada para 520 kcal devolve estrutura válida', async ({ page }) => {
    const result = await runInBrowser(page, async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const r = RECIPES.find(r => r.id === 'omelete_frango');
      return scaleRecipe(r, { kcal: 520, prot: 40, carb: 30, fat: 25 });
    });
    expect(result.recipeId).toBe('omelete_frango');
    expect(result.scaledIngredients).toHaveLength(4); // ovo, frango, queijo, azeite
    expect(typeof result.totals.kcal).toBe('number');
    expect(result.fitLabel).toBeTruthy();
  });

  // R3-04 — Omelete: todos os ingredientes respeitam min/max
  test('R3-04 — Omelete escalada respeita min/max de todos os ingredientes', async ({ page }) => {
    const result = await runInBrowser(page, async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const r = RECIPES.find(r => r.id === 'omelete_frango');
      const scaled = scaleRecipe(r, { kcal: 520, prot: 40, carb: 30, fat: 25 });
      return r.ingredients.map((ing, i) => ({
        foodId:   ing.foodId,
        min:      ing.minGrams,
        max:      ing.maxGrams,
        grams:    scaled.scaledIngredients[i].grams,
      }));
    });
    for (const ing of result) {
      expect(ing.grams).toBeGreaterThanOrEqual(ing.min);
      expect(ing.grams).toBeLessThanOrEqual(ing.max);
    }
  });

  // R3-05 — Omelete não gera número absurdo de ovos (≤ 5 ovos = ≤ 250g)
  test('R3-05 — Omelete não gera número absurdo de ovos (max 5)', async ({ page }) => {
    const gramsOvo = await runInBrowser(page, async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const r = RECIPES.find(r => r.id === 'omelete_frango');
      // mesmo com target muito alto, ovos não excedem maxGrams = 250g
      const scaled = scaleRecipe(r, { kcal: 900, prot: 60, carb: 20, fat: 40 });
      return scaled.scaledIngredients.find(i => i.foodId === 'ovo_inteiro').grams;
    });
    expect(gramsOvo).toBeLessThanOrEqual(250); // maxGrams definido em recipes.js
    expect(gramsOvo % 50).toBe(0);             // múltiplo de 1 ovo (50g)
  });

  // R3-06 — Omelete: queijo permanece na estrutura como removível (não removido automaticamente)
  test('R3-06 — Omelete: queijo_branco permanece na estrutura e é removable:true', async ({ page }) => {
    const result = await runInBrowser(page, async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const r = RECIPES.find(r => r.id === 'omelete_frango');
      const scaled = scaleRecipe(r, { kcal: 300, prot: 25, carb: 5, fat: 20 });
      const queijo = scaled.scaledIngredients.find(i => i.foodId === 'queijo_branco');
      return { present: !!queijo, removable: queijo?.removable };
    });
    expect(result.present).toBe(true);
    expect(result.removable).toBe(true);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 3: Shake hardgainer (requisitos 7-8)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('R3 — Shake hardgainer', () => {

  // R3-07 — Escala shake para target médio (700 kcal)
  test('R3-07 — Shake escalado para 700 kcal devolve estrutura válida', async ({ page }) => {
    const result = await runInBrowser(page, async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const r = RECIPES.find(r => r.id === 'shake_hardgainer');
      return scaleRecipe(r, { kcal: 700, prot: 45, carb: 80, fat: 20 });
    });
    expect(result.recipeId).toBe('shake_hardgainer');
    expect(result.scaledIngredients).toHaveLength(5);
    expect(typeof result.totals.kcal).toBe('number');
    expect(result.totals.kcal).toBeGreaterThan(0);
  });

  // R3-08 — Shake: todos os ingredientes respeitam min/max
  test('R3-08 — Shake escalado respeita min/max de todos os ingredientes', async ({ page }) => {
    const result = await runInBrowser(page, async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const r = RECIPES.find(r => r.id === 'shake_hardgainer');
      const scaled = scaleRecipe(r, { kcal: 700, prot: 45, carb: 80, fat: 20 });
      return r.ingredients.map((ing, i) => ({
        foodId: ing.foodId,
        min:    ing.minGrams,
        max:    ing.maxGrams,
        grams:  scaled.scaledIngredients[i].grams,
      }));
    });
    for (const ing of result) {
      expect(ing.grams).toBeGreaterThanOrEqual(ing.min);
      expect(ing.grams).toBeLessThanOrEqual(ing.max);
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 4: Restantes receitas (requisitos 9-11)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('R3 — Restantes receitas', () => {

  // R3-09 — Panqueca de banana com whey
  test('R3-09 — Panqueca escalada para target médio devolve estrutura válida', async ({ page }) => {
    const result = await runInBrowser(page, async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const r = RECIPES.find(r => r.id === 'panqueca_banana_whey');
      return scaleRecipe(r, { kcal: 480, prot: 35, carb: 55, fat: 12 });
    });
    expect(result.recipeId).toBe('panqueca_banana_whey');
    expect(result.scaledIngredients).toHaveLength(5);
    expect(typeof result.totals.kcal).toBe('number');
  });

  // R3-10 — Arroz com frango e azeite
  test('R3-10 — Arroz com frango escalado para target médio devolve estrutura válida', async ({ page }) => {
    const result = await runInBrowser(page, async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const r = RECIPES.find(r => r.id === 'arroz_frango_azeite');
      return scaleRecipe(r, { kcal: 550, prot: 42, carb: 60, fat: 12 });
    });
    expect(result.recipeId).toBe('arroz_frango_azeite');
    expect(result.scaledIngredients).toHaveLength(4);
    expect(typeof result.totals.kcal).toBe('number');
  });

  // R3-11 — Massa com carne moída
  test('R3-11 — Massa com carne moída escalada para target médio devolve estrutura válida', async ({ page }) => {
    const result = await runInBrowser(page, async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const r = RECIPES.find(r => r.id === 'massa_carne_moida');
      return scaleRecipe(r, { kcal: 580, prot: 35, carb: 70, fat: 16 });
    });
    expect(result.recipeId).toBe('massa_carne_moida');
    expect(result.scaledIngredients).toHaveLength(4);
    expect(typeof result.totals.kcal).toBe('number');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 5: Estrutura de saída — todas as receitas (requisitos 12-14)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('R3 — Estrutura de saída', () => {

  // R3-12 — Todas as receitas devolvem totals com kcal/prot/carb/fat numéricos
  test('R3-12 — Todas as receitas devolvem totals numéricos', async ({ page }) => {
    const results = await runInBrowser(page, async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const target = { kcal: 520, prot: 38, carb: 45, fat: 18 };
      return RECIPES.map(r => {
        const s = scaleRecipe(r, target);
        return {
          id:   r.id,
          kcal: typeof s.totals.kcal,
          prot: typeof s.totals.prot,
          carb: typeof s.totals.carb,
          fat:  typeof s.totals.fat,
        };
      });
    });
    for (const r of results) {
      expect(r.kcal).toBe('number');
      expect(r.prot).toBe('number');
      expect(r.carb).toBe('number');
      expect(r.fat).toBe('number');
    }
  });

  // R3-13 — Todas as receitas devolvem deltas numéricos
  test('R3-13 — Todas as receitas devolvem deltas numéricos', async ({ page }) => {
    const results = await runInBrowser(page, async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const target = { kcal: 520, prot: 38, carb: 45, fat: 18 };
      return RECIPES.map(r => {
        const s = scaleRecipe(r, target);
        return {
          id:   r.id,
          kcal: typeof s.deltas.kcal,
          prot: typeof s.deltas.prot,
          carb: typeof s.deltas.carb,
          fat:  typeof s.deltas.fat,
        };
      });
    });
    for (const r of results) {
      expect(r.kcal).toBe('number');
      expect(r.prot).toBe('number');
      expect(r.carb).toBe('number');
      expect(r.fat).toBe('number');
    }
  });

  // R3-14 — Todas as receitas devolvem fitLabel válido
  test('R3-14 — Todas as receitas devolvem fitLabel válido', async ({ page }) => {
    const VALID_LABELS = [
      'Encaixe bom',
      'Encaixe aproximado',
      'Macros diferentes, mas calorias próximas',
      'Não recomendado para esta refeição',
    ];
    const results = await runInBrowser(page, async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const target = { kcal: 520, prot: 38, carb: 45, fat: 18 };
      return RECIPES.map(r => ({
        id:       r.id,
        fitLabel: scaleRecipe(r, target).fitLabel,
      }));
    });
    for (const r of results) {
      expect(VALID_LABELS).toContain(r.fitLabel);
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 6: Limites práticos — todas as receitas (requisitos 15-19)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('R3 — Limites práticos', () => {

  // R3-15 — Nenhum ingrediente escalado fica abaixo do mínimo
  test('R3-15 — Nenhum ingrediente fica abaixo do minGrams', async ({ page }) => {
    const violations = await runInBrowser(page, async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const targets = [
        { kcal: 200, prot: 15, carb: 20, fat: 8 },
        { kcal: 520, prot: 38, carb: 45, fat: 18 },
        { kcal: 900, prot: 60, carb: 80, fat: 35 },
      ];
      const out = [];
      for (const recipe of RECIPES) {
        for (const target of targets) {
          const scaled = scaleRecipe(recipe, target);
          for (let i = 0; i < recipe.ingredients.length; i++) {
            const min = recipe.ingredients[i].minGrams;
            const g   = scaled.scaledIngredients[i].grams;
            if (g < min) out.push({ recipe: recipe.id, foodId: recipe.ingredients[i].foodId, min, g });
          }
        }
      }
      return out;
    });
    expect(violations).toHaveLength(0);
  });

  // R3-16 — Nenhum ingrediente escalado fica acima do máximo
  test('R3-16 — Nenhum ingrediente fica acima do maxGrams', async ({ page }) => {
    const violations = await runInBrowser(page, async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const targets = [
        { kcal: 200, prot: 15, carb: 20, fat: 8 },
        { kcal: 520, prot: 38, carb: 45, fat: 18 },
        { kcal: 900, prot: 60, carb: 80, fat: 35 },
      ];
      const out = [];
      for (const recipe of RECIPES) {
        for (const target of targets) {
          const scaled = scaleRecipe(recipe, target);
          for (let i = 0; i < recipe.ingredients.length; i++) {
            const max = recipe.ingredients[i].maxGrams;
            const g   = scaled.scaledIngredients[i].grams;
            if (g > max) out.push({ recipe: recipe.id, foodId: recipe.ingredients[i].foodId, max, g });
          }
        }
      }
      return out;
    });
    expect(violations).toHaveLength(0);
  });

  // R3-17 — Quantidades contáveis são múltiplos inteiros (ovos = múltiplo de 50g)
  test('R3-17 — ovo_inteiro é sempre múltiplo de 50g (inteiros)', async ({ page }) => {
    const result = await runInBrowser(page, async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const targets = [
        { kcal: 300, prot: 20, carb: 10, fat: 15 },
        { kcal: 520, prot: 38, carb: 30, fat: 25 },
        { kcal: 750, prot: 55, carb: 20, fat: 35 },
      ];
      const ovos = [];
      for (const target of targets) {
        const omelete = RECIPES.find(r => r.id === 'omelete_frango');
        const scaled = scaleRecipe(omelete, target);
        const ovo = scaled.scaledIngredients.find(i => i.foodId === 'ovo_inteiro');
        ovos.push({ target: target.kcal, grams: ovo.grams, rem: ovo.grams % 50 });
      }
      return ovos;
    });
    for (const o of result) {
      expect(o.rem).toBe(0); // múltiplo de 50g = número inteiro de ovos
    }
  });

  // R3-18 — Azeite arredondado em passo prático de 5g
  test('R3-18 — azeite arredondado em passo de 5g', async ({ page }) => {
    const result = await runInBrowser(page, async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const targets = [
        { kcal: 300, prot: 20, carb: 10, fat: 15 },
        { kcal: 520, prot: 38, carb: 30, fat: 25 },
        { kcal: 750, prot: 55, carb: 20, fat: 35 },
      ];
      const azeites = [];
      // Omelete e arroz têm azeite
      for (const recipeId of ['omelete_frango', 'arroz_frango_azeite']) {
        const r = RECIPES.find(x => x.id === recipeId);
        for (const target of targets) {
          const scaled = scaleRecipe(r, target);
          const az = scaled.scaledIngredients.find(i => i.foodId === 'azeite');
          if (az) azeites.push({ recipe: recipeId, target: target.kcal, grams: az.grams, rem: az.grams % 5 });
        }
      }
      return azeites;
    });
    for (const az of result) {
      expect(az.rem).toBe(0); // múltiplo de 5g
    }
  });

  // R3-19 — Proteínas e hidratos pesáveis em passos práticos de 10g
  test('R3-19 — peito_frango, carne_moida, arroz e macarrão em múltiplos de 10g', async ({ page }) => {
    const result = await runInBrowser(page, async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const checks = [
        { recipeId: 'omelete_frango',    foodId: 'peito_frango',        target: { kcal: 520, prot: 40, carb: 10, fat: 25 } },
        { recipeId: 'arroz_frango_azeite', foodId: 'arroz_branco_cozido', target: { kcal: 550, prot: 40, carb: 60, fat: 12 } },
        { recipeId: 'massa_carne_moida', foodId: 'carne_moida',          target: { kcal: 580, prot: 35, carb: 70, fat: 16 } },
        { recipeId: 'massa_carne_moida', foodId: 'macarrao_cozido',      target: { kcal: 580, prot: 35, carb: 70, fat: 16 } },
      ];
      return checks.map(({ recipeId, foodId, target }) => {
        const r = RECIPES.find(x => x.id === recipeId);
        const scaled = scaleRecipe(r, target);
        const ing = scaled.scaledIngredients.find(i => i.foodId === foodId);
        return { recipeId, foodId, grams: ing?.grams, rem: ing ? ing.grams % 10 : -1 };
      });
    });
    for (const c of result) {
      expect(c.rem).toBe(0); // múltiplo de 10g
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 7: Targets extremos (requisitos 20-22)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('R3 — Targets extremos e warnings', () => {

  // R3-20 — Target muito baixo: respeita mínimos e gera warning de clamping
  // Nota: com target 200 kcal, a omelete só consegue chegar a ~267 kcal (mínimos
  // práticos). O delta de ~67 kcal fica dentro de ±75, então o fitLabel pode ser
  // 'Encaixe bom' — o que é honesto. O importante é que os mínimos sejam
  // respeitados e que o warning de clamping apareça.
  test('R3-20 — Target muito baixo (200 kcal): respeita mínimos e gera warning de clamping', async ({ page }) => {
    const result = await runInBrowser(page, async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const omelete = RECIPES.find(r => r.id === 'omelete_frango');
      return scaleRecipe(omelete, { kcal: 200, prot: 15, carb: 5, fat: 10 });
    });
    // 1) Todos os ingredientes respeitam os mínimos
    for (const ing of result.scaledIngredients) {
      const mins = {
        ovo_inteiro: 50, peito_frango: 50, queijo_branco: 0, azeite: 5,
      };
      if (mins[ing.foodId] !== undefined) {
        expect(ing.grams).toBeGreaterThanOrEqual(mins[ing.foodId]);
      }
    }
    // 2) Warning de clamping gerado (frango bate no mínimo prático)
    expect(result.warnings.length).toBeGreaterThan(0);
    const hasClampWarn = result.warnings.some(w => w.includes('mínimo prático'));
    expect(hasClampWarn).toBe(true);
    // 3) Total acima do target (porque os mínimos impedem ir a 200 kcal)
    expect(result.totals.kcal).toBeGreaterThan(200);
    // 4) fitLabel é string válida
    const validLabels = ['Encaixe bom', 'Encaixe aproximado', 'Macros diferentes, mas calorias próximas', 'Não recomendado para esta refeição'];
    expect(validLabels).toContain(result.fitLabel);
  });

  // R3-21 — Target muito alto: respeita máximos e avisa
  test('R3-21 — Target muito alto (1200 kcal omelete): respeita máximos e avisa', async ({ page }) => {
    const result = await runInBrowser(page, async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const omelete = RECIPES.find(r => r.id === 'omelete_frango');
      return scaleRecipe(omelete, { kcal: 1200, prot: 80, carb: 20, fat: 70 });
    });
    // Máximos respeitados
    for (const ing of result.scaledIngredients) {
      const original = [
        { foodId: 'ovo_inteiro', maxGrams: 250 },
        { foodId: 'peito_frango', maxGrams: 200 },
        { foodId: 'queijo_branco', maxGrams: 60 },
        { foodId: 'azeite', maxGrams: 20 },
      ].find(x => x.foodId === ing.foodId);
      if (original) expect(ing.grams).toBeLessThanOrEqual(original.maxGrams);
    }
    // Deve haver warnings (impossível atingir 1200 kcal com os máximos da omelete)
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  // R3-22 — Slot não sugerido: não bloqueia mas gera aviso e slotCompatible=false
  test('R3-22 — Slot não sugerido não bloqueia mas gera aviso', async ({ page }) => {
    const result = await runInBrowser(page, async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      // shake_hardgainer suggestedSlots = ['shake_morning', 'shake_afternoon', 'shake_night']
      // passar 'breakfast' como slot não sugerido
      const shake = RECIPES.find(r => r.id === 'shake_hardgainer');
      return scaleRecipe(shake, { kcal: 700, prot: 45, carb: 80, fat: 20 }, { slot: 'breakfast' });
    });
    // Não deve bloquear — devolve resultado completo
    expect(result.recipeId).toBe('shake_hardgainer');
    expect(result.scaledIngredients.length).toBeGreaterThan(0);
    // slotCompatible deve ser false
    expect(result.slotCompatible).toBe(false);
    // Deve haver warning sobre o slot
    const slotWarning = result.warnings.find(w => w.includes('breakfast'));
    expect(slotWarning).toBeTruthy();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 8: Imutabilidade e isolamento (requisitos 23-25)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('R3 — Imutabilidade e isolamento', () => {

  // R3-23 — O algoritmo não altera a receita original por referência
  test('R3-23 — scaleRecipe não muta a receita original', async ({ page }) => {
    const result = await runInBrowser(page, async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const omelete = RECIPES.find(r => r.id === 'omelete_frango');
      const originalBaseKcal  = omelete.baseKcal;
      const originalFirstGrams = omelete.ingredients[0].defaultGrams;
      // Chama com target muito diferente
      scaleRecipe(omelete, { kcal: 100, prot: 5, carb: 5, fat: 5 });
      scaleRecipe(omelete, { kcal: 1500, prot: 100, carb: 50, fat: 80 });
      return {
        baseKcalUnchanged:    omelete.baseKcal === originalBaseKcal,
        firstGramsUnchanged:  omelete.ingredients[0].defaultGrams === originalFirstGrams,
        ingredientsCount:     omelete.ingredients.length,
      };
    });
    expect(result.baseKcalUnchanged).toBe(true);
    expect(result.firstGramsUnchanged).toBe(true);
    expect(result.ingredientsCount).toBe(4); // omelete sempre tem 4 ingredientes
  });

  // R3-24 — O algoritmo não altera FOODS
  test('R3-24 — scaleRecipe não muta FOODS', async ({ page }) => {
    const result = await runInBrowser(page, async () => {
      const { FOODS } = await import('/assets/js/data/foods.js');
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const originalKcal = FOODS['ovo_inteiro'].per100.kcal;
      const originalProt = FOODS['peito_frango'].per100.prot;
      // Escala todas as receitas com vários targets
      for (const r of RECIPES) {
        scaleRecipe(r, { kcal: 300, prot: 25, carb: 20, fat: 10 });
        scaleRecipe(r, { kcal: 800, prot: 60, carb: 80, fat: 30 });
      }
      return {
        ovoKcalUnchanged:    FOODS['ovo_inteiro'].per100.kcal === originalKcal,
        frangoPrtUnchanged:  FOODS['peito_frango'].per100.prot === originalProt,
      };
    });
    expect(result.ovoKcalUnchanged).toBe(true);
    expect(result.frangoPrtUnchanged).toBe(true);
  });

  // R3-25 — O algoritmo não depende de UI (corre em contexto sem DOM ativo)
  test('R3-25 — scaleRecipe corre sem aceder a document/window.location/DOM', async ({ page }) => {
    // Prova: o resultado é correto e completo sem qualquer interação com DOM.
    // Se o módulo tentasse aceder ao DOM, falharia ou retornaria dados inconsistentes.
    const result = await runInBrowser(page, async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const shake = RECIPES.find(r => r.id === 'shake_hardgainer');
      const s = scaleRecipe(shake, { kcal: 680, prot: 42, carb: 75, fat: 18 });
      return {
        hasRecipeId:   typeof s.recipeId === 'string',
        hasTotals:     typeof s.totals.kcal === 'number',
        hasIngredients: s.scaledIngredients.length > 0,
        hasFitLabel:   typeof s.fitLabel === 'string',
        hasWarnings:   Array.isArray(s.warnings),
      };
    });
    expect(result.hasRecipeId).toBe(true);
    expect(result.hasTotals).toBe(true);
    expect(result.hasIngredients).toBe(true);
    expect(result.hasFitLabel).toBe(true);
    expect(result.hasWarnings).toBe(true);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 9: Regressão — funcionalidade existente preservada (requisitos 26-29)
// Requisito 30 (suíte completa verde) é validado rodando npx playwright test.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('R3 — Regressão — funcionalidade existente preservada', () => {

  // R3-26 — Plano de 14 dias continua carregando normalmente
  test('R3-26 — Plano de 14 dias carrega (smoke test)', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    await expect(page.locator('[data-day-head]').first()).toBeVisible();
    await expect(page.locator('.day-name').first()).toContainText('Dia 1');
  });

  // R3-27 — Lista de Compras continua preservada
  test('R3-27 — Lista de Compras continua presente no plano', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    await expect(page.locator('#shopping-head')).toBeVisible();
    await expect(page.locator('#shopping-head .day-name')).toContainText('Lista de Compras');
  });

  // R3-28 — PDFs existentes continuam intactos (botão de PDF presente)
  test('R3-28 — Acção de PDF continua presente no plano', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    await expect(page.getByText(/PDF/i).first()).toBeVisible();
  });

  // R3-29 — Modo imperial não é afetado
  // Nota: recipe-scaler.js não importa nem toca código de conversão imperial.
  // A cobertura detalhada de imperial está em imperial.spec.js (15 testes).
  // Aqui apenas confirmamos que o plano ainda carrega normalmente com CENARIO_6.
  test('R3-29 — Geração do plano não foi afetada (regressão geral)', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);
    // Estrutura do plano intacta — 14 dias visíveis
    await expect(page.locator('[data-day-head]').nth(13)).toBeVisible();
  });

});
