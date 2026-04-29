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
  const scheduleData = rebuildTimesAroundTraining(results.slotDistribution || [], routine);
  const spacingFeedback = scheduleData.spacingFeedback;
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

    if (tightestGap < 90) {
      return {
        level: 'danger',
        headline: 'Analisámos a sua rotina: os intervalos ficaram curtos demais.',
        message: 'Algumas refeições ficaram próximas demais para uma rotina confortável. Este cenário pode ser difícil de manter na prática.',
        detail: `A sua 'janela acordado' é o período entre a hora em que acorda e a hora em que vai dormir. É dentro desse espaço que a app tenta encaixar refeições, shakes e treino.\n\nQuando o intervalo real entre refeições fica abaixo de 1h30, pode ser difícil digerir bem, sentir fome novamente e repetir a rotina todos os dias sem desconforto.\n\nIsso não significa que você falhou. Significa apenas que a sua rotina atual tem pouco espaço para tantas refeições.\n\nTente uma destas soluções:\n• reduzir o número de refeições;\n• transformar uma refeição sólida em shake;\n• acordar um pouco mais cedo ou dormir um pouco mais tarde, se isso fizer sentido;\n• manter 6 refeições em vez de 7 ou 8.`,
      };
    }

    if (tightestGap < 120) {
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
      return {
        level: 'info',
        headline: 'Analisámos a sua rotina: o Sistema Híbrido encaixa na sua janela diária.',
        message: 'Com 6 refeições, a estrutura clássica do Sistema Híbrido fica bem distribuída, desde que mantenha consistência nos horários.',
        detail: 'A sua "janela acordado" é o período entre a hora em que acorda e a hora em que vai dormir. É dentro desse espaço que a app tenta encaixar café da manhã, almoço, jantar, shakes e treino.\n\nQuanto mais refeições entram dentro da mesma janela, menor fica o intervalo entre uma refeição e outra. Por isso, 6 refeições continuam a fazer sentido no Sistema Híbrido, mas exigem mais organização.\n\nOs shakes ajudam exatamente aqui: são mais rápidos de consumir, mais leves que refeições sólidas e facilitam atingir calorias sem obrigar você a comer pratos grandes o tempo todo.\n\nO ideal é manter 2h30 a 3h entre refeições. Mas se a rotina permitir pelo menos 2h reais entre elas, o plano continua funcional.',
      };
    }

    if (n === 6) {
      return {
        level: 'success',
        headline: 'Analisámos a sua rotina: o Sistema Híbrido encaixa confortavelmente na sua janela diária.',
        message: 'Com 6 refeições e uma boa margem entre elas, a estrutura clássica do Sistema Híbrido funciona bem na sua rotina.',
        detail: 'A sua "janela acordado" é o período entre a hora em que acorda e a hora em que vai dormir. É dentro desse espaço que a app distribui café da manhã, almoço, jantar, shakes e treino.\n\n6 refeições é a estrutura clássica do Sistema Híbrido: normalmente 3 refeições sólidas e 3 shakes anabólicos. Essa combinação existe por um motivo concreto — os shakes são consumidos mais rapidamente, pesam menos no estômago e facilitam atingir o superávit calórico sem precisar comer grandes volumes a cada refeição.\n\nCom a sua janela acordado atual, há espaço confortável entre cada refeição. Isso significa menos pressão para seguir horários exatos e mais margem para quando o dia não corre perfeito — o que torna o plano mais sustentável a longo prazo.',
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
    const times = [startTime];

    for (let i = 1; i < safeDurations.length; i++) {
      const currentStart = times[i - 1];
      const prevDur = safeDurations[i - 1];
      const remainingDur = safeDurations.slice(i, -1).reduce((sum, d) => sum + d, 0);
      const remainingIntervals = safeDurations.length - i - 1;
      const minFutureSpan = remainingDur + Math.max(0, remainingIntervals) * 120;

      let chosenGap = 120;
      for (const gapTarget of TARGET_GAPS) {
        const nextStart = currentStart + prevDur + gapTarget;
        if (nextStart + minFutureSpan <= we) {
          chosenGap = gapTarget;
          break;
        }
      }

      times.push(currentStart + prevDur + chosenGap);
      spacingChecks.push({ gapUsed: chosenGap });
    }

    return times.map(roundQ);
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
    const postTimes = spaceTimes(postWindowStart, effectiveDayEnd, adjustedRest.length, adjustedRest.map(slotDur));
    const postSlots = adjustedRest.map((s, i) => ({ ...s, time: i < postTimes.length ? toTime(postTimes[i]) : s.time }));
    return {
      slots: [preSlot, ...postSlots],
      spacingFeedback: buildSpacingFeedback([[postWindowStart, effectiveDayEnd]], 1),
    };
  }

  // Buffer pré-treino: 7+ refeições → 120 min (rotina densa), 6 ou menos → 180 min (digestão ideal)
  const PRE_BUFFER = (mealsPerDay || 6) >= 7 ? 120 : 180;

  // Estende a janela quando o buffer pós-treino já ultrapassa o dayEnd (ex.: treino perto da hora de dormir)
  const effectiveDayEnd = tEndAdj + POST_BUFFER > dayEnd ? Math.min(tEndAdj + 90, sleepMin - 30) : dayEnd;

  // Treino à tarde/noite (≥ 16:00, ciclo normalizado): distribuição ancorada para horários humanos
  // — pino pré-treino 90 min antes + slots pós-treino adaptativos (2 se janela ≥ 60 min, 1 caso contrário)
  if (tStart >= 960 && n >= 2 && (effectiveDayEnd - (tEndAdj + POST_BUFFER)) >= 30) {
    const postWin = effectiveDayEnd - (tEndAdj + POST_BUFFER);
    const nPost = postWin >= 60 ? Math.min(n - 1, 2) : 1;
    const nPre  = n - nPost;
    // Distância mínima ao treino = digestão + duração real da refeição:
    // sólido → 210 min (180 digestão + 30 duração); shake → 90 min (digestão rápida, duração curta já incluída)
    const preSlotType = nPre > 0 ? (slots[nPre - 1]?.type || 'solid') : 'solid';
    const preBuffer   = preSlotType === 'solid' ? 210 : 90;
    const preAnchor   = roundQ(tStart - preBuffer);

    const postTimes = spaceTimes(tEndAdj + POST_BUFFER, effectiveDayEnd, nPost, slots.slice(nPre).map(slotDur));

    let preTimes;
    if (nPre === 0) {
      preTimes = [];
    } else if (nPre === 1) {
      preTimes = [preAnchor];
    } else {
      // Janelas naturais para refeições sólidas (em minutos desde meia-noite)
      // Café da Manhã: 07:15 (435), Almoço: 13:00 (780)
      const NATURAL_ANCHOR = { breakfast: wakeMin + 15, lunch: 780 };
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
    return {
      slots: slots.map((s, i) => ({ ...s, time: i < times.length ? toTime(times[i]) : s.time })),
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
