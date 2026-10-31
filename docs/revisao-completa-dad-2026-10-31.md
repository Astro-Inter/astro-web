# Revisão completa dos requisitos de Aplicações Dinâmicas

Data: 31/10/2026. Base Git: `33b46ab`, com as alterações locais presentes na árvore de trabalho. Esta revisão não representa publicação dessas alterações.

A revisão cobriu os 447 arquivos de `src/` por análise sintática de TypeScript/JSX, com leitura dos contratos, fluxos de estado, serviços, armazenamento, rotas e controles relacionados aos requisitos. Foram reexecutados lint, build e a suíte completa. Evidências anteriores de navegador, Network e Profiler foram conferidas nos relatórios correspondentes; não são apresentadas como novas execuções nesta etapa.

**Atendido** indica implementação com evidência no escopo revisado. O percurso de teclado/contraste registrado cobre cenários determinados e não constitui certificação universal WCAG para toda combinação de dados, estado e permissão. As demonstrações presenciais continuam sendo realizadas pelo grupo.

## Mínimo para 7,0

| ID | Requisito | Resultado e evidência |
| --- | --- | --- |
| M01 | Vite, React e TypeScript; somente TS/TSX em `src/` | Atendido. Configuração em `package.json`, `vite.config.ts` e `tsconfig.app.json`. Os 447 arquivos de `src/` são `.ts` ou `.tsx`; build aprovado. |
| M02 | Organização de componentes e páginas | Atendido. 171 arquivos TSX de componentes e 44 de páginas, todos com nome `index.tsx` em pasta própria. Exportadores `index.ts` não são componentes fora da convenção. |
| M03 | Seis componentes de responsabilidade única | Atendido no escopo revisado. `purpleButton`, `astroIcon`, `animatedFieldError`, `accountProfileSkeleton`, `formCardSymbol` e `optionsPopupLabel` são exemplos. Nenhum componente importa serviços; os novos blocos do chat separam apresentação, hook e validação. Lógica de interação visual não equivale a acesso remoto ou regra de negócio definida dentro do componente. |
| M04 | Interfaces de props, tipos de domínio e ausência de `any` | Atendido. TypeScript estrito; nenhum nó `AnyKeyword` e nenhuma declaração de props por objeto inline nos componentes verificados. Contratos de domínio organizados nos 32 arquivos de `src/types/`. Componentes sem props não exigem interface vazia. |
| M05 | APIs isoladas, Promise tipada, erros e ambiente | Atendido para as APIs da aplicação. 33 arquivos em `src/services/`; nenhum `fetch` fora desse diretório e nenhuma função assíncrona declarada nos serviços sem retorno `Promise<T>`. Tratamento `try/catch` centralizado nos helpers por recurso. Somente `.env.example` versionado; nenhum registro de `.env`, `.env.local` ou `.env.production` no histórico consultado. SDKs e assets públicos não são URLs privadas. |
| M06 | Estado agrupado e imutável | Atendido nos fluxos revisados. Formulários, cadastro, eventos e editor de dashboards agrupam campos relacionados. Os `splice` de reordenação trabalham sobre cópias; `sort` e `push` encontrados operam sobre arrays novos, resultados locais ou a integração do GTM, sem mutar diretamente estado React. |
| M07 | Dependências corretas dos efeitos | Atendido na análise estática e nos testes. 180 chamadas de `useEffect`/`useLayoutEffect`, nenhuma sem argumento de dependências; `react/exhaustive-deps` passou como erro de lint. Há limpeza de timers, listeners e requisições. A remoção de uma dependência é demonstração ao vivo. |
| M08 | Chaves estáveis em listas dinâmicas | Atendido nos fluxos revisados. Perguntas, filtros, entidades e gráficos usam IDs; blocos do chat usam identidade por conteúdo com diferenciação de duplicatas. Quatro chaves por índice encontradas pertencem a skeletons, meses e dias da semana fixos, sem adição/remoção/reordenação pelo usuário. |
| M09 | Parâmetros de rota tratados | Atendido. `pendingNrList` recupera o parâmetro com `useParams`, diferencia `undefined` e valida valores com `parseNrId`. Queries têm seus próprios validadores. |
| M10 | React Router e 404 | Atendido. 42 declarações de Route; navegação por Link/useNavigate; nenhuma atribuição a `window.location.href`. Rota `*` com `notFound` e retorno apropriado à sessão. |
| M11 | Acessibilidade mínima AA | Atendido no escopo testado. Nenhuma ação em div/span/li/p, input nativo sem ID ou imagem sem alt foi encontrado. Labels, alertas, foco e contraste têm testes e verificações de navegador. Os controles compartilhados preservam foco por teclado, inclusive a busca com destaque externo e a região rolável do calendário. Textos acessíveis completos permanecem contidos nas tabelas, sem gerar altura extra. Escopo e limites em [Acessibilidade](acessibilidade-dad.md). |
| M12 | Carregando, sucesso e erro no DOM | Atendido nos fluxos revisados. Hooks e páginas mostram skeleton/spinner, retorno de sucesso/notificação e erro com recuperação. `AnimatedFieldError` usa `role="alert"`; operações não dependem de alert ou console como único tratamento. A suíte exercita sucesso, falha, retry e envio duplicado. |
| M13 | Publicação e link no README | Atendido. `https://astro-inter.github.io/astro-web/` consta no README e respondeu HTTP 200 nesta revisão, com raiz da aplicação e referências aos assets. O conteúdo local ainda precisa do fluxo normal de entrega para chegar à publicação. |
| M14 | Vinte commits em quatro semanas | Atendido para quantidade e período: 142 commits feat/fix/refactor/docs entre 16/09 e 31/10/2026, cobrindo 45 dias. O registro inicial legado não integra essa contagem de evidências válidas; não foi criado histórico artificial nem reescrito o histórico compartilhado. |

## Extras

| ID | Requisito | Resultado e evidência |
| --- | --- | --- |
| E01 | Context API e hook tipados | Atendido. `providers/workspaceRegistration`, `contexts/workspaceRegistration`, `hooks/useWorkspaceRegistration` e `types/workspaceRegistration`. O rascunho atravessa etapas sem prop drilling pelos componentes intermediários. O grupo deve explicar esse fluxo. |
| E02 | useReducer com State/Action em unions | Atendido. `utils/workspaceRegistrationReducer.ts` define `RegistrationState` e `RegistrationAction`; o provider utiliza o reducer. Sucesso, falha, restauração e início atualizam dados e erros juntos. |
| E03 | Hook tipado com loading, erro e AbortController | Atendido. `useExplorerPreview` e `useFormEditor` abortam consultas/mutações ao desmontar ou mudar os dados e impedem atualização tardia. Há testes de cancelamento e troca de sessão. |
| E04 | lazy/Suspense e chunks por página | Implementado, com verificação de produção local registrada. `routes/index.tsx` usa lazy e Suspense; a evidência de Network confirma o carregamento sob demanda de recuperação/substituição de senha. A apresentação deve repetir a demonstração da página escolhida. |
| E05 | localStorage versionado | Atendido. Acessibilidade e dashboards gravam `_versao: 1`; leitura verifica schema e identidade. Dashboards migram o legado ou recusam dados incompatíveis preservando o original; acessibilidade volta ao padrão quando inválida. VLibras tem parser com migração e descarte de formatos incompatíveis. |
| E06 | useCallback/useMemo com justificativa e Profiler | Atendido na evidência registrada. O gráfico mantém estruturas derivadas enquanto os dados não mudam; callbacks estáveis evitam reexecução de efeitos/listeners. A interface oficial do React DevTools registrou comparação com e sem memoização. Valores, limites e ferramenta reproduzível em [Desempenho](desempenho-dad.md). O grupo deve explicar e demonstrar ao vivo. |
| E07 | XSS | Atendido nos caminhos revisados. Nenhum dangerouslySetInnerHTML, innerHTML, insertAdjacentHTML, document.write ou eval encontrado em `src/`. Conteúdo externo é interpolado em JSX; URLs e blocos do chat têm validação. Testes verificam que texto semelhante a HTML permanece escapado. |
| E08 | Validação/sanitização em utils | Atendido nos formulários revisados. `formEditorValidation`, `forms`, `dashboardQuery`, `eventInformationValidation`, `eventEditing`, `eventCompletionValidation` e validadores de conta/cadastro tratam dados antes da requisição. Tipos, limites e mensagens por campo são testados, incluindo ausência de chamada à API quando inválidos. |
| E09 | PrivateRoute e autenticação por Context | Atendido. `components/privateRoute` usa `useAuthentication`, trata sessão, carregamento, conta inativada e permissões. Páginas não substituem a guarda por leitura direta do Firebase. |
| E10 | Acessibilidade avançada e leitor de tela | Parcial na demonstração completa. ARIA aplicável, contenção/restauração de foco, menus, abas, datas e landmarks têm implementação e testes. O NVDA portátil anunciou dados do gráfico, mas a navegação integral de campos e modais não foi concluída pela integração de foco disponível. Não há evidência suficiente para aprovar a demonstração integral com leitor de tela. |

## Verificações desta revisão

- Build: aprovado, com compilação TypeScript estrita.
- Lint: aprovado.
- Suíte completa: 518 testes aprovados, zero falhas, zero ignorados.
- Varredura de todos os arquivos de `src/`: zero extensões proibidas, any, efeitos sem dependências, rede fora dos serviços, importação de serviços em componentes, HTML inseguro, ações em contêineres, props inline ou imagens sem alt.
- Leitura dos usos de localStorage, chaves por índice, mutações de arrays, params, cancelamento, validação, contratos e feedback.
- Consulta pública do deploy e contagem real do histórico Git.
- As demonstrações presenciais de efeitos, Context, reducer, Network, Profiler e leitor de tela não são substituídas por uma análise estática. O ponto ainda sem comprovação integral é o percurso com leitor de tela do E10.
