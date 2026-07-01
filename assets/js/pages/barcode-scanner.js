/**
 * PAGE — Consultar Alimento (/consultar-alimento)
 * =============================================================================
 * Scanner de código de barras usando ZXing (CDN) + Open Food Facts API.
 *
 * Fluxo:
 *  1. Utilizador clica "Ligar câmara"
 *  2. ZXing BrowserMultiFormatReader detecta o código
 *  3. Consulta Open Food Facts (gratuita, sem chave)
 *  4. Mostra macros por 100g + selector de quantidade com recálculo em tempo real
 *
 * Cleanup: codeReader.reset() é chamado na re-entrada da função e ao navegar.
 * =============================================================================
 */

import { navigate } from '../modules/router.js';
import { icons }    from '../modules/icons.js';

// ── Instância do leitor (módulo) — necessário para cleanup ao navegar ────────
let codeReader             = null;
let lastBarcode            = '';    // guarda o último código lido para o botão "Guardar"
let lastNutriments         = {};    // guarda os nutriments da OFF para extrair micronutrientes
let lastManualName         = '';    // nome parcial da API para pré-preencher formulário manual
let lastLabelMicronutrients = null; // micronutrientes pré-preenchidos pela foto do rótulo

const ZXING_CDN = 'https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js';

/** Carrega ZXing via <script> (uma única vez; no-op se já carregado). */
function loadZXing() {
  return new Promise((resolve, reject) => {
    if (window.ZXing) { resolve(window.ZXing); return; }
    const s = document.createElement('script');
    s.src = ZXING_CDN;
    s.onload  = () => resolve(window.ZXing);
    s.onerror = () => reject(new Error('Falha ao carregar ZXing'));
    document.head.appendChild(s);
  });
}

/**
 * Extrai micronutrientes de data.product.nutriments (Open Food Facts) e converte
 * para as unidades internas da app (ver NUTRI_LABELS em plano-14-dias.js).
 *
 * Conversões necessárias:
 *  - g → mg  (×1000): sodium, cholesterol, calcium, iron, magnesium,
 *                      potassium, zinc, phosphorus
 *  - já em g         : saturated, mono, poly, trans, sugar, fiber, salt
 *  - já em mg        : vitC, vitE, vitB1, vitB2, vitB3, vitB6
 *  - já em µg        : vitA, vitD, vitK, vitB12, folate, selenium, iodine
 *
 * Valores ausentes ou inválidos → null (a app filtra null em buildNutriDetailsHtml).
 */
function extractMicronutrients(n) {
  const asIs  = (key) => { const v = n[key]; return (typeof v === 'number' && isFinite(v)) ? Math.round(v * 1000) / 1000 : null; };
  const gToMg = (key) => { const v = n[key]; return (typeof v === 'number' && isFinite(v)) ? Math.round(v * 1e6) / 1000 : null; };

  return {
    // Gorduras detalhadas (g → g)
    saturated:   asIs('saturated-fat_100g'),
    mono:        asIs('monounsaturated-fat_100g'),
    poly:        asIs('polyunsaturated-fat_100g'),
    trans:       asIs('trans-fat_100g'),
    // Carboidratos detalhados (g → g)
    sugar:       asIs('sugars_100g'),
    fiber:       asIs('fiber_100g'),
    // Sal / sódio / colesterol
    salt:        asIs('salt_100g'),          // g → g
    sodium:      gToMg('sodium_100g'),       // g → mg
    cholesterol: gToMg('cholesterol_100g'),  // g → mg
    // Vitaminas já em mg (app espera mg)
    vitC:  asIs('vitamin-c_100g'),
    vitE:  asIs('vitamin-e_100g'),
    vitB1: asIs('vitamin-b1_100g'),
    vitB2: asIs('vitamin-b2_100g'),
    vitB3: asIs('vitamin-pp_100g'),  // niacina/B3 em OFF = vitamin-pp
    vitB6: asIs('vitamin-b6_100g'),
    // Vitaminas já em µg (app espera µg)
    vitA:   asIs('vitamin-a_100g'),
    vitD:   asIs('vitamin-d_100g'),
    vitK:   asIs('vitamin-k_100g'),
    vitB12: asIs('vitamin-b12_100g'),
    folate: asIs('folates_100g'),
    // Minerais em g → mg
    calcium:    gToMg('calcium_100g'),
    iron:       gToMg('iron_100g'),
    magnesium:  gToMg('magnesium_100g'),
    potassium:  gToMg('potassium_100g'),
    zinc:       gToMg('zinc_100g'),
    phosphorus: gToMg('phosphorus_100g'),
    // Oligoelementos já em µg (app espera µg)
    selenium: asIs('selenium_100g'),
    iodine:   asIs('iodine_100g'),
  };
}

// ── Renderer principal ────────────────────────────────────────────────────────
export function renderBarcodeScannerPage(mount) {
  // Cleanup de leitura anterior ao re-entrar na página
  if (codeReader) {
    try { codeReader.reset(); } catch {}
    codeReader = null;
  }

  mount.innerHTML = `
    <div class="container scanner-page">

      <div class="scanner-header">
        <button type="button" class="btn btn-ghost btn-sm" id="btn-scanner-back">
          ${icons.arrowLeft(16)} Voltar
        </button>
        <span class="scanner-header-title">Consultar Alimento</span>
      </div>

      <div class="scanner-instruction">
        ${icons.barcode(32)}
        <p>Aponta a câmara para o código de barras da embalagem</p>
      </div>

      <!-- Viewfinder da câmara -->
      <div class="scanner-viewfinder">
        <video id="hg-scanner-video" playsinline muted></video>
        <div class="scanner-corners">
          <span class="sc-tl"></span>
          <span class="sc-tr"></span>
          <span class="sc-bl"></span>
          <span class="sc-br"></span>
        </div>
        <div class="scanner-laser" id="scanner-laser" style="display:none;"></div>
      </div>

      <!-- Botão "Voltar ao plano" — sempre visível, independente do estado (POSIÇÃO 1) -->
      <div class="scanner-back-row">
        <button type="button" class="btn btn-secondary" id="btn-back-plan-top">
          ${icons.arrowLeft(16)} Voltar ao plano
        </button>
      </div>

      <!-- Estado: idle — botão ligar câmara + opção foto -->
      <div id="scanner-actions" class="scanner-actions">
        <button type="button" class="btn btn-primary" id="btn-start-scan">
          ${icons.barcode(16)} Ligar câmara
        </button>
        <div class="scanner-divider">— ou —</div>
        <button type="button" class="btn btn-secondary" id="btn-photo-label">
          ${icons.camera(16)} Fotografar tabela nutricional
        </button>
        <p class="scanner-photo-hint">Para produtos que a câmara não reconhece pelo código</p>
      </div>

      <!-- Estado: loading -->
      <div id="scanner-loading" class="scanner-loading" style="display:none;">
        <div class="scanner-spinner"></div>
        <p>A consultar base de dados…</p>
      </div>

      <!-- Estado: resultado -->
      <div id="scanner-result" class="scanner-result-card" style="display:none;">
        <div class="scanner-result-header">
          <div class="scanner-result-name" id="result-name"></div>
          <div class="scanner-result-brand" id="result-brand"></div>
        </div>

        <div class="scanner-macros-block">
          <div class="scanner-macros-label">Por 100 g</div>
          <div class="scanner-macro-grid">
            <div class="scanner-macro-item scanner-cal">
              <span class="scanner-macro-val" id="m100-kcal">—</span>
              <span class="scanner-macro-lbl">kcal</span>
            </div>
            <div class="scanner-macro-item scanner-protein">
              <span class="scanner-macro-val" id="m100-prot">—</span>
              <span class="scanner-macro-lbl">Proteína</span>
            </div>
            <div class="scanner-macro-item scanner-carb">
              <span class="scanner-macro-val" id="m100-carb">—</span>
              <span class="scanner-macro-lbl">Carboidratos</span>
            </div>
            <div class="scanner-macro-item scanner-fat">
              <span class="scanner-macro-val" id="m100-fat">—</span>
              <span class="scanner-macro-lbl">Gorduras</span>
            </div>
          </div>
        </div>

        <div class="scanner-qty-section">
          <label class="scanner-qty-label" for="scanner-qty">Quantidade</label>
          <div class="scanner-qty-row">
            <input type="number" id="scanner-qty" class="scanner-qty-input"
                   value="100" min="1" max="9999" inputmode="decimal">
            <span class="scanner-qty-unit">g</span>
          </div>
        </div>

        <div class="scanner-macros-block">
          <div class="scanner-macros-label">Para esta quantidade</div>
          <div class="scanner-macro-grid">
            <div class="scanner-macro-item scanner-cal">
              <span class="scanner-macro-val" id="mqty-kcal">—</span>
              <span class="scanner-macro-lbl">kcal</span>
            </div>
            <div class="scanner-macro-item scanner-protein">
              <span class="scanner-macro-val" id="mqty-prot">—</span>
              <span class="scanner-macro-lbl">Proteína</span>
            </div>
            <div class="scanner-macro-item scanner-carb">
              <span class="scanner-macro-val" id="mqty-carb">—</span>
              <span class="scanner-macro-lbl">Carboidratos</span>
            </div>
            <div class="scanner-macro-item scanner-fat">
              <span class="scanner-macro-val" id="mqty-fat">—</span>
              <span class="scanner-macro-lbl">Gorduras</span>
            </div>
          </div>
        </div>

        <!-- Botões de acção — abaixo de "Para esta quantidade" (POSIÇÃO 2) -->
        <div class="scanner-result-btn-row">
          <button type="button" class="btn btn-secondary" id="btn-save-library">
            Guardar na biblioteca
          </button>
          <button type="button" class="btn btn-ghost" id="btn-back-plan-result">
            ${icons.arrowLeft(16)} Voltar ao plano
          </button>
          <button type="button" class="btn btn-ghost" id="btn-scan-again">
            ${icons.refresh(14)} Consultar outro
          </button>
        </div>
      </div>

      <!-- Estado: erro -->
      <div id="scanner-error" class="scanner-error" style="display:none;">
        <span class="scanner-error-icon">⚠️</span>
        <p id="scanner-error-msg"></p>
        <div class="scanner-error-actions">
          <button type="button" class="btn btn-secondary" id="btn-add-manual">
            + Adicionar manualmente
          </button>
          <button type="button" class="btn btn-ghost" id="btn-retry">
            ${icons.refresh(14)} Tentar novamente
          </button>
        </div>
      </div>

      <!-- Estado: label-loading — a ler rótulo via Gemini Vision -->
      <div id="scanner-label-loading" class="scanner-loading" style="display:none;">
        <div class="scanner-spinner"></div>
        <p>A ler o rótulo nutricional...</p>
        <p class="scanner-macros-label">Isso pode demorar alguns segundos</p>
        <button type="button" class="btn btn-ghost" id="btn-cancel-label">Cancelar</button>
      </div>

      <!-- Estado: manual — adição quando produto não é encontrado na base de dados -->
      <div id="scanner-manual" class="scanner-result-card" style="display:none;">
        <div class="scanner-manual-title">Adicionar produto manualmente</div>
        <p class="scanner-manual-hint">Preencha os campos abaixo com os valores da embalagem. O produto ficará salvo para a próxima vez.</p>

        <!-- Botão discreto para usar foto do rótulo a partir do formulário manual -->
        <button type="button" class="btn btn-ghost scanner-manual-photo-btn" id="btn-photo-in-manual">
          ${icons.camera(14)} Preencher com foto do rótulo
        </button>

        <!-- Aviso de confiança da leitura por IA (oculto por padrão) -->
        <div id="manual-confidence-msg" style="display:none;"></div>

        <div class="scanner-manual-field">
          <label class="scanner-macros-label" for="manual-name">Nome do produto</label>
          <input type="text" id="manual-name" class="scanner-manual-input" maxlength="80" autocomplete="off" placeholder="Ex: Iogurte natural">
        </div>

        <div class="scanner-macros-block">
          <div class="scanner-macros-label">Macros por 100 g</div>
          <div class="scanner-macro-grid">
            <div class="scanner-macro-item">
              <input type="number" id="manual-kcal" class="scanner-macro-input" inputmode="decimal" placeholder="—">
              <span class="scanner-macro-lbl">kcal</span>
            </div>
            <div class="scanner-macro-item">
              <input type="number" id="manual-prot" class="scanner-macro-input" inputmode="decimal" placeholder="0">
              <span class="scanner-macro-lbl">Proteína (g)</span>
            </div>
            <div class="scanner-macro-item">
              <input type="number" id="manual-carb" class="scanner-macro-input" inputmode="decimal" placeholder="0">
              <span class="scanner-macro-lbl">Carboidratos (g)</span>
            </div>
            <div class="scanner-macro-item">
              <input type="number" id="manual-fat" class="scanner-macro-input" inputmode="decimal" placeholder="0">
              <span class="scanner-macro-lbl">Gorduras (g)</span>
            </div>
          </div>
        </div>

        <p id="manual-error-msg" style="display:none; color:var(--accent); font-size:13px; margin:0;"></p>

        <div class="scanner-result-btn-row">
          <button type="button" class="btn btn-secondary" id="btn-manual-save">Guardar na biblioteca</button>
          <button type="button" class="btn btn-ghost" id="btn-manual-cancel">Cancelar</button>
        </div>
      </div>

    </div>

    <!-- CTA Pro — fixo no fundo, só visível no estado resultado -->
    <div class="pro-cta-bar" id="pro-cta-bar" style="display:none;">
      <p class="pro-cta-text">Queres registar este alimento e acompanhar os teus macros ao longo do dia?</p>
      <a href="https://app.hardgainermacros.com" target="_blank" rel="noopener noreferrer"
         class="btn btn-primary pro-cta-btn">
        Experimentar o Pro grátis →
      </a>
    </div>
  `;

  // ── Referências DOM ─────────────────────────────────────────────────────────
  const video           = document.getElementById('hg-scanner-video');
  const laser           = document.getElementById('scanner-laser');
  const actionsEl       = document.getElementById('scanner-actions');
  const loadingEl       = document.getElementById('scanner-loading');
  const labelLoadingEl  = document.getElementById('scanner-label-loading');
  const resultEl        = document.getElementById('scanner-result');
  const errorEl         = document.getElementById('scanner-error');
  const errorMsg        = document.getElementById('scanner-error-msg');
  const manualEl        = document.getElementById('scanner-manual');
  const proCta          = document.getElementById('pro-cta-bar');
  const qtyInput        = document.getElementById('scanner-qty');

  // Estado local por render
  let macros100      = { kcal: 0, prot: 0, carb: 0, fat: 0 };
  let labelErrorMode = false;   // true quando o erro veio de leitura de foto
  let labelAbortCtrl = null;    // AbortController activo durante fetch do Gemini

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function round1(v) { return Math.round((v ?? 0) * 10) / 10; }

  function setMacroDisplay(ids, values) {
    document.getElementById(ids[0]).textContent = round1(values.kcal);
    document.getElementById(ids[1]).textContent = round1(values.prot) + 'g';
    document.getElementById(ids[2]).textContent = round1(values.carb) + 'g';
    document.getElementById(ids[3]).textContent = round1(values.fat)  + 'g';
  }

  function updateQtyMacros(qty) {
    const f = qty / 100;
    setMacroDisplay(
      ['mqty-kcal', 'mqty-prot', 'mqty-carb', 'mqty-fat'],
      { kcal: macros100.kcal * f, prot: macros100.prot * f,
        carb: macros100.carb * f, fat:  macros100.fat  * f }
    );
  }

  function stopReader() {
    if (codeReader) {
      try { codeReader.reset(); } catch {}
      codeReader = null;
    }
  }

  function showState(state) {
    actionsEl.style.display      = state === 'idle'          ? 'block' : 'none';
    loadingEl.style.display      = state === 'loading'       ? 'flex'  : 'none';
    labelLoadingEl.style.display = state === 'label-loading' ? 'flex'  : 'none';
    resultEl.style.display       = state === 'result'        ? 'block' : 'none';
    errorEl.style.display        = state === 'error'         ? 'flex'  : 'none';
    manualEl.style.display       = state === 'manual'        ? 'block' : 'none';
    proCta.style.display         = state === 'result'        ? 'block' : 'none';
    laser.style.display          = state === 'scanning'      ? 'block' : 'none';
    if (state !== 'scanning') stopReader();
    if (state !== 'label-loading' && labelAbortCtrl) {
      labelAbortCtrl.abort(); labelAbortCtrl = null;
    }
  }

  /**
   * Pré-preenche e mostra o formulário de adição manual.
   * opts: { kcal, prot, carb, fat, confidence, micronutrients }
   * Todos opcionais — sem opts equivale ao fluxo "não encontrado" (campos vazios).
   */
  function showManualForm(prefillName, opts = {}) {
    document.getElementById('manual-name').value = prefillName || '';
    const setV = (id, v) => { document.getElementById(id).value = (v != null && isFinite(v)) ? v : ''; };
    setV('manual-kcal', opts.kcal);
    setV('manual-prot', opts.prot);
    setV('manual-carb', opts.carb);
    setV('manual-fat',  opts.fat);

    // Micronutrientes da foto (null se não há leitura por IA)
    lastLabelMicronutrients = opts.micronutrients || null;

    // Aviso de confiança
    const confEl = document.getElementById('manual-confidence-msg');
    if (opts.confidence === 'baixa') {
      confEl.textContent   = '⚠️ A leitura pode não estar totalmente precisa — confira os valores na embalagem antes de salvar.';
      confEl.className     = 'scanner-confidence-low';
      confEl.style.display = 'block';
    } else if (opts.confidence === 'media') {
      confEl.textContent   = 'Confira os valores antes de salvar.';
      confEl.className     = 'scanner-confidence-medium';
      confEl.style.display = 'block';
    } else {
      confEl.style.display = 'none';
    }

    const errEl = document.getElementById('manual-error-msg');
    errEl.style.display = 'none';
    errEl.textContent   = '';

    showState('manual');

    // Foco no campo certo
    setTimeout(() => {
      if (!prefillName) {
        document.getElementById('manual-name').focus();
      } else if (opts.kcal == null) {
        document.getElementById('manual-kcal').focus();
      }
    }, 100);
  }

  /**
   * Comprime uma imagem File para JPEG via Canvas.
   * maxPx: lado máximo em px; quality: 0-1.
   * Retorna base64 puro (sem prefixo data:...).
   */
  function compressImage(file, maxPx, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const scale  = Math.min(1, maxPx / Math.max(img.width, img.height));
          const w = Math.round(img.width  * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width  = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
          resolve(base64);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /** Mostra erro de leitura de foto e configura o modo de retry correcto. */
  function showLabelError(message) {
    labelErrorMode = true;
    errorMsg.textContent = message;
    showState('error');
  }

  /**
   * Abre o selector de ficheiro/câmara, comprime, envia para a API Gemini
   * e transita para o formulário manual pré-preenchido.
   */
  function triggerLabelPhoto() {
    stopReader(); // garante que o scanner de barcode está parado

    const input   = document.createElement('input');
    input.type    = 'file';
    input.accept  = 'image/*';
    input.capture = 'environment'; // câmara traseira em mobile

    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      showState('label-loading');

      // Comprimir antes de enviar (máx 1024px, JPEG 0.85)
      let base64;
      try {
        base64 = await compressImage(file, 1024, 0.85);
      } catch {
        showLabelError('Não foi possível processar a imagem. Tente novamente com outra foto.');
        return;
      }

      labelAbortCtrl = new AbortController();
      const timeoutId = setTimeout(() => { if (labelAbortCtrl) labelAbortCtrl.abort(); }, 20000);

      let resp, data;
      try {
        resp = await fetch('/api/read-nutrition-label', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ image: base64 }),
          signal:  labelAbortCtrl.signal,
        });
        clearTimeout(timeoutId);
        labelAbortCtrl = null;
        data = await resp.json();
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        labelAbortCtrl = null;
        const timedOut = fetchErr?.name === 'AbortError';
        showLabelError(timedOut
          ? 'A leitura demorou muito. Tente novamente com uma foto mais nítida.'
          : 'Não foi possível ler o rótulo. Certifique-se de que a foto está nítida e a tabela nutricional visível, ou preencha os valores manualmente.');
        return;
      }

      if (!resp.ok || data?.error || !data?.per100g) {
        showLabelError('Não foi possível ler o rótulo. Certifique-se de que a foto está nítida e a tabela nutricional visível, ou preencha os valores manualmente.');
        return;
      }

      // Sucesso — pré-preencher formulário manual com dados da IA
      const p = data.per100g;
      showManualForm(data.produto_nome || '', {
        kcal:          p.kcal,
        prot:          p.prot,
        carb:          p.carb,
        fat:           p.fat,
        confidence:    data.confidence,
        micronutrients: p,
      });
    };

    input.click();
  }

  function showResult(data) {
    const p = data.product;
    const n = p.nutriments || {};
    lastNutriments = n;  // guardado para usar no botão "Guardar na biblioteca"

    macros100 = {
      kcal: n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0),
      prot: n['proteins_100g']      ?? 0,
      carb: n['carbohydrates_100g'] ?? 0,
      fat:  n['fat_100g']           ?? 0,
    };

    document.getElementById('result-name').textContent  = p.product_name || 'Produto sem nome';
    document.getElementById('result-brand').textContent = p.brands        || '';

    setMacroDisplay(
      ['m100-kcal', 'm100-prot', 'm100-carb', 'm100-fat'],
      macros100
    );

    qtyInput.value = '100';
    updateQtyMacros(100);
    showState('result');
  }

  async function startScanner() {
    laser.style.display = 'block';
    actionsEl.style.display = 'none';

    try {
      const ZXing  = await loadZXing();
      codeReader   = new ZXing.BrowserMultiFormatReader();
      const hints  = new Map();
      // Focar nos formatos de código de barras de produto mais comuns
      hints.set(ZXing.DecodeHintType?.TRY_HARDER, true);

      await codeReader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } } },
        video,
        async (result, err) => {
          if (!result) return;
          lastBarcode = result.getText();
          stopReader();
          showState('loading');
          try {
            let partialName = '';

            // Tentativa 1: API v0 (base de dados principal)
            const res0  = await fetch(
              `https://world.openfoodfacts.org/api/v0/product/${lastBarcode}.json`
            );
            const data0 = await res0.json();
            if (data0.status === 1 && data0.product?.product_name) {
              showResult(data0);
              return;
            }
            partialName = data0.product?.product_name || '';

            // Tentativa 2: API v2 (produtos mais recentes e migrações)
            try {
              const res2  = await fetch(
                `https://world.openfoodfacts.org/api/v2/product/${lastBarcode}.json?fields=product_name,brands,nutriments`
              );
              const data2 = await res2.json();
              if (data2.status === 1 && data2.product?.product_name) {
                showResult(data2);
                return;
              }
              partialName = data2.product?.product_name || partialName;
            } catch {}

            // Ambas falharam — mostrar erro encorajador com opção manual
            lastManualName = partialName;
            errorMsg.textContent =
              'Não encontramos este produto na nossa base de dados. Isso é comum com marcas locais ou produtos mais recentes. Você pode adicioná-lo manualmente lendo os valores da embalagem — ele ficará salvo para a próxima vez.';
            showState('error');
          } catch {
            errorMsg.textContent =
              'Erro de rede. Verifica a ligação à internet e tenta novamente.';
            showState('error');
          }
        }
      );
    } catch (e) {
      const denied =
        e?.name === 'NotAllowedError' ||
        e?.message?.toLowerCase().includes('permission');
      errorMsg.textContent = denied
        ? 'Permissão de câmara negada. Verifica as definições do teu browser.'
        : 'Não foi possível iniciar a câmara. Verifica se o teu dispositivo tem câmara disponível.';
      showState('error');
    }
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  /** Para a câmara e volta à página anterior (ou ao plano se não houver histórico). */
  function goBackToPlano() {
    stopReader();
    if (window.history.length > 1) {
      history.back();
    } else {
      navigate('/plano-14-dias');
    }
  }

  document.getElementById('btn-scanner-back').addEventListener('click', goBackToPlano);
  document.getElementById('btn-back-plan-top').addEventListener('click', goBackToPlano);
  document.getElementById('btn-back-plan-result').addEventListener('click', goBackToPlano);

  document.getElementById('btn-start-scan').addEventListener('click', startScanner);

  document.getElementById('btn-save-library').addEventListener('click', () => {
    const btn  = document.getElementById('btn-save-library');
    const name = document.getElementById('result-name').textContent.trim() || 'Produto';
    const key  = `Código de barras: ${lastBarcode}`;

    const customs = JSON.parse(localStorage.getItem('hg:custom_foods') || '[]');
    const exists  = customs.some(c => c.notes === key);

    const showFeedback = (text) => {
      btn.textContent      = text;
      btn.style.background = 'var(--success-soft)';
      btn.style.color      = 'var(--success-dark)';
      btn.style.border     = '1px solid var(--success)';
      setTimeout(() => {
        btn.textContent      = 'Guardar na biblioteca';
        btn.style.background = '';
        btn.style.color      = '';
        btn.style.border     = '';
      }, 3000);
    };

    if (exists) { showFeedback('✓ Já está na biblioteca!'); return; }

    customs.push({
      id:            `custom_${Date.now()}`,
      name,
      category:      'extra',
      per100:        { kcal: macros100.kcal, prot: macros100.prot, carb: macros100.carb, fat: macros100.fat },
      units:         [{ label: 'g', grams: 100 }],
      digestibility: 'leve',
      substitutes:   [],
      source:        'barcode',
      baseQuantity:  100,
      baseUnit:      'g',
      micronutrients: extractMicronutrients(lastNutriments),
      notes:         key,
      createdAt:     new Date().toISOString(),
    });
    localStorage.setItem('hg:custom_foods', JSON.stringify(customs));
    showFeedback('✓ Guardado na biblioteca!');
  });

  document.getElementById('btn-scan-again').addEventListener('click', () => {
    showState('idle');
    startScanner();
  });

  document.getElementById('btn-retry').addEventListener('click', () => {
    showState('idle');
    if (labelErrorMode) {
      labelErrorMode = false;
      triggerLabelPhoto();
    } else {
      startScanner();
    }
  });

  document.getElementById('btn-add-manual').addEventListener('click', () => {
    lastLabelMicronutrients = null; // sem micros de IA neste caminho
    showManualForm(lastManualName);
  });

  document.getElementById('btn-photo-label').addEventListener('click', triggerLabelPhoto);

  document.getElementById('btn-photo-in-manual').addEventListener('click', triggerLabelPhoto);

  document.getElementById('btn-cancel-label').addEventListener('click', () => {
    if (labelAbortCtrl) { labelAbortCtrl.abort(); labelAbortCtrl = null; }
    showState('idle');
  });

  document.getElementById('btn-manual-save').addEventListener('click', () => {
    const saveBtn = document.getElementById('btn-manual-save');
    const errEl   = document.getElementById('manual-error-msg');
    const name    = (document.getElementById('manual-name').value || '').trim();
    const kcal    = parseFloat(document.getElementById('manual-kcal').value);
    const prot    = parseFloat(document.getElementById('manual-prot').value) || 0;
    const carb    = parseFloat(document.getElementById('manual-carb').value) || 0;
    const fat     = parseFloat(document.getElementById('manual-fat').value)  || 0;

    if (!name) {
      errEl.textContent   = 'O nome do produto é obrigatório.';
      errEl.style.display = 'block';
      return;
    }
    if (!kcal || kcal <= 0 || isNaN(kcal)) {
      errEl.textContent   = 'Preenche as calorias por 100 g.';
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';

    const key     = `Código de barras: ${lastBarcode}`;
    const customs = JSON.parse(localStorage.getItem('hg:custom_foods') || '[]');

    if (customs.some(c => c.notes === key)) {
      errEl.textContent   = 'Este produto já está na tua biblioteca.';
      errEl.style.display = 'block';
      return;
    }

    customs.push({
      id:            `custom_${Date.now()}`,
      name,
      category:      'extra',
      per100:        { kcal, prot, carb, fat },
      units:         [{ label: 'g', grams: 100 }],
      digestibility: 'leve',
      substitutes:   [],
      source:        'barcode',
      baseQuantity:  100,
      baseUnit:      'g',
      micronutrients: lastLabelMicronutrients || {},
      notes:         key,
      createdAt:     new Date().toISOString(),
    });
    localStorage.setItem('hg:custom_foods', JSON.stringify(customs));

    saveBtn.textContent      = '✓ Guardado!';
    saveBtn.style.background = 'var(--success-soft)';
    saveBtn.style.color      = 'var(--success-dark)';
    saveBtn.style.border     = '1px solid var(--success)';
    setTimeout(() => { showState('idle'); }, 1500);
  });

  document.getElementById('btn-manual-cancel').addEventListener('click', () => {
    showState('idle');
    startScanner();
  });

  qtyInput.addEventListener('input', () => {
    const qty = parseFloat(qtyInput.value);
    if (qty > 0 && !isNaN(qty)) updateQtyMacros(qty);
  });
}
