/**
 * PAGE — Dados Físicos (Etapa 1 / home)
 * =============================================================================
 * Primeira etapa do fluxo. Recolhe sexo, idade, peso e altura.
 * Não requer nenhuma flag de sessão.
 *
 * Ao submeter com sucesso:
 *  - guarda formData em localStorage
 *  - marca STEP1_DONE em sessionStorage
 *  - navega para /perfil
 * =============================================================================
 */

import { renderStepper } from '../components/ui.js';
import { icons } from '../modules/icons.js';
import { navigate, markProgress } from '../modules/router.js';
import { saveFormData, loadFormData, K, local } from '../modules/storage.js';

export function renderDadosFisicosPage(mount) {
  const existing = loadFormData() || {
    unit: 'metric',
    sex: null,
    age: '',
    weight: '',
    height: '',
  };

  mount.innerHTML = `
    <div class="container">
      ${renderStepper(1)}

      <div class="center-head">
        <div class="eyebrow">SISTEMA DE ALIMENTAÇÃO HÍBRIDA</div>
        <h1 class="hero-title">Pare de lutar contra<br><em>seu metabolismo</em></h1>
        <p class="hero-sub">
          Descubra exatamente quantas calorias você precisa e receba um plano
          alimentar de <strong>14 dias</strong> feito para quem tem dificuldade
          em ganhar peso.
        </p>
      </div>

      <div class="card">
        <div class="card-head">
          <h2 class="card-title">Seus Dados Físicos</h2>
          <p class="card-sub">Precisamos conhecer você para calcular suas necessidades calóricas</p>
        </div>

        <!-- Unit toggle -->
        <div class="toggle-container">
          <div class="toggle" role="tablist" aria-label="Sistema de unidades">
            <button type="button" class="toggle-btn ${existing.unit === 'metric' ? 'active' : ''}" data-unit="metric" role="tab">Métrico (kg/cm)</button>
            <button type="button" class="toggle-btn ${existing.unit === 'imperial' ? 'active' : ''}" data-unit="imperial" role="tab">Imperial (lb/in)</button>
          </div>
        </div>

        <form id="f-dados" novalidate>
          <!-- Sex -->
          <div class="field">
            <label class="label">Sexo Biológico <span class="label-help" title="Usado apenas no cálculo metabólico (Mifflin-St Jeor).">${icons.helpCircle(14)}</span></label>
            <div class="option-grid option-grid-2">
              <button type="button" class="option ${existing.sex === 'male' ? 'selected' : ''}" data-sex="male">
                <span class="option-icon">${icons.user(18)}</span>
                <span class="option-body"><span class="option-title">Masculino</span></span>
              </button>
              <button type="button" class="option ${existing.sex === 'female' ? 'selected' : ''}" data-sex="female">
                <span class="option-icon">${icons.user(18)}</span>
                <span class="option-body"><span class="option-title">Feminino</span></span>
              </button>
            </div>
            <div class="field-error" id="err-sex"></div>
          </div>

          <!-- Age -->
          <div class="field">
            <label class="label" for="in-age">Idade <span class="label-help" title="A idade impacta o metabolismo basal.">${icons.helpCircle(14)}</span></label>
            <div class="input-wrap">
              <span class="input-icon">${icons.calendar(18)}</span>
              <input id="in-age" type="number" class="input" inputmode="numeric" min="14" max="90" placeholder="25" value="${existing.age || ''}" />
            </div>
            <div class="field-error" id="err-age"></div>
          </div>

          <!-- Weight -->
          <div class="field">
            <label class="label" for="in-weight"><span id="lbl-weight">Peso Atual (kg)</span> <span class="label-help" title="Base do cálculo de calorias e macros.">${icons.helpCircle(14)}</span></label>
            <div class="input-wrap">
              <span class="input-icon">${icons.scale(18)}</span>
              <input id="in-weight" type="number" class="input" inputmode="decimal" step="0.1" placeholder="65" value="${existing.weight || ''}" />
            </div>
            <div class="field-error" id="err-weight"></div>
          </div>

          <!-- Height -->
          <div class="field">
            <label class="label" for="in-height"><span id="lbl-height">Altura (cm)</span> <span class="label-help" title="Usada no cálculo do metabolismo basal.">${icons.helpCircle(14)}</span></label>
            <div class="input-wrap">
              <span class="input-icon">${icons.ruler(18)}</span>
              <input id="in-height" type="number" class="input" inputmode="numeric" placeholder="175" value="${existing.height || ''}" />
            </div>
            <div class="field-error" id="err-height"></div>
          </div>

          <div class="btn-row">
            <button type="button" class="btn btn-ghost" id="btn-clear">${icons.refresh(16)} Limpar campos</button>
            <button type="submit" class="btn btn-primary" id="btn-continue">Continuar ${icons.arrowRight(16)}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // ---------- Handlers ----------
  const form = document.getElementById('f-dados');
  const state = { ...existing };

  // Unit toggle
  mount.querySelectorAll('[data-unit]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.unit = btn.dataset.unit;
      mount.querySelectorAll('[data-unit]').forEach(b => b.classList.toggle('active', b.dataset.unit === state.unit));
      document.getElementById('lbl-weight').textContent = state.unit === 'metric' ? 'Peso Atual (kg)' : 'Peso Atual (lb)';
      document.getElementById('lbl-height').textContent = state.unit === 'metric' ? 'Altura (cm)' : 'Altura (in)';
    });
  });

  // Sex option cards
  mount.querySelectorAll('[data-sex]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.sex = btn.dataset.sex;
      mount.querySelectorAll('[data-sex]').forEach(b => b.classList.toggle('selected', b.dataset.sex === state.sex));
      document.getElementById('err-sex').textContent = '';
    });
  });

  // Clear
  document.getElementById('btn-clear').addEventListener('click', () => {
    state.sex = null; state.age = ''; state.weight = ''; state.height = '';
    mount.querySelectorAll('[data-sex]').forEach(b => b.classList.remove('selected'));
    document.getElementById('in-age').value = '';
    document.getElementById('in-weight').value = '';
    document.getElementById('in-height').value = '';
    mount.querySelectorAll('.field-error').forEach(e => e.textContent = '');
    local.remove(K.FORM);
  });

  // Submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const age = Number(document.getElementById('in-age').value);
    const weight = Number(document.getElementById('in-weight').value);
    const height = Number(document.getElementById('in-height').value);

    let ok = true;
    const setErr = (id, msg) => { document.getElementById(id).textContent = msg; if (msg) ok = false; };
    setErr('err-sex', state.sex ? '' : 'Selecione o sexo biológico.');

    const ageMin = 14, ageMax = 90;
    setErr('err-age', (age >= ageMin && age <= ageMax) ? '' : `Idade entre ${ageMin} e ${ageMax}.`);

    // Valores min/max por unidade
    const isMetric = state.unit === 'metric';
    const wMin = isMetric ? 35 : 77, wMax = isMetric ? 200 : 440;
    const hMin = isMetric ? 130 : 51, hMax = isMetric ? 220 : 87;
    setErr('err-weight', (weight >= wMin && weight <= wMax) ? '' : `Peso entre ${wMin} e ${wMax}.`);
    setErr('err-height', (height >= hMin && height <= hMax) ? '' : `Altura entre ${hMin} e ${hMax}.`);

    if (!ok) return;

    const payload = { unit: state.unit, sex: state.sex, age, weight, height };
    saveFormData(payload);
    markProgress(K.STEP1_DONE);
    navigate('/perfil');
  });
}
