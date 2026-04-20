/**
 * STORAGE MODULE
 * =============================================================================
 * Abstração segura sobre localStorage (dados persistentes) e sessionStorage
 * (progresso de sessão). Lida com erros de privacy mode, quota, etc.
 *
 * REGRAS:
 *  - localStorage: dados do formulário, consentimento de cookies, resultados
 *    calculados (podem ser retomados em nova sessão)
 *  - sessionStorage: flags de progresso válido da sessão atual (protegem rotas)
 *
 * O progresso NUNCA é derivado de localStorage — ele é sempre marcado na
 * sessionStorage depois que o utilizador completa uma etapa. Isso garante
 * que alguém não abra /resultados diretamente depois de ter usado a app ontem.
 * =============================================================================
 */

const PREFIX = 'hg:';

// Keys
export const K = {
  // localStorage (persistente)
  FORM: `${PREFIX}form`,
  PROFILE: `${PREFIX}profile`,
  ROUTINE: `${PREFIX}routine`,
  RESULTS: `${PREFIX}results`,
  PLAN: `${PREFIX}plan`,
  SUBSTITUTIONS: `${PREFIX}subs`,
  COOKIES: `${PREFIX}cookies`,

  // sessionStorage (progresso de sessão)
  STEP1_DONE: `${PREFIX}s:step1`,
  STEP2_DONE: `${PREFIX}s:step2`,
  STEP3_DONE: `${PREFIX}s:step3`,
  RESULTS_READY: `${PREFIX}s:results`,
  PLAN_READY: `${PREFIX}s:plan`,
};

function safe(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}

/* ---------- localStorage ---------- */
export const local = {
  get(key) {
    return safe(() => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    });
  },
  set(key, value) {
    return safe(() => {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    }, false);
  },
  remove(key) {
    safe(() => localStorage.removeItem(key));
  },
  clearAll() {
    safe(() => {
      // apenas remove keys com nosso prefix
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(PREFIX)) localStorage.removeItem(key);
      }
    });
  },
};

/* ---------- sessionStorage ---------- */
export const session = {
  get(key) {
    return safe(() => {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    });
  },
  set(key, value = true) {
    return safe(() => {
      sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    }, false);
  },
  has(key) {
    return safe(() => sessionStorage.getItem(key) !== null, false);
  },
  remove(key) {
    safe(() => sessionStorage.removeItem(key));
  },
  clearAll() {
    safe(() => {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(PREFIX)) sessionStorage.removeItem(key);
      }
    });
  },
};

/* ---------- High-level helpers ---------- */
export function saveFormData(data) { local.set(K.FORM, data); }
export function loadFormData() { return local.get(K.FORM); }

export function saveProfile(data) { local.set(K.PROFILE, data); }
export function loadProfile() { return local.get(K.PROFILE); }

export function saveRoutine(data) { local.set(K.ROUTINE, data); }
export function loadRoutine() { return local.get(K.ROUTINE); }

export function saveResults(data) { local.set(K.RESULTS, data); }
export function loadResults() { return local.get(K.RESULTS); }

export function savePlan(data) { local.set(K.PLAN, data); }
export function loadPlan() { return local.get(K.PLAN); }

export function saveSubstitutions(data) { local.set(K.SUBSTITUTIONS, data); }
export function loadSubstitutions() { return local.get(K.SUBSTITUTIONS) || {}; }

/**
 * Reset completo (Editar / Reiniciar).
 */
export function resetAll() {
  local.clearAll();
  session.clearAll();
}

/**
 * Reset de sessão apenas (mantém dados do form).
 */
export function resetSession() {
  session.clearAll();
}
