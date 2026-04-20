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

const DAY_NAMES = [
  'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira',
  'Sexta-feira', 'Sábado', 'Domingo',
  'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira',
  'Sexta-feira', 'Sábado', 'Domingo',
];

const SLOT_LABEL = {
  breakfast: 'Café da Manhã',
  shake_morning: 'Shake da Manhã',
  lunch: 'Almoço',
  shake_afternoon: 'Shake da Tarde',
  dinner: 'Jantar',
  shake_night: 'Shake da Ceia',
  shake_extra: 'Shake Extra',
  shake_extra2: 'Shake Extra 2',
};

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
      return scaleMeal(template, slot.kcal, slot.time, slot.slot);
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
function scaleMeal(template, targetKcal, time, slotKey) {
  const factor = targetKcal / template.baseKcal;

  const ingredients = template.items.map(item => {
    const baseGrams = item.grams;
    let scaled = baseGrams * factor;
    // arredonda de forma prática
    scaled = practicalRound(item.food, scaled);
    const macros = calcFoodMacros(item.food, scaled);
    return {
      food: item.food,
      label: item.label,
      grams: scaled,
      display: formatQty(item.food, scaled),
      macros,
    };
  });

  const totals = ingredients.reduce((acc, ing) => ({
    kcal: acc.kcal + ing.macros.kcal,
    prot: acc.prot + ing.macros.prot,
    carb: acc.carb + ing.macros.carb,
    fat: acc.fat + ing.macros.fat,
  }), { kcal: 0, prot: 0, carb: 0, fat: 0 });

  return {
    templateId: template.id,
    slot: slotKey,
    slotLabel: SLOT_LABEL[slotKey] || template.name,
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
