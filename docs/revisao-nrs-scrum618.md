# Revisão e catálogo de NRs

A área administrativa permite consultar análises geradas por IA, compará-las com a versão publicada, corrigir campos antes de aprovar e consultar ou editar o catálogo atual.

## Rotas e acesso

| Página | URL |
| --- | --- |
| Pendências | /admin/nrs/pending |
| Revisão individual | /admin/nrs/pending/:id |
| Catálogo atual | /admin/nrs/catalog |

O acesso exige sessão Firebase e perfil ADMIN. Após login ADMIN, o destino é a lista de pendências. O header apresenta a marca e a saída da conta; menus de workspace não são exibidos. O backend valida o perfil em cada operação. A identificação no /verify-email aceita userStatus:null para contas administrativas.

## Interface

- A lista permite busca por número ou nome, filtros de usabilidade e revogação e limpeza dos filtros. Pendências usam páginas de cinco registros; o catálogo tem rolagem interna e cabeçalho fixo.
- A revisão abre em popup e conserva os filtros ao fechar. Campos editados são comparados com a versão publicada; a data da fonte não faz parte da comparação.
- São editáveis nome, descrição, objetivo, aplicabilidade, usabilidade, revogação e tempo de reciclagem. Número, criação e data da fonte são preservados pelo servidor.
- Aprovar exige confirmação. A resposta inclui o estado da sincronização SQL; quando ela está pendente, a interface sinaliza sem pedir nova aprovação.
- Carregamento, ausência de dados e erros de conexão, sessão, permissão, conflito ou indisponibilidade mostram estados e ações apropriados.

## Configuração e modo de demonstração

VITE_API_URL define a base HTTP. O proxy /api é usado em desenvolvimento; o build publicado usa a URL diretamente. Os endpoints do backend estão descritos em integracao-nrs-scrum619.md.

Somente em desenvolvimento, VITE_NR_DATA_MODE=demo seleciona dados em memória. Os cenários normal, empty, load-error, approval-error e slow podem ser selecionados por ?scenario=.... Dados demo são isolados por sessão e não persistem após recarregar. O build de produção usa a API e exige ADMIN.
