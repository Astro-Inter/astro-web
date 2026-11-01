# Eventos

A página /mainEventScreen consulta eventos do workspace autenticado. As chamadas usam VITE_API_URL, o proxy /api em desenvolvimento e o token Firebase da sessão. Os contratos do backend estão descritos no [Swagger da API](https://astro-api-h2hx.onrender.com/swagger-ui/index.html) e em [api-events.md](https://github.com/Astro-Inter/astro-api/blob/main/docs/api-events.md).

## Operações administrativas

| Operação | Endpoint |
| --- | --- |
| Consultar calendário por intervalo | GET /events?startDate=...&endDate=... |
| Consultar evento e permissões | GET /events/{eventId} |
| Buscar participantes elegíveis por NR | GET /events/eligible-candidates?nrId=... |
| Criar evento, turmas e participantes | POST /events |
| Editar campos permitidos e turmas futuras | PATCH /events/{eventId} |
| Inativar evento com justificativa | PATCH /events/{eventId}/cancellation |
| Consultar NRs, cargos e opções de NR por cargo | GET /nrs, GET /roles, GET /roles/{roleId}/nrs/options |

O calendário usa datas locais, sem conversão para UTC, e inclui os dias adjacentes visíveis no mês. Turmas que atravessam vários dias aparecem em cada dia do intervalo. Após gravação confirmada, a tela consulta novamente o calendário; se essa leitura falhar, oferece nova tentativa sem repetir a gravação.

As flags canEdit, canCancel, detailsEditable e editable controlam as ações. O frontend não compara UID Firebase com ID numérico de gestor. Turmas iniciadas e seus participantes ficam bloqueados; turmas futuras podem ser adicionadas, alteradas ou removidas. O PATCH conserva IDs existentes e envia somente campos editáveis. Descrição histórica e segundos dos horários são preservados quando não mudam.

O catálogo de eventos usa codigo_nr como nrId. A criação exibe somente NRs de usabilidade Colaborador, obtidas pelas opções de um cargo real e cruzadas com /nrs para manter IDs e títulos. O campo active indica vínculo com o cargo, não disponibilidade no catálogo. Sem cargos ou opções elegíveis, a lista permanece vazia, sem fallback para o catálogo geral. NRs históricas ausentes do catálogo filtrado são preservadas somente na edição bloqueada. A opção Sem NR continua disponível.

Modalidade híbrida e dados profissionais ausentes não recebem valores fictícios. Participantes históricos continuam visíveis no detalhe mesmo quando não fazem mais parte da lista de elegíveis. A seleção inclui COLABORADOR, GESTOR e GESTOR_WORKSPACE ativos e elegíveis no mesmo workspace. canManage controla edição do cadastro da pessoa, não sua participação no evento; o backend define elegibilidade e escopo e exclui o criador na consulta e na gravação.

## Formulários e regras

Título, descrição, link, conclusão, evidência, distribuição e horários são validados antes do envio. Título aceita até 255 caracteres; título e descrição exigem três caracteres após aparar espaços. Link é opcional e, quando preenchido, deve ser HTTP(S), válido, sem espaços e ter até 2048 caracteres. Cada turma exige ao menos um participante.

Os modais aguardam a API antes de fechar. Erros mantêm os dados e permitem nova tentativa; envios repetidos são bloqueados. Leituras antigas e escritas pendentes são canceladas ao desmontar ou trocar de sessão.

**Inativar** cancela o evento definitivamente, sem reativação. A justificativa tem de 3 a 1000 caracteres e é enviada como JSON com a propriedade reason.

O calendário mensal e os meses da visão anual exibem até três indicadores por dia. A visão semanal e a busca usam todos os eventos. O ícone de distribuição aleatória está em public/icons/diceFigma.svg.

## Fotos dos participantes

Os endpoints de eventos não incluem a foto. useEventCollaboratorPhotos consulta /collaborators ao abrir o fluxo ou detalhe e relaciona perfis pelo ID. Trocar filtros não repete a consulta. A foto HTTPS é exibida com carregamento lazy; URL ausente, inválida ou com falha usa iniciais. Erro na consulta de fotos não bloqueia a seleção. Troca de sessão ou desmontagem cancela a leitura e descarta respostas tardias.

## Aplicativo do colaborador

src/services/events.ts também implementa GET /events/collaborator, GET /events/collaborator/{eventId} e POST /events/{eventId}/completion. A conclusão envia arquivos na parte files de multipart, até três arquivos de 50 MB cada. Esses serviços não são usados pela tela administrativa. O backend aplica elegibilidade, exigência de evidência, período de envio e estado da solicitação.

Os testes associados ao contrato, controle assíncrono, interface e regras de edição estão em tests/events.test.cjs, tests/eventsController.test.cjs, tests/eventsUi.test.cjs e tests/eventEditing.test.cjs.
