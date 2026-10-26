# SCRUM-610 — Análise das respostas de formulários

Interface web conectada à API para consultar as respostas e aprovar ou reprovar formulários respondidos.

## Fluxo e contrato

- No menu dos três pontos de um formulário respondido, **Ver respostas** abre `/mainFormScreen/responses?id=<uuid>`. Essa opção consulta dados reais também em desenvolvimento.
- `GET /forms/{id}/responses` fornece o formulário, nomes do remetente/destinatário/unidade, análise e `canReview`. A tela usa essa permissão fornecida pela API; somente o remetente e o gestor do workspace podem analisar.
- `POST /forms/{id}/review` registra a decisão. Aprovação envia somente `{"status":"approved"}`. Reprovação envia `{"status":"rejected","description":"Motivo"}`, com descrição aparada, obrigatória e limitada a 1.000 caracteres.
- O estado final só aparece após a confirmação da API. Falhas preservam o modal e o motivo digitado. Envios duplicados ficam bloqueados enquanto a requisição está em andamento.
- Em conflito HTTP 409, a tela consulta novamente a análise, sem repetir automaticamente a escrita. Decisões finais exibem revisor e data e não oferecem novas ações.
- Respondido (`CONCLUIDO`) e resultado da análise são conceitos distintos. Reprovar encerra a análise sem novo envio.

Os serviços reutilizam a autenticação Firebase, o envelope e o tratamento de erro de formulários. IDs da query não definem usuário ou workspace. Consultas e gravações em andamento são canceladas ao sair da tela ou trocar de identidade.

## Respostas e imagens

A página exibe respostas textuais, datas, alternativas (incluindo o texto de Outros), perguntas opcionais sem resposta e metadados dos anexos.

Ao abrir um anexo, `GET /forms/{id}/images/{imageId}` fornece uma URL HTTPS temporária. O token da API não é encaminhado ao armazenamento. A URL não é persistida; reabrir ou tentar novamente solicita outro acesso. Falhas na consulta ou no carregamento da imagem oferecem nova tentativa.

A descrição da reprovação só pertence a estados `rejected`. Aprovações omitem essa propriedade; ela não substitui a descrição original do formulário. Esta integração não altera o backend ou a estrutura do MongoDB.

## Dados reais no menu

O menu oferece somente **Ver respostas**, para formulários respondidos, usando o UUID real do formulário e a API configurada. Não há opção de prévia no menu, inclusive em desenvolvimento. Formulários pendentes não oferecem análise enquanto não receberem respostas. As fixtures de apresentação permanecem isoladas dos acessos do menu.

## Design Astro

O layout existente foi preservado: componentes compartilhados, Montserrat, tokens de cor, cards de perguntas, retorno à esquerda e card de análise compacto. No desktop o card acompanha a rolagem e sua base se alinha ao final da última pergunta. Em telas menores, o conteúdo fica em uma coluna.

## Verificação e critérios DAD

- `npm test`, `npm run build` e `npm run lint` verificam o projeto. Testes de API usam requisições simuladas; não confirmam decisões em formulários reais.
- `tests/formReviewApi.test.cjs` verifica autenticação, rotas, validação de UUID, payloads, conflitos e URLs temporárias.
- `tests/formReview.test.cjs` verifica apresentação, permissão da API, confirmação assíncrona, falha sem perder a descrição, bloqueio de duplicação, conflito e visualização de imagem.
- `tests/formsUi.test.cjs` verifica que o menu abre respostas reais em desenvolvimento e não oferece prévia nem análise para formulários pendentes.
- M01–M04: TypeScript, componentes e props existentes, página compondo a interface, hooks coordenando estado e services concentrando HTTP; CSS fora de src.
- M05–M10/E03/E07–E09: contratos tipados, estado imutável, cancelamento e proteção contra respostas antigas, chaves estáveis, validação de UUID, navegação Router e rota privada.
- M11/M12: controles nativos, rótulo da descrição, mensagens de erro, carregamento e recuperação; os testes DOM cobrem modais e decisões. Isso não certifica uma auditoria WCAG completa ou teste com leitor de tela.
- E04: as rotas mantêm carregamento lazy; enquanto o código carrega, o fallback mostra a estrutura com skeleton. Depois, cada página mantém seus skeletons durante a consulta dos dados, sem a tela de texto intermediária.
- M13/M14: publicação segue o fluxo de revisão e merge do projeto. A validação local não certifica o deploy nem o histórico global do projeto.

## Ambiente da API

O web usa a base definida em VITE_API_URL no ambiente do projeto. O apontamento temporário para a API local foi removido; em desenvolvimento, o proxy /api encaminha as chamadas à base configurada. Não são adicionados endereços de teste às configurações de produção.
