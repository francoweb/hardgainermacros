/**
 * PAGE — Rotina (Etapa 3)
 * =============================================================================
 * Recolhe:
 *  - dias de treino por semana (0-7)
 *  - horário de início e fim do treino (trainTime inferido automaticamente)
 *  - número de refeições por dia (4-8, ideal 6)
 *  - estratégia (solid / hybrid / practical)
 *
 * Ao submeter:
 *  - guarda routine
 *  - corre calcAll() -> guarda results
 *  - marca STEP3_DONE + RESULTS_READY
 *  - navega para /resultados
 * =============================================================================
 */

import { renderStepper } from '../components/ui.js';
import { icons } from '../modules/icons.js';
import { navigate, markProgress } from '../modules/router.js';
import {
  saveRoutine, loadRoutine,
  loadFormData, loadProfile,
  saveResults,
  K, local,
} from '../modules/storage.js';
import { calcAll } from '../modules/calculator.js';

const STRATEGIES = [
  { id: 'solid',     title: 'Mais Refeições Sólidas', desc: '70% sólido + 30% shakes. Mais mastigação e saciedade.', badge: null },
  { id: 'hybrid',    title: 'Sistema Híbrido',        desc: '60% sólido + 40% shakes. A combinação do ebook.',    badge: 'Recomendado' },
  { id: 'practical', title: 'Máxima Praticidade',    desc: '45% sólido + 55% shakes. Para rotinas muito corridas.', badge: null },
];

const WINDOW_RANGES = {
  morning:   { min: 360,  max: 840,  label: 'Manhã' },
  afternoon: { min: 840,  max: 1080, label: 'Tarde' },
  evening:   { min: 1080, max: 1440, label: 'Noite' },
  dawn:      { min: 0,    max: 360,  label: 'Madrugada' },
};

const getWindowForTime = mins => {
  if (mins < 360) return 'dawn';
  if (mins < 840) return 'morning';
  if (mins < 1080) return 'afternoon';
  return 'evening';
};

function buildSleepHint(start, end) {
  if (!start || !end) return 'Preencha para calcular a duração do sono';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let s = sh * 60 + sm, e = eh * 60 + em;
  if (e <= s) e += 1440;
  const dur = e - s;
  const h = Math.floor(dur / 60), m = dur % 60;
  const str = m ? `${h}h ${m}min` : `${h}h`;
  return dur < 360 ? `⚠ ${str} — pouco para recuperação muscular` : `✓ ${str} de sono`;
}

export function renderRotinaPage(mount) {
  const existing = loadRoutine() || {
    trainDays: 4,
    trainTime: null,
    trainStartTime: '',
    trainEndTime: '',
    trainDurationMinutes: null,
    mealsPerDay: 6,
    strategy: 'hybrid',
    trainFasted: false,
    sleepStartTime: '23:00',
    sleepEndTime: '07:00',
  };

  const initHint = (() => {
    if (!existing.trainStartTime) return { text: 'Preencha o horário de início para detectar o período', highlight: false };
    const [h, m] = existing.trainStartTime.split(':').map(Number);
    const mins = h * 60 + m;
    const period = WINDOW_RANGES[getWindowForTime(mins)]?.label || '';
    if (existing.trainDurationMinutes != null) {
      return { text: `Período detectado: ${period} · ${existing.trainDurationMinutes} min de treino`, highlight: true };
    }
    return { text: `Período detectado: ${period} — preencha o fim para calcular a duração`, highlight: false };
  })();

  const initFastedVisible = !!(existing.trainStartTime && existing.trainEndTime && (() => {
    const toM = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const wake = existing.sleepEndTime ? toM(existing.sleepEndTime) : 420;
    let sleep = existing.sleepStartTime ? toM(existing.sleepStartTime) : 1380;
    if (sleep <= wake) sleep += 1440;
    const sM = toM(existing.trainStartTime);
    let eM = toM(existing.trainEndTime);
    if (eM < sM) eM += 1440;
    const dur = eM - sM;
    const norm = (sleep > 1440 && sM < wake && (sM + 1440) <= sleep) ? sM + 1440 : sM;
    if (norm < wake || norm >= sleep) return false;
    if (dur > 120) return false;
    if (norm + dur > sleep) return false;
    return norm - wake <= 60;
  })());

  const initSleepHint = buildSleepHint(existing.sleepStartTime || '23:00', existing.sleepEndTime || '07:00');

  mount.innerHTML = `
    <div class="container">
      ${renderStepper(3)}

      <div class="card">
        <div class="card-head">
          <h2 class="card-title">Sua Rotina de Treino</h2>
          <p class="card-sub">Ajustamos o plano conforme o seu dia-a-dia</p>
        </div>

        <!-- Training days slider -->
        <div class="field">
          <label class="label">Quantos dias por semana treina? <span class="label-help" title="Mesmo 0 dias contabiliza — ajustamos o plano para recuperação ativa.">${icons.helpCircle(14)}</span></label>
          <div class="slider-wrap">
            <div class="slider-value" id="sv-days">${existing.trainDays} ${existing.trainDays === 1 ? 'dia' : 'dias'}</div>
            <input id="sl-days" type="range" class="slider" min="0" max="7" step="1" value="${existing.trainDays}" />
            <div class="slider-labels">
              <span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span>
            </div>
          </div>
        </div>

        <!-- Horário de Sono / Descanso -->
        <div class="field">
          <label class="label">Horário de Sono <span class="label-help" title="Usado para calcular os horários ideais de refeição ao longo do dia.">${icons.helpCircle(14)}</span></label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label class="label" for="in-sleep-start">Deitar</label>
              <div class="input-wrap">
                <span class="input-icon">${icons.clock(16)}</span>
                <input id="in-sleep-start" type="time" class="input" value="${existing.sleepStartTime || '23:00'}" />
              </div>
            </div>
            <div>
              <label class="label" for="in-sleep-end">Acordar</label>
              <div class="input-wrap">
                <span class="input-icon">${icons.clock(16)}</span>
                <input id="in-sleep-end" type="time" class="input" value="${existing.sleepEndTime || '07:00'}" />
              </div>
            </div>
          </div>
          <div class="slider-hint" id="hint-sleep" style="margin-top: 8px;">${initSleepHint}</div>
        </div>

        <!-- Horário do Seu Treino -->
        <div class="field" id="field-train-detail">
          <label class="label">Horário do Seu Treino <span class="label-help" title="Deixe em branco se não treina. O período é detectado automaticamente pelo horário de início.">${icons.helpCircle(14)}</span></label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label class="label" for="in-train-start">Início</label>
              <div class="input-wrap">
                <span class="input-icon">${icons.clock(16)}</span>
                <input id="in-train-start" type="time" class="input" value="${existing.trainStartTime || ''}" />
              </div>
            </div>
            <div>
              <label class="label" for="in-train-end">Fim</label>
              <div class="input-wrap">
                <span class="input-icon">${icons.clock(16)}</span>
                <input id="in-train-end" type="time" class="input" value="${existing.trainEndTime || ''}" />
              </div>
            </div>
          </div>
          <div class="slider-hint${initHint.highlight ? ' highlight' : ''}" id="hint-train" style="margin-top: 8px;">${initHint.text}</div>
          <div class="field-error" id="err-traintime"></div>
        </div>

        <!-- Treina em jejum (condicional) -->
        <div class="field" id="field-fasted" style="display: ${initFastedVisible ? 'block' : 'none'};">
          <label class="label">Treina em jejum?</label>
          <div class="option-grid option-grid-2" id="g-fasted">
            <button type="button" class="option ${!existing.trainFasted ? 'selected' : ''}" data-fasted="false">
              <span class="option-body">
                <span class="option-title">Não</span>
                <span class="option-desc">Faço uma refeição antes</span>
              </span>
            </button>
            <button type="button" class="option ${existing.trainFasted ? 'selected' : ''}" data-fasted="true">
              <span class="option-body">
                <span class="option-title">Sim</span>
                <span class="option-desc">Acordo e treino em jejum</span>
              </span>
            </button>
          </div>
        </div>

        <!-- Meals per day slider -->
        <div class="field">
          <label class="label">Quantas refeições consegue fazer por dia? <span class="label-help" title="O Sistema Híbrido recomenda 6 refeições com intervalos de 2h30 a 3h.">${icons.helpCircle(14)}</span></label>
          <div class="slider-wrap">
            <div class="slider-value" id="sv-meals">${existing.mealsPerDay} refeições</div>
            <input id="sl-meals" type="range" class="slider" min="4" max="8" step="1" value="${existing.mealsPerDay}" />
            <div class="slider-labels">
              <span>4</span><span>5</span><span>6</span><span>7</span><span>8</span>
            </div>
            <div class="slider-hint ${existing.mealsPerDay === 6 ? 'highlight' : ''}" id="hint-meals">
              ${existing.mealsPerDay === 6 ? '✓ Quantidade ideal para o Sistema Híbrido' : 'O Sistema Híbrido funciona melhor com 6 refeições'}
            </div>
          </div>
        </div>

        <!-- Strategy -->
        <div class="field">
          <label class="label">Preferência de Estratégia <span class="label-help" title="Controla a proporção de refeições sólidas vs shakes líquidos.">${icons.helpCircle(14)}</span></label>
          <div class="option-list" id="g-strategy">
            ${STRATEGIES.map(s => `
              <button type="button" class="option-plain ${existing.strategy === s.id ? 'selected' : ''}" data-strategy="${s.id}">
                <span class="option-body">
                  <span class="option-title">${s.title} ${s.badge ? `<span class="option-badge">${s.badge}</span>` : ''}</span>
                  <span class="option-desc">${s.desc}</span>
                </span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Hint box -->
        <div class="hint">
          <span class="hint-icon">${icons.info(18)}</span>
          <div>
            <strong>Sistema Híbrido para Hardgainers:</strong>
            3 refeições sólidas (café, almoço, jantar) + 3 shakes anabólicos nos intervalos.
            O líquido digere rápido e permite atingir 3000+ kcal sem desconforto estomacal.
          </div>
        </div>

        <div class="btn-row">
          <button type="button" class="btn btn-secondary" id="btn-back">${icons.arrowLeft(16)} Voltar</button>
          <button type="button" class="btn btn-ghost" id="btn-clear">${icons.refresh(16)} Limpar</button>
          <button type="button" class="btn btn-primary" id="btn-calc">Calcular Meu Plano ${icons.arrowRight(16)}</button>
        </div>
      </div>
    </div>
  `;

  // ---------- State + handlers ----------
  const state = {
    ...existing,
    sleepStartTime: existing.sleepStartTime || '23:00',
    sleepEndTime: existing.sleepEndTime || '07:00',
  };
  if (!initFastedVisible) state.trainFasted = false;

  // Training days slider
  const slDays = document.getElementById('sl-days');
  slDays.addEventListener('input', () => {
    state.trainDays = Number(slDays.value);
    document.getElementById('sv-days').textContent = `${state.trainDays} ${state.trainDays === 1 ? 'dia' : 'dias'}`;
    if (state.trainDays === 0) {
      state.trainTime = null; state.trainStartTime = ''; state.trainEndTime = '';
      state.trainDurationMinutes = null; state.trainFasted = false;
      document.getElementById('in-train-start').value = '';
      document.getElementById('in-train-end').value = '';
      hintTrain.textContent = 'Preencha o horário de início para detectar o período';
      hintTrain.classList.remove('highlight');
      errTrain.textContent = '';
      fieldFasted.style.display = 'none';
      document.getElementById('field-train-detail').style.display = 'none';
    } else {
      document.getElementById('field-train-detail').style.display = 'block';
    }
  });

  // Training time helpers
  const hintTrain = document.getElementById('hint-train');
  const errTrain  = document.getElementById('err-traintime');
  const fieldFasted = document.getElementById('field-fasted');

  const calcDuration = (start, end) => {
    if (!start || !end) return null;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let s = sh * 60 + sm, e = eh * 60 + em;
    if (e < s) e += 1440;
    return e - s;
  };

  const toMinsW = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

  const inferTrainTime = () => {
    if (!state.trainStartTime) { state.trainTime = null; return; }
    state.trainTime = getWindowForTime(toMinsW(state.trainStartTime));
  };

  const updateTrainHint = () => {
    if (!state.trainStartTime) {
      hintTrain.textContent = 'Preencha o horário de início para detectar o período';
      hintTrain.classList.remove('highlight');
      return;
    }
    const period = WINDOW_RANGES[state.trainTime]?.label || '';
    const d = calcDuration(state.trainStartTime, state.trainEndTime);
    state.trainDurationMinutes = d;
    if (d != null) {
      hintTrain.textContent = `Período detectado: ${period} · ${d} min de treino`;
      hintTrain.classList.add('highlight');
    } else {
      hintTrain.textContent = `Período detectado: ${period} — preencha o fim para calcular a duração`;
      hintTrain.classList.remove('highlight');
    }
  };

  const shouldShowFasted = () => {
    if (!state.trainStartTime || !state.trainEndTime) return false;
    const wake = state.sleepEndTime ? toMinsW(state.sleepEndTime) : 420;
    let sleep = state.sleepStartTime ? toMinsW(state.sleepStartTime) : 1380;
    if (sleep <= wake) sleep += 1440;
    const sM = toMinsW(state.trainStartTime);
    const norm = (sleep > 1440 && sM < wake && (sM + 1440) <= sleep) ? sM + 1440 : sM;
    if (norm < wake || norm >= sleep) return false;
    const dur = calcDuration(state.trainStartTime, state.trainEndTime);
    if (!dur || dur > 120) return false;
    if (norm + dur > sleep) return false;
    return norm - wake <= 60;
  };

  const updateFastedVisibility = () => {
    const show = shouldShowFasted();
    fieldFasted.style.display = show ? 'block' : 'none';
    if (!show) state.trainFasted = false;
  };

  document.getElementById('in-train-start').addEventListener('change', (e) => {
    state.trainStartTime = e.target.value;
    errTrain.textContent = '';
    errTrain.classList.remove('show');
    inferTrainTime();
    updateTrainHint();
    updateFastedVisibility();
  });

  document.getElementById('in-train-end').addEventListener('change', (e) => {
    state.trainEndTime = e.target.value;
    errTrain.textContent = '';
    errTrain.classList.remove('show');
    updateTrainHint();
    updateFastedVisibility();
  });

  // Meals per day slider
  const slMeals = document.getElementById('sl-meals');
  const svMeals = document.getElementById('sv-meals');
  const hintMeals = document.getElementById('hint-meals');
  slMeals.addEventListener('input', () => {
    state.mealsPerDay = Number(slMeals.value);
    svMeals.textContent = `${state.mealsPerDay} refeições`;
    if (state.mealsPerDay === 6) {
      hintMeals.textContent = '✓ Quantidade ideal para o Sistema Híbrido';
      hintMeals.classList.add('highlight');
    } else {
      hintMeals.textContent = 'O Sistema Híbrido funciona melhor com 6 refeições';
      hintMeals.classList.remove('highlight');
    }
  });

  // Strategy
  mount.querySelectorAll('[data-strategy]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.strategy = btn.dataset.strategy;
      mount.querySelectorAll('[data-strategy]').forEach(b => b.classList.toggle('selected', b.dataset.strategy === state.strategy));
    });
  });

  // Treina em jejum
  mount.querySelectorAll('[data-fasted]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.trainFasted = btn.dataset.fasted === 'true';
      mount.querySelectorAll('[data-fasted]').forEach(b => b.classList.toggle('selected', b.dataset.fasted === String(state.trainFasted)));
    });
  });

  // Sleep schedule
  const hintSleep = document.getElementById('hint-sleep');
  const updateSleepHint = () => {
    hintSleep.textContent = buildSleepHint(state.sleepStartTime, state.sleepEndTime);
  };
  document.getElementById('in-sleep-start').addEventListener('change', e => {
    state.sleepStartTime = e.target.value;
    updateSleepHint();
    updateFastedVisibility();
  });
  document.getElementById('in-sleep-end').addEventListener('change', e => {
    state.sleepEndTime = e.target.value;
    updateSleepHint();
    updateFastedVisibility();
  });

  // Back
  document.getElementById('btn-back').addEventListener('click', () => navigate('/perfil'));

  // Clear
  document.getElementById('btn-clear').addEventListener('click', () => {
    state.trainDays = 4; state.trainTime = null; state.trainStartTime = ''; state.trainEndTime = '';
    state.trainDurationMinutes = null; state.mealsPerDay = 6; state.strategy = 'hybrid'; state.trainFasted = false;
    slDays.value = 4; document.getElementById('sv-days').textContent = '4 dias';
    slMeals.value = 6; svMeals.textContent = '6 refeições';
    hintMeals.textContent = '✓ Quantidade ideal para o Sistema Híbrido';
    hintMeals.classList.add('highlight');
    mount.querySelectorAll('[data-strategy]').forEach(b => b.classList.toggle('selected', b.dataset.strategy === 'hybrid'));
    mount.querySelectorAll('[data-fasted]').forEach(b => b.classList.toggle('selected', b.dataset.fasted === 'false'));
    document.getElementById('in-train-start').value = '';
    document.getElementById('in-train-end').value = '';
    hintTrain.textContent = 'Preencha o horário de início para detectar o período';
    hintTrain.classList.remove('highlight');
    errTrain.textContent = '';
    errTrain.classList.remove('show');
    fieldFasted.style.display = 'none';
    state.sleepStartTime = '23:00'; state.sleepEndTime = '07:00';
    document.getElementById('in-sleep-start').value = '23:00';
    document.getElementById('in-sleep-end').value = '07:00';
    hintSleep.textContent = buildSleepHint('23:00', '07:00');
    local.remove(K.ROUTINE);
  });

  // Calculate
  document.getElementById('btn-calc').addEventListener('click', () => {
    errTrain.textContent = '';
    errTrain.classList.remove('show');

    if (state.trainDays > 0) {
      if (!state.trainStartTime && !state.trainEndTime) {
        errTrain.textContent = 'Com dias de treino definidos, informe o início e o fim do treino.';
        errTrain.classList.add('show');
        errTrain.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (!state.trainStartTime) {
        errTrain.textContent = 'Informe o horário de início do treino.';
        errTrain.classList.add('show');
        errTrain.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (!state.trainEndTime) {
        errTrain.textContent = 'Informe o horário de fim do treino.';
        errTrain.classList.add('show');
        errTrain.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (state.trainStartTime && state.trainEndTime && state.trainStartTime === state.trainEndTime) {
        errTrain.textContent = 'O fim do treino deve ser diferente do início.';
        errTrain.classList.add('show');
        errTrain.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      const _wake = toMinsW(state.sleepEndTime || '07:00');
      let _sleep = toMinsW(state.sleepStartTime || '23:00');
      if (_sleep <= _wake) _sleep += 1440;
      const _rawStart = toMinsW(state.trainStartTime);
      const _normStart = (_sleep > 1440 && _rawStart < _wake && (_rawStart + 1440) <= _sleep) ? _rawStart + 1440 : _rawStart;
      const _rawEnd = toMinsW(state.trainEndTime);
      const _dur = (_rawEnd < _rawStart ? _rawEnd + 1440 : _rawEnd) - _rawStart;
      const _normEnd = _normStart + _dur;
      if (_normStart < _wake || _normStart >= _sleep || _normEnd > _sleep) {
        errTrain.textContent = 'O treino está dentro do horário de sono. Escolha um horário em que esteja acordado.';
        errTrain.classList.add('show');
        errTrain.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (_normStart < _wake + 30 || _normEnd > _sleep - 30) {
        errTrain.textContent = 'Deixe pelo menos 30 minutos entre acordar/deitar e o treino.';
        errTrain.classList.add('show');
        errTrain.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    if (state.trainDays === 0) {
      state.trainTime = null;
      state.trainStartTime = '';
      state.trainEndTime = '';
      state.trainDurationMinutes = null;
      state.trainFasted = false;
    }

    const routine = { ...state };
    saveRoutine(routine);

    const formData = loadFormData();
    const profile = loadProfile();
    if (!formData || !profile) {
      navigate('/');
      return;
    }

    const results = calcAll({ formData, profile, routine });
    saveResults(results);

    markProgress(K.STEP3_DONE);
    markProgress(K.RESULTS_READY);
    navigate('/resultados');
  });
}
