# Aplicações Dinâmicas — evidências e demonstração

Critérios do Projeto Interdisciplinar de 14/05/2026. A aplicação publicada está em https://astro-inter.github.io/astro-web/.

A [revisão conservadora dos 24 critérios, de 02/11/2026](revisao-criterios-2026-11-02.md) é a referência mais recente de status: 17 atendidos e 7 parciais, distinguindo implementação, exceções literais, comprovação e entrega. As evidências abaixo e os relatórios anteriores devem ser lidos com esses limites; aprovação de percursos não é garantia de cumprimento integral nem de nota 10.

O M11 foi novamente verificado e corrigido em [02/11/2026, com navegação real por teclado](acessibilidade-minima-2026-11-02.md), preservando o design das telas.

## Mínimo para 7,0

| Critério | Evidência no projeto |
| --- | --- |
| M01 — Vite, React e TypeScript | `package.json`, `vite.config.ts`, `tsconfig.app.json`; `src/` contém somente `.ts` e `.tsx`. Estilos em `styles/`, imagens em `public/`. |
| M02 — Organização | Componentes e páginas em pastas próprias, com `index.tsx`; subcomponentes do editor, gráficos, notificações e conteúdos de páginas também possuem suas pastas. Os `index.ts` são arquivos de exportação. |
| M03 — Responsabilidades | Parcial na leitura estrita: há mais de seis componentes independentes e nenhum import de serviços em `components/`, mas páginas como `workspaceDashboards` ainda misturam JSX, regras de edição e chamadas aos serviços. |
| M04 — Tipagem | Props declaradas por interfaces; entidades por domínio em `src/types/`. TypeScript estrito e lint proíbem `any` explícito. Componentes sem parâmetros não precisam de uma interface vazia. |
| M05 — APIs | Parcial na exigência literal de try/catch: HTTP isolado em services, contratos tipados e erros tratados, mas `nrReviewApi` utiliza `.catch()` em vez do bloco pedido. `.env` é ignorado pelo Git; variáveis `VITE_` são públicas e não devem conter segredos de servidor. |
| M06 — Estado | `useLogin`, `useWorkspaceAddresses`, `useEventCreationFlow` e o editor agrupam campos relacionados. Seleção, distribuição e remoção de grupos atualizam o formulário do evento atomicamente. Atualizações usam cópias, `map`, `filter` ou reducer; a reordenação modifica cópias dos arrays. Estados independentes de interface permanecem separados. |
| M07 — Efeitos | Efeitos têm dependências explícitas; `react/exhaustive-deps` é erro de lint. Listeners, timers e requisições são encerrados na limpeza. |
| M08 — Listas | Perguntas, opções, entidades, gráficos e filtros editáveis têm identificadores estáveis. Índices remanescentes são usados em estruturas fixas, como skeletons e meses do calendário. |
| M09 — Parâmetros | `pendingNrList` usa `useParams`, verifica ausência e chama `parseNrId` para tratar valores inválidos. |
| M10 — Rotas | React Router, `useNavigate`/`Link`, guarda privada e rota `*` com tela 404 e retorno. |
| M11 — Acessibilidade | Parcial na comprovação global: os percursos de semântica, rótulos, alertas, teclado e foco estão aprovados e registrados em [Acessibilidade mínima](acessibilidade-minima-2026-11-02.md). O contraste original foi preservado; os testes dos tokens compartilhados não comprovam todas as combinações visuais reais. Não foi identificada nesta reavaliação uma nova violação concreta de contraste; o limite é de comprovação integral. |
| M12 — Estados assíncronos | Login, cadastro, CRUDs e dashboards apresentam carregamento, resultado/sucesso e erro no DOM, com possibilidade de recuperação. |
| M13 — Publicação | Parcial na entrega da revisão: GitHub Pages e link no README existentes, com HTTP 200 novamente confirmado em 02/11. Correções locais ainda modificadas/não rastreadas não integram o código do commit publicado pelo workflow. |
| M14 — Histórico | Quantidade e período atendidos: 165 commits `feat`/`fix`/`refactor`/`docs` entre 16/09 e 02/11/2026, em 47 dias. Parcial diante da proibição literal de mensagens genéricas: `Initial commit` continua no histórico, além de mensagens automáticas de merge sem esses prefixos. Não contar o inicial entre as evidências não elimina sua existência. Nenhuma reescrita foi executada. |

## Extras

| Critério | Código para demonstrar |
| --- | --- |
| E01 — Context | `providers/workspaceRegistration`, `contexts/workspaceRegistration.ts`, `hooks/useWorkspaceRegistration.ts`. O rascunho é compartilhado entre as etapas de empresa, planilha e endereços sem encadear props por componentes intermediários. |
| E02 — Reducer | `utils/workspaceRegistrationReducer.ts`. `RegistrationState` e `RegistrationAction` são unions. Sucesso, erro, restauração e carregamento atualizam resultado e erros juntos, evitando combinações contraditórias de estados. |
| E03 — Hook cancelável | `useFormEditor` e `useExplorerPreview` têm retorno tipado, carregamento, erro e `AbortController`. Trocar os dados ou desmontar encerra a operação e impede publicação de resultado antigo. |
| E04 — Lazy e Suspense | `routes/index.tsx`: páginas carregadas com `lazy` e protegidas por `Suspense`; o build produz chunks. |
| E05 — Persistência | `utils/accessibility.ts` valida `_versao`, conta e conteúdo, retornando ao padrão para dados incompatíveis. `dashboardStorage.ts` grava `_versao: 1` e migra o antigo `schemaVersion: 1` após validar os dados. Conteúdo inválido de dashboards é preservado e bloqueado, sem sobrescrita silenciosa. |
| E06 — Memoização | `analyticsInteractiveChart` memoriza categorias, séries, lookup por grupo e totais das fatias. `useAstroChatController` estabiliza a função usada pelo efeito de leitura do histórico; `truncatedText` estabiliza a função usada pelos listeners de posicionamento. Comparação com a API `React.Profiler` registrada em [Desempenho](desempenho-dad.md); a demonstração no React DevTools continua necessária. |
| E07 — XSS | Conteúdo externo renderizado por interpolação JSX. Nenhum `dangerouslySetInnerHTML`. Respostas e URLs são verificadas em serviços e utilitários antes do uso. |
| E08 — Formulários | Parcial na cobertura literal: há validadores tipados em utils para os principais domínios e testes extensos, mas a renomeação da visão no dashboard usa verificações inline em `persist` e validação completa por `cleanDraft` dentro do serviço. Esse caminho não centraliza toda a validação em utils antes da chamada ao serviço. |
| E09 — Rotas privadas | `privateRoute` usa o contexto de autenticação pelo hook dedicado; redireciona sessão ausente e bloqueia acesso sem permissão. |
| E10 — Controles complexos | Parcial no alcance integral de WCAG AA. A pendência de teste do leitor foi resolvida: 53 verificações distintas aprovadas com NVDA, incluindo títulos, landmarks, modais, seletores, calendário, menus, gráfico, configurações e chat. Esses resultados não comprovam todos os critérios AA em estados fora da amostra. Evidências e limites em [Acessibilidade avançada](acessibilidade-avancada-2026-11-02.md) e na revisão conservadora mais recente. |

## Demonstrações ao vivo

### Chunks de páginas

1. Abrir o DevTools, Network, filtrar por JavaScript e desabilitar o cache.
2. Recarregar o login. Navegar para um destino ainda não aberto e mostrar seu chunk.
3. Repetir com outra página. O roteador pode iniciar o download durante a transição para evitar uma tela vazia.

### React DevTools Profiler

1. Abrir um gráfico com várias categorias e séries e iniciar uma gravação.
2. Consultar valores pelo teclado e pelo ponteiro, sem mudar o conjunto de dados.
3. Apontar o `useMemo` em `analyticsInteractiveChart`, responsável por manter categorias, séries e o mapa de valores entre essas atualizações.
4. Em uma cópia temporária, executar o mesmo cálculo sem a memoização e repetir as mesmas interações. Comparar as gravações e os tempos reais; não presumir um ganho percentual.
5. Restaurar a implementação. Para `useCallback`, mostrar a dependência `loadSessions` no efeito de histórico e `updateTooltipPosition` no efeito de posicionamento de tooltips; atualizações de estado não devem provocar novas leituras nem remontar listeners sem necessidade.

### Teclado e leitor de tela

1. Navegar sem mouse pelo login, menu lateral, CRUD, formulários, configurações e dashboards.
2. Confirmar foco visível, nome dos controles e ausência de bloqueios com Tab/Shift+Tab.
3. Abrir menus e seletores; usar setas, Home, End e Escape. Verificar o retorno do foco.
4. Abrir um modal, navegar dentro dele e fechar. Conferir que o foco retorna ao botão de origem ou segue para o destino da ação.
5. Gerar erros de campos e uma falha de consulta; verificar o anúncio do erro e a recuperação.
6. Repetir com NVDA ou VoiceOver, incluindo navegação por títulos e landmarks.

## Verificação de 30/10/2026

- Suíte completa: 508 testes aprovados, sem falhas. O teste da transição semanal usa relógio controlado para verificar a saída do skeleton sem depender da duração da execução paralela.
- Build TypeScript/Vite aprovado e lint sem diagnósticos.
- `dadAccessibility.test.cjs`: retorno de foco, origem removida, preservação de outro dialog e contraste AA dos tokens compartilhados em página, popup, campo e botões.
- `eventsUi.test.cjs`: motivo inválido impede a chamada de cancelamento, identifica o campo e move o foco para a justificativa.
- `dashboardValidation.test.cjs`: filtros inválidos retornam mensagens específicas por campo; normalização remove IDs locais sem modificar o estado original.
- Chrome: login navegado por Tab, envio vazio com Enter, dois campos inválidos associados a alertas e rota inexistente mostrando 404 com retorno.
- Chrome, controles reais em montagem isolada: modal recebe foco no título e mantém Tab/Shift+Tab dentro dele; seletor escolhe uma opção com End/Enter; calendário abre com ArrowDown e retorna ao campo com Escape; Escape fecha o modal e devolve foco à origem. Nenhuma exceção de renderização nesses cenários. Esses controles foram testados sem autenticar nem modificar dados reais.
- Formulários: NR fora do catálogo, próprio gestor, unidade inválida e publicação incompleta são recusados antes do serviço; rascunhos incompletos continuam permitidos. Busca é normalizada e status herdados do protótipo, como `constructor`, são recusados.
- Auditoria axe-core e verificações de teclado registradas em [Acessibilidade](acessibilidade-dad.md), incluindo itens inconclusivos.
- Medição de renderização do gráfico real com e sem memoização registrada em [Desempenho](desempenho-dad.md), sem presumir ganhos universais.

Essas verificações não substituem a apresentação ao vivo. O percurso com NVDA foi executado posteriormente e está registrado em [Acessibilidade avançada de 02/11/2026](acessibilidade-avancada-2026-11-02.md). A cobertura integral de contraste em todas as combinações de tela e a comparação de tempos no React DevTools Profiler continuam sem confirmação manual integral. Os resultados devem ser apresentados com o escopo e os limites dos respectivos relatórios.
