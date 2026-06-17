/**
 * faqs.js — Perguntas frequentes da Hardgainer Macros
 *
 * REGRA: Se uma dúvida comum surgir repetidamente no suporte, adicione
 * uma entrada aqui com linguagem clara e útil para o usuário.
 * Português do Brasil neutro, simples e sem linguagem técnica desnecessária.
 * Sem prometer resultado garantido. Em dúvidas de saúde, sugerir profissional.
 *
 * Campos obrigatórios: id, category, question, answer, keywords
 * Ordenação: por categoria (mantida pelo agrupamento na página)
 */

export const FAQS = [
  // ── Começando ─────────────────────────────────────────────────────────
  {
    id: 'como-funciona',
    category: 'Começando',
    question: 'Como funciona a app?',
    answer:
      'Você informa seus dados — peso, altura, idade, objetivo e rotina de refeições. A app usa essas informações para calcular quantas calorias você precisa por dia e gera um plano alimentar de 14 dias com alimentos práticos e variados.\n\nExemplo: se você tem 23 anos, pesa 70 kg e tem dificuldade em ganhar peso, a app pode calcular que você precisa de cerca de 2.600 kcal por dia. Esse total é dividido em 5 ou 6 refeições ao longo do dia — com alimentos como frango, arroz, ovos, aveia, batata e shakes de proteína.\n\nDepois de gerar o plano, você pode ajustar à vontade: mudar a quantidade de um alimento, trocar por outro que prefira, criar alimentos com os valores da embalagem do produto que você usa, remover o que não gosta e salvar o plano em PDF.\n\nNão precisa criar conta — tudo funciona direto no navegador, sem instalar nada.',
    keywords: ['começar', 'funciona', 'conta', 'como usar', 'exemplo'],
  },
  {
    id: 'preciso-criar-conta',
    category: 'Começando',
    question: 'Preciso criar conta para usar?',
    answer:
      'Não. A app não exige cadastro nem login. Seus dados ficam salvos no seu próprio navegador, sem necessidade de criar perfil ou senha.',
    keywords: ['conta', 'cadastro', 'login', 'senha'],
  },
  {
    id: 'o-que-e-hardgainer',
    category: 'Começando',
    question: 'O que é um hardgainer?',
    answer:
      'Hardgainer é o termo usado para pessoas que têm dificuldade em ganhar peso e massa muscular mesmo comendo bastante. A app foi desenvolvida especificamente para ajudar esse perfil a estruturar a alimentação de forma prática.',
    keywords: ['hardgainer', 'ectomorfo', 'ganhar peso', 'dificuldade'],
  },
  {
    id: 'o-que-e-plano-14-dias',
    category: 'Começando',
    question: 'O que é o plano de 14 dias?',
    answer:
      'O plano de 14 dias é um cardápio completo gerado automaticamente com base nas suas calorias e macros. Ele distribui as refeições ao longo do dia, variando os alimentos para tornar a dieta mais prática e sustentável.',
    keywords: ['plano', '14 dias', 'cardápio', 'refeições'],
  },
  {
    id: 'funciona-no-celular',
    category: 'Começando',
    question: 'Posso usar a app no celular?',
    answer:
      'Sim. A app funciona em qualquer dispositivo com navegador — celular, tablet ou computador. O design foi pensado para funcionar bem em telas pequenas.',
    keywords: ['celular', 'mobile', 'tablet', 'funciona no celular'],
  },

  // ── Plano alimentar ───────────────────────────────────────────────────
  {
    id: 'dias-diferentes',
    category: 'Plano alimentar',
    question: 'Por que os dias do plano são diferentes entre si?',
    answer:
      'A app varia os alimentos entre os dias para tornar a alimentação menos repetitiva e mais fácil de manter no longo prazo. Mesmo variando, todos os dias mantêm os valores calóricos e de macros próximos da sua meta.',
    keywords: ['dias', 'variação', 'repetitivo', 'diferentes'],
  },
  {
    id: 'seguir-sem-mudar',
    category: 'Plano alimentar',
    question: 'Posso seguir o plano sem mudar nada?',
    answer:
      'Sim. O plano já foi gerado para o seu perfil e pode ser seguido como está. Qualquer edição é opcional — use o botão "Editar" apenas se quiser ajustar algum alimento ao produto que você usa no dia a dia.',
    keywords: ['seguir', 'sem editar', 'usar como está'],
  },
  {
    id: 'solidas-e-shakes',
    category: 'Plano alimentar',
    question: 'O que são refeições sólidas e shakes?',
    answer:
      'Refeições sólidas são aquelas com alimentos mastigáveis (arroz, frango, ovo, etc.). Shakes são bebidas proteicas preparadas com pó de proteína e outros ingredientes. A proporção entre os dois depende da estratégia que você escolheu ao configurar seu perfil.',
    keywords: ['sólidas', 'shakes', 'proteína', 'híbrido', 'refeição'],
  },
  {
    id: 'total-calorias-diferente',
    category: 'Plano alimentar',
    question: 'Por que o total de calorias do dia é ligeiramente diferente da minha meta?',
    answer:
      'Alimentos reais não encaixam sempre em números exatos. Uma diferença de 20 a 50 kcal por dia é normal e não prejudica seus resultados. O importante é manter a consistência ao longo da semana.',
    keywords: ['total', 'calorias', 'diferença', 'meta', 'arredondamento'],
  },

  // ── Macros e calorias ─────────────────────────────────────────────────
  {
    id: 'o-que-sao-macros',
    category: 'Macros e calorias',
    question: 'O que são macros?',
    answer:
      'Macros é a abreviação de macronutrientes: proteína, carboidratos e gorduras. São os três principais componentes dos alimentos e determinam como o seu corpo usa a energia que você consome.',
    keywords: ['macros', 'macronutrientes', 'proteína', 'carboidrato', 'gordura'],
  },
  {
    id: 'valores-diferentes-rotulo',
    category: 'Macros e calorias',
    question: 'Por que os valores nutricionais podem ser diferentes do rótulo?',
    answer:
      'Os valores da app são referências gerais baseadas em tabelas nutricionais. Cada marca, receita e forma de preparo pode ter valores ligeiramente diferentes. Se quiser mais precisão, use o botão "Editar" e ajuste os valores de acordo com a embalagem do produto que você usa.',
    keywords: ['rótulo', 'valores', 'diferente', 'marca', 'editar', 'preparo', 'embalagem'],
  },
  {
    id: 'superavit-calorico',
    category: 'Macros e calorias',
    question: 'O que é superávit calórico?',
    answer:
      'Superávit calórico significa comer mais calorias do que o seu corpo gasta. Para quem tem dificuldade em ganhar peso, esse excedente é necessário para o corpo ter energia suficiente para crescer.',
    keywords: ['superávit', 'calorias', 'ganhar peso', 'energia'],
  },
  {
    id: 'quantidade-certa',
    category: 'Macros e calorias',
    question: 'Como sei se estou comendo a quantidade certa?',
    answer:
      'A app calculou sua meta com base no seu perfil. Enquanto você seguir o plano de forma consistente, estará dentro do alvo. Se quiser monitorar com mais detalhe, use o botão "Editar" para ajustar os valores aos alimentos que você usa no dia a dia.',
    keywords: ['quantidade', 'certa', 'meta', 'monitorar'],
  },

  // ── Alimentos e personalização ────────────────────────────────────────
  {
    id: 'editar-quantidade',
    category: 'Alimentos e personalização',
    question: 'Como edito a quantidade de um alimento?',
    answer:
      'No plano, clique no ícone de lápis ao lado do alimento. Uma janela vai abrir com o campo de gramas. Altere a quantidade e clique em "Salvar". Os valores de calorias e macros são atualizados automaticamente.',
    keywords: ['editar', 'quantidade', 'gramas', 'lápis', 'salvar'],
  },
  {
    id: 'editar-macros-manual',
    category: 'Alimentos e personalização',
    question: 'Como edito os macros de um alimento manualmente?',
    answer:
      'Ao clicar no ícone de edição de um alimento, além do campo de gramas, você verá campos editáveis para calorias, proteína, carboidratos e gorduras. Altere os valores conforme a embalagem do seu produto e clique em "Salvar".',
    keywords: ['editar', 'macros', 'calorias', 'proteína', 'carboidratos', 'gorduras', 'rótulo', 'manual', 'embalagem'],
  },
  {
    id: 'reverter-edicao',
    category: 'Alimentos e personalização',
    question: 'Como reverter uma edição de alimento?',
    answer:
      'Após editar, um botão "Reverter" aparece ao lado do alimento. Clique nele para restaurar os valores originais da app.',
    keywords: ['reverter', 'desfazer', 'original', 'restaurar'],
  },
  {
    id: 'criar-alimento',
    category: 'Alimentos e personalização',
    question: 'Como criar um alimento personalizado?',
    answer:
      'Em qualquer refeição do plano, clique em "+ Criar Alimento". Preencha o nome, a quantidade e os valores nutricionais do produto. O alimento será adicionado àquela refeição e ficará salvo no seu navegador.',
    keywords: ['criar', 'alimento personalizado', 'adicionar', 'refeição'],
  },
  {
    id: 'adicionar-biblioteca',
    category: 'Alimentos e personalização',
    question: 'Como adicionar um alimento da biblioteca ao plano?',
    answer:
      'Em qualquer refeição, clique em "+ Adicionar Alimento". Uma lista com os alimentos disponíveis na app vai abrir. Clique em "Adicionar" ao lado do alimento desejado.',
    keywords: ['adicionar', 'biblioteca', 'alimento', 'lista'],
  },
  {
    id: 'remover-alimento',
    category: 'Alimentos e personalização',
    question: 'Como remover um alimento do plano?',
    answer:
      'Clique no ícone de remoção ao lado do alimento. Ele ficará marcado como removido, mas você pode restaurá-lo a qualquer momento clicando em "Restaurar".',
    keywords: ['remover', 'apagar', 'excluir', 'restaurar'],
  },
  {
    id: 'alimento-criado-substituicao',
    category: 'Alimentos e personalização',
    question: 'O alimento que criei aparece como opção de substituição?',
    answer:
      'Sim. Alimentos criados por você podem aparecer como opções de substituição dentro da mesma categoria de alimentos.',
    keywords: ['criado', 'personalizado', 'substituição', 'lista'],
  },

  // ── Substituições ─────────────────────────────────────────────────────
  {
    id: 'como-substituir',
    category: 'Substituições',
    question: 'Como substituir um alimento por outro?',
    answer:
      'Clique no ícone de substituição ao lado do alimento. Uma lista de alternativas da mesma categoria vai abrir, com o impacto calórico de cada troca. Clique no alimento que preferir para aplicar a substituição.',
    keywords: ['substituir', 'trocar', 'alternativa', 'ingrediente'],
  },
  {
    id: 'substituicao-afeta-dias',
    category: 'Substituições',
    question: 'A substituição afeta todos os dias do plano?',
    answer:
      'Não. Cada substituição afeta apenas o ingrediente daquele dia e daquela refeição específica. Os outros dias permanecem com o ingrediente original.',
    keywords: ['substituição', 'dias', 'afeta', 'todos', 'isolado'],
  },
  {
    id: 'desfazer-substituicao',
    category: 'Substituições',
    question: 'Como desfazer uma substituição?',
    answer:
      'Clique no botão "Reverter" que aparece ao lado do ingrediente substituído. O alimento original será restaurado.',
    keywords: ['desfazer', 'reverter', 'substituição', 'original'],
  },

  // ── PDF e impressão ───────────────────────────────────────────────────
  {
    id: 'como-salvar-pdf',
    category: 'PDF e impressão',
    question: 'Como salvar ou imprimir o plano?',
    answer:
      'No topo do plano, use os botões "PDF Compacto" para uma versão resumida ou "Imprimir Plano Completo" para a versão detalhada. O navegador abrirá a janela de impressão, onde você pode salvar como PDF ou imprimir diretamente.',
    keywords: ['PDF', 'imprimir', 'salvar', 'plano', 'impressão'],
  },
  {
    id: 'pdf-reflete-edicoes',
    category: 'PDF e impressão',
    question: 'O PDF inclui os alimentos que editei ou adicionei?',
    answer:
      'Sim. O PDF e a impressão refletem todas as personalizações que você fez — alimentos editados, adicionados, substituídos e removidos.',
    keywords: ['PDF', 'edição', 'personalização', 'reflete', 'imprime', 'impressão'],
  },

  // ── Usando no dia a dia ───────────────────────────────────────────────
  {
    id: 'usar-balanca',
    category: 'Usando no dia a dia',
    question: 'Tenho que pesar cada alimento com balança?',
    answer:
      'Não é obrigatório. O plano usa quantidades práticas que você pode estimar. A balança ajuda se quiser mais precisão, mas não é exigida.',
    keywords: ['balança', 'pesar', 'medir'],
  },
  {
    id: 'mesmas-quantidades',
    category: 'Usando no dia a dia',
    question: 'Preciso comer exatamente as mesmas quantidades todos os dias?',
    answer:
      'Não. Pequenas variações são normais e não prejudicam os resultados. O que mais importa é manter uma rotina consistente ao longo da semana.',
    keywords: ['quantidade', 'exato', 'variar'],
  },
  {
    id: 'repetir-refeicoes',
    category: 'Usando no dia a dia',
    question: 'Posso repetir as mesmas refeições todos os dias?',
    answer:
      'Sim. Se preferir simplicidade, escolha as refeições que mais gosta e repita. O plano tem variação para tornar a alimentação menos monótona, mas repetir também funciona.',
    keywords: ['repetir', 'mesmo', 'todos os dias'],
  },
  {
    id: 'usar-sem-complicar',
    category: 'Usando no dia a dia',
    question: 'Como usar a app no dia a dia sem complicar?',
    answer:
      'Gere o plano, salve em PDF e siga as refeições como referência. Use "Editar" só quando o alimento que você tem em casa for diferente do sugerido.',
    keywords: ['dia a dia', 'simples', 'rotina'],
  },
  {
    id: 'ajustar-ao-viajar',
    category: 'Usando no dia a dia',
    question: 'Como ajustar o plano quando viajar ou sair da rotina?',
    answer:
      'Tente manter o total de calorias próximo com o que estiver disponível. Uma refeição fora do plano não desfaz o progresso. A consistência ao longo das semanas é o que mais conta.',
    keywords: ['viajar', 'rotina', 'sair'],
  },
  {
    id: 'fins-de-semana',
    category: 'Usando no dia a dia',
    question: 'Posso adaptar o plano nos fins de semana?',
    answer:
      'Sim. Você pode usar refeições mais flexíveis aos fins de semana, desde que o total de calorias e proteína fique próximo da meta.',
    keywords: ['fim de semana', 'adaptar', 'flexível'],
  },

  // ── Nutrição para hardgainers ─────────────────────────────────────────
  {
    id: 'peso-nao-sobe',
    category: 'Nutrição para hardgainers',
    question: 'Por que meu peso não está subindo mesmo seguindo o plano?',
    answer:
      'Pode ser que você esteja comendo um pouco menos do que parece, ou que seu corpo gaste mais energia do que o estimado. Tente seguir as quantidades com mais atenção por 2 a 3 semanas. Se o peso continuar parado, consulte um nutricionista.',
    keywords: ['peso parado', 'não sobe', 'estagnado'],
  },
  {
    id: 'tempo-resultados',
    category: 'Nutrição para hardgainers',
    question: 'Quanto tempo demora para ver resultados?',
    answer:
      'Em geral, os primeiros sinais aparecem em 4 a 8 semanas de consistência. O ganho muscular é lento por natureza. Não espere ver diferença em poucos dias.',
    keywords: ['resultado', 'tempo', 'semanas'],
  },
  {
    id: 'nao-consegue-comer-tudo',
    category: 'Nutrição para hardgainers',
    question: 'O que fazer se não conseguir comer tudo no dia?',
    answer:
      'Foque nas refeições mais calóricas e nas fontes de proteína. Com o tempo o apetite tende a aumentar.',
    keywords: ['não consegue comer', 'apetite', 'volume'],
  },
  {
    id: 'dificuldade-digestao',
    category: 'Nutrição para hardgainers',
    question: 'O que fazer se ficar com dificuldade de digestão?',
    answer:
      'Reduza o volume de uma refeição e distribua melhor ao longo do dia. Prefira alimentos mais fáceis de digerir. Se o desconforto persistir, consulte um profissional de saúde.',
    keywords: ['digestão', 'cheio', 'desconforto'],
  },
  {
    id: 'suplementos',
    category: 'Nutrição para hardgainers',
    question: 'Devo tomar suplementos para ganhar peso?',
    answer:
      'A alimentação é a base. Proteína em pó pode ajudar a atingir a meta, mas não é obrigatória. Consulte um nutricionista antes de incluir qualquer suplemento.',
    keywords: ['suplemento', 'whey', 'proteína em pó'],
  },
  {
    id: 'gramas-proteina',
    category: 'Nutrição para hardgainers',
    question: 'Quantas gramas de proteína eu preciso por dia?',
    answer:
      'A app calcula isso com base no seu peso e perfil. Em geral, quem tem dificuldade em ganhar peso se beneficia de 1,6 a 2,5g de proteína por kg de peso corporal por dia.',
    keywords: ['proteína', 'gramas', 'quantidade'],
  },
  {
    id: 'ganho-peso-musculo',
    category: 'Nutrição para hardgainers',
    question: 'O ganho de peso é sempre músculo?',
    answer:
      'Não. O ganho de peso inclui músculo, gordura e água. Com treino e alimentação adequada, a tendência é ganhar mais músculo e menos gordura ao longo do tempo.',
    keywords: ['músculo', 'gordura', 'peso'],
  },
  {
    id: 'retencao-liquidos',
    category: 'Nutrição para hardgainers',
    question: 'O que é retenção de líquidos?',
    answer:
      'É o acúmulo temporário de água no corpo, que pode fazer o peso variar sem relação com gordura ou músculo. É comum após dias com mais sal ou carboidratos.',
    keywords: ['retenção', 'líquidos', 'água', 'peso'],
  },
  {
    id: 'precisa-treinar',
    category: 'Nutrição para hardgainers',
    question: 'Preciso treinar para a app funcionar?',
    answer:
      'A app gera um plano independentemente de treino. Mas para ganhar músculo, o treino é fundamental — a alimentação sozinha não constrói músculo sem o estímulo do exercício.',
    keywords: ['treinar', 'academia', 'exercício'],
  },
  {
    id: 'o-que-e-consistencia',
    category: 'Nutrição para hardgainers',
    question: 'O que é consistência e por que ela importa?',
    answer:
      'Consistência é manter a alimentação próxima do plano ao longo de semanas e meses. Um dia perfeito não muda nada; 30 dias com boa rotina sim. É o fator mais importante para quem tem dificuldade em ganhar peso.',
    keywords: ['consistência', 'hábito', 'rotina'],
  },
  {
    id: 'contar-calorias',
    category: 'Nutrição para hardgainers',
    question: 'Devo contar calorias no final do dia?',
    answer:
      'Não é obrigatório. O plano já foi calculado para atingir a meta. Se seguir as refeições propostas, já estará próximo do alvo.',
    keywords: ['contar calorias', 'acompanhar'],
  },
  {
    id: 'adaptar-sem-alimento',
    category: 'Nutrição para hardgainers',
    question: 'Como adaptar as refeições quando não tenho o alimento sugerido?',
    answer:
      'Use "Substituir" para trocar por um equivalente, ou "Editar" para ajustar as quantidades ao que você tem. Manter a categoria do alimento — proteína, carboidrato ou gordura — é o mais importante.',
    keywords: ['substituir', 'adaptar', 'sem alimento'],
  },
  {
    id: 'substitui-nutricionista',
    category: 'Nutrição para hardgainers',
    question: 'A app substitui um nutricionista?',
    answer:
      'Não. A app é uma calculadora de apoio para organizar a alimentação. Para dúvidas de saúde, condições especiais ou acompanhamento personalizado, um nutricionista é insubstituível.',
    keywords: ['nutricionista', 'profissional', 'saúde'],
  },
  {
    id: 'duvida-saude',
    category: 'Nutrição para hardgainers',
    question: 'Se tiver uma dúvida de saúde ou condição especial, o que fazer?',
    answer:
      'A app é uma ferramenta de apoio e não substitui acompanhamento profissional. Em caso de doença, transtorno alimentar ou condição especial, consulte um médico ou nutricionista.',
    keywords: ['médico', 'saúde', 'doença', 'condição'],
  },

  // ── Dados e privacidade ───────────────────────────────────────────────
  {
    id: 'dados-enviados-servidor',
    category: 'Dados e privacidade',
    question: 'Os meus dados são enviados para algum servidor?',
    answer:
      'Não. Todos os seus dados — perfil, plano gerado, alimentos personalizados e edições — ficam salvos apenas no seu próprio navegador. Nada é enviado a servidores externos desta ferramenta.',
    keywords: ['dados', 'servidor', 'privacidade', 'enviado'],
  },
  {
    id: 'limpar-cache',
    category: 'Dados e privacidade',
    question: 'O que acontece se eu limpar o cache do navegador?',
    answer:
      'Seus dados e o plano gerado serão apagados, porque ficam salvos no seu navegador. Se isso acontecer, basta preencher os dados novamente para gerar um novo plano.',
    keywords: ['cache', 'limpar', 'apagado', 'dados', 'perdido'],
  },
  {
    id: 'outro-dispositivo',
    category: 'Dados e privacidade',
    question: 'Posso usar a app em outro dispositivo ou navegador?',
    answer:
      'Como os dados ficam salvos apenas no seu navegador, eles não são transferidos automaticamente para outro dispositivo. Você precisaria preencher seus dados novamente no outro aparelho.',
    keywords: ['outro dispositivo', 'celular', 'computador', 'transferir', 'sincronizar'],
  },

  // ── Problemas comuns ──────────────────────────────────────────────────
  {
    id: 'plano-sumiu',
    category: 'Problemas comuns',
    question: 'O plano sumiu depois de atualizar a página. O que aconteceu?',
    answer:
      'Isso pode ocorrer se você limpou o cache do navegador ou se a sessão expirou. Basta preencher seus dados novamente para gerar um novo plano. Todo o processo leva menos de 2 minutos.',
    keywords: ['sumiu', 'desapareceu', 'atualizar', 'perdi', 'cache'],
  },
  {
    id: 'plano-nao-gera',
    category: 'Problemas comuns',
    question: 'O plano não está sendo gerado. O que fazer?',
    answer:
      'Verifique se preencheu todos os campos nas etapas anteriores. Se o problema persistir, clique no ícone de reiniciar no topo da página para começar novamente.',
    keywords: ['não gera', 'erro', 'problema', 'reiniciar', 'resetar'],
  },
  {
    id: 'quando-usar-contato',
    category: 'Problemas comuns',
    question: 'Quando devo usar o Contato?',
    answer:
      'Use o Contato se tiver uma dúvida que não está respondida aqui, se encontrar algum erro na app, ou se quiser sugerir uma melhoria. Para dúvidas comuns, esta página costuma ter a resposta.',
    keywords: ['contato', 'suporte', 'dúvida', 'erro', 'problema'],
  },

  // ── Glossário ─────────────────────────────────────────────────────────
  {
    id: 'glossario-hardgainer',
    category: 'Glossário',
    question: 'Hardgainer',
    answer:
      'Pessoa com dificuldade em ganhar peso mesmo comendo bastante.\n\nExemplo: alguém que come muito mas não engorda com facilidade.',
    keywords: ['hardgainer', 'ganhar peso', 'ectomorfo'],
  },
  {
    id: 'glossario-ectomorfo',
    category: 'Glossário',
    question: 'Ectomorfo',
    answer:
      'Tipo de corpo com metabolismo mais rápido e estrutura mais magra. Tende a ter dificuldade em acumular massa.\n\nExemplo: pessoas que parecem não engordar mesmo comendo muito.',
    keywords: ['ectomorfo', 'biotipo', 'magro', 'hardgainer'],
  },
  {
    id: 'glossario-caloria-kcal',
    category: 'Glossário',
    question: 'Caloria / Kcal',
    answer:
      'Unidade que mede a energia dos alimentos. Quanto maior o número, mais energia o alimento fornece.\n\nExemplo: 100g de arroz cozido têm cerca de 130 kcal.',
    keywords: ['caloria', 'kcal', 'energia', 'calorias'],
  },
  {
    id: 'glossario-macros',
    category: 'Glossário',
    question: 'Macros',
    answer:
      'Forma curta de macronutrientes: proteína, carboidrato e gordura. São os três componentes principais dos alimentos.\n\nExemplo: o plano distribui as calorias entre proteína, carboidrato e gordura.',
    keywords: ['macros', 'macronutrientes', 'nutrientes'],
  },
  {
    id: 'glossario-proteina',
    category: 'Glossário',
    question: 'Proteína',
    answer:
      'Nutriente essencial para construir e manter os músculos. Encontrado em carnes, ovos, laticínios e leguminosas.\n\nExemplo: 100g de frango grelhado têm cerca de 30g de proteína.',
    keywords: ['proteína', 'músculo', 'aminoácidos'],
  },
  {
    id: 'glossario-carboidrato',
    category: 'Glossário',
    question: 'Carboidrato',
    answer:
      'Nutriente que fornece energia para o corpo e o cérebro. Principal combustível das atividades do dia a dia.\n\nExemplo: arroz, batata, aveia e pão são fontes de carboidrato.',
    keywords: ['carboidrato', 'energia', 'carbo'],
  },
  {
    id: 'glossario-gordura',
    category: 'Glossário',
    question: 'Gordura',
    answer:
      'Nutriente essencial para os hormônios e para absorver certas vitaminas. Não deve ser eliminada da alimentação.\n\nExemplo: azeite, abacate, ovos e castanhas são fontes de gordura.',
    keywords: ['gordura', 'hormônio', 'lipídio'],
  },
  {
    id: 'glossario-superavit',
    category: 'Glossário',
    question: 'Superávit calórico',
    answer:
      'Comer mais calorias do que o corpo gasta. Necessário para ganhar peso.\n\nExemplo: se o corpo gasta 2.200 kcal e você come 2.600 kcal, está em superávit.',
    keywords: ['superávit', 'ganhar peso', 'calorias'],
  },
  {
    id: 'glossario-deficit',
    category: 'Glossário',
    question: 'Déficit calórico',
    answer:
      'Comer menos calorias do que o corpo gasta. Leva à perda de peso. Não é o objetivo para quem quer ganhar massa.\n\nExemplo: se o corpo gasta 2.200 kcal e você come 1.800 kcal, está em déficit.',
    keywords: ['déficit', 'perder peso', 'calorias'],
  },
  {
    id: 'glossario-manutencao',
    category: 'Glossário',
    question: 'Manutenção calórica',
    answer:
      'Quantidade de calorias que mantém o peso estável, sem ganhar nem perder.\n\nExemplo: se você come 2.200 kcal e o peso não muda, essa é sua manutenção.',
    keywords: ['manutenção', 'estável', 'peso'],
  },
  {
    id: 'glossario-gasto-calorico',
    category: 'Glossário',
    question: 'Gasto calórico diário',
    answer:
      'Total de calorias que o corpo usa em um dia, incluindo o metabolismo e as atividades físicas.\n\nExemplo: uma pessoa com rotina moderada pode gastar entre 2.000 e 2.800 kcal por dia.',
    keywords: ['gasto', 'metabolismo', 'energia', 'diário'],
  },
  {
    id: 'glossario-massa-muscular',
    category: 'Glossário',
    question: 'Massa muscular',
    answer:
      'Tecido muscular do corpo, diferente de gordura e água. É construída com treino e alimentação adequada.\n\nExemplo: braços, pernas e costas são compostos em grande parte de massa muscular.',
    keywords: ['massa', 'músculo', 'tecido'],
  },
  {
    id: 'glossario-hipertrofia',
    category: 'Glossário',
    question: 'Hipertrofia',
    answer:
      'Crescimento dos músculos por meio do treino e de uma alimentação adequada.\n\nExemplo: após meses de treino e boa alimentação, os músculos ficam maiores e mais fortes.',
    keywords: ['hipertrofia', 'crescimento', 'músculo'],
  },
  {
    id: 'glossario-refeicao-solida',
    category: 'Glossário',
    question: 'Refeição sólida',
    answer:
      'Refeição feita com alimentos que se mastiga, como arroz, frango, ovo e batata.\n\nExemplo: almoço com frango, arroz, feijão e salada.',
    keywords: ['sólida', 'alimentos', 'mastigar', 'refeição'],
  },
  {
    id: 'glossario-shake-proteina',
    category: 'Glossário',
    question: 'Shake de proteína',
    answer:
      'Bebida feita com pó de proteína misturado a líquidos e outros ingredientes. Prático para atingir a meta calórica.\n\nExemplo: pó de proteína com leite e banana.',
    keywords: ['shake', 'proteína', 'bebida', 'whey'],
  },
  {
    id: 'glossario-tabela-nutricional',
    category: 'Glossário',
    question: 'Tabela nutricional',
    answer:
      'Tabela nas embalagens de alimentos que mostra as calorias e os nutrientes por porção.\n\nExemplo: a tabela do iogurte mostra 80 kcal e 8g de proteína por 100g.',
    keywords: ['tabela', 'embalagem', 'nutrição', 'rótulo'],
  },
  {
    id: 'glossario-porcao',
    category: 'Glossário',
    question: 'Porção',
    answer:
      'Quantidade de referência de um alimento indicada na embalagem. Pode ser diferente de 100g.\n\nExemplo: a embalagem indica "porção de 30g" com 120 kcal.',
    keywords: ['porção', 'quantidade', 'referência', 'embalagem'],
  },
  {
    id: 'glossario-gramas',
    category: 'Glossário',
    question: 'Gramas (g)',
    answer:
      'Unidade de peso usada para medir alimentos.\n\nExemplo: 150g de frango grelhado.',
    keywords: ['gramas', 'peso', 'medida'],
  },
  {
    id: 'glossario-substituicao',
    category: 'Glossário',
    question: 'Substituição',
    answer:
      'Troca de um alimento por outro com valor calórico parecido.\n\nExemplo: trocar arroz por batata doce mantendo a mesma quantidade de calorias.',
    keywords: ['substituição', 'trocar', 'alternativa'],
  },
  {
    id: 'glossario-alimento-personalizado',
    category: 'Glossário',
    question: 'Alimento personalizado',
    answer:
      'Alimento criado pelo usuário na app com os valores da embalagem do produto que ele usa.\n\nExemplo: criar "Iogurte Marca X" com os valores da tabela da embalagem.',
    keywords: ['personalizado', 'criado', 'embalagem', 'alimento'],
  },
  {
    id: 'glossario-consistencia',
    category: 'Glossário',
    question: 'Consistência',
    answer:
      'Manter a alimentação próxima do plano ao longo do tempo, mesmo sem ver resultado imediato.\n\nExemplo: seguir o plano por 8 semanas seguidas, inclusive nos fins de semana.',
    keywords: ['consistência', 'hábito', 'rotina'],
  },
  {
    id: 'glossario-progressao',
    category: 'Glossário',
    question: 'Progressão',
    answer:
      'Melhora gradual ao longo de semanas ou meses — peso, força e disposição.\n\nExemplo: ganhar 0,5 kg por mês de forma consistente ao longo de 6 meses.',
    keywords: ['progressão', 'evolução', 'resultado'],
  },
  {
    id: 'glossario-retencao',
    category: 'Glossário',
    question: 'Retenção de líquidos',
    answer:
      'Acúmulo temporário de água no corpo que faz o peso variar sem relação com gordura ou músculo.\n\nExemplo: após um dia com muito sal, o peso pode subir cerca de 1 kg de água.',
    keywords: ['retenção', 'água', 'líquido', 'peso'],
  },
  {
    id: 'glossario-apetite',
    category: 'Glossário',
    question: 'Apetite',
    answer:
      'Sensação de fome e vontade de comer. Quem tem dificuldade em ganhar peso muitas vezes tem apetite menor.\n\nExemplo: sentir-se satisfeito com pouco alimento, mesmo abaixo da meta calórica.',
    keywords: ['apetite', 'fome', 'comer'],
  },
  {
    id: 'glossario-digestao',
    category: 'Glossário',
    question: 'Digestão',
    answer:
      'Processo pelo qual o corpo absorve os nutrientes dos alimentos. Pode ser afetada pelo volume e pela velocidade com que se come.\n\nExemplo: comer rápido demais ou em grande volume pode causar desconforto.',
    keywords: ['digestão', 'absorção', 'estômago'],
  },
];
