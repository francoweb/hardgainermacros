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
const { CENARIO_6, CENARIO_7, CENARIO_4 } = require('./fixtures/scenarios');

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

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: P1 — "Princípios das Receitas" condicional por estratégia
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Plano Alimentar — Princípios das Receitas condicional', () => {

  test('C-P1 — Estratégia Sólida: "Sistema Híbrido" ausente, texto de refeições sólidas visível', async ({ page }) => {
    await injectState(page, CENARIO_4); // strategy: 'solid'
    await gotoResultados(page);
    await gotoPlano(page);

    // "Sistema Híbrido" não deve aparecer na secção de Princípios das Receitas
    // FALHA antes do patch P1 — PASSA depois.
    await expect(page.getByText(/Sistema Híbrido/)).not.toBeVisible();

    // Texto de refeições sólidas deve estar visível
    await expect(page.getByText(/Todas as refeições são sólidas/).first())
      .toBeVisible();
  });

});

// C-P3 removido: botão "Personalizar" foi removido da interface.

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: F3 — Frutas/tubérculos sem fracções impráticas
// ─────────────────────────────────────────────────────────────────────────────
// Problema: "0.5 unidade M" para banana, batata, maçã, manga quando o slot
// tem menos kcal que a base do template. Causa: formatQty sem unidade P.
// Este teste deve FALHAR antes do patch F3 e PASSAR depois.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Plano Alimentar — F3: frutas/tubérculos sem fracções impráticas', () => {

  test('C-F3 — Plano de 14 dias: banana e batata não aparecem como "0.5 unidade"', async ({ page }) => {
    await injectState(page, CENARIO_4); // 7 refeições sólidas — activa templates com banana/batata
    await gotoResultados(page);
    await gotoPlano(page);

    // "0.5 unidade" não deve aparecer para nenhum ingrediente de fruta/tubérculo.
    // FALHA antes do patch F3 — PASSA depois.
    await expect(page.getByText(/0\.5 unidade/)).not.toBeVisible();

    // Plano carregou sem quebrar
    await expect(page.getByText('Lanche da Tarde').first()).toBeVisible();

    // Total kcal preservado (macros não alteradas)
    await expect(page.getByText('2660').first()).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: F2 — Coerência de ovos no plano (label vs. display)
// ─────────────────────────────────────────────────────────────────────────────
// Problema: scaleMeal usava label estático do template ("3 ovos inteiros") mesmo
// quando a escala produzia 2 ovos. practicalRound não snappava para múltiplo de 50.
// Este teste deve FALHAR antes do patch F2 e PASSAR depois.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Plano Alimentar — F2: coerência de ovos', () => {

  test('C-F2 — Ovos: label e display mostram a mesma quantidade', async ({ page }) => {
    await injectState(page, CENARIO_4); // 7 refeições sólidas — activa templates com ovos
    await gotoResultados(page);
    await gotoPlano(page);

    // Recolhe todos os pares (label, display) de linhas de ingredientes de ovos
    // e verifica que o número no label coincide com o número no display.
    const inconsistencies = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.ingredient-row, .ing-row, [data-food="ovo_inteiro"]'));
      const results = [];
      rows.forEach(row => {
        const labelEl = row.querySelector('.ing-label, .ingredient-label');
        const displayEl = row.querySelector('.ing-display, .ingredient-display, .ing-qty');
        if (!labelEl || !displayEl) return;
        const label = labelEl.textContent || '';
        const display = displayEl.textContent || '';
        if (!/ovo/i.test(label) && !/ovo/i.test(display)) return;
        // extrai número do label e do display
        const numLabel  = (label.match(/\d+/) || [])[0];
        const numDisplay = (display.match(/\d+/) || [])[0];
        if (numLabel && numDisplay && numLabel !== numDisplay) {
          results.push({ label, display });
        }
      });
      return results;
    });

    // Não deve existir nenhum par inconsistente
    expect(inconsistencies).toHaveLength(0);

    // "ovos inteiros" deve aparecer no plano (texto do label dinâmico)
    const eggText = page.getByText(/ovos inteiros/i).first();
    // Se existir, deve ser visível (pode não haver ovos no Dia 1 — aceitável)
    const count = await page.getByText(/ovos inteiros/i).count();
    if (count > 0) {
      await expect(eggText).toBeVisible();
    }
  });

});
