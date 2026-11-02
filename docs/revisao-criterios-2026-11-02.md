# Revisão conservadora dos 24 critérios — 02/11/2026

Esta revisão considera o enunciado de 14/05/2026, a árvore local atual e os registros das demonstrações anteriores. Não é uma previsão da nota nem da decisão de outro avaliador. A revisão não alterou a implementação ou o design.

## Como ler o resultado

- **Atendido:** há evidência de implementação e verificação suficiente no escopo descrito. O grupo ainda precisa explicar e demonstrar o que o enunciado pede na apresentação.
- **Parcial:** existe uma exceção concreta, uma entrega pendente ou comprovação incompleta de uma parte do requisito. A coluna de evidência distingue esses casos; não significa necessariamente defeito funcional.
- **Não feito:** não há implementação identificada. Nenhum dos 24 requisitos está inteiramente ausente.

Os resultados anteriores de teclado e NVDA continuam válidos. Aprovar 53 cenários com o leitor não demonstra, por si só, todos os critérios de WCAG 2.1 AA em todas as telas. Por isso o status integral e conservador de acessibilidade é separado da aprovação daqueles percursos.

## Mínimo para 7,0

| ID | Requisito | Status | Evidência ou ressalva |
| --- | --- | --- | --- |
| M01 | Vite, React e TypeScript; somente ts/tsx em src | Atendido | 473 arquivos examinados: 241 `.ts` e 232 `.tsx`, nenhum outro formato. Vite/React/TypeScript configurados e compilação aprovada. |
| M02 | Componentes e páginas em pastas próprias com index.tsx | Atendido | Os 180 arquivos TSX de componentes e os 44 de páginas seguem essa convenção. Arquivos `index.ts` são exportadores. |
| M03 | Seis componentes e responsabilidade única | Parcial — leitura estrita | Existem mais de seis componentes independentes, e nenhum arquivo de `components/` importa serviços. Porém páginas também são componentes React: `workspaceDashboards` combina JSX, regras de edição e chamadas a serviços; `mainDashboardsScreen` também chama serviço durante a carga. A interpretação anterior permitia essa orquestração nas páginas; isso não elimina o risco sob a frase literal “nenhum componente”. |
| M04 | Interfaces, entidades em types e ausência de any | Atendido | Nenhum nó `AnyKeyword` encontrado. Props declaradas por interfaces, entidades por domínio em `types`, TypeScript estrito e lint aprovado. Interfaces locais de props não são entidades de domínio. |
| M05 | APIs em services, Promise tipada, try/catch e ambiente | Parcial — exceção literal | As 21 chamadas diretas a fetch estão em services e possuem contratos tipados no fluxo. O helper `request` de `nrReviewApi.ts` usa `.catch()` para tratar token, fetch e JSON, sem bloco `try/catch`. O tratamento existe, mas a sintaxe expressamente pedida não é seguida nesse recurso. Nenhum arquivo `.env`, `.env.local` ou `.env.production` aparece no histórico consultado; exemplos de configuração não são credenciais privadas. |
| M06 | useState, campos agrupados e imutabilidade | Atendido | Formulários e estados relacionados agrupados em hooks e objetos. As ocorrências de push/splice/sort examinadas alteram coleções locais ou cópias, não os arrays de estado originais. Exemplos: `useLogin`, `useWorkspaceAddresses`, `useAddressForm`, `useQuestionReorder` e `useDashboardReorder`. |
| M07 | useEffect com dependências explícitas e corretas | Atendido na verificação estática | Nenhum efeito sem segundo argumento. Lint com `react/exhaustive-deps` aprovado, com limpezas de consultas, timers e listeners nos fluxos examinados. A demonstração removendo uma dependência continua sendo uma atividade da apresentação. |
| M08 | Chaves estáveis em listas dinâmicas | Atendido | Entidades, perguntas, opções, filtros e gráficos editáveis usam IDs. Os índices encontrados correspondem a skeletons, posições fixas de calendário e trechos de respostas somente para leitura. |
| M09 | useParams com tratamento de undefined | Atendido | `pendingNrList` testa `routeId === undefined` antes de chamar `parseNrId`, que também trata identificadores inválidos. |
| M10 | React Router, navegação interna e rota curinga | Atendido | Mais de três rotas, Link/useNavigate, rota `*` e página de erro com retorno. Não há `window.location.href`. `window.location.reload()` no erro de carregamento não é o mecanismo de navegação normal. |
| M11 | Acessibilidade mínima AA | Parcial — comprovação global | Rótulos, alternativas de imagens, alertas, foco e teclado foram verificados nos percursos registrados. Não foram encontrados divs com onClick; os cliques em dialog tratam o backdrop e têm alternativas de teclado. Contraste dos tokens compartilhados é testado, mas o relatório não comprova todas as combinações reais de texto/fundo/estado. Não foi feita nova certificação global de AA nesta reavaliação. |
| M12 | Carregando, sucesso e erro no DOM | Atendido nos fluxos revisados | Fallback de Suspense, consultas, autenticação, formulários, CRUDs e dashboards possuem carregamento, conteúdo/resultado de sucesso e erro visível. Testes exercitam falha, recuperação e preservação de dados. Nenhum alert() ou console.log foi encontrado como tratamento de operação em src. |
| M13 | Publicação e link no README | Parcial — entrega da revisão | O site existe, o README contém o link e a consulta de 02/11 retornou HTTP 200, raiz e assets. Há arquivos modificados e não rastreados nesta árvore local, incluindo correções verificadas; essa árvore ainda não integra o commit que o workflow publica. A existência do site está atendida; a entrega da versão revisada não está concluída. |
| M14 | Vinte Conventional Commits por quatro semanas, sem genéricos | Parcial — leitura literal | Há 165 mensagens feat/fix/refactor/docs entre 16/09 e 02/11/2026, cobrindo 47 dias: quantidade e período atendidos. Permanece `Initial commit`, além das mensagens automáticas de merge fora desses prefixos. Excluir o registro inicial da contagem não elimina sua existência diante da proibição literal de commits genéricos. Não foi reescrito o histórico. |

## Extras

| ID | Requisito | Status | Evidência ou ressalva |
| --- | --- | --- | --- |
| E01 | Context API, Provider e hook tipado | Atendido | Provider, contexto e hook próprios do cadastro. Empresa, planilha e endereços compartilham o rascunho sem repassar props por toda a árvore. O grupo precisa explicar esse caso. |
| E02 | useReducer e State/Action em unions | Atendido | `registrationReducer` e `RegistrationState`/`RegistrationAction` implementam transições de carga, erro e sucesso, evitando combinações contraditórias. O provider realmente utiliza o reducer. |
| E03 | Hook tipado com loading, erro e AbortController | Atendido | `useFormEditor` e `useExplorerPreview` possuem retorno tipado, cancelamento e verificações antes de publicar resultados. Há regressões de desmontagem e mudança de dados/sessão. |
| E04 | lazy/Suspense por página | Atendido | Imports lazy e fronteira de Suspense no roteador; build produz chunks. A verificação de produção local da carga adiada foi registrada anteriormente. O grupo precisa mostrar a Network na apresentação. |
| E05 | localStorage com schema versionado | Atendido para os dados persistidos examinados | Preferências, rascunho de formulário e snapshot do VLibras possuem `_versao`, validação e migração/descarte conforme o recurso. Dashboards reconhecem `_versao` e o legado schemaVersion, preservando dados inválidos sem sobrescrita. O marcador auxiliar `:migrado` é uma flag de migração, não um objeto de dados do usuário. |
| E06 | useMemo/useCallback justificados e comparação no Profiler | Atendido na evidência registrada | Memoização real no gráfico e referências estáveis nos efeitos. `desempenho-dad.md` registra comparação via API e na interface oficial React DevTools, incluindo limites da medição. O grupo ainda deve reproduzir/explicar ao vivo. |
| E07 | Proteção contra XSS na renderização | Atendido nos caminhos examinados | Nenhuma ocorrência de dangerouslySetInnerHTML, innerHTML, insertAdjacentHTML, document.write ou eval em src. Conteúdo externo interpolado em JSX; validação de respostas e URLs nos caminhos revisados. Isso não é uma auditoria completa de segurança do backend. |
| E08 | Validação/sanitização tipada em utils antes do serviço | Parcial — cobertura da regra literal | Há validadores por domínio e testes extensos. Entretanto, ao renomear uma visão no dashboard, `saveName` chama `persist`, que faz verificações inline e chama `saveDashboard`; a validação completa é feita por `cleanDraft` dentro do serviço. Esse caminho não centraliza toda a validação da entrada em uma função tipada de utils antes de chamar o serviço, como pede o enunciado. |
| E09 | PrivateRoute com autenticação via Context | Atendido | Guarda dedicada usando `useAuthentication`, com estados de sessão, redirecionamento e permissões. As páginas não substituem a guarda por uma autenticação independente. |
| E10 | AA avançado completo e leitor de tela | Parcial — alcance integral de AA | Modais, menus, seletores, calendário, gráfico e chat têm implementação e evidências de teclado/foco; 53 verificações distintas tiveram anúncios válidos do NVDA. A pendência do teste com leitor foi resolvida. Isso não substitui a avaliação de todo o conjunto WCAG 2.1 AA, incluindo os limites de contraste descritos em M11 e todos os estados fora da amostra. |

## Evidências concretas para conferir no código

1. M03: `src/pages/workspaceDashboards/index.tsx:22` importa os serviços; `persist`, `updateWidget`, `saveName`, exclusão e o JSX permanecem no mesmo componente. `src/pages/mainDashboardsScreen/index.tsx:19` inicia consulta diretamente na página.
2. M05: `src/services/nrReviewApi.ts:18`, `:22`, `:26` e `:33`: tratamento por `.catch()`, sem `try/catch` no helper.
3. E08: `src/pages/workspaceDashboards/index.tsx:131` e `:163`; `src/services/dashboardStorage.ts:21` e `:89`. Há validação, mas a divisão entre utils, página e serviço não segue integralmente a exigência.
4. M11/E10: [Acessibilidade mínima](acessibilidade-minima-2026-11-02.md) e [Acessibilidade avançada](acessibilidade-avancada-2026-11-02.md) delimitam o que foi testado e o que não foi certificado globalmente.
5. M13: `git status --short` mostra alterações locais, inclusive arquivos ainda não rastreados; `.github/workflows/pages.yml` publica código de commit da main.
6. M14: `git log --format="%ad %s" --date=short` permite reproduzir a contagem e conferir o registro inicial. O tipo ci é Conventional Commits válido, embora não tenha sido incluído na contagem dos quatro tipos enumerados acima.

## Verificação desta reavaliação

- Varredura sintática dos 473 arquivos de src, com leitura dos candidatos encontrados. Zero any, rede por fetch fora de services, efeitos sem dependências, HTML inseguro, imagens sem alt e arquivos TSX de components/pages fora da convenção.
- As três ocorrências de onClick em contêiner nativo são dialogs para tratar o backdrop, não divs usadas como ações sem botão.
- Lint aprovado e build TypeScript/Vite aprovado novamente.
- Suíte completa reexecutada: **611 testes aprovados, zero falhas e zero testes ignorados**.
- Publicação consultada novamente por HTTP: 200, elemento root e referência ao JavaScript da aplicação.
- Os 53 percursos NVDA e as medições de Profiler são evidências registradas nas respectivas revisões; não foram todos repetidos nesta reavaliação estática.

Resultado conservador: **17 atendidos, 7 parciais e nenhum inteiramente não feito**. Os critérios não possuem pesos individuais informados, e implementação, demonstração oral, comportamento do backend e versão efetivamente entregue influenciam a avaliação. Não há fundamento para garantir nota 10 ou calcular uma nota exata a partir dessa contagem.

Para reduzir os riscos identificados, priorizar a separação de responsabilidades do dashboard, o try/catch do serviço de NRs, a validação do caminho de renomeação em utils e a entrega da versão revisada. A decisão sobre histórico legado precisa considerar a regra do professor; esta revisão não recomenda reescrever silenciosamente um histórico compartilhado. A aparência e o contraste não foram alterados.
