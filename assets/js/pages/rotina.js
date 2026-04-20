/**
 * PAGE — Rotina (Etapa 3)
 * =============================================================================
 * Recolhe:
 *  - dias de treino por semana (0-7)
 *  - horário principal de treino (manha / tarde / noite / nao_treina)
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

const TRAIN_TIMES = [
  { id: 'morning',   title: 'Manhã',      desc: '06:00 - 10:00', icon: 'sun' },
  { id: 'afternoon', title: 'Tarde',      desc: '14:00 - 18:00', icon: 'sunset' },
  { id: 'evening',   title: 'Noite',      desc: '18:00 - 22:00', icon: 'moon' },
  { id: 'none',      title: 'Não Treino', desc: 'Sem rotina de treino', icon: 'ban' },
];

const STRATEGIES = [
  { id: 'solid',     title: 'Mais Refeições Sólidas', desc: '70% sólido + 30% shakes. Mais mastigação e saciedade.', badge: null },
  { id: 'hybrid',    title: 'Sistema Híbrido',        desc: '60% sólido + 40% shakes. A combinação do ebook.',    badge: 'Recomendado' },
  { id: 'practical', title: 'Máxima Praticidade',    desc: '45% sólido + 55% shakes. Para rotinas muito corridas.', badge: null },
];

export function renderRotinaPage(mount) {
  const existing = loadRoutine() || {
    trainDays: 4,
    trainTime: null,
    mealsPerDay: 6,
    strategy: 'hybrid',
  };

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

        <!-- Training time -->
        <div class="field">
          <label class="label">Horário Principal de Treino <span class="label-help" title="Usado no futuro para ajustar horários de refeição em torno do treino.">${icons.helpCircle(14)}</span></label>
          <div class="option-grid option-grid-2" id="g-traintime">
            ${TRAIN_TIMES.map(t => `
              <button type="button" class="option ${existing.trainTime === t.id ? 'selected' : ''}" data-traintime="${t.id}">
                <span class="option-icon">${icons[t.icon](18)}</span>
                <span class="option-body">
                  <span class="option-title">${t.title}</span>
                  <span class="option-desc">${t.desc}</span>
                </span>
              </button>
            `).join('')}
          </div>
          <div class="field-error" id="err-traintime"></div>
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
  const state = { ...existing };

  // Training days slider
  const slDays = document.getElementById('sl-days');
  slDays.addEventListener('input', () => {
    state.trainDays = Number(slDays.value);
    document.getElementById('sv-days').textContent = `${state.trainDays} ${state.trainDays === 1 ? 'dia' : 'dias'}`;
  });

  // Training time
  mount.querySelectorAll('[data-traintime]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.trainTime = btn.dataset.traintime;
      mount.querySelectorAll('[data-traintime]').forEach(b => b.classList.toggle('selected', b.dataset.traintime === state.trainTime));
      document.getElementById('err-traintime').textContent = '';
    });
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

  // Back
  document.getElementById('btn-back').addEventListener('click', () => navigate('/perfil'));

  // Clear
  document.getElementById('btn-clear').addEventListener('click', () => {
    state.trainDays = 4; state.trainTime = null; state.mealsPerDay = 6; state.strategy = 'hybrid';
    slDays.value = 4; document.getElementById('sv-days').textContent = '4 dias';
    slMeals.value = 6; svMeals.textContent = '6 refeições';
    hintMeals.textContent = '✓ Quantidade ideal para o Sistema Híbrido';
    hintMeals.classList.add('highlight');
    mount.querySelectorAll('[data-traintime]').forEach(b => b.classList.remove('selected'));
    mount.querySelectorAll('[data-strategy]').forEach(b => b.classList.toggle('selected', b.dataset.strategy === 'hybrid'));
    document.getElementById('err-traintime').textContent = '';
    local.remove(K.ROUTINE);
  });

  // Calculate
  document.getElementById('btn-calc').addEventListener('click', () => {
    let ok = true;
    const setErr = (id, msg) => { document.getElementById(id).textContent = msg; if (msg) ok = false; };
    setErr('err-traintime', state.trainTime ? '' : 'Selecione o seu horário principal de treino.');
    if (!ok) {
      const firstErr = mount.querySelector('.field-error:not(:empty)');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const routine = { ...state };
    saveRoutine(routine);

    // Calcula tudo
    const formData = loadFormData();
    const profile = loadProfile();
    if (!formData || !profile) {
      // algo correu mal — volta ao início
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
