# SCRUM-618 — Revisão e catálogo de NRs

A área administrativa permite consultar análises geradas pela IA, comparar com a versão publicada, corrigir campos antes de aprovar e consultar ou editar o catálogo atual.

## Acesso e rotas

| Página | URL |
| --- | --- |
| Aguardando revisão | `/admin/nrs/pending` |
| Revisão individual | `/admin/nrs/pending/:id` |
| Catálogo atual | `/admin/nrs/catalog` |

O acesso exige sessão Firebase e perfil ADMIN. O destino após login ADMIN é a lista de pendências. O header mostra somente a marca e a saída da conta; menus de workspace não são exibidos. O backend repete a autorização em todas as operações. A identificação de ADMIN no `/verify-email` aceita `userStatus: null`, conforme o contrato de contas técnicas da API.

## Interface

- Listagem com busca por número ou nome, filtros de usabilidade e revogação e limpeza dos filtros. Pendências têm paginação de cinco registros; o catálogo tem altura limitada, rolagem interna e cabeçalho fixo.
- Revisão em popup, preservando os filtros da listagem ao fechar. Campos alterados são comparados com a versão publicada, com filtro para mostrar somente alterações. A data da fonte é preservada, mas não aparece na comparação.
- Edição de nome, descrição, objetivo, aplicabilidade, usabilidade, revogação e tempo de reciclagem. Número, criação e data da fonte permanecem imutáveis no servidor.
- Aprovação com confirmação e notificação de sucesso, link para o catálogo e indicação de sincronização SQL pendente quando necessário.
- Carregamento, ausência de dados e erros com ação de nova tentativa; mensagens de conexão, sessão, permissão, conflito e indisponibilidade são apresentadas em linguagem simples.

## Configuração

A API é o padrão. `VITE_API_URL` fornece a base HTTP pelo `.env` ou pelas variáveis do build. No desenvolvimento, o proxy `/api` usa essa URL; no build publicado, o cliente usa a URL diretamente. Os endpoints devem ser publicados antes ou junto com o WEB. A integração da API está documentada em [integração das NRs](integracao-nrs-scrum619.md).

Somente no desenvolvimento, `VITE_NR_DATA_MODE=demo` seleciona exemplos em memória. Nesse modo, gestores autenticados podem visualizar as telas de demonstração. O build de produção sempre usa API e exige ADMIN. Parâmetros `scenario` não concedem permissões nem ativam a demonstração.

Os cenários `normal`, `empty`, `load-error`, `approval-error` e `slow` podem ser selecionados por `?scenario=...` no modo demo. Dados simulados são isolados por sessão e não persistem após recarregar.

## Validação

`npm test`, `npm run lint` e `npm run build`. Os testes cobrem acesso ADMIN, contrato de autenticação, filtros, popup de revisão, comparação, edição, aprovação, concorrência, retorno da sincronização SQL e mensagens de erro. Lint mantém dois avisos preexistentes em workspaceCodeForm e useAstroChatController.

Foi conferido o fluxo HTTP integrado com bancos isolados, incluindo gravação e conflitos. A consulta ao MongoDB real também foi conferida sem escritas de teste no banco compartilhado. A inspeção visual posterior ficou limitada pela disponibilidade do navegador; não há certificação completa de leitor de tela ou WCAG.
