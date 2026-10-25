# SCRUM-619 — Contrato WEB/API das NRs

A implementação dos endpoints está no repositório `Astro-Inter/astro-api`, tarefa [SCRUM-619](https://luizacursino.atlassian.net/browse/SCRUM-619). O WEB pertence à [SCRUM-618](https://luizacursino.atlassian.net/browse/SCRUM-618).

## Configuração e permissões

`VITE_API_URL` define a base HTTP. O build do site recebe essa variável do ambiente de publicação. Não existe URL fixa de localhost no adaptador. A API é usada por padrão; `VITE_NR_DATA_MODE=demo` é uma opção explícita somente para desenvolvimento.

As páginas usam `/admin/nrs/pending`, `/admin/nrs/pending/:id` e `/admin/nrs/catalog`. O contrato HTTP da API mantém os caminhos abaixo. Toda chamada envia token Firebase; o backend exige ADMIN. A confirmação do perfil no `/verify-email` retorna `userType: ADMIN` e `userStatus: null` para contas administrativas.

## Endpoints

Todas as respostas usam `ApiResult`. Listagens retornam snapshots com `{document, revision, approvedRevision}`. `document` contém os campos MongoDB em português. `revision` identifica o documento completo; `approvedRevision` identifica a versão publicada ou vale `absent` quando não existe.

| Método | Caminho | Operação |
| --- | --- | --- |
| GET | `/admin/nrs/pendentes` | Listar análises pendentes |
| GET | `/admin/nrs/pendentes/{id}` | Consultar análise e revisões |
| GET | `/admin/nrs/catalogo` | Listar versões publicadas |
| GET | `/admin/nrs/catalogo/{id}` | Consultar versão publicada |
| PUT | `/admin/nrs/catalogo/{id}` | Salvar `{revision, content}` |
| POST | `/admin/nrs/pendentes/{id}/aprovar` | Aprovar `{revision, approvedRevision, corrections?}` |

`content` e `corrections` incluem apenas `nome`, `descricao`, `objetivo`, `aplicabilidade`, `usabilidade`, `revogada` e `tempo_reciclagem_meses`. O servidor preserva número, criação e data da fonte. A edição do catálogo não altera a pendência. A aprovação publica e remove o candidato em uma transação MongoDB; requer replica set ou cluster com suporte a transações.

A aprovação retorna também `sqlSynchronized`. Depois da publicação, o backend chama `ler_json_nr` para atualizar `nr_catalogo`. Se falhar, mantém um job persistente para repetição automática e retorna `false`. O WEB informa a pendência sem solicitar outra aprovação. MongoDB e PostgreSQL não compartilham uma transação distribuída. Editar diretamente o catálogo não cria um job SQL próprio nesta entrega.

## Falhas e concorrência

- 400: campos inválidos.
- 401: sessão ausente ou expirada.
- 403: perfil sem permissão.
- 404: documento não encontrado ou recurso indisponível. Ausência de versão publicada é tratada na comparação de uma NR nova.
- 409: revisão alterada ou aprovação repetida; o usuário deve reabrir a revisão.
- 429 e 5xx: orientação para aguardar e tentar novamente, sem expor detalhes internos.

Falhas preservam os valores do formulário para nova tentativa. O cliente mantém a revisão do documento originalmente consultado, evitando sobrescrita silenciosa de alterações concorrentes.

## Implantação e testes

Publicar a API da SCRUM-619 e conferir `VITE_API_URL` antes de validar a integração do WEB. No backend, a procedure `ler_json_nr(text)`, a chave única de `nr_catalogo.codigo_nr` e as permissões de escrita e transação MongoDB devem existir. A fila `nr_catalog_sql_sync` é gerenciada pelo backend.

Os testes de escrita da integração usaram MongoDB e PostgreSQL locais isolados e descartáveis. Não são necessárias credenciais ou URLs de teste na publicação do WEB. Consulte os comandos e requisitos dos testes de banco em `docs/api-nr-review.md` da API.
