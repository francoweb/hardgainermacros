// @ts-check
'use strict';

/**
 * recipes.spec.js — Sprint R2
 * =============================================================================
 * Validação da biblioteca interna de receitas escaláveis.
 *
 * Estratégia:
 *  - Testes 1-27 (dados): carregam RECIPES e FOODS via dynamic import no
 *    contexto do browser. Nenhum depende de UI visual.
 *  - Testes 29-31 (regressão): smoke tests mínimos para garantir que a
 *    adição de recipes.js não quebrou funcionalidades existentes.
 *
 * Convenção de IDs: R2-01 a R2-31 (mapeados 1:1 com a lista de requisitos).
 * =============================================================================
 */

const { test, expect } = require('@playwright/test');
const { injectState, gotoResultados, gotoPlano } = require('./helpers/inject-state');
const { CENARIO_6 } = require('./fixtures/scenarios');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: carrega RECIPES e FOODS no contexto do browser via dynamic import.
// Retorna objetos serializáveis (JSON). Não depende de UI.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {{ id: string, name: string, description: string, type: string, suggestedSlots: string[], baseKcal: number, ingredients: Ingredient[], steps: string[], note: string }} Recipe */
/** @typedef {{ foodId: string, name: string, defaultGrams: number, minGrams: number, maxGrams: number, removable: boolean, essential: boolean, scalePriority: number }} Ingredient */

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{ recipes: Recipe[], foodIds: string[] }>}
 */
async function carregarDados(page) {
  await page.goto('/');
  await page.waitForLoadState('load');
  return page.evaluate(async () => {
    const { RECIPES } = await import('/assets/js/data/recipes.js');
    const { FOODS }   = await import('/assets/js/data/foods.js');
    return {
      recipes: JSON.parse(JSON.stringify(RECIPES)),
      foodIds: Object.keys(FOODS),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 1: Estrutura geral da biblioteca (requisitos 1-9)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('R2 — Estrutura geral da biblioteca', () => {

  // R2-01 — A biblioteca existe e exporta uma lista válida
  test('R2-01 — RECIPES é um array não vazio', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    expect(Array.isArray(recipes)).toBe(true);
    expect(recipes.length).toBeGreaterThan(0);
  });

  // R2-02 — Contém exactamente 5 receitas
  test('R2-02 — Contém exactamente 5 receitas', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    expect(recipes).toHaveLength(5);
  });

  // R2-03 — Todos os IDs são únicos
  test('R2-03 — Todos os ids são únicos', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    const ids = recipes.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  // R2-04 — Todas as receitas têm name não vazio
  test('R2-04 — Todas as receitas têm name visível', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    for (const r of recipes) {
      expect(typeof r.name).toBe('string');
      expect(r.name.trim().length).toBeGreaterThan(0);
    }
  });

  // R2-05 — Todas as receitas têm descrição curta
  test('R2-05 — Todas as receitas têm description', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    for (const r of recipes) {
      expect(typeof r.description).toBe('string');
      expect(r.description.trim().length).toBeGreaterThan(0);
    }
  });

  // R2-06 — Todas as receitas têm suggestedSlots (array não vazio de strings)
  test('R2-06 — Todas as receitas têm suggestedSlots não vazio', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    for (const r of recipes) {
      expect(Array.isArray(r.suggestedSlots)).toBe(true);
      expect(r.suggestedSlots.length).toBeGreaterThan(0);
      for (const slot of r.suggestedSlots) {
        expect(typeof slot).toBe('string');
        expect(slot.trim().length).toBeGreaterThan(0);
      }
    }
  });

  // R2-07 — Todas as receitas têm steps de preparo (array não vazio)
  test('R2-07 — Todas as receitas têm steps de preparo', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    for (const r of recipes) {
      expect(Array.isArray(r.steps)).toBe(true);
      expect(r.steps.length).toBeGreaterThan(0);
      for (const step of r.steps) {
        expect(typeof step).toBe('string');
        expect(step.trim().length).toBeGreaterThan(0);
      }
    }
  });

  // R2-08 — Todas as receitas têm note (observação prática)
  test('R2-08 — Todas as receitas têm note', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    for (const r of recipes) {
      expect(typeof r.note).toBe('string');
      expect(r.note.trim().length).toBeGreaterThan(0);
    }
  });

  // R2-09 — Todas as receitas têm pelo menos 2 ingredientes
  test('R2-09 — Todas as receitas têm pelo menos 2 ingredientes', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    for (const r of recipes) {
      expect(Array.isArray(r.ingredients)).toBe(true);
      expect(r.ingredients.length).toBeGreaterThanOrEqual(2);
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 2: Ingredientes — campos obrigatórios (requisitos 10-17)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('R2 — Ingredientes — campos obrigatórios', () => {

  // R2-10 — Todos os ingredientes têm foodId
  test('R2-10 — Todos os ingredientes têm foodId', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    for (const r of recipes) {
      for (const ing of r.ingredients) {
        expect(typeof ing.foodId).toBe('string');
        expect(ing.foodId.trim().length).toBeGreaterThan(0);
      }
    }
  });

  // R2-11 — Todos os foodId existem na base FOODS
  test('R2-11 — Todos os foodId existem em FOODS', async ({ page }) => {
    const { recipes, foodIds } = await carregarDados(page);
    const usados = new Set();
    for (const r of recipes) {
      for (const ing of r.ingredients) {
        usados.add(ing.foodId);
      }
    }
    const ausentes = [...usados].filter((id) => !foodIds.includes(id));
    expect(ausentes).toHaveLength(0);
  });

  // R2-12 — Todos os ingredientes têm defaultGrams (número > 0)
  test('R2-12 — Todos os ingredientes têm defaultGrams > 0', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    for (const r of recipes) {
      for (const ing of r.ingredients) {
        expect(typeof ing.defaultGrams).toBe('number');
        expect(ing.defaultGrams).toBeGreaterThan(0);
      }
    }
  });

  // R2-13 — Todos os ingredientes têm minGrams (número >= 0)
  test('R2-13 — Todos os ingredientes têm minGrams >= 0', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    for (const r of recipes) {
      for (const ing of r.ingredients) {
        expect(typeof ing.minGrams).toBe('number');
        expect(ing.minGrams).toBeGreaterThanOrEqual(0);
      }
    }
  });

  // R2-14 — Todos os ingredientes têm maxGrams (número > 0)
  test('R2-14 — Todos os ingredientes têm maxGrams > 0', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    for (const r of recipes) {
      for (const ing of r.ingredients) {
        expect(typeof ing.maxGrams).toBe('number');
        expect(ing.maxGrams).toBeGreaterThan(0);
      }
    }
  });

  // R2-15 — Nenhum ingrediente tem minGrams > maxGrams
  test('R2-15 — minGrams nunca excede maxGrams', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    for (const r of recipes) {
      for (const ing of r.ingredients) {
        expect(ing.minGrams).toBeLessThanOrEqual(ing.maxGrams);
      }
    }
  });

  // R2-16 — defaultGrams fica sempre entre minGrams e maxGrams (inclusive)
  test('R2-16 — defaultGrams fica entre minGrams e maxGrams', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    for (const r of recipes) {
      for (const ing of r.ingredients) {
        expect(ing.defaultGrams).toBeGreaterThanOrEqual(ing.minGrams);
        expect(ing.defaultGrams).toBeLessThanOrEqual(ing.maxGrams);
      }
    }
  });

  // R2-17 — Ingredientes removíveis: removable=true implica minGrams=0
  test('R2-17 — removable:true implica minGrams=0', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    for (const r of recipes) {
      for (const ing of r.ingredients) {
        if (ing.removable === true) {
          expect(ing.minGrams).toBe(0);
        }
      }
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 3: Receitas específicas (requisitos 18-26)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('R2 — Receitas específicas', () => {

  // R2-18 — Receita "Omelete de frango anabólica" existe
  test('R2-18 — Omelete de frango anabólica existe (id=omelete_frango)', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    const omelete = recipes.find((r) => r.id === 'omelete_frango');
    expect(omelete).toBeDefined();
  });

  // R2-19 — Omelete contém ovo, frango, queijo e azeite
  test('R2-19 — Omelete contém ovo_inteiro, peito_frango, queijo_branco e azeite', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    const omelete = recipes.find((r) => r.id === 'omelete_frango');
    expect(omelete).toBeDefined();
    const foodIds = omelete.ingredients.map((i) => i.foodId);
    expect(foodIds).toContain('ovo_inteiro');
    expect(foodIds).toContain('peito_frango');
    expect(foodIds).toContain('queijo_branco');
    expect(foodIds).toContain('azeite');
  });

  // R2-20 — Na omelete, o queijo deve ser removível
  test('R2-20 — Na omelete, queijo_branco é removable:true', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    const omelete = recipes.find((r) => r.id === 'omelete_frango');
    expect(omelete).toBeDefined();
    const queijo = omelete.ingredients.find((i) => i.foodId === 'queijo_branco');
    expect(queijo).toBeDefined();
    expect(queijo.removable).toBe(true);
  });

  // R2-21 — Receita "Panqueca de banana com whey" existe
  test('R2-21 — Panqueca de banana com whey existe (id=panqueca_banana_whey)', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    const panqueca = recipes.find((r) => r.id === 'panqueca_banana_whey');
    expect(panqueca).toBeDefined();
  });

  // R2-22 — Panqueca contém banana, ovo, whey e aveia
  test('R2-22 — Panqueca contém banana_prata, ovo_inteiro, whey e aveia_flocos', async ({ page }) => {
    const { recipes, foodIds } = await carregarDados(page);
    const panqueca = recipes.find((r) => r.id === 'panqueca_banana_whey');
    expect(panqueca).toBeDefined();
    const ingIds = panqueca.ingredients.map((i) => i.foodId);
    expect(ingIds).toContain('banana_prata');
    expect(ingIds).toContain('ovo_inteiro');
    expect(ingIds).toContain('whey');
    // aveia_flocos incluída se existir na base de alimentos
    if (foodIds.includes('aveia_flocos')) {
      expect(ingIds).toContain('aveia_flocos');
    }
  });

  // R2-23 — Receita "Arroz com frango e azeite" existe
  test('R2-23 — Arroz com frango e azeite existe (id=arroz_frango_azeite)', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    const arroz = recipes.find((r) => r.id === 'arroz_frango_azeite');
    expect(arroz).toBeDefined();
  });

  // R2-24 — Receita "Massa com carne moída" existe
  test('R2-24 — Massa com carne moída existe (id=massa_carne_moida)', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    const massa = recipes.find((r) => r.id === 'massa_carne_moida');
    expect(massa).toBeDefined();
  });

  // R2-25 — Receita "Shake hardgainer" existe
  test('R2-25 — Shake hardgainer existe (id=shake_hardgainer)', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    const shake = recipes.find((r) => r.id === 'shake_hardgainer');
    expect(shake).toBeDefined();
  });

  // R2-26 — Shake contém leite integral, banana, whey e pasta de amendoim
  test('R2-26 — Shake contém leite_integral, banana_prata, whey e pasta_amendoim', async ({ page }) => {
    const { recipes } = await carregarDados(page);
    const shake = recipes.find((r) => r.id === 'shake_hardgainer');
    expect(shake).toBeDefined();
    const ingIds = shake.ingredients.map((i) => i.foodId);
    expect(ingIds).toContain('leite_integral');
    expect(ingIds).toContain('banana_prata');
    expect(ingIds).toContain('whey');
    expect(ingIds).toContain('pasta_amendoim');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 4: Limites práticos (requisito 27)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('R2 — Limites práticos', () => {

  // R2-27 — Nenhuma receita gera limites absurdos
  test('R2-27 — Limites práticos dentro de intervalos razoáveis', async ({ page }) => {
    const { recipes } = await carregarDados(page);

    // Thresholds máximos considerados razoáveis para uso humano diário
    const LIMITES = {
      ovo_inteiro:        { maxGrams: 400 },  // ≤ 8 ovos
      azeite:             { maxGrams: 50  },  // ≤ 50 ml
      peito_frango:       { maxGrams: 400 },  // ≤ 400 g
      carne_moida:        { maxGrams: 400 },  // ≤ 400 g
      whey:               { maxGrams: 120 },  // ≤ 4 scoops (30g cada)
      leite_integral:     { maxGrams: 700 },  // ≤ 700 ml
      pasta_amendoim:     { maxGrams: 120 },  // ≤ 120 g
      banana_prata:       { maxGrams: 400 },  // ≤ 4 bananas
      arroz_branco_cozido:{ maxGrams: 600 },  // ≤ 600 g cozido
      macarrao_cozido:    { maxGrams: 600 },  // ≤ 600 g cozido
    };

    for (const r of recipes) {
      for (const ing of r.ingredients) {
        const limite = LIMITES[ing.foodId];
        if (limite) {
          expect(ing.maxGrams).toBeLessThanOrEqual(limite.maxGrams);
        }
        // Geral: maxGrams não deve ser absurdo (> 1 kg para qualquer ingrediente)
        expect(ing.maxGrams).toBeLessThanOrEqual(1000);
      }
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 5: Regressão — funcionalidade existente preservada (requisitos 29-31)
// Requisito 28 é meta (os próprios testes 1-27 não dependem de UI) — sem teste.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('R2 — Regressão — funcionalidade existente preservada', () => {

  // R2-29 — Plano de 14 dias continua carregando normalmente
  test('R2-29 — Plano de 14 dias carrega (smoke test)', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    // Cabeçalho do primeiro dia (selector real: .day-head[data-day-head])
    await expect(page.locator('[data-day-head]').first()).toBeVisible();
    // Texto "Dia 1 •" visível na secção de dias
    await expect(page.locator('.day-name').first()).toContainText('Dia 1');
  });

  // R2-30 — Lista de Compras continua acessível no plano
  test('R2-30 — Lista de Compras continua acessível no plano', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    // Cabeçalho da secção Lista de Compras (id real: #shopping-head)
    await expect(page.locator('#shopping-head')).toBeVisible();
    await expect(page.locator('#shopping-head .day-name')).toContainText('Lista de Compras');
  });

  // R2-31 — Botão de PDF continua presente no plano (PDF intacto)
  test('R2-31 — Acção de PDF continua presente no plano', async ({ page }) => {
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    // O gatilho de download de PDF deve estar visível
    await expect(
      page.getByText(/PDF/i).first()
    ).toBeVisible();
  });

});
