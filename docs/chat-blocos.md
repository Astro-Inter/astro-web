# Blocos estruturados do Astro Chat

O envio e o histórico do chat podem conter uma lista ordenada de blocos: texto, gráficos de barras, linhas ou setores, tabelas e galerias de usuários. O frontend valida a lista antes de renderizá-la. Se a lista estiver ausente, inválida ou contiver um tipo ou versão desconhecida, a interface exibe o texto de fallback da resposta ou do conteúdo.

## Contratos e validação

Os tipos estão em src/types/chatBlocks.ts e a validação em src/utils/chatBlocks.ts. Uma resposta aceita até 10 blocos. Um bloco inválido invalida a lista inteira e aciona o fallback textual.

| Bloco | Limites e regras |
| --- | --- |
| Texto | Conteúdo obrigatório, entre 1 e 6.000 caracteres. |
| Gráfico | Versão 1; título, fonte e unidade obrigatórios; de 1 a 12 pontos. Cada categoria é texto não vazio e cada valor é finito e não negativo. |
| Tabela | Versão 1; de 1 a 10 colunas, com chaves únicas em formato snake_case; de 1 a 50 linhas. Células aceitam texto de até 6.000 caracteres, número finito ou null. A página começa em 1, não ultrapassa o total de páginas e o total de resultados não pode ser menor que a quantidade de linhas. |
| Galeria de usuários | Versão 1; de 1 a 50 pessoas. Nome obrigatório; e-mail pode ser null ou texto de até 320 caracteres; URL pode ser null ou texto de até 8.192 caracteres. |

Gráficos também exigem título, fonte, unidade e pontos com categoria e valor válidos. O acumulado dos valores precisa permanecer finito. Tabelas rejeitam colunas repetidas e paginação inconsistente.

## Componentes e estado

O componente ChatBlocks escolhe um componente visual para cada bloco. useChatBlocks memoriza a validação e cria chaves estáveis a partir do conteúdo, já que o contrato não fornece IDs. Itens duplicados recebem sufixos distintos.

- ChatBlockGraphic renderiza barras, linhas e setores. Os gráficos são decorativos para tecnologias assistivas; uma lista textual adjacente apresenta categorias e valores, além de fonte e unidade.
- Tabelas mostram o título, cabeçalhos, linhas e resumo da paginação.
- ChatBlockAvatar mostra foto e nome ou, se não houver uma imagem segura ou se ela falhar, as iniciais da pessoa.

## URLs de imagem e acessibilidade

safeChatImage aceita somente URLs HTTPS sem credenciais cujo host termine em .r2.cloudflarestorage.com. Fotos usam referrerPolicy no-referrer. URL ausente, inválida ou com erro usa iniciais. A autorização dos dados e das imagens continua sendo responsabilidade da API.

A tabela fica dentro de uma região nomeada e focável, com rolagem horizontal e contorno visível ao receber foco. Tamanho de texto e cores usam as variáveis de preferência do chat; os estilos de alto contraste têm regras próprias em styles/chatBlocks.css.
