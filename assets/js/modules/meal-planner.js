/**
 * MEAL PLANNER — gera o plano de 14 dias
 * =============================================================================
 * Estratégia:
 *  1. Para cada slot (breakfast, shake_morning, ...), ranqueia templates
 *     por perfil do utilizador.
 *  2. Rotaciona entre 2-3 templates por slot ao longo dos 14 dias
 *     (evita monotonia sem complexidade gastronómica excessiva).
 *  3. Escala cada template para atingir a meta calórica daquele slot,
 *     mantendo proporção original entre ingredientes.
 *  4. Arredonda quantidades para valores práticos.
 * =============================================================================
 */

import { MEAL_TEMPLATES, rankTemplatesByProfile } from '../data/meal-templates.js';
import { FOODS, calcFoodMacros, formatQty } from '../data/foods.js';
import { SLOT_LABEL } from './day-schedule.js';

const DAY_NAMES = [
  'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira',
  'Sexta-feira', 'Sábado', 'Domingo',
  'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira',
  'Sexta-feira', 'Sábado', 'Domingo',
];

// ─── Porções práticas ────────────────────────────────────────────────────────
// Funções que garantem que o plano exibe (e calcula) quantidades reais e
// práticas, sem frações ou gramas impossíveis de pesar no dia a dia.
// Cada quantidade exibida é calculada a partir dos gramas reais — nunca
// existe divergência entre display e macros.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Proteínas pesáveis: requerem piso mínimo (100g) e múltiplos de 10g.
 * Queijos, ovos e whey são excluídos — têm unidade prática própria.
 */
const PROTEIN_PESAVEL = new Set([
  'peito_frango', 'carne_moida', 'peixe_tilapia', 'peixe_pescada',
  'peixe_salmao', 'atum_agua',
]);

/**
 * Hidratos flexíveis: arredonda para múltiplos de 10g.
 * São os melhores candidatos para compensar desvio calórico.
 */
const CARB_FLEX = new Set([
  'arroz_branco_cozido', 'arroz_basmati_cozido', 'macarrao_cozido',
  'aveia_flocos', 'feijao_carioca', 'lentilha', 'pure_batata',
  'polenta', 'cuscuz', 'tapioca',
]);

/** Mínimo prático em gramas por alimento CARB_FLEX. */
const CARB_FLEX_MIN = {
  arroz_branco_cozido: 80, arroz_basmati_cozido: 80,
  macarrao_cozido: 80,      aveia_flocos: 20,
  feijao_carioca: 50,       lentilha: 50,
  pure_batata: 80,          polenta: 80,
  cuscuz: 80,               tapioca: 50,
};

/**
 * Vegetais de baixo impacto calórico: display humanizado ("a gosto" /
 * "1 porção pequena") em vez de gramas. Os macros são mantidos para cálculo.
 */
const VEG_DISPLAY_LOOSE = new Set([
  'salada_mista', 'brocolis', 'abobrinha', 'cenoura',
]);

// ── Predicados ───────────────────────────────────────────────────────────────

/**
 * True se o alimento é baseado em unidade prática (banana, ovo, pão…).
 * Estes alimentos não devem ter piso de proteína aplicado.
 */
function isUnitBasedFood(foodId) {
  const f = FOODS[foodId];
  return !!(f && f.countableUnit);
}

/**
 * True se é vegetal de baixo impacto calórico (display humanizado).
 */
function isLowImpactVegetable(foodId) {
  return VEG_DISPLAY_LOOSE.has(foodId);
}

/**
 * True se o alimento pode ser ajustado proporcionalmente para compensar
 * desvio calórico após o protein floor.
 */
function isFlexibleAdjustmentFood(foodId) {
  return CARB_FLEX.has(foodId);
}

// ── Funções de normalização ───────────────────────────────────────────────────

/**
 * Piso de proteína: garante porção pesável e prática.
 *  <  50g → 50g
 *  50–99g → 100g  (evita 58g, 73g, 84g — porções difíceis de pesar)
 * >=100g  → arredonda para 10g
 */
function applyProteinFloor(grams) {
  if (grams < 50) return 50;
  if (grams < 100) return 100;
  return Math.round(grams / 10) * 10;
}

/**
 * Display humanizado para vegetais de volume livre.
 * Os gramas mantidos no objecto ingredient servem apenas para macros.
 */
function vegDisplay(foodId) {
  if (foodId === 'salada_mista') return 'a gosto';
  return '1 porção pequena';
}

/**
 * Ajusta hidratos flexíveis para absorver desvio calórico.
 * delta = kcalActual - kcalTarget:
 *   delta > 0 → proteína cresceu, reduz carbs para compensar
 *   delta < 0 → proteína shrunk (raro), aumenta carbs
 * Respeitam-se os mínimos de CARB_FLEX_MIN.
 */
function compensateFlexCarbs(ingredients, delta) {
  const flexItems = ingredients.filter(ing => isFlexibleAdjustmentFood(ing.food));
  if (!flexItems.length) return ingredients;

  const flexKcal = flexItems.reduce((s, ing) => s + ing.macros.kcal, 0);

  // kcal mínima total dos flex (limite inferior da redução)
  const minKcal = flexItems.reduce((s, ing) => {
    const minG = CARB_FLEX_MIN[ing.food] || 0;
    return s + calcFoodMacros(ing.food, minG).kcal;
  }, 0);

  const maxReduction = Math.max(0, flexKcal - minKcal);
  const boundedDelta = delta > 0
    ? Math.min(delta, maxReduction)
    : delta; // crescimento sem limite superior

  if (boundedDelta === 0) return ingredients;

  const adjFactor = flexKcal > 0 ? (flexKcal - boundedDelta) / flexKcal : 1;

  return ingredients.map(ing => {
    if (!isFlexibleAdjustmentFood(ing.food)) return ing;
    const minG = CARB_FLEX_MIN[ing.food] || 0;
    const newG = Math.max(minG, Math.round((ing.grams * adjFactor) / 10) * 10);
    if (newG === ing.grams) return ing;
    const macros = calcFoodMacros(ing.food, newG);
    const display = formatQty(ing.food, newG);
    return { ...ing, grams: newG, display, macros };
  });
}

/**
 * Normaliza porções práticas de uma lista de ingredientes já escalados.
 *
 * Passos:
 *  1. Protein floor — aplica piso de 100g (e múltiplo de 10g) a proteínas pesáveis
 *  2. Compensação — reduz hidratos flex para absorver calorias extra
 *  3. Vegetais — substitui display por label humanizado (macros inalterados)
 *
 * Em nenhum momento a quantidade exibida diverge da quantidade calculada
 * (cada alteração de gramas implica recálculo imediato de macros).
 *
 * @param {Array} ingredients - lista de ingredientes escalados
 * @param {number} targetKcal - meta calórica do slot
 * @returns {Array} ingredientes normalizados
 */
function normalizePracticalPortions(ingredients, targetKcal) {
  // 1 ── Protein floor
  let result = ingredients.map(ing => {
    if (!PROTEIN_PESAVEL.has(ing.food)) return ing;
    const floored = applyProteinFloor(ing.grams);
    if (floored === ing.grams) return ing;
    const macros = calcFoodMacros(ing.food, floored);
    const display = formatQty(ing.food, floored);
    return { ...ing, grams: floored, display, macros };
  });

  // 2 ── Compensar desvio calórico
  const actualKcal = result.reduce((s, ing) => s + ing.macros.kcal, 0);
  const delta = actualKcal - targetKcal;
  if (Math.abs(delta) > 40) {
    result = compensateFlexCarbs(result, delta);
  }

  // 3 ── Display humanizado para vegetais de baixo impacto
  result = result.map(ing => {
    if (!isLowImpactVegetable(ing.food)) return ing;
    return { ...ing, display: vegDisplay(ing.food) };
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gera plano de 14 dias.
 * @param {Object} results - resultado de calcAll()
 * @returns {Array<Day>} — 14 dias
 */
export function generatePlan(results) {
  const profile = results.profile.difficulty || 'classico';
  const slotDist = results.slotDistribution;

  // Para cada slot, escolhe 2-3 templates rotativos
  const rotations = {};
  slotDist.forEach(s => {
    const ranked = rankTemplatesByProfile(s.slot, profile);
    // Pega 3 melhores (com fallback para shake extras)
    if (ranked.length) {
      rotations[s.slot] = ranked.slice(0, Math.min(3, ranked.length));
    } else {
      // slot sem template (ex: shake_extra) - usa shake_morning como base
      rotations[s.slot] = rankTemplatesByProfile('shake_morning', profile).slice(0, 2);
    }
  });

  // Monta 14 dias
  const plan = [];
  for (let i = 0; i < 14; i++) {
    const dayMeals = slotDist.map(slot => {
      const templates = rotations[slot.slot];
      // Rotaciona: dia % número de templates
      const template = templates[i % templates.length];
      return scaleMeal(template, slot.kcal, slot.time, slot.slot, slot.displayLabel);
    });

    const totals = dayMeals.reduce((acc, m) => ({
      kcal: acc.kcal + m.totals.kcal,
      prot: acc.prot + m.totals.prot,
      carb: acc.carb + m.totals.carb,
      fat: acc.fat + m.totals.fat,
    }), { kcal: 0, prot: 0, carb: 0, fat: 0 });

    plan.push({
      dayIndex: i,
      dayName: DAY_NAMES[i],
      meals: dayMeals,
      totals: {
        kcal: Math.round(totals.kcal),
        prot: Math.round(totals.prot),
        carb: Math.round(totals.carb),
        fat: Math.round(totals.fat),
      },
    });
  }

  return plan;
}

/**
 * Escala uma receita para atingir a meta calórica do slot.
 * Mantém proporções entre ingredientes.
 */
function scaleMeal(template, targetKcal, time, slotKey, displayLabel) {
  const actualBase = template.items.reduce(
    (sum, item) => sum + calcFoodMacros(item.food, item.grams).kcal, 0
  ) || template.baseKcal;
  const factor = targetKcal / actualBase;

  let ingredients = template.items.map(item => {
    const baseGrams = item.grams;
    let scaled = baseGrams * factor;
    // arredonda de forma prática
    scaled = practicalRound(item.food, scaled);
    let macros = calcFoodMacros(item.food, scaled);
    let label = item.label;
    // Para alimentos countableUnit (frutas, tubérculos): remove adjectivos de tamanho
    // do label do template para evitar conflito com o display ("banana média" + "banana pequena")
    if (FOODS[item.food] && FOODS[item.food].countableUnit) {
      label = label
        .replace(/\b(pequ[ea]n[ao]s?|m[eé]di[ao]s?|grandes?)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    let display = formatQty(item.food, scaled);

    // Ovos: linha principal = preparação; linha secundária = ingrediente com tamanho
    if (item.food === 'ovo_inteiro') {
      const count = Math.round(scaled / 50);
      const totalG = Math.round(scaled);
      const gPerEgg = count > 0 ? totalG / count : 50;
      const adj = gPerEgg <= 45
        ? (count === 1 ? 'pequeno' : 'pequenos')
        : gPerEgg <= 55
          ? (count === 1 ? 'médio' : 'médios')
          : (count === 1 ? 'grande' : 'grandes');
      const eggWord = count === 1 ? 'ovo' : 'ovos';
      // label = preparação (linha em destaque)
      label = count === 1 ? '1 ovo mexido' : `${count} ovos mexidos`;
      // display = ingrediente real com tamanho (linha secundária)
      display = `${count} ${eggWord} inteiros ${adj} sem casca (${totalG}g)`;
    }

    // Whey: nome principal sem quantidade; display com scoop/medidor correcto.
    // practicalRound já garantiu snap para 15g | 30g | 45g | ...
    if (item.food === 'whey') {
      const g = Math.round(scaled);
      const halfUnit = 15; // meio scoop = 15g
      const fullUnit = 30; // 1 scoop = 30g
      const ratio = g / fullUnit;           // 0.5 | 1 | 1.5 | 2 | ...
      let wheyDisplay;
      if (ratio <= 0.5) {
        wheyDisplay = `meio scoop/medidor (${g}g)`;
      } else if (ratio === 1) {
        wheyDisplay = `1 scoop/medidor (${g}g)`;
      } else if (ratio === 1.5) {
        wheyDisplay = `1 scoop e meio/medidor (${g}g)`;
      } else if (Number.isInteger(ratio)) {
        wheyDisplay = `${ratio} scoops/medidor (${g}g)`;
      } else {
        // fallback improvável (ratio não inteiro e não .5): exibe em gramas
        wheyDisplay = `${g}g`;
      }
      label = 'Proteína whey';
      display = wheyDisplay;
      // Recalcula macros com os gramas reais (snap pode ter alterado)
      macros = calcFoodMacros(item.food, g);
      scaled = g;
    }

    return {
      food: item.food,
      label,
      grams: scaled,
      display,
      macros,
    };
  });

  // Normaliza porções práticas (protein floor, compensação calórica, vegetais)
  ingredients = normalizePracticalPortions(ingredients, targetKcal);

  const totals = ingredients.reduce((acc, ing) => ({
    kcal: acc.kcal + ing.macros.kcal,
    prot: acc.prot + ing.macros.prot,
    carb: acc.carb + ing.macros.carb,
    fat: acc.fat + ing.macros.fat,
  }), { kcal: 0, prot: 0, carb: 0, fat: 0 });

  return {
    templateId: template.id,
    slot: slotKey,
    slotLabel: displayLabel || SLOT_LABEL[slotKey] || template.name,
    type: template.type,
    name: template.name,
    time: timeRange(time, template.type === 'solid' ? 60 : 30),
    ingredients,
    steps: template.steps,
    note: template.note,
    totals: {
      kcal: Math.round(totals.kcal),
      prot: Math.round(totals.prot * 10) / 10,
      carb: Math.round(totals.carb * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
    },
  };
}

/**
 * Arredonda para valor prático baseado no tipo de alimento.
 */
function practicalRound(foodId, grams) {
  const f = FOODS[foodId];
  if (!f) return Math.round(grams);

  // ovos: snap para múltiplos de 50g (1 ovo = 50g), mínimo 1 ovo
  if (foodId === 'ovo_inteiro') {
    return Math.max(50, Math.round(grams / 50) * 50);
  }

  // whey: snap para múltiplos de 15g (meio scoop=15g · 1 scoop=30g · 1 e meio=45g)
  if (foodId === 'whey') {
    return Math.max(15, Math.round(grams / 15) * 15);
  }

  // proteínas pesáveis: múltiplos de 10g (piso aplicado depois em scaleMeal)
  if (PROTEIN_PESAVEL.has(foodId)) {
    return Math.round(grams / 10) * 10;
  }

  // hidratos flexíveis: múltiplos de 10g
  if (CARB_FLEX.has(foodId)) {
    return Math.round(grams / 10) * 10;
  }

  // líquidos: arredonda para 10ml
  if (f.category === 'dairy') {
    return Math.max(20, Math.round(grams / 10) * 10);
  }
  // especiarias/extras leves: arredonda fino
  if (f.category === 'extra' && grams < 20) {
    return Math.max(1, Math.round(grams));
  }
  // pequenas quantidades (gorduras): arredonda para 2g
  if (grams < 30) {
    return Math.max(3, Math.round(grams / 2) * 2);
  }
  // médias: arredonda para 5g
  if (grams < 100) {
    return Math.round(grams / 5) * 5;
  }
  // grandes: arredonda para 10g
  return Math.round(grams / 10) * 10;
}

/**
 * Gera o intervalo de horário: "07:00 - 08:00"
 */
function timeRange(start, durationMinutes) {
  if (!start) return '';
  const [h, m] = start.split(':').map(Number);
  const endMinutes = h * 60 + m + durationMinutes;
  const eh = Math.floor(endMinutes / 60) % 24;
  const em = endMinutes % 60;
  const pad = n => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)} - ${pad(eh)}:${pad(em)}`;
}

/**
 * Retorna totais agregados (média) do plano.
 */
export function planAverages(plan) {
  const avg = plan.reduce((acc, day) => ({
    kcal: acc.kcal + day.totals.kcal,
    prot: acc.prot + day.totals.prot,
    carb: acc.carb + day.totals.carb,
    fat: acc.fat + day.totals.fat,
  }), { kcal: 0, prot: 0, carb: 0, fat: 0 });

  return {
    kcal: Math.round(avg.kcal / plan.length),
    prot: Math.round(avg.prot / plan.length),
    carb: Math.round(avg.carb / plan.length),
    fat: Math.round(avg.fat / plan.length),
  };
}
