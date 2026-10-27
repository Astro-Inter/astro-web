# Eventos — SCRUM-572

## Integração na main — 23/10/2026

A PR #40 foi mesclada na branch SCRUM-567 após a PR #39 dessa branch já ter
sido integrada à main. Por isso, os três commits de eventos permaneceram
fora da main. A integração posterior traz esses commits e preserva o sistema
global de notificações e os ajustes de acessibilidade e autofill da main.
Os testes de interface verificam as mensagens de confirmação e erro no
sistema global, além de aguardar a API antes de fechar o formulário.
Após a integração, os 330 testes passaram, assim como o build e a conferência
do diff. O lint manteve somente os dois avisos preexistentes documentados.

A página `/mainEventScreen` consulta eventos do workspace autenticado. As
requisições usam `VITE_API_URL`, o proxy `/api` no desenvolvimento e o token
Firebase da sessão, seguindo o restante do painel.

Contratos consultados no [Swagger publicado](https://astro-api-h2hx.onrender.com/swagger-ui/index.html)
e na [documentação do backend](https://github.com/Astro-Inter/astro-api/blob/main/docs/api-events.md).

## Fluxos do painel

| Operação | Endpoint |
| --- | --- |
| Calendário por semana, mês ou ano | `GET /events?startDate=...&endDate=...` |
| Informações e permissões antes de editar/inativar | `GET /events/{eventId}` |
| Participantes elegíveis, filtrados pela NR | `GET /events/eligible-candidates?nrId=...` |
| Criação de evento, turmas e participantes | `POST /events` |
| Edição de informações permitidas e turmas futuras | `PATCH /events/{eventId}` |
| Inativação definitiva com justificativa | `PATCH /events/{eventId}/cancellation` |
| Catálogo real e filtro de NRs destinadas a colaboradores | `GET /nrs`, `GET /roles`, `GET /roles/{roleId}/nrs/options` |

O calendário usa datas locais sem conversão para UTC e inclui os dias adjacentes
visíveis no mês. Turmas que atravessam dias aparecem em cada dia do intervalo.
As respostas persistidas determinam o ID do evento; o calendário é consultado
novamente após uma gravação. Falha nessa atualização aparece com a opção de tentar
novamente, sem reenviar a gravação já confirmada.

As flags `canEdit`, `canCancel`, `detailsEditable` e `editable` orientam as ações.
O UID Firebase não é comparado com o ID numérico do gestor. Turmas iniciadas e seus
participantes permanecem bloqueados; turmas futuras podem ser adicionadas,
alteradas ou removidas. O PATCH conserva IDs das turmas existentes e envia somente
os campos editáveis. Descrição histórica e segundos dos horários são preservados
quando esses dados não mudam.

O código de `/nrs` é a chave `codigo_nr` do catálogo usado pelo backend como
`nrId`. Modalidade híbrida e dados profissionais ausentes não recebem valores
fictícios. Participantes históricos continuam visíveis a partir do detalhe do
evento, mesmo quando deixam de aparecer na lista de elegíveis.

O dropdown de criação exibe somente NRs de usabilidade `Colaborador`. O endpoint
existente `GET /roles/{roleId}/nrs/options` já aplica esse filtro no backend
(`RoleService.findNrOptions` consulta `findByUsability("Colaborador")`). A leitura
usa um cargo real retornado por `GET /roles`, preferindo um ativo, e cruza os
códigos com `/nrs` para preservar os IDs e títulos do catálogo de eventos. O
campo `ativo` de cada opção significa vínculo com aquele cargo; opções não
vinculadas também pertencem ao catálogo de Colaborador e continuam disponíveis.
As leituras de cargos enviam o `firebase_uid` da sessão conforme o contrato.
Sem cargos/opções, a lista permanece vazia, sem liberar o catálogo geral. NRs
históricas ausentes do catálogo filtrado são preservadas somente na edição,
onde o campo já é bloqueado. A opção Sem NR permanece disponível.

Título, descrição, link, conclusão, evidência, distribuição e horários são
validados antes do envio. Cada turma exige ao menos um participante. Os modais
aguardam a API antes de fechar; erros mantêm os dados preenchidos e permitem nova
tentativa. Requisições repetidas são bloqueadas durante o envio. Leituras antigas
e escritas ainda pendentes são canceladas ao desmontar ou trocar de sessão.

“Inativar” cancela o evento definitivamente. O usuário informa uma justificativa
de 3 a 1000 caracteres; o painel envia `{ "reason": "..." }`. Não há reativação.

## Contratos do aplicativo do colaborador

`src/services/events.ts` também disponibiliza `GET /events/collaborator`,
`GET /events/collaborator/{eventId}` e `POST /events/{eventId}/completion`, com
tipos e transporte autenticado. A conclusão envia os arquivos no campo `files`
de `multipart/form-data`, com até três arquivos de 50 MB cada.

Essas funções não são chamadas pela interface administrativa: o painel permite
apenas `GESTOR` e `GESTOR_WORKSPACE`; o backend reserva os três fluxos ao
colaborador no aplicativo. A obrigatoriedade de evidência, o período de envio e
o estado da solicitação são reaplicados pelo servidor.

## Verificação

- `tests/events.test.cjs`: rotas, Bearer, contratos, multipart, validações,
  permissões, datas locais e preservação de dados históricos.
- `tests/eventsController.test.cjs`: mudanças de período, respostas atrasadas,
  repetição de solicitações, erros, troca de conta e cancelamento ao desmontar.
- `tests/eventsUi.test.cjs`: etapas dos formulários no DOM, carregamento, erro,
  sucesso, preservação dos dados e bloqueio de ações sem permissão. Usa jsdom e
  substitui a animação dos diálogos; não comprova o layout visual do navegador.
- `tests/eventEditing.test.cjs`: regressão das regras de edição já existentes.

Critérios DAD atendidos nesta alteração: M04/M05 (tipos e acesso remoto em
serviços), M06/M07/M08 (estado imutável, dependências e IDs estáveis), M12 (estados
assíncronos no DOM), E03 (cancelamento), E07 (dados externos interpolados) e E08
(validação em utilitários). M01/M02 são preservados pela estrutura e pelo build.
M11 tem evidência de labels, botões, mensagens ARIA e operação de formulários no
DOM; contraste e navegação completa com leitor de tela precisam de validação
visual/manual. M13/M14 são requisitos globais de publicação/histórico e não foram
auditados nesta tarefa.

Os testes automatizados usam respostas controladas, sem criar ou cancelar eventos
no backend publicado.

Verificação final: `npm test` aprovou 221 testes, incluindo 38 nos quatro
arquivos de eventos. O build passou; o lint não apresentou erros e manteve
somente os dois avisos preexistentes em `workspaceCodeForm` e
`useAstroChatController`. `git diff --check` não apontou problemas.

## Validação em tela — 17/10/2026

Validação realizada em `http://localhost:5173/mainEventScreen`, com a conta
indicada pelo usuário e autenticação real. Conferidos:

- Login, calendário com os títulos reais e abertura do detalhe de um evento.
- Busca por título e visualizações mensal, anual e semanal; navegação para a
  semana de 18–24/10 retornou os dois dias do evento filtrado.
- Bloqueio de edição e inativação no evento consultado, conforme as permissões
  retornadas pela API para a conta autenticada.
- Catálogo de NRs e filtro de elegíveis: a seleção de NR 6 reduziu a lista de
  139 para 132 pessoas e limpou os participantes selecionados anteriormente.
- Formulário até a revisão, com distribuição por teclado, datas, horários,
  conclusão pelo gestor e evidência opcional. O rascunho foi descartado.
- Nenhum erro ou aviso no console do navegador durante essas verificações.

O teste revelou e permitiu corrigir dois problemas visuais: o carregamento dos
detalhes deslocava o calendário e podia fechar o menu em páginas roladas; agora
o aviso usa a região acessível e o progresso permanece no próprio menu. Em
janelas de até 600 px, os três cartões de revisão/informações estavam comprimidos
na mesma largura; agora cada cartão ocupa a largura disponível, com rolagem
horizontal conforme o layout previsto. Ambas as correções foram reconferidas
no navegador.

A gravação de novos eventos, a edição persistida e o cancelamento definitivo não
foram executados nesta verificação manual. Sua cobertura permanece nos testes
automatizados de contrato, controle assíncrono e interface.

### Lista de participantes e estados vazios

Na reprodução do caso informado pelo usuário, NR 37 retornou zero candidatos,
enquanto NR 6 retornou 132. O filtro “Selecionados” mostra somente participantes
marcados; não seleciona pessoas automaticamente. A tela agora distingue falta de
elegíveis, seleção vazia e ausência de correspondências nos demais filtros,
mostra as contagens e oferece “Limpar filtros”. O avanço exige ao menos um
participante. O filtro de unidade compara o nome completo para evitar incluir
“Unidade 10” ao escolher “Unidade 1”.

A seleção individual, sua exibição no filtro “Selecionados” e a recuperação da
lista ao limpar filtros foram verificadas no navegador. Ausência de elegíveis
para uma NR exige conferir sua associação aos cargos no workspace; o frontend
preserva a elegibilidade definida pelo backend.

### Fotos dos participantes

Seleção, distribuição e consulta dos grupos exibem `profilePhotoUrl`, com
iniciais quando a foto está ausente, tem URL inválida ou não carrega. A imagem
é decorativa, pois o nome permanece ao lado, e não interfere no arraste dos
participantes. Fotos recebem carregamento lazy e recorte circular.

Os endpoints de eventos não informam a foto no contrato atual. O hook
`useEventCollaboratorPhotos` faz uma leitura de `/collaborators` por abertura
do fluxo/detalhe e cruza os perfis pelo ID, preservando a lista de elegíveis.
Trocar filtros não repete a leitura. Uma falha na consulta de fotos mantém a
seleção disponível com iniciais; troca de sessão ou desmontagem cancela a
consulta e descarta respostas antigas. Perfis fora da listagem autorizada não
recebem fotos de outro usuário ou de exemplo.

A grade dá mais espaço ao colaborador e comporta nomes em duas linhas. A foto
da Amanda Lima foi conferida com carregamento real no navegador, junto com a
exibição das iniciais dos demais perfis sem imagem.

### Validação das informações iniciais

Antes de abrir a seleção de colaboradores, título e descrição devem ter ao
menos três caracteres após desconsiderar espaços nas bordas. O título aceita
até 255 caracteres. NR e link permanecem opcionais; quando preenchido, o link
deve ser HTTP(S), ter endereço válido, não conter espaços e ter até 2048
caracteres. A tentativa de avanço exibe mensagens junto aos campos e move o
foco ao primeiro erro. As mensagens acompanham as correções do usuário.
Essa validação também é aplicada antes do envio à API.

Conferido no localhost: campos vazios mantêm a primeira etapa, o foco passa
ao primeiro erro, link incompleto bloqueia o avanço e dados válidos liberam
a seleção de colaboradores. Nenhum evento foi salvo nesse teste.

### Perfis na seleção de participantes

O seletor de eventos inclui COLABORADOR, GESTOR e GESTOR_WORKSPACE ativos e elegíveis para a NR no mesmo workspace. O criador permanece excluído, tanto na consulta quanto na gravação, conforme a regra confirmada. A permissão `canManage` refere-se à edição do cadastro da pessoa e não restringe sua participação em eventos. `useEventCandidates` mantém todos os candidatos retornados por `/events/eligible-candidates`; o backend continua responsável por elegibilidade e escopo.

Outras seleções mantêm suas finalidades: conformidades incluem os três perfis e a própria conta; promoção a gestor oferece somente colaboradores ativos que ainda não são gestores, excluindo o próprio responsável do workspace.

## Ajustes de edição e calendário

Ao solicitar a edição, o painel informa que o evento não pode ser editado
quando uma turma de um evento ativo está em andamento. O bloqueio considera
o início inclusivo e o término exclusivo de cada turma e é conferido novamente
ao salvar. Fora desse intervalo, as permissões retornadas pela API continuam
sendo aplicadas.

Cada dia exibe no máximo três indicadores no calendário mensal e nos meses
da visão anual. A visão semanal e a busca continuam usando todos os eventos.
O botão Distribuir aleatoriamente usa um ícone de dado.
