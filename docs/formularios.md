# Formulários

As telas /mainFormScreen, /createForms e /editForms?id={UUID} usam a API principal, o token Firebase da sessão e VITE_API_URL. Em desenvolvimento, as chamadas passam pelo proxy /api.

| Operação | Endpoint | Comportamento |
| --- | --- | --- |
| Listar | GET /forms | Busca de até 240 caracteres, filtro por status e paginação no servidor iniciada em zero. |
| Consultar | GET /forms/{id} | Carrega a edição pelo UUID da URL, inclusive após recarregar a página. |
| Criar | POST /forms | Cria pendente após validação; salvar rascunho aceita conteúdo incompleto e persiste na API. |
| Editar | PUT /forms/{id} | Substitui dados e perguntas, mantendo status, IDs existentes e ordem. Itens novos e cópias omitem IDs. |
| Excluir | DELETE /forms/{id} | Aguarda confirmação e resposta 204 antes de atualizar a lista. |
| Publicar | POST /forms/{id}/publish | Para rascunhos: valida, salva e publica o conteúdo persistido. |
| Destinatários | GET /forms/recipients | Consulta gestores elegíveis; o contrato está em backend/destinatarios-formularios.md. |

## Contratos e validação

Os DTOs usam title, description, managerId, nrCode, unitId, dueDate, status e questions. A interface converte draft, pending e completed para RASCUNHO, PENDENTE e CONCLUIDO. Campos de texto, opção, foto e data correspondem aos tipos de pergunta. NR e unidade são vínculos do formulário. Campos opcionais vazios são enviados como null, permitindo remover vínculos e prazo; respostas, remetente, workspace e datas de auditoria não são enviados.

Sem filtro de status, a listagem consulta os estados Rascunho, Pendente e Respondido nessa ordem e compõe as páginas sem carregar todos os formulários. Os totais consideram os três estados. O valor enviado à API para filtrar respondidos é `CONCLUIDO`. A busca e o cancelamento de consultas anteriores são mantidos. No menu de um formulário respondido, as ações são **Cancelar** e **Ver respostas**; editar, personalizar e excluir aparecem nos demais estados.

Perguntas aceitam até 140 caracteres. Alternativas aceitam até 100 itens de 80 caracteres, com no máximo uma opção Outros. Fotos aceitam até 10 arquivos nos limites configurados para o formulário: 5, 10, 20, 50 ou 100 MB. Esses endpoints não fazem upload de respostas.

O seletor pesquisável de destinatários aceita GESTOR e GESTOR_WORKSPACE. A resposta contém currentManagerId e itens com ID, nome e unidade. A própria conta é excluída pelo servidor e novamente filtrada no web. Não há entrada manual de IDs. Erro de consulta mantém o conteúdo e permite nova tentativa.

Unidades vêm de GET /units. As NRs vêm de GET /units/{id}/nrs, usando uma unidade ativa do workspace e o catálogo de usabilidade Empresa. O campo ativo indica associação à unidade; NRs de empresa ainda não associadas continuam elegíveis. Não há fallback para o catálogo geral. Vínculos históricos fora do catálogo permanecem identificados pelo ID e exigem selecionar uma NR elegível ou remover o vínculo antes de salvar.

Formulários concluídos ou com respostas ficam disponíveis somente para consulta; a listagem não oferece exclusão para CONCLUIDO. A API valida remetente, escopo, respostas e concorrência. Erros 403, 404 e 409 mantêm o conteúdo. Em conflito, a recarga é explícita e pede confirmação antes de descartar alterações. Se o rascunho for salvo mas a publicação falhar, os IDs persistidos são mantidos para nova tentativa.

Rascunhos novos são salvos na API. O editor não carrega rascunhos antigos compartilhados em localStorage e não migra esse conteúdo.

## Respostas

A análise de respostas está descrita em validacao-formularios.md. A aparência do formulário e os nomes físicos da coleção MongoDB são documentados ali; os DTOs HTTP continuam em camelCase.
