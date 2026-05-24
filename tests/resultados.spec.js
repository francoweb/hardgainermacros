// @ts-check
'use strict';

/**
 * resultados.spec.js
 *
 * Testes E2E para a página /resultados.
 * Cobrem os 5 cenários validados manualmente nas Etapas 3E-A e seguintes.
 *
 * Estratégia: injeção de estado (Strategy B)
 *   — Injeta localStorage + sessionStorage antes de navegar.
 *   — Não preenche formulários. Mais rápido e isolado.
 *   — Os tempos são calculados em runtime por rebuildTimesAroundTraining()
 *     a partir de sleepEndTime/sleepStartTime do fixture.
 */

const { test, expect } = require('@playwright/test');
const { injectState, gotoResultados } = require('./helpers/inject-state');
const {
  CENARIO_1,
  CENARIO_2,
  CENARIO_3,
  CENARIO_4,
  CENARIO_5,
} = require('./fixtures/scenarios');

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Ordem da primeira refeição (Etapa 3E-A)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Resultados — primeira refeição no topo', () => {

  test('C1 — Wake 07:00 / 6 refeições / Híbrido / sem treino: Café da Manhã 07:15 primeiro', async ({ page }) => {
    await injectState(page, CENARIO_1);
    await gotoResultados(page);

    // Primeira refeição deve ser "Café da Manhã"
    await expect(page.locator('.meal-name').first())
      .toContainText('Café da Manhã');

    // Primeiro horário deve ser 07:15
    await expect(page.locator('.meal-time').first())
      .toHaveText('07:15');

    // Total kcal (2660 — sem separador em headless Chromium)
    await expect(
      page.locator('.macro-val').filter({ hasText: 'kcal/dia' })
    ).toContainText('2660');
  });

  test('C2 — Wake 08:00 / 6 refeições / Híbrido / sem treino: Café da Manhã 08:15 primeiro', async ({ page }) => {
    await injectState(page, CENARIO_2);
    await gotoResultados(page);

    await expect(page.locator('.meal-name').first())
      .toContainText('Café da Manhã');

    await expect(page.locator('.meal-time').first())
      .toHaveText('08:15');

    await expect(
      page.locator('.macro-val').filter({ hasText: 'kcal/dia' })
    ).toContainText('2660');
  });

  test('C3 — Wake 09:00 / 6 refeições / Híbrido / sem treino: Café da Manhã 09:15 primeiro', async ({ page }) => {
    await injectState(page, CENARIO_3);
    await gotoResultados(page);

    await expect(page.locator('.meal-name').first())
      .toContainText('Café da Manhã');

    await expect(page.locator('.meal-time').first())
      .toHaveText('09:15');

    await expect(
      page.locator('.macro-val').filter({ hasText: 'kcal/dia' })
    ).toContainText('2660');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Labels sem treino (Etapa 3E-A + fix Refeição Pré-Treino)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Resultados — labels sem treino ativo', () => {

  test('C4 — Wake 07:00 / 7 refeições / Sólidas / sem treino: sem "Refeição Pré-Treino", aparece "Lanche da Tarde" às 16:45', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);

    // Label proibido: nunca deve aparecer sem treino ativo
    await expect(page.getByText('Refeição Pré-Treino'))
      .not.toBeVisible();

    // Label correto pós-fix: segunda "Refeição da Tarde" → "Lanche da Tarde"
    await expect(page.getByText('Lanche da Tarde').first())
      .toBeVisible();

    // Horário do "Lanche da Tarde" deve ser 16:45
    // (5.º slot de 7 com wake=07:00, step=142.5 → roundQ(1005) = 16:45)
    await expect(page.getByText('16:45').first())
      .toBeVisible();

    // Total kcal preservado
    await expect(
      page.locator('.macro-val').filter({ hasText: 'kcal/dia' })
    ).toContainText('2660');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Cenários com treino (regressão — comportamento não deve mudar)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Resultados — cenário com treino ativo', () => {

  test('C5 — Wake 07:00 / treino 16:00–17:30 / 7 refeições / Sólidas: treino + pré/pós visíveis', async ({ page }) => {
    await injectState(page, CENARIO_5);
    await gotoResultados(page);

    // Bloco de treino visível com horário de início e fim
    await expect(
      page.locator('.meal-name').filter({ hasText: /^Treino/ })
    ).toBeVisible();

    // exact: true isola o div.meal-time "16:00" (exclui spans/tds "16:00 – 17:30")
    await expect(page.getByText('16:00', { exact: true }))
      .toBeVisible();

    // '17:30' só aparece dentro de "16:00 – 17:30", nunca standalone
    await expect(page.getByText(/17:30/).first())
      .toBeVisible();

    // Refeição antes do treino (pré-treino)
    await expect(page.getByText(/Pré-Treino/).first())
      .toBeVisible();

    // Refeição após o treino (pós-treino)
    await expect(page.getByText('Refeição Pós-Treino').first())
      .toBeVisible();

    // Total kcal preservado
    await expect(
      page.locator('.macro-val').filter({ hasText: 'kcal/dia' })
    ).toContainText('2660');
  });

});
