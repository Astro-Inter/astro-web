# Astro Web

Interface do Astro, feita com Vite, React, TypeScript e React Router. O login com email e senha usa Firebase Authentication; pagamento, cadastros e dados do workspace continuam demonstrativos.

## Executar e verificar

```bash
cp .env.example .env
npm install
npm run dev
npm run lint
npm run build
```

Preencha as variáveis do Firebase no `.env` antes de iniciar a aplicação.

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
  services/firebase.ts   inicialização do Firebase e instância de Authentication
  types/                 entidades e contratos por domínio
  utils/                 máscaras, validações e utilitários compartilhados
  app.tsx                árvore de rotas
  main.tsx               montagem e importação de estilos
styles/                  CSS global e das telas, fora de src/
```

src/ contém apenas .ts e .tsx. A configuração do Firebase fica em src/services/firebase.ts. .env.example documenta as variáveis disponíveis; variáveis VITE_ são públicas no navegador e não devem conter segredos de servidor.

## Firebase

O SDK modular é inicializado na entrada da aplicação usando as variáveis do `.env`. O módulo `src/services/firebase.ts` exporta `firebaseApp` e `firebaseAuth`, reutiliza a instância padrão quando já existe e informa os nomes das variáveis ausentes quando a configuração está incompleta. A configuração segue a [documentação oficial do Firebase](https://firebase.google.com/docs/web/setup).

| Variável | Campo da configuração Firebase |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

O `.env` é ignorado pelo Git. No GitHub, cadastre os mesmos seis nomes em **Settings → Secrets and variables → Actions → Repository secrets**. Os workflows de CI e GitHub Pages injetam esses secrets durante o build e falham com uma mensagem específica se algum estiver vazio. Alterar um secret exige um novo build para atualizar a configuração publicada. Pull requests de forks não recebem esses secrets e precisam de validação em uma branch do próprio repositório.

Para o chatbot, cadastre `VITE_API_URL=https://astro-ai-api-qq6l.onrender.com` em **Settings → Secrets and variables → Actions → Variables**, como variável do repositório. CI e deploy também validam e injetam essa URL no build. Alterar a variável exige um novo build para atualizar o site publicado.

O login usa `signInWithEmailAndPassword` em `src/services/authentication.ts`, conforme a [documentação do Firebase Authentication](https://firebase.google.com/docs/auth/web/password-auth). O hook `src/hooks/useLogin.ts` valida os campos antes do envio, controla carregamento/sucesso/erro e impede envios duplicados. A senha é enviada sem remoção de espaços ou alteração de caracteres. Após autenticar, a aplicação abre `/mainHomeScreen`; a sessão é gerenciada pelo SDK Firebase e a senha é limpa do estado do formulário.

Para usar o login, habilite **Authentication → Sign-in method → Email/Password** no console Firebase e use uma conta já existente em **Authentication → Users**. O fluxo de criação de workspace ainda não cria usuários no Firebase. As rotas continuam acessíveis diretamente sem autenticação nesta etapa; proteção de rotas e recuperação de senha serão implementadas posteriormente.

## Rotas e comportamento demonstrativo

Fluxo de workspace:

/ → /paymentMethod → /createWorkspace → /accessKeyVerified → /createPassword → /includeCompanyInformation → /attachExcelFile → /setAddress → /workspaceCreated → /loadingScreen → /mainPositionScreen.

- /mainPositionScreen: cargos, filtros, criação/edição, status e associação de NRs. Os dados são locais e retornam aos mocks após reload. O chat tem respostas locais.
- /createForms: perguntas de texto, opções, foto e data; cópia, exclusão e reordenação por arraste ou Alt + setas. Salva um exemplo em astro-created-form no navegador.
- /mainFormScreen: listagem mockada de formulários com cartões, busca, filtro de status, paginação, menu de edição e confirmação de exclusão. A exclusão altera somente a instância atual da listagem.
- /editForms: edição de um formulário mockado com quatro tipos de pergunta e confirmações de saída/salvamento. Ao abrir pela listagem, usa o nome e a descrição do cartão selecionado. As alterações ficam na instância atual da página.
- URLs desconhecidas abrem a página de erro com retorno ao início.

As etapas de cadastro/pagamento mantêm a navegação demonstrativa. O login autentica com Firebase e abre a página inicial do workspace. Recuperação de senha, suporte e itens do menu Em breve ainda dependem de implementação. /loadingScreen é uma transição por timer, não uma requisição.

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
| M05 | Firebase e login em src/services, retorno Promise<UserCredential>, tratamento de erros do Authentication e .env fora do versionamento. Outras integrações remotas ainda pendentes. |
| M06–M08 | Estados locais agrupados, atualizações imutáveis, efeitos com dependências verificadas pelo lint e ids estáveis nas listas dinâmicas. |
| M09 | Nenhuma rota recebe parâmetros atualmente. |
| M10 | React Router, navegação interna e rota curinga com retorno ao início. |
| M11 | Correções de contraste, foco, teclado e tooltips realizadas. Certificação integral WCAG AA e validação com leitor de tela ainda não concluídas. |
| M12 | Login apresenta carregamento, sucesso com navegação e erros no DOM. Demais integrações assíncronas reais ainda pendentes. Suspense apresenta carregamento dos módulos das páginas. |
| M13 | Publicação segue pendente. |
| M14 | Histórico em desenvolvimento; acompanhar 20 commits convencionais distribuídos por quatro semanas reais. |

E04 implementado com lazy/Suspense por página e chunks separados no build. E05 parcial: versão ao gravar, sem carga/migração. E08 tem validação de formulários, cargos e arquivo; cadastro mockado mantém seu comportamento definido. E10 tem melhorias de ARIA/foco/teclado, mas ainda precisa de demonstração com NVDA ou VoiceOver. Os demais extras não são declarados concluídos.

## Verificação manual

Conferir limpeza de prazo, datas inválidas, seleção pelo teclado, opções vazias, Outros, confirmação de edição e retorno de foco. Testar tooltips com Tab/Escape e NRs com modais aninhados. Verificar desktop e mobile, inclusive 360 px. Ainda não há suíte automatizada de fluxos nem prova completa com leitor de tela.

## Nomes de arquivos e pastas

Use camelCase em inglês nos arquivos e pastas da aplicação (por exemplo, `appModal/index.tsx`, `errorScreenLayout/index.tsx` e `accessKeyVerified.png`). Componentes React e seus tipos permanecem em PascalCase no código. Cada página e componente mantém seu `index.tsx`, conforme M02 da skill DAD. Imagens e CSS permanecem fora de `src/`, conforme M01.

Exceções: nomes convencionais de ferramentas e metadados (`package.json`, `package-lock.json`, `tsconfig*.json`, `vite.config.ts`, `.oxlintrc.json`, `.env.example`, `.gitignore`, `.github`, `.gitkeep`, `LICENSE` e `README.md`). O README mantém o nome indicado no critério M13. Siglas oficiais, como CNPJ e NR, permanecem nos dados e textos do domínio. URLs existentes são preservadas nesta organização de arquivos.
