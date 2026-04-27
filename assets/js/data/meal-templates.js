/**
 * TEMPLATES DE REFEIÇÕES
 * =============================================================================
 * Cada template é uma refeição "base" (receita + proporções relativas).
 * Ao gerar o plano de 14 dias, escalamos as quantidades para atingir a meta
 * calórica alvo de cada slot de refeição.
 *
 * Estrutura:
 *  - id: identificador único
 *  - name: nome da refeição
 *  - slot: "breakfast" | "shake_morning" | "lunch" | "shake_afternoon" | "dinner" | "shake_night"
 *  - type: "solid" | "shake"
 *  - baseKcal: calorias de referência da receita no ebook
 *  - items: lista de ingredientes (foodId + grams base)
 *  - steps: passos de preparo
 *  - note: observação digestiva/prática
 *  - profileTags: perfis para os quais esta receita é especialmente boa
 *       ("classico", "apetite_baixo", "ultra_acelerado", "volume_baixo",
 *        "rotina_corrida", "falta_consistencia", "falso_magro")
 * =============================================================================
 */

export const MEAL_TEMPLATES = {

  /* ========== CAFÉ DA MANHÃ (solid) ========== */
  cafe_classico: {
    id: 'cafe_classico',
    name: 'Café da Manhã Anabólico Clássico',
    slot: 'breakfast',
    type: 'solid',
    baseKcal: 680,
    items: [
      { food: 'ovo_inteiro', grams: 150, label: '3 ovos inteiros (mexidos)' },
      { food: 'pao_frances', grams: 100, label: 'Pão francês branco' },
      { food: 'banana_prata', grams: 100, label: 'Banana prata média (madura)' },
      { food: 'pasta_amendoim', grams: 16, label: 'Pasta de amendoim' },
      { food: 'leite_integral', grams: 200, label: 'Leite integral' },
    ],
    steps: [
      'Bata ou mexa os ovos e prepare uma omelete simples.',
      'Torre o pão se desejar.',
      'Passe a pasta de amendoim no pão.',
      'Corte a banana em rodelas.',
      'Sirva tudo junto com o leite (pode adicionar café).',
    ],
    note: 'Se preferir, substitua os ovos por omelete simples. O pão branco digere mais rápido que o integral.',
    profileTags: ['classico', 'apetite_baixo', 'rotina_corrida'],
  },
  cafe_tapioca: {
    id: 'cafe_tapioca',
    name: 'Tapioca Recheada com Ovos e Queijo',
    slot: 'breakfast',
    type: 'solid',
    baseKcal: 620,
    items: [
      { food: 'tapioca', grams: 50, label: 'Tapioca (goma hidratada)' },
      { food: 'ovo_inteiro', grams: 100, label: '2 ovos inteiros' },
      { food: 'queijo_branco', grams: 30, label: 'Queijo branco' },
      { food: 'banana_prata', grams: 100, label: 'Banana prata' },
      { food: 'leite_integral', grams: 200, label: 'Leite integral' },
    ],
    steps: [
      'Prepare a tapioca numa frigideira antiaderente.',
      'Mexa os ovos e recheie a tapioca com ovos e queijo.',
      'Sirva com a banana e o leite.',
    ],
    note: 'Tapioca digere muito bem — ótima opção para quem sente peso com pão.',
    profileTags: ['ultra_acelerado', 'volume_baixo', 'falso_magro'],
  },
  cafe_aveia: {
    id: 'cafe_aveia',
    name: 'Mingau Anabólico de Aveia',
    slot: 'breakfast',
    type: 'solid',
    baseKcal: 640,
    items: [
      { food: 'aveia_flocos', grams: 60, label: 'Aveia em flocos finos' },
      { food: 'leite_integral', grams: 300, label: 'Leite integral' },
      { food: 'banana_prata', grams: 100, label: 'Banana prata' },
      { food: 'pasta_amendoim', grams: 16, label: 'Pasta de amendoim' },
      { food: 'mel', grams: 20, label: 'Mel' },
    ],
    steps: [
      'Aqueça o leite e adicione a aveia.',
      'Cozinhe em fogo baixo por 3-4 minutos mexendo.',
      'Adicione banana cortada, pasta de amendoim e mel.',
      'Mexa bem e sirva morno.',
    ],
    note: 'Reduza a quantidade de aveia se sentir estufamento — troque por pão branco.',
    profileTags: ['classico', 'apetite_baixo'],
  },
  cafe_pao_ovo: {
    id: 'cafe_pao_ovo',
    name: 'Pão Francês com Ovos e Queijo',
    slot: 'breakfast',
    type: 'solid',
    baseKcal: 650,
    items: [
      { food: 'pao_frances', grams: 100, label: 'Pão francês' },
      { food: 'ovo_inteiro', grams: 100, label: '2 ovos inteiros' },
      { food: 'queijo_branco', grams: 30, label: 'Queijo branco' },
      { food: 'maca', grams: 130, label: 'Maçã' },
      { food: 'leite_integral', grams: 200, label: 'Leite integral' },
    ],
    steps: [
      'Mexa os ovos na frigideira.',
      'Monte o pão com os ovos e o queijo.',
      'Sirva com a maçã e o leite.',
    ],
    note: 'Um café clássico, leve e rápido de preparar.',
    profileTags: ['rotina_corrida', 'falta_consistencia'],
  },
  cafe_iogurte: {
    id: 'cafe_iogurte',
    name: 'Bowl de Iogurte Grego com Frutas',
    slot: 'breakfast',
    type: 'solid',
    baseKcal: 600,
    items: [
      { food: 'iogurte_grego', grams: 200, label: 'Iogurte grego natural' },
      { food: 'aveia_flocos', grams: 30, label: 'Aveia em flocos finos' },
      { food: 'banana_prata', grams: 100, label: 'Banana prata' },
      { food: 'pasta_amendoim', grams: 16, label: 'Pasta de amendoim' },
      { food: 'mel', grams: 20, label: 'Mel' },
    ],
    steps: [
      'Coloque o iogurte numa tigela.',
      'Adicione aveia, banana em rodelas e pasta de amendoim.',
      'Finalize com mel por cima.',
    ],
    note: 'Opção refrescante — ótima em dias quentes.',
    profileTags: ['ultra_acelerado', 'falso_magro'],
  },

  /* ========== SHAKE MEIO DA MANHÃ ========== */
  shake_bomba: {
    id: 'shake_bomba',
    name: 'Shake Bomba Calórica',
    slot: 'shake_morning',
    type: 'shake',
    baseKcal: 520,
    items: [
      { food: 'leite_integral', grams: 300, label: 'Leite integral' },
      { food: 'banana_prata', grams: 120, label: 'Banana prata madura' },
      { food: 'aveia_flocos', grams: 30, label: 'Aveia em flocos finos' },
      { food: 'mel', grams: 20, label: 'Mel' },
      { food: 'whey', grams: 30, label: 'Whey protein (1 scoop)' },
    ],
    steps: [
      'Coloque todos os ingredientes no liquidificador.',
      'Bata por 30 segundos até ficar cremoso.',
      'Consuma imediatamente.',
    ],
    note: 'A aveia fina mistura melhor. Se estiver muito grosso, adicione mais leite.',
    profileTags: ['classico', 'apetite_baixo', 'ultra_acelerado', 'volume_baixo'],
  },
  shake_choco_banana: {
    id: 'shake_choco_banana',
    name: 'Shake Choco-Banana',
    slot: 'shake_morning',
    type: 'shake',
    baseKcal: 500,
    items: [
      { food: 'leite_integral', grams: 300, label: 'Leite integral' },
      { food: 'banana_prata', grams: 120, label: 'Banana prata' },
      { food: 'cacau_po', grams: 8, label: 'Cacau em pó' },
      { food: 'pasta_amendoim', grams: 16, label: 'Pasta de amendoim' },
      { food: 'whey', grams: 30, label: 'Whey (1 scoop)' },
      { food: 'mel', grams: 14, label: 'Mel' },
    ],
    steps: [
      'Bata tudo no liquidificador por 30 segundos.',
      'Sirva gelado.',
    ],
    note: 'Sabor de chocolate que disfarça totalmente a whey.',
    profileTags: ['apetite_baixo', 'volume_baixo'],
  },

  /* ========== ALMOÇO ========== */
  almoco_frango: {
    id: 'almoco_frango',
    name: 'Almoço Completo Frango',
    slot: 'lunch',
    type: 'solid',
    baseKcal: 720,
    items: [
      { food: 'peito_frango', grams: 150, label: 'Peito de frango grelhado' },
      { food: 'arroz_branco_cozido', grams: 150, label: 'Arroz branco cozido' },
      { food: 'batata_cozida', grams: 120, label: 'Batata inglesa cozida' },
      { food: 'feijao_carioca', grams: 80, label: 'Feijão carioca cozido' },
      { food: 'salada_mista', grams: 100, label: 'Salada (alface, tomate)' },
      { food: 'azeite', grams: 9, label: 'Azeite de oliva' },
    ],
    steps: [
      'Tempere e grelhe o frango (alho, sal, pimenta).',
      'Cozinhe o arroz branco com alho picado e azeite.',
      'Cozinhe a batata em água fervente até macia.',
      'Aqueça o feijão.',
      'Finalize a salada com azeite.',
    ],
    note: 'O arroz basmati digere mais facilmente. A batata pode ser substituída por purê.',
    profileTags: ['classico', 'rotina_corrida'],
  },
  almoco_carne: {
    id: 'almoco_carne',
    name: 'Almoço Power com Carne Moída',
    slot: 'lunch',
    type: 'solid',
    baseKcal: 740,
    items: [
      { food: 'carne_moida', grams: 150, label: 'Carne moída magra (patinho)' },
      { food: 'arroz_branco_cozido', grams: 150, label: 'Arroz branco cozido' },
      { food: 'pure_batata', grams: 120, label: 'Purê de batata' },
      { food: 'abobrinha', grams: 100, label: 'Abobrinha refogada' },
      { food: 'azeite', grams: 9, label: 'Azeite de oliva' },
    ],
    steps: [
      'Refogue a carne moída com alho, cebola e tomate.',
      'Prepare o arroz branco.',
      'Faça o purê de batata com leite e manteiga.',
      'Refogue a abobrinha com azeite.',
    ],
    note: 'Purê de batata é excelente para quem sente peso com feijão.',
    profileTags: ['volume_baixo', 'ultra_acelerado', 'falso_magro'],
  },
  almoco_peixe: {
    id: 'almoco_peixe',
    name: 'Almoço Leve com Tilápia',
    slot: 'lunch',
    type: 'solid',
    baseKcal: 700,
    items: [
      { food: 'peixe_tilapia', grams: 160, label: 'Tilápia grelhada' },
      { food: 'arroz_branco_cozido', grams: 150, label: 'Arroz branco' },
      { food: 'batata_doce_cozida', grams: 150, label: 'Batata doce cozida' },
      { food: 'brocolis', grams: 80, label: 'Brócolis cozido' },
      { food: 'azeite', grams: 12, label: 'Azeite de oliva' },
    ],
    steps: [
      'Tempere o peixe com limão, sal e alho.',
      'Grelhe em frigideira antiaderente.',
      'Cozinhe o arroz e a batata doce.',
      'Cozinhe o brócolis no vapor.',
      'Finalize com azeite.',
    ],
    note: 'Tilápia é leve e digere muito bem — boa opção no calor.',
    profileTags: ['ultra_acelerado', 'falso_magro'],
  },
  almoco_macarrao: {
    id: 'almoco_macarrao',
    name: 'Macarrão ao Sugo com Frango',
    slot: 'lunch',
    type: 'solid',
    baseKcal: 750,
    items: [
      { food: 'macarrao_cozido', grams: 200, label: 'Macarrão cozido al dente' },
      { food: 'peito_frango', grams: 140, label: 'Peito de frango em cubos' },
      { food: 'molho_tomate', grams: 60, label: 'Molho de tomate simples' },
      { food: 'salada_mista', grams: 100, label: 'Salada (alface, tomate)' },
      { food: 'azeite', grams: 9, label: 'Azeite de oliva' },
    ],
    steps: [
      'Cozinhe o macarrão al dente em água salgada.',
      'Grelhe o frango em cubos com temperos.',
      'Misture o frango com molho de tomate.',
      'Sirva sobre o macarrão e acompanhe a salada.',
    ],
    note: 'Macarrão tradicional digere melhor do que o integral — perfeito para hardgainers.',
    profileTags: ['classico', 'apetite_baixo', 'volume_baixo'],
  },
  almoco_cuscuz: {
    id: 'almoco_cuscuz',
    name: 'Cuscuz com Frango Desfiado',
    slot: 'lunch',
    type: 'solid',
    baseKcal: 710,
    items: [
      { food: 'cuscuz', grams: 180, label: 'Cuscuz de milho' },
      { food: 'peito_frango', grams: 140, label: 'Peito de frango desfiado' },
      { food: 'ovo_inteiro', grams: 50, label: 'Ovo cozido' },
      { food: 'salada_mista', grams: 100, label: 'Salada mista' },
      { food: 'azeite', grams: 9, label: 'Azeite de oliva' },
    ],
    steps: [
      'Prepare o cuscuz conforme a embalagem.',
      'Desfie o frango grelhado e tempere.',
      'Monte o prato com cuscuz, frango e ovo cozido.',
      'Finalize com salada e azeite.',
    ],
    note: 'Opção prática para levar em marmita. Ótimo para rotinas corridas.',
    profileTags: ['rotina_corrida', 'falta_consistencia'],
  },

  /* ========== SHAKE MEIO DA TARDE ========== */
  shake_energia: {
    id: 'shake_energia',
    name: 'Shake Energia Instantânea',
    slot: 'shake_afternoon',
    type: 'shake',
    baseKcal: 485,
    items: [
      { food: 'leite_integral', grams: 250, label: 'Leite integral' },
      { food: 'abacate', grams: 60, label: '½ abacate pequeno' },
      { food: 'maca', grams: 130, label: 'Maçã sem casca' },
      { food: 'pasta_amendoim', grams: 16, label: 'Pasta de amendoim' },
      { food: 'mel', grams: 7, label: 'Mel (1 colher de chá)' },
    ],
    steps: [
      'Corte o abacate e a maçã em pedaços.',
      'Bata tudo no liquidificador com gelo se desejar.',
    ],
    note: 'O abacate adiciona calorias sem volume ou sabor pesado. Ótima energia sustentada.',
    profileTags: ['ultra_acelerado', 'volume_baixo', 'falso_magro'],
  },
  shake_manga: {
    id: 'shake_manga',
    name: 'Shake Tropical de Manga',
    slot: 'shake_afternoon',
    type: 'shake',
    baseKcal: 500,
    items: [
      { food: 'leite_integral', grams: 250, label: 'Leite integral' },
      { food: 'manga', grams: 150, label: 'Manga madura' },
      { food: 'aveia_flocos', grams: 25, label: 'Aveia fina' },
      { food: 'pasta_amendoa', grams: 16, label: 'Pasta de amêndoa' },
      { food: 'whey', grams: 20, label: 'Whey (meio scoop)' },
    ],
    steps: [
      'Corte a manga em pedaços.',
      'Bata tudo no liquidificador por 30 segundos.',
    ],
    note: 'Shake refrescante — perfeito para tardes quentes.',
    profileTags: ['classico', 'apetite_baixo'],
  },

  /* ========== JANTAR ========== */
  jantar_macarrao_carne: {
    id: 'jantar_macarrao_carne',
    name: 'Jantar Macarrão com Carne',
    slot: 'dinner',
    type: 'solid',
    baseKcal: 650,
    items: [
      { food: 'carne_moida', grams: 130, label: 'Carne moída magra' },
      { food: 'macarrao_cozido', grams: 180, label: 'Macarrão cozido' },
      { food: 'molho_tomate', grams: 60, label: 'Molho de tomate' },
      { food: 'brocolis', grams: 80, label: 'Legumes cozidos (brócolis, abobrinha)' },
      { food: 'azeite', grams: 9, label: 'Azeite de oliva' },
    ],
    steps: [
      'Refogue a carne moída com alho e cebola.',
      'Misture com o molho de tomate.',
      'Cozinhe o macarrão al dente.',
      'Cozinhe os legumes no vapor.',
      'Sirva tudo junto e finalize com azeite.',
    ],
    note: 'Macarrão tradicional digere bem à noite. Evite molhos muito gordurosos.',
    profileTags: ['classico', 'apetite_baixo'],
  },
  jantar_frango_arroz: {
    id: 'jantar_frango_arroz',
    name: 'Frango com Arroz e Legumes',
    slot: 'dinner',
    type: 'solid',
    baseKcal: 640,
    items: [
      { food: 'peito_frango', grams: 150, label: 'Peito de frango grelhado' },
      { food: 'arroz_branco_cozido', grams: 150, label: 'Arroz branco' },
      { food: 'abobrinha', grams: 100, label: 'Abobrinha refogada' },
      { food: 'azeite', grams: 12, label: 'Azeite de oliva' },
    ],
    steps: [
      'Grelhe o frango temperado.',
      'Prepare o arroz branco com alho.',
      'Refogue a abobrinha em fatias finas com azeite.',
      'Monte o prato.',
    ],
    note: 'Jantar clássico, leve e nutritivo — não pesa na digestão.',
    profileTags: ['ultra_acelerado', 'rotina_corrida', 'falso_magro'],
  },
  jantar_peixe_pure: {
    id: 'jantar_peixe_pure',
    name: 'Peixe Grelhado com Purê',
    slot: 'dinner',
    type: 'solid',
    baseKcal: 620,
    items: [
      { food: 'peixe_pescada', grams: 170, label: 'Pescada grelhada' },
      { food: 'pure_batata', grams: 200, label: 'Purê de batata' },
      { food: 'salada_mista', grams: 100, label: 'Salada mista' },
      { food: 'azeite', grams: 12, label: 'Azeite de oliva' },
    ],
    steps: [
      'Tempere o peixe com limão, sal e ervas.',
      'Grelhe em frigideira antiaderente.',
      'Prepare o purê cremoso com leite e manteiga.',
      'Monte o prato com a salada ao lado.',
    ],
    note: 'Jantar extremamente leve — recomendado se sente peso à noite.',
    profileTags: ['volume_baixo', 'falso_magro', 'ultra_acelerado'],
  },
  jantar_omelete: {
    id: 'jantar_omelete',
    name: 'Omelete Reforçada com Pão',
    slot: 'dinner',
    type: 'solid',
    baseKcal: 600,
    items: [
      { food: 'ovo_inteiro', grams: 150, label: '3 ovos inteiros' },
      { food: 'queijo_branco', grams: 40, label: 'Queijo branco' },
      { food: 'pao_frances', grams: 100, label: 'Pão francês' },
      { food: 'salada_mista', grams: 80, label: 'Salada mista' },
      { food: 'azeite', grams: 9, label: 'Azeite de oliva' },
    ],
    steps: [
      'Bata os ovos com sal e pimenta.',
      'Prepare a omelete com o queijo.',
      'Sirva com o pão francês e a salada.',
    ],
    note: 'Solução perfeita quando "não dá tempo" de preparar algo elaborado.',
    profileTags: ['rotina_corrida', 'falta_consistencia'],
  },
  jantar_frango_batata: {
    id: 'jantar_frango_batata',
    name: 'Frango com Batata Doce',
    slot: 'dinner',
    type: 'solid',
    baseKcal: 660,
    items: [
      { food: 'peito_frango', grams: 160, label: 'Peito de frango grelhado' },
      { food: 'batata_doce_cozida', grams: 200, label: 'Batata doce cozida' },
      { food: 'brocolis', grams: 80, label: 'Brócolis' },
      { food: 'azeite', grams: 12, label: 'Azeite de oliva' },
    ],
    steps: [
      'Grelhe o frango com temperos.',
      'Cozinhe a batata doce em pedaços.',
      'Cozinhe o brócolis no vapor.',
      'Finalize com azeite.',
    ],
    note: 'Jantar clean e muito nutritivo — boa opção pós-treino à noite.',
    profileTags: ['falso_magro', 'ultra_acelerado'],
  },

  /* ========== SHAKE CEIA ========== */
  shake_noturno: {
    id: 'shake_noturno',
    name: 'Shake do Crescimento Noturno',
    slot: 'shake_night',
    type: 'shake',
    baseKcal: 475,
    items: [
      { food: 'leite_integral', grams: 280, label: 'Leite integral morno' },
      { food: 'aveia_flocos', grams: 40, label: 'Aveia em flocos finos' },
      { food: 'cacau_po', grams: 8, label: 'Cacau em pó' },
      { food: 'mel', grams: 20, label: 'Mel (1 colher de sopa)' },
      { food: 'canela', grams: 2, label: 'Canela em pó' },
    ],
    steps: [
      'Aqueça o leite sem ferver.',
      'Misture todos os ingredientes no liquidificador.',
      'Bata até dissolver e consuma morno.',
    ],
    note: 'O leite morno ajuda a relaxar o sono. Pode adicionar whey casein se tiver.',
    profileTags: ['classico', 'apetite_baixo', 'ultra_acelerado'],
  },
  shake_proteico_noite: {
    id: 'shake_proteico_noite',
    name: 'Shake Proteico da Ceia',
    slot: 'shake_night',
    type: 'shake',
    baseKcal: 460,
    items: [
      { food: 'leite_integral', grams: 250, label: 'Leite integral' },
      { food: 'iogurte_grego', grams: 100, label: 'Iogurte grego' },
      { food: 'whey', grams: 30, label: 'Whey (1 scoop)' },
      { food: 'banana_prata', grams: 80, label: 'Banana pequena' },
      { food: 'pasta_amendoim', grams: 14, label: 'Pasta de amendoim' },
    ],
    steps: [
      'Bata tudo no liquidificador até ficar cremoso.',
      'Consuma cerca de 1h antes de dormir.',
    ],
    note: 'Alta dose de proteína para recuperação muscular noturna.',
    profileTags: ['classico', 'volume_baixo', 'falso_magro'],
  },
};

/**
 * Retorna templates disponíveis para um slot específico.
 */
export function getTemplatesForSlot(slot) {
  return Object.values(MEAL_TEMPLATES).filter(t => t.slot === slot);
}

/**
 * Seleciona templates priorizados para um dado perfil.
 * Ordem: perfis que mais casam primeiro, depois os restantes.
 */
export function rankTemplatesByProfile(slot, profile) {
  const templates = getTemplatesForSlot(slot);
  return templates.sort((a, b) => {
    const aMatch = a.profileTags.includes(profile) ? 1 : 0;
    const bMatch = b.profileTags.includes(profile) ? 1 : 0;
    return bMatch - aMatch;
  });
}
