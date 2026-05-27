// @ts-check
'use strict';

/**
 * scenarios.js — Fixtures de estado para testes E2E
 *
 * Cada fixture representa o estado completo que a app teria após um
 * utilizador preencher todos os formulários com os parâmetros indicados.
 *
 * Kcal base usada em todos os cenários: 2660 kcal/dia.
 *
 * COMO OS VALORES FORAM CALCULADOS:
 *   - Perfil: homem, 23 anos, 75 kg, 176 cm, atividade moderada
 *   - Objetivo: ganho de peso, dificuldade "clássico", não falso magro
 *   - TDEE ≈ 2310 kcal + superávit ≈ 350 → total 2660 kcal
 *   - slotDistribution calculada com buildSlotDistribution() de calculator.js
 *   - Os tempos (.time) em slotDistribution são sobrescritos por
 *     rebuildTimesAroundTraining() — dependem de sleepEndTime/sleepStartTime.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Dados base (partilhados por todos os cenários)
// ─────────────────────────────────────────────────────────────────────────────

const BASE_FORM = {
  age: '23',
  sex: 'male',
  weight: '75',
  height: '176',
  unit: 'metric',
};

const BASE_PROFILE = {
  activity: 'moderate',
  goal: 'gain',
  difficulty: 'classico',
  falsoMagro: false,
};

const BASE_MACROS = {
  bmr: 1842,
  tdee: 2310,
  surplus: 350,
  calories: 2660,
  weeklyGainLowKg: 0.3,
  weeklyGainHighKg: 0.5,
  protein: { grams: 200, kcal: 800,  pct: 30, perKg: 2.7 },
  carb:    { grams: 332, kcal: 1328, pct: 50 },
  fat:     { grams: 59,  kcal: 531,  pct: 20 },
  macroNote: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Slot distributions pré-calculadas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Híbrido 6 refeições — 2660 kcal
 *
 * slots: breakfast(S) shake_morning(Sh) lunch(S) shake_afternoon(Sh) dinner(S) shake_night(Sh)
 * solidShare=0.60 → 1596 kcal  |  shakeShare=0.40 → 1064 kcal
 * solidTotalWeight = 1.05+1.15+1.10 = 3.30
 * shakeTotalWeight = 0.95+0.95+0.80 = 2.70
 *
 * Os .time abaixo são os base7 / base6 hardcoded — serão sobrescritos
 * por rebuildTimesAroundTraining() com base no sleepEndTime do fixture.
 */
const HYBRID_6_SLOTS = [
  { slot: 'breakfast',       type: 'solid', kcal: 508, time: '07:00' },
  { slot: 'shake_morning',   type: 'shake', kcal: 374, time: '10:00' },
  { slot: 'lunch',           type: 'solid', kcal: 556, time: '12:30' },
  { slot: 'shake_afternoon', type: 'shake', kcal: 374, time: '15:30' },
  { slot: 'dinner',          type: 'solid', kcal: 532, time: '19:00' },
  { slot: 'shake_night',     type: 'shake', kcal: 315, time: '22:00' },
  // soma: 2659 (±1 arredondamento); calories no results = 2660
];

/**
 * Mais Refeições Sólidas 7 refeições — 2660 kcal
 *
 * slots: breakfast(S) shake_morning(Sh) lunch(S) lunchExtra(S) dinner(S) dinnerExtra(S) shake_night(Sh)
 * solidShare=0.70 → 1862 kcal  |  shakeShare=0.30 → 798 kcal
 * solidTotalWeight = 1.05+1.15+0.90+1.10+0.80 = 5.00
 * shakeTotalWeight = 0.95+0.80 = 1.75
 *
 * Nota: lunchExtra e dinnerExtra usam slot='lunch' e slot='dinner' respectivamente
 * (duplicação intencional — é assim que buildSlotDistribution() funciona).
 */
const SOLID_7_SLOTS = [
  { slot: 'breakfast',     type: 'solid', kcal: 391, time: '07:15' }, // (0)
  { slot: 'shake_morning', type: 'shake', kcal: 433, time: '09:30' }, // (1)
  { slot: 'lunch',         type: 'solid', kcal: 428, time: '12:00' }, // (2)
  { slot: 'lunch',         type: 'solid', kcal: 335, time: '15:00' }, // (3) lunchExtra
  { slot: 'dinner',        type: 'solid', kcal: 410, time: '17:30' }, // (4)
  { slot: 'dinner',        type: 'solid', kcal: 298, time: '20:00' }, // (5) dinnerExtra
  { slot: 'shake_night',   type: 'shake', kcal: 365, time: '22:30' }, // (6)
  // soma: 2660 ✓
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper para construir o objecto results completo
// ─────────────────────────────────────────────────────────────────────────────

function buildResults(slots, routine) {
  return {
    ...BASE_MACROS,
    slotDistribution: slots,
    profile: {
      ...BASE_PROFILE,
      mealsPerDay: routine.mealsPerDay,
      strategy: routine.strategy,
    },
    routine: { ...routine },
    computedAt: '2026-05-24T10:00:00.000Z',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 1 — Wake 07:00 / Sleep 23:00 / 6 refeições / Híbrido / sem treino
// ─────────────────────────────────────────────────────────────────────────────
// Esperado:
//   • Café da Manhã 07:15 como primeira refeição
//   • Total 2660 kcal

const ROUTINE_WAKE_0700_6H_NO_TRAIN = {
  sleepEndTime: '07:00',
  sleepStartTime: '23:00',
  trainDays: 0,
  trainStartTime: null,
  trainEndTime: null,
  trainFasted: false,
  trainDurationMinutes: null,
  mealsPerDay: 6,
  strategy: 'hybrid',
};

const CENARIO_1 = {
  form: { ...BASE_FORM },
  profile: { ...BASE_PROFILE, mealsPerDay: 6, strategy: 'hybrid' },
  routine: ROUTINE_WAKE_0700_6H_NO_TRAIN,
  results: buildResults(HYBRID_6_SLOTS, ROUTINE_WAKE_0700_6H_NO_TRAIN),
};

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 2 — Wake 08:00 / Sleep 23:00 / 6 refeições / Híbrido / sem treino
// ─────────────────────────────────────────────────────────────────────────────
// Esperado:
//   • Café da Manhã 08:15 como primeira refeição (bug 3E-A corrigido)
//   • Total 2660 kcal

const ROUTINE_WAKE_0800_6H_NO_TRAIN = {
  ...ROUTINE_WAKE_0700_6H_NO_TRAIN,
  sleepEndTime: '08:00',
};

const CENARIO_2 = {
  form: { ...BASE_FORM },
  profile: { ...BASE_PROFILE, mealsPerDay: 6, strategy: 'hybrid' },
  routine: ROUTINE_WAKE_0800_6H_NO_TRAIN,
  results: buildResults(HYBRID_6_SLOTS, ROUTINE_WAKE_0800_6H_NO_TRAIN),
};

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 3 — Wake 09:00 / Sleep 23:00 / 6 refeições / Híbrido / sem treino
// ─────────────────────────────────────────────────────────────────────────────
// Esperado:
//   • Café da Manhã 09:15 como primeira refeição
//   • Total 2660 kcal

const ROUTINE_WAKE_0900_6H_NO_TRAIN = {
  ...ROUTINE_WAKE_0700_6H_NO_TRAIN,
  sleepEndTime: '09:00',
};

const CENARIO_3 = {
  form: { ...BASE_FORM },
  profile: { ...BASE_PROFILE, mealsPerDay: 6, strategy: 'hybrid' },
  routine: ROUTINE_WAKE_0900_6H_NO_TRAIN,
  results: buildResults(HYBRID_6_SLOTS, ROUTINE_WAKE_0900_6H_NO_TRAIN),
};

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 4 — Wake 07:00 / Sleep 23:00 / 7 refeições / Sólidas / sem treino
// ─────────────────────────────────────────────────────────────────────────────
// Esperado:
//   • Não aparece "Refeição Pré-Treino" (bug 3E-A + fix label)
//   • Aparece "Lanche da Tarde" no slot das 16:45
//   • Total 2660 kcal

const ROUTINE_WAKE_0700_7S_NO_TRAIN = {
  sleepEndTime: '07:00',
  sleepStartTime: '23:00',
  trainDays: 0,
  trainStartTime: null,
  trainEndTime: null,
  trainFasted: false,
  trainDurationMinutes: null,
  mealsPerDay: 7,
  strategy: 'solid',
};

const CENARIO_4 = {
  form: { ...BASE_FORM },
  profile: { ...BASE_PROFILE, mealsPerDay: 7, strategy: 'solid' },
  routine: ROUTINE_WAKE_0700_7S_NO_TRAIN,
  results: buildResults(SOLID_7_SLOTS, ROUTINE_WAKE_0700_7S_NO_TRAIN),
};

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 5 — Wake 07:00 / Sleep 23:00 / treino 16:00–17:30 / 7 refeições / Sólidas
// ─────────────────────────────────────────────────────────────────────────────
// Esperado:
//   • Bloco treino 16:00–17:30 visível
//   • Refeição pré-treino aparece antes do treino
//   • Refeição pós-treino aparece depois do treino
//   • Total 2660 kcal

const ROUTINE_WAKE_0700_7S_TRAIN_1600 = {
  sleepEndTime: '07:00',
  sleepStartTime: '23:00',
  trainDays: 3,
  trainStartTime: '16:00',
  trainEndTime: '17:30',
  trainFasted: false,
  trainDurationMinutes: 90,
  mealsPerDay: 7,
  strategy: 'solid',
};

const CENARIO_5 = {
  form: { ...BASE_FORM },
  profile: { ...BASE_PROFILE, mealsPerDay: 7, strategy: 'solid' },
  routine: ROUTINE_WAKE_0700_7S_TRAIN_1600,
  results: buildResults(SOLID_7_SLOTS, ROUTINE_WAKE_0700_7S_TRAIN_1600),
};

// ─────────────────────────────────────────────────────────────────────────────
// Cenários 6 e 7 — Plano Alimentar de 14 Dias
// Reutilizam os dados dos cenários 2 e 4 respectivamente.
// ─────────────────────────────────────────────────────────────────────────────

const CENARIO_6 = CENARIO_2; // wake 08:00, 6H, híbrido, sem treino
const CENARIO_7 = CENARIO_4; // wake 07:00, 7S, sólidas, sem treino

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 8 — Wake 07:00 / Sleep 23:00 / treino 16:00–17:30 / 7 refeições / Sólidas
// (mesmo estado que C5 — testa especificamente o espaçamento entre refeições pré-treino)
// ─────────────────────────────────────────────────────────────────────────────
// Problema documentado:
//   Almoço 13:00 → Refeição da Tarde 13:30 (gap de 30 min — demasiado curto)
// Esperado após fix:
//   Gap mínimo de 60 min entre refeições consecutivas no bloco pré-treino
const CENARIO_8 = CENARIO_5; // wake 07:00, 7S, sólidas, treino 16:00–17:30

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 9 — Wake 07:00 / Sleep 23:00 / 8 refeições / Prático / sem treino
// ─────────────────────────────────────────────────────────────────────────────
// Esperado após F1:
//   Aviso de espaçamento visível ("Diagnóstico Inteligente da Rotina")
//   Nunca aparecer "Refeição Pré-Treino" sem treino
//   Total kcal preservado

const PRACTICAL_8_SLOTS = [
  { slot: 'breakfast',       type: 'solid', kcal: 350, time: '07:15' }, // (0)
  { slot: 'shake_morning',   type: 'shake', kcal: 320, time: '09:15' }, // (1)
  { slot: 'lunch',           type: 'solid', kcal: 400, time: '11:15' }, // (2)
  { slot: 'shake_afternoon', type: 'shake', kcal: 280, time: '13:15' }, // (3)
  { slot: 'lunch',           type: 'solid', kcal: 320, time: '15:30' }, // (4) lunchExtra
  { slot: 'dinner',          type: 'solid', kcal: 400, time: '17:30' }, // (5)
  { slot: 'shake_extra',     type: 'shake', kcal: 300, time: '19:30' }, // (6)
  { slot: 'shake_night',     type: 'shake', kcal: 290, time: '21:30' }, // (7)
  // 350+320+400+280+320+400+300+290 = 2660 ✓
];

const ROUTINE_WAKE_0700_8P_NO_TRAIN = {
  sleepEndTime: '07:00',
  sleepStartTime: '23:00',
  trainDays: 0,
  trainStartTime: null,
  trainEndTime: null,
  trainFasted: false,
  trainDurationMinutes: null,
  mealsPerDay: 8,
  strategy: 'practical',
};

const CENARIO_9 = {
  form: { ...BASE_FORM },
  profile: { ...BASE_PROFILE, mealsPerDay: 8, strategy: 'practical' },
  routine: ROUTINE_WAKE_0700_8P_NO_TRAIN,
  results: buildResults(PRACTICAL_8_SLOTS, ROUTINE_WAKE_0700_8P_NO_TRAIN),
};

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 10 — Wake 07:00 / Sleep 23:00 / treino 20:00–21:30 / 7 refeições / Sólidas
// ─────────────────────────────────────────────────────────────────────────────
// Problema documentado:
//   Cascata de dedup atribui "Refeição Pré-Treino" a refeição às 16:00 (4h antes do treino)
// Esperado após F2:
//   "Refeição Pré-Treino" NÃO aparece (refeição demasiado longe do treino)
//   "Jantar" visível por volta das 17:30 (última sólida antes do treino)

const ROUTINE_WAKE_0700_7S_TRAIN_2000 = {
  sleepEndTime: '07:00',
  sleepStartTime: '23:00',
  trainDays: 3,
  trainStartTime: '20:00',
  trainEndTime: '21:30',
  trainFasted: false,
  trainDurationMinutes: 90,
  mealsPerDay: 7,
  strategy: 'solid',
};

const CENARIO_10 = {
  form: { ...BASE_FORM },
  profile: { ...BASE_PROFILE, mealsPerDay: 7, strategy: 'solid' },
  routine: ROUTINE_WAKE_0700_7S_TRAIN_2000,
  results: buildResults(SOLID_7_SLOTS, ROUTINE_WAKE_0700_7S_TRAIN_2000),
};

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 11 — Wake 18:00 / Sleep 06:00 / 6 refeições / Híbrido / sem treino
// ─────────────────────────────────────────────────────────────────────────────
// Esperado:
//   "Primeira Refeição" visível como primeiro slot (nocturnal=true)
//   "Café da Manhã" não deve aparecer
//   Primeira refeição às 18:15 (wakeMin+15)
//   Total kcal preservado

const ROUTINE_WAKE_1800_6H_NO_TRAIN = {
  sleepEndTime: '18:00',
  sleepStartTime: '06:00',
  trainDays: 0,
  trainStartTime: null,
  trainEndTime: null,
  trainFasted: false,
  trainDurationMinutes: null,
  mealsPerDay: 6,
  strategy: 'hybrid',
};

const CENARIO_11 = {
  form: { ...BASE_FORM },
  profile: { ...BASE_PROFILE, mealsPerDay: 6, strategy: 'hybrid' },
  routine: ROUTINE_WAKE_1800_6H_NO_TRAIN,
  results: buildResults(HYBRID_6_SLOTS, ROUTINE_WAKE_1800_6H_NO_TRAIN),
};

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 12 — Wake 07:00 / Sleep 23:00 / treino 20:00–21:30 / 7 refeições / Sólidas
// (mesmo estado que C10 — investiga o pós-treino e o override sleepMin-90)
// ─────────────────────────────────────────────────────────────────────────────
// Problema documentado (F3):
//   spaceTimes calcula pós-treino natural às 22:15 (com POST_BUFFER=20 min)
//   mas postTimes[last] = roundQ(sleepMin-90) = roundQ(1290) = 21:30
//   recua o shake para o exato momento em que o treino termina (sem buffer).
//   Além disso, shake_night não recebe label "Refeição Pós-Treino" porque
//   startsWith('shake') pula a verificação de trainEndTime.
// Esperado após F3:
//   Shake (ou refeição) às 22:xx (com buffer real após o treino)
//   Label adequado para o slot pós-treino
const CENARIO_12 = CENARIO_10; // wake 07:00, 7S, sólidas, treino 20:00–21:30

module.exports = {
  CENARIO_1,
  CENARIO_2,
  CENARIO_3,
  CENARIO_4,
  CENARIO_5,
  CENARIO_6,
  CENARIO_7,
  CENARIO_8,
  CENARIO_9,
  CENARIO_10,
  CENARIO_11,
  CENARIO_12,
};
