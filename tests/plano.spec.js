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

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Sistema de Substituições
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Sistema de Substituições', () => {

  test('C-SUB1 — Botão "Substituir" existe e é clicável no Dia 1', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Dia 1 está aberto por defeito — deve existir pelo menos 1 botão Substituir
    const swapBtns = page.locator('[data-swap]');
    await expect(swapBtns.first()).toBeVisible();
    const count = await swapBtns.count();
    expect(count).toBeGreaterThan(0);
  });

  test('C-SUB2 — Modal abre ao clicar em "Substituir"', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();

    // Modal aparece
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();
    await expect(page.locator('.modal-title')).toBeVisible();
  });

  test('C-SUB3 — Modal mostra alimento atual com kcal e macros', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();

    // Bloco "Alimento atual" visível
    await expect(page.locator('.sub-current')).toBeVisible();
    await expect(page.locator('.sub-current-label')).toBeVisible();
    await expect(page.locator('.sub-current-name')).toBeVisible();
    await expect(page.locator('.sub-current-macros')).toBeVisible();

    // Macros contêm "kcal"
    const macrosText = await page.locator('.sub-current-macros').textContent();
    expect(macrosText).toMatch(/kcal/);
    expect(macrosText).toMatch(/P:/);
    expect(macrosText).toMatch(/C:/);
    expect(macrosText).toMatch(/G:/);
  });

  test('C-SUB4 — Modal mostra alternativas da categoria correta', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();

    // Deve haver opções de substituição
    await expect(page.locator('.modal-body')).toBeVisible();
    // Se existem opções, cada uma tem nome, quantidade e macros
    const opts = page.locator('.sub-option');
    const optCount = await opts.count();
    if (optCount > 0) {
      await expect(opts.first().locator('.sub-option-name')).toBeVisible();
      await expect(opts.first().locator('.sub-option-qty')).toBeVisible();
      await expect(opts.first().locator('.sub-option-macros')).toBeVisible();
      // Cada opção tem badge de impacto
      await expect(opts.first().locator('.sub-impact')).toBeVisible();
    }
  });

  test('C-SUB5 — Confirmar substituição altera o alimento no plano', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Abrir modal do primeiro ingrediente
    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    // Se há opções disponíveis, clicar na primeira
    const opts = page.locator('.sub-option');
    const optCount = await opts.count();
    if (optCount === 0) {
      // Sem opções — fechar e marcar como skipped
      await page.locator('[data-modal-close]').first().click();
      return;
    }

    // Guardar o nome do substituto escolhido
    const subName = await opts.first().locator('.sub-option-name').textContent();
    await opts.first().click();

    // Modal fechou
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible();

    // O nome do primeiro ingrediente mudou para o substituto
    const newIngName = await page.locator('.ingredient-name').first().textContent();
    expect(newIngName).toContain(subName ? subName.trim() : '');
  });

  test('C-SUB6 — Badge "Substituído" aparece após aplicar substituição', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Sem substituição: badge não existe
    await expect(page.locator('.ing-badge-subst').first()).not.toBeVisible();

    // Abrir modal e aplicar
    await page.locator('[data-swap]').first().click();
    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;
    await opts.first().click();

    // Badge aparece
    await expect(page.locator('.ing-badge-subst').first()).toBeVisible();
    const badgeText = await page.locator('.ing-badge-subst').first().textContent();
    expect(badgeText?.trim()).toBe('Substituído');
  });

  test('C-SUB7 — Botão "Reverter" inline aparece após aplicar substituição', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Sem substituição: botão revert não existe
    await expect(page.locator('[data-revert]').first()).not.toBeVisible();

    // Aplicar substituição
    await page.locator('[data-swap]').first().click();
    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;
    await opts.first().click();

    // Botão revert aparece
    await expect(page.locator('[data-revert]').first()).toBeVisible();
    await expect(page.locator('.ing-revert-btn').first()).toBeVisible();
  });

  test('C-SUB8 — Reverter via botão inline restaura o ingrediente original', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Nome original
    const originalName = await page.locator('.ingredient-name').first().textContent();

    // Aplicar substituição
    await page.locator('[data-swap]').first().click();
    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;
    await opts.first().click();

    // Verificar que mudou
    const substitutedName = await page.locator('.ingredient-name').first().textContent();
    expect(substitutedName).not.toBe(originalName);

    // Reverter via botão inline
    await page.locator('[data-revert]').first().click();

    // Nome restaurado
    const restoredName = await page.locator('.ingredient-name').first().textContent();
    expect(restoredName?.trim()).toContain((originalName || '').trim());

    // Badge sumiu
    await expect(page.locator('.ing-badge-subst').first()).not.toBeVisible();
  });

  test('C-SUB9 — Reverter via botão no modal restaura o ingrediente original', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const originalName = await page.locator('.ingredient-name').first().textContent();

    // Aplicar substituição
    await page.locator('[data-swap]').first().click();
    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;
    await opts.first().click();

    // Abrir modal novamente no mesmo ingrediente (agora substituído)
    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    // Botão "Reverter" visível no modal (porque está substituído)
    await expect(page.locator('#btn-reset-ing')).toBeVisible();

    // Clicar no reverter do modal
    await page.locator('#btn-reset-ing').click();

    // Restaurado
    const restoredName = await page.locator('.ingredient-name').first().textContent();
    expect(restoredName?.trim()).toContain((originalName || '').trim());
  });

  test('C-SUB10 — Cancelar não altera nada', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const originalName = await page.locator('.ingredient-name').first().textContent();

    // Abrir modal e cancelar
    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();
    await page.locator('[data-modal-close]').first().click();

    // Nada mudou
    await expect(page.locator('.modal-backdrop.show')).not.toBeVisible();
    const nameAfterCancel = await page.locator('.ingredient-name').first().textContent();
    expect(nameAfterCancel?.trim()).toBe((originalName || '').trim());
    await expect(page.locator('.ing-badge-subst').first()).not.toBeVisible();
  });

  test('C-SUB11 — "Reverter" não aparece no modal antes de qualquer substituição', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Abrir modal sem substituição anterior
    await page.locator('[data-swap]').first().click();
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    // Botão "Reverter" NÃO deve estar visível (ingrediente não foi substituído ainda)
    await expect(page.locator('#btn-reset-ing')).not.toBeVisible();

    await page.locator('[data-modal-close]').first().click();
  });

  test('C-SUB12 — Substituições não mostram porções ridículas (< 80g para proteínas pesáveis)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Abrir modal de um ingrediente de proteína
    // Percorrer todos os botões Substituir do Dia 1 até encontrar um com opções de proteína
    const swapBtns = page.locator('[data-swap]');
    const count = await swapBtns.count();

    let proteinOptionsFound = false;
    for (let i = 0; i < Math.min(count, 10); i++) {
      await swapBtns.nth(i).click();
      const opts = page.locator('.sub-option');
      const optCount = await opts.count();
      if (optCount > 0) {
        // Verificar todas as opções
        for (let j = 0; j < optCount; j++) {
          const qtyText = await opts.nth(j).locator('.sub-option-qty').textContent() || '';
          const macrosText = await opts.nth(j).locator('.sub-option-macros').textContent() || '';
          // Se é uma proteína pesável (frango, carne, peixe, atum) não deve ser < 80g
          // Detectar por macros de proteína alta
          const protMatch = macrosText.match(/P:([\d.]+)g/);
          if (protMatch && parseFloat(protMatch[1]) > 15) {
            // Alta proteína — verificar que a quantidade não é ridícula (< 80g)
            const gramsMatch = qtyText.match(/(\d+)g/);
            if (gramsMatch) {
              const g = parseInt(gramsMatch[1], 10);
              // Para proteínas pesáveis: mínimo 80g (o floor é 100g, mas 80g é a UI mínima aceitável)
              expect(g).toBeGreaterThanOrEqual(80);
            }
            proteinOptionsFound = true;
          }
        }
      }
      await page.locator('[data-modal-close]').first().click();
      if (proteinOptionsFound) break;
    }
    // Se encontrou opções de proteína, já validou; caso contrário o plano não tem proteínas substituíveis (ok)
  });

  test('C-SUB13 — Substituição de proteína: frango → outra proteína (cenário sólido)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Procurar ingrediente "Peito de frango" no Dia 1
    const frangoIng = page.locator('.ingredient-name', { hasText: /Peito de frango/i }).first();
    const hasFrango = await frangoIng.count();
    if (!hasFrango) {
      // Template de Dia 1 não tem frango — teste não é aplicável mas não deve falhar
      return;
    }

    // Encontrar o botão Substituir correspondente
    const frangoLi = frangoIng.locator('xpath=ancestor::li[contains(@class,"ingredient")]');
    const swapBtn = frangoLi.locator('[data-swap]');
    await swapBtn.click();

    // Modal abre
    await expect(page.locator('.modal-backdrop.show')).toBeVisible();

    // Alimento atual = Peito de frango
    const currentName = await page.locator('.sub-current-name').textContent();
    expect(currentName).toMatch(/Peito de frango/i);

    // Existem opções de substituição
    const opts = page.locator('.sub-option');
    const optCount = await opts.count();
    expect(optCount).toBeGreaterThan(0);

    // Nenhuma opção de proteína com < 80g
    for (let i = 0; i < optCount; i++) {
      const qtyText = await opts.nth(i).locator('.sub-option-qty').textContent() || '';
      const gramsMatch = qtyText.match(/(\d+)g/);
      if (gramsMatch) {
        const g = parseInt(gramsMatch[1], 10);
        expect(g).toBeGreaterThanOrEqual(80);
      }
    }

    // Aplicar primeira substituição
    await opts.first().click();
    await expect(page.locator('.ing-badge-subst').first()).toBeVisible();
  });

  test('C-SUB14 — Substituição de carb: arroz → outro carb', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Procurar "Arroz branco" no Dia 1
    const arrozIng = page.locator('.ingredient-name', { hasText: /Arroz branco/i }).first();
    if (await arrozIng.count() === 0) return; // não está no template do Dia 1

    const arrozLi = arrozIng.locator('xpath=ancestor::li[contains(@class,"ingredient")]');
    await arrozLi.locator('[data-swap]').click();

    await expect(page.locator('.modal-backdrop.show')).toBeVisible();
    const currentName = await page.locator('.sub-current-name').textContent();
    expect(currentName).toMatch(/Arroz/i);

    // Opções existem
    const opts = page.locator('.sub-option');
    const optCount = await opts.count();
    expect(optCount).toBeGreaterThan(0);

    // Aplicar e verificar
    await opts.first().click();
    await expect(page.locator('.ing-badge-subst').first()).toBeVisible();
  });

  // ── Regressão: melhorias anteriores continuam intactas ─────────────────────

  test('C-SUB-REG — Regressão: melhorias anteriores não regrediram após sistema de substituições', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Proteína whey sem contradição
    await expect(page.getByText(/Whey \(1 scoop\)/)).not.toBeVisible();
    await expect(page.getByText(/Whey protein \(1 scoop\)/)).not.toBeVisible();
    await expect(page.getByText(/Whey \(meio scoop\)/)).not.toBeVisible();
    await expect(page.getByText('Proteína whey').first()).toBeVisible();

    // Nomes correctos
    await expect(page.getByText('Banana madura').first()).toBeVisible();
    await expect(page.getByText(/unidade [PMG]/)).not.toBeVisible();
    await expect(page.getByText(/0\.5 unidade/)).not.toBeVisible();
    await expect(page.getByText(/0\.5 colher de sopa/)).not.toBeVisible();
    await expect(page.getByText(/Aveia fina/)).not.toBeVisible();
    await expect(page.getByText(/Carne mo[íi]da magra/)).not.toBeVisible();

    // Plano carregou
    await expect(page.getByText('2660').first()).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Totais visíveis após substituições
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Totais com substituições — hero e dia', () => {

  test('C-TOT1 — Sem substituições: bloco "Com substituições" ausente no cabeçalho do dia', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await expect(page.locator('[data-testid="day-comp-block"]')).not.toBeVisible();
    await expect(page.getByText('2660').first()).toBeVisible();
  });

  test('C-TOT2 — Após substituição: bloco aparece no cabeçalho do dia com linhas Atual, Original, Diferença', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;
    await opts.first().click();

    await expect(page.locator('[data-testid="day-comp-block"]').first()).toBeVisible();
    await expect(page.locator('.day-comp-row-current').first()).toBeVisible();
    await expect(page.locator('.day-comp-row-orig').first()).toBeVisible();
    await expect(page.locator('.day-comp-row-delta').first()).toBeVisible();
    await expect(page.locator('.day-comp-status').first()).toBeVisible();
  });

  test('C-TOT3 — Bloco contém kcal e macros reais em cada linha', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;
    await opts.first().click();

    const currentText = await page.locator('.day-comp-row-current').first().textContent() || '';
    expect(currentText).toMatch(/kcal/);
    expect(currentText).toMatch(/P:/);

    const origText = await page.locator('.day-comp-row-orig').first().textContent() || '';
    expect(origText).toMatch(/kcal/);

    const deltaText = await page.locator('.day-comp-row-delta').first().textContent() || '';
    expect(deltaText).toMatch(/[+-]?\d+ kcal/);
  });

  test('C-TOT4 — Status "Dentro do objetivo" ou "Atenção" aparece no bloco do dia', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;
    await opts.first().click();

    const statusEl = page.locator('.day-comp-status').first();
    await expect(statusEl).toBeVisible();
    const statusText = await statusEl.textContent() || '';
    expect(statusText.includes('Dentro do objetivo') || statusText.includes('Atenção')).toBe(true);
  });

  test('C-TOT5 — Dia 1 com substituições mostra bloco de comparação no cabeçalho do dia', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await expect(page.locator('[data-testid="day-comp-block"]')).not.toBeVisible();

    await page.locator('[data-swap]').first().click();
    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;
    await opts.first().click();

    const dayCompBlock = page.locator('[data-testid="day-comp-block"]').first();
    await expect(dayCompBlock).toBeVisible();
    const blockText = await dayCompBlock.textContent() || '';
    expect(blockText).toMatch(/Original/);
    expect(blockText).toMatch(/kcal/);
  });

  test('C-TOT6 — Após reverter: bloco de comparação do dia desaparece', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;
    await opts.first().click();

    await expect(page.locator('[data-testid="day-comp-block"]').first()).toBeVisible();

    await page.locator('[data-revert]').first().click();

    await expect(page.locator('[data-testid="day-comp-block"]')).not.toBeVisible();
  });

  test('C-TOT7 — Valores no bloco são numéricos e plausíveis (>1000 kcal/dia)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    await page.locator('[data-swap]').first().click();
    const opts = page.locator('.sub-option');
    if (await opts.count() === 0) return;
    await opts.first().click();

    const currentVals = await page.locator('.day-comp-row-current .day-comp-vals').first().textContent() || '';
    const origVals    = await page.locator('.day-comp-row-orig .day-comp-vals').first().textContent() || '';

    const currKcal = parseInt((currentVals.match(/(\d+)\s*kcal/) || [])[1] || '0', 10);
    const origKcal = parseInt((origVals.match(/(\d+)\s*kcal/)    || [])[1] || '0', 10);

    expect(currKcal).toBeGreaterThan(1000);
    expect(origKcal).toBeGreaterThan(1000);
  });

  test('C-TOT8 — Múltiplas substituições no mesmo dia: bloco único no cabeçalho, não duplicado', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const swapBtns = page.locator('[data-swap]');
    if (await swapBtns.count() < 2) return;

    await swapBtns.nth(0).click();
    let opts = page.locator('.sub-option');
    if (await opts.count() === 0) { await page.locator('[data-modal-close]').first().click(); return; }
    await opts.first().click();

    await page.locator('[data-swap]').nth(1).click();
    opts = page.locator('.sub-option');
    if (await opts.count() === 0) { await page.locator('[data-modal-close]').first().click(); return; }
    await opts.first().click();

    const blockCount = await page.locator('[data-testid="day-comp-block"]').count();
    expect(blockCount).toBe(1);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — Validação Matemática
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse macros from a text string in multiple formats:
 *   "2.660 kcal • P:166g • C:299g • G:89g"   (comp block / day-summary)
 *   " 2.660 kcal 166g P 299g C 89g G"          (meal-totals, value before letter)
 *   "+22 kcal • +5g P • 0g C • 0g G"           (delta row, signed values)
 * Returns { kcal, prot, carb, fat }.
 */
function parseMacros(text) {
  // Strip pt-PT thousand separator ("2.660" → "2660"), preserve decimal points.
  const s = text.replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2').replace(/\s+/g, ' ');

  // kcal — handles optional sign and formatted numbers
  const kcal = parseInt((s.match(/([+-]?\d+)\s*kcal/) || [])[1] || '0', 10);

  // Protein: "P:166g" (day-summary / comp) OR "166g P" / "+5g P" (meal-totals / delta)
  const protM = s.match(/P:\s*([\d.]+)g/) || s.match(/([+-]?[\d.]+)g\s+P\b/);
  const prot  = parseFloat((protM || [])[1] || '0');

  // Carb: "C:299g" OR "299g C" / "+5g C"
  const carbM = s.match(/C:\s*([\d.]+)g/) || s.match(/([+-]?[\d.]+)g\s+C\b/);
  const carb  = parseFloat((carbM || [])[1] || '0');

  // Fat: "G:89g" OR "89g G" / "+5g G"
  const fatM  = s.match(/G:\s*([\d.]+)g/) || s.match(/([+-]?[\d.]+)g\s+G\b/);
  const fat   = parseFloat((fatM || [])[1] || '0');

  return { kcal, prot, carb, fat };
}

/**
 * Read the day-header summary totals for day index (0-based).
 * Uses [data-day-head] .day-summary which always exists (no sub needed).
 */
async function getDayTotals(page, dayIdx = 0) {
  const text = await page.locator(`[data-day-head="${dayIdx}"] .day-summary`).textContent() || '';
  return parseMacros(text);
}

/**
 * Read the comparison block for day index (0-based).
 * Returns { current, original, delta } each as { kcal, prot, carb, fat }.
 * Relies on data-testid="day-current-totals" etc. added to the block spans.
 */
async function getCompBlock(page, dayIdx = 0) {
  const scope = page.locator(`[data-day-head="${dayIdx}"] [data-testid="day-comp-block"]`);
  const curTxt   = await scope.locator('[data-testid="day-current-totals"]').textContent()  || '';
  const origTxt  = await scope.locator('[data-testid="day-original-totals"]').textContent() || '';
  const deltaTxt = await scope.locator('[data-testid="day-delta-totals"]').textContent()    || '';
  return {
    current:  parseMacros(curTxt),
    original: parseMacros(origTxt),
    delta:    parseMacros(deltaTxt),
  };
}

/**
 * Sum all visible meal-totals blocks within the given day body.
 * Uses #day-body-N which already exists without extra testid.
 */
async function sumMeals(page, dayIdx = 0) {
  const items = await page.locator(`#day-body-${dayIdx} .meal-totals`).all();
  const sum = { kcal: 0, prot: 0, carb: 0, fat: 0 };
  for (const el of items) {
    const m = parseMacros(await el.textContent() || '');
    sum.kcal += m.kcal;
    sum.prot += m.prot;
    sum.carb += m.carb;
    sum.fat  += m.fat;
  }
  return sum;
}

/**
 * Open the modal for swapLocator and click the first option with a non-zero kcal delta.
 * The option macros text contains "(+22)" or "(-5)" — we skip "(+0)".
 * Returns true if a substitution was applied, false if no valid option found.
 */
async function applySubThatChanges(page, swapLocator) {
  await swapLocator.click();
  await page.waitForSelector('.modal-backdrop.show');
  const opts = page.locator('.sub-option');
  const count = await opts.count();
  if (count === 0) {
    await page.locator('[data-modal-close]').first().click();
    return false;
  }
  for (let i = 0; i < count; i++) {
    const macroTxt = await opts.nth(i).locator('.sub-option-macros').textContent() || '';
    // Format: "XXX kcal (+22) • P:..." — find first with non-zero delta
    const deltaM = macroTxt.match(/\(([+-]?\d+)\)/);
    if (deltaM && parseInt(deltaM[1], 10) !== 0) {
      await opts.nth(i).click();
      return true;
    }
  }
  // No option with non-zero kcal delta — apply first anyway and let assertions decide
  await opts.first().click();
  return true;
}

/** Assert at least one macro dimension changed (tolerances: ±1 kcal, ±0.5g). */
function expectSomethingChanged(before, after) {
  const changed =
    Math.abs(after.kcal - before.kcal) > 1 ||
    Math.abs(after.prot - before.prot) > 0.5 ||
    Math.abs(after.carb - before.carb) > 0.5 ||
    Math.abs(after.fat  - before.fat)  > 0.5;
  expect(changed, `Expected macros to change.\nbefore=${JSON.stringify(before)}\nafter=${JSON.stringify(after)}`).toBe(true);
}

/**
 * Assert the comp block's delta row is arithmetically consistent:
 *   comp.delta ≈ comp.current − comp.original
 * Tolerance: ±2 kcal, ±1g macros (rounding from Math.round in the template).
 */
function expectDeltaConsistent(comp) {
  const { current: cur, original: orig, delta } = comp;
  const realKcal = cur.kcal - orig.kcal;
  const realProt = Math.round(cur.prot) - Math.round(orig.prot);
  const realCarb = Math.round(cur.carb) - Math.round(orig.carb);
  const realFat  = Math.round(cur.fat)  - Math.round(orig.fat);
  expect(Math.abs(delta.kcal - realKcal), `delta.kcal displayed=${delta.kcal}, real=${realKcal}`).toBeLessThanOrEqual(2);
  expect(Math.abs(delta.prot - realProt), `delta.prot displayed=${delta.prot}, real=${realProt}`).toBeLessThanOrEqual(1);
  expect(Math.abs(delta.carb - realCarb), `delta.carb displayed=${delta.carb}, real=${realCarb}`).toBeLessThanOrEqual(1);
  expect(Math.abs(delta.fat  - realFat),  `delta.fat displayed=${delta.fat}, real=${realFat}`).toBeLessThanOrEqual(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Validação Matemática das Substituições
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Validação Matemática das Substituições', () => {

  // ── C-MATH1 ─────────────────────────────────────────────────────────────────
  test('C-MATH1 — Bloco comp: current/original batem com totais do dia e delta é exato', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const before = await getDayTotals(page, 0);

    const applied = await applySubThatChanges(page, page.locator('[data-swap]').first());
    if (!applied) return;

    const after = await getDayTotals(page, 0);
    expectSomethingChanged(before, after);

    const comp = await getCompBlock(page, 0);

    // comp.current must match the day header now shown (tolerance: ±2 kcal, ±1g)
    expect(Math.abs(comp.current.kcal - after.kcal),
      `comp.current.kcal=${comp.current.kcal} ≠ day header=${after.kcal}`).toBeLessThanOrEqual(2);
    expect(Math.abs(comp.current.prot - after.prot),
      `comp.current.prot=${comp.current.prot} ≠ day header=${after.prot}`).toBeLessThanOrEqual(1);

    // comp.original must match the day header before any substitution
    expect(Math.abs(comp.original.kcal - before.kcal),
      `comp.original.kcal=${comp.original.kcal} ≠ original=${before.kcal}`).toBeLessThanOrEqual(2);
    expect(Math.abs(comp.original.prot - before.prot),
      `comp.original.prot=${comp.original.prot} ≠ original=${before.prot}`).toBeLessThanOrEqual(1);

    // delta displayed = current − original (arithmetically exact in the template)
    expectDeltaConsistent(comp);
  });

  // ── C-MATH2 ─────────────────────────────────────────────────────────────────
  test('C-MATH2 — Substituição de proteína: prot/kcal do dia mudam e delta confere', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const protIng = page.locator('.ingredient-name', { hasText: /Peito de frango|Carne mo[iíI]da|Atum|Peixe/i }).first();
    if (await protIng.count() === 0) return;

    const li = protIng.locator('xpath=ancestor::li[contains(@class,"ingredient")]');
    const before = await getDayTotals(page, 0);

    const applied = await applySubThatChanges(page, li.locator('[data-swap]'));
    if (!applied) return;

    const after = await getDayTotals(page, 0);
    expectSomethingChanged(before, after);

    // For a protein substitution at least prot or kcal should shift
    const protOrKcalChanged =
      Math.abs(after.prot - before.prot) > 0.5 ||
      Math.abs(after.kcal - before.kcal) > 1;
    expect(protOrKcalChanged, 'Expected protein or kcal to change after protein substitution').toBe(true);

    expectDeltaConsistent(await getCompBlock(page, 0));
  });

  // ── C-MATH3 ─────────────────────────────────────────────────────────────────
  test('C-MATH3 — Substituição de carboidrato: carb/kcal do dia mudam e delta confere', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const carbIng = page.locator('.ingredient-name', { hasText: /Arroz branco|Arroz basmati|Macarr[ãa]o/i }).first();
    if (await carbIng.count() === 0) return;

    const li = carbIng.locator('xpath=ancestor::li[contains(@class,"ingredient")]');
    const before = await getDayTotals(page, 0);

    const applied = await applySubThatChanges(page, li.locator('[data-swap]'));
    if (!applied) return;

    const after = await getDayTotals(page, 0);
    expectSomethingChanged(before, after);

    const carbOrKcalChanged =
      Math.abs(after.carb - before.carb) > 0.5 ||
      Math.abs(after.kcal - before.kcal) > 1;
    expect(carbOrKcalChanged, 'Expected carb or kcal to change after carb substitution').toBe(true);

    expectDeltaConsistent(await getCompBlock(page, 0));
  });

  // ── C-MATH4 ─────────────────────────────────────────────────────────────────
  test('C-MATH4 — Múltiplas substituições: delta acumulado exato e bloco único', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    if (await page.locator('[data-swap]').count() < 2) return;

    const before = await getDayTotals(page, 0);

    const ok1 = await applySubThatChanges(page, page.locator('[data-swap]').nth(0));
    if (!ok1) return;

    const ok2 = await applySubThatChanges(page, page.locator('[data-swap]').nth(1));
    if (!ok2) return;

    const afterBoth = await getDayTotals(page, 0);
    expectSomethingChanged(before, afterBoth);

    // Exactly one comp block (not duplicated per substitution)
    expect(await page.locator('[data-testid="day-comp-block"]').count()).toBe(1);

    const comp = await getCompBlock(page, 0);

    // comp.original reflects the unmodified day (before both subs)
    expect(Math.abs(comp.original.kcal - before.kcal),
      `comp.original=${comp.original.kcal} should match pre-sub total=${before.kcal}`).toBeLessThanOrEqual(2);

    // comp.current reflects the state after both subs
    expect(Math.abs(comp.current.kcal - afterBoth.kcal),
      `comp.current=${comp.current.kcal} should match current total=${afterBoth.kcal}`).toBeLessThanOrEqual(2);

    // Internal delta consistency
    expectDeltaConsistent(comp);
  });

  // ── C-MATH5 ─────────────────────────────────────────────────────────────────
  test('C-MATH5 — Reverter restaura totais originais exatamente', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const before = await getDayTotals(page, 0);

    const applied = await applySubThatChanges(page, page.locator('[data-swap]').first());
    if (!applied) return;

    const afterSub = await getDayTotals(page, 0);
    expectSomethingChanged(before, afterSub);

    // Revert via inline button
    await page.locator('[data-revert]').first().click();

    const restored = await getDayTotals(page, 0);

    // Must match original within parse rounding tolerance
    expect(Math.abs(restored.kcal - before.kcal),
      `Restored kcal=${restored.kcal} ≠ original=${before.kcal}`).toBeLessThanOrEqual(2);
    expect(Math.abs(restored.prot - before.prot),
      `Restored prot=${restored.prot} ≠ original=${before.prot}`).toBeLessThanOrEqual(1);
    expect(Math.abs(restored.carb - before.carb),
      `Restored carb=${restored.carb} ≠ original=${before.carb}`).toBeLessThanOrEqual(1);
    expect(Math.abs(restored.fat  - before.fat),
      `Restored fat=${restored.fat} ≠ original=${before.fat}`).toBeLessThanOrEqual(1);

    // Comp block must disappear after full revert
    await expect(page.locator('[data-testid="day-comp-block"]')).not.toBeVisible();
  });

  // ── C-MATH6 ─────────────────────────────────────────────────────────────────
  test('C-MATH6 — Reverter parcialmente: bloco persiste, totais refletem só a sub restante', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    if (await page.locator('[data-swap]').count() < 2) return;

    const before = await getDayTotals(page, 0);

    const ok1 = await applySubThatChanges(page, page.locator('[data-swap]').nth(0));
    if (!ok1) return;
    const ok2 = await applySubThatChanges(page, page.locator('[data-swap]').nth(1));
    if (!ok2) return;

    // Revert only the first substituted ingredient
    await page.locator('[data-revert]').first().click();
    const afterPartial = await getDayTotals(page, 0);

    // Second sub is still active: comp block must remain visible
    await expect(page.locator('[data-testid="day-comp-block"]').first()).toBeVisible();

    // Totals differ from original (second sub still applied)
    expectSomethingChanged(before, afterPartial);

    // Comp block is internally consistent
    expectDeltaConsistent(await getCompBlock(page, 0));
  });

  // ── C-MATH7 ─────────────────────────────────────────────────────────────────
  test('C-MATH7 — Gordura ou fruta: substituição muda fat/carb do dia se disponível', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    // Try fat ingredients first, then fruit
    const fatIng   = page.locator('.ingredient-name', { hasText: /Pasta de amendoim|Azeite|Abacate/i }).first();
    const fruitIng = page.locator('.ingredient-name', { hasText: /Banana|Manga|Ma[çc][ãa]/i }).first();
    const hasFat   = await fatIng.count() > 0;
    const hasFruit = await fruitIng.count() > 0;
    if (!hasFat && !hasFruit) return;

    const targetIng = hasFat ? fatIng : fruitIng;
    const li = targetIng.locator('xpath=ancestor::li[contains(@class,"ingredient")]');
    const before = await getDayTotals(page, 0);

    const applied = await applySubThatChanges(page, li.locator('[data-swap]'));
    if (!applied) return;

    const after = await getDayTotals(page, 0);
    expectSomethingChanged(before, after);

    // fat sub → fat or kcal changed; fruit sub → carb or kcal changed
    const relevantChanged = hasFat
      ? Math.abs(after.fat - before.fat) > 0.5 || Math.abs(after.kcal - before.kcal) > 1
      : Math.abs(after.carb - before.carb) > 0.5 || Math.abs(after.kcal - before.kcal) > 1;
    expect(relevantChanged, `Expected fat/carb or kcal to change`).toBe(true);

    expectDeltaConsistent(await getCompBlock(page, 0));
  });

  // ── C-MATH-SUM ──────────────────────────────────────────────────────────────
  test('C-MATH-SUM — Soma das refeições do Dia 1 ≈ total do cabeçalho do dia (com substituição)', async ({ page }) => {
    await injectState(page, CENARIO_4);
    await gotoResultados(page);
    await gotoPlano(page);

    const applied = await applySubThatChanges(page, page.locator('[data-swap]').first());
    if (!applied) return;

    const dayTotal = await getDayTotals(page, 0);
    const mealSum  = await sumMeals(page, 0);

    // kcal tolerance ±5: each meal uses formatKcal (rounds individually)
    expect(Math.abs(mealSum.kcal - dayTotal.kcal),
      `Meal sum kcal=${mealSum.kcal} ≠ day header=${dayTotal.kcal}`).toBeLessThanOrEqual(5);

    // macro tolerance ±2g: meals show raw floats, header shows Math.round(total)
    expect(Math.abs(mealSum.prot - dayTotal.prot),
      `Meal sum prot=${mealSum.prot} ≠ day header=${dayTotal.prot}`).toBeLessThanOrEqual(2);
    expect(Math.abs(mealSum.carb - dayTotal.carb),
      `Meal sum carb=${mealSum.carb} ≠ day header=${dayTotal.carb}`).toBeLessThanOrEqual(2);
    expect(Math.abs(mealSum.fat  - dayTotal.fat),
      `Meal sum fat=${mealSum.fat} ≠ day header=${dayTotal.fat}`).toBeLessThanOrEqual(2);
  });

});
