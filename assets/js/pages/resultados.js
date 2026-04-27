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
  shake_morning: 'Shake da Manhã',
  lunch: 'Almoço',
  shake_afternoon: 'Shake da Tarde',
  dinner: 'Jantar',
  shake_night: 'Shake da Ceia',
  shake_extra: 'Shake Extra',
  shake_extra2: 'Shake Extra 2',
  pre_workout_light: 'Shake Pré-Treino Leve',
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

  // Tags de interpretação
  const tags = [];
  if (profile.falsoMagro) tags.push('Falso Magro');
  if (profile.difficulty) tags.push(DIFFICULTY_LABEL[profile.difficulty] || profile.difficulty);
  tags.push(ACTIVITY_LABEL[profile.activity] || 'Ativo');
  tags.push(STRATEGY_LABEL[routine.strategy] || 'Híbrido');

  // Interpretação textual
  const interpretation = buildInterpretation(profile, routine, results);

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
  const slotsWithTraining = (() => {
    const corrected = rebuildTimesAroundTraining(results.slotDistribution || [], routine);
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

  mount.innerHTML = `
    <div class="container">
      <div class="results-hero">
        <h1 class="hero-title">Seu Plano Personalizado</h1>
        <p class="hero-sub">Baseado no Sistema de Alimentação Híbrida para Hardgainers</p>
      </div>

      <!-- Macro cards -->
      <div class="macro-grid">
        <div class="macro-card cal">
          <div class="macro-head">
            <span class="macro-dot">${icons.flame(16)}</span>
            <span>Calorias</span>
          </div>
          <div class="macro-val">${formatKcal(results.calories)}<span class="macro-unit">kcal/dia</span></div>
          <div class="macro-bar"><div class="macro-bar-fill" style="width: 100%; background: var(--cal-color);"></div></div>
        </div>
        <div class="macro-card protein">
          <div class="macro-head">
            <span class="macro-dot">${icons.meat(16)}</span>
            <span>Proteína</span>
          </div>
          <div class="macro-val">${results.protein.grams}g<span class="macro-unit">${results.protein.pct}% • ${formatKcal(results.protein.kcal)} kcal</span></div>
          <div class="macro-bar"><div class="macro-bar-fill" style="width: ${results.protein.pct * 2}%; background: var(--protein-color); max-width: 100%;"></div></div>
        </div>
        <div class="macro-card carb">
          <div class="macro-head">
            <span class="macro-dot">${icons.wheat(16)}</span>
            <span>Carboidratos</span>
          </div>
          <div class="macro-val">${results.carb.grams}g<span class="macro-unit">${results.carb.pct}% • ${formatKcal(results.carb.kcal)} kcal</span></div>
          <div class="macro-bar"><div class="macro-bar-fill" style="width: ${results.carb.pct * 1.5}%; background: var(--carb-color); max-width: 100%;"></div></div>
        </div>
        <div class="macro-card fat">
          <div class="macro-head">
            <span class="macro-dot">${icons.droplet(16)}</span>
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
          <div class="stat-desc">com a sua atividade</div>
        </div>
        <div class="stat accent">
          <div class="stat-label">Superávit</div>
          <div class="stat-val">+${formatKcal(results.surplus)}</div>
          <div class="stat-desc">Meta: ${results.weeklyGainLowKg}–${results.weeklyGainHighKg}kg/semana</div>
        </div>
      </div>

      <!-- Perfil interpretation -->
      <div class="card">
        <h3 class="card-title">Interpretação do Seu Perfil</h3>
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

      <!-- Hybrid system -->
      <div class="card">
        <h3 class="card-title">Sistema Híbrido Recomendado</h3>
        <p class="card-sub">${routine.mealsPerDay || 6} refeições distribuídas ao longo do dia</p>
        <div class="macro-grid macro-grid-2" style="margin-top: 14px;">
          <div class="macro-card">
            <div class="macro-head"><span class="macro-dot">${icons.utensils(16)}</span><span>Refeições Sólidas</span></div>
            <div class="macro-val">${solidCount}<span class="macro-unit">por dia</span></div>
          </div>
          <div class="macro-card">
            <div class="macro-head"><span class="macro-dot">${icons.droplet(16)}</span><span>Shakes Anabólicos</span></div>
            <div class="macro-val">${shakeCount}<span class="macro-unit">por dia</span></div>
          </div>
        </div>
        <div class="hint" style="margin-top: 14px;">
          <span class="hint-icon">${icons.clock(18)}</span>
          <div><strong>Intervalo ideal:</strong> 2h30 a 3h entre refeições. O líquido digere mais rápido e evita que o próximo prato chegue com o estômago ainda cheio.</div>
        </div>
      </div>

      <!-- Macros distribution -->
      <div class="card">
        <h3 class="card-title">Distribuição Diária de Macros</h3>
        <div class="tabs" role="tablist">
          <button type="button" class="tab active" data-tab="visual" role="tab">Visual</button>
          <button type="button" class="tab" data-tab="tabela" role="tab">Tabela</button>
        </div>
        <div id="tab-content-visual" class="tab-content">
          <div class="meal-list">
            ${slotsWithTraining.map(s => s.slot === '__train__' ? `
              <div class="meal-row" style="border-left: 3px solid var(--accent); background: var(--surface);">
                <div class="meal-time">${s.time || trainLabel}</div>
                <div class="meal-name">Treino${routine.trainEndTime ? ' – ' + routine.trainEndTime : ''}</div>
                <span class="meal-tag" style="background:var(--accent);color:#fff;">${trainDurDisplay || trainLabel}</span>
                <div class="meal-macros"><span class="meal-macro-label"></span><span class="meal-macro-val"></span></div>
              </div>
            ` : `
              <div class="meal-row">
                <div class="meal-time">${s.time || ''}</div>
                <div class="meal-name">${SLOT_LABEL[s.slot] || s.slot}</div>
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
          <table class="data-table">
            <thead><tr><th>Refeição</th><th>Tipo</th><th>Horário</th><th style="text-align:right">kcal</th></tr></thead>
            <tbody>
              ${slotsWithTraining.map(s => s.slot === '__train__' ? `
                <tr style="background:var(--surface);">
                  <td><strong>Treino</strong></td>
                  <td><span style="font-size:.8rem;background:var(--accent);color:#fff;padding:2px 7px;border-radius:4px;">Exercício</span></td>
                  <td>${s.time ? s.time + (routine.trainEndTime ? ' – ' + routine.trainEndTime : '') : trainTimeDisplay}</td>
                  <td style="text-align:right;color:var(--ink-soft);">${trainDurDisplay}</td>
                </tr>
              ` : `
                <tr>
                  <td>${SLOT_LABEL[s.slot] || s.slot}</td>
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

function buildInterpretation(profile, routine, results) {
  const parts = [];

  if (profile.falsoMagro) {
    parts.push(`Você é magro na aparência geral mas carrega gordura na região abdominal. Isso pede um superávit mais controlado (${results.surplus} kcal em vez dos ${results.surplus + 250} kcal típicos) e proteína mais alta para recomposição corporal.`);
  } else if (profile.difficulty === 'ultra_acelerado') {
    parts.push(`Seu metabolismo queima muito rápido. Aplicamos um superávit maior (${results.surplus} kcal) para compensar o gasto energético elevado e garantir progresso semana a semana.`);
  } else if (profile.difficulty === 'apetite_baixo') {
    parts.push(`Com apetite baixo, começamos com um superávit mais realista (${results.surplus} kcal). É melhor comer pouco a mais todos os dias do que tentar grandes volumes e falhar.`);
  } else if (profile.difficulty === 'volume_baixo') {
    parts.push(`Você estufa rápido. Por isso priorizamos alimentos mais calóricos por grama (pasta de amendoim, azeite, shakes) e mais gordura — para concentrar energia em pouco volume.`);
  } else if (profile.difficulty === 'rotina_corrida') {
    parts.push(`Com rotina apertada, a praticidade é crucial. O Sistema Híbrido com shakes resolve isso: líquidos prontos em 2 minutos nos intervalos entre sólidos.`);
  } else if (profile.difficulty === 'falta_consistencia') {
    parts.push(`A consistência é o que faltou. Este plano define exatamente o que comer todos os dias — sem decisão no momento, sem desculpa.`);
  } else {
    parts.push(`Você é um hardgainer clássico — metabolismo que queima fácil e dificuldade para ganhar peso. A estratégia é simples: superávit de ${results.surplus} kcal consistente com proteína adequada e carboidratos de digestão leve.`);
  }

  if (routine.strategy === 'practical') {
    parts.push(`Como escolheu máxima praticidade, mais da metade das calorias virão de shakes — isso poupa tempo e estômago.`);
  } else if (routine.strategy === 'solid') {
    parts.push(`Você preferiu mais refeições sólidas — melhor para saciedade e nutrientes, mas exige tempo e espaço no estômago.`);
  }

  return parts.join(' ');
}

function buildRecommendations(profile, routine, results) {
  const recs = [];

  // Priorize carbos leves
  recs.push({
    title: 'Priorize carboidratos de digestão leve',
    body: 'Arroz branco, arroz basmati, pão francês, batata cozida, macarrão. Evite excesso de fibras (arroz integral, pão integral) — enchem rápido e dificultam atingir o volume calórico.',
  });

  // Proteína em cada refeição
  recs.push({
    title: 'Proteína em todas as refeições',
    body: `Distribua ~${Math.round(results.protein.grams / (routine.mealsPerDay || 6))}g de proteína por refeição. Fonte ideal: ovos, frango, carne vermelha magra, whey nos shakes.`,
  });

  // Falso magro específico
  if (profile.falsoMagro) {
    recs.push({
      title: 'Atenção à gordura abdominal',
      body: 'Evite bebidas açucaradas, doces refinados e excessos noturnos. Priorize sólidos nas refeições principais e meça a cintura a cada 2 semanas junto com o peso.',
    });
  } else {
    recs.push({
      title: 'Não pule a ceia pré-sono',
      body: 'O shake da ceia (antes de dormir) é crucial — durante o sono o corpo entra em estado anabólico. Caseína, iogurte grego ou um shake denso são ideais.',
    });
  }

  // Intervalos
  recs.push({
    title: 'Respeite intervalos de 2h30 a 3h',
    body: 'Este é o ponto nevrálgico do Sistema Híbrido: tempo suficiente para digerir o sólido anterior mas curto o bastante para chegar à próxima refeição com "fome funcional".',
  });

  // Treino
  if (profile.activity === 'sedentary' || routine.trainDays <= 1) {
    recs.push({
      title: 'Considere adicionar treino de força',
      body: 'Sem estímulo muscular, grande parte do superávit vira gordura. Mesmo 2-3 treinos curtos por semana já fazem enorme diferença no ganho de massa magra.',
    });
  } else {
    recs.push({
      title: 'Coma mais nos dias de treino',
      body: 'Se puder flexibilizar, distribua +200 a +300 kcal nos dias em que treina (principalmente no almoço pós-treino ou shake da tarde).',
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
  if (!trainDays || trainDays <= 0) return slots;
  if (!trainStartTime || !trainEndTime) return slots;

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
  if (n === 0) return slots;

  const spaceTimes = (ws, we, count) => {
    if (count === 0) return [];
    if (count === 1) return [roundQ(Math.max(ws, Math.min(we, (ws + we) / 2)))];
    const step = (we - ws) / (count - 1);
    return Array.from({ length: count }, (_, i) => roundQ(ws + i * step));
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
        return slots.map((s, i) => ({ ...s, time: toTime(base[i] + delta) }));
      }
    }
    const firstSlot = { ...slots[0], time: toTime(firstMealTime) };
    if (n === 1) return [firstSlot];
    const restTimes = spaceTimes(firstMealTime + 150, effectiveDayEnd, n - 1);
    const restSlots = slots.slice(1).map((s, i) => ({ ...s, time: i < restTimes.length ? toTime(restTimes[i]) : s.time }));
    return [firstSlot, ...restSlots];
  }

  // Treino antes das 10:00 (ciclo normalizado) sem jejum → primeiro slot vira pré-treino leve
  if (tStart < 600) {
    const originalKcal = slots[0].kcal || 0;
    const preKcal = originalKcal < 180 ? originalKcal : Math.min(originalKcal, 250);
    const excedente = originalKcal - preKcal;
    const preSlot = { ...slots[0], slot: 'pre_workout_light', type: 'shake', kcal: preKcal, time: toTime(Math.max(0, tStart - 30)) };
    const restSlots = slots.slice(1);
    // Redistribuir excedente proporcionalmente pelas kcal originais dos slots pós-treino
    const totalRestKcal = restSlots.reduce((sum, s) => sum + (s.kcal || 0), 0);
    const adjustedRest = (excedente > 0 && totalRestKcal > 0)
      ? restSlots.map(s => ({ ...s, kcal: Math.round((s.kcal || 0) + excedente * ((s.kcal || 0) / totalRestKcal)) }))
      : restSlots;
    const postWindowStart = tEndAdj + POST_BUFFER;
    const effectiveDayEnd = tEndAdj > dayEnd ? Math.min(tEndAdj + 90, sleepMin - 30) : dayEnd;
    const postTimes = spaceTimes(postWindowStart, effectiveDayEnd, adjustedRest.length);
    const postSlots = adjustedRest.map((s, i) => ({ ...s, time: i < postTimes.length ? toTime(postTimes[i]) : s.time }));
    return [preSlot, ...postSlots];
  }

  // Buffer pré-treino: 7+ refeições → 120 min (rotina densa), 6 ou menos → 180 min (digestão ideal)
  const PRE_BUFFER = (mealsPerDay || 6) >= 7 ? 120 : 180;

  const effectiveDayEnd = tEndAdj > dayEnd ? Math.min(tEndAdj + 90, sleepMin - 30) : dayEnd;

  // Treino à tarde/noite (≥ 16:00, ciclo normalizado): distribuição ancorada para horários humanos
  // — pino pré-treino 90 min antes + mínimo 2 slots pós-treino (jantar + ceia)
  if (tStart >= 960 && n >= 2 && (effectiveDayEnd - (tEndAdj + POST_BUFFER)) >= 60) {
    const preAnchor = roundQ(tStart - 90);
    const nPost = Math.min(n - 1, 2);
    const nPre  = n - nPost;

    const postTimes = spaceTimes(tEndAdj + POST_BUFFER, effectiveDayEnd, nPost);

    let preTimes;
    const earlyEnd = preAnchor - 150;
    if (nPre === 0) {
      preTimes = [];
    } else if (nPre === 1) {
      preTimes = [preAnchor];
    } else if (earlyEnd > dayStart) {
      preTimes = [...spaceTimes(dayStart, earlyEnd, nPre - 1), preAnchor];
    } else {
      preTimes = spaceTimes(dayStart, preAnchor, nPre);
    }

    const times = [...preTimes, ...postTimes];
    return slots.map((s, i) => ({ ...s, time: i < times.length ? toTime(times[i]) : s.time }));
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
    ...spaceTimes(dayStart, preWindowEnd, nPre),
    ...spaceTimes(postWindowStart, effectiveDayEnd, nPost),
  ];

  return slots.map((s, i) => ({ ...s, time: i < times.length ? toTime(times[i]) : s.time }));
}
