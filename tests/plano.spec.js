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
const { injectState, gotoResultados, gotoPlano } = require('./helpers/inject-state');
const { CENARIO_6, CENARIO_7 } = require('./fixtures/scenarios');

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
