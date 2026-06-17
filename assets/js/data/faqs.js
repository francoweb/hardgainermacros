/**
 * faqs.js — Perguntas frequentes da Hardgainer Macros
 *
 * REGRA: Se uma dúvida comum surgir repetidamente no suporte, adicione
 * uma entrada aqui com linguagem clara e útil para o usuário.
 * Sem linguagem técnica, sem termos internos, sem prometer resultados médicos.
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
      'Você preenche seus dados físicos e rotina, e a app calcula suas necessidades calóricas e gera um plano alimentar de 14 dias personalizado para o seu perfil. Não é necessário criar conta — tudo funciona direto no navegador.',
    keywords: ['começar', 'funciona', 'conta', 'como usar'],
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
      'Os valores da app são referências gerais baseadas em tabelas nutricionais. Cada marca, receita e forma de preparo pode ter valores ligeiramente diferentes. Se quiser mais precisão, use o botão "Editar" e ajuste os valores de acordo com o rótulo do produto que você usa.',
    keywords: ['rótulo', 'valores', 'diferente', 'marca', 'editar', 'preparo'],
  },
  {
    id: 'superavit-calorico',
    category: 'Macros e calorias',
    question: 'O que é superávit calórico?',
    answer:
      'Superávit calórico significa consumir mais calorias do que o seu corpo gasta. Para hardgainers que querem ganhar peso e massa muscular, esse excedente é necessário para o corpo ter energia suficiente para crescer.',
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
      'Ao clicar no ícone de edição de um alimento, além do campo de gramas, você verá campos editáveis para calorias, proteína, carboidratos e gorduras. Altere os valores conforme o rótulo do seu produto e clique em "Salvar".',
    keywords: ['editar', 'macros', 'calorias', 'proteína', 'carboidratos', 'gorduras', 'rótulo', 'manual'],
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
];
