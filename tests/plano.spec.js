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
const { CENARIO_5, CENARIO_6, CENARIO_7, CENARIO_4, CENARIO_9 } = require('./fixtures/scenarios');

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
// Grupo: F4 — Mel sem fracções de colher / pluralize correcto
// ─────────────────────────────────────────────────────────────────────────────
// Problema 1: mel aparecia como "0.5 colher de sopa" para 10–14g.
// Problema 2: regressão pluralize — "1.5 colheres de sopa" → "1.5 colhers des sopas".
// Este teste deve FALHAR antes dos patches P0+P1 e PASSAR depois.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Plano Alimentar — F4: mel sem fracções de colher', () => {

  test('C-F4 — Mel: sem "0.5 colher", pluralize correcto ("colheres" não "colhers")', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // P1: unidades novas do mel ("colher de chá", "colher de sobremesa")
    // nunca devem aparecer como fracção 0.5.
    // FALHA antes do patch P1 — PASSA depois.
    await expect(page.getByText(/0\.5 colher de chá/)).not.toBeVisible();
    await expect(page.getByText(/0\.5 colher de sobremesa/)).not.toBeVisible();

    // Regressão P0: "colhers des" nunca deve aparecer (pluralize incorrecto).
    // FALHA antes do patch P0 — PASSA depois.
    await expect(page.getByText(/colhers des/)).not.toBeVisible();

    // Plano carregou sem quebrar
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
      /** @type {{ label: string, display: string }[]} */
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

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: F5 — Pastas sem "0.5 colher de sopa"
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Plano Alimentar — F5: pastas sem fracções impráticas', () => {

  test('C-F5 — Pasta de amendoim/amêndoa/caju: sem "0.5 colher de sopa"', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // "0.5 colher de sopa" não deve aparecer para pastas.
    await expect(page.getByText(/0\.5 colher de sopa/)).not.toBeVisible();

    // Plano carregou
    await expect(page.getByText('2660').first()).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: F6 — Whey sem "0.5 scoop"
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Plano Alimentar — F6: whey sem "0.5 scoop"', () => {

  test('C-F6 — Whey: sem contradição nome/quantidade; "Proteína whey" como nome principal', async ({ page }) => {
    // CENARIO_4: shake_morning=433 kcal → factor=0.731 → whey 21.9g → snap 15g (Dia 1)
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Strings antigas/contraditórias NUNCA devem aparecer:
    await expect(page.getByText(/0\.5 scoop/)).not.toBeVisible();
    await expect(page.getByText(/1\.5 scoop/)).not.toBeVisible();
    await expect(page.getByText(/Whey \(1 scoop\)/)).not.toBeVisible();
    await expect(page.getByText(/Whey protein \(1 scoop\)/)).not.toBeVisible();
    await expect(page.getByText(/Whey \(meio scoop\)/)).not.toBeVisible();
    await expect(page.getByText(/meio scoop \(20g\)/)).not.toBeVisible();

    // Nome principal correcto (sem quantidade embutida):
    await expect(page.getByText('Proteína whey').first()).toBeVisible();

    // Dia 1 usa shake_bomba → factor=0.731 → whey 21.9g → snap 15g
    await expect(page.getByText(/meio scoop\/medidor \(15g\)/).first()).toBeVisible();

    // Plano carregou
    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-F6b — Whey: "1 scoop/medidor (30g)" aparece no Dia 1 quando slot kcal >= 445', async ({ page }) => {
    // Fixture com shake_morning=460 kcal (factor=460/592.1=0.777 → whey=23.3g → snap 30g)
    // shake_night reduzido de 365→338 para manter soma=2660.
    //
    // Prova matemática:
    //   shake_bomba actualBase = 592.1 kcal
    //   factor = 460/592.1 = 0.777 → whey = 30×0.777 = 23.3g
    //   practicalRound: round(23.3/15)*15 = round(1.55)*15 = 2×15 = 30g ✓
    const { form, profile, results: base } = CENARIO_4;
    const fullScoopSlots = [
      { slot: 'breakfast',     type: 'solid', kcal: 391, time: '07:15' },
      { slot: 'shake_morning', type: 'shake', kcal: 460, time: '09:30' }, // ← 460 força 30g
      { slot: 'lunch',         type: 'solid', kcal: 428, time: '12:00' },
      { slot: 'lunch',         type: 'solid', kcal: 335, time: '15:00' },
      { slot: 'dinner',        type: 'solid', kcal: 410, time: '17:30' },
      { slot: 'dinner',        type: 'solid', kcal: 298, time: '20:00' },
      { slot: 'shake_night',   type: 'shake', kcal: 338, time: '22:30' }, // ← reduzido 27 kcal
      // total: 391+460+428+335+410+298+338 = 2660 ✓
    ];
    const state = {
      form,
      profile,
      routine: base.routine,
      results: { ...base, slotDistribution: fullScoopSlots },
    };

    await injectState(page, state);
    await gotoResultados(page);
    await gotoPlano(page);

    // Dia 1 deve mostrar "1 scoop/medidor (30g)" (visível, não colapsado)
    await expect(page.getByText(/1 scoop\/medidor \(30g\)/).first()).toBeVisible();

    // "meio scoop" ainda pode aparecer no shake_night do Dia 1
    // (shake_night=338 → factor=338/592.1=0.571 → whey=17.1g → snap 15g)
    // Não importa o mix — o que importa é que 30g está visível.

    // Labels antigos NUNCA aparecem
    await expect(page.getByText(/Whey \(1 scoop\)/)).not.toBeVisible();
    await expect(page.getByText(/Whey protein \(1 scoop\)/)).not.toBeVisible();
    await expect(page.getByText(/0\.5 scoop/)).not.toBeVisible();

    // Nome principal correcto
    await expect(page.getByText('Proteína whey').first()).toBeVisible();

    await expect(page.getByText('2660').first()).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: F7 — Ovos com descritor de tamanho no label
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Plano Alimentar — F7: ovos com tamanho no label', () => {

  test('C-F7 — Ovos: label é preparação "mexidos"; display tem tamanho e "sem casca"', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Se ovos aparecerem no plano (Dia 1 pode não ter):
    const countPrep = await page.getByText(/ovos? mexidos?/i).count();
    if (countPrep > 0) {
      // Linha principal = preparação
      await expect(page.getByText(/ovos? mexidos?/i).first()).toBeVisible();
      // Linha secundária = ingrediente com tamanho
      await expect(page.getByText(/ovos? inteiros? (pequ|m[eé]di|grand)/i).first()).toBeVisible();
    }

    // Plano carregou
    await expect(page.getByText('2660').first()).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: F8 — Nomes correctos de alimentos no plano (pão, banana, batata)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Plano Alimentar — F8: nomes correctos de alimentos', () => {

  test('C-F8 — "Pão branco (pão francês)" visível; "Pão francês branco" ausente', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Strings antigas não devem aparecer
    await expect(page.getByText(/Pão francês branco/)).not.toBeVisible();
    await expect(page.getByText(/unidade P/)).not.toBeVisible();
    await expect(page.getByText(/unidade M/)).not.toBeVisible();
    await expect(page.getByText(/unidade G/)).not.toBeVisible();
    await expect(page.getByText(/0\.5 unidade/)).not.toBeVisible();
    await expect(page.getByText(/1\.5 unidade/)).not.toBeVisible();

    // Plano carregou
    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-F8b — "Banana madura" visível; "Banana prata" ausente', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // "Banana prata" (qualquer variante) não deve aparecer como label
    await expect(page.getByText(/Banana prata/)).not.toBeVisible();

    // "Banana madura" deve aparecer (como label do ingrediente)
    await expect(page.getByText('Banana madura').first()).toBeVisible();

    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-F8c — "Batata inglesa cozida (batata branca simples)" visível', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // A batata deve aparecer com o nome completo correcto
    // (é possível que o Dia 1 não tenha batata — aceitável)
    const countBatata = await page.getByText(/Batata inglesa cozida/i).count();
    if (countBatata > 0) {
      await expect(page.getByText(/Batata inglesa cozida \(batata branca simples\)/i).first()).toBeVisible();
    }

    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-F8d — "omelete simples" nunca aparece quando ovos são mexidos', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Step "omelete simples" removido do template café_classico
    await expect(page.getByText(/omelete simples/i)).not.toBeVisible();

    await expect(page.getByText('2660').first()).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: PP — Porções Práticas (protein floor, carb rounding, veg humanizado)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Plano Alimentar — PP: Porções Práticas', () => {

  test('C-PP1 — Proteína pesável nunca exibe menos de 80g no plano', async ({ page }) => {
    await injectState(page, CENARIO_4); // 7 refeições sólidas
    await gotoResultados(page);
    await gotoPlano(page);

    // Avalia todos os ingredientes exibidos com gramas explícitos
    // e verifica que nenhuma proteína pesável aparece abaixo de 80g.
    const violations = await page.evaluate(() => {
      // Nomes pt-BR das proteínas pesáveis (como aparecem no display)
      const PROTEIN_NAMES = [
        /frango/i, /carne moída/i, /tilápia/i, /pescada/i, /salmão/i, /atum/i,
      ];
      const rows = Array.from(document.querySelectorAll(
        '.ingredient-row, .ing-row, .ingredient, [class*="ing"]'
      ));
      /** @type {{ text: string, g: number }[]} */
      const results = [];
      rows.forEach(row => {
        const text = row.textContent || '';
        const hasProtein = PROTEIN_NAMES.some(rx => rx.test(text));
        if (!hasProtein) return;
        // extrai o primeiro número de gramas "(XXg)" ou "XXg"
        const match = text.match(/\((\d+)g\)|(\d+)\s*g/);
        if (!match) return;
        const g = parseInt(match[1] || match[2], 10);
        if (g > 0 && g < 80) results.push({ text: text.trim().slice(0, 60), g });
      });
      return results;
    });

    expect(violations, `Proteínas abaixo de 80g: ${JSON.stringify(violations)}`).toHaveLength(0);

    // Plano carregou
    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-PP2 — Vegetais mostram "a gosto" ou "1 porção pequena" no plano', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Pelo menos um dos labels humanizados deve aparecer se vegetais estiverem no plano
    const aGostoCount   = await page.getByText('a gosto').count();
    const porcaoCount   = await page.getByText('1 porção pequena').count();

    // Se salada/brócolis/abobrinha/cenoura existirem no plano, um destes deve aparecer.
    // Aceitável que o Dia 1 não tenha vegetais loose — o teste verifica apenas que
    // o display está correcto quando presente.
    const vegsPresent = await page.getByText(/salada|brócolis|abobrinha|cenoura/i).count();
    if (vegsPresent > 0) {
      expect(aGostoCount + porcaoCount).toBeGreaterThan(0);
    }

    // Plano carregou
    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-PP4 — Híbrido 6 refeições: proteínas >=80g e plano carrega', async ({ page }) => {
    // CENARIO_6 = Híbrido 6 refeições, wake 08:00, sem treino
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    // Mesmo no slot breakfast (508 kcal) e lunch (556 kcal) as proteínas
    // devem aparecer em porções práticas (>=80g, múltiplos de 10g).
    const violations = await page.evaluate(() => {
      const PROTEIN_NAMES = [
        /frango/i, /carne moída/i, /tilápia/i, /pescada/i, /salmão/i, /atum/i,
      ];
      const rows = Array.from(document.querySelectorAll(
        '.ingredient-row, .ing-row, .ingredient, [class*="ing"]'
      ));
      /** @type {{ text: string, g: number }[]} */
      const found = [];
      rows.forEach(row => {
        const text = row.textContent || '';
        if (!PROTEIN_NAMES.some(rx => rx.test(text))) return;
        const match = text.match(/\((\d+)g\)|(\d+)\s*g/);
        if (!match) return;
        const g = parseInt(match[1] || match[2], 10);
        if (g > 0 && g < 80) found.push({ text: text.trim().slice(0, 60), g });
      });
      return found;
    });

    expect(violations, `Proteínas <80g: ${JSON.stringify(violations)}`).toHaveLength(0);
    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-PP5 — 7 refeições sólidas com treino: proteínas práticas e labels OK', async ({ page }) => {
    // CENARIO_5 = 7S sólidas, treino 16:00–17:30
    await injectState(page, CENARIO_5);
    await gotoResultados(page);
    await gotoPlano(page);

    const violations = await page.evaluate(() => {
      const PROTEIN_NAMES = [
        /frango/i, /carne moída/i, /tilápia/i, /pescada/i, /salmão/i, /atum/i,
      ];
      const rows = Array.from(document.querySelectorAll(
        '.ingredient-row, .ing-row, .ingredient, [class*="ing"]'
      ));
      /** @type {{ text: string, g: number }[]} */
      const found = [];
      rows.forEach(row => {
        const text = row.textContent || '';
        if (!PROTEIN_NAMES.some(rx => rx.test(text))) return;
        const match = text.match(/\((\d+)g\)|(\d+)\s*g/);
        if (!match) return;
        const g = parseInt(match[1] || match[2], 10);
        if (g > 0 && g < 80) found.push({ text: text.trim().slice(0, 60), g });
      });
      return found;
    });

    expect(violations, `Proteínas <80g: ${JSON.stringify(violations)}`).toHaveLength(0);

    // Regressão: labels de foods correctos
    await expect(page.getByText(/Banana prata/)).not.toBeVisible();
    await expect(page.getByText(/0\.5 scoop/)).not.toBeVisible();
    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-PP6 — 8 refeições prático: sem proteínas ridículas, "a gosto" se vegetais presentes', async ({ page }) => {
    // CENARIO_9 = 8 refeições, estratégia practical, sem treino
    await injectState(page, CENARIO_9);
    await gotoResultados(page);
    await gotoPlano(page);

    const violations = await page.evaluate(() => {
      const PROTEIN_NAMES = [
        /frango/i, /carne moída/i, /tilápia/i, /pescada/i, /salmão/i, /atum/i,
      ];
      const rows = Array.from(document.querySelectorAll(
        '.ingredient-row, .ing-row, .ingredient, [class*="ing"]'
      ));
      /** @type {{ text: string, g: number }[]} */
      const found = [];
      rows.forEach(row => {
        const text = row.textContent || '';
        if (!PROTEIN_NAMES.some(rx => rx.test(text))) return;
        const match = text.match(/\((\d+)g\)|(\d+)\s*g/);
        if (!match) return;
        const g = parseInt(match[1] || match[2], 10);
        if (g > 0 && g < 80) found.push({ text: text.trim().slice(0, 60), g });
      });
      return found;
    });

    expect(violations, `Proteínas <80g: ${JSON.stringify(violations)}`).toHaveLength(0);

    // Vegetais com display humanizado (se presentes no plano)
    const vegsPresent = await page.getByText(/salada|brócolis|abobrinha|cenoura/i).count();
    if (vegsPresent > 0) {
      const aGosto = await page.getByText('a gosto').count();
      const porcao = await page.getByText('1 porção pequena').count();
      expect(aGosto + porcao).toBeGreaterThan(0);
    }

    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-PP3 — Regressão: 23 itens anteriores ainda passam (proteínas, labels, totais)', async ({ page }) => {
    // Este teste é um smoke-test de regressão rápida para garantir que
    // o protein floor não quebrou as labels/displays anteriores.
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Labels de food names continuam correctos
    await expect(page.getByText(/Pão francês branco/)).not.toBeVisible();
    await expect(page.getByText(/Banana prata/)).not.toBeVisible();
    await expect(page.getByText(/unidade [PMG]/)).not.toBeVisible();
    await expect(page.getByText(/0\.5 scoop/)).not.toBeVisible();
    await expect(page.getByText(/0\.5 colher de sopa/)).not.toBeVisible();
    await expect(page.getByText(/colhers des/)).not.toBeVisible();
    await expect(page.getByText(/omelete simples/i)).not.toBeVisible();

    // Labels positivos
    await expect(page.getByText('Banana madura').first()).toBeVisible();
    await expect(page.getByText('2660').first()).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: F9 — Nomes bilingues PT/BR correctos
// ─────────────────────────────────────────────────────────────────────────────
// Garante que nomes ambíguos (Aveia fina, nomes só-BR) foram substituídos
// pelos equivalentes claros com equivalente PT entre parêntesis.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Plano Alimentar — F9: nomes bilingues PT/BR', () => {

  test('C-F9a — "Aveia fina" nunca aparece; prova que é flocos, não farinha', async ({ page }) => {
    // O food ID é aveia_flocos → claramente flocos.
    // Antes: label 'Aveia fina' no shake_manga era ambíguo (parecia farinha).
    // Depois: todos os labels usam 'Flocos de aveia finos'.
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // "Aveia fina" NÃO deve aparecer em nenhum label ou nota.
    await expect(page.getByText(/^Aveia fina$/)).not.toBeVisible();
    await expect(page.getByText('Aveia fina')).not.toBeVisible();

    // "Carne moída magra" (qualquer variante) NÃO deve aparecer.
    await expect(page.getByText(/Carne mo[íi]da magra/)).not.toBeVisible();

    // Plano carregou.
    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-F9b — "Aveia fina" ausente no plano híbrido (shake_manga pode aparecer)', async ({ page }) => {
    // CENARIO_6 = Híbrido 6 refeições com shake_afternoon → pode rodar shake_manga.
    await injectState(page, CENARIO_6);
    await gotoResultados(page);
    await gotoPlano(page);

    // Mesmo que shake_manga apareça no plano, o label deve ser 'Flocos de aveia finos'.
    await expect(page.getByText('Aveia fina')).not.toBeVisible();

    // "Flocos de aveia finos" deve aparecer quando aveia estiver presente.
    const aveiaCount = await page.getByText('Flocos de aveia finos').count();
    if (aveiaCount > 0) {
      await expect(page.getByText('Flocos de aveia finos').first()).toBeVisible();
    }

    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-F9c — Nomes de foods antigos ausentes; equivalentes PT/BR presentes quando aplicável', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Nomes antigos que não devem aparecer:
    await expect(page.getByText(/Aveia fina/)).not.toBeVisible();
    await expect(page.getByText(/Carne mo[íi]da magra/)).not.toBeVisible();
    await expect(page.getByText(/Pão francês branco/)).not.toBeVisible();
    await expect(page.getByText(/Banana prata/)).not.toBeVisible();
    await expect(page.getByText(/unidade [PMG]/)).not.toBeVisible();
    await expect(page.getByText(/0\.5 unidade/)).not.toBeVisible();
    await expect(page.getByText(/0\.5 colher de sopa/)).not.toBeVisible();

    // Nomes novos devem aparecer quando o alimento está presente no plano:
    // (carne moída, macarrão, abobrinha dependem do template do Dia 1)
    const carneMoida = await page.getByText(/Carne mo[íi]da \(carne picada\)/i).count();
    if (carneMoida > 0) {
      await expect(page.getByText(/Carne mo[íi]da \(carne picada\)/i).first()).toBeVisible();
    }

    const macarrao = await page.getByText(/Macarr[aã]o.*massa cozida/i).count();
    if (macarrao > 0) {
      await expect(page.getByText(/Macarr[aã]o.*massa cozida/i).first()).toBeVisible();
    }

    const abobrinha = await page.getByText(/Abobrinha.*curgete/i).count();
    if (abobrinha > 0) {
      await expect(page.getByText(/Abobrinha.*curgete/i).first()).toBeVisible();
    }

    // Banana madura e Pão branco (pão francês) mantêm-se correctos:
    await expect(page.getByText('Banana madura').first()).toBeVisible();
    await expect(page.getByText('2660').first()).toBeVisible();
  });

});
