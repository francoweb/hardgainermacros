/**
 * PAGE — Perfil (Etapa 2)
 * =============================================================================
 * Recolhe:
 *  - nível de atividade
 *  - dificuldade principal (hardgainer_classico, apetite_baixo, ultra_acelerado, etc.)
 *  - perfil corporal (clássico vs FALSO MAGRO / magro com barriga)
 *  - objetivo (controlled / moderate / aggressive)
 *  - checkbox "dificuldade com volume"
 *
 * O ramo "falso magro" é tratado no módulo calculator — aqui só recolhemos a flag.
 * =============================================================================
 */

import { renderStepper } from '../components/ui.js';
import { icons } from '../modules/icons.js';
import { navigate, markProgress } from '../modules/router.js';
import { saveProfile, loadProfile, K, local } from '../modules/storage.js';

const ACTIVITIES = [
  { id: 'sedentary',   title: 'Sedentário',          desc: 'Trabalho sentado, pouca ou nenhuma atividade física' },
  { id: 'light',       title: 'Levemente Ativo',     desc: 'Exercício leve 1-3 dias por semana' },
  { id: 'moderate',    title: 'Moderadamente Ativo', desc: 'Exercício moderado 3-5 dias por semana' },
  { id: 'active',      title: 'Muito Ativo',         desc: 'Exercício intenso 6-7 dias por semana' },
  { id: 'very_active', title: 'Extremamente Ativo',  desc: 'Trabalho físico + exercício diário intenso' },
];

const DIFFICULTIES = [
  { id: 'classico',           title: 'Hardgainer Clássico',     desc: 'Dificuldade geral em ganhar peso, metabolismo rápido',    icon: 'zap' },
  { id: 'apetite_baixo',      title: 'Apetite Muito Baixo',     desc: 'Raramente sente fome, come pouco naturalmente',          icon: 'ban' },
  { id: 'ultra_acelerado',    title: 'Metabolismo Ultra Acelerado', desc: 'Queima tudo muito rápido, perde peso facilmente',   icon: 'flame' },
  { id: 'volume_baixo',       title: 'Dificuldade com Volume',  desc: 'Estufa rápido, estômago pequeno, enjoa fácil',           icon: 'info' },
  { id: 'rotina_corrida',     title: 'Rotina Muito Corrida',    desc: 'Pouco tempo para comer, dificuldade em manter consistência', icon: 'clock' },
  { id: 'falta_consistencia', title: 'Falta de Consistência',   desc: 'Come bem alguns dias, mal em outros, sem rotina definida', icon: 'trendingUp' },
];

const GOALS = [
  { id: 'controlled', title: 'Ganho de Massa Controlado', desc: 'Ganhar peso gradualmente com mínimo de gordura',  meta: 'Meta: 0.25-0.5kg por semana' },
  { id: 'moderate',   title: 'Ganho de Massa Moderado',   desc: 'Equilíbrio entre ganho de massa e controle de gordura', meta: 'Meta: 0.5-0.75kg por semana' },
  { id: 'aggressive', title: 'Ganho de Massa Agressivo',  desc: 'Prioridade máxima em ganhar peso rapidamente',    meta: 'Meta: 0.75-1kg por semana' },
];

export function renderPerfilPage(mount) {
  const existing = loadProfile() || {
    activity: null,
    difficulty: null,
    bodyType: 'classic',  // "classic" | "falso_magro"
    goal: null,
    volumeDifficulty: false,
  };

  // falsoMagro é derivado de bodyType
  const falsoMagro = existing.bodyType === 'falso_magro';

  mount.innerHTML = `
    <div class="container">
      ${renderStepper(2)}

      <div class="card">
        <div class="card-head">
          <h2 class="card-title">Seu Perfil Hardgainer</h2>
          <p class="card-sub">Identifique seu tipo de dificuldade para um plano personalizado</p>
        </div>

        <!-- Activity level -->
        <div class="field">
          <label class="label">Nível de Atividade Diária <span class="label-help" title="Usado para calcular seu gasto energético total (TDEE).">${icons.helpCircle(14)}</span></label>
          <div class="option-list" id="g-activity">
            ${ACTIVITIES.map(a => `
              <button type="button" class="option-plain ${existing.activity === a.id ? 'selected' : ''}" data-activity="${a.id}">
                <span class="option-body">
                  <span class="option-title">${a.title}</span>
                  <span class="option-desc">${a.desc}</span>
                </span>
              </button>
            `).join('')}
          </div>
          <div class="field-error" id="err-activity"></div>
        </div>

        <!-- Difficulty -->
        <div class="field">
          <label class="label">Qual é sua maior dificuldade? <span class="label-help" title="Usado para adaptar as recomendações de superávit e refeições.">${icons.helpCircle(14)}</span></label>
          <div class="option-grid option-grid-2" id="g-difficulty">
            ${DIFFICULTIES.map(d => `
              <button type="button" class="option ${existing.difficulty === d.id ? 'selected' : ''}" data-difficulty="${d.id}">
                <span class="option-icon">${icons[d.icon](18)}</span>
                <span class="option-body">
                  <span class="option-title">${d.title}</span>
                  <span class="option-desc">${d.desc}</span>
                </span>
              </button>
            `).join('')}
          </div>
          <div class="field-error" id="err-difficulty"></div>
        </div>

        <!-- Body type (NOVO — Falso Magro) -->
        <div class="field">
          <label class="label">Perfil Corporal <span class="label-help" title="Magro clássico tem pouca gordura. Falso magro é magro de aparência geral mas com barriga saliente ou gordura abdominal.">${icons.helpCircle(14)}</span></label>
          <div class="option-grid option-grid-2" id="g-bodytype">
            <button type="button" class="option ${!falsoMagro ? 'selected' : ''}" data-bodytype="classic">
              <span class="option-icon">${icons.user(18)}</span>
              <span class="option-body">
                <span class="option-title">Magro Clássico</span>
                <span class="option-desc">Magro por todo o corpo, sem gordura localizada</span>
              </span>
            </button>
            <button type="button" class="option ${falsoMagro ? 'selected' : ''}" data-bodytype="falso_magro">
              <span class="option-icon">${icons.alertTri(18)}</span>
              <span class="option-body">
                <span class="option-title">Falso Magro / Magro com Barriga</span>
                <span class="option-desc">Magro no geral, mas com barriga saliente ou gordura abdominal</span>
              </span>
            </button>
          </div>
          <div class="hint" id="hint-falsomagro" style="display:${falsoMagro ? 'flex' : 'none'}; margin-top: 12px;">
            <span class="hint-icon">${icons.info(18)}</span>
            <div>
              <strong>Perfil detectado:</strong> vamos usar um superávit mais controlado, mais proteína e escolhas de alimentos estratégicas para crescer sem acumular gordura abdominal.
            </div>
          </div>
        </div>

        <!-- Goal -->
        <div class="field">
          <label class="label">Seu Objetivo <span class="label-help" title="Define o tamanho do superávit calórico.">${icons.helpCircle(14)}</span></label>
          <div class="option-list" id="g-goal">
            ${GOALS.map(g => `
              <button type="button" class="option-plain ${existing.goal === g.id ? 'selected' : ''}" data-goal="${g.id}">
                <span class="option-body">
                  <span class="option-title">${g.title}</span>
                  <span class="option-desc">${g.desc}</span>
                  <span class="option-meta">${g.meta}</span>
                </span>
              </button>
            `).join('')}
          </div>
          <div class="field-error" id="err-goal"></div>
        </div>

        <!-- Volume checkbox -->
        <div class="field">
          <label class="checkbox-row ${existing.volumeDifficulty ? 'selected' : ''}" id="lbl-volume">
            <input type="checkbox" class="checkbox" id="chk-volume" ${existing.volumeDifficulty ? 'checked' : ''} />
            <span class="checkbox-body">
              <span class="checkbox-title">Tenho dificuldade em comer muito volume</span>
              <span class="checkbox-desc">Estufo rápido, meu estômago parece pequeno</span>
            </span>
          </label>
        </div>

        <div class="btn-row">
          <button type="button" class="btn btn-secondary" id="btn-back">${icons.arrowLeft(16)} Voltar</button>
          <button type="button" class="btn btn-ghost" id="btn-clear">${icons.refresh(16)} Limpar</button>
          <button type="button" class="btn btn-primary" id="btn-continue">Continuar ${icons.arrowRight(16)}</button>
        </div>
      </div>
    </div>
  `;

  // ---------- State + handlers ----------
  const state = { ...existing };

  // Activity
  mount.querySelectorAll('[data-activity]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activity = btn.dataset.activity;
      mount.querySelectorAll('[data-activity]').forEach(b => b.classList.toggle('selected', b.dataset.activity === state.activity));
      document.getElementById('err-activity').textContent = '';
    });
  });

  // Difficulty
  mount.querySelectorAll('[data-difficulty]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.difficulty = btn.dataset.difficulty;
      mount.querySelectorAll('[data-difficulty]').forEach(b => b.classList.toggle('selected', b.dataset.difficulty === state.difficulty));
      document.getElementById('err-difficulty').textContent = '';
    });
  });

  // Body type
  mount.querySelectorAll('[data-bodytype]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.bodyType = btn.dataset.bodytype;
      mount.querySelectorAll('[data-bodytype]').forEach(b => b.classList.toggle('selected', b.dataset.bodytype === state.bodyType));
      document.getElementById('hint-falsomagro').style.display = state.bodyType === 'falso_magro' ? 'flex' : 'none';
    });
  });

  // Goal
  mount.querySelectorAll('[data-goal]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.goal = btn.dataset.goal;
      mount.querySelectorAll('[data-goal]').forEach(b => b.classList.toggle('selected', b.dataset.goal === state.goal));
      document.getElementById('err-goal').textContent = '';
    });
  });

  // Volume checkbox
  const chk = document.getElementById('chk-volume');
  chk.addEventListener('change', () => {
    state.volumeDifficulty = chk.checked;
    document.getElementById('lbl-volume').classList.toggle('selected', chk.checked);
  });

  // Back
  document.getElementById('btn-back').addEventListener('click', () => navigate('/'));

  // Clear
  document.getElementById('btn-clear').addEventListener('click', () => {
    state.activity = null; state.difficulty = null; state.bodyType = 'classic'; state.goal = null; state.volumeDifficulty = false;
    mount.querySelectorAll('.option, .option-plain').forEach(b => b.classList.remove('selected'));
    // Marca classic como default
    const classicBtn = mount.querySelector('[data-bodytype="classic"]');
    if (classicBtn) classicBtn.classList.add('selected');
    document.getElementById('hint-falsomagro').style.display = 'none';
    chk.checked = false;
    document.getElementById('lbl-volume').classList.remove('selected');
    mount.querySelectorAll('.field-error').forEach(e => e.textContent = '');
    local.remove(K.PROFILE);
  });

  // Continue
  document.getElementById('btn-continue').addEventListener('click', () => {
    let ok = true;
    const setErr = (id, msg) => { document.getElementById(id).textContent = msg; if (msg) ok = false; };
    setErr('err-activity', state.activity ? '' : 'Selecione o seu nível de atividade.');
    setErr('err-difficulty', state.difficulty ? '' : 'Selecione a sua maior dificuldade.');
    setErr('err-goal', state.goal ? '' : 'Selecione o seu objetivo.');

    if (!ok) {
      // scroll para o primeiro erro
      const firstErr = mount.querySelector('.field-error:not(:empty)');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const payload = {
      activity: state.activity,
      difficulty: state.difficulty,
      bodyType: state.bodyType,
      falsoMagro: state.bodyType === 'falso_magro',
      goal: state.goal,
      volumeDifficulty: state.volumeDifficulty,
    };
    saveProfile(payload);
    markProgress(K.STEP2_DONE);
    navigate('/rotina');
  });
}
