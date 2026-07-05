/**
 * updates.js — Atualizações visíveis para o usuário
 *
 * REGRA: Sempre que uma mudança for visível para o usuário, adicione uma
 * entrada nesta lista no mesmo commit, com linguagem clara, útil e sem
 * termos técnicos. Não usar hash de commit, nomes de arquivos ou detalhes
 * internos. Ordenação: mais recente primeiro.
 *
 * Campos obrigatórios: date, type, title, description
 * Tipos permitidos: "Nova funcionalidade" | "Melhoria" | "Correção"
 * Opcionais: tags (array, máx. 3), highlight (boolean — destaque visual)
 */

export const UPDATES = [
  {
    type: 'feature',
    date: '2026-07-05',
    title: 'Calculadora de Macros por Alimento',
    description: 'Nova ferramenta disponível no menu "Calcular" — pesquise qualquer alimento e descubra instantaneamente as calorias, proteína, carboidratos e gordura para qualquer quantidade em gramas. Mais de 100 alimentos disponíveis organizados por categoria, com páginas individuais detalhadas para cada alimento.',
    tags: ['Ferramenta', 'Nutrição', 'SEO'],
  },
  {
    date: '2026-07-04',
    type: 'Melhoria',
    title: 'Navegação completa no cabeçalho',
    description:
      'O cabeçalho foi redesenhado com links para Início, Blog, FAQ e Novidades. No celular, a navegação colapsa num menu hambúrguer. O link da página actual é destacado automaticamente.',
    tags: ['Navegação', 'Mobile'],
    highlight: false,
  },
  {
    date: '2026-07-04',
    type: 'Melhoria',
    title: 'Paginação na listagem do blog',
    description:
      'A página do blog agora mostra 10 artigos por vez, com botões de navegação entre páginas. Os filtros por categoria continuam funcionando e repõem automaticamente para a primeira página.',
    tags: ['Blog', 'Navegação'],
    highlight: false,
  },
  {
    date: '2026-07-04',
    type: 'Melhoria',
    title: 'Artigos relacionados com imagem e mais sugestões',
    description:
      'Cada artigo do blog agora exibe 4 sugestões de artigos relacionados (em vez de 3) e cada sugestão inclui a imagem de capa para facilitar a navegação. A página inicial também passou a mostrar 4 artigos recentes do blog.',
    tags: ['Blog', 'Navegação'],
    highlight: false,
  },
  {
    date: '2026-07-01',
    type: 'Nova funcionalidade',
    title: 'Preencher valores nutricionais com foto do rótulo',
    description:
      'Agora é possível fotografar a tabela nutricional de qualquer produto e os campos de calorias, proteína, carboidratos e gordura são preenchidos automaticamente. Todos os valores ficam editáveis para você confirmar antes de salvar — a leitura é feita por inteligência artificial e pode ser ajustada se necessário.',
    tags: ['Rótulo nutricional', 'Foto', 'Praticidade'],
    highlight: true,
  },
  {
    date: '2026-06-30',
    type: 'Correção',
    title: 'Mensagem mais clara quando um produto não é encontrado pelo código de barras',
    description:
      'A mensagem que aparece quando um produto não é encontrado na base de dados foi ajustada para ser mais clara e encorajadora, sem referências desnecessárias a marcas ou regiões específicas.',
    tags: ['Código de barras'],
    highlight: false,
  },
  {
    date: '2026-06-30',
    type: 'Melhoria',
    title: 'Adicionar produto manualmente quando o código de barras não é reconhecido',
    description:
      'Quando a app não encontra um produto pelo código de barras — o que acontece com algumas marcas portuguesas menos conhecidas —, agora é possível adicioná-lo manualmente preenchendo o nome e os macros da embalagem. O produto fica guardado na biblioteca pessoal para ser usado em qualquer refeição do plano.',
    tags: ['Código de barras', 'Praticidade'],
    highlight: false,
  },
  {
    date: '2026-06-30',
    type: 'Melhoria',
    title: 'Mais detalhes nutricionais no código de barras',
    description:
      'A consulta de alimentos por código de barras agora também traz informações nutricionais extras quando o produto declara isso na embalagem, como fibras, açúcares, gorduras detalhadas, sal, sódio, vitaminas e minerais. Esses valores já chegam preenchidos automaticamente nos campos opcionais ao adicionar o alimento ao plano, sem precisar digitar nada.',
    tags: ['Código de barras', 'Informação nutricional'],
    highlight: false,
  },
  {
    date: '2026-06-30',
    type: 'Nova funcionalidade',
    title: 'Consultar alimentos por código de barras',
    description:
      'Agora é possível apontar a câmara do celular para o código de barras de qualquer produto e ver instantaneamente as calorias, proteína, carboidratos e gordura. Você pode ajustar a quantidade para ver os macros recalculados em tempo real e salvar o produto numa biblioteca pessoal, ficando disponível para adicionar a qualquer refeição do plano alimentar de 14 dias.',
    tags: ['Código de barras', 'Plano alimentar', 'Praticidade'],
    highlight: true,
  },
  {
    date: '2026-06-28',
    type: 'Nova funcionalidade',
    title: 'Receitas aplicáveis ao plano',
    description:
      'Agora é possível escolher receitas prontas, como omelete de frango anabólica, panqueca de banana com whey ou arroz com frango, e aplicar diretamente numa refeição do plano. A app ajusta automaticamente as quantidades para encaixar melhor nas calorias da refeição, mostra uma pré-visualização com os macros antes de aplicar e permite voltar à refeição original quando quiser.',
    tags: ['Receitas', 'Plano alimentar', 'Praticidade'],
    highlight: true,
  },
  {
    date: '2026-06-26',
    type: 'Nova funcionalidade',
    title: 'Lista de compras com copiar e PDF',
    description:
      'Adicionamos ações rápidas na Lista de Compras para facilitar o uso no dia a dia. Agora é possível copiar a lista em texto simples ou salvar uma versão limpa em PDF, sem incluir o plano alimentar inteiro.',
    tags: ['Lista de Compras', 'PDF', 'Praticidade'],
    highlight: true,
  },
  {
    date: '2026-06-25',
    type: 'Nova funcionalidade',
    title: 'Como usar este plano',
    description:
      'Adicionamos um card expansível na página do plano alimentar para explicar, sem poluir a tela, como começar o plano, como seguir os 14 dias e o que fazer depois. A orientação também lembra o usuário de acompanhar a meta de hidratação indicada pela app.',
    tags: ['Plano alimentar', 'Orientação'],
    highlight: true,
  },
  {
    date: '2026-06-25',
    type: 'Melhoria',
    title: 'Lista de compras mais prática',
    description:
      'A lista de compras ficou mais próxima da vida real. Agora ela usa sugestões mais fáceis de comprar no mercado, como embalagens de leite, dúzias de ovos, potes, garrafas, pacotes e unidades quando fizer sentido.',
    tags: ['Lista de Compras', 'Plano alimentar'],
    highlight: true,
  },
  {
    date: '2026-06-25',
    type: 'Melhoria',
    title: 'Guia Hardgainer nos textos da app',
    description:
      'Atualizamos alguns textos visíveis para usar "Guia" de forma mais natural e adicionamos links úteis para o Guia Hardgainer em pontos específicos da app, sem transformar botões ou opções funcionais em links.',
    tags: ['Interface'],
  },
  {
    date: '2026-06-21',
    type: 'Melhoria',
    title: 'Edição de líquidos mais clara',
    description:
      'Ao editar alimentos líquidos como leite, o campo de quantidade agora mostra "ml" em vez de "g", deixando a edição mais clara e coerente com o que aparece no plano alimentar.',
    tags: ['Plano alimentar', 'Interface'],
  },
  {
    date: '2026-06-20',
    type: 'Melhoria',
    title: 'Botão "Voltar ao topo" em mais páginas',
    description:
      'O botão "Voltar ao topo" agora funciona em todas as páginas da ferramenta — FAQ, Atualizações e Início — e não apenas no plano alimentar. Ideal para quem percorre listas longas.',
    tags: ['Navegação', 'Interface'],
  },
  {
    date: '2026-06-20',
    type: 'Melhoria',
    title: 'Botão de ajuda ajustado no celular',
    description:
      'Quando minimizado no celular, o botão de ajuda agora fica mais próximo do fundo da tela e ocupa menos espaço visual, sem interferir com outros elementos da página.',
    tags: ['Celular', 'Interface'],
  },
  {
    date: '2026-06-19',
    type: 'Melhoria',
    title: 'Botão de ajuda minimizável',
    description:
      'O botão de ajuda pode agora ser minimizado com um clique no "×", deixando a tela mais limpa. Para restaurá-lo, basta clicar no pequeno botão "? Ajuda" que fica visível no canto.',
    tags: ['Interface', 'Celular'],
  },
  {
    date: '2026-06-18',
    type: 'Melhoria',
    title: 'Botão de ajuda com nova cor',
    description:
      'O botão de ajuda recebeu uma cor verde oliva mais alinhada com a identidade visual da ferramenta, tornando-o mais fácil de diferenciar de outros botões flutuantes na tela.',
    tags: ['Interface'],
  },
  {
    date: '2026-06-18',
    type: 'Nova funcionalidade',
    title: 'Botão de ajuda rápida',
    description:
      'Um botão de ajuda passou a estar visível em todas as páginas da ferramenta. Com um clique, abre diretamente a página de perguntas frequentes com respostas às dúvidas mais comuns.',
    tags: ['Ajuda', 'Navegação'],
    highlight: true,
  },
  {
    date: '2026-06-17',
    type: 'Melhoria',
    title: 'FAQ mais completa com glossário',
    description:
      'A página de perguntas frequentes foi ampliada com novas respostas sobre uso da ferramenta, plano alimentar, ajustes, dúvidas comuns e termos importantes de nutrição para hardgainers. Agora ficou mais fácil encontrar ajuda pela busca antes de precisar entrar em contato.',
    tags: ['Ajuda', 'FAQ', 'Nutrição'],
  },
  {
    date: '2026-06-16',
    type: 'Nova funcionalidade',
    title: 'Nova página de perguntas frequentes',
    description:
      'Agora a ferramenta tem uma página de FAQ com respostas rápidas sobre plano alimentar, macros, edição de alimentos, PDF, dados salvos no navegador e dúvidas comuns. Isso ajuda você a encontrar ajuda sem precisar entrar em contato com o suporte.',
    tags: ['Ajuda', 'Suporte'],
  },
  {
    date: '2026-06-16',
    type: 'Melhoria',
    title: 'Botões com linguagem mais familiar',
    description:
      'Os botões de ação passaram a usar "Salvar" em vez de termos menos comuns, tornando a interface mais natural e intuitiva para qualquer falante de português.',
    tags: ['Interface'],
  },
  {
    date: '2026-06-15',
    type: 'Melhoria',
    title: 'Textos adaptados para qualquer falante de português',
    description:
      'Exemplos, avisos e mensagens da ferramenta foram revisados para usar português do Brasil neutro. Foram removidas referências a marcas de supermercado e expressões regionais, tornando a app mais fácil de entender em qualquer país.',
    tags: ['Interface'],
  },
  {
    date: '2026-06-15',
    type: 'Melhoria',
    title: 'Mensagem mais clara sobre o plano alimentar',
    description:
      'O plano agora exibe uma mensagem explicando que os valores nutricionais são referências gerais e podem variar por marca ou forma de preparo. Isso ajuda a entender quando faz sentido usar o botão "Editar" para ajustar um alimento.',
    tags: ['Plano alimentar'],
  },
  {
    date: '2026-06-15',
    type: 'Nova funcionalidade',
    title: 'Edição manual de macros',
    description:
      'Agora você pode ajustar calorias, proteína, carboidratos e gorduras de qualquer alimento do plano. Isso é útil quando o rótulo do produto que você usa tem valores diferentes dos valores de referência da app. Você também pode reverter para os valores originais a qualquer momento.',
    tags: ['Plano alimentar', 'Personalização'],
    highlight: true,
  },
  {
    date: '2026-06-10',
    type: 'Nova funcionalidade',
    title: 'Editar a quantidade de qualquer ingrediente',
    description:
      'Você pode alterar a quantidade em gramas de qualquer ingrediente do plano gerado. Os valores nutricionais são recalculados automaticamente e você pode reverter para a quantidade original sempre que quiser.',
    tags: ['Plano alimentar', 'Personalização'],
  },
  {
    date: '2026-06-05',
    type: 'Nova funcionalidade',
    title: 'Adicionar alimentos da biblioteca ao plano',
    description:
      'Agora é possível adicionar alimentos da biblioteca padrão da ferramenta diretamente a qualquer refeição do plano. Isso permite personalizar o plano sem precisar criar um alimento do zero.',
    tags: ['Plano alimentar', 'Personalização'],
  },
  {
    date: '2026-06-01',
    type: 'Nova funcionalidade',
    title: 'Criar alimentos personalizados',
    description:
      'Você pode criar um alimento próprio com os valores nutricionais que desejar e adicioná-lo a qualquer refeição do plano. Os dados ficam salvos no seu navegador para uso futuro.',
    tags: ['Plano alimentar', 'Personalização'],
  },
  {
    date: '2026-05-28',
    type: 'Nova funcionalidade',
    title: 'Remover alimentos do plano',
    description:
      'Você pode remover qualquer alimento de uma refeição do plano. O PDF e a versão para impressão acompanham essa personalização automaticamente. Para desfazer, basta clicar em "Restaurar".',
    tags: ['Plano alimentar', 'PDF'],
  },
];
