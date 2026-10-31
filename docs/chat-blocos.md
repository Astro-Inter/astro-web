# Blocos no chatbot


## Blocos visuais

O envio e o histórico aceitam `blocos` ordenados com texto, gráficos de barras,
linhas e setores, tabela e galeria de usuários. Quando os blocos não existem,
são inválidos ou a versão é desconhecida, o chat apresenta `resposta`/`content`
como fallback. Os valores dos gráficos também aparecem como texto, e tabelas
possuem rolagem horizontal. Fotos HTTPS do R2 usam URL temporária e iniciais como
alternativa quando não há imagem ou ocorre erro. A autorização é da API.

## Organização e validação

Os contratos dos blocos ficam em `src/types/chatBlocks.ts`; a validação da resposta
e das URLs, em `src/utils/chatBlocks.ts`. O hook `useChatBlocks` mantém o resultado
enquanto a resposta não muda. Componentes de texto/tabela, gráfico e avatar
apresentam esses dados, e o CSS fica em `styles/chatBlocks.css`.

Paginação inválida, colunas repetidas, valores numéricos não finitos e dados fora
dos limites usam o fallback textual. As listas possuem chaves estáveis por conteúdo.
A tabela aceita foco e rolagem pelo teclado, com nome acessível e contorno visível.
O conteúdo dos gráficos também é apresentado em texto; tamanhos de fonte e cores
acompanham as preferências de acessibilidade do chat.
