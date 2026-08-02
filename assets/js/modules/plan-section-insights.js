function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
}

export function renderInsightStatCards(stats, { testId = '', className = '' } = {}) {
  if (!Array.isArray(stats) || !stats.length) return '';
  const classes = ['plan-insights__stats', className].filter(Boolean).join(' ');

  return `
    <div class="${classes}" data-testid="${testId || 'plan-insight-stats'}">
      ${stats.map((stat) => `
        <div class="plan-insights__stat-card plan-insights__stat-card--${stat.tone || 'neutral'}">
          <div class="plan-insights__stat-label">${stat.label}</div>
          <div class="plan-insights__stat-value">${stat.value}</div>
          ${stat.meta ? `<div class="plan-insights__stat-meta">${stat.meta}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

export function renderInsightBars(rows, { testId = '', className = '' } = {}) {
  if (!Array.isArray(rows) || !rows.length) return '';
  const classes = ['plan-insights__bars', className].filter(Boolean).join(' ');

  return `
    <div class="${classes}" data-testid="${testId || 'plan-insight-bars'}">
      ${rows.map((row) => `
        <div class="plan-insights__bar-row" data-tone="${row.tone || 'neutral'}">
          <div class="plan-insights__bar-head">
            <div class="plan-insights__bar-copy">
              <div class="plan-insights__bar-label">${row.label}</div>
              ${row.meta ? `<div class="plan-insights__bar-meta">${row.meta}</div>` : ''}
            </div>
            <div class="plan-insights__bar-value">${row.value}</div>
          </div>
          <div class="plan-insights__bar-track" aria-hidden="true">
            <div class="plan-insights__bar-fill" style="--plan-bar-fill:${clampPercent(row.percent).toFixed(3)}%;"></div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

export function renderInsightTimeline(steps, { testId = '', className = '' } = {}) {
  if (!Array.isArray(steps) || !steps.length) return '';
  const classes = ['plan-insights__timeline', className].filter(Boolean).join(' ');

  return `
    <ol class="${classes}" data-testid="${testId || 'plan-insight-timeline'}">
      ${steps.map((step, index) => `
        <li class="plan-insights__timeline-step">
          <div class="plan-insights__timeline-badge">${index + 1}</div>
          <div class="plan-insights__timeline-card">
            <div class="plan-insights__timeline-title">${step.title}</div>
            <div class="plan-insights__timeline-body">${step.body}</div>
            ${step.meta ? `<div class="plan-insights__timeline-meta">${step.meta}</div>` : ''}
          </div>
        </li>
      `).join('')}
    </ol>
  `;
}

export function renderInsightPrincipleCards(items, { testId = '', className = '' } = {}) {
  if (!Array.isArray(items) || !items.length) return '';
  const classes = ['plan-insights__principles', className].filter(Boolean).join(' ');

  return `
    <div class="${classes}" data-testid="${testId || 'plan-insight-principles'}">
      ${items.map((item) => `
        <article class="plan-insights__principle-card plan-insights__principle-card--${item.tone || 'neutral'}">
          <div class="plan-insights__principle-title">${item.title}</div>
          <div class="plan-insights__principle-body">${item.body}</div>
        </article>
      `).join('')}
    </div>
  `;
}
