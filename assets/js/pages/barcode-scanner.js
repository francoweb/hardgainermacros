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
let codeReader = null;

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

      <!-- Estado: idle — botão ligar -->
      <div id="scanner-actions" class="scanner-actions">
        <button type="button" class="btn btn-primary" id="btn-start-scan">
          ${icons.barcode(16)} Ligar câmara
        </button>
      </div>

      <!-- Estado: loading -->
      <div id="scanner-loading" class="scanner-loading" style="display:none;">
        <div class="scanner-spinner"></div>
        <p>A consultar base de dados…</p>
      </div>

      <!-- Estado: resultado -->
      <div id="scanner-result" class="scanner-result-card" style="display:none;">
        <div class="scanner-result-header">
          <div class="scanner-result-info">
            <div class="scanner-result-name" id="result-name"></div>
            <div class="scanner-result-brand" id="result-brand"></div>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" id="btn-scan-again">
            ${icons.refresh(14)} Consultar outro
          </button>
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
      </div>

      <!-- Estado: erro -->
      <div id="scanner-error" class="scanner-error" style="display:none;">
        <span class="scanner-error-icon">⚠️</span>
        <p id="scanner-error-msg">Produto não encontrado na base de dados. Experimenta introduzir manualmente.</p>
        <button type="button" class="btn btn-secondary" id="btn-retry">Tentar novamente</button>
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
  const video      = document.getElementById('hg-scanner-video');
  const laser      = document.getElementById('scanner-laser');
  const actionsEl  = document.getElementById('scanner-actions');
  const loadingEl  = document.getElementById('scanner-loading');
  const resultEl   = document.getElementById('scanner-result');
  const errorEl    = document.getElementById('scanner-error');
  const errorMsg   = document.getElementById('scanner-error-msg');
  const proCta     = document.getElementById('pro-cta-bar');
  const qtyInput   = document.getElementById('scanner-qty');

  // Macros per 100g guardados para recalcular ao mudar a quantidade
  let macros100 = { kcal: 0, prot: 0, carb: 0, fat: 0 };

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
    actionsEl.style.display = state === 'idle'     ? 'block' : 'none';
    loadingEl.style.display = state === 'loading'  ? 'flex'  : 'none';
    resultEl.style.display  = state === 'result'   ? 'block' : 'none';
    errorEl.style.display   = state === 'error'    ? 'flex'  : 'none';
    proCta.style.display    = state === 'result'   ? 'block' : 'none';
    laser.style.display     = state === 'scanning' ? 'block' : 'none';
    if (state !== 'scanning') stopReader();
  }

  function showResult(data) {
    const p = data.product;
    const n = p.nutriments || {};

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
          const barcode = result.getText();
          stopReader();
          showState('loading');
          try {
            const res  = await fetch(
              `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
            );
            const data = await res.json();
            if (data.status === 1 && data.product?.product_name) {
              showResult(data);
            } else {
              errorMsg.textContent =
                'Produto não encontrado na base de dados. Experimenta introduzir manualmente.';
              showState('error');
            }
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
  document.getElementById('btn-scanner-back').addEventListener('click', () => {
    stopReader();
    history.back(); // popstate → router resolve a página anterior
  });

  document.getElementById('btn-start-scan').addEventListener('click', startScanner);

  document.getElementById('btn-scan-again').addEventListener('click', () => {
    showState('idle');
    startScanner();
  });

  document.getElementById('btn-retry').addEventListener('click', () => {
    showState('idle');
    startScanner();
  });

  qtyInput.addEventListener('input', () => {
    const qty = parseFloat(qtyInput.value);
    if (qty > 0 && !isNaN(qty)) updateQtyMacros(qty);
  });
}
