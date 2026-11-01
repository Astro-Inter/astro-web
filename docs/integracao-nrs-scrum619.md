# Contrato WEB/API do catálogo de NRs

A interface administrativa consulta e edita análises pendentes e o catálogo publicado de NRs. A API usa VITE_API_URL; todas as chamadas enviam o token Firebase e exigem perfil ADMIN. O endpoint /verify-email identifica contas administrativas com userType: ADMIN e userStatus: null.

## Endpoints

As respostas usam o envelope ApiResult. Listagens retornam snapshots {document, revision, approvedRevision}. revision identifica o documento completo; approvedRevision identifica a versão publicada ou vale absent quando não há publicação.

| Método | Caminho | Operação |
| --- | --- | --- |
| GET | /admin/nrs/pendentes | Listar análises pendentes. |
| GET | /admin/nrs/pendentes/{id} | Consultar análise e revisões. |
| GET | /admin/nrs/catalogo | Listar versões publicadas. |
| GET | /admin/nrs/catalogo/{id} | Consultar versão publicada. |
| PUT | /admin/nrs/catalogo/{id} | Salvar {revision, content}. |
| POST | /admin/nrs/pendentes/{id}/aprovar | Aprovar {revision, approvedRevision, corrections?}. |

content e corrections podem conter nome, descrição, objetivo, aplicabilidade, usabilidade, revogação e tempo de reciclagem. O servidor preserva número, criação e data da fonte. Editar o catálogo não altera uma análise pendente.

A aprovação publica a revisão e remove o candidato em transação MongoDB, portanto o MongoDB precisa suportar transações. Em seguida, a API chama ler_json_nr para atualizar nr_catalogo. O campo sqlSynchronized informa o resultado. Se a sincronização falhar após a publicação, um job persistente permite nova tentativa; a interface sinaliza a pendência e não solicita outra aprovação. Editar diretamente o catálogo não cria job próprio de sincronização SQL.

## Erros e concorrência

- 400: campos inválidos.
- 401: sessão ausente ou expirada.
- 403: perfil sem permissão.
- 404: documento inexistente ou recurso indisponível; ausência de versão publicada é tratada na comparação de uma NR nova.
- 409: revisão alterada ou aprovação repetida; reabrir a revisão para buscar o estado atual.
- 429 e 5xx: erro recuperável, sem expor detalhes internos.

O cliente mantém a revisão consultada para evitar sobrescrita silenciosa. Falhas preservam os valores editados para nova tentativa.

## Configuração da interface

As rotas são /admin/nrs/pending, /admin/nrs/pending/:id e /admin/nrs/catalog. A URL da API é definida por VITE_API_URL. Em desenvolvimento, VITE_NR_DATA_MODE=demo habilita dados em memória; a demonstração não persiste após recarregar. O build de produção usa a API e exige ADMIN.

A procedure ler_json_nr(text), a chave única nr_catalogo.codigo_nr, permissões de escrita e suporte a transações MongoDB são dependências da API.
