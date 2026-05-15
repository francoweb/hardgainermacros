/**
 * PAGE — Resultados (Etapa 4)
 * =============================================================================
 * Mostra:
 *  - 4 cards de macros (kcal, proteína, carbo, gordura)
 *  - TMB, TDEE, Superávit com meta semanal
 *  - Interpretação do perfil (tags + explicação)
 *  - Sistema Híbrido recomendado (n sólidas + n shakes)
 *  - Distribuição diária de macros por refeição (Visual / Tabela)
 *  - Recomendações personalizadas
 *  - Botão "Ver Plano Alimentar de 14 Dias"
 * =============================================================================
 */

import { icons } from '../modules/icons.js';
import { navigate, markProgress } from '../modules/router.js';
import {
  loadResults, loadProfile, loadRoutine, loadFormData,
  savePlan,
  K,
} from '../modules/storage.js';
import { formatKcal } from '../modules/calculator.js';
import { generatePlan } from '../modules/meal-planner.js';

const SLOT_LABEL = {
  breakfast: 'Café da Manhã',
  shake_morning: 'Shake Bomba Calórica',
  lunch: 'Almoço',
  shake_afternoon: 'Shake Energia Instantânea',
  dinner: 'Jantar',
  shake_night: 'Shake Crescimento Noturno',
  shake_extra: 'Shake Extra',
  shake_extra2: 'Shake Extra 2',
  pre_workout_light: 'Shake Pré-Treino Leve',
  post_workout_night: 'Shake Pós-Treino Leve Antes de Dormir',
};

const getDisplayMealLabel = (slot, time, nocturnal = false, strategy = 'hybrid', trainEndTime = null) => {
  // Refeição sólida logo após o treino (até 60 min depois do fim)
  if (trainEndTime && time && !slot.startsWith('shake')) {
    const toM = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const diff = ((toM(time) - toM(trainEndTime)) + 1440) % 1440;
    if (diff <= 60) return 'Refeição Pós-Treino';
  }
  if (nocturnal) {
    if (slot === 'breakfast')   return 'Primeira Refeição';
    if (slot === 'shake_night') return 'Shake Pré-Sono';
    if ((slot === 'lunch' || slot === 'dinner') && time) {
      const h = parseInt(time.split(':')[0], 10);
      if (h >= 7  && h < 12) return 'Refeição da Manhã';
      if (h >= 12 && h < 17) return 'Almoço';
      if (h >= 17 && h < 23) return 'Jantar';
    }
    if (slot === 'lunch')  return 'Refeição Intercalar';
    if (slot === 'dinner') return 'Refeição Principal';
  }
  // Shakes de apoio (strategy solid): label por horário
  if (strategy === 'solid' && slot.startsWith('shake')) {
    if (time) {
      const h = parseInt(time.split(':')[0], 10);
      if (h >= 5  && h < 12) return 'Shake de Apoio da Manhã';
      if (h >= 12 && h < 18) return 'Shake de Apoio da Tarde';
      if (h >= 18 && h < 22) return 'Shake de Apoio do Fim do Dia';
    }
    return 'Shake de Apoio Noturno';
  }
  if (time) {
    const h = parseInt(time.split(':')[0], 10);
    if (slot === 'lunch'     && h < 11)  return 'Refeição da Manhã';
    if (slot === 'dinner'    && h < 17)  return 'Refeição da Tarde';
    if (slot === 'lunch'     && h >= 16) return 'Refeição da Tarde';
    if (slot === 'breakfast' && h >= 12) return 'Primeira Refeição';
  }
  return SLOT_LABEL[slot] || slot;
};

const DIFFICULTY_LABEL = {
  classico: 'Hardgainer Clássico',
  apetite_baixo: 'Apetite Baixo',
  ultra_acelerado: 'Ultra Acelerado',
  volume_baixo: 'Volume Baixo',
  rotina_corrida: 'Rotina Corrida',
  falta_consistencia: 'Falta de Consistência',
};

const ACTIVITY_LABEL = {
  sedentary: 'Sedentário',
  light: 'Levemente Ativo',
  moderate: 'Moderadamente Ativo',
  active: 'Muito Ativo',
  very_active: 'Extremamente Ativo',
};

const STRATEGY_LABEL = {
  solid: 'Mais Sólidas',
  hybrid: 'Sistema Híbrido',
  practical: 'Máxima Praticidade',
};

export function renderResultadosPage(mount) {
  const results = loadResults();
  if (!results) { navigate('/'); return; }

  const profile = results.profile || loadProfile() || {};
  const routine = results.routine || loadRoutine() || {};
  const formData = loadFormData() || {};

  const solidCount = (results.slotDistribution || []).filter(s => s.type === 'solid').length;
  const shakeCount = (results.slotDistribution || []).filter(s => s.type === 'shake').length;
  const totalMeals = routine.mealsPerDay || (solidCount + shakeCount) || 6;
  const strategy = routine.strategy || 'hybrid';
  const solidLabel = solidCount === 1 ? 'refeição sólida' : 'refeições sólidas';
  const shakeLabel = shakeCount === 1
    ? (strategy === 'solid' ? 'shake de apoio' : 'shake anabólico')
    : (strategy === 'solid' || strategy === 'practical' ? 'shakes de apoio' : 'shakes anabólicos');
  // Tags de interpretação
  const tags = buildTags(profile, routine, results);

  // Interpretação textual
  const interpretation = buildInterpretation(profile, routine, results, formData);
  // Ficha resumo de perfil
  const profileSummary = buildProfileSummary(formData, profile, routine, results);

  // Recomendações personalizadas
  const recommendations = buildRecommendations(profile, routine, results);

  const TRAIN_TIME_LABEL = { morning: 'Manhã', afternoon: 'Tarde', evening: 'Noite', dawn: 'Madrugada' };
  const inferPeriod = t => { if (!t) return null; const [h, m] = t.split(':').map(Number); const mins = h*60+m; return mins<360?'dawn':mins<840?'morning':mins<1080?'afternoon':'evening'; };
  const hasTraining = !!(routine.trainDays > 0 && routine.trainStartTime && routine.trainEndTime);
  const trainPeriod = inferPeriod(routine.trainStartTime);
  const trainLabel = TRAIN_TIME_LABEL[trainPeriod] || '';
  const trainTimeDisplay = routine.trainStartTime && routine.trainEndTime
    ? `${routine.trainStartTime} – ${routine.trainEndTime}`
    : trainLabel;
  const trainDurDisplay = routine.trainDurationMinutes ? `${routine.trainDurationMinutes} min` : '';
  const _toMins = t => { if (!t) return Infinity; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const scheduleData = rebuildTimesAroundTraining(results.slotDistribution || [], routine);
  const spacingFeedback = scheduleData.spacingFeedback;
  const _seqSource = (scheduleData.slots && scheduleData.slots.length > 0) ? scheduleData.slots : (results.slotDistribution || []);
  const sequenceHtml = _seqSource.map((s, i, arr) => {
    const chip = s.type === 'solid'
      ? `<span class="hybrid-seq-chip solid">${icons.utensils(13)} Sólida</span>`
      : `<span class="hybrid-seq-chip shake">${icons.droplet(13)} Shake</span>`;
    const arrow = i < arr.length - 1 ? '<span class="hybrid-seq-arrow">›</span>' : '';
    return chip + arrow;
  }).join('');
  const slotsWithTraining = (() => {
    const corrected = scheduleData.slots;
    if (!hasTraining) return corrected;
    const entry = { slot: '__train__', type: 'train', kcal: null, time: routine.trainStartTime || '' };
    if (!routine.trainStartTime) return [...corrected, entry];
    const wakeM = routine.sleepEndTime ? _toMins(routine.sleepEndTime) : 420;
    let sleepM = routine.sleepStartTime ? _toMins(routine.sleepStartTime) : 1380;
    if (sleepM <= wakeM) sleepM += 1440;
    const normM = m => (sleepM > 1440 && m < wakeM && (m + 1440) <= sleepM) ? m + 1440 : m;
    const tm = normM(_toMins(routine.trainStartTime));
    let idx = corrected.length;
    for (let i = 0; i < corrected.length; i++) { if (normM(_toMins(corrected[i].time)) > tm) { idx = i; break; } }
    return [...corrected.slice(0, idx), entry, ...corrected.slice(idx)];
  })();

  const wakeMin = routine.sleepEndTime ? _toMins(routine.sleepEndTime) : 420;
  const sleepStartMin = routine.sleepStartTime ? _toMins(routine.sleepStartTime) : 1380;
  const nocturnal = wakeMin >= 1140
    || (sleepStartMin >= 600 && sleepStartMin <= 1140 && wakeMin <= 360)
    || (sleepStartMin > 1140 && wakeMin <= 180);

  const sectionTitle = strategy === 'solid' ? 'Plano Mais Sólido Recomendado'
    : strategy === 'practical' ? 'Plano de Máxima Praticidade'
    : 'Sistema Híbrido Recomendado';
  const sectionExplain = strategy === 'solid'
    ? (shakeCount === 0
      ? 'Refeições sólidas são a base deste plano. Elas dão mais saciedade, ajudam na qualidade da alimentação e combinam melhor com quem prefere comer de forma tradicional. Como este cenário usa apenas refeições sólidas, organize bem os horários para não deixar comida demais para o final do dia.'
      : 'Refeições sólidas são a base do plano. Fornecem mais saciedade, nutrição completa e são ideais para quem prefere comer de forma tradicional. Os shakes entram apenas como apoio quando necessário, sem dominar o dia.')
    : strategy === 'practical'
    ? 'Shakes frequentes reduzem o tempo de preparo e facilitam bater as calorias do dia. As refeições sólidas garantem a nutrição base nos momentos principais.'
    : 'Shakes anabólicos garantem calorias e proteína sem sensação de peso — essencial para quem tem apetite reduzido ou rotina corrida. Alternar com refeições sólidas mantém a saciedade e a ingestão de micronutrientes ao longo do dia.';
  const hintInterval = strategy === 'solid'
    ? 'Intervalo sugerido: 3 a 4h entre refeições sólidas. Com pratos mais volumosos, o estômago precisa de mais tempo antes do próximo prato.'
    : strategy === 'practical'
    ? 'Os shakes podem ser consumidos com menos intervalo que as refeições sólidas. Use 2h a 2h30 entre shakes e pelo menos 3h antes de uma refeição sólida.'
    : '2h30 a 3h entre refeições. O líquido digere mais rápido e evita que o próximo prato chegue com o estômago ainda cheio.';

  const planDistributionText = strategy === 'solid'
    ? `Você escolheu ${totalMeals} refeições por dia com foco em mais refeições sólidas. A app organizou o plano como ${solidCount} ${solidLabel}${shakeCount > 0 ? ` + ${shakeCount} ${shakeLabel}` : ''}, priorizando saciedade, mastigação e uma estrutura mais tradicional ao longo do dia.`
    : strategy === 'practical'
    ? `Você escolheu ${totalMeals} refeições por dia com foco em máxima praticidade. A app organizou o plano como ${solidCount} ${solidLabel} + ${shakeCount} ${shakeLabel}, usando mais shakes de apoio para facilitar bater calorias sem transformar o dia numa maratona de cozinha.`
    : `Você escolheu ${totalMeals} refeições por dia no Sistema Híbrido. A app organizou o plano como ${solidCount} ${solidLabel} + ${shakeCount} ${shakeLabel}, equilibrando refeições sólidas e shakes anabólicos para facilitar o superávit calórico sem pesar tanto na digestão.`;

  const computedLabels = slotsWithTraining.map(s =>
    s.slot === '__train__' ? null
    : s._morningPostWorkout ? 'Café da Manhã Pós-Treino'
    : getDisplayMealLabel(s.slot, s.time, nocturnal, strategy, routine.trainEndTime || null)
  );
  const _seenLabels = {};
  const dedupedLabels = computedLabels.map(label => {
    if (!label) return null;
    _seenLabels[label] = (_seenLabels[label] || 0) + 1;
    if (label === 'Almoço' && _seenLabels[label] > 1) return 'Refeição da Tarde';
    return label;
  });

  mount.innerHTML = `
    <div class="container">
      <div class="results-hero">
        <h1 class="hero-title">Seu Plano Personalizado</h1>
        <p class="hero-sub">Baseado no Sistema de Alimentação Híbrida para Hardgainers</p>
      </div>

      <div class="btn-row">
        <button type="button" class="btn btn-ghost" id="btn-back-top">← Voltar e ajustar rotina</button>
      </div>

      <!-- Macro cards -->
      <div class="macro-grid">
        <div class="macro-card cal">
          <div class="macro-head">
            <span class="macro-dot"><img src="/assets/img/macro-icons/calorias.webp" alt="Calorias"></span>
            <span>Calorias</span>
          </div>
          <div class="macro-val">${formatKcal(results.calories)}<span class="macro-unit">kcal/dia</span></div>
          <div class="macro-bar"><div class="macro-bar-fill" style="width: 100%; background: var(--cal-color);"></div></div>
        </div>
        <div class="macro-card protein">
          <div class="macro-head">
            <span class="macro-dot"><img src="/assets/img/macro-icons/proteina.webp" alt="Proteína"></span>
            <span>Proteína</span>
          </div>
          <div class="macro-val">${results.protein.grams}g<span class="macro-unit">${results.protein.pct}% • ${formatKcal(results.protein.kcal)} kcal</span></div>
          <div class="macro-bar"><div class="macro-bar-fill" style="width: ${results.protein.pct * 2}%; background: var(--protein-color); max-width: 100%;"></div></div>
        </div>
        <div class="macro-card carb">
          <div class="macro-head">
            <span class="macro-dot"><img src="/assets/img/macro-icons/carboidratos.webp" alt="Carboidratos"></span>
            <span>Carboidratos</span>
          </div>
          <div class="macro-val">${results.carb.grams}g<span class="macro-unit">${results.carb.pct}% • ${formatKcal(results.carb.kcal)} kcal</span></div>
          <div class="macro-bar"><div class="macro-bar-fill" style="width: ${results.carb.pct * 1.5}%; background: var(--carb-color); max-width: 100%;"></div></div>
        </div>
        <div class="macro-card fat">
          <div class="macro-head">
            <span class="macro-dot"><img src="/assets/img/macro-icons/gorduras.webp" alt="Gorduras"></span>
            <span>Gorduras</span>
          </div>
          <div class="macro-val">${results.fat.grams}g<span class="macro-unit">${results.fat.pct}% • ${formatKcal(results.fat.kcal)} kcal</span></div>
          <div class="macro-bar"><div class="macro-bar-fill" style="width: ${results.fat.pct * 3}%; background: var(--fat-color); max-width: 100%;"></div></div>
        </div>
      </div>

      <!-- Stats row (TMB / TDEE / Surplus) -->
      <div class="stat-row">
        <div class="stat">
          <div class="stat-label">Metabolismo Basal</div>
          <div class="stat-val">${formatKcal(results.bmr)}</div>
          <div class="stat-desc">kcal em repouso absoluto</div>
        </div>
        <div class="stat">
          <div class="stat-label">Gasto Total (TDEE)</div>
          <div class="stat-val">${formatKcal(results.tdee)}</div>
          <div class="stat-desc">com a sua atividade diária</div>
        </div>
        <div class="stat accent">
          <div class="stat-label">Superávit</div>
          <div class="stat-val">+${formatKcal(results.surplus)}</div>
          <div class="stat-desc">Meta: ${results.weeklyGainLowKg}–${results.weeklyGainHighKg}kg/semana</div>
        </div>
      </div>

      <!-- Perfil interpretation -->
      <div class="card">
        <h3 class="card-title">Análise do Seu Perfil Hardgainer</h3>
        <p class="card-sub" style="margin-bottom: 16px;">Ficha personalizada com base nos dados que você preencheu</p>
        ${profileSummary}
        <div class="tag-row">
          ${tags.map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
        <p class="card-body">${interpretation}</p>
        ${profile.falsoMagro ? `
          <div class="alert" style="margin-top: 14px;">
            <span class="alert-icon">${icons.alertTri(18)}</span>
            <div>
              <strong>Perfil Falso Magro:</strong> superávit reduzido, proteína elevada e foco em carboidratos de digestão leve (arroz branco, batata, pão francês).
              Evite excesso de açúcar simples e priorize refeições sólidas.
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Strategy system -->
      <div class="card">
        <h3 class="card-title">Resumo do Seu Plano Calculado</h3>
        <p class="card-sub">${planDistributionText}</p>
        ${shakeCount > 0 ? `
        <div class="macro-grid macro-grid-2" style="margin-top: 14px;">
          <div class="macro-card">
            <div class="macro-head"><span class="macro-dot">${icons.utensils(16)}</span><span>Refeições Sólidas</span></div>
            <div class="macro-val">${solidCount}<span class="macro-unit">por dia</span></div>
          </div>
          <div class="macro-card">
            <div class="macro-head"><span class="macro-dot">${icons.droplet(16)}</span><span>${strategy === 'solid' || strategy === 'practical' ? 'Shakes de Apoio' : 'Shakes Anabólicos'}</span></div>
            <div class="macro-val">${shakeCount}<span class="macro-unit">por dia</span></div>
          </div>
        </div>
        ` : `
        <div style="margin-top: 14px; display: flex; justify-content: center;">
          <div class="macro-card" style="text-align: center; align-items: center; min-width: 180px; max-width: 260px;">
            <div class="macro-head" style="justify-content: center;"><span class="macro-dot">${icons.utensils(16)}</span><span>Refeições Sólidas</span></div>
            <div class="macro-val">${solidCount}<span class="macro-unit">por dia</span></div>
          </div>
        </div>
        `}
        ${sequenceHtml ? `<div class="hybrid-sequence">${sequenceHtml}</div>` : ''}
        <div class="hybrid-explain">
          <div class="hybrid-explain-label">Por que esse formato?</div>
          <p>${sectionExplain}</p>
        </div>
        <div class="hint" style="margin-top: 14px;">
          <span class="hint-icon">${icons.clock(18)}</span>
          <div><strong>Intervalo ideal:</strong> ${hintInterval}</div>
        </div>
      </div>

      <!-- Macros distribution -->
      <div class="card">
        <h3 class="card-title">Distribuição Diária de Macros</h3>
        ${spacingFeedback ? `
          <div
            style="
              margin: 16px 0 24px;
              padding: 18px 18px 16px;
              border-radius: 18px;
              border-left: 6px solid ${
                spacingFeedback.level === 'success' ? '#16a34a' :
                spacingFeedback.level === 'info' ? '#3b82f6' :
                spacingFeedback.level === 'warning' ? '#d97706' :
                '#dc2626'
              };
              border: 1px solid ${
                spacingFeedback.level === 'success' ? 'rgba(34, 197, 94, .20)' :
                spacingFeedback.level === 'info' ? 'rgba(59, 130, 246, .22)' :
                spacingFeedback.level === 'warning' ? 'rgba(245, 158, 11, .24)' :
                'rgba(239, 68, 68, .22)'
              };
              background: ${
                spacingFeedback.level === 'success' ? 'linear-gradient(135deg, rgba(34, 197, 94, .12), rgba(255,255,255,.96))' :
                spacingFeedback.level === 'info' ? 'linear-gradient(135deg, rgba(59, 130, 246, .08), rgba(239,246,255,.98))' :
                spacingFeedback.level === 'warning' ? 'linear-gradient(135deg, rgba(250, 204, 21, .14), rgba(255,248,235,.98))' :
                'linear-gradient(135deg, rgba(248, 113, 113, .10), rgba(255,241,242,.98))'
              };
              box-shadow: 0 10px 30px rgba(15, 23, 42, .06);
            "
          >
            <div style="display:flex; gap:14px; align-items:flex-start; flex-wrap:wrap;">
              <div
                style="
                  flex: 0 0 auto;
                  width: 40px;
                  height: 40px;
                  border-radius: 12px;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  background: ${
                    spacingFeedback.level === 'success' ? 'rgba(34, 197, 94, .16)' :
                    spacingFeedback.level === 'info' ? 'rgba(59, 130, 246, .12)' :
                    spacingFeedback.level === 'warning' ? 'rgba(245, 158, 11, .18)' :
                    'rgba(239, 68, 68, .12)'
                  };
                  color: ${
                    spacingFeedback.level === 'success' ? '#15803d' :
                    spacingFeedback.level === 'info' ? '#1d4ed8' :
                    spacingFeedback.level === 'warning' ? '#b45309' :
                    '#b91c1c'
                  };
                "
              >
                ${spacingFeedback.level === 'success'
                  ? '✅'
                  : spacingFeedback.level === 'info'
                    ? 'ℹ️'
                    : spacingFeedback.level === 'warning'
                      ? '⚠️'
                      : '🚨'}
              </div>
              <div style="min-width:0; flex:1 1 260px;">
                <div style="font-size:.78rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase; margin-bottom:8px; color:${
                  spacingFeedback.level === 'success' ? '#166534' :
                  spacingFeedback.level === 'info' ? '#1e3a8a' :
                  spacingFeedback.level === 'warning' ? '#92400e' :
                  '#991b1b'
                };">Diagnóstico Inteligente da Rotina</div>
                <div style="font-size:1.12rem; font-weight:900; line-height:1.3; margin-bottom:8px; color:${
                  spacingFeedback.level === 'success' ? '#166534' :
                  spacingFeedback.level === 'info' ? '#1e3a8a' :
                  spacingFeedback.level === 'warning' ? '#92400e' :
                  '#991b1b'
                };">${spacingFeedback.headline}</div>
                <div style="line-height:1.6; color:var(--ink, #1f2937);">
                  ${spacingFeedback.message}
                </div>
                ${spacingFeedback.detail ? `
                  <details style="margin-top:12px;">
                    <summary style="cursor:pointer; font-weight:700; font-size:.9rem; list-style:none; display:flex; align-items:center; gap:6px; user-select:none; color:${
                      spacingFeedback.level === 'success' ? '#166534' :
                      spacingFeedback.level === 'info' ? '#1e40af' :
                      spacingFeedback.level === 'warning' ? '#a16207' :
                      '#991b1b'
                    };">
                      <span>&#9658;</span> Entenda por que isto acontece
                    </summary>
                    <div style="margin-top:10px; padding-top:10px; border-top:1px solid rgba(0,0,0,.08); font-size:.93rem; line-height:1.7; color:var(--ink, #1f2937);">
                      ${spacingFeedback.detail.split('\n\n').map(p => `<p style="margin:0 0 10px 0;">${p.replace(/\n/g, '<br>')}</p>`).join('')}
                    </div>
                  </details>
                ` : ''}
              </div>
            </div>
          </div>
        ` : ''}
        <div class="tabs" role="tablist">
          <button type="button" class="tab active" data-tab="visual" role="tab">Visual</button>
          <button type="button" class="tab" data-tab="tabela" role="tab">Tabela</button>
        </div>
        <div id="tab-content-visual" class="tab-content">
          <div class="meal-list">
            ${slotsWithTraining.map((s, idx) => s.slot === '__train__' ? `
              <div class="meal-row" style="border-left: 3px solid var(--accent); background: var(--surface);">
                <div class="meal-time">${s.time || trainLabel}</div>
                <div class="meal-name">Treino${routine.trainEndTime ? ' – ' + routine.trainEndTime : ''}</div>
                <span class="meal-tag" style="background:var(--accent);color:#fff;">${trainDurDisplay || trainLabel}</span>
                <div class="meal-macros"><span class="meal-macro-label"></span><span class="meal-macro-val"></span></div>
              </div>
            ` : `
              <div class="meal-row">
                <div class="meal-time">${s.time || ''}</div>
                <div class="meal-name">${dedupedLabels[idx]}</div>
                <span class="meal-tag ${s.type}">${s.type === 'solid' ? 'Sólida' : 'Shake'}</span>
                <div class="meal-macros">
                  <span class="meal-macro-label">kcal</span>
                  <span class="meal-macro-val">${formatKcal(s.kcal)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div id="tab-content-tabela" class="tab-content" style="display:none;">
          <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Refeição</th><th>Tipo</th><th>Horário</th><th style="text-align:right">kcal</th></tr></thead>
            <tbody>
              ${slotsWithTraining.map((s, idx) => s.slot === '__train__' ? `
                <tr style="background:var(--surface);">
                  <td><strong>Treino</strong></td>
                  <td><span style="font-size:.8rem;background:var(--accent);color:#fff;padding:2px 7px;border-radius:4px;">Exercício</span></td>
                  <td>${s.time ? s.time + (routine.trainEndTime ? ' – ' + routine.trainEndTime : '') : trainTimeDisplay}</td>
                  <td style="text-align:right;color:var(--ink-soft);">${trainDurDisplay}</td>
                </tr>
              ` : `
                <tr>
                  <td>${dedupedLabels[idx]}</td>
                  <td>${s.type === 'solid' ? 'Sólida' : 'Shake'}</td>
                  <td>${s.time || ''}</td>
                  <td style="text-align:right">${formatKcal(s.kcal)}</td>
                </tr>
              `).join('')}
              <tr class="tfoot">
                <td colspan="3"><strong>Total</strong></td>
                <td style="text-align:right"><strong>${formatKcal(results.calories)}</strong></td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <!-- Recommendations -->
      <div class="card">
        <h3 class="card-title">Recomendações Para Seu Perfil</h3>
        <ol class="rec-list">
          ${recommendations.map((r, i) => `
            <li class="rec-item">
              <span class="rec-num">${i + 1}</span>
              <div><strong>${r.title}:</strong> ${r.body}</div>
            </li>
          `).join('')}
        </ol>
      </div>

      <!-- Recalibration -->
      <div class="alert">
        <span class="alert-icon">${icons.alertTri(18)}</span>
        <div>
          <strong>Recalibração a cada 2 semanas:</strong> pese-se no mesmo horário,
          de estômago vazio. Se o ganho estiver abaixo da meta, aumente 150-200 kcal.
          Se estiver acima, reduza 100-150 kcal. O metabolismo responde — ajuste sem pressa.
        </div>
      </div>

      <div class="btn-row btn-row-center">
        <button type="button" class="btn btn-primary btn-large" id="btn-plan">
          Ver Plano Alimentar de 14 Dias ${icons.arrowRight(16)}
        </button>
      </div>

      <div class="btn-row btn-row-center">
        <button type="button" class="btn btn-ghost" id="btn-back-bottom">← Voltar e ajustar rotina</button>
      </div>
    </div>
  `;

  // Tabs
  mount.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      mount.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
      document.getElementById('tab-content-visual').style.display = tab === 'visual' ? 'block' : 'none';
      document.getElementById('tab-content-tabela').style.display = tab === 'tabela' ? 'block' : 'none';
    });
  });

  // Back buttons
  document.getElementById('btn-back-top').addEventListener('click', () => navigate('/rotina'));
  document.getElementById('btn-back-bottom').addEventListener('click', () => navigate('/rotina'));

  // Generate plan and go
  document.getElementById('btn-plan').addEventListener('click', () => {
    const plan = generatePlan(results);
    savePlan(plan);
    markProgress(K.PLAN_READY);
    navigate('/plano-14-dias');
  });
}

/* ============================================================================ */
/* Helpers                                                                      */
/* ============================================================================ */

function getTrainingTimeTag(routine) {
  if (!routine || !(routine.trainDays > 0) || !routine.trainStartTime) return null;
  const parts = routine.trainStartTime.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  const mins = h * 60 + m;
  if (mins <  300) return 'Treino de Madrugada';       // 00:00–04:59
  if (mins <  480) return 'Treino no Início da Manhã'; // 05:00–07:59
  if (mins <  660) return 'Treino de Manhã';           // 08:00–10:59
  if (mins <  720) return 'Treino no Fim da Manhã';    // 11:00–11:59
  if (mins <  840) return 'Treino no Início da Tarde'; // 12:00–13:59
  if (mins < 1020) return 'Treino à Tarde';            // 14:00–16:59
  if (mins < 1080) return 'Treino no Fim da Tarde';    // 17:00–17:59
  if (mins < 1200) return 'Treino no Início da Noite'; // 18:00–19:59
  if (mins < 1320) return 'Treino à Noite';            // 20:00–21:59
  return 'Treino no Fim da Noite';                     // 22:00–23:59
}

function getTrainingPeriodText(startTime) {
  if (!startTime) return null;
  const parts = startTime.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  const mins = h * 60 + m;
  if (mins <  300) return 'de madrugada';
  if (mins <  480) return 'no início da manhã';
  if (mins <  660) return 'de manhã';
  if (mins <  720) return 'no fim da manhã';
  if (mins <  840) return 'no início da tarde';
  if (mins < 1020) return 'à tarde';
  if (mins < 1080) return 'no fim da tarde';
  if (mins < 1200) return 'no início da noite';
  if (mins < 1320) return 'à noite';
  return 'no fim da noite';
}

function buildTags(profile, routine, results) {
  const tags = [];

  // TAG 1 — Perfil hardgainer (sempre presente)
  if (profile.falsoMagro) {
    tags.push('Falso Magro');
  } else {
    tags.push({
      classico:            'Hardgainer Clássico',
      ultra_acelerado:     'Metabolismo Acelerado',
      apetite_baixo:       'Apetite Reduzido',
      volume_baixo:        'Baixo Volume Gástrico',
      rotina_corrida:      'Rotina Corrida',
      falta_consistencia:  'Consistência em Foco',
    }[profile.difficulty] || 'Hardgainer');
  }

  // TAG 2 — Nível de atividade
  const activityTag = {
    sedentary:   'Sedentário',
    light:       'Levemente Ativo',
    moderate:    'Moderadamente Ativo',
    active:      'Muito Ativo',
    very_active: 'Extremamente Ativo',
  }[profile.activity];
  if (activityTag) tags.push(activityTag);

  // TAG 3 — Estratégia alimentar
  const strategyTag = {
    solid:     'Alimentação Sólida',
    hybrid:    'Sistema Híbrido',
    practical: 'Estratégia Prática',
  }[routine.strategy];
  if (strategyTag) tags.push(strategyTag);

  // TAG 4 — Janela de treino
  const trainTag = getTrainingTimeTag(routine);
  if (trainTag) tags.push(trainTag);

  // TAG 5 — Refeições por dia
  if (routine.mealsPerDay) {
    tags.push(`${routine.mealsPerDay} Refeições/dia`);
  }

  // TAG 6 — Meta de ganho semanal
  const gainLow  = results.weeklyGainLowKg;
  const gainHigh = results.weeklyGainHighKg;
  if (gainLow && gainHigh) {
    const lo = String(gainLow).replace('.', ',');
    const hi = String(gainHigh).replace('.', ',');
    tags.push(`Meta ${lo}–${hi} kg/sem`);
  } else if (results.surplus) {
    if (results.surplus <= 300)      tags.push('Superávit Conservador');
    else if (results.surplus <= 500) tags.push('Superávit Moderado');
    else                             tags.push('Superávit Agressivo');
  }

  // Máximo 6, sem duplicatas e sem valores vazios
  return [...new Set(tags.filter(Boolean))].slice(0, 6);
}

function buildInterpretation(profile, routine, results, formData) {
  const parts = [];

  const wKg = results.weightKg ? Math.round(results.weightKg) : null;
  const weightStr = wKg ? `Com ${wKg} kg` : 'Com o seu perfil';

  const hasTrain = routine.trainDays > 0;
  const trainCtx = hasTrain
    ? `${routine.trainDays} treino${routine.trainDays > 1 ? 's' : ''}/semana${routine.trainDurationMinutes ? ' de ' + routine.trainDurationMinutes + ' min' : ''}`
    : null;

  const trainPeriod = hasTrain
    ? (getTrainingPeriodText(routine.trainStartTime) || 'em horário personalizado')
    : null;

  const contextLine = trainCtx
    ? `${weightStr} e ${trainCtx}${trainPeriod ? ' ' + trainPeriod : ''}`
    : weightStr;

  if (profile.falsoMagro) {
    parts.push(`${contextLine}, seu perfil combina baixo peso aparente com acúmulo de gordura abdominal. Isso exige um superávit mais controlado (${results.surplus} kcal) e proteína mais elevada para favorecer recomposição corporal sem exagerar no ganho de gordura.`);
  } else if (profile.difficulty === 'ultra_acelerado') {
    parts.push(`${contextLine}, seu metabolismo queima energia muito rápido. Aplicamos um superávit maior (${results.surplus} kcal) para compensar esse gasto elevado e garantir que seu corpo tenha material suficiente para crescer semana a semana.`);
  } else if (profile.difficulty === 'apetite_baixo') {
    parts.push(`${contextLine}, seu principal desafio é o apetite reduzido. Começamos com um superávit realista de ${results.surplus} kcal — é melhor ser consistente com volumes menores do que tentar grandes quantidades e falhar.`);
  } else if (profile.difficulty === 'volume_baixo') {
    parts.push(`${contextLine}, como você tem dificuldade com volume, a app manteve você em superávit calórico — apenas reduziu o excesso para um ritmo mais sustentável (${results.surplus} kcal acima do gasto). A ideia não é comer pouco: é ganhar peso com menos volume físico no prato. O plano prioriza alimentos mais densos em calorias — azeite, pasta de amendoim, shakes bem posicionados — para bater as ${formatKcal(results.calories)} kcal diárias sem precisar de pratos gigantes. Se o peso não subir após 2 semanas, aumente 150–200 kcal. Se subir rápido demais com barriga, reduza 100–150 kcal.`);
  } else if (profile.difficulty === 'rotina_corrida') {
    parts.push(routine.strategy === 'hybrid'
      ? `${contextLine}, o tempo é o seu maior obstáculo calórico. O Sistema Híbrido resolve isso: shakes prontos em 2 minutos preenchem os espaços entre as refeições sólidas sem precisar cozinhar ou parar a rotina.`
      : `${contextLine}, o tempo é o seu maior obstáculo calórico. Prepare refeições com antecedência e escolha opções rápidas para conseguir manter a consistência mesmo nos dias mais corridos.`);
  } else if (profile.difficulty === 'falta_consistencia') {
    parts.push(`${contextLine}, o que faltou até agora foi consistência. Este plano define exatamente o que comer todos os dias — sem decisões de última hora, sem lacunas calóricas, sem desculpas.`);
  } else {
    parts.push(`${contextLine}, você tem o perfil clássico de hardgainer — metabolismo rápido e dificuldade em ganhar peso. A estratégia é direta: superávit de ${results.surplus} kcal consistente, proteína adequada e carboidratos de digestão leve para dar energia sem encher o estômago.`);
  }

  if (routine.mealsPerDay) {
    if (routine.strategy === 'practical') {
      parts.push(`As ${routine.mealsPerDay} refeições diárias incluem mais shakes do que sólidos — isso poupa tempo, alivia o aparelho digestivo e facilita bater as calorias sem depender de refeições volumosas.`);
    } else if (routine.strategy === 'solid') {
      parts.push(`As ${routine.mealsPerDay} refeições diárias são principalmente sólidas — melhor para saciedade duradoura e absorção de nutrientes, mas exigem mais planejamento e capacidade gástrica.`);
    } else {
      parts.push(`As ${routine.mealsPerDay} refeições combinam sólidos e shakes, distribuindo as ${formatKcal(results.calories)} kcal ao longo do dia sem sobrecarregar a digestão em nenhum momento.`);
    }
  }

  return parts.join(' ');
}

function buildProfileSummary(formData, profile, routine, results) {
  const SEX_LABEL = { male: 'Masculino', female: 'Feminino' };
  const GOAL_LABEL = { gain: 'Ganho de massa', maintain: 'Manutenção', lose: 'Perda de gordura' };
  const items = [];

  const wKg = results.weightKg ? Math.round(results.weightKg) : null;
  const hCm = results.heightCm ? Math.round(results.heightCm) : null;

  if (wKg)                           items.push({ label: 'Peso', value: `${wKg} kg` });
  if (hCm)                           items.push({ label: 'Altura', value: `${hCm} cm` });
  if (formData.age)                  items.push({ label: 'Idade', value: `${formData.age} anos` });
  if (formData.sex && SEX_LABEL[formData.sex]) items.push({ label: 'Sexo', value: SEX_LABEL[formData.sex] });
  if (profile.goal && GOAL_LABEL[profile.goal]) items.push({ label: 'Objetivo', value: GOAL_LABEL[profile.goal] });
  if (profile.activity)              items.push({ label: 'Nível de atividade', value: ACTIVITY_LABEL[profile.activity] || profile.activity });
  if (profile.difficulty)            items.push({ label: 'Dificuldade principal', value: DIFFICULTY_LABEL[profile.difficulty] || profile.difficulty });
  items.push({ label: 'Perfil corporal', value: profile.falsoMagro ? 'Falso Magro / Magro com Barriga' : 'Magro Clássico' });
  if (routine.trainDays > 0)         items.push({ label: 'Dias de treino', value: `${routine.trainDays}×/semana` });
  if (routine.trainStartTime && routine.trainEndTime) items.push({ label: 'Horário de treino', value: `${routine.trainStartTime} – ${routine.trainEndTime}` });
  if (routine.trainDurationMinutes)  items.push({ label: 'Duração do treino', value: `${routine.trainDurationMinutes} min` });
  if (routine.sleepStartTime && routine.sleepEndTime) items.push({ label: 'Sono', value: `${routine.sleepStartTime} – ${routine.sleepEndTime}` });
  if (routine.mealsPerDay)           items.push({ label: 'Refeições/dia', value: `${routine.mealsPerDay}` });
  if (routine.strategy)              items.push({ label: 'Estratégia', value: STRATEGY_LABEL[routine.strategy] || routine.strategy });
  if (results.weeklyGainLowKg && results.weeklyGainHighKg) items.push({ label: 'Meta de ganho', value: `${results.weeklyGainLowKg}–${results.weeklyGainHighKg} kg/sem` });

  if (!items.length) return '';

  return `<div class="profile-summary">${
    items.map(it =>
      `<div class="profile-summary-item"><span class="profile-summary-label">${it.label}</span><span class="profile-summary-value">${it.value}</span></div>`
    ).join('')
  }</div>`;
}

function buildRecommendations(profile, routine, results) {
  const recs = [];

  const strategy   = routine.strategy || 'hybrid';
  const meals      = routine.mealsPerDay || 6;
  const trainDays  = routine.trainDays || 0;
  const difficulty = profile.difficulty || '';
  const goal       = profile.goal || 'moderate';

  const slots      = results.slotDistribution || [];
  const shakeCount = slots.filter(s => s.type === 'shake').length;
  const solidCount = slots.filter(s => s.type === 'solid').length;

  const toMins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const trainMins = routine.trainStartTime ? toMins(routine.trainStartTime) : null;
  const isLateOrDawnTraining = trainMins !== null && (trainMins >= 1200 || trainMins < 300);

  // REC 1 — Meta diária: personalizada por dificuldade
  const proteinPerMeal = results.protein?.grams
    ? `~${Math.round(results.protein.grams / meals)}g de proteína por refeição`
    : null;

  if (profile.falsoMagro) {
    recs.push({
      title: 'Meta calórica sem exceder o superávit',
      body: `Você está em superávit de ${results.surplus} kcal — o suficiente para crescer sem acumular gordura abdominal. Bater as ${formatKcal(results.calories)} kcal com consistência é o fator principal.${proteinPerMeal ? ` Tente manter ${proteinPerMeal} para favorecer massa sobre gordura.` : ''}`,
    });
  } else if (difficulty === 'volume_baixo') {
    recs.push({
      title: 'Bata a meta em menos volume no prato',
      body: `Você tem ${formatKcal(results.calories)} kcal para bater — não precisa de pratos grandes para isso. Priorize alimentos calóricos (azeite, pasta de amendoim, aveia) e shakes bem montados.${proteinPerMeal ? ` Tente chegar a ${proteinPerMeal}.` : ''}`,
    });
  } else if (difficulty === 'apetite_baixo') {
    recs.push({
      title: 'Bata a meta sem depender da fome',
      body: `Com apetite baixo, comer por horário é mais eficaz do que esperar ter fome. Meta: ${formatKcal(results.calories)} kcal ao longo do dia, distribuídas em ${meals} refeições.${proteinPerMeal ? ` Tente manter ${proteinPerMeal}.` : ''} Não pule refeições mesmo sem fome.`,
    });
  } else if (difficulty === 'ultra_acelerado') {
    recs.push({
      title: 'Consistência acima de tudo',
      body: `Seu metabolismo queima rápido — calorias perdidas num dia não recuperam no dia seguinte. Meta diária: ${formatKcal(results.calories)} kcal, todos os dias.${proteinPerMeal ? ` Tente manter ${proteinPerMeal}.` : ''} Pequenas quebras acumulam e travam o progresso.`,
    });
  } else if (difficulty === 'falta_consistencia') {
    recs.push({
      title: 'Um bom dia não compensa uma semana irregular',
      body: `A consistência semanal é o que move a balança. Meta: ${formatKcal(results.calories)} kcal todos os dias — não só quando estiver motivado.${proteinPerMeal ? ` Tente manter ${proteinPerMeal}.` : ''} Simplifique ao máximo para conseguir repetir.`,
    });
  } else if (difficulty === 'rotina_corrida') {
    recs.push({
      title: 'Bata a meta mesmo com a rotina corrida',
      body: `Rotina corrida não é desculpa para falhar — é uma restrição que o plano já considerou. Meta: ${formatKcal(results.calories)} kcal em ${meals} refeições.${proteinPerMeal ? ` Tente chegar a ${proteinPerMeal}.` : ''} Prepare o que puder com antecedência para não depender de improviso.`,
    });
  } else {
    recs.push({
      title: 'Prioridade: bater a meta diária',
      body: `O que define o resultado é cumprir calorias, proteína, carboidratos e gorduras todos os dias.${proteinPerMeal ? ` Meta: ${proteinPerMeal}.` : ''} Os horários ajudam na organização, mas a consistência ao longo do dia é o fator principal.`,
    });
  }

  // REC 2 — Estratégia escolhida
  if (strategy === 'hybrid') {
    recs.push({
      title: 'Use sólidos e shakes de forma estratégica',
      body: `O plano usa ${solidCount} ${solidCount !== 1 ? 'refeições sólidas' : 'refeição sólida'} como base e ${shakeCount} shake${shakeCount !== 1 ? 's' : ''} como apoio. Os horários ajudam, mas o mais importante é bater a meta do dia com consistência.`,
    });
  } else if (strategy === 'solid') {
    if (shakeCount === 0) {
      recs.push({
        title: 'Monte pratos simples e fáceis de repetir',
        body: `Com ${solidCount} refeições sólidas, o mais importante é ter opções simples que você consiga fazer sem esforço todos os dias. Pratos complicados atrapalham a consistência — prefira o básico bem feito.`,
      });
    } else {
      recs.push({
        title: 'Refeições sólidas como base, shake de apoio quando necessário',
        body: `Com ${solidCount} ${solidCount !== 1 ? 'refeições sólidas' : 'refeição sólida'} e ${shakeCount} shake de apoio, monte pratos simples e fáceis de repetir. O shake serve apenas para fechar calorias quando a sólida não for suficiente.`,
      });
    }
  } else {
    recs.push({
      title: 'Use os shakes para facilitar a rotina',
      body: `Com ${shakeCount} shake${shakeCount !== 1 ? 's' : ''} no plano, use-os para reduzir tempo na cozinha nos horários mais corridos. Mantenha as ${solidCount} ${solidCount !== 1 ? 'refeições sólidas' : 'refeição sólida'} bem montadas. Deixe os ingredientes dos shakes já separados.`,
    });
  }

  // REC 3 — Número de refeições
  if (meals <= 4) {
    if (strategy === 'solid') {
      recs.push({
        title: 'Cada prato precisa ser mais completo',
        body: `Com ${meals} refeições, distribua bem as calorias desde o café da manhã. Com pratos mais volumosos, 3 a 4h de intervalo é mais confortável do que tentar comer de 2 em 2 horas.`,
      });
    } else if (strategy === 'practical') {
      recs.push({
        title: 'Cada refeição conta mais com poucas no dia',
        body: `Com ${meals} refeições, os ${shakeCount} shake${shakeCount !== 1 ? 's' : ''} ajudam a bater calorias sem precisar de pratos muito grandes. Distribua desde cedo para não acumular tudo na última refeição.`,
      });
    } else {
      recs.push({
        title: 'Cada refeição precisa contar mais',
        body: `Com ${meals} refeições no dia, cada prato precisa ser mais calórico. Prefira alimentos fáceis de comer, porções bem montadas e distribua desde cedo para não acumular calorias na última refeição.`,
      });
    }
  } else if (meals === 5) {
    if (strategy === 'solid') {
      recs.push({
        title: 'Use os horários como referência',
        body: `Com ${solidCount} sólida${solidCount !== 1 ? 's' : ''}${shakeCount > 0 ? ` e ${shakeCount} shake de apoio` : ''}, distribua nos horários mais importantes do dia. ${shakeCount > 0 ? 'O shake fecha calorias sem precisar de outro prato completo.' : 'Prepare com antecedência o que puder para manter o ritmo.'}`,
      });
    } else if (strategy === 'practical') {
      recs.push({
        title: 'Use os horários como âncoras',
        body: `Com 5 refeições e ${shakeCount} shake${shakeCount !== 1 ? 's' : ''}, os shakes facilitam os horários entre uma sólida e outra. Mantenha as ${solidCount} ${solidCount !== 1 ? 'refeições sólidas' : 'refeição sólida'} bem montadas — elas são a base nutricional do dia.`,
      });
    } else {
      recs.push({
        title: 'Use os horários como âncoras',
        body: 'Com 5 refeições no dia, não precisa perseguir intervalos perfeitos. Use os horários como referência e evite ficar muitas horas sem comer, para não acumular calorias demais no final do dia.',
      });
    }
  } else if (meals >= 7) {
    recs.push({
      title: 'Muitas refeições funcionam, mas pedem organização',
      body: `Com ${meals} refeições, cada prato pode ser menor e a distribuição fica mais fácil. Mas exige mais organização para não pular horários. ${strategy === 'solid' ? 'Prepare o que puder com antecedência.' : `Deixe os ${shakeCount} shake${shakeCount !== 1 ? 's' : ''} e ingredientes já prontos para os horários mais corridos.`}`,
    });
  } else {
    if (strategy === 'solid') {
      recs.push({
        title: 'Distribua bem ao longo do dia',
        body: `Com ${solidCount} refeições sólidas, os intervalos podem ser um pouco maiores — comida sólida demora mais para digerir. Prepare com antecedência o que puder para manter o plano funcionando.`,
      });
    } else if (strategy === 'practical') {
      recs.push({
        title: 'Deixe tudo separado e pronto',
        body: `Com 6 refeições e ${shakeCount} shake${shakeCount !== 1 ? 's' : ''}, quanto menos você precisar decidir na hora, mais fácil de manter a consistência. Separe os ingredientes dos shakes no início do dia.`,
      });
    } else {
      recs.push({
        title: 'Distribua bem as calorias ao longo do dia',
        body: 'Com 6 refeições, a app distribuiu sólidos e shakes em blocos previsíveis ao longo do dia. Alguns intervalos podem ficar mais curtos para encaixar treino, recuperação e sono, mas a lógica continua sendo evitar grandes pratos de uma só vez.',
      });
    }
  }

  // REC 4 — Perfil / dificuldade
  if (profile.falsoMagro) {
    const goalNote = goal === 'aggressive'
      ? ' Como escolheu ganho agressivo, monitore ainda mais de perto — o superávit mais alto pode acumular gordura com mais facilidade.'
      : '';
    recs.push({
      title: 'Atenção à gordura abdominal',
      body: `Evite bebidas açucaradas, doces refinados e excessos noturnos. Priorize sólidos nas refeições principais e acompanhe a circunferência da cintura junto com o peso a cada 2 semanas.${goalNote}`,
    });
  } else if (difficulty === 'volume_baixo') {
    recs.push({
      title: 'Você está em superávit — não em restrição',
      body: `Você está ${results.surplus} kcal acima do seu gasto diário. Se após 2 semanas o peso não subiu, adicione 150–200 kcal (mais azeite, amendoim ou um shake maior). Se subiu rápido com barriga, reduza 100–150 kcal. O objetivo é ganhar sem desconforto.`,
    });
  } else if (difficulty === 'apetite_baixo') {
    recs.push({
      title: 'Não deixe calorias para o final do dia',
      body: 'Com apetite reduzido, é comum chegar no jantar ainda com metade da meta por cumprir. Distribua melhor desde o café da manhã — isso torna o plano muito mais fácil de seguir.',
    });
  } else if (difficulty === 'falta_consistencia') {
    recs.push({
      title: 'Simplifique para conseguir repetir todos os dias',
      body: 'Quanto mais simples a rotina, mais fácil de manter. Escolha 2 ou 3 refeições que você consegue repetir sem pensar e monte o plano em torno delas. Consistência básica supera variação perfeita.',
    });
  } else if (difficulty === 'ultra_acelerado') {
    recs.push({
      title: 'Não dependa da fome para lembrar de comer',
      body: 'Com metabolismo acelerado, a fome pode não aparecer mesmo com calorias faltando. Use alarmes ou horários fixos como referência e acompanhe o peso toda semana para ajustar se necessário.',
    });
  } else if (routine.trainFasted) {
    recs.push({
      title: 'Coma logo depois do treino em jejum',
      body: 'Treinar sem comer antes funciona para alguns — mas exige atenção especial à refeição depois do treino. Não deixe mais de 45–60 minutos passar sem se alimentar após o esforço.',
    });
  } else if (isLateOrDawnTraining) {
    recs.push({
      title: 'Planeje as refeições ao redor do treino fora do padrão',
      body: 'Como seu treino é em horário atípico, a refeição antes e a depois do treino precisam ser planejadas com antecedência. Não deixe essa parte para o improviso — é a parte mais fácil de falhar.',
    });
  } else if (difficulty === 'rotina_corrida' && strategy !== 'practical') {
    recs.push({
      title: 'Prepare com antecedência',
      body: 'Com rotina corrida, improvisar na hora das refeições é o que mais atrapalha. Reserve um momento fixo para separar ingredientes, montar marmitas ou deixar opções prontas para os horários mais corridos.',
    });
  } else {
    recs.push({
      title: 'Prefira carboidratos de digestão leve',
      body: 'Arroz branco, batata cozida, macarrão e pão francês facilitam bater calorias sem estufar. Evite excesso de fibras nas refeições principais — enchem rápido e reduzem o apetite.',
    });
  }

  // REC 5 — Treino
  if (profile.activity === 'sedentary' || trainDays <= 1) {
    recs.push({
      title: 'Considere adicionar treino de força',
      body: 'Sem estímulo muscular, grande parte do superávit calórico vira gordura em vez de massa magra. Mesmo 2 a 3 treinos curtos por semana já fazem diferença.',
    });
  } else if (routine.trainFasted) {
    recs.push({
      title: 'Treino em jejum: recuperação é prioridade',
      body: 'Com treino em jejum, a janela pós-treino é ainda mais importante. Tenha a refeição pós-treino pronta antes de sair para treinar — não improvise depois do esforço.',
    });
  } else if (trainMins !== null) {
    let trainRecBody;
    if (trainMins < 300) {
      trainRecBody = 'Treino de madrugada é incomum — isso significa que sua rotina pede ainda mais planejamento. Tenha a refeição pós-treino já pronta antes de dormir para não pular essa janela importante.';
    } else if (trainMins < 480) {
      trainRecBody = 'Com treino cedo de manhã, garanta uma boa refeição logo depois. Ela ajuda na recuperação e facilita distribuir o restante das calorias ao longo do dia sem acumular tudo no fim.';
    } else if (trainMins < 720) {
      trainRecBody = 'Com treino de manhã, a refeição depois é um momento-chave. Ela ajuda a recuperar energia e facilita cumprir a meta calórica ao longo do dia sem acumular no jantar.';
    } else if (trainMins < 840) {
      trainRecBody = 'Com treino no início da tarde, cuide especialmente da refeição depois. Ela ajuda na recuperação e evita chegar no fim do dia com muitas calorias ainda por bater.';
    } else if (trainMins < 1080) {
      trainRecBody = 'Com treino de tarde, a refeição depois é importante para recuperação. Garanta que ela esteja planejada — evita deixar calorias acumuladas para a última refeição do dia.';
    } else if (trainMins < 1200) {
      trainRecBody = 'Com treino no início da noite, planeje a refeição depois com antecedência. Ela fecha bem a meta calórica do dia e ajuda na recuperação antes de dormir.';
    } else {
      trainRecBody = 'Treino à noite significa que a última refeição do dia e a recuperação se sobrepõem. Não pule a refeição pós-treino — ela é crítica tanto para fechar a meta quanto para dormir bem.';
    }
    recs.push({ title: 'Cuide da refeição depois do treino', body: trainRecBody });
  } else {
    recs.push({
      title: 'Cuide das refeições nos dias de treino',
      body: 'Nos dias em que você treina, preste atenção às refeições antes e depois do esforço. Elas ajudam na recuperação e garantem que o dia de treino não fique com calorias faltando.',
    });
  }

  return recs;
}

/**
 * Redistribui os horários das refeições para que nenhuma caia dentro do bloco de treino.
 * Divide as refeições em pré-treino e pós-treino de forma proporcional ao tempo disponível.
 * Apenas recalcula os times — kcal/macros não são alterados.
 */
function rebuildTimesAroundTraining(slots, routine) {
  const { trainStartTime, trainEndTime, trainDays, trainFasted, mealsPerDay, sleepStartTime, sleepEndTime } = routine;
  if (!trainDays || trainDays <= 0) return { slots, spacingFeedback: null };
  if (!trainStartTime || !trainEndTime) return { slots, spacingFeedback: null };

  const toMins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const toTime = m => {
    const v = ((Math.round(m) % 1440) + 1440) % 1440;
    return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
  };

  const roundQ = m => Math.round(m / 15) * 15;

  const wakeMin = sleepEndTime ? toMins(sleepEndTime) : 420;
  let sleepMin = sleepStartTime ? toMins(sleepStartTime) : 1380;
  if (sleepMin <= wakeMin) sleepMin += 1440;
  const dayStart = wakeMin + 15;
  const dayEnd   = sleepMin - 75;

  // Normalização na fonte: tStart/tEndAdj já em coordenadas do ciclo acordado.
  // Para turnos nocturnos (sleepMin > 1440), horas antes de wakeMin que ainda
  // pertencem ao ciclo (ex.: 01:00 para turno 15:30–08:30) são deslocadas +1440.
  const normToCycle = m =>
    sleepMin > 1440 && m < wakeMin && (m + 1440) <= sleepMin ? m + 1440 : m;
  const tStart  = normToCycle(toMins(trainStartTime));
  const tEnd    = normToCycle(toMins(trainEndTime));
  const tEndAdj = tEnd <= tStart ? tEnd + 1440 : tEnd;

  const n = slots.length;
  if (n === 0) return { slots, spacingFeedback: null };

  const MEAL_DUR = { solid: 30, shake: 15, pre_workout_light: 10 };
  const slotDur = s => (s?.slot === 'pre_workout_light' ? 10 : MEAL_DUR[s?.type] ?? 15);
  const TARGET_GAPS = [180, 165, 150, 120];
  const spacingChecks = [];
  const averageMealDuration = slots.reduce((sum, s) => sum + slotDur(s), 0) / n;
  const getWindowCapacity = (ws, we, gapTarget) => {
    if (we < ws) return 0;
    return Math.max(1, Math.floor((we - ws) / (averageMealDuration + gapTarget)) + 1);
  };
  const buildSpacingFeedback = (windows, fixedMeals = 0) => {
    const tightestGap = spacingChecks.reduce((min, item) => Math.min(min, item.gapUsed), Infinity);

    if (tightestGap < 90 && n <= 5) {
      const stratTight = routine.strategy || 'hybrid';
      return {
        level: 'warning',
        headline: 'Analisámos a sua rotina: os intervalos ficaram mais curtos do que o ideal.',
        message: 'Duas refeições ficaram próximas por causa do tempo disponível no seu dia. Isso costuma acontecer quando o sono começa cedo ou o treino ocupa uma parte maior do dia.',
        detail: `Como o seu sono começa cedo, a última parte do dia fica mais apertada. ${stratTight !== 'solid' ? 'Use o shake como apoio rápido nessa situação, sem tentar transformá-lo numa refeição pesada.' : 'Se perceber desconforto na última refeição, prefira uma porção menor e mais fácil de digerir.'} Se quiser mais margem, reduzir o número de refeições ou ajustar o horário de sono são as opções mais simples.`,
      };
    }

    if (tightestGap < 90 && n >= 8) {
      return {
        level: 'danger',
        headline: 'Analisámos a sua rotina: os intervalos ficaram curtos demais.',
        message: 'Algumas refeições ficaram próximas demais para uma rotina confortável. Este cenário pode ser difícil de manter na prática.',
        detail: `A sua 'janela acordado' é o período entre a hora em que acorda e a hora em que vai dormir. É dentro desse espaço que a app tenta encaixar refeições, shakes e treino.\n\nQuando o intervalo real entre refeições fica abaixo de 1h30, pode ser difícil digerir bem, sentir fome novamente e repetir a rotina todos os dias sem desconforto.\n\nIsso não significa que você falhou. Significa apenas que a sua rotina atual tem pouco espaço para tantas refeições.\n\nTente uma destas soluções:\n• reduzir o número de refeições;\n• transformar uma refeição sólida em shake;\n• acordar um pouco mais cedo ou dormir um pouco mais tarde, se isso fizer sentido;\n• manter 6 refeições em vez de 7 ou 8.`,
      };
    }

    if (tightestGap < 120 && n > 6) {
      return {
        level: 'warning',
        headline: 'Analisámos a sua rotina: os intervalos ficaram abaixo do ideal.',
        message: 'Algumas refeições ficaram muito próximas. Para melhor conforto digestivo e maior consistência, tente reduzir o número de refeições ou aumentar a janela acordado.',
        detail: `A sua 'janela acordado' é o período entre a hora em que acorda e a hora em que vai dormir. É dentro desse espaço que a app tenta encaixar refeições, shakes e treino.\n\nO mínimo aceitável para esta calculadora é cerca de 2h reais entre refeições. Quando o intervalo fica abaixo disso, pode ser mais difícil digerir bem, sentir fome novamente e manter a rotina sem desconforto.\n\nIsso não significa que você falhou. Significa apenas que a sua rotina atual tem pouco espaço para tantas refeições.`,
      };
    }

    if (n >= 8) {
      return {
        level: 'warning',
        headline: `Analisámos a sua rotina: ${n} refeições são possíveis, mas deixam o dia mais comprimido.`,
        message: 'A app conseguiu encaixar os horários, mas já existe menos margem entre refeições. Este formato exige mais disciplina e pode não ser confortável para todos.',
        detail: `A sua "janela acordado" é o espaço entre acordar e dormir. Quando tenta encaixar ${n} refeições nesse período, os intervalos entre elas ficam naturalmente mais curtos.\n\nIsso acontece porque o dia continua tendo o mesmo tamanho, mas há mais refeições, shakes e possivelmente treino para distribuir.\n\nO Sistema Híbrido continua útil porque os shakes reduzem o volume de comida sólida. Mesmo assim, ${n} refeições podem ser excessivas para algumas pessoas, especialmente para quem sente desconforto digestivo ou tem pouco apetite.\n\nSe o plano parecer apertado na prática, reduza para 6 refeições ou aumente a janela acordado. O objetivo não é comer a toda hora, é criar uma rotina que você consiga repetir.`,
      };
    }

    if (n === 7) {
      return {
        level: 'info',
        headline: 'Analisámos a sua rotina: 7 refeições ainda cabem na sua janela diária.',
        message: 'A estrutura continua possível, mas os intervalos começam a ficar mais curtos. Aqui, seguir os horários com consistência faz mais diferença.',
        detail: 'A sua "janela acordado" é o tempo disponível entre acordar e dormir. Quando coloca 7 refeições dentro dessa janela, a app precisa distribuir mais blocos no mesmo dia.\n\nIsso não significa que o plano esteja errado. Significa apenas que haverá menos folga entre refeições, principalmente quando existe treino no meio do dia.\n\nNesta situação, os shakes tornam o plano mais viável porque ocupam menos tempo, pesam menos no estômago e ajudam a manter o superávit calórico sem depender apenas de comida sólida.\n\nSe sentir desconforto ou falta de apetite, uma boa alternativa é voltar para 6 refeições ou aumentar a janela acordado.',
      };
    }

    if (n === 6 && tightestGap < 150) {
      const strat6 = routine.strategy || 'hybrid';
      return {
        level: 'info',
        headline: 'Analisámos a sua rotina: as 6 refeições encaixam na sua janela diária.',
        message: 'Com 6 refeições, a estrutura do plano fica bem distribuída, desde que mantenha consistência nos horários.',
        detail: `A sua "janela acordado" é o período entre a hora em que acorda e a hora em que vai dormir. É dentro desse espaço que a app tenta encaixar café da manhã, almoço, jantar, ${strat6 === 'solid' ? 'refeições extras' : 'shakes'} e treino.\n\nQuanto mais refeições entram dentro da mesma janela, menor fica o intervalo entre uma refeição e outra. Por isso, 6 refeições continuam a fazer sentido, mas exigem mais organização.\n\n${strat6 === 'solid' ? 'Com refeições sólidas mais frequentes, o planejamento e preparo antecipado fazem diferença. Ter as refeições prontas evita improvisos e mantém o plano funcionando.' : 'Os shakes ajudam exatamente aqui: são mais rápidos de consumir, mais leves que refeições sólidas e facilitam atingir calorias sem obrigar você a comer pratos grandes o tempo todo.'}\n\nO ideal é manter 2h30 a 3h entre refeições. Mas se a rotina permitir pelo menos 2h reais entre elas, o plano continua funcional.`,
      };
    }

    if (n === 6) {
      const strat6 = routine.strategy || 'hybrid';
      return {
        level: 'success',
        headline: 'Analisámos a sua rotina: as 6 refeições encaixam confortavelmente na sua janela diária.',
        message: 'Com 6 refeições e uma boa margem entre elas, a estrutura do plano funciona bem na sua rotina.',
        detail: `A sua "janela acordado" é o período entre a hora em que acorda e a hora em que vai dormir. É dentro desse espaço que a app distribui café da manhã, almoço, jantar, ${strat6 === 'solid' ? 'refeições extras' : 'shakes'} e treino.\n\n${strat6 === 'solid' ? '6 refeições com foco em sólidos exige mais planejamento, mas oferece mais saciedade e variedade ao longo do dia. Prepare com antecedência o que puder para não depender de improviso.' : '6 refeições é a estrutura clássica do Sistema Híbrido: normalmente 3 refeições sólidas e 3 shakes anabólicos. Essa combinação existe por um motivo concreto — os shakes são consumidos mais rapidamente, pesam menos no estômago e facilitam atingir o superávit calórico sem precisar comer grandes volumes a cada refeição.'}\n\nCom a sua janela acordado atual, há espaço confortável entre cada refeição. Isso significa menos pressão para seguir horários exatos e mais margem para quando o dia não corre perfeito — o que torna o plano mais sustentável a longo prazo.`,
      };
    }

    return {
      level: 'success',
      headline: 'Analisámos a sua rotina: esta quantidade de refeições encaixa bem na sua janela diária.',
      message: 'A distribuição atual está dentro de uma janela confortável para digestão e consistência ao longo do dia, sem necessidade de apertar demasiado os intervalos.',
      detail: null,
    };
  };

  const spaceTimes = (ws, we, count, durMin = 0) => {
    if (count === 0) return [];

    const durations = Array.isArray(durMin)
      ? Array.from({ length: count }, (_, i) => Math.max(0, Number(durMin[i] ?? 0)))
      : Array.from({ length: count }, () => Math.max(0, Number(durMin) || 0));

    if (count === 1) return [roundQ(Math.max(ws, Math.min(we, (ws + we) / 2)))];

    const totalPrevDur = durations.slice(0, -1).reduce((sum, d) => sum + d, 0);
    const availableSpan = we - ws;
    const tryBuildTimes = gap => {
      const requiredSpan = totalPrevDur + gap * (count - 1);
      if (requiredSpan > availableSpan) return null;
      const start = ws + (availableSpan - requiredSpan) / 2;
      const times = [start];
      for (let i = 1; i < count; i++) times.push(times[i - 1] + durations[i - 1] + gap);
      return times;
    };

    for (const gapTarget of TARGET_GAPS) {
      const times = tryBuildTimes(gapTarget);
      if (times) {
        spacingChecks.push({ gapUsed: gapTarget });
        return times.map(roundQ);
      }
    }

    const compressedGap = (availableSpan - totalPrevDur) / (count - 1);
    const times = [ws];
    for (let i = 1; i < count; i++) times.push(times[i - 1] + durations[i - 1] + compressedGap);
    const rounded = times.map(roundQ);
    let minActualGap = Infinity;
    for (let i = 1; i < count; i++) {
      minActualGap = Math.min(minActualGap, rounded[i] - rounded[i - 1] - durations[i - 1]);
    }
    spacingChecks.push({ gapUsed: minActualGap });
    return rounded;
  };

  const spaceTimesFromStart = (startTime, we, durations = []) => {
    if (!durations.length) return [];
    if (durations.length === 1) return [roundQ(startTime)];

    const safeDurations = durations.map(d => Math.max(0, Number(d) || 0));
    const totalPrevDurs = safeDurations.slice(0, -1).reduce((s, d) => s + d, 0);
    const nGaps = safeDurations.length - 1;
    const overflow = startTime + totalPrevDurs + nGaps * 120 - we;
    const floorGap = overflow > 120
      ? Math.max(15, Math.floor((we - startTime - totalPrevDurs) / nGaps))
      : 120;
    const times = [startTime];

    for (let i = 1; i < safeDurations.length; i++) {
      const currentStart = times[i - 1];
      const prevDur = safeDurations[i - 1];
      const remainingDur = safeDurations.slice(i, -1).reduce((sum, d) => sum + d, 0);
      const remainingIntervals = safeDurations.length - i - 1;
      const minFutureSpan = remainingDur + Math.max(0, remainingIntervals) * floorGap;

      let chosenGap = floorGap;
      for (const gapTarget of TARGET_GAPS) {
        const nextStart = currentStart + prevDur + gapTarget;
        if (nextStart + minFutureSpan <= we) {
          chosenGap = gapTarget;
          break;
        }
      }

      const nextTime = Math.min(currentStart + prevDur + chosenGap, we);
      times.push(nextTime);
      spacingChecks.push({ gapUsed: nextTime - currentStart - prevDur });
    }

    return times.map(roundQ);
  };

  // Nudge: se a última refeição ficar longe demais do sono, reposiciona-a para ~90 min antes de dormir.
  // Só aplica se o slot anterior deixar espaço suficiente (≥ 60 min de gap). Não altera kcal/macros.
  const nudgeLastMeal = (times, restSlotsArr) => {
    if (!times.length) return;
    const targetLast = sleepMin - 90;
    const lastIdx = times.length - 1;
    if (times[lastIdx] >= targetLast) return;
    const prevEnd = lastIdx > 0
      ? times[lastIdx - 1] + slotDur(restSlotsArr[lastIdx - 1])
      : 0;
    const capped = Math.min(targetLast, sleepMin - 60);
    if (capped > prevEnd + 60) times[lastIdx] = roundQ(capped);
  };

  const POST_BUFFER = 20;

  // Treino em jejum: só faz sentido nas primeiras horas após acordar (< 5h do wakeMin).
  // Para turnos nocturnos (ex.: treino às 01:00 após acordar às 15:30), tStart–wakeMin = 570 ≥ 300 → ignora.
  if (trainFasted && (tStart - wakeMin) < 300) {
    const firstMealTime = tEndAdj + 30;
    const effectiveDayEnd = tEndAdj > dayEnd ? Math.min(tEndAdj + 90, sleepMin - 30) : dayEnd;
    // Templates naturais para treino que termina antes das 08:00 (ciclo normal)
    if (tEndAdj < 8 * 60) {
      const earlyTemplates = {
        4: [420, 720, 1020, 1260],
        5: [420, 600, 780, 1020, 1260],
        6: [420, 630, 780, 960, 1140, 1320],
        7: [420, 570, 720, 900, 1050, 1200, 1350],
        8: [420, 540, 690, 840, 990, 1140, 1260, 1380],
      };
      const base = earlyTemplates[n];
      if (base) {
        const delta = firstMealTime > base[0] ? firstMealTime - base[0] : 0;
        return {
          slots: slots.map((s, i) => ({ ...s, time: toTime(base[i] + delta) })),
          spacingFeedback: buildSpacingFeedback([[base[0] + delta, effectiveDayEnd]]),
        };
      }
    }
    const firstSlot = { ...slots[0], time: toTime(firstMealTime) };
    if (n === 1) return { slots: [firstSlot], spacingFeedback: null };
    const allTimes = spaceTimesFromStart(firstMealTime, effectiveDayEnd, slots.map(slotDur));
    const restSlots = slots.slice(1).map((s, i) => ({ ...s, time: i + 1 < allTimes.length ? toTime(allTimes[i + 1]) : s.time }));
    return {
      slots: [firstSlot, ...restSlots],
      spacingFeedback: buildSpacingFeedback([[firstMealTime, effectiveDayEnd]]),
    };
  }

  // Treino antes das 10:00 (ciclo normalizado) sem jejum → primeiro slot vira pré-treino leve
  if (tStart < 600) {

    // Gap longo (>90 min) + 4/5 refeições: slot original preservado e reposicionado para perto do acordar.
    // Não converte para pre_workout_light nem capa kcal — usa a distribuição original de buildSlotDistribution.
    if (n <= 5 && (tStart - wakeMin) > 90) {
      const firstSlot = { ...slots[0], time: toTime(wakeMin + 15) };
      const restSlots = slots.slice(1);
      const postWindowStart = tEndAdj + POST_BUFFER;
      const effectiveDayEnd = tEndAdj > dayEnd ? Math.min(tEndAdj + 90, sleepMin - 30) : dayEnd;
      const postTimes = spaceTimesFromStart(postWindowStart, effectiveDayEnd, restSlots.map(slotDur));
      nudgeLastMeal(postTimes, restSlots);
      const postSlots = restSlots.map((s, i) => ({ ...s, time: i < postTimes.length ? toTime(postTimes[i]) : s.time }));
      return {
        slots: [firstSlot, ...postSlots],
        spacingFeedback: buildSpacingFeedback([[postWindowStart, effectiveDayEnd]], 1),
      };
    }

    // Gap longo (>90 min) + 6+ refeições: slot[0] preservado perto de acordar, slot[1] como pré-treino leve.
    if (n >= 6 && (tStart - wakeMin) > 90) {
      const firstSlot       = { ...slots[0], time: toTime(wakeMin + 15) };
      const originalPreKcal = slots[1].kcal || 0;
      const preKcal         = originalPreKcal < 180 ? originalPreKcal : Math.min(originalPreKcal, 250);
      const excedente       = originalPreKcal - preKcal;
      const preSlot         = { ...slots[1], slot: 'pre_workout_light', kcal: preKcal, time: toTime(tStart - 30) };
      const restSlots       = slots.slice(2);
      const totalRestKcal   = restSlots.reduce((sum, s) => sum + (s.kcal || 0), 0);
      const adjustedRest    = (excedente > 0 && totalRestKcal > 0)
        ? restSlots.map(s => ({ ...s, kcal: Math.round((s.kcal || 0) + excedente * ((s.kcal || 0) / totalRestKcal)) }))
        : restSlots;
      const postWindowStart = tEndAdj + POST_BUFFER;
      const effectiveDayEnd = tEndAdj > dayEnd ? Math.min(tEndAdj + 90, sleepMin - 30) : dayEnd;
      const postTimes = spaceTimesFromStart(postWindowStart, effectiveDayEnd, adjustedRest.map(slotDur));
      nudgeLastMeal(postTimes, adjustedRest);
      const postSlots = adjustedRest.map((s, i) => ({ ...s, time: i < postTimes.length ? toTime(postTimes[i]) : s.time }));
      return {
        slots: [firstSlot, preSlot, ...postSlots],
        spacingFeedback: buildSpacingFeedback([[postWindowStart, effectiveDayEnd]], 2),
      };
    }

    // Gap curto (≤90 min): comportamento original — primeiro slot vira pré-treino leve (shake, 250 kcal)
    const originalKcal = slots[0].kcal || 0;
    const preKcal = originalKcal < 180 ? originalKcal : Math.min(originalKcal, 250);
    const excedente = originalKcal - preKcal;
    const preSlot = { ...slots[0], slot: 'pre_workout_light', type: 'shake', kcal: preKcal, time: toTime(Math.max(wakeMin + 15, tStart - 30)) };
    const restSlots = slots.slice(1);
    // Redistribuir excedente proporcionalmente pelas kcal originais dos slots pós-treino
    const totalRestKcal = restSlots.reduce((sum, s) => sum + (s.kcal || 0), 0);
    const adjustedRest = (excedente > 0 && totalRestKcal > 0)
      ? restSlots.map(s => ({ ...s, kcal: Math.round((s.kcal || 0) + excedente * ((s.kcal || 0) / totalRestKcal)) }))
      : restSlots;
    const postWindowStart = tEndAdj + POST_BUFFER;
    const effectiveDayEnd = tEndAdj > dayEnd ? Math.min(tEndAdj + 90, sleepMin - 30) : dayEnd;
    // Se o primeiro slot pós-treino for shake e houver sólido depois, traz o sólido para frente.
    // Garante que a primeira refeição depois de um treino de manhã sem jejum seja sólida (não shake).
    const firstSolidIdx = adjustedRest.findIndex(s => s.type === 'solid');
    const orderedRest = firstSolidIdx > 0
      ? [
        { ...adjustedRest[firstSolidIdx], _morningPostWorkout: true },
        ...adjustedRest.slice(0, firstSolidIdx).map(s => ({ ...s, type: 'solid', slot: 'lunch' })),
        ...adjustedRest.slice(firstSolidIdx + 1),
      ]
      : adjustedRest;
    const postTimes = spaceTimesFromStart(postWindowStart, effectiveDayEnd, orderedRest.map(slotDur));
    nudgeLastMeal(postTimes, orderedRest);
    const postSlots = orderedRest.map((s, i) => ({ ...s, time: i < postTimes.length ? toTime(postTimes[i]) : s.time }));
    return {
      slots: [preSlot, ...postSlots],
      spacingFeedback: buildSpacingFeedback([[postWindowStart, effectiveDayEnd]], 1),
    };
  }

  // Buffer pré-treino: 7+ refeições → 120 min (rotina densa), 6 ou menos → 180 min (digestão ideal)
  const PRE_BUFFER = (mealsPerDay || 6) >= 7 ? 120 : 180;

  // Estende a janela quando o buffer pós-treino já ultrapassa o dayEnd (ex.: treino perto da hora de dormir)
  const effectiveDayEnd = tEndAdj + POST_BUFFER > dayEnd ? Math.min(tEndAdj + 90, sleepMin - 30) : dayEnd;

  // Treino noturno tardio: termina 30–60 min antes de dormir → shake leve pós-treino sem slot extra
  if (tStart >= 960 && n >= 2 && (sleepMin - tEnd) >= 30 && (sleepMin - tEnd) <= 60) {
    const postIdx = (() => {
      for (let i = slots.length - 1; i >= 0; i--) { if (slots[i].type === 'shake') return i; }
      return -1;
    })();
    if (postIdx !== -1) {
      const shakeTime = roundQ(tEnd + 10);
      const postSlot = { ...slots[postIdx], slot: 'post_workout_night' };
      const preSlots = [...slots.slice(0, postIdx), ...slots.slice(postIdx + 1)];
      const nPre = preSlots.length;
      const preAnchor = roundQ(tStart - 90);
      let preTimes;
      if (nPre === 0) {
        preTimes = [];
      } else if (nPre === 1) {
        preTimes = [preAnchor];
      } else {
        const NATURAL_ANCHOR = { breakfast: wakeMin + 15, lunch: 780 };
        const anchorsValid = Object.values(NATURAL_ANCHOR).every(a => a >= dayStart && a < preAnchor);
        if (!anchorsValid) {
          const earlyEnd = preAnchor - 150;
          preTimes = earlyEnd > dayStart
            ? [...spaceTimes(dayStart, earlyEnd, nPre - 1, preSlots.slice(0, nPre - 1).map(slotDur)), preAnchor]
            : spaceTimes(dayStart, preAnchor, nPre, preSlots.map(slotDur));
        } else {
          const raw = preSlots.map((s, i) => {
            if (i === nPre - 1) return preAnchor;
            const a = NATURAL_ANCHOR[s.slot];
            return (s.type === 'solid' && a !== undefined) ? a : null;
          });
          for (let i = 0; i < raw.length - 1; i++) {
            if (raw[i] !== null) continue;
            const prev = raw.slice(0, i).reverse().find(v => v !== null) ?? dayStart;
            let ni = i + 1; while (ni < raw.length && raw[ni] === null) ni++;
            const next = raw[ni] ?? preAnchor;
            const gap = ni - i;
            for (let k = 0; k < gap; k++) raw[i + k] = prev + (next - prev) * (k + 1) / (gap + 1);
            i = ni - 1;
          }
          preTimes = raw.map(t => roundQ(t ?? preAnchor));
        }
      }
      const allSlots = [...preSlots, postSlot];
      const times = [...preTimes, shakeTime];
      if (spacingChecks.length === 0) {
        for (let i = 1; i < times.length; i++) {
          spacingChecks.push({ gapUsed: times[i] - times[i - 1] - slotDur(allSlots[i - 1]) });
        }
      }
      return {
        slots: allSlots.map((s, i) => ({ ...s, time: i < times.length ? toTime(times[i]) : s.time })),
        spacingFeedback: buildSpacingFeedback([[dayStart, preAnchor]]),
      };
    }
  }

  // Treino à tarde/noite (≥ 16:00, ciclo normalizado): distribuição ancorada para horários humanos
  // — pino pré-treino 90 min antes + slots pós-treino adaptativos (2 se janela ≥ 60 min, 1 caso contrário)
  if (tStart >= 960 && n >= 2 && (effectiveDayEnd - (tEndAdj + POST_BUFFER)) >= 30) {
    const postWin = effectiveDayEnd - (tEndAdj + POST_BUFFER);
    const nPost = postWin >= 60 ? Math.min(n - 1, 2) : 1;
    const nPre  = n - nPost;
    const lastPreIsShake = nPre >= 1 && slots[nPre - 1]?.type === 'shake';
    const preBuffer   = lastPreIsShake ? 60 : 90;
    const preAnchor   = roundQ(tStart - preBuffer);

    const postTimes = spaceTimes(tEndAdj + POST_BUFFER, effectiveDayEnd, nPost, slots.slice(nPre).map(slotDur));

    let preTimes;
    if (nPre === 0) {
      preTimes = [];
    } else if (nPre === 1) {
      preTimes = [preAnchor];
    } else {
      // Janelas naturais para refeições sólidas (em minutos desde meia-noite)
      // Café da Manhã: 07:15 (435), Almoço: 13:00 (780) ou recuado para garantir 2h30 antes do shake pré-treino
      const NATURAL_ANCHOR = { breakfast: wakeMin + 15, lunch: lastPreIsShake ? Math.min(780, preAnchor - 150) : 780 };
      const preSlots = slots.slice(0, nPre);
      const anchorsValid = Object.values(NATURAL_ANCHOR).every(a => a >= dayStart && a < preAnchor);
      if (!anchorsValid) {
        const earlyEnd = preAnchor - 150;
        preTimes = earlyEnd > dayStart
          ? [...spaceTimes(dayStart, earlyEnd, nPre - 1, slots.slice(0, nPre - 1).map(slotDur)), preAnchor]
          : spaceTimes(dayStart, preAnchor, nPre, slots.slice(0, nPre).map(slotDur));
      } else {
        const raw = preSlots.map((s, i) => {
          if (i === nPre - 1) return preAnchor;
          const a = NATURAL_ANCHOR[s.slot];
          return (s.type === 'solid' && a !== undefined) ? a : null;
        });
        for (let i = 0; i < raw.length - 1; i++) {
          if (raw[i] !== null) continue;
          const prev = raw.slice(0, i).reverse().find(v => v !== null) ?? dayStart;
          let ni = i + 1;
          while (ni < raw.length && raw[ni] === null) ni++;
          const next = raw[ni] ?? preAnchor;
          const gap = ni - i;
          for (let k = 0; k < gap; k++) raw[i + k] = prev + (next - prev) * (k + 1) / (gap + 1);
          i = ni - 1;
        }
        preTimes = raw.map(t => roundQ(t ?? preAnchor));
      }
    }

    const times = [...preTimes, ...postTimes];
    if (spacingChecks.length === 0) {
      for (let i = 1; i < times.length; i++) {
        spacingChecks.push({ gapUsed: times[i] - times[i - 1] - slotDur(slots[i - 1]) });
      }
    }
    // Cap kcal do shake pré-treino de tarde/noite e redistribui excedente para slots pós-treino.
    // Só atua quando o último slot pré-treino é shake (pré-treino 45–75 min antes) e tem mais de 280 kcal.
    const adjustedSlots = (() => {
      if (!lastPreIsShake) return slots;
      const preIdx = nPre - 1;
      const originalPreKcal = slots[preIdx]?.kcal || 0;
      const cappedKcal = Math.min(originalPreKcal, 280);
      const excedente = originalPreKcal - cappedKcal;
      if (excedente <= 0) return slots;
      const postTotal = slots.slice(nPre).reduce((sum, s) => sum + (s.kcal || 0), 0);
      return slots.map((s, i) => {
        if (i === preIdx) return { ...s, kcal: cappedKcal };
        if (i >= nPre && postTotal > 0) return { ...s, kcal: Math.round((s.kcal || 0) + excedente * ((s.kcal || 0) / postTotal)) };
        return s;
      });
    })();
    return {
      slots: adjustedSlots.map((s, i) => ({ ...s, time: i < times.length ? toTime(times[i]) : s.time })),
      spacingFeedback: buildSpacingFeedback([[dayStart, preAnchor], [tEndAdj + POST_BUFFER, effectiveDayEnd]]),
    };
  }

  const preWindowEnd = tStart - PRE_BUFFER;
  const postWindowStart = tEndAdj + POST_BUFFER;

  const preAvail = preWindowEnd - dayStart;
  const postAvail = effectiveDayEnd - postWindowStart;

  let nPre, nPost;
  if (preAvail <= 0) {
    nPre = 0; nPost = n;
  } else if (postAvail <= 0) {
    nPre = n; nPost = 0;
  } else {
    const ratio = preAvail / (preAvail + postAvail);
    nPre = Math.round(n * ratio);
    nPost = n - nPre;
    if (nPre === 0) { nPre = 1; nPost = n - 1; }
    if (nPost === 0) { nPost = 1; nPre = n - 1; }
    if (nPost > 1 && postAvail / nPost < 30) {
      nPost = Math.max(1, Math.floor(postAvail / 45));
      nPre = n - nPost;
    }
  }

  const times = [
    ...spaceTimes(dayStart, preWindowEnd, nPre, slots.slice(0, nPre).map(slotDur)),
    ...spaceTimes(postWindowStart, effectiveDayEnd, nPost, slots.slice(nPre).map(slotDur)),
  ];

  return {
    slots: slots.map((s, i) => ({ ...s, time: i < times.length ? toTime(times[i]) : s.time })),
    spacingFeedback: buildSpacingFeedback([[dayStart, preWindowEnd], [postWindowStart, effectiveDayEnd]]),
  };
}
