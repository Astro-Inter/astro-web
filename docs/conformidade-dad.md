# Aplicações Dinâmicas — evidências e demonstração

Critérios do Projeto Interdisciplinar de 14/05/2026. A aplicação publicada está em https://astro-inter.github.io/astro-web/.

A [revalidação individual, atualizada em 31/10/2026](revalidacao-dad-2026-10-30.md) registra o status atual de cada requisito, incluindo exceções encontradas após a revisão geral abaixo. Consulte-a para distinguir implementação, ressalvas de leitura literal e demonstrações ainda pendentes.

## Mínimo para 7,0

| Critério | Evidência no projeto |
| --- | --- |
| M01 — Vite, React e TypeScript | `package.json`, `vite.config.ts`, `tsconfig.app.json`; `src/` contém somente `.ts` e `.tsx`. Estilos em `styles/`, imagens em `public/`. |
| M02 — Organização | Componentes e páginas em pastas próprias, com `index.tsx`; subcomponentes do editor, gráficos, notificações e conteúdos de páginas também possuem suas pastas. Os `index.ts` são arquivos de exportação. |
| M03 — Responsabilidades | Componentes de apresentação recebem props; hooks coordenam operações; serviços executam requisições. Exemplos: `analyticsEditor` → `useExplorerPreview` → `services/dashboards.ts`; `createEventFlowModal` → `useEventCreationFlow`. |
| M04 — Tipagem | Props declaradas por interfaces; entidades por domínio em `src/types/`. TypeScript estrito e lint proíbem `any` explícito. Componentes sem parâmetros não precisam de uma interface vazia. |
| M05 — APIs | Requisições HTTP isoladas em `services`, contratos `Promise<T>`, tratamento de erros nos helpers de requisição. Credenciais de servidor não pertencem a variáveis `VITE_`, que são públicas. `.env` é ignorado pelo Git. |
| M06 — Estado | `useLogin`, `useWorkspaceAddresses`, `useEventCreationFlow` e o editor agrupam campos relacionados. Seleção, distribuição e remoção de grupos atualizam o formulário do evento atomicamente. Atualizações usam cópias, `map`, `filter` ou reducer; a reordenação modifica cópias dos arrays. Estados independentes de interface permanecem separados. |
| M07 — Efeitos | Efeitos têm dependências explícitas; `react/exhaustive-deps` é erro de lint. Listeners, timers e requisições são encerrados na limpeza. |
| M08 — Listas | Perguntas, opções, entidades, gráficos e filtros editáveis têm identificadores estáveis. Índices remanescentes são usados em estruturas fixas, como skeletons e meses do calendário. |
| M09 — Parâmetros | `pendingNrList` usa `useParams`, verifica ausência e chama `parseNrId` para tratar valores inválidos. |
| M10 — Rotas | React Router, `useNavigate`/`Link`, guarda privada e rota `*` com tela 404 e retorno. |
| M11 — Acessibilidade | Ações por botões, labels com `htmlFor`, imagens com `alt`, erros com `role="alert"`, foco visível e controles operáveis por teclado. Validação manual integral de teclado e contraste deve acompanhar os testes automatizados. |
| M12 — Estados assíncronos | Login, cadastro, CRUDs e dashboards apresentam carregamento, resultado/sucesso e erro no DOM, com possibilidade de recuperação. |
| M13 — Publicação | GitHub Pages configurado em `.github/workflows/pages.yml`; link no README. O endereço publicado respondeu HTTP 200 durante a revisão. Mudanças locais precisam passar pelo fluxo normal de entrega para chegar ao site. |
| M14 — Histórico | 142 commits `feat`/`fix`/`refactor`/`docs` entre 16/09 e 31/10/2026, contando também mensagens convencionais em commits com mais de um pai, atendendo quantidade e período. O registro inicial `Initial commit` é legado e não integra essa contagem de evidências; não exige reescrita do histórico. Conferir com `git log --format="%ad %s" --date=short`. |

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
| E08 — Formulários | Validação e normalização em `utils`: `forms.ts`, `formEditorValidation.ts`, `formFilters.ts`, `workspaceRegistration.ts`, `account.ts`, `collaborator.ts`, `eventInformationValidation.ts`, `eventApi.ts`, `eventCancellation.ts`, `nrSelection.ts`, `workspaceSettings.ts` e `dashboardQuery.ts`. Criação, edição e hooks reutilizam a validação antes de chamar os serviços; a lista e seu serviço reutilizam a mesma validação de busca/status/paginação. Cancelamento e filtros identificam os erros junto aos campos com `aria-describedby` e `role="alert"`. |
| E09 — Rotas privadas | `privateRoute` usa o contexto de autenticação pelo hook dedicado; redireciona sessão ausente e bloqueia acesso sem permissão. |
| E10 — Controles complexos | `appModal`/`useAnimatedDialog`, `optionsPopup`, `toolbarSelect` e `formDatePicker`: identificação ARIA, teclado e foco. `dialogFocus` mantém Tab/Shift+Tab no dialog ativo. `restoreFocus` devolve o foco à origem; quando ela foi removida, usa o título da página ou o dialog que continua aberto. Preserva o foco de um novo dialog. Layouts têm landmarks conforme seu conteúdo; a ajuda compartilhada fica em um `footer`. |

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

Essas verificações não substituem a apresentação ao vivo. A cobertura integral de contraste em todas as combinações de tela, a navegação completa com NVDA/VoiceOver e a comparação de tempos no React DevTools Profiler continuam sem confirmação manual. A implementação pode ser demonstrada pelos roteiros acima; esses pontos não devem ser classificados como validação integral concluída antes da execução.
