# Blocos no chatbot

O POST e o histórico usam o mesmo parser e renderer. `resposta` é opcional;
blocos de texto são apresentados na posição recebida, inclusive entre componentes.
Prévia e histórico usam `chatMessageText`, com títulos quando a resposta contém
somente componentes. Mensagens antigas mantêm o texto e seus blocos originais.

Contratos em `src/types/chatBlocks.ts`, validação em `src/utils/chatBlocks.ts`,
memorização em `useChatBlocks`, renderização em `chatBlocks`, `chatBlockGraphic`
e `chatBlockAvatar`; tabela, cartões, contexto, ficha e resumo ficam em seus
componentes `chatBlockTable`, `chatBlockIndicators`, `chatBlockContext`,
`chatBlockUserProfile` e `chatBlockSetSummary`. Estilos em `styles/chatBlocks.css`.

## Tipos suportados

- `texto`; `tabela` v1/v2; `ficha_usuario` v1; células `imagem` e galeria legada.
- `grafico_barras`, `grafico_linhas`, `grafico_setores`, `grafico_rosca` v1.
- `indicadores`, `matriz_conformidade`, `contexto_dados` v1.

Cada bloco é validado isoladamente. Tipos/versões desconhecidos ou dados inválidos
produzem aviso acessível sem eliminar os reconhecidos ou apresentar JSON bruto.
O fallback textual atende mensagens legadas. Colunas repetidas, números não finitos,
contagens inconsistentes e duplicação de pessoa/NR na matriz são recusados.

## Paginação e abrangência

Tabelas v2 e matrizes v1 recebem até 200 linhas e usam páginas locais de dez.
O total visual vem de `linhas.length`, independentemente do envelope 1/1.
Cada bloco tem estado próprio, isolado pela mensagem. Não há callback de consulta
na paginação. Tabelas v1 continuam com até 50 linhas e metadados de servidor;
não foram alteradas as consultas antigas de agenda/mensagens/notificações.

São exibidos quantidade solicitada, recebida, total disponível e existência de
outros registros autorizados. `limitado` identifica corte de segurança por
`maximo_resultados` ou `tamanho_resposta`, separadamente de `tem_mais`.
100 recebidos de 273 com limitado=false representa quantidade atendida, conjunto
parcial. Zero recebido com total positivo é distinguido de total zero.

Indicadores e gráficos usam exclusivamente os agregados enviados pela API.
Não são derivados da página ou somados entre categorias. Percentual nulo é
“Sem base”, com numerador/denominador preservados. Cartões mostram universo,
abrangência, unidade e critério. O arredondamento Python da API é aceito inclusive
nos empates decimais; o valor apresentado é sempre o recebido.

A matriz permanece longa: identidade `(referencia_pessoa, nr)`, permitindo
homônimos e preservando unidade, validade, conformidade, agenda e análise.
Nenhum registro ausente é transformado em situação inferida. Referências não
geram consultas ou ações no frontend.

## Apresentação e segurança

O contexto mostra fonte, referência, período, escopo, filtros, critérios, avisos
e resumo do conjunto. Não inventa data/hora ou abrangência. Avisos ficam visíveis.
Rosca usa o discriminador próprio e preserva zeros, legenda, unidade e fonte;
soma zero mostra “Sem valores para distribuir”, sem fatias artificiais.
Meses ausentes não são completados. Valores também aparecem em texto acessível,
com tooltips na legenda e barras. Tabela tem região focável e rolagem horizontal.

Fichas aceitam nome e campos opcionais, modalidade e origem autenticada ou nula
no legado. Sem foto usam iniciais; sem nome usam avatar neutro. Conformidade só
aparece se recebida. Não acrescentam Status ou Cadastrado em.
URLs de fotos são HTTPS R2, temporárias, sem referrer e com fallback de erro;
não são persistidas pelo chat. Autorização, bloqueios e confirmações ficam na API.

## Validação reproduzível

`node --test tests/chatBlocks.test.cjs` cobre contratos, mistura/ordem, legado,
100/200 linhas, limites, homônimos, denominador zero, rosca zerada, fotos, navegação
sem rede, isolamento e invariância dos agregados. Exercita também o controlador
com POST/histórico simulados, retomada de sessão e troca de usuário durante envio.

Com `npm run dev`, abrir `/tools/chat-blocks-preview/index.html` para homologação
visual isolada com dados fictícios e fixture validada pelos mesmos testes.
Esse HTML não é entrada do build de produção. Evidências e limitações reais em
[homologação da PR 70](homologacao-chat-pr70.md).

## Limites do envelope e componentes legados

A resposta aceita até dez blocos. Textos têm de 1 a 6.000 caracteres; gráficos
admitem de 1 a 12 categorias e valores inteiros não negativos com soma segura.
Galerias antigas continuam com até 50 pessoas, nome obrigatório, e-mail opcional
até 320 caracteres e URL opcional até 8.192. Duplicatas de conteúdo têm chaves
separadas. `useChatBlocks` memoriza o parsing; os gráficos decorativos têm uma
lista textual adjacente, preservando acesso aos valores sem depender da imagem.

## Arquivo PDF v1 (API PR 34)

`arquivo` v1 é validado isoladamente e renderizado por `chatBlockFile`, separado
do texto e na posição recebida. Aceita UUID, nome seguro `.pdf` (até 100), MIME
`application/pdf`, tamanho nulo ou inteiro de 1 a 2.000.000, URL HTTPS ou nula,
expiração ISO UTC e estado disponivel/expirado/indisponivel. O cartão omite o tamanho
quando ausente; não estima nem converte arquivo para outro tipo.

`useChatFileDownload` controla prazo, carregamento, erro e cancelamento. O botão
só habilita com URL, estado disponível e prazo válido; expiração é reavaliada
pelo relógio e quando a aba volta a receber foco/visibilidade. Histórico e lembrete
mantêm o mesmo id/prazo recebido. O cliente nunca renova assinatura ou consulta o
arquivo pelo id. Falha de geração sem bloco não produz cartão de sucesso.

`services/chatFiles.ts` recebe apenas a URL fornecida, em download iniciado por
clique. Não usa o cliente autenticado Astro: credentials omit, no-referrer,
no-store, sem Authorization ou cookies. Valida resposta PDF e limite de 2 MB,
cria Blob temporário somente para salvar, e revoga seu object URL após uso.
Não faz prefetch/preview automático nem coloca URL assinada em href do cartão,
logs, analytics ou armazenamento. O cartão usa data-track-ignore. Erros de rede,
CORS, HTTP, MIME ou tamanho produzem alerta sem incluir a URL no erro.

O download direto precisa de GET permitido por CORS e Content-Type application/pdf.
Se falhar, o alerta oferece “Abrir PDF no navegador”: uma ação explícita de
navegação para a mesma URL, com noopener/noreferrer, sem token Astro, sem renovação
e sem construir outra capacidade. Não faz preview automático. O usuário pode
usar o download do visualizador do navegador; erros HTTP do armazenamento nessa
navegação ficam a cargo do navegador. A alternativa desaparece ao expirar.
A implementação mantém os componentes e contratos analíticos existentes, sem
recalcular agregados a partir das linhas. A simulação visual específica está em
`/tools/chat-contracts-preview/index.html` e não entra no build de produção.
