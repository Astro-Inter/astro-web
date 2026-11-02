# Acessibilidade mínima — verificação de 02/11/2026

Resultado do requisito M11: **atendido no escopo verificado**. A pendência de navegação por teclado apontada na revisão desta conversa foi verificada no navegador real, incluindo telas autenticadas, e os defeitos encontrados foram corrigidos.

Não houve alteração de CSS, cores, contraste, tipografia, dimensões ou disposição das telas. Os testes existentes dos tokens de contraste continuam sendo a evidência automatizada para as superfícies compartilhadas. Esta etapa não representa uma certificação externa e irrestrita de todos os critérios WCAG.

## Ambiente e limites

- Aplicação local executada com Vite e código da árvore de trabalho, incluindo as correções desta revisão.
- Navegador integrado com sessão autenticada autorizada pelo usuário. Nenhuma credencial foi gravada neste relatório ou no código.
- Verificações de teclado na largura original do navegador e em 1366 × 900 para desktop.
- Consulta de dados existentes; abertura e fechamento de menus e modais; formulários vazios para verificar validação. Nenhum cadastro, convite, formulário, evento, arquivo ou configuração foi salvo durante os testes.
- Auditoria do DOM e da árvore de acessibilidade. Os resultados de axe publicados em `acessibilidade-dad.md` são históricos, não uma nova execução de axe nesta data.

## Percurso executado

| Tela ou controle | Evidência observada |
| --- | --- |
| Login | Tab alcança o e-mail; foco com contorno visível. Enter com campos vazios exibe erros antes de autenticar. Autenticação da conta fornecida concluída. |
| Home e menu móvel | Menu abre por Enter, Tab percorre os nove destinos, retorna ao botão de fechar e Escape fecha com foco devolvido ao botão de abertura. |
| Gestores e colaboradores | Navegação por Enter, título e main identificados, campos rotulados, botões com nomes e imagens com alt. |
| Conformidades | Abertura por Enter do importador e da inclusão manual. Campos Colaborador, NR e Data de validade identificados. |
| Seletor no modal | ArrowDown abre; End alcança a última opção com foco visível; Escape fecha e devolve o foco ao campo, preservando o modal. |
| Calendário no modal | ArrowDown move foco ao dia; ArrowRight avança a data; Escape fecha o calendário e retorna ao campo. Nenhuma data foi salva. |
| Modais empilhados | Shift+Tab a partir do título alcança a última ação; Tab volta ao primeiro campo. Escape fecha cada modal e restaura o foco na origem correspondente. |
| Unidades e cargos | Navegação por teclado e inspeção da estrutura, rótulos, nomes de botões, imagens e referências ARIA. |
| Lista de formulários | Navegação por teclado; controles da listagem identificados. |
| Criação de formulário | Rótulos e referências conferidos. Modal de nova pergunta abre por Enter, fecha por Escape e devolve foco a Adicionar pergunta. Menu navega por End; saída confirmada sem salvar rascunho. Foco no título validado após carregar as opções da API. |
| Eventos | Região rolável do calendário recebe foco e PageDown desloca o conteúdo com contorno visível. Formulário vazio apresenta erros com role alert e move foco ao título inválido; fechado sem criar evento. |
| Workspace e Conta | Alternância por Enter entre as duas áreas, título focado após a transição e controles com nomes acessíveis. Nenhuma configuração ou dado de perfil foi alterado. |
| Dashboards | Galeria e visão abertas por Enter. Menu alcança a última opção por End e Escape retorna ao botão de origem. Entrada recarregada para verificar foco no título após substituir o cabeçalho de carregamento pelos dados. |

Nas inspeções executadas: nenhum campo visível sem rótulo acessível, botão sem nome, imagem sem alt ou tabindex positivo. A referência ARIA inválida do chat foi removida; as verificações posteriores não encontraram referências quebradas nos cenários examinados.

## Correções

1. `src/components/astroChatView/index.tsx`: removido aria-controls do lançador fechado. O elemento apontado só existia quando o lançador já havia sido desmontado. O nome e o estado do botão foram preservados.
2. `src/utils/routeFocus.ts` e `src/routes/index.tsx`: foco acompanha títulos que aparecem depois da API e a substituição do cabeçalho de carregamento. A conclusão tardia preserva o foco de um campo que já está em uso. Observador encerrado ao sair da rota.
3. As correções anteriores desta conversa permanecem: fallback acessível de Suspense e erros dos dashboards/perfil anunciados com role alert.

## Regressões

`tests/routeFocus.test.cjs` cobre título tardio, substituição do cabeçalho, espera do modal global e preservação da interação iniciada pelo usuário. Os testes de navegação, contenção/restauração de foco, alertas e tokens de contraste complementam a verificação real.

Verificação final desta revisão: lint aprovado, build com TypeScript aprovado e suíte completa com **610 testes aprovados**, zero falhas e zero testes ignorados. Nenhuma diferença em `styles/` ou `public/`.

A demonstração com leitor de tela pertence ao extra E10 e mantém seu status independente. O percurso com NVDA foi concluído posteriormente e está registrado em [Acessibilidade avançada](acessibilidade-avancada-2026-11-02.md), incluindo a proteção adicional do foco de gráficos e a suíte atualizada com 611 testes aprovados.
