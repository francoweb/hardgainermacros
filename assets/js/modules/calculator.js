/**
 * CALCULATOR MODULE
 * =============================================================================
 * Cálculo de necessidades calóricas e macros para hardgainers.
 *
 * Lógica:
 *  1. TMB (Mifflin-St Jeor) — mais preciso que a fórmula peso×24 do ebook,
 *     mas mantemos a filosofia: o ectomorfo precisa comer muito.
 *  2. TDEE = TMB × activity factor
 *  3. Superávit ajustado por: objetivo, perfil de dificuldade, falso-magro
 *  4. Macros: proteína 2g/kg, gorduras ~1g/kg, resto em carboidratos
 *
 * Perfil "falso magro / magro com barriga" recebe tratamento especial:
 *  - superávit menor (menos agressivo)
 *  - proteína mais alta (proteger a recomposição)
 *  - carboidratos um pouco mais baixos (controlar gordura visceral)
 *  - recomendação de priorizar refeições sólidas vs shakes açucarados
 * =============================================================================
 */

/**
 * TMB usando fórmula de Mifflin-St Jeor (ouro-padrão).
 */
export function calcBMR({ sex, age, weightKg, heightCm }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === 'female' ? base - 161 : base + 5);
}

const ACTIVITY_FACTORS = {
  sedentary: 1.35,
  light: 1.5,
  moderate: 1.65,
  active: 1.8,
  very_active: 1.95,
};

export function calcTDEE(bmr, activity) {
  const factor = ACTIVITY_FACTORS[activity] || 1.5;
  return Math.round(bmr * factor);
}

/**
 * Superávit baseado em objetivo + perfil.
 * Retorna um objeto { surplus, weeklyGainLowKg, weeklyGainHighKg }.
 */
export function calcSurplus(goal, profileKey, falsoMagro, weightKg) {
  // base por objetivo
  let surplus;
  let weeklyLow, weeklyHigh;
  switch (goal) {
    case 'controlled':
      surplus = 350; weeklyLow = 0.25; weeklyHigh = 0.5; break;
    case 'moderate':
      surplus = 550; weeklyLow = 0.5; weeklyHigh = 0.75; break;
    case 'aggressive':
      surplus = 800; weeklyLow = 0.75; weeklyHigh = 1; break;
    default:
      surplus = 500; weeklyLow = 0.4; weeklyHigh = 0.7;
  }

  // ajuste por perfil
  if (profileKey === 'ultra_acelerado') surplus += 100;
  if (profileKey === 'apetite_baixo') surplus -= 50;   // mais realista começar menor
  if (profileKey === 'volume_baixo') surplus -= 50;
  if (profileKey === 'rotina_corrida') surplus -= 30;

  // ajuste falso magro (super importante)
  if (falsoMagro) {
    // reduz superávit para evitar acumular gordura abdominal
    surplus = Math.max(250, surplus - 250);
    // ajuste também o ganho semanal esperado
    weeklyLow = Math.max(0.2, weeklyLow - 0.15);
    weeklyHigh = Math.max(0.35, weeklyHigh - 0.2);
  }

  return {
    surplus: Math.round(surplus),
    weeklyGainLowKg: weeklyLow,
    weeklyGainHighKg: weeklyHigh,
  };
}

/**
 * Distribuição de macros por perfil.
 *
 * Usamos percentagens do total calórico em vez de g/kg porque:
 *  (a) hardgainers precisam de muito mais proteína que os 2g/kg clássicos
 *      quando comem 3000+ kcal — o ebook recomenda 2.5-3g/kg;
 *  (b) as percentagens batem com o que as receitas do Sistema Híbrido
 *      realmente entregam (~25% P / 45% C / 30% F), evitando que o
 *      utilizador receba uma meta de macros que o plano não atinge.
 *
 * Retorna { proteinPct, fatPct, carbPct, note }.
 */
function macroRatios(profileKey, falsoMagro) {
  if (falsoMagro) {
    // Menos carbo, mais proteína, gordura moderada — recomposição corporal
    return { proteinPct: 0.28, fatPct: 0.32, carbPct: 0.40, note: 'Proteína elevada e carboidratos controlados para recomposição corporal.' };
  }
  if (profileKey === 'volume_baixo') {
    // Mais gordura para concentrar calorias em pouco volume
    return { proteinPct: 0.22, fatPct: 0.38, carbPct: 0.40, note: 'Mais gordura para concentrar calorias em pouco volume.' };
  }
  if (profileKey === 'ultra_acelerado') {
    // Mais carbo para sustentar gasto elevado
    return { proteinPct: 0.23, fatPct: 0.29, carbPct: 0.48, note: 'Mais carboidratos para sustentar o gasto metabólico elevado.' };
  }
  if (profileKey === 'apetite_baixo') {
    // Densidade calórica balanceada, proteína moderada
    return { proteinPct: 0.24, fatPct: 0.32, carbPct: 0.44, note: 'Densidade calórica moderada para não saturar apetite baixo.' };
  }
  if (profileKey === 'rotina_corrida') {
    // Similar ao clássico mas com um pouco mais de gordura (praticidade = mais shakes+PB)
    return { proteinPct: 0.25, fatPct: 0.32, carbPct: 0.43, note: 'Distribuição prática com shakes e alimentos densos.' };
  }
  // Hardgainer clássico — meta do Sistema Híbrido
  return { proteinPct: 0.25, fatPct: 0.30, carbPct: 0.45, note: 'Distribuição clássica do Sistema Híbrido para hardgainers.' };
}

/**
 * Função principal: calcula tudo numa só passada.
 */
export function calcAll({ formData, profile, routine }) {
  const weightKg = toKg(formData.weight, formData.unit);
  const heightCm = toCm(formData.height, formData.unit);
  const age = Number(formData.age);
  const sex = formData.sex;

  const bmr = calcBMR({ sex, age, weightKg, heightCm });
  const tdee = calcTDEE(bmr, profile.activity);

  const { surplus, weeklyGainLowKg, weeklyGainHighKg } = calcSurplus(
    profile.goal, profile.difficulty, profile.falsoMagro, weightKg
  );

  const calories = tdee + surplus;

  // macros — percentagens do total calórico (ver macroRatios)
  const ratios = macroRatios(profile.difficulty, profile.falsoMagro);
  const proteinKcal = Math.round(calories * ratios.proteinPct);
  const fatKcal = Math.round(calories * ratios.fatPct);
  const carbKcal = Math.max(0, calories - proteinKcal - fatKcal);

  const proteinG = Math.round(proteinKcal / 4);
  const fatG = Math.round(fatKcal / 9);
  const carbG = Math.round(carbKcal / 4);

  // % do total (recalculado a partir dos gramas arredondados)
  const totalKcal = proteinG * 4 + fatG * 9 + carbG * 4;
  const proteinPct = Math.round((proteinG * 4 / totalKcal) * 100);
  const carbPct = Math.round((carbG * 4 / totalKcal) * 100);
  const fatPct = 100 - proteinPct - carbPct;

  // proteína por kg de peso corporal (informativo, para mostrar ao utilizador)
  const proteinPerKg = Math.round((proteinG / weightKg) * 10) / 10;

  // distribuição das calorias por slot conforme estratégia
  const slotDistribution = buildSlotDistribution(calories, routine);

  return {
    weightKg,
    heightCm,
    bmr,
    tdee,
    surplus,
    calories,
    protein: { grams: proteinG, kcal: proteinG * 4, pct: proteinPct, perKg: proteinPerKg },
    carb: { grams: carbG, kcal: carbG * 4, pct: carbPct },
    fat: { grams: fatG, kcal: fatG * 9, pct: fatPct },
    weeklyGainLowKg,
    weeklyGainHighKg,
    macroNote: ratios.note,
    slotDistribution,
    profile: { ...profile },
    routine: { ...routine },
    computedAt: new Date().toISOString(),
  };
}

/**
 * Distribui as calorias totais entre os slots de refeição.
 * Para Sistema Híbrido (6 refeições padrão): ~60% sólidos + ~40% shakes.
 *
 * Ajustes por estratégia do utilizador:
 *  - "Mais Refeições Sólidas" => 70% sólido / 30% shakes
 *  - "Sistema Híbrido" (default) => 60/40
 *  - "Máxima Praticidade" => 45% sólido / 55% shakes
 */
export function buildSlotDistribution(totalKcal, routine) {
  const meals = routine.mealsPerDay || 6;
  const strategy = routine.strategy || 'hybrid';

  // proporção sólidos/shakes
  let solidShare, shakeShare;
  if (strategy === 'solid') { solidShare = 0.7; shakeShare = 0.3; }
  else if (strategy === 'practical') { solidShare = 0.45; shakeShare = 0.55; }
  else { solidShare = 0.6; shakeShare = 0.4; }

  // Qual é a rotação base de 6 refeições?
  // breakfast, shake_morning, lunch, shake_afternoon, dinner, shake_night
  const template = [
    { slot: 'breakfast', type: 'solid', weight: 1.05 },
    { slot: 'shake_morning', type: 'shake', weight: 0.95 },
    { slot: 'lunch', type: 'solid', weight: 1.15 },
    { slot: 'shake_afternoon', type: 'shake', weight: 0.95 },
    { slot: 'dinner', type: 'solid', weight: 1.10 },
    { slot: 'shake_night', type: 'shake', weight: 0.80 },
  ];

  // adapta número de refeições
  let slots;
  if (meals <= 4) {
    slots = [template[0], template[2], template[4], template[5]];
  } else if (meals === 5) {
    slots = [template[0], template[1], template[2], template[4], template[5]];
  } else if (meals === 7) {
    slots = [...template, { slot: 'shake_extra', type: 'shake', weight: 0.75 }];
  } else if (meals === 8) {
    slots = [...template, { slot: 'shake_extra', type: 'shake', weight: 0.75 }, { slot: 'shake_extra2', type: 'shake', weight: 0.70 }];
  } else {
    slots = [...template];
  }

  // pesos sólido/shake — garante que share seja respeitado
  const solidSlots = slots.filter(s => s.type === 'solid');
  const shakeSlots = slots.filter(s => s.type === 'shake');
  const solidTotalWeight = solidSlots.reduce((acc, s) => acc + s.weight, 0);
  const shakeTotalWeight = shakeSlots.reduce((acc, s) => acc + s.weight, 0);

  const solidKcal = totalKcal * solidShare;
  const shakeKcal = totalKcal * shakeShare;

  // tempos sugeridos (podem ser ajustados pelo utilizador)
  const times = buildMealTimes(meals, routine.trainTime);

  return slots.map((s, i) => {
    const isS = s.type === 'solid';
    const kcal = isS
      ? Math.round((s.weight / solidTotalWeight) * solidKcal)
      : Math.round((s.weight / shakeTotalWeight) * shakeKcal);
    return {
      slot: s.slot,
      type: s.type,
      kcal,
      time: times[i] || '',
    };
  });
}

function buildMealTimes(n, trainTime) {
  // horários padrão para 6 refeições
  const base6 = ['07:00', '10:00', '12:30', '15:30', '19:00', '22:00'];
  const base5 = ['07:30', '10:30', '13:00', '19:00', '22:00'];
  const base4 = ['08:00', '12:30', '19:00', '22:00'];
  const base7 = ['06:30', '09:30', '12:00', '15:00', '17:30', '20:00', '22:30'];
  const base8 = ['06:30', '09:00', '11:30', '14:00', '16:30', '19:00', '21:00', '23:00'];

  let times;
  if (n <= 4) times = [...base4];
  else if (n === 5) times = [...base5];
  else if (n === 7) times = [...base7];
  else if (n >= 8) times = [...base8];
  else times = [...base6];

  // ajuste simples conforme horário de treino
  // (não reescrevemos tudo — apenas mantemos o padrão Sistema Híbrido;
  // o utilizador adapta na prática conforme o ebook ensina)
  return times;
}

/* ---------- helpers ---------- */

function toKg(weight, unit) {
  const w = Number(weight);
  return unit === 'imperial' ? +(w * 0.453592).toFixed(1) : w;
}
function toCm(height, unit) {
  const h = Number(height);
  return unit === 'imperial' ? +(h * 2.54).toFixed(1) : h;
}

export function formatKcal(n) {
  return Math.round(n).toLocaleString('pt-PT').replace(/,/g, '.');
}
