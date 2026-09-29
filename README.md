# Astro Web

Protótipo de interface do Astro, feito com Vite, React, TypeScript e React Router. Os fluxos usam dados demonstrativos; autenticação, pagamento e cadastros não chamam uma API.

## Executar e verificar

```bash
npm install
npm run dev
npm run lint
npm run build
```

O build verifica os tipos e gera dist/. O CI executa npm ci, lint e build em pull requests e pushes para main. O lint verifica regras de hooks e dependências dos efeitos. Se este ambiente Windows bloquear o carregador padrão do Vite com spawn EPERM, a verificação equivalente é:

```bash
node ./node_modules/typescript/bin/tsc -b
node ./node_modules/vite/bin/vite.js build --configLoader native
```

## Estrutura

```text
public/                  imagens, logotipo e ícones acessados por URL
src/
  components/            componentes, cada um em pasta com index.tsx
  data/                  mocks e opções compartilhadas
  hooks/                 comportamento reutilizável de endereços e diálogos
  pages/                 composição e estado das páginas
  routes/index.tsx       rotas com lazy/Suspense por página e rota curinga
  types/                 entidades e contratos por domínio
  utils/                 máscaras, validações e utilitários compartilhados
  App.tsx                árvore de rotas
  main.tsx               montagem e importação de estilos
styles/                  CSS global e das telas, fora de src/
```

src/ contém apenas .ts e .tsx. Não existe módulo de serviço ou autenticação porque o protótipo ainda não se conecta a uma API. .env.example reserva VITE_API_URL; variáveis VITE_ são públicas no navegador e não devem conter segredos.

## Rotas e comportamento demonstrativo

Fluxo de workspace:

/ → /paymentMethod → /createWorkspace → /accessKeyVerified → /createPassword → /includeCompanyInformation → /attachExcelFile → /setAddress → /workspaceCreated → /loadingScreen → /mainPositionScreen.

- /mainPositionScreen: cargos, filtros, criação/edição, status e associação de NRs. Os dados são locais e retornam aos mocks após reload. O chat tem respostas locais.
- /createForms: perguntas de texto, opções, foto e data; cópia, exclusão e reordenação por arraste ou Alt + setas. Salva um exemplo em astro-created-form no navegador.
- /mainFormScreen: listagem mockada de formulários com cartões, busca, filtro de status, paginação, menu de edição e confirmação de exclusão. A exclusão altera somente a instância atual da listagem.
- /editForms: edição de um formulário mockado com quatro tipos de pergunta e confirmações de saída/salvamento. Ao abrir pela listagem, usa o nome e a descrição do cartão selecionado. As alterações ficam na instância atual da página.
- URLs desconhecidas abrem a página de erro com retorno ao início.

As etapas de cadastro/pagamento mantêm a navegação demonstrativa. Login, recuperação de senha, suporte e itens do menu Em breve ainda dependem de implementação. /loadingScreen é uma transição por timer, não uma requisição.

## Formulários e acessibilidade

Criação e edição compartilham utils/forms.ts: validam nome, gestor, data, existência de perguntas, títulos e opções normais. A opção Outros é uma prévia de resposta e pode ficar vazia. Datas impossíveis ou incompletas não mantêm silenciosamente o prazo anterior; limpar o campo limpa o valor do formulário.

As máscaras de email, CNPJ, CEP e cartão ficam em utils/. A seleção da planilha valida extensão .xlsx/.xls e limite de 10 MB; a etapa ainda permite avançar no fluxo mockado.

Erros e confirmações gerais de createForms continuam destinados a leitores de tela durante esta fase mockada. Erros de data e de confirmação da edição são apresentados junto ao controle correspondente. Prévia de respostas e botão de carregar foto permanecem desabilitados e com opacidade reduzida.

AppModal/ConfirmationModal usam opções explícitas backdrop e preservePageScroll. Confirmações independentes escurecem a página; confirmações sobre outro modal podem usar fundo transparente. O foco inicial é definido na abertura e não volta ao título quando a validação atualiza o diálogo.

- Menus e seletores: setas, Home/End e Escape, foco visível e estados ARIA.
- Calendário: setas entre dias, Home/End para semana, PageUp/PageDown para mês, Enter para escolher e Escape para fechar. A entrada manual continua disponível.
- Texto truncado: Tab para receber foco quando há corte, tooltip associado por aria-describedby e Escape para fechar. Recomendações de NRs também têm associação ARIA e fechamento por Escape.
- Placeholder ativo: #b6b2c3 sobre #444252, contraste superior a 4,5:1. Prévias desabilitadas conservam a opacidade definida para o protótipo.

## Persistência

createForms grava astro-created-form e astro-create-forms-draft com _versao: 1 e trata falhas de escrita. Ainda não existe coleção de formulários nem carga/migração desses registros. A recuperação de rascunho será definida posteriormente. EditForms, cargos, NRs e etapas do workspace usam estado local; não indicam persistência remota.

## Critérios DAD (14/05/2026)

| Critério | Estado atual |
| --- | --- |
| M01–M04 | Vite/React/TS estrito, somente TS/TSX em src, componentes/páginas em pastas próprias, props e domínio tipados, sem any. Lógica de perguntas e validação compartilhada. |
| M05 | API ainda não integrada. Quando houver, usar serviços tipados e tratamento de erro em src/services. |
| M06–M08 | Estados locais agrupados, atualizações imutáveis, efeitos com dependências verificadas pelo lint e ids estáveis nas listas dinâmicas. |
| M09 | Nenhuma rota recebe parâmetros atualmente. |
| M10 | React Router, navegação interna e rota curinga com retorno ao início. |
| M11 | Correções de contraste, foco, teclado e tooltips realizadas. Certificação integral WCAG AA e validação com leitor de tela ainda não concluídas. |
| M12 | Integrações assíncronas reais e seus estados dependem da API. Suspense apresenta carregamento dos módulos das páginas. |
| M13 | Publicação segue pendente. |
| M14 | Histórico em desenvolvimento; acompanhar 20 commits convencionais distribuídos por quatro semanas reais. |

E04 implementado com lazy/Suspense por página e chunks separados no build. E05 parcial: versão ao gravar, sem carga/migração. E08 tem validação de formulários, cargos e arquivo; cadastro mockado mantém seu comportamento definido. E10 tem melhorias de ARIA/foco/teclado, mas ainda precisa de demonstração com NVDA ou VoiceOver. Os demais extras não são declarados concluídos.

## Verificação manual

Conferir limpeza de prazo, datas inválidas, seleção pelo teclado, opções vazias, Outros, confirmação de edição e retorno de foco. Testar tooltips com Tab/Escape e NRs com modais aninhados. Verificar desktop e mobile, inclusive 360 px. Ainda não há suíte automatizada de fluxos nem prova completa com leitor de tela.
