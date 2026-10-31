# Revalidação dos requisitos de Aplicações Dinâmicas

Revisão inicial: 30/10/2026. Revalidado em 31/10/2026. Escopo: árvore de trabalho local, incluindo alterações ainda não commitadas. Revisão por análise sintática de TypeScript/JSX, leitura dos fluxos e serviços, lint, compilação, histórico Git e consulta à publicação.

**Atendido** indica evidência de implementação no escopo revisado. **Parcial** indica uma exceção concreta ou uma parte da demonstração exigida ainda sem comprovação. A revisão não substitui a apresentação ao vivo nem certifica conformidade WCAG integral.

## Mínimo para 7,0

| ID | Situação | Evidência e ressalva |
| --- | --- | --- |
| M01 — Vite, React e TypeScript | Atendido | `package.json`, `vite.config.ts` e `tsconfig.app.json`. Após integrar a main e mover o CSS dos blocos do chat para `styles/`, os 447 arquivos de `src/` têm extensão `.ts` ou `.tsx`; nenhum arquivo de outro formato foi encontrado. |
| M02 — Pastas e index.tsx | Atendido | 171 arquivos de componentes e 44 arquivos de páginas, todos em pastas próprias com `index.tsx`. Arquivos `index.ts` são exportadores, não componentes adicionais fora da convenção. |
| M03 — Responsabilidade única | Atendido no escopo revisado | Há mais de seis componentes de apresentação sem acesso remoto: `purpleButton`, `astroIcon`, `animatedFieldError`, `accountProfileSkeleton`, `formCardSymbol` e `optionsPopupLabel`. Não há importação de serviços em `src/components/`. Páginas podem compor fluxos e delegar consultas a hooks e serviços. |
| M04 — Tipagem | Atendido | Nenhum nó `AnyKeyword` encontrado em `src/`; TypeScript estrito. Componentes com props têm contratos tipados por interfaces; componentes sem props não precisam de interfaces vazias. Entidades e unions de domínio estão em `src/types/`. |
| M05 — Serviços e ambiente | Atendido para as APIs da aplicação | `fetch` permanece em `src/services/`. Funções assíncronas exportadas possuem retorno explícito; helpers de requisição por recurso centralizam `try/catch` e mensagens. `.env`, `.env.local` e `.env.production` são ignorados e não aparecem no histórico consultado. URLs públicas de assets/SDKs não são credenciais privadas. |
| M06 — Estado agrupado e imutável | Atendido após correção | Os campos `name` e `artwork` do `dashboardViewModal` agora pertencem ao mesmo objeto `values`, com atualizações funcionais que preservam o outro campo. As reordenações verificadas continuam alterando cópias. |
| M07 — Dependências de efeitos | Atendido na análise estática | Nenhum `useEffect`/`useLayoutEffect` sem segundo argumento foi encontrado. Lint com `react/exhaustive-deps` como erro passou. Limpezas de consultas, timers e listeners foram verificadas em hooks. A remoção de dependência durante a apresentação continua sendo uma demonstração ao vivo. |
| M08 — Chaves de listas | Atendido nos fluxos revisados | Perguntas, filtros editáveis, gráficos e entidades usam IDs. Índices encontrados pertencem a skeletons, posições fixas do calendário e trechos de respostas somente para leitura; não são as chaves das listas que o usuário adiciona, exclui ou reordena. |
| M09 — Parâmetros de rota | Atendido | `pendingNrList` usa `useParams<{ id: string }>()`, testa `routeId === undefined` e valida o valor com `parseNrId`. IDs recebidos por query string têm validação própria. |
| M10 — React Router e 404 | Atendido | Mais de três rotas, `Link`/`useNavigate`, nenhuma ocorrência de `window.location.href`, rota `path="*"` e página `notFound` com retorno adequado à sessão. |
| M11 — Acessibilidade mínima AA | **Atendido no escopo validado** | Ações semânticas, rótulos associados, imagens com alternativa, erros no DOM, contraste dos textos e foco visível. Em 31/10, as 12 telas autenticadas foram novamente auditadas sem violações automáticas e percorridas por Tab; a revisão abrangeu também menus, popups, validações vazias, personalização por setas e navegação mobile. Corrigidos perda de foco ao posicionar menus, contornos do chat/menu mobile e acesso por teclado às áreas de rolagem do calendário. Ver escopo e evidências em `acessibilidade-dad.md`. A demonstração integral com leitor de tela pertence ao E10 e permanece registrada separadamente. |
| M12 — Feedback assíncrono | Atendido nos fluxos revisados | Login, cadastro, CRUDs, formulários e dashboards exibem carregamento, resultado/sucesso e erro, incluindo recuperação após falha. Não foi encontrado `alert()` como tratamento de operação. Estados de falha e sucesso são exercitados pela suíte. |
| M13 — Publicação | Atendido | README contém o link `https://astro-inter.github.io/astro-web/`. Nesta revisão o endereço respondeu HTTP 200 e entregou o elemento raiz e referências aos assets. O workflow publica a main e cria `404.html` para o retorno da SPA. Isso não significa que as alterações locais já estejam publicadas. |
| M14 — Commits | **Atendido para a quantidade e o período exigidos** | Após integrar a main, a recontagem por padrão `tipo(escopo):` ou `tipo:` encontrou 142 commits dos tipos `feat`, `fix`, `refactor` e `docs`, de 16/09 a 31/10/2026: 45 dias, acima dos mínimos. O registro inicial `562b298 — Initial commit` permanece documentado como legado; não é contado entre as evidências válidas e não demanda reescrever o histórico publicado. O commit `ci(...)` é Conventional Commits válido, embora não entre na contagem dos quatro tipos exigidos. |

## Extras

| ID | Situação | Evidência e ressalva |
| --- | --- | --- |
| E01 — Context API | Atendido | Provider dedicado em `providers/workspaceRegistration`, contrato em `types/workspaceRegistration`, contexto e hook de consumo próprios. O rascunho atravessa etapas sem passar props por componentes intermediários. Explicação oral deve usar esse fluxo. |
| E02 — useReducer | Atendido | `utils/workspaceRegistrationReducer.ts` define `RegistrationState` e `RegistrationAction` como unions; o provider utiliza o reducer. Transições atualizam resultado e erros juntos, evitando sucesso com erro anterior. |
| E03 — Hook cancelável | Atendido | `useFormEditor` e `useExplorerPreview` têm retorno tipado, loading/pending, erro, `AbortController`, abort na limpeza e bloqueio de atualização tardia. Há testes de desmontagem e troca de dados/sessão. |
| E04 — lazy e Suspense | Implementado e verificado em produção local | O Chrome confirmou que o chunk de `forgotPassword` não aparece no carregamento inicial do login e é solicitado uma única vez após navegação por teclado. O chunk de `replacePassword` também foi conferido. O roteiro de exibição na aba Network continua disponível em `conformidade-dad.md`. |
| E05 — localStorage versionado | Atendido após correção | Além da acessibilidade e dos dashboards, o adaptador do VLibras usa `parseLibrasWidgetStorage`, com `_versao: 1`, migração do objeto legado e descarte seguro de JSON inválido ou versão incompatível. Os campos do SDK são preservados; apenas `isOpen` é reiniciado para impedir abertura automática. Os testes verificam preservação das preferências e migração idempotente. |
| E06 — Memoização demonstrada | Atendido na verificação registrada | A interface oficial do React DevTools 8.0.0 gravou as versões com e sem useMemo do componente real, com os mesmos dados e 50 consultas por versão. Foram 52 commits em cada sessão. Durações e limites estão em `desempenho-dad.md`; a ferramenta reproduzível fica em `tools/react-profiler`. |
| E07 — XSS | Atendido nos caminhos revisados | Não foram encontrados `dangerouslySetInnerHTML`, `innerHTML`, `insertAdjacentHTML`, `document.write` ou `eval` em `src/`. Texto externo é renderizado por interpolação JSX; serviços e utilitários validam respostas e URLs. |
| E08 — Validação em utils | Atendido após correção | O contrato auxiliar de conclusão agora reutiliza `utils/eventCompletionValidation.ts`. Evidências acima de três arquivos ou de 50 MB por arquivo são recusadas antes da chamada de rede; arquivos no limite e evidência opcional mantêm o contrato anterior. Os demais formulários web continuam usando seus validadores tipados em `utils/`. |
| E09 — PrivateRoute e Context | Atendido | `components/privateRoute` lê o contexto pelo hook, trata carregamento, sessão ausente, conta inativada e permissão. Páginas consultam a identidade pelo contexto, sem substituir a guarda por checagens diretas no Firebase. |
| E10 — AA avançado e leitor | **Parcial na comprovação integral** | Modais, menus, abas, seletores e calendários possuem ARIA aplicável, teclado e gerenciamento de foco. Há testes de contenção e restauração, inclusive origem removida e outro dialog aberto. Os layouts usam landmarks conforme o conteúdo. O NVDA 2026.3 portátil foi executado e anunciou os valores do gráfico; a navegação integral dos campos permaneceu inconclusiva devido à integração de foco e à interrupção do controle externo do Chrome. Portanto este critério não está totalmente validado. |

## Verificações e limites

- Em 31/10, o lint foi reexecutado sem erros. O build mais recente também concluiu sem erros após a correção do calendário.
- Após integrar a main e corrigir os pontos novos, a execução completa aprovou **518 testes**, sem falhas. A verificação focal anterior aprovou 66 testes de blocos do chat, formulários e colaboradores. Build e lint passaram.
- Foram refeitas a contagem da árvore, a busca sintática de `any`, efeitos sem dependências, chaves por índice, imports de serviços, ações em contêineres e APIs perigosas de HTML.
- O histórico foi recontado diretamente pelo Git; a publicação foi novamente consultada por HTTP em 31/10: status 200, raiz da aplicação e referências aos assets presentes.
- As evidências de teclado/axe e os itens inconclusivos estão em [Acessibilidade](acessibilidade-dad.md). A medição de renderização e seus limites estão em [Desempenho](desempenho-dad.md).
- Esta revisão não criou commits, não publicou alterações, não reescreveu o histórico e não executou gravações na API.

## Correções desta etapa

- Estado do popup de visão agrupado.
- Validação auxiliar de evidências extraída para `utils/`, com testes dos limites e de ausência de chamada à API no erro.
- Persistência do VLibras versionada e migrável, preservando as preferências do SDK.
- Reflow da paginação de formulários, resumo da galeria, links dos cards e títulos longos corrigido para fonte ampliada em telas estreitas.
- Teste assíncrono de NRs aguarda o resultado esperado em vez de depender de uma única pausa de 30 ms.
- Carregamento sob demanda conferido no build de produção local.

## O que depende de demonstração ou histórico

1. A navegação integral com NVDA/VoiceOver continua pendente. A comparação na interface oficial do React DevTools Profiler já foi executada e documentada, sem confundir um único commit com a média das gravações.
2. A quantidade e o período dos commits atendem ao mínimo com 142 registros válidos em 45 dias. O registro inicial permanece como legado fora dessa contagem; não é uma pendência de implementação. Esta etapa não reescreveu o histórico.

## Integração da main em 31/10/2026

- Branch de trabalho: `fix/SCRUM-578-corrigir-e-fazer-analises-finais`.
- Atualizada de `c3ec37b` para `33b46ab`, por fast-forward: oito commits recebidos, 26 arquivos alterados na main.
- Alterações locais preservadas em stash de backup e reaplicadas; conflitos de `formInformationFields` e `services/forms` resolvidos mantendo o contrato novo da API e as validações locais.
- O novo CSS do chatbot foi movido de `src/components/chatBlocks/style.css` para `styles/chatBlocks.css`.
- Tipos dos blocos em `types/chatBlocks`, validação de respostas em `utils/chatBlocks`, leitura memoizada em `useChatBlocks` e componentes de gráfico/avatar em pastas próprias, com interfaces para props.
- Paginação, colunas duplicadas, números não finitos, limites de texto e URLs de imagem têm validação. Conteúdo externo continua renderizado por interpolação JSX, com fallback textual quando o bloco é inválido.
- Listas dos blocos usam identidade por conteúdo, com diferenciação de duplicatas, sem usar posição como chave.
- A tabela tem região nomeada, foco visível e rolagem horizontal por teclado. Fontes dos blocos seguem os tokens do chat.
- Mantida a persistência nova da aparência em campos próprios da API de formulários e o reenvio da chave de acesso apenas para colaboradores pré-cadastrados com permissão de gestão.
- Chrome/axe nos componentes reais: zero violações no modo padrão e em 360 px com texto a 200% e alto contraste; rolagem com ArrowRight confirmada, sem excesso horizontal do documento. O teste foi isolado e não enviou mensagens nem gravou dados na API.
- Varredura sintática após a integração: zero `any`, efeitos sem dependências, rede fora dos serviços, imports de serviços em componentes, HTML inseguro, ações em contêineres, navegação por `window.location.href`, props inline sem interface ou imagens sem `alt`.
