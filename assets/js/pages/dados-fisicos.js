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
import { BLOG_POSTS } from '../data/blog-posts.js';

function renderHomeBlogSection() {
  const recent = BLOG_POSTS.slice(0, 3);
  return `
    <section class="home-blog-section">
      <div class="home-blog-header">
        <h2 class="home-blog-title">Guias para Hardgainers</h2>
        <a href="/blog" data-route class="home-blog-ver-todos">Ver todos os artigos →</a>
      </div>
      <div class="home-blog-grid">
        ${recent.map(p => `
          <a href="/blog/${p.slug}" data-route class="home-blog-card">
            <div class="home-blog-card-thumb">
              <img src="${p.heroImage}" alt="${p.title}" loading="lazy" width="400" height="225" />
            </div>
            <span class="blog-card-cat">${p.category}</span>
            <span class="home-blog-card-title">${p.title}</span>
            <span class="home-blog-card-excerpt">${p.excerpt}</span>
            <span class="blog-card-read">${p.readTime} min de leitura</span>
          </a>
        `).join('')}
      </div>
    </section>
  `;
}

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

      <div class="card" id="calculadora">
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

      <!-- ═══ Conteúdo SEO ══════════════════════════════════════════════ -->
      <div class="home-seo">

        <!-- Secção 1 — O que é a ferramenta -->
        <section class="home-seo-section">
          <h2 class="home-seo-title">Calculadora de macros para ganhar massa muscular</h2>
          <p class="home-seo-text">Se você tem dificuldade em ganhar peso, a primeira coisa que precisa saber é quantas calorias, proteína, carboidratos e gorduras o seu corpo precisa por dia.</p>
          <p class="home-seo-text">O Hardgainer Macros calcula os seus macros com base nos seus dados físicos e gera um plano alimentar de 14 dias adaptado ao seu perfil. É gratuito, não exige cadastro e funciona direto no navegador.</p>
        </section>

        <!-- Secção 2 — Como funciona -->
        <section class="home-seo-section">
          <h2 class="home-seo-title">Como funciona o Hardgainer Macros</h2>
          <ol class="home-seo-steps">
            <li class="home-seo-step">
              <span class="home-seo-step-num" aria-hidden="true">1</span>
              <span class="home-seo-step-body">
                <strong>Você preenche os seus dados</strong>
                <span>Informe peso, altura, idade, sexo e rotina de refeições. O processo é rápido e simples.</span>
              </span>
            </li>
            <li class="home-seo-step">
              <span class="home-seo-step-num" aria-hidden="true">2</span>
              <span class="home-seo-step-body">
                <strong>Você recebe os seus macros e um plano de 14 dias</strong>
                <span>A calculadora estima as suas calorias diárias, distribui por proteína, carboidratos e gorduras, e gera um plano alimentar completo com alimentos práticos.</span>
              </span>
            </li>
            <li class="home-seo-step">
              <span class="home-seo-step-num" aria-hidden="true">3</span>
              <span class="home-seo-step-body">
                <strong>Você ajusta ao seu gosto</strong>
                <span>Você pode alterar quantidades, trocar alimentos, remover o que não quer, adicionar novos alimentos e guardar o plano em PDF.</span>
              </span>
            </li>
          </ol>
        </section>

        <!-- Secção 3 — Para quem é -->
        <section class="home-seo-section">
          <h2 class="home-seo-title">Para quem é esta ferramenta</h2>
          <p class="home-seo-text">Esta calculadora foi criada para quem:</p>
          <ul class="home-seo-list">
            <li>come bastante, mas continua com dificuldade em ganhar peso;</li>
            <li>quer um plano alimentar concreto, não apenas uma estimativa solta de calorias;</li>
            <li>precisa organizar melhor proteína, carboidratos e gorduras;</li>
            <li>procura uma ferramenta gratuita, sem criar conta e sem instalar nada;</li>
            <li>treina musculação e quer ganhar massa muscular com mais consistência.</li>
          </ul>
          <p class="home-seo-text home-seo-note">Não é uma app genérica de contagem de calorias. É uma calculadora de macros focada em hardgainers, ectomorfos e pessoas que precisam comer mais para ganhar peso.</p>
        </section>

        <!-- Secção 4 — Por que hardgainers não conseguem ganhar peso -->
        <section class="home-seo-section">
          <h2 class="home-seo-title">Por que muitos hardgainers não conseguem ganhar peso</h2>
          <p class="home-seo-text">Um hardgainer é alguém que tem dificuldade em ganhar peso e massa muscular, mesmo treinando e tentando comer mais. Muitas vezes, isso está associado a metabolismo acelerado, pouco apetite, dias muito ativos ou dificuldade em manter consistência alimentar.</p>
          <p class="home-seo-text">O problema nem sempre é falta de esforço. Muitas vezes, é falta de uma referência clara: quantas calorias comer, quanta proteína atingir e como distribuir os macros ao longo do dia.</p>
          <p class="home-seo-text">Sem esse ponto de partida, é fácil achar que está comendo muito quando, na prática, ainda está abaixo das calorias necessárias para ganhar peso.</p>
        </section>

        <!-- Secção 5 — Como usar no dia a dia -->
        <section class="home-seo-section">
          <h2 class="home-seo-title">Como usar o plano alimentar no dia a dia</h2>
          <p class="home-seo-text">O plano alimentar gerado deve ser usado como ponto de partida, não como uma regra rígida.</p>
          <p class="home-seo-text">Use o plano para entender volumes, horários e combinações de alimentos. Mais importante do que seguir tudo ao detalhe é entender o que representa uma refeição com boas calorias, proteína suficiente e carboidratos adequados ao seu objetivo.</p>
          <p class="home-seo-text">Depois, ajuste ao seu gosto. Você pode trocar alimentos, alterar quantidades, adicionar opções que já usa no dia a dia e remover o que não funciona para você. Um plano alimentar só é útil se conseguir realmente seguir.</p>
          <p class="home-seo-text">Também é possível guardar o plano em PDF para consultar no celular, imprimir ou usar como referência nas compras.</p>
        </section>

        <!-- Secção 6 — Mini FAQ -->
        <section class="home-seo-section">
          <h2 class="home-seo-title">Perguntas frequentes</h2>
          <div class="home-seo-faq">
            <details class="home-seo-faq-item">
              <summary>O que é um hardgainer?</summary>
              <div class="home-seo-faq-answer">É uma pessoa que tem dificuldade em ganhar peso e massa muscular, mesmo quando sente que já come bastante. Normalmente precisa de mais consistência, mais calorias e uma melhor organização das refeições.</div>
            </details>
            <details class="home-seo-faq-item">
              <summary>Como é calculado o meu plano alimentar?</summary>
              <div class="home-seo-faq-answer">A calculadora usa dados como peso, altura, idade, sexo e rotina para estimar as suas calorias diárias. Depois distribui essas calorias por proteína, carboidratos e gorduras, criando um plano alimentar de 14 dias.</div>
            </details>
            <details class="home-seo-faq-item">
              <summary>A ferramenta é gratuita?</summary>
              <div class="home-seo-faq-answer">Sim. A calculadora é gratuita, pode ser usada sem criar conta, sem instalar nada e sem pagamento.</div>
            </details>
            <details class="home-seo-faq-item">
              <summary>Esta calculadora serve para ectomorfos?</summary>
              <div class="home-seo-faq-answer">Sim. A ferramenta é especialmente útil para ectomorfos e pessoas com dificuldade em ganhar peso, porque ajuda a transformar o objetivo em calorias, macros e refeições práticas.</div>
            </details>
          </div>
          <a href="/faq" data-route class="home-seo-faq-more">Ver todas as perguntas frequentes →</a>
        </section>

        <!-- CTA final -->
        <div class="home-seo-cta">
          <div class="home-seo-cta-title">Pronto para calcular seus macros?</div>
          <p class="home-seo-cta-text">Preencha seus dados no formulário acima e receba seu plano alimentar de 14 dias em poucos minutos.</p>
          <button type="button" class="home-seo-cta-btn" id="btn-seo-cta">Começar agora ↑</button>
        </div>

      </div>
      <!-- ═══ Fim conteúdo SEO ══════════════════════════════════════════ -->

      ${renderHomeBlogSection()}

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

  // Prevent number inputs from changing value on scroll — blur() lets the page scroll normally
  ['in-age', 'in-weight', 'in-height'].forEach(id => {
    document.getElementById(id).addEventListener('wheel', function() { this.blur(); });
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

  // CTA final SEO — scroll suave de volta à calculadora
  const btnSeoCta   = document.getElementById('btn-seo-cta');
  const calcAnchor  = document.getElementById('calculadora');
  if (btnSeoCta && calcAnchor) {
    btnSeoCta.addEventListener('click', () => {
      calcAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}
