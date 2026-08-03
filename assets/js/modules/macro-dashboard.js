import { formatKcal } from './calculator.js';

const MACRO_CONFIG = [
  { key: 'protein', label: 'Proteina', factor: 4 },
  { key: 'carb', label: 'Carboidratos', factor: 4 },
  { key: 'fat', label: 'Gorduras', factor: 9 },
];

const DASHBOARD_GEOMETRY = {
  radius: 54,
  gap: 4,
};

function toSafeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toNonNegativeNumber(value) {
  return Math.max(0, toSafeNumber(value));
}

function roundToOne(value) {
  return Math.round(toSafeNumber(value) * 10) / 10;
}

function formatGrams(value) {
  const rounded = roundToOne(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function normalizeMacroPercentages(macros, totalKcal) {
  if (totalKcal <= 0) {
    return macros.map(macro => ({ ...macro, pctExact: 0, pctDisplay: 0 }));
  }

  const withExact = macros.map(macro => {
    const pctExact = (macro.kcal / totalKcal) * 100;
    return { ...macro, pctExact };
  });

  const basePercents = withExact.map(macro => Math.floor(macro.pctExact));
  const remainder = Math.max(0, 100 - basePercents.reduce((sum, value) => sum + value, 0));
  const orderedIndexes = withExact
    .map((macro, index) => ({ index, fraction: macro.pctExact - basePercents[index] }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let i = 0; i < remainder; i += 1) {
    const target = orderedIndexes[i % orderedIndexes.length];
    basePercents[target.index] += 1;
  }

  return withExact.map((macro, index) => ({ ...macro, pctDisplay: basePercents[index] }));
}

function buildRingSegments(macros) {
  const circumference = 2 * Math.PI * DASHBOARD_GEOMETRY.radius;
  const active = macros.filter(macro => macro.kcal > 0);
  if (!active.length) return { circumference, segments: [] };

  const gapCount = active.length;
  const usableCircumference = Math.max(0, circumference - (DASHBOARD_GEOMETRY.gap * gapCount));
  let cursor = 0;

  const segments = macros.map(macro => {
    if (macro.kcal <= 0 || macro.pctExact <= 0) {
      return { key: macro.key, length: 0, offset: 0 };
    }

    const length = (macro.pctExact / 100) * usableCircumference;
    const segment = {
      key: macro.key,
      length,
      offset: -cursor,
    };
    cursor += length + DASHBOARD_GEOMETRY.gap;
    return segment;
  });

  return { circumference, segments };
}

export function buildMacroDashboardModel(results) {
  const macrosBase = MACRO_CONFIG.map(config => {
    const grams = toNonNegativeNumber(results?.[config.key]?.grams);
    const kcal = Math.round(grams * config.factor);
    return {
      key: config.key,
      label: config.label,
      grams,
      kcal,
      factor: config.factor,
    };
  });

  const totalMacroKcal = macrosBase.reduce((sum, macro) => sum + macro.kcal, 0);
  const totalCalories = Math.round(toNonNegativeNumber(results?.calories)) || totalMacroKcal;

  const macros = normalizeMacroPercentages(macrosBase, totalMacroKcal || totalCalories);
  const ring = buildRingSegments(macros);

  const ariaLabel = `Meta diaria de ${totalCalories} calorias: ${macros.map(macro => `${formatGrams(macro.grams)} gramas de ${macro.label.toLowerCase()}`).join(', ')}.`;

  return {
    totalCalories,
    totalMacroKcal,
    ariaLabel,
    circumference: ring.circumference,
    macros: macros.map(macro => ({
      ...macro,
      gramsDisplay: formatGrams(macro.grams),
      kcalDisplay: formatKcal(macro.kcal),
    })),
    ringSegments: ring.segments,
  };
}

export function renderMacroDashboard(results, { variant = 'complete' } = {}) {
  const model = buildMacroDashboardModel(results);
  const rowsMarkup = model.macros.map(macro => `
    <div class="macro-dashboard__row" data-macro-row="${macro.key}">
      <div class="macro-dashboard__row-head">
        <div class="macro-dashboard__row-title">
          <span class="macro-dashboard__swatch macro-dashboard__swatch--${macro.key}" aria-hidden="true"></span>
          <span>${macro.label}</span>
        </div>
        <div class="macro-dashboard__row-grams">${macro.gramsDisplay} g</div>
      </div>
      <div class="macro-dashboard__row-meta">
        <span class="macro-dashboard__row-kcal">${macro.kcalDisplay} kcal</span>
        <span class="macro-dashboard__row-pct">${macro.pctDisplay}%</span>
      </div>
      <div class="macro-dashboard__bar" aria-hidden="true">
        <div
          class="macro-dashboard__bar-fill macro-dashboard__bar-fill--${macro.key}"
          style="--macro-fill:${macro.pctExact.toFixed(3)}%;"
        ></div>
      </div>
    </div>
  `).join('');

  const segmentsMarkup = model.macros.map(macro => {
    const segment = model.ringSegments.find(item => item.key === macro.key) || { length: 0, offset: 0 };
    return `
      <circle
        class="macro-dashboard__segment macro-dashboard__segment--${macro.key}"
        data-macro-segment="${macro.key}"
        cx="60"
        cy="60"
        r="${DASHBOARD_GEOMETRY.radius}"
        pathLength="${model.circumference}"
        style="--segment-length:${segment.length}; --segment-offset:${segment.offset}; --circumference:${model.circumference};"
      ></circle>
    `;
  }).join('');

  return `
    <section
      class="macro-dashboard macro-dashboard--${variant}"
      data-macro-dashboard="${variant}"
    >
      <div class="macro-dashboard__visual">
        <svg
          class="macro-dashboard__ring"
          data-macro-ring
          viewBox="0 0 120 120"
          role="img"
          aria-label="${model.ariaLabel}"
        >
          <circle class="macro-dashboard__track" cx="60" cy="60" r="${DASHBOARD_GEOMETRY.radius}"></circle>
          ${segmentsMarkup}
        </svg>
        <div class="macro-dashboard__center">
          <div class="macro-dashboard__eyebrow">Meta diaria</div>
          <div class="macro-dashboard__kcal macro-val">${formatKcal(model.totalCalories)}<span class="macro-dashboard__unit macro-unit">kcal/dia</span></div>
        </div>
      </div>
      <div class="macro-dashboard__rows">
        ${rowsMarkup}
      </div>
    </section>
  `;
}
