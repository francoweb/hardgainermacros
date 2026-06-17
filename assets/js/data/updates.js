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
