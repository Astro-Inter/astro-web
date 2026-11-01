# Organização técnica do frontend

O frontend React organiza apresentação, estado de tela, integração HTTP, tipos e validação em módulos separados. Componentes apresentam dados sem duplicar regras de negócio ou transporte.

## Componentes e páginas

Componentes compartilhados cuidam da apresentação e de interações reutilizáveis. Páginas compõem esses componentes e coordenam navegação. Serviços não devem ser importados diretamente por componentes puramente visuais; hooks ou controladores de página gerenciam estado assíncrono.

## Estado e reducers

Estados relacionados são agrupados quando mudam juntos e atualizados de forma imutável. Para fluxos com várias transições e combinações inválidas, um reducer tipado com uniões de estado e ação concentra as transições. Por exemplo, src/utils/workspaceRegistrationReducer.ts coordena envio, sucesso, erro e linhas da planilha no cadastro de workspace.

## Consultas assíncronas

Hooks encapsulam consultas e gravações, expondo loading, erro e dados tipados. Leituras recebem AbortSignal quando aplicável; efeitos limpam recursos ao desmontar ou trocar identidade/consulta. Respostas tardias de uma sessão anterior não devem atualizar o estado atual.

## Persistência no navegador

Dados persistidos em localStorage devem incluir uma versão de schema e validação de formato ao carregar. Dados inválidos ou incompatíveis são descartados sem impedir a página. src/utils/formDraft.ts demonstra essa abordagem para rascunhos locais.

## Validação e roteamento

Validação e sanitização tipadas ficam em utilitários compartilháveis; serviços também verificam entradas antes de fazer fetch para proteger chamadas que não passam pelo formulário. Rotas privadas centralizam sessão e perfil no contexto de autenticação e não montam páginas antes da verificação frontend. O servidor continua sendo a autoridade para acesso aos dados.

Memoização com useMemo/useCallback deve responder a uma necessidade identificável, como evitar refazer agrupamentos ou recriar callbacks usados por observadores. Ela não substitui medição de desempenho.

Acessibilidade exige elementos semânticos, controles nomeados, mensagens anunciadas, foco visível e operação por teclado. A documentação de cada fluxo deve descrever o comportamento implementado e separar isso de qualquer avaliação externa de conformidade.
