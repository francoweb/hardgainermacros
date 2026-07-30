/**
 * BIBLIOTECA DE RECEITAS ESCALÁVEIS — Sprint R2
 * =============================================================================
 * Receitas completas para substituir refeições automáticas do plano de 14 dias.
 *
 * Cada receita escala as quantidades dos seus ingredientes para encaixar
 * nas calorias/macros da refeição-alvo (implementado na Sprint R3).
 *
 * Estrutura de cada receita:
 *  - id:              identificador único
 *  - name:            nome exibido ao utilizador
 *  - description:     descrição curta
 *  - type:            'solid' | 'shake'
 *  - suggestedSlots:  slots do plano onde faz sentido usar esta receita
 *  - baseKcal:        calorias totais com as quantidades padrão (calculado)
 *  - ingredients:     lista de ingredientes com limites práticos
 *  - steps:           passos de preparo (visíveis ao utilizador)
 *  - note:            observação prática
 *
 * Estrutura de cada ingrediente:
 *  - foodId:          ID compatível com FOODS (ver foods.js)
 *  - name:            nome exibido no ingrediente
 *  - defaultGrams:    quantidade padrão da receita
 *  - minGrams:        mínimo prático (0 = removível)
 *  - maxGrams:        máximo prático (evita quantidades absurdas)
 *  - removable:       true = utilizador pode remover este ingrediente
 *  - essential:       true = receita não faz sentido sem ele
 *  - scalePriority:   1 = primeiro a escalar · 2 = secundário · 3 = fixo
 *
 * baseKcal calculado pela fórmula: Σ (defaultGrams × per100.kcal / 100)
 * usando os valores de FOODS[foodId].per100.kcal.
 * =============================================================================
 */

export const RECIPES = [

  /* ── 1. Omelete de frango anabólica ──────────────────────────────────── */
  // baseKcal: ovo(150g×1.43) + frango(100g×1.65) + queijo(30g×2.40) + azeite(10g×8.84) = 540 kcal
  {
    id: 'omelete_frango',
    name: 'Omelete de frango anabólica',
    description: 'Omelete proteica com frango desfiado e queijo — prática e saborosa.',
    imageSrc: '/assets/images/recipes/omelete_frango.webp',
    imageAlt: 'Omelete de frango anabólica pronta para servir',
    type: 'solid',
    suggestedSlots: ['breakfast', 'lunch', 'dinner'],
    baseKcal: 540,
    ingredients: [
      {
        foodId:        'ovo_inteiro',
        name:          'Ovos inteiros',
        defaultGrams:  150,   // ≈ 3 ovos médios
        minGrams:      50,    // mínimo 1 ovo
        maxGrams:      250,   // máximo 5 ovos
        removable:     false,
        essential:     true,
        scalePriority: 1,
      },
      {
        foodId:        'peito_frango',
        name:          'Peito de frango',
        defaultGrams:  100,
        minGrams:      50,
        maxGrams:      200,
        removable:     false,
        essential:     true,
        scalePriority: 1,
      },
      {
        foodId:        'queijo_branco',
        name:          'Queijo branco',
        defaultGrams:  30,
        minGrams:      0,     // removível
        maxGrams:      60,
        removable:     true,
        essential:     false,
        scalePriority: 2,
      },
      {
        foodId:        'azeite',
        name:          'Azeite de oliva',
        defaultGrams:  10,
        minGrams:      5,
        maxGrams:      20,
        removable:     false,
        essential:     false,
        scalePriority: 3,
      },
    ],
    steps: [
      'Cozinhe e desfie o frango com antecedência (pode usar sobra do almoço).',
      'Bata os ovos em tigela com uma pitada de sal e pimenta.',
      'Aqueça a frigideira com o azeite em fogo médio.',
      'Despeje os ovos batidos e adicione o frango desfiado por cima.',
      'Quando a omelete firmar nas bordas, dobre ao meio.',
      'Adicione o queijo por cima ou derreta dentro antes de dobrar.',
    ],
    note: 'Remover o queijo reduz as calorias mas a omelete fica mais leve. Ideal para quem tem dificuldade com laticínios.',
  },

  /* ── 2. Panqueca de banana com whey ─────────────────────────────────── */
  // baseKcal: banana(100g×0.98) + ovo(100g×1.43) + whey(30g×3.80) + aveia(30g×3.89) + canela(2g×2.47) = 475 kcal
  {
    id: 'panqueca_banana_whey',
    name: 'Panqueca de banana com whey',
    description: 'Panqueca rápida, naturalmente doce e rica em proteína.',
    imageSrc: '/assets/images/recipes/panqueca_banana_whey.webp',
    imageAlt: 'Panqueca de banana com whey pronta para servir',
    type: 'solid',
    suggestedSlots: ['breakfast', 'shake_morning', 'shake_afternoon'],
    baseKcal: 475,
    ingredients: [
      {
        foodId:        'banana_prata',
        name:          'Banana madura',
        defaultGrams:  100,   // ≈ 1 banana média
        minGrams:      60,
        maxGrams:      200,
        removable:     false,
        essential:     true,
        scalePriority: 1,
      },
      {
        foodId:        'ovo_inteiro',
        name:          'Ovos inteiros',
        defaultGrams:  100,   // ≈ 2 ovos médios
        minGrams:      50,
        maxGrams:      200,
        removable:     false,
        essential:     true,
        scalePriority: 1,
      },
      {
        foodId:        'whey',
        name:          'Proteína whey',
        defaultGrams:  30,    // 1 scoop
        minGrams:      15,    // meio scoop
        maxGrams:      60,    // 2 scoops
        removable:     false,
        essential:     true,
        scalePriority: 1,
      },
      {
        foodId:        'aveia_flocos',
        name:          'Flocos de aveia',
        defaultGrams:  30,
        minGrams:      0,     // removível
        maxGrams:      60,
        removable:     true,
        essential:     false,
        scalePriority: 2,
      },
      {
        foodId:        'canela',
        name:          'Canela em pó',
        defaultGrams:  2,
        minGrams:      0,     // removível
        maxGrams:      5,
        removable:     true,
        essential:     false,
        scalePriority: 4,     // não participa na escala calórica
      },
    ],
    steps: [
      'Amasse a banana num prato fundo até obter uma pasta.',
      'Adicione os ovos e misture bem.',
      'Junte o whey, a aveia e a canela e mexa até homogeneizar.',
      'Aqueça frigideira antiaderente em fogo médio (sem óleo ou com mínimo).',
      'Despeje porções pequenas e cozinhe até borbulhar por cima. Vire e termine.',
    ],
    note: 'A aveia deixa a panqueca mais grossa. Sem aveia, a massa fica mais fina e rápida de fazer.',
  },

  /* ── 3. Arroz com frango e azeite ───────────────────────────────────── */
  // baseKcal: arroz(200g×1.30) + frango(120g×1.65) + azeite(10g×8.84) + brocolis(80g×0.35) = 575 kcal
  {
    id: 'arroz_frango_azeite',
    name: 'Arroz com frango e azeite',
    description: 'Refeição clássica e equilibrada — base do plano para almoço e jantar.',
    imageSrc: '/assets/images/recipes/arroz_frango_azeite.webp',
    imageAlt: 'Arroz com frango e azeite pronto para servir',
    type: 'solid',
    suggestedSlots: ['lunch', 'dinner', 'shake_afternoon'],
    baseKcal: 575,
    ingredients: [
      {
        foodId:        'arroz_branco_cozido',
        name:          'Arroz branco',
        defaultGrams:  200,
        minGrams:      80,
        maxGrams:      400,
        removable:     false,
        essential:     true,
        scalePriority: 1,
      },
      {
        foodId:        'peito_frango',
        name:          'Peito de frango',
        defaultGrams:  120,
        minGrams:      80,
        maxGrams:      250,
        removable:     false,
        essential:     true,
        scalePriority: 1,
      },
      {
        foodId:        'azeite',
        name:          'Azeite de oliva',
        defaultGrams:  10,
        minGrams:      5,
        maxGrams:      20,
        removable:     false,
        essential:     false,
        scalePriority: 3,
      },
      {
        foodId:        'brocolis',
        name:          'Brócolis',
        defaultGrams:  80,
        minGrams:      0,     // removível
        maxGrams:      150,
        removable:     true,
        essential:     false,
        scalePriority: 4,     // vegetais não participam na escala calórica
      },
    ],
    steps: [
      'Tempere e grelhe o frango até dourar por ambos os lados.',
      'Cozinhe o arroz branco ao ponto.',
      'Cozinhe o brócolis no vapor ou água até ficar macio.',
      'Monte o prato: arroz, frango fatiado, brócolis.',
      'Regue com o azeite por cima antes de servir.',
    ],
    note: 'O arroz é o principal ajuste de calorias. Se as calorias da refeição forem altas, a porção de arroz aumenta.',
  },

  /* ── 4. Massa com carne moída ───────────────────────────────────────── */
  // baseKcal: macarrao(200g×1.57) + carne(100g×1.70) + molho(80g×0.32) + azeite(10g×8.84) = 598 kcal
  {
    id: 'massa_carne_moida',
    name: 'Massa com carne moída',
    description: 'Macarrão com molho de carne moída — calórico, prático e saboroso.',
    imageSrc: '/assets/images/recipes/massa_carne_moida.webp',
    imageAlt: 'Massa com carne moída pronta para servir',
    type: 'solid',
    suggestedSlots: ['lunch', 'dinner', 'shake_afternoon'],
    baseKcal: 598,
    ingredients: [
      {
        foodId:        'macarrao_cozido',
        name:          'Macarrão',
        defaultGrams:  200,
        minGrams:      80,
        maxGrams:      400,
        removable:     false,
        essential:     true,
        scalePriority: 1,
      },
      {
        foodId:        'carne_moida',
        name:          'Carne moída',
        defaultGrams:  100,
        minGrams:      50,
        maxGrams:      200,
        removable:     false,
        essential:     true,
        scalePriority: 1,
      },
      {
        foodId:        'molho_tomate',
        name:          'Molho de tomate',
        defaultGrams:  80,
        minGrams:      0,     // removível
        maxGrams:      150,
        removable:     true,
        essential:     false,
        scalePriority: 2,
      },
      {
        foodId:        'azeite',
        name:          'Azeite de oliva',
        defaultGrams:  10,
        minGrams:      0,     // removível
        maxGrams:      20,
        removable:     true,
        essential:     false,
        scalePriority: 3,
      },
    ],
    steps: [
      'Cozinhe o macarrão al dente conforme indicação da embalagem.',
      'Refogue a carne moída em frigideira com um fio de azeite até dourar.',
      'Adicione o molho de tomate à carne e deixe apurar por 5 minutos.',
      'Escorra o macarrão, misture com o molho e sirva.',
    ],
    note: 'O macarrão cozido pesa mais do que o seco. As quantidades já estão em peso cozido.',
  },

  /* ── 5. Shake hardgainer de banana, whey e pasta de amendoim ────────── */
  // baseKcal: leite(300g×0.61) + banana(100g×0.98) + whey(30g×3.80) + pasta(30g×5.88) + aveia(30g×3.89) = 688 kcal
  {
    id: 'shake_hardgainer',
    name: 'Shake hardgainer',
    description: 'Shake calórico com banana, whey e pasta de amendoim — ideal para superar o superávit.',
    imageSrc: '/assets/images/recipes/shake_hardgainer.webp',
    imageAlt: 'Shake hardgainer pronto para beber',
    type: 'shake',
    suggestedSlots: ['shake_morning', 'shake_afternoon', 'shake_night'],
    baseKcal: 688,
    ingredients: [
      {
        foodId:        'leite_integral',
        name:          'Leite integral',
        defaultGrams:  300,   // 300 ml
        minGrams:      150,
        maxGrams:      500,
        removable:     false,
        essential:     true,
        scalePriority: 1,
      },
      {
        foodId:        'banana_prata',
        name:          'Banana madura',
        defaultGrams:  100,
        minGrams:      60,
        maxGrams:      200,
        removable:     false,
        essential:     true,
        scalePriority: 1,
      },
      {
        foodId:        'whey',
        name:          'Proteína whey',
        defaultGrams:  30,
        minGrams:      15,
        maxGrams:      60,
        removable:     false,
        essential:     true,
        scalePriority: 1,
      },
      {
        foodId:        'pasta_amendoim',
        name:          'Pasta de amendoim',
        defaultGrams:  30,
        minGrams:      15,
        maxGrams:      60,
        removable:     false,
        essential:     true,
        scalePriority: 2,
      },
      {
        foodId:        'aveia_flocos',
        name:          'Flocos de aveia',
        defaultGrams:  30,
        minGrams:      0,     // removível
        maxGrams:      60,
        removable:     true,
        essential:     false,
        scalePriority: 2,
      },
    ],
    steps: [
      'Coloque todos os ingredientes no liquidificador.',
      'Bata por 30 a 60 segundos até homogeneizar.',
      'Sirva imediatamente para manter a textura.',
    ],
    note: 'A aveia engrossa o shake e adiciona carboidratos. Sem aveia, o shake fica mais fluido e rápido de beber.',
  },

];
