/**
 * RECIPE SCALER — Sprint R3
 * =============================================================================
 * Escala uma receita da biblioteca (RECIPES, Sprint R2) para aproximar as
 * macros de uma refeição-alvo do plano de 14 dias.
 *
 * Não depende de DOM/UI.
 * Não altera recipes.js, foods.js nem qualquer dado de entrada.
 * Não persiste dados.
 *
 * Exporta:
 *   scaleRecipe(recipe, targetMeal, options?)  — algoritmo principal
 *   findRecipe(id)                             — utilitário de busca
 *
 * Estratégia de escala:
 *   1. Calcula factor = targetKcal / baseKcal (recalculada dos ingredients)
 *   2. Ingredientes scalePriority 1-2: grams = defaultGrams × factor
 *   3. Ingredientes scalePriority 3+:  grams = defaultGrams (fixos)
 *   4. Snap para valor prático por foodId
 *   5. Clamp a [minGrams, maxGrams] de cada ingrediente
 *   6. Recalcula macros com calcFoodMacros
 *   7. Classifica encaixe e gera warnings honestos
 * =============================================================================
 */

import { calcFoodMacros } from '../data/foods.js';
import { RECIPES }        from '../data/recipes.js';

// ─────────────────────────────────────────────────────────────────────────────
// Snap de arredondamento prático
// Cada entrada define { step, snapMin }:
//   step    = intervalo de arredondamento
//   snapMin = mínimo após snap (antes de clamp por min/maxGrams)
// ─────────────────────────────────────────────────────────────────────────────

const SNAP = {
  // Ovos: 1 ovo ≈ 50 g — sempre múltiplo inteiro de ovos
  ovo_inteiro:          { step: 50,  snapMin: 50  },
  // Whey: meio scoop = 15 g
  whey:                 { step: 15,  snapMin: 15  },
  // Proteínas pesáveis
  peito_frango:         { step: 10,  snapMin: 10  },
  carne_moida:          { step: 10,  snapMin: 10  },
  // Hidratos cozidos
  arroz_branco_cozido:  { step: 10,  snapMin: 10  },
  macarrao_cozido:      { step: 10,  snapMin: 10  },
  // Frutas (contáveis — banana ≈ 100 g por unidade)
  banana_prata:         { step: 25,  snapMin: 25  },
  // Aveia
  aveia_flocos:         { step: 5,   snapMin: 5   },
  // Lácteos líquidos
  leite_integral:       { step: 25,  snapMin: 25  },
  // Lácteos sólidos
  queijo_branco:        { step: 5,   snapMin: 5   },
  // Gorduras
  azeite:               { step: 5,   snapMin: 5   },
  pasta_amendoim:       { step: 5,   snapMin: 5   },
  // Outros ingredientes
  molho_tomate:         { step: 10,  snapMin: 0   },
  brocolis:             { step: 10,  snapMin: 0   },
  canela:               { step: 1,   snapMin: 0   },
};

/**
 * Arredonda rawGrams para o valor prático do alimento.
 * Nunca devolve menos que snapMin.
 *
 * @param {string} foodId
 * @param {number} rawGrams
 * @returns {number}
 */
function practicalSnap(foodId, rawGrams) {
  const cfg = SNAP[foodId];
  if (cfg) {
    const snapped = Math.round(rawGrams / cfg.step) * cfg.step;
    return Math.max(cfg.snapMin, snapped);
  }
  // Fallback genérico para foodId não mapeado
  if (rawGrams < 30)  return Math.max(1,  Math.round(rawGrams / 2)  * 2);
  if (rawGrams < 100) return Math.max(5,  Math.round(rawGrams / 5)  * 5);
  return Math.max(10, Math.round(rawGrams / 10) * 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// Classificação de encaixe
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {'good'|'approximate'|'macro_mismatch'|'not_recommended'} FitScore
 */

/** @type {Record<FitScore, string>} */
const FIT_LABELS = {
  good:            'Encaixe bom',
  approximate:     'Encaixe aproximado',
  macro_mismatch:  'Macros diferentes, mas calorias próximas',
  not_recommended: 'Não recomendado para esta refeição',
};

/**
 * Classifica o encaixe com base nos deltas de kcal e proteína.
 * Prioridade: calorias primeiro, proteína depois.
 *
 * @param {number} kcalDelta  - totals.kcal - target.kcal
 * @param {number} protDelta  - totals.prot - target.prot
 * @returns {FitScore}
 */
function classifyFit(kcalDelta, protDelta) {
  const absKcal = Math.abs(kcalDelta);
  const absProt = Math.abs(protDelta);

  if (absKcal <= 75  && absProt <= 10) return 'good';
  if (absKcal <= 150 && absProt <= 20) return 'approximate';
  if (absKcal <= 150)                  return 'macro_mismatch';
  return 'not_recommended';
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recalcula baseKcal a partir das quantidades padrão dos ingredientes.
 * Mais robusto do que confiar em recipe.baseKcal (que pode divergir se o
 * ficheiro for editado manualmente).
 *
 * @param {object[]} ingredients
 * @returns {number}
 */
function computeBaseKcal(ingredients) {
  return ingredients.reduce(
    (sum, ing) => sum + calcFoodMacros(ing.foodId, ing.defaultGrams).kcal,
    0
  );
}

/**
 * Constrói lista de warnings honestos sobre o encaixe.
 *
 * @param {object} params
 * @returns {string[]}
 */
function buildWarnings({ scaledIngredients, kcalDelta, protDelta, targetProt, recipe, slot }) {
  const w = [];

  if (Math.abs(kcalDelta) > 150) {
    const dir = kcalDelta > 0 ? 'acima' : 'abaixo';
    w.push(
      `Calorias ficaram ${Math.abs(Math.round(kcalDelta))} kcal ${dir} do target ` +
      `— limites práticos dos ingredientes foram atingidos.`
    );
  } else if (Math.abs(kcalDelta) > 75) {
    w.push(`Desvio calórico de ${Math.abs(Math.round(kcalDelta))} kcal em relação ao target.`);
  }

  if (targetProt > 0 && protDelta < -10) {
    w.push(
      `Proteína ${Math.abs(protDelta).toFixed(1)} g abaixo do alvo ` +
      `(alvo: ${targetProt} g).`
    );
  }

  const atMin = scaledIngredients.filter(i => i._clampedToMin);
  if (atMin.length) {
    const names = atMin.map(i => i.name).join(', ');
    w.push(`Atingiu o mínimo prático em: ${names}.`);
  }

  const atMax = scaledIngredients.filter(i => i._clampedToMax);
  if (atMax.length) {
    const names = atMax.map(i => i.name).join(', ');
    w.push(`Atingiu o máximo prático em: ${names}.`);
  }

  if (slot && Array.isArray(recipe.suggestedSlots) && !recipe.suggestedSlots.includes(slot)) {
    w.push(
      `Slot "${slot}" não está nos slots sugeridos para esta receita ` +
      `(${recipe.suggestedSlots.join(', ')}).`
    );
  }

  return w;
}

// ─────────────────────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resultado de scaleRecipe.
 *
 * @typedef {object} ScaleResult
 * @property {string}   recipeId          - ID da receita
 * @property {string}   recipeName        - Nome da receita
 * @property {object[]} scaledIngredients - Ingredientes escalados
 * @property {object}   totals            - { kcal, prot, carb, fat } reais
 * @property {object}   target            - { kcal, prot, carb, fat } alvo
 * @property {object}   deltas            - { kcal, prot, carb, fat } = totals - target
 * @property {FitScore} fitScore          - Código de encaixe
 * @property {string}   fitLabel          - Texto do encaixe para exibição
 * @property {boolean}  slotCompatible    - true se o slot passado em options está em suggestedSlots
 * @property {string[]} warnings          - Avisos práticos sobre o encaixe
 */

/**
 * Escala uma receita da biblioteca para aproximar as macros de uma
 * refeição-alvo, respeitando os limites práticos de cada ingrediente.
 *
 * @param {object}  recipe               - Objeto de RECIPES (recipes.js)
 * @param {object}  targetMeal           - { kcal, prot?, carb?, fat? }
 * @param {object}  [options]            - { slot?: string }
 * @returns {ScaleResult}
 */
export function scaleRecipe(recipe, targetMeal, options = {}) {
  const {
    kcal: targetKcal,
    prot: targetProt = 0,
    carb: targetCarb = 0,
    fat:  targetFat  = 0,
  } = targetMeal;

  const { slot } = options;

  // ── Factor de escala ────────────────────────────────────────────────────────
  // Recalcula baseKcal dos defaultGrams reais (mais robusto que recipe.baseKcal)
  const baseKcal = computeBaseKcal(recipe.ingredients) || recipe.baseKcal || 1;
  const factor   = targetKcal / baseKcal;

  // ── Escalar ingredientes ────────────────────────────────────────────────────
  const scaledIngredients = recipe.ingredients.map(ing => {
    // scalePriority 1-2 = escaláveis; 3+ = fixos na quantidade padrão
    const isScalable = ing.scalePriority <= 2;
    const rawGrams   = isScalable ? ing.defaultGrams * factor : ing.defaultGrams;

    // Snap para valor prático
    const snapped    = practicalSnap(ing.foodId, rawGrams);

    // Clamp a [minGrams, maxGrams]
    const finalGrams = Math.min(ing.maxGrams, Math.max(ing.minGrams, snapped));

    // Flags internas de clamp (usadas em buildWarnings, removidas da saída)
    const clampedToMin = snapped < ing.minGrams && ing.minGrams > 0;
    const clampedToMax = snapped > ing.maxGrams;

    const macros = calcFoodMacros(ing.foodId, finalGrams);

    return {
      foodId:        ing.foodId,
      name:          ing.name,
      grams:         finalGrams,
      macros,
      removable:     ing.removable,
      essential:     ing.essential,
      scalePriority: ing.scalePriority,
      // Flags internas para buildWarnings — prefixo _ indica uso interno
      _clampedToMin: clampedToMin,
      _clampedToMax: clampedToMax,
    };
  });

  // ── Totais reais ────────────────────────────────────────────────────────────
  const rawTotals = scaledIngredients.reduce(
    (acc, ing) => ({
      kcal: acc.kcal + ing.macros.kcal,
      prot: acc.prot + ing.macros.prot,
      carb: acc.carb + ing.macros.carb,
      fat:  acc.fat  + ing.macros.fat,
    }),
    { kcal: 0, prot: 0, carb: 0, fat: 0 }
  );

  const totals = {
    kcal: Math.round(rawTotals.kcal),
    prot: Math.round(rawTotals.prot * 10) / 10,
    carb: Math.round(rawTotals.carb * 10) / 10,
    fat:  Math.round(rawTotals.fat  * 10) / 10,
  };

  // ── Deltas ──────────────────────────────────────────────────────────────────
  const deltas = {
    kcal: totals.kcal - targetKcal,
    prot: Math.round((totals.prot - targetProt) * 10) / 10,
    carb: Math.round((totals.carb - targetCarb) * 10) / 10,
    fat:  Math.round((totals.fat  - targetFat)  * 10) / 10,
  };

  // ── Classificação e warnings ─────────────────────────────────────────────────
  const fitScore = classifyFit(deltas.kcal, deltas.prot);
  const fitLabel = FIT_LABELS[fitScore];

  const warnings = buildWarnings({
    scaledIngredients,
    kcalDelta:  deltas.kcal,
    protDelta:  deltas.prot,
    targetProt,
    recipe,
    slot,
  });

  // ── Compatibilidade com o slot ───────────────────────────────────────────────
  const slotCompatible = !slot || (recipe.suggestedSlots || []).includes(slot);

  // Remove flags internas antes de devolver (não devem vazar para a UI)
  const publicIngredients = scaledIngredients.map(({ _clampedToMin, _clampedToMax, ...rest }) => rest);

  return {
    recipeId:          recipe.id,
    recipeName:        recipe.name,
    scaledIngredients: publicIngredients,
    totals,
    target: {
      kcal: targetKcal,
      prot: targetProt,
      carb: targetCarb,
      fat:  targetFat,
    },
    deltas,
    fitScore,
    fitLabel,
    slotCompatible,
    warnings,
  };
}

/**
 * Utilitário: procura uma receita na biblioteca pelo id.
 * Evita que os chamadores importem RECIPES separadamente para casos simples.
 *
 * @param {string} id
 * @returns {object|undefined}
 */
export function findRecipe(id) {
  return RECIPES.find(r => r.id === id);
}
