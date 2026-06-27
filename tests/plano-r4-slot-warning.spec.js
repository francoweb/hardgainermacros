// @ts-check
'use strict';

/**
 * plano-r4-slot-warning.spec.js
 * =============================================================================
 * Valida que avisos de slot incompatível usam linguagem amigável em português,
 * sem IDs técnicos internos (breakfast, lunch, shake_afternoon, underscores).
 *
 * Contexto: O recipe-scaler gera avisos técnicos (ex: 'Slot "breakfast" não
 * está nos slots sugeridos...') que são humanizados em plano-14-dias.js antes
 * de serem exibidos ao utilizador.
 * =============================================================================
 */

const { test, expect } = require('@playwright/test');
const { injectState, gotoResultados, gotoPlano } = require('./helpers/inject-state');
const { CENARIO_6 } = require('./fixtures/scenarios');

async function irParaPlano(page) {
  await injectState(page, CENARIO_6);
  await gotoResultados(page);
  await gotoPlano(page);
}

/** Abre o modal de receitas no Dia 1 Refeição 1 (café da manhã). */
async function abrirModal(page) {
  await page.locator('[data-testid="use-recipe-button"]').first().click();
  await expect(page.locator('.modal')).toBeVisible();
}

/**
 * Clica numa receita INCOMPATÍVEL com o slot actual (shake no café da manhã).
 * As receitas incompatíveis ficam na secção "Outras receitas da biblioteca"
 * e são os últimos itens da lista.
 */
async function clicarReceitaIncompativel(page) {
  const items = page.locator('.recipe-modal-item');
  const n = await items.count();
  // O último item é garantidamente incompatível (shake no slot breakfast)
  await items.nth(n - 1).click();
  await expect(page.locator('[data-testid="recipe-preview"]')).toBeVisible();
}

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 1: Aviso de slot incompatível — formato humano
// ─────────────────────────────────────────────────────────────────────────────

test.describe('R4 — Aviso de slot em português', () => {

  test('SW-01 — Aviso de slot incompatível usa linguagem em português', async ({ page }) => {
    await irParaPlano(page);
    await abrirModal(page);
    await clicarReceitaIncompativel(page);

    const warnings = page.locator('[data-testid="recipe-preview-warnings"]');
    await expect(warnings).toBeVisible();

    const text = await warnings.textContent();
    // Deve conter linguagem amigável em português
    expect(text).toMatch(/não é das mais indicadas|costuma encaixar|indicada para/i);
  });

  test('SW-02 — Aviso não contém IDs técnicos de slot (breakfast, lunch, etc.)', async ({ page }) => {
    await irParaPlano(page);
    await abrirModal(page);
    await clicarReceitaIncompativel(page);

    const warnings = page.locator('[data-testid="recipe-preview-warnings"]');
    await expect(warnings).toBeVisible();

    const text = (await warnings.textContent()) || '';

    // Não deve conter IDs técnicos literais
    expect(text).not.toContain('breakfast');
    expect(text).not.toContain('shake_morning');
    expect(text).not.toContain('shake_afternoon');
    expect(text).not.toContain('shake_night');
    expect(text).not.toContain('lunch');
    expect(text).not.toContain('dinner');
  });

  test('SW-03 — Aviso não contém underscores (sem IDs internos visíveis)', async ({ page }) => {
    await irParaPlano(page);
    await abrirModal(page);
    await clicarReceitaIncompativel(page);

    const warnings = page.locator('[data-testid="recipe-preview-warnings"]');
    await expect(warnings).toBeVisible();

    const text = (await warnings.textContent()) || '';
    expect(text).not.toContain('_');
  });

  test('SW-04 — Aviso não começa com "Slot" (sem formato técnico)', async ({ page }) => {
    await irParaPlano(page);
    await abrirModal(page);
    await clicarReceitaIncompativel(page);

    const warnings = page.locator('[data-testid="recipe-preview-warnings"]');
    await expect(warnings).toBeVisible();

    const text = (await warnings.textContent()) || '';
    // O aviso técnico original começa com 'Slot "' — não deve aparecer
    expect(text).not.toMatch(/^Slot "/);
    expect(text).not.toContain('Slot "');
  });

  test('SW-05 — Aviso menciona nomes legíveis dos slots sugeridos', async ({ page }) => {
    await irParaPlano(page);
    await abrirModal(page);
    await clicarReceitaIncompativel(page);

    const warnings = page.locator('[data-testid="recipe-preview-warnings"]');
    await expect(warnings).toBeVisible();

    const text = (await warnings.textContent()) || '';
    // Deve mencionar pelo menos um nome legível de slot
    const legibleSlots = ['café da manhã', 'almoço', 'jantar', 'shake', 'lanche', 'noturno', 'tarde', 'manhã'];
    expect(legibleSlots.some(s => text.toLowerCase().includes(s))).toBe(true);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 2: Receita fora do slot continua aplicável
// ─────────────────────────────────────────────────────────────────────────────

test.describe('R4 — Receita fora do slot é aplicável (sem bloqueio)', () => {

  test('SW-06 — Botão "Aplicar receita" visível mesmo em receita fora do slot', async ({ page }) => {
    await irParaPlano(page);
    await abrirModal(page);
    await clicarReceitaIncompativel(page);

    // O botão deve estar visível — aviso não bloqueia
    await expect(page.locator('[data-testid="apply-recipe-button"]')).toBeVisible();
  });

  test('SW-07 — Receita fora do slot pode ser aplicada', async ({ page }) => {
    await irParaPlano(page);
    await abrirModal(page);
    await clicarReceitaIncompativel(page);

    // Captura o último item para saber o nome da receita
    const items = page.locator('.recipe-modal-item');
    const n = await items.count();
    const recipeName = await items.nth(n - 1).locator('.recipe-modal-name').textContent();

    // Aplica
    await page.locator('[data-testid="apply-recipe-button"]').click();
    await expect(page.locator('.modal')).not.toBeVisible({ timeout: 5000 });

    // Refeição substitui com o nome da receita incompatível
    const mealCardName = await page.locator('#day-body-0 .meal-card').first()
      .locator('.meal-card-name').textContent();
    expect(mealCardName).toContain(recipeName?.trim());
  });

  test('SW-08 — Receita compatível com o slot não mostra aviso de slot', async ({ page }) => {
    await irParaPlano(page);
    await abrirModal(page);

    // Clicar na PRIMEIRA receita (compatível com o slot)
    await page.locator('.recipe-modal-item').first().click();
    await expect(page.locator('[data-testid="recipe-preview"]')).toBeVisible();

    // Não deve existir aviso de slot
    const warningsPanel = page.locator('[data-testid="recipe-preview-warnings"]');
    const warningsVisible = await warningsPanel.isVisible();
    if (warningsVisible) {
      const text = (await warningsPanel.textContent()) || '';
      // Se há warnings, nenhum deve ser de slot incompatível
      expect(text).not.toMatch(/não é das mais indicadas/i);
      expect(text).not.toMatch(/costuma encaixar melhor/i);
    }
    // (Se não há warnings, o teste passa automaticamente)
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 3: Regressão — recipe-scaler original inalterado
// ─────────────────────────────────────────────────────────────────────────────

test.describe('R4 — recipe-scaler inalterado (aviso técnico permanece na API)', () => {

  test('SW-09 — recipe-scaler ainda gera aviso técnico internamente (API intacta)', async ({ page }) => {
    // O scaler gera aviso técnico — é a camada de display que humaniza
    await page.goto('/');
    await page.waitForLoadState('load');
    const result = await page.evaluate(async () => {
      const { RECIPES } = await import('/assets/js/data/recipes.js');
      const { scaleRecipe } = await import('/assets/js/modules/recipe-scaler.js');
      const shake = RECIPES.find(r => r.id === 'shake_hardgainer');
      return scaleRecipe(shake, { kcal: 700, prot: 45, carb: 80, fat: 20 }, { slot: 'breakfast' });
    });
    // O scaler continua a gerar o aviso técnico na sua API
    expect(result.slotCompatible).toBe(false);
    expect(result.warnings.some(w => w.includes('breakfast'))).toBe(true);
  });

});
