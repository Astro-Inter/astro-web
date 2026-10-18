# Formulários — SCRUM-573

As telas `/mainFormScreen`, `/createForms` e `/editForms?id=<UUID>` usam os seis endpoints de formulários da API principal, com o Firebase ID token da sessão atual e a URL `VITE_API_URL` já configurada no projeto. No desenvolvimento, o proxy `/api` do Vite continua sendo usado.

Contrato conferido no [Swagger](https://astro-api-h2hx.onrender.com/swagger-ui/index.html) e na [documentação da API](https://github.com/Astro-Inter/astro-api/blob/main/docs/forms.md).

| Operação | Endpoint | Comportamento no web |
| --- | --- | --- |
| Listar | `GET /forms` | Busca de até 240 caracteres, filtro por status e paginação no servidor, começando em zero. Consultas anteriores são canceladas. |
| Consultar | `GET /forms/{id}` | A edição carrega o formulário pelo UUID da URL, inclusive após atualizar a página. |
| Criar | `POST /forms` | Cria pendente após validação; “Salvar rascunho” permite conteúdo incompleto e persiste na API. |
| Editar | `PUT /forms/{id}` | Substitui os dados e as perguntas, mantendo o status, os IDs existentes e a ordem da tela. Cópias e itens novos omitem IDs. |
| Excluir | `DELETE /forms/{id}` | Aguarda a confirmação e a resposta 204 antes de anunciar sucesso e consultar novamente a lista. |
| Publicar | `POST /forms/{id}/publish` | Disponível na edição de rascunhos. Valida os campos obrigatórios, salva primeiro e publica o conteúdo persistido. |
| Destinatários | `GET /forms/recipients` | Contrato preparado para os dois perfis de gestor, excluindo a própria conta. Depende da publicação do endpoint na API. |

Os DTOs usam `title`, `description`, `managerId`, `nrCode`, `unitId`, `dueDate`, `status` e `questions`. A interface converte `draft`, `pending` e `completed` para `RASCUNHO`, `PENDENTE` e `CONCLUIDO`. Texto, opção, foto e data correspondem a `texto`, `alternativa`, `foto` e `data`. NR e unidade são vínculos do formulário. Campos opcionais vazios vão como `null`, permitindo remover vínculos e prazo na edição. Respostas, remetente, workspace e datas de auditoria não são enviados.

Perguntas aceitam até 140 caracteres; alternativas, até 100 opções de 80 caracteres, com no máximo uma opção Outros; fotos, até 10 arquivos com limites de 5, 10, 20, 50 ou 100 MB. Não há upload de respostas por esses endpoints.

## Permissões e limitações da API

O seletor pesquisável de gestores usa `GET /forms/recipients` para os perfis `GESTOR` e `GESTOR_WORKSPACE`. A resposta contém `currentManagerId` e `items`, com `id`, `name` e `unitName`. O próprio gestor é excluído no servidor e também no web, inclusive se houver uma seleção anterior. Não há entrada manual de IDs. Se não existir outro gestor ativo, a tela informa isso; se a consulta falhar, mostra erro com nova tentativa sem apagar os demais campos.

**Dependência de publicação:** essa rota ainda não faz parte da versão da API consultada nesta tarefa. A implementação e os testes do backend estão no [patch de destinatários](backend/destinatarios-formularios.patch), com [instruções de aplicação](backend/destinatarios-formularios.md). Até a publicação desse ajuste no backend usado por `VITE_API_URL`, o seletor exibe o erro de carregamento. Não há lista fictícia ou ampliação de acesso ao endpoint administrativo `/managers`.

Unidades vêm de `GET /units`. As NRs são carregadas por `GET /units/{id}/nrs`, usando uma unidade ativa do workspace: esse catálogo retorna somente NRs de usabilidade **Empresa**. O campo `ativo` indica associação à unidade e não restringe as opções do formulário; NRs de empresa ainda não associadas também podem ser escolhidas. Não se usa o catálogo geral `/nrs` como alternativa. Sem unidade ativa, o seletor fica sem NRs; falhas do catálogo são tratadas como erro de carregamento.

Unidades salvas fora do catálogo continuam identificadas pelo ID para revisão. Gestores indisponíveis, a própria conta e NRs fora do catálogo Empresa não são reintroduzidos nos seletores. NRs antigas incompatíveis apresentam aviso e exigem selecionar uma NR de empresa ou remover o vínculo antes de salvar. A API valida novamente a elegibilidade no salvamento e na publicação, incluindo revogação de NRs.

Formulários concluídos ou com respostas ficam disponíveis somente para consulta no editor. Na listagem, o status concluído impede a exclusão. Outras restrições de remetente, escopo, respostas e concorrência são verificadas pelo servidor; erros 403, 404 e 409 mantêm o conteúdo na tela. O editor oferece recarga explícita para consultar novamente após conflito, com confirmação antes de descartar alterações. Voltar e recarregar usam os componentes de botão Astro, contorno e ícones existentes. Se a gravação do rascunho funcionar e a publicação falhar, os IDs persistidos são mantidos para nova tentativa.

Rascunhos novos são salvos na API. O editor não carrega o antigo rascunho compartilhado no `localStorage`, evitando reaproveitar conteúdo de outra sessão; não há migração automática desse dado local.

## Verificação e critérios DAD

- M01–M05: contratos em `src/types/forms.ts`, comunicação em `src/services/forms.ts`, conversões em `src/utils/formApi.ts`, estado remoto em hooks e campos compartilhados em componente de apresentação. Novos arquivos de `src/` são TypeScript; estilos ficam fora de `src/`.
- M06–M08: atualizações imutáveis, dependências explícitas e IDs estáveis para perguntas e opções. Cópias recebem novos UUIDs locais; o envio usa IDs numéricos apenas para itens já persistidos.
- M09–M10: navegação por React Router; o editor valida o UUID recebido na query string, sem depender do estado de navegação. Não foi adicionado parâmetro de caminho.
- M11–M12: rótulos de campos, controles nativos, bloqueio durante gravação, carregamento e erros no DOM, confirmação assíncrona e anúncio de sucesso. Testes DOM cobrem os fluxos; contraste, inspeção visual em navegador autenticado e navegação completa com teclado/leitor de tela permanecem para verificação manual.
- E03, E07, E08 e E09: cancelamento de leituras e escritas, descarte de respostas de outra sessão, renderização por JSX, validação antes do serviço e rotas privadas existentes.
- M13 e M14: publicação e requisitos globais do histórico não foram auditados. Os commits desta integração seguem o padrão Astro Git, com datas reais; isso não comprova os requisitos globais de publicação e distribuição do histórico por quatro semanas.

`tests/forms.test.cjs` cobre os seis endpoints, DTOs, autenticação, validação, preservação de IDs, vínculos e erros. `tests/formsUi.test.cjs` cobre carregamento, salvamento, publicação, rascunhos, exclusão, paginação, recuperação de erros, cancelamento e troca de sessão com React e JSDOM. As chamadas nesses testes são simuladas; operações autenticadas contra o ambiente Render precisam ser conferidas com uma conta de teste autorizada.
