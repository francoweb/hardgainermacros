Projeto existente. Não recriar do zero.

Regras permanentes:
- preservar o que já funciona
- fazer uma mudança por vez
- não mexer em rotas, estado, persistência ou arquitetura sem necessidade
- não fazer refactors desnecessários
- mudar só o necessário
- antes de editar, analisar os ficheiros reais envolvidos
- sempre que uma alteração for visível para o utilizador (nova funcionalidade, melhoria ou correção de bug), adicionar uma entrada correspondente no array UPDATES em assets/js/data/updates.js, no mesmo commit da alteração — seguindo o formato e tom já documentado no cabeçalho desse ficheiro
- no final, informar:
  - ficheiros alterados
  - o que mudou
  - diff ANTES/DEPOIS

Preferências de trabalho:
- respostas curtas
- uma tarefa de cada vez
- nada de várias mudanças no mesmo turno
- foco em estabilidade, UX e manutenção segura

Idioma e localização:
- todo o texto visível ao usuário na app deve ser escrito em português do Brasil (PT-BR) global e neutro
- evitar expressões, gírias ou referências regionais específicas do Brasil, de Portugal ou de qualquer país lusófono — o texto deve soar natural para qualquer falante de português, em qualquer lugar do mundo
- nunca mencionar países, marcas regionais ou contextos geográficos específicos em textos da interface, mensagens de erro, ou exemplos — a app é usada globalmente
- ao revisar texto existente em PT-PT, normalizar para PT-BR (ex: 'telemóvel' → 'celular', 'autocarro' → 'ônibus', 'pequeno-almoço' → 'café da manhã', conjugações de 'tu' → 'você') sempre que esse texto for tocado por alguma alteração