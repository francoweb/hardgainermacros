/**
 * BASE DE DADOS NUTRICIONAL
 * =============================================================================
 * Valores por 100g ou 100ml baseados em fontes oficiais:
 * - USDA FoodData Central (USDA)
 * - Tabela Brasileira de Composição de Alimentos — TACO/UNICAMP (TACO)
 * - Tabela Portuguesa de Composição de Alimentos — INSA (INSA)
 * - Rótulos oficiais de fabricantes reconhecidos (rotulo)
 *
 * Para cada alimento existe:
 *  - per100: kcal, prot, carb, fat por 100g/100ml
 *  - unit: equivalência prática (ex: "unidade média" = 50g)
 *  - category: agrupamento lógico (protein / carb / fat / fruit / veg / dairy / extra)
 *  - substitutes: IDs de alimentos equivalentes na mesma função
 *  - digestibility: "leve" | "media" | "fibrosa" — importante para hardgainers
 *  - source: hierarquia da fonte
 * =============================================================================
 */

export const FOODS = {
  /* ============================== PROTEÍNAS ============================== */
  ovo_inteiro: {
    name: 'Ovo inteiro',
    category: 'protein',
    per100: { kcal: 143, prot: 12.6, carb: 0.7, fat: 9.5 },
    units: [
      { label: 'ovo', grams: 50 },
    ],
    digestibility: 'leve',
    substitutes: ['clara_ovo', 'peito_frango', 'iogurte_grego', 'tofu'],
    source: 'USDA',
  },
  clara_ovo: {
    name: 'Clara de ovo',
    category: 'protein',
    per100: { kcal: 52, prot: 10.9, carb: 0.7, fat: 0.2 },
    units: [{ label: 'unidade', grams: 33 }],
    digestibility: 'leve',
    substitutes: ['ovo_inteiro', 'whey', 'skyr', 'caseina'],
    source: 'USDA',
  },
  peito_frango: {
    name: 'Peito de frango grelhado',
    category: 'protein',
    per100: { kcal: 165, prot: 31, carb: 0, fat: 3.6 },
    units: [{ label: 'porção média', grams: 150 }],
    digestibility: 'leve',
    substitutes: ['peixe_tilapia', 'carne_moida', 'peixe_pescada', 'atum_agua', 'coxa_frango', 'peito_peru', 'alcatra_grelhada'],
    source: 'USDA',
  },
  carne_moida: {
    name: 'Carne moída (carne picada)',
    category: 'protein',
    per100: { kcal: 170, prot: 21.5, carb: 0, fat: 9 },
    units: [{ label: 'porção média', grams: 120 }],
    digestibility: 'media',
    substitutes: ['peito_frango', 'peixe_tilapia', 'peixe_salmao', 'alcatra_grelhada'],
    source: 'TACO',
  },
  peixe_tilapia: {
    name: 'Tilápia cozida',
    category: 'protein',
    per100: { kcal: 128, prot: 26, carb: 0, fat: 2.7 },
    units: [{ label: 'filé médio', grams: 130 }],
    digestibility: 'leve',
    substitutes: ['peixe_pescada', 'peito_frango', 'peixe_salmao', 'camarao', 'bacalhau_fresco'],
    source: 'USDA',
  },
  peixe_pescada: {
    name: 'Pescada cozida',
    category: 'protein',
    per100: { kcal: 105, prot: 21, carb: 0, fat: 2 },
    units: [{ label: 'filé médio', grams: 130 }],
    digestibility: 'leve',
    substitutes: ['peixe_tilapia', 'peito_frango', 'bacalhau_fresco', 'camarao'],
    source: 'INSA',
  },
  peixe_salmao: {
    name: 'Salmão cozido',
    category: 'protein',
    per100: { kcal: 206, prot: 22, carb: 0, fat: 12.5 },
    units: [{ label: 'filé médio', grams: 130 }],
    digestibility: 'media',
    substitutes: ['peixe_tilapia', 'carne_moida', 'atum_agua'],
    source: 'USDA',
  },
  atum_agua: {
    name: 'Atum em água',
    category: 'protein',
    per100: { kcal: 116, prot: 26, carb: 0, fat: 1 },
    units: [{ label: 'lata', grams: 120 }],
    digestibility: 'leve',
    substitutes: ['peito_frango', 'peixe_tilapia', 'camarao', 'peito_peru'],
    source: 'rotulo',
  },
  coxa_frango: {
    name: 'Coxa de frango sem pele grelhada',
    category: 'protein',
    per100: { kcal: 185, prot: 25, carb: 0, fat: 9 },
    units: [{ label: 'porção média', grams: 120 }],
    digestibility: 'leve',
    substitutes: ['peito_frango', 'peito_peru', 'alcatra_grelhada', 'peixe_tilapia'],
    source: 'USDA',
  },
  peito_peru: {
    name: 'Peito de peru grelhado',
    category: 'protein',
    per100: { kcal: 135, prot: 30, carb: 0, fat: 1 },
    units: [{ label: 'porção média', grams: 150 }],
    digestibility: 'leve',
    substitutes: ['peito_frango', 'coxa_frango', 'atum_agua', 'camarao', 'alcatra_grelhada'],
    source: 'USDA',
  },
  alcatra_grelhada: {
    name: 'Alcatra/patinho grelhado (carne magra)',
    category: 'protein',
    per100: { kcal: 180, prot: 28, carb: 0, fat: 7 },
    units: [{ label: 'porção média', grams: 120 }],
    digestibility: 'media',
    substitutes: ['peito_frango', 'carne_moida', 'coxa_frango'],
    source: 'USDA',
  },
  camarao: {
    name: 'Camarão cozido',
    category: 'protein',
    per100: { kcal: 99, prot: 24, carb: 0.2, fat: 0.3 },
    units: [{ label: 'porção média', grams: 150 }],
    digestibility: 'leve',
    substitutes: ['peixe_tilapia', 'peixe_pescada', 'bacalhau_fresco', 'atum_agua'],
    source: 'USDA',
  },
  bacalhau_fresco: {
    name: 'Bacalhau fresco cozido (cod)',
    category: 'protein',
    per100: { kcal: 105, prot: 23, carb: 0, fat: 0.9 },
    units: [{ label: 'posta média', grams: 130 }],
    digestibility: 'leve',
    substitutes: ['peixe_pescada', 'peixe_tilapia', 'camarao'],
    source: 'USDA',
  },
  whey: {
    name: 'Proteína whey',
    category: 'protein',
    per100: { kcal: 380, prot: 75, carb: 10, fat: 5 },
    units: [{ label: 'scoop', grams: 30, halfLabel: 'meio scoop', halfSuffix: ' e meio' }],
    digestibility: 'leve',
    substitutes: ['leite_po', 'iogurte_grego', 'caseina'],
    source: 'rotulo',
  },
  leite_integral: {
    name: 'Leite integral',
    category: 'dairy',
    per100: { kcal: 61, prot: 3.2, carb: 4.8, fat: 3.3 },
    units: [{ label: 'ml', grams: 1 }, { label: 'copo 200ml', grams: 200 }],
    digestibility: 'leve',
    substitutes: ['leite_lactose_free', 'bebida_aveia', 'bebida_amendoa'],
    source: 'USDA',
  },
  leite_lactose_free: {
    name: 'Leite sem lactose integral',
    category: 'dairy',
    per100: { kcal: 60, prot: 3.2, carb: 4.8, fat: 3.2 },
    units: [{ label: 'ml', grams: 1 }],
    digestibility: 'leve',
    substitutes: ['leite_integral', 'bebida_aveia'],
    source: 'rotulo',
  },
  bebida_aveia: {
    name: 'Bebida vegetal de aveia',
    category: 'dairy',
    per100: { kcal: 50, prot: 1, carb: 8, fat: 1.5 },
    units: [{ label: 'ml', grams: 1 }],
    digestibility: 'leve',
    substitutes: ['leite_integral', 'bebida_amendoa', 'leite_lactose_free'],
    source: 'rotulo',
  },
  bebida_amendoa: {
    name: 'Bebida vegetal de amêndoa',
    category: 'dairy',
    per100: { kcal: 30, prot: 1, carb: 3, fat: 1.5 },
    units: [{ label: 'ml', grams: 1 }],
    digestibility: 'leve',
    substitutes: ['leite_integral', 'bebida_aveia'],
    source: 'rotulo',
  },
  iogurte_natural: {
    name: 'Iogurte natural integral',
    category: 'dairy',
    per100: { kcal: 63, prot: 3.5, carb: 4.7, fat: 3.3 },
    units: [{ label: 'pote', grams: 170 }],
    digestibility: 'leve',
    substitutes: ['iogurte_grego', 'leite_integral', 'skyr'],
    source: 'USDA',
  },
  iogurte_grego: {
    name: 'Iogurte grego natural',
    category: 'dairy',
    per100: { kcal: 97, prot: 9, carb: 4, fat: 5 },
    units: [{ label: 'pote', grams: 170 }],
    digestibility: 'leve',
    substitutes: ['iogurte_natural', 'whey', 'skyr', 'queijo_cottage'],
    source: 'USDA',
  },
  queijo_mussarela: {
    name: 'Queijo mussarela',
    category: 'protein',
    per100: { kcal: 280, prot: 22, carb: 2.2, fat: 20 },
    units: [{ label: 'fatia', grams: 20 }],
    digestibility: 'media',
    substitutes: ['queijo_branco'],
    source: 'USDA',
  },
  queijo_branco: {
    name: 'Queijo branco (minas)',
    category: 'protein',
    per100: { kcal: 240, prot: 17, carb: 3, fat: 18 },
    units: [{ label: 'fatia', grams: 30 }],
    digestibility: 'leve',
    substitutes: ['queijo_mussarela', 'iogurte_grego', 'queijo_cottage'],
    source: 'TACO',
  },
  leite_po: {
    name: 'Leite em pó integral',
    category: 'dairy',
    per100: { kcal: 496, prot: 25, carb: 39, fat: 27 },
    units: [{ label: 'colher de sopa', grams: 15 }],
    digestibility: 'leve',
    substitutes: ['whey', 'leite_integral'],
    source: 'rotulo',
  },
  skyr: {
    name: 'Skyr natural',
    category: 'dairy',
    per100: { kcal: 63, prot: 11, carb: 4, fat: 0.2 },
    units: [{ label: 'pote', grams: 170 }],
    digestibility: 'leve',
    substitutes: ['iogurte_grego', 'queijo_cottage', 'caseina'],
    source: 'rotulo',
  },
  queijo_cottage: {
    name: 'Queijo cottage',
    category: 'dairy',
    per100: { kcal: 98, prot: 11, carb: 3.4, fat: 4.3 },
    units: [{ label: 'pote', grams: 200 }],
    digestibility: 'leve',
    substitutes: ['skyr', 'iogurte_grego', 'queijo_branco'],
    source: 'USDA',
  },
  caseina: {
    name: 'Proteína caseína',
    category: 'protein',
    per100: { kcal: 370, prot: 80, carb: 5, fat: 2 },
    units: [{ label: 'scoop', grams: 30, halfLabel: 'meio scoop', halfSuffix: ' e meio' }],
    digestibility: 'leve',
    substitutes: ['whey', 'skyr', 'iogurte_grego'],
    source: 'rotulo',
  },
  tofu: {
    name: 'Tofu firme',
    category: 'protein',
    per100: { kcal: 76, prot: 8, carb: 1.9, fat: 4.2 },
    units: [{ label: 'porção', grams: 150 }],
    digestibility: 'leve',
    substitutes: ['tempeh', 'ovo_inteiro', 'queijo_cottage'],
    source: 'USDA',
  },
  tempeh: {
    name: 'Tempeh',
    category: 'protein',
    per100: { kcal: 193, prot: 19, carb: 9, fat: 11 },
    units: [{ label: 'porção', grams: 100 }],
    digestibility: 'media',
    substitutes: ['tofu', 'peito_frango', 'ovo_inteiro'],
    source: 'USDA',
  },

  /* ============================== CARBOIDRATOS ============================== */
  arroz_branco_cozido: {
    name: 'Arroz branco cozido',
    category: 'carb',
    per100: { kcal: 130, prot: 2.7, carb: 28.2, fat: 0.3 },
    units: [{ label: 'xícara', grams: 160 }, { label: 'colher de sopa', grams: 25 }],
    digestibility: 'leve',
    substitutes: ['arroz_basmati_cozido', 'macarrao_cozido', 'batata_cozida', 'pure_batata', 'cuscuz', 'arroz_integral_cozido', 'arroz_jasmine_cozido', 'quinoa_cozida'],
    source: 'USDA',
  },
  arroz_basmati_cozido: {
    name: 'Arroz basmati cozido',
    category: 'carb',
    per100: { kcal: 121, prot: 3, carb: 25, fat: 0.4 },
    units: [{ label: 'xícara', grams: 160 }],
    digestibility: 'leve',
    substitutes: ['arroz_branco_cozido', 'macarrao_cozido', 'arroz_integral_cozido', 'arroz_jasmine_cozido', 'quinoa_cozida'],
    source: 'USDA',
  },
  macarrao_cozido: {
    name: 'Macarrão cozido (massa cozida)',
    category: 'carb',
    per100: { kcal: 157, prot: 5.8, carb: 30.9, fat: 0.9 },
    units: [{ label: 'xícara', grams: 140 }],
    digestibility: 'leve',
    substitutes: ['arroz_branco_cozido', 'cuscuz', 'pure_batata', 'quinoa_cozida'],
    source: 'USDA',
  },
  batata_cozida: {
    name: 'Batata inglesa cozida (batata branca simples)',
    category: 'carb',
    per100: { kcal: 87, prot: 1.9, carb: 20, fat: 0.1 },
    units: [
      { label: 'batata pequena', grams: 100 },
      { label: 'batata média', grams: 150 },
    ],
    countableUnit: true,
    digestibility: 'leve',
    substitutes: ['pure_batata', 'batata_doce_cozida', 'arroz_branco_cozido', 'cuscuz'],
    source: 'USDA',
  },
  pure_batata: {
    name: 'Purê de batata',
    category: 'carb',
    per100: { kcal: 110, prot: 1.9, carb: 16, fat: 4.2 },
    units: [{ label: 'colher de sopa', grams: 35 }],
    digestibility: 'leve',
    substitutes: ['batata_cozida', 'arroz_branco_cozido', 'polenta'],
    source: 'TACO',
  },
  batata_doce_cozida: {
    name: 'Batata doce cozida',
    category: 'carb',
    per100: { kcal: 86, prot: 1.6, carb: 20, fat: 0.1 },
    units: [
      { label: 'batata-doce pequena', grams: 100 },
      { label: 'batata-doce média', grams: 150 },
    ],
    countableUnit: true,
    digestibility: 'media',
    substitutes: ['batata_cozida', 'pure_batata', 'mandioca_cozida'],
    source: 'USDA',
  },
  mandioca_cozida: {
    name: 'Mandioca cozida',
    category: 'carb',
    per100: { kcal: 125, prot: 1, carb: 30, fat: 0.3 },
    units: [{ label: 'porção', grams: 120 }],
    digestibility: 'media',
    substitutes: ['batata_cozida', 'batata_doce_cozida'],
    source: 'TACO',
  },
  polenta: {
    name: 'Polenta cozida',
    category: 'carb',
    per100: { kcal: 85, prot: 2, carb: 18, fat: 0.5 },
    units: [{ label: 'porção', grams: 120 }],
    digestibility: 'leve',
    substitutes: ['pure_batata', 'arroz_branco_cozido'],
    source: 'TACO',
  },
  cuscuz: {
    name: 'Cuscuz de milho',
    category: 'carb',
    per100: { kcal: 113, prot: 2.3, carb: 25, fat: 0.3 },
    units: [{ label: 'porção', grams: 120 }],
    digestibility: 'leve',
    substitutes: ['arroz_branco_cozido', 'polenta', 'macarrao_cozido'],
    source: 'TACO',
  },
  tapioca: {
    name: 'Tapioca (goma hidratada)',
    category: 'carb',
    per100: { kcal: 240, prot: 0.2, carb: 60, fat: 0.1 },
    units: [{ label: 'colher de sopa', grams: 15 }],
    digestibility: 'leve',
    substitutes: ['pao_frances', 'pao_forma', 'wrap_tortilha'],
    source: 'TACO',
  },
  pao_frances: {
    name: 'Pão branco (pão francês)',
    category: 'carb',
    per100: { kcal: 300, prot: 8, carb: 58, fat: 3 },
    units: [{ label: 'unidade', grams: 50 }],
    digestibility: 'leve',
    substitutes: ['pao_forma', 'tapioca', 'bagel', 'wrap_tortilha'],
    source: 'TACO',
  },
  pao_forma: {
    name: 'Pão de forma branco',
    category: 'carb',
    per100: { kcal: 265, prot: 9, carb: 49, fat: 3.2 },
    units: [{ label: 'fatia', grams: 25 }],
    digestibility: 'leve',
    substitutes: ['pao_frances', 'tapioca', 'bagel', 'wrap_tortilha'],
    source: 'USDA',
  },
  aveia_flocos: {
    name: 'Flocos de aveia finos',
    category: 'carb',
    per100: { kcal: 389, prot: 16.9, carb: 66.3, fat: 6.9 },
    units: [{ label: 'colher de sopa', grams: 15 }],
    digestibility: 'media',
    substitutes: ['arroz_branco_cozido', 'pao_forma', 'creme_arroz'],
    source: 'USDA',
  },
  feijao_carioca: {
    name: 'Feijão carioca cozido',
    category: 'carb',
    per100: { kcal: 76, prot: 4.8, carb: 13.6, fat: 0.5 },
    units: [{ label: 'concha', grams: 80 }],
    digestibility: 'fibrosa',
    substitutes: ['lentilha_cozida'],
    source: 'TACO',
  },
  lentilha_cozida: {
    name: 'Lentilha cozida',
    category: 'carb',
    per100: { kcal: 93, prot: 6.3, carb: 16.3, fat: 0.5 },
    units: [{ label: 'concha', grams: 80 }],
    digestibility: 'media',
    substitutes: ['feijao_carioca'],
    source: 'TACO',
  },
  arroz_integral_cozido: {
    name: 'Arroz integral cozido',
    category: 'carb',
    per100: { kcal: 123, prot: 2.6, carb: 26, fat: 0.9 },
    units: [{ label: 'xícara', grams: 160 }, { label: 'colher de sopa', grams: 25 }],
    digestibility: 'media',
    substitutes: ['arroz_branco_cozido', 'arroz_basmati_cozido', 'arroz_jasmine_cozido', 'quinoa_cozida'],
    source: 'USDA',
  },
  arroz_jasmine_cozido: {
    name: 'Arroz jasmine cozido',
    category: 'carb',
    per100: { kcal: 125, prot: 2.7, carb: 27, fat: 0.3 },
    units: [{ label: 'xícara', grams: 160 }],
    digestibility: 'leve',
    substitutes: ['arroz_branco_cozido', 'arroz_basmati_cozido', 'arroz_integral_cozido'],
    source: 'USDA',
  },
  quinoa_cozida: {
    name: 'Quinoa cozida',
    category: 'carb',
    per100: { kcal: 120, prot: 4.4, carb: 22, fat: 1.9 },
    units: [{ label: 'xícara', grams: 160 }],
    digestibility: 'leve',
    substitutes: ['arroz_integral_cozido', 'arroz_branco_cozido', 'macarrao_cozido'],
    source: 'USDA',
  },
  creme_arroz: {
    name: 'Creme de arroz (cream of rice)',
    category: 'carb',
    per100: { kcal: 362, prot: 6.7, carb: 79, fat: 0.9 },
    units: [{ label: 'colher de sopa', grams: 35 }],
    digestibility: 'leve',
    substitutes: ['aveia_flocos', 'arroz_branco_cozido', 'arroz_basmati_cozido'],
    source: 'USDA',
  },
  bagel: {
    name: 'Bagel simples',
    category: 'carb',
    per100: { kcal: 272, prot: 10, carb: 53, fat: 1.5 },
    units: [{ label: 'unidade', grams: 98 }],
    countableUnit: true,
    digestibility: 'leve',
    substitutes: ['pao_frances', 'wrap_tortilha', 'pao_forma'],
    source: 'USDA',
  },
  wrap_tortilha: {
    name: 'Wrap / tortilha de trigo',
    category: 'carb',
    per100: { kcal: 306, prot: 8, carb: 53, fat: 7 },
    units: [{ label: 'unidade', grams: 65 }],
    countableUnit: true,
    digestibility: 'leve',
    substitutes: ['bagel', 'pao_frances', 'tapioca'],
    source: 'rotulo',
  },

  /* ============================== FRUTAS ============================== */
  banana_prata: {
    name: 'Banana madura',
    category: 'fruit',
    per100: { kcal: 98, prot: 1.3, carb: 26, fat: 0.1 },
    units: [
      { label: 'banana pequena', grams: 60 },
      { label: 'banana média', grams: 100 },
    ],
    countableUnit: true,
    digestibility: 'leve',
    substitutes: ['maca', 'manga', 'mamao', 'datil'],
    source: 'TACO',
  },
  maca: {
    name: 'Maçã sem casca',
    category: 'fruit',
    per100: { kcal: 56, prot: 0.3, carb: 15, fat: 0.2 },
    units: [
      { label: 'maçã pequena', grams: 60 },
      { label: 'maçã média', grams: 130 },
    ],
    countableUnit: true,
    digestibility: 'leve',
    substitutes: ['banana_prata', 'pera', 'manga'],
    source: 'TACO',
  },
  pera: {
    name: 'Pera',
    category: 'fruit',
    per100: { kcal: 53, prot: 0.3, carb: 14, fat: 0.1 },
    units: [
      { label: 'pera pequena', grams: 100 },
      { label: 'pera média', grams: 150 },
    ],
    countableUnit: true,
    digestibility: 'leve',
    substitutes: ['maca', 'manga'],
    source: 'USDA',
  },
  manga: {
    name: 'Manga',
    category: 'fruit',
    per100: { kcal: 60, prot: 0.8, carb: 15, fat: 0.4 },
    units: [
      { label: 'manga pequena', grams: 60 },
      { label: 'manga média', grams: 200 },
    ],
    countableUnit: true,
    digestibility: 'leve',
    substitutes: ['banana_prata', 'maca'],
    source: 'USDA',
  },
  mamao: {
    name: 'Mamão',
    category: 'fruit',
    per100: { kcal: 43, prot: 0.5, carb: 11, fat: 0.3 },
    units: [{ label: 'fatia', grams: 100 }],
    digestibility: 'leve',
    substitutes: ['banana_prata', 'manga'],
    source: 'USDA',
  },
  datil: {
    name: 'Tâmara seca',
    category: 'fruit',
    per100: { kcal: 282, prot: 2.5, carb: 75, fat: 0.4 },
    units: [{ label: 'unidade', grams: 8 }],
    countableUnit: true,
    digestibility: 'leve',
    substitutes: ['mel', 'banana_prata', 'maca'],
    source: 'USDA',
  },
  abacate: {
    name: 'Abacate',
    category: 'fat',
    per100: { kcal: 160, prot: 2, carb: 9, fat: 15 },
    units: [{ label: 'unidade pequena', grams: 150 }],
    digestibility: 'media',
    substitutes: ['pasta_amendoim', 'azeite', 'nozes', 'gema_ovo'],
    source: 'USDA',
  },

  /* ============================== GORDURAS ============================== */
  azeite: {
    name: 'Azeite de oliva',
    category: 'fat',
    per100: { kcal: 884, prot: 0, carb: 0, fat: 100 },
    units: [
      { label: 'colher de chá', grams: 5, maxCount: 1 },
      { label: 'colher de sopa', grams: 12 },
    ],
    countableUnit: true,
    digestibility: 'leve',
    substitutes: ['oleo_coco'],
    source: 'USDA',
  },
  oleo_coco: {
    name: 'Óleo de coco',
    category: 'fat',
    per100: { kcal: 892, prot: 0, carb: 0, fat: 99 },
    units: [{ label: 'colher de sopa', grams: 12 }],
    digestibility: 'leve',
    substitutes: ['azeite'],
    source: 'USDA',
  },
  pasta_amendoim: {
    name: 'Pasta de amendoim',
    category: 'fat',
    per100: { kcal: 588, prot: 25, carb: 20, fat: 50 },
    units: [
      { label: 'colher de chá', grams: 5, maxCount: 2 },
      { label: 'colher de sopa', grams: 16 },
    ],
    countableUnit: true,
    digestibility: 'media',
    substitutes: ['pasta_amendoa', 'pasta_castanha_caju', 'abacate', 'nozes'],
    source: 'USDA',
  },
  pasta_amendoa: {
    name: 'Pasta de amêndoa',
    category: 'fat',
    per100: { kcal: 614, prot: 21, carb: 19, fat: 55 },
    units: [
      { label: 'colher de chá', grams: 5, maxCount: 2 },
      { label: 'colher de sopa', grams: 16 },
    ],
    countableUnit: true,
    digestibility: 'media',
    substitutes: ['pasta_amendoim', 'pasta_castanha_caju'],
    source: 'USDA',
  },
  pasta_castanha_caju: {
    name: 'Pasta de castanha de caju',
    category: 'fat',
    per100: { kcal: 590, prot: 18, carb: 27, fat: 47 },
    units: [
      { label: 'colher de chá', grams: 5, maxCount: 2 },
      { label: 'colher de sopa', grams: 16 },
    ],
    countableUnit: true,
    digestibility: 'leve',
    substitutes: ['pasta_amendoim', 'pasta_amendoa'],
    source: 'USDA',
  },
  castanha_para: {
    name: 'Castanha do Pará',
    category: 'fat',
    per100: { kcal: 656, prot: 14, carb: 12, fat: 66 },
    units: [{ label: 'unidade', grams: 5 }],
    digestibility: 'media',
    substitutes: ['amendoa', 'pasta_amendoim', 'nozes'],
    source: 'USDA',
  },
  amendoa: {
    name: 'Amêndoas',
    category: 'fat',
    per100: { kcal: 579, prot: 21, carb: 22, fat: 50 },
    units: [{ label: 'unidade', grams: 1.2 }],
    digestibility: 'media',
    substitutes: ['castanha_para', 'pasta_amendoa', 'nozes'],
    source: 'USDA',
  },
  nozes: {
    name: 'Nozes',
    category: 'fat',
    per100: { kcal: 654, prot: 15, carb: 14, fat: 65 },
    units: [{ label: 'unidade', grams: 5 }],
    digestibility: 'media',
    substitutes: ['amendoa', 'castanha_para', 'pasta_amendoim'],
    source: 'USDA',
  },
  sementes_chia: {
    name: 'Sementes de chia',
    category: 'fat',
    per100: { kcal: 486, prot: 17, carb: 42, fat: 31 },
    units: [{ label: 'colher de sopa', grams: 12 }],
    digestibility: 'leve',
    substitutes: ['amendoa', 'pasta_amendoim'],
    source: 'USDA',
  },
  gema_ovo: {
    name: 'Gema de ovo',
    category: 'fat',
    per100: { kcal: 322, prot: 15.9, carb: 3.6, fat: 26.5 },
    units: [{ label: 'unidade', grams: 17 }],
    countableUnit: true,
    digestibility: 'leve',
    substitutes: ['azeite', 'abacate', 'pasta_amendoim'],
    source: 'USDA',
  },

  /* ============================== VEGETAIS ============================== */
  brocolis: {
    name: 'Brócolis cozido',
    category: 'veg',
    per100: { kcal: 35, prot: 2.4, carb: 7, fat: 0.4 },
    units: [{ label: 'porção', grams: 80 }],
    digestibility: 'media',
    substitutes: ['abobrinha', 'cenoura'],
    source: 'USDA',
  },
  abobrinha: {
    name: 'Abobrinha cozida (curgete)',
    category: 'veg',
    per100: { kcal: 17, prot: 1.2, carb: 3.1, fat: 0.3 },
    units: [{ label: 'porção', grams: 100 }],
    digestibility: 'leve',
    substitutes: ['brocolis', 'cenoura'],
    source: 'USDA',
  },
  cenoura: {
    name: 'Cenoura cozida',
    category: 'veg',
    per100: { kcal: 35, prot: 0.8, carb: 8.2, fat: 0.2 },
    units: [{ label: 'porção', grams: 80 }],
    digestibility: 'leve',
    substitutes: ['abobrinha', 'brocolis'],
    source: 'USDA',
  },
  salada_mista: {
    name: 'Salada (alface, tomate)',
    category: 'veg',
    per100: { kcal: 17, prot: 1, carb: 3, fat: 0.2 },
    units: [{ label: 'prato', grams: 100 }],
    digestibility: 'leve',
    substitutes: ['brocolis', 'abobrinha'],
    source: 'TACO',
  },

  /* ============================== EXTRAS ============================== */
  mel: {
    name: 'Mel',
    category: 'extra',
    per100: { kcal: 304, prot: 0.3, carb: 82, fat: 0 },
    units: [
      { label: 'colher de chá',       grams: 7,  maxCount: 2 },
      { label: 'colher de sobremesa', grams: 10, maxCount: 2 },
      { label: 'colher de sopa',      grams: 20 },
    ],
    countableUnit: true,
    digestibility: 'leve',
    substitutes: ['acucar_mascavo', 'datil'],
    source: 'USDA',
  },
  acucar_mascavo: {
    name: 'Açúcar mascavo',
    category: 'extra',
    per100: { kcal: 377, prot: 0, carb: 97, fat: 0 },
    units: [{ label: 'colher de sopa', grams: 12 }],
    digestibility: 'leve',
    substitutes: ['mel'],
    source: 'TACO',
  },
  cacau_po: {
    name: 'Cacau em pó',
    category: 'extra',
    per100: { kcal: 228, prot: 20, carb: 58, fat: 14 },
    units: [
      { label: 'colher de chá', grams: 4, maxCount: 1 },
      { label: 'colher de sopa', grams: 8 },
    ],
    countableUnit: true,
    digestibility: 'leve',
    substitutes: [],
    source: 'USDA',
  },
  canela: {
    name: 'Canela em pó',
    category: 'extra',
    per100: { kcal: 247, prot: 4, carb: 81, fat: 1.2 },
    units: [{ label: 'pitada', grams: 1 }],
    digestibility: 'leve',
    substitutes: [],
    source: 'USDA',
  },
  molho_tomate: {
    name: 'Molho de tomate simples',
    category: 'extra',
    per100: { kcal: 32, prot: 1.3, carb: 7, fat: 0.2 },
    units: [{ label: 'colher de sopa', grams: 20 }],
    digestibility: 'leve',
    substitutes: [],
    source: 'USDA',
  },
};

/**
 * Procura o alimento pelo id, retorna o objeto completo.
 */
export function getFood(id) {
  return FOODS[id] || null;
}

/**
 * Calcula os macros para uma quantidade específica (em gramas ou ml).
 * Retorna { kcal, prot, carb, fat } arredondados.
 */
export function calcFoodMacros(foodId, grams) {
  const f = FOODS[foodId];
  if (!f) return { kcal: 0, prot: 0, carb: 0, fat: 0 };
  const factor = grams / 100;
  return {
    kcal: Math.round(f.per100.kcal * factor),
    prot: Math.round(f.per100.prot * factor * 10) / 10,
    carb: Math.round(f.per100.carb * factor * 10) / 10,
    fat: Math.round(f.per100.fat * factor * 10) / 10,
  };
}

/**
 * Retorna lista de substitutos válidos para um alimento,
 * com quantidade equivalente para manter calorias aproximadas.
 */
export function getSubstitutes(foodId, targetGrams) {
  const original = FOODS[foodId];
  if (!original) return [];
  const targetKcal = (original.per100.kcal * targetGrams) / 100;

  return (original.substitutes || [])
    .map(subId => {
      const sub = FOODS[subId];
      if (!sub) return null;
      // quantidade para manter ~ as mesmas calorias
      // grams = (targetKcal / kcalPer100g) * 100
      const equivGrams = (targetKcal / sub.per100.kcal) * 100;
      // arredonda para múltiplo de 5g, com mínimo de 5g
      const roundedGrams = Math.max(5, Math.round(equivGrams / 5) * 5);
      return {
        id: subId,
        food: sub,
        grams: roundedGrams,
        macros: calcFoodMacros(subId, roundedGrams),
      };
    })
    .filter(Boolean);
}

/**
 * Formata uma quantidade em gramas para exibição amigável
 * usando a unidade mais prática (ex: "2 colheres de sopa" em vez de "40g").
 */
export function formatQty(foodId, grams) {
  const f = FOODS[foodId];
  if (!f || !f.units || !f.units.length) return `${grams}g`;

  // Para líquidos (dairy) mostramos em ml
  const isLiquid = f.category === 'dairy';
  if (isLiquid) {
    return `${Math.round(grams)} ml`;
  }

  // Para alimentos contáveis (frutas, tubérculos): escolhe a unidade que
  // minimiza fracções impráticas, preferindo contagem inteira ≥ 1.
  if (f.countableUnit) {
    const candidates = f.units.filter(u => {
      if (u.label === 'ml' || u.label === 'g') return false;
      const c = grams / u.grams;
      const max = u.maxCount || 12;
      return c >= 0.5 && c <= max;
    });
    if (candidates.length) {
      const best = candidates.reduce((b, u) => {
        const cU = grams / u.grams;
        const rU = Math.round(cU);          // inteiro — sem fracções
        const sU = 10 + (cU >= 1 ? 5 : 0) - Math.abs(cU - rU);
        const cB = grams / b.grams;
        const rB = Math.round(cB);
        const sB = 10 + (cB >= 1 ? 5 : 0) - Math.abs(cB - rB);
        if (sU > sB) return u;
        if (sU === sB) return rU < rB ? u : b; // empate: menor contagem (mais simples)
        return b;
      });
      const count = grams / best.grams;
      const rounded = Math.round(count);    // sempre inteiro
      const actualG = Math.round(grams);
      const exactG  = rounded * best.grams;
      const gramsStr = actualG === exactG ? `${actualG}g` : `~${actualG}g`;
      return `${rounded} ${pluralize(best.label, rounded)} (${gramsStr})`;
    }
  }

  // Pega a unidade mais adequada (que dê quantidade inteira próxima)
  for (const u of f.units) {
    if (u.label === 'ml' || u.label === 'g') continue;
    const count = grams / u.grams;
    if (count >= 0.5 && count <= 12) {
      const rounded = Math.round(count * 2) / 2; // arredonda para 0.5
      // Metades com linguagem humana (ex: "meio scoop", "1 scoop e meio")
      if (rounded % 1 !== 0 && u.halfLabel) {
        const whole = Math.floor(rounded);
        const display = whole === 0
          ? u.halfLabel
          : `${whole} ${pluralize(u.label, whole)}${u.halfSuffix || ' e meio'}`;
        return `${display} (${Math.round(grams)}g)`;
      }
      const display = rounded % 1 === 0 ? rounded : rounded.toFixed(1);
      return `${display} ${pluralize(u.label, rounded)} (${Math.round(grams)}g)`;
    }
  }
  return `${Math.round(grams)}g`;
}

function pluralize(label, count) {
  if (count <= 1) return label;
  // Labels compostos com código de tamanho legado (ex: "unidade P", "unidade M")
  // — mantém o código, pluraliza só a primeira parte
  if (/\s[A-Z]$/.test(label)) {
    const idx = label.lastIndexOf(' ');
    return pluralize(label.slice(0, idx), count) + label.slice(idx);
  }
  // Compostos preposicionais (ex: "colher de sopa", "colher de chá")
  // — só pluraliza a palavra antes da preposição
  if (label.includes(' ')) {
    const prepMatch = label.match(/^(\S+)(\s+d[eoa]\s.+)$/);
    if (prepMatch) return pluralize(prepMatch[1], count) + prepMatch[2];
  }
  // Labels descritivos multi-palavra (ex: "banana pequena", "batata média")
  // — pluraliza cada palavra individualmente
  if (label.includes(' ')) {
    return label.split(' ').map(w => pluralize(w, count)).join(' ');
  }
  // pluralização simples em PT
  if (label.endsWith('ão')) return label.slice(0, -2) + 'ões';
  if (label.endsWith('ia') || label.endsWith('ade') || label.endsWith('de') || label.endsWith('ade'))
    return label + 's';
  if (label.endsWith('r')) return label + 'es';  // colher → colheres
  if (label.endsWith('a') || label.endsWith('e') || label.endsWith('o')) return label + 's';
  if (label.endsWith('l')) return label.slice(0, -1) + 'is';
  return label + 's';
}
