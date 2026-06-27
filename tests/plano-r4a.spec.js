// @ts-check
'use strict';

/**
 * plano-r4a.spec.js — Sprint R4-A
 * =============================================================================
 * Valida o botão "Ver receitas" e o modal de seleção de receitas.
 *
 * IMPORTANTE:
 *  - Nenhum teste verifica substituição de refeição (não implementada nesta sprint).
 *  - Todos os testes confirmam que o plano, totais, localStorage e PDFs
 *    ficam intactos após interagir com o botão e o modal.
 * =============================================================================
 */

const { test, expect } = require('@playwright/test');
const { injectState, gotoResultados, gotoPlano } = require('./helpers/inject-state');
const { CENARIO_6 } = require('./fixtures/scenarios');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: navega até ao plano com estado injectado
// ─────────────────────────────────────────────────────────────────────────────
async function irParaPlano(page) {
  await injectState(page, CENARIO_6);
  await gotoResultados(page);
  await gotoPlano(page);
}

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 1: Botão "Ver receitas" no card de refeição
// ─────────────────────────────────────────────────────────────────────────────

test.describe('R4-A — Botão "Ver receitas"', () => {

  test('R4-A-01 — Botão "Ver receitas" existe no Dia 1 Refeição 1', async ({ page }) => {
    await irParaPlano(page);
    await expect(
      page.locator('[data-testid="use-recipe-button"]').first()
    ).toBeVisible();
  });

  test('R4-A-02 — Botão mostra texto "Ver receitas"', async ({ page }) => {
    await irParaPlano(page);
    await expect(
      page.locator('[data-testid="use-recipe-button"]').first()
    ).toContainText('Ver receitas');
  });

  test('R4-A-03 — Botão tem classe no-print (não aparece em PDF/print)', async ({ page }) => {
    await irParaPlano(page);
    const btn = page.locator('[data-testid="use-recipe-button"]').first();
    const cls = await btn.getAttribute('class');
    expect(cls).toContain('no-print');
  });

  test('R4-A-04 — Botão não aparece na área de print', async ({ page }) => {
    await irParaPlano(page);
    // O botão pai (.ing-add-row) e o próprio botão têm no-print
    // Verificamos que o botão NÃO tem display diferente de none na media print
    // (validação indireta: confirmar que a classe está presente)
    const btns = await page.locator('[data-testid="use-recipe-button"]').count();
    expect(btns).toBeGreaterThan(0);
    // Confirma que todos têm no-print
    const all = await page.locator('[data-testid="use-recipe-button"]').all();
    for (const btn of all) {
      const cls = await btn.getAttribute('class');
      expect(cls).toContain('no-print');
    }
  });

  test('R4-A-05 — Existe um botão "Ver receitas" por card de refeição', async ({ page }) => {
    await irParaPlano(page);
    // No Dia 1 (aberto por default), existem N refeições, cada uma com 1 botão
    const btns = await page.locator('#day-body-0 [data-testid="use-recipe-button"]').count();
    expect(btns).toBeGreaterThan(0);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 2: Modal de receitas
// ─────────────────────────────────────────────────────────────────────────────

test.describe('R4-A — Modal de receitas', () => {

  test('R4-A-06 — Clicar em "Ver receitas" abre um modal', async ({ page }) => {
    await irParaPlano(page);
    await page.locator('[data-testid="use-recipe-button"]').first().click();
    await expect(page.locator('.modal')).toBeVisible();
  });

  test('R4-A-07 — Modal mostra título "Receitas para esta refeição"', async ({ page }) => {
    await irParaPlano(page);
    await page.locator('[data-testid="use-recipe-button"]').first().click();
    await expect(page.locator('.modal-title')).toContainText('Receitas para esta refeição');
  });

  test('R4-A-08 — Modal lista pelo menos 1 receita', async ({ page }) => {
    await irParaPlano(page);
    await page.locator('[data-testid="use-recipe-button"]').first().click();
    // Compatíveis ou incompatíveis — pelo menos 1 receita visível
    const items = await page.locator('.recipe-modal-item').count();
    expect(items).toBeGreaterThan(0);
  });

  test('R4-A-09 — Modal NÃO tem botão "Aplicar" (substituição não implementada)', async ({ page }) => {
    await irParaPlano(page);
    await page.locator('[data-testid="use-recipe-button"]').first().click();
    // Dentro do modal não deve existir botão com texto que implique aplicação
    const modal = page.locator('.modal');
    await expect(modal.getByRole('button', { name: /aplicar/i })).not.toBeVisible();
    await expect(modal.getByRole('button', { name: /substituir refeição/i })).not.toBeVisible();
    await expect(modal.getByRole('button', { name: /confirmar/i })).not.toBeVisible();
  });

  test('R4-A-10 — Modal tem botão Fechar', async ({ page }) => {
    await irParaPlano(page);
    await page.locator('[data-testid="use-recipe-button"]').first().click();
    await expect(page.locator('.modal .btn-secondary').filter({ hasText: 'Fechar' })).toBeVisible();
  });

  test('R4-A-11 — Fechar modal fecha o modal sem alterar nada', async ({ page }) => {
    await irParaPlano(page);
    await page.locator('[data-testid="use-recipe-button"]').first().click();
    await expect(page.locator('.modal')).toBeVisible();
    await page.locator('.modal .btn-secondary').filter({ hasText: 'Fechar' }).click();
    await expect(page.locator('.modal')).not.toBeVisible();
  });

  test('R4-A-12 — Fechar via botão ✕ (modal-close) fecha o modal', async ({ page }) => {
    await irParaPlano(page);
    await page.locator('[data-testid="use-recipe-button"]').first().click();
    await page.locator('[data-modal-close]').first().click();
    await expect(page.locator('.modal')).not.toBeVisible();
  });

  test('R4-A-13 — Receitas compatíveis têm badge "Compatível"', async ({ page }) => {
    await irParaPlano(page);
    await page.locator('[data-testid="use-recipe-button"]').first().click();
    // Pelo menos 1 item deve ter o badge de compatibilidade
    const compat = page.locator('.recipe-modal-compat');
    const n = await compat.count();
    // Pode ser 0 se nenhuma receita for compatível com o slot — nesse caso verifica mensagem
    if (n === 0) {
      await expect(page.locator('.recipe-modal-empty')).toBeVisible();
    } else {
      await expect(compat.first()).toBeVisible();
    }
  });

  test('R4-A-14 — Cada item de receita mostra nome e descrição', async ({ page }) => {
    await irParaPlano(page);
    await page.locator('[data-testid="use-recipe-button"]').first().click();
    const items = page.locator('.recipe-modal-item');
    const n = await items.count();
    if (n > 0) {
      // Primeiro item tem nome e descrição
      await expect(items.first().locator('.recipe-modal-name')).toBeVisible();
      await expect(items.first().locator('.recipe-modal-desc')).toBeVisible();
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 3: Plano preservado — nada alterado ao interagir com o modal
// ─────────────────────────────────────────────────────────────────────────────

test.describe('R4-A — Plano preservado após interação', () => {

  test('R4-A-15 — Totais do Dia 1 não mudam após abrir/fechar o modal', async ({ page }) => {
    await irParaPlano(page);
    // Captura total original do Dia 1
    const totalBefore = await page.locator('[data-testid="day-current-totals"]').count();
    // dayComp só aparece quando há alterações — sem alterações não deve existir
    // Verificamos apenas que o total do dia está presente e não muda
    const daySum = await page.locator('.day-summary').first().textContent();

    await page.locator('[data-testid="use-recipe-button"]').first().click();
    await page.locator('[data-modal-close]').first().click();

    const daySumAfter = await page.locator('.day-summary').first().textContent();
    expect(daySumAfter).toBe(daySum);
    // Bloco de comparação não aparece (sem alterações ao plano)
    await expect(page.locator('[data-testid="day-comp-block"]').first()).not.toBeVisible();
  });

  test('R4-A-16 — Lista de Compras continua preservada', async ({ page }) => {
    await irParaPlano(page);
    await page.locator('[data-testid="use-recipe-button"]').first().click();
    await page.locator('[data-modal-close]').first().click();

    await expect(page.locator('#shopping-head')).toBeVisible();
    await expect(page.locator('#shopping-head .day-name')).toContainText('Lista de Compras');
  });

  test('R4-A-17 — localStorage não é alterado ao abrir o modal', async ({ page }) => {
    await irParaPlano(page);
    // Captura estado de hg:recipe_meals e hg:subs antes
    const before = await page.evaluate(() => ({
      recipeMeals: localStorage.getItem('hg:recipe_meals'),
      subs: localStorage.getItem('hg:subs'),
    }));

    await page.locator('[data-testid="use-recipe-button"]').first().click();
    await page.locator('[data-modal-close]').first().click();

    const after = await page.evaluate(() => ({
      recipeMeals: localStorage.getItem('hg:recipe_meals'),
      subs: localStorage.getItem('hg:subs'),
    }));

    // hg:recipe_meals não deve ter sido criado
    expect(after.recipeMeals).toBe(before.recipeMeals);
    // hg:subs não deve ter mudado
    expect(after.subs).toBe(before.subs);
  });

  test('R4-A-18 — Ingredientes da Refeição 1 do Dia 1 não mudam após interação', async ({ page }) => {
    await irParaPlano(page);
    const ingsBefore = await page.locator('#day-body-0 .meal-card').first()
      .locator('.ingredient-name').allTextContents();

    await page.locator('[data-testid="use-recipe-button"]').first().click();
    await page.locator('[data-modal-close]').first().click();

    const ingsAfter = await page.locator('#day-body-0 .meal-card').first()
      .locator('.ingredient-name').allTextContents();

    expect(ingsAfter).toEqual(ingsBefore);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo 4: Mobile 390px
// ─────────────────────────────────────────────────────────────────────────────

test.describe('R4-A — Mobile 390px', () => {

  test('R4-A-19 — Mobile: botão "Ver receitas" visível sem overflow horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await irParaPlano(page);
    await expect(
      page.locator('[data-testid="use-recipe-button"]').first()
    ).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test('R4-A-20 — Mobile: modal abre e é utilizável', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await irParaPlano(page);
    await page.locator('[data-testid="use-recipe-button"]').first().click();
    await expect(page.locator('.modal')).toBeVisible();
    await expect(page.locator('.modal-title')).toBeVisible();
    // Modal fecha normalmente
    await page.locator('[data-modal-close]').first().click();
    await expect(page.locator('.modal')).not.toBeVisible();
  });

});
