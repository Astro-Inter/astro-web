# Astro Web

Interface do Astro, feita com Vite, React, TypeScript e React Router. O login usa Firebase Authentication; cadastro inicial, home, cargos, unidades e colaboradores usam a API principal. Pagamento e outras telas internas continuam demonstrativos.

## Executar e verificar

```bash
cp .env.example .env
npm install
npm run dev
npm run lint
npm test
npm run build
```

Preencha as variáveis do Firebase no `.env` antes de iniciar a aplicação.

O build verifica os tipos e gera dist/. O CI executa npm ci, lint, build e testes em pull requests e pushes para main. Os testes de cadastro usam respostas simuladas e não criam contas na API real. O lint verifica regras de hooks e dependências dos efeitos. Se este ambiente Windows bloquear o carregador padrão do Vite com spawn EPERM, a verificação equivalente é:

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

As ações que usam o modal de senha atual confirmam a identidade com reautenticação do Firebase. A arquitetura, os pontos integrados, exemplos de reutilização e o roteiro de teste estão em [Confirmação de identidade — SCRUM-516](docs/confirmacao-de-identidade.md).

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

Em **Settings → Secrets and variables → Actions → Variables**, configure as duas variáveis do repositório:

- `VITE_API_URL=https://astro-api-h2hx.onrender.com`: API principal do sistema, usada para cadastrar o workspace.
- `VITE_API_IA_URL=https://astro-ai-api-qq6l.onrender.com`: API do chatbot. A antiga URL da IA em `VITE_API_URL` deve ser movida para esta variável.

CI e deploy validam e injetam ambas as URLs no build. Alterar as variáveis exige um novo build para atualizar o site publicado.

No desenvolvimento (`npm run dev`), as chamadas da API principal usam `/api` na mesma origem do frontend. O proxy de `vite.config.ts` remove esse prefixo, encaminha para `VITE_API_URL` e remove o cabeçalho Origin local. Isso permite testar o cadastro em localhost enquanto a API não permite o preflight CORS dessa origem. Reinicie o Vite após mudar as URLs ou a configuração do proxy.

Em produção, as chamadas usam diretamente `VITE_API_URL`. O backend precisa permitir a origem publicada do frontend, os métodos GET/POST/PUT/PATCH/OPTIONS e os cabeçalhos Authorization e Content-Type usados pelas chamadas. O proxy do Vite existe somente no servidor de desenvolvimento; GitHub Pages não oferece esse proxy. O Swagger está em [API principal](https://astro-api-h2hx.onrender.com/swagger-ui/index.html) e sua especificação em [OpenAPI](https://astro-api-h2hx.onrender.com/v3/api-docs).

O login primeiro chama `POST /verify-email` com `{ email }`, usando o endereço sem espaços nas extremidades e em minúsculas. Somente HTTP 200 com `success: true` e `data.userType` igual a `GESTOR` ou `GESTOR_WORKSPACE` permite enviar email e senha ao Firebase com `signInWithEmailAndPassword` em `src/services/authentication.ts`, conforme a [documentação do Firebase Authentication](https://firebase.google.com/docs/auth/web/password-auth). Email não encontrado (404), colaborador, resposta inválida ou falha na API interrompem o fluxo antes do Firebase e exibem um erro no formulário. Essa verificação também se aplica ao login após criar o workspace. O hook `src/hooks/useLogin.ts` valida os campos antes do envio, controla carregamento/sucesso/erro e impede envios duplicados. A senha é enviada exclusivamente ao Firebase, sem remoção de espaços ou alteração de caracteres. Após autenticar, a aplicação abre `/mainHomeScreen`; a sessão é gerenciada pelo SDK Firebase e a senha é limpa do estado do formulário.

Para usar o login, habilite **Authentication → Sign-in method → Email/Password** no console Firebase. No cadastro inicial, a API principal cria a conta Firebase do gestor; o navegador não cria essa conta previamente. As telas internas exigem uma sessão Firebase, enquanto as etapas do cadastro são públicas. Recuperação de senha continua pendente.

O perfil retornado por `/verify-email` fica no contexto de autenticação, associado ao usuário Firebase. `GESTOR_WORKSPACE` acessa Gestores, configurações do workspace e a opção de substituição do responsável. `GESTOR` vê Conta no menu, sem as opções exclusivas do workspace. As áreas compartilhadas continuam disponíveis para ambos. Ao restaurar a sessão, a aplicação consulta o perfil novamente antes de abrir as telas privadas; parâmetros de URL não alteram permissões. Consulte a [matriz de acessos — SCRUM-565](docs/niveis-de-acesso.md) para as referências do Figma, regras de rotas e limites do escopo.

## Rotas e comportamento

Fluxo de workspace:

/ → /paymentMethod (e-mail do gestor) → /createWorkspace (código de acesso) → /accessKeyVerified → /createPassword → /includeCompanyInformation → /attachExcelFile → /setAddress → /loadingScreen?context=registration → /workspaceCreated → autenticação do gestor → /mainHomeScreen.

Em `/paymentMethod`, “Finalizar compra” valida o e-mail informado e chama `POST /add-manager-email` com `{ "email": "gestor@empresa.com" }`. O botão bloqueia novos envios enquanto aguarda a API, preserva o e-mail em caso de erro e abre a página do código somente após `204`. A resposta confirma a inclusão na fila de processamento de e-mails, sem criar a conta ou confirmar a entrega da mensagem. Dados de cartão/Pix não são enviados a esse endpoint.

A página `/createWorkspace` mantém os seis campos do código, sem campo de e-mail e sem reenvio. O link “Verificar” abre essa página diretamente, sem popup ou validação do pagamento. Quando o e-mail da solicitação está disponível no cadastro, a verificação usa a rota publicada `POST /verify-key?tipoConta=GESTOR_WORKSPACE` com `{ email, accessKey }` e avança somente após HTTP 204. O e-mail salvo sozinho nunca confirma a verificação. Sem um e-mail disponível, utiliza o contrato preparado `POST /verify-workspace-key` com `{ accessKey }`, exigindo HTTP 200 e `{ success: true, data: { email } }`; **esse acesso independente de sessão depende de aplicar e publicar `docs/backend/verificar-workspace-so-chave.patch` na API**. A confirmação é preservada no rascunho da aba após resposta válida da API e é invalidada ao trocar o e-mail. Respostas de erro não permitem avançar; 403 vazio da rota nova não é interpretado como prova de chave inválida. Acesso direto às telas de confirmação/senha não simula uma verificação bem-sucedida.

O `WorkspaceRegistrationProvider` restaura o rascunho antes de renderizar as rotas, mantendo a etapa após reload. Empresa, endereços, senha já definida, confirmação do e-mail e bytes originais da planilha ficam criptografados com AES-GCM no IndexedDB, com chave não exportável. O sessionStorage contém somente o identificador da aba e o e-mail do fluxo, nunca a senha ou o código. Os registros expiram após 24 horas sem gravação; versões incompatíveis são descartadas. Dados da empresa e endereços são salvos durante a edição, e a planilha é salva ao selecionar/remover. Reiniciar o cadastro limpa o rascunho; o sucesso remove empresa, endereços e planilha, conservando o resultado e somente o e-mail e a senha criptografados para permitir reload da confirmação e autenticar o gestor ao continuar. Após o login, o rascunho é limpo. Se o reload interromper o envio final, a tela mostra a interrupção e não repete automaticamente o POST. Com armazenamento bloqueado, o fluxo continua em memória. O botão final das unidades abre o carregamento e executa uma única chamada pública `POST /register-workspace`, mesmo com remontagens do React StrictMode. A parte `data` contém um Blob JSON `application/json`; `file` contém a planilha original. O navegador define o boundary do multipart.

Os campos são validados antes do envio. CNPJ e CEP vão sem máscara, número como string e complemento como `addressLine2`. A planilha deve ser XLS/XLSX, não vazia e ter até 5 MB; dados e arquivo precisam caber no limite de 6 MB. A primeira aba precisa das colunas nome, cpf, email, unidade, cargo e modalidade, incluindo exatamente uma linha com o e-mail do gestor. A validação completa dos colaboradores continua sendo responsabilidade da API.

Antes de avançar para as unidades, o frontend confere os seis cabeçalhos e localiza exatamente uma linha com o e-mail informado no cadastro, ignorando espaços externos e diferenças entre maiúsculas e minúsculas. Nome, unidade e cargo do gestor devem estar preenchidos. Gestor ausente, repetido ou com dados incompletos mantém a tela da planilha e mostra o problema para correção, com a linha quando disponível. CPF e modalidade do gestor não são exigidos nessa validação, conforme o contrato atual da API. Essa conferência é local; a criação no banco e no Firebase ocorre apenas no `/register-workspace` final com a planilha original.

Ao continuar em `/attachExcelFile`, o navegador lê a primeira aba com [SheetJS](https://docs.sheetjs.com/docs/getting-started/installation/frameworks/) e extrai a coluna `unidade`. O leitor só é carregado quando necessário. Cada nome distinto gera uma ficha em `/setAddress`; espaços externos, acentos e maiúsculas são normalizados para evitar duplicações conforme a comparação da API. Linhas com unidade vazia e cabeçalhos ausentes ou duplicados bloqueiam o avanço com uma mensagem. As unidades importadas têm nome protegido e não podem ser excluídas nessa etapa. É possível adicionar e remover unidades manuais com nome e endereço, sem criar linhas de colaboradores ou cargos na planilha. A origem de cada unidade fica no rascunho local e não é enviada no JSON da API. Uma nova leitura preserva endereços correspondentes e unidades manuais, remove as importadas ausentes e promove uma unidade manual a importada se seu nome passar a constar no arquivo. O arquivo original é enviado à API.

Ao completar os oito dígitos do CEP, a ficha consulta o [ViaCEP](https://viacep.com.br/) e preenche estado, cidade, bairro e rua. Número e complemento são informados pela pessoa. A consulta tem espera curta para evitar chamadas a cada tecla, limite de dez segundos e cancelamento ao trocar o CEP, a unidade ou sair da tela. Respostas antigas e campos editados enquanto a consulta estava em andamento não sobrescrevem o endereço atual. Erros permitem consultar novamente ou preencher manualmente; CEPs gerais podem retornar rua e bairro vazios. A busca externa envia somente o CEP e não precisa de chave de API.

Somente `201`, `success: true` e um `workspaceId` válido abrem a conclusão. Erros permanecem no DOM e permitem tentar novamente ou corrigir e-mail, senha, empresa, planilha e unidades, preservando o rascunho. Detalhes de importação com linha/campo/mensagem são exibidos quando enviados pela API. O backend atual pode retornar `500` sem esses detalhes para planilhas inválidas; o frontend não consegue recuperar informações que a API omite.

O endpoint não retorna token. Na conclusão, “Continuar” autentica pelo Firebase usando o e-mail e a senha do próprio gestor recém-cadastrado e abre `/mainHomeScreen`. O hook `useCreatedWorkspaceLogin` bloqueia cliques duplicados, mostra o carregamento padrão e permite repetir apenas o login após erro, sem reenviar a criação do workspace. As credenciais são limpas após autenticar. Confirmações antigas sem credenciais preservadas oferecem acesso ao login. O sucesso confirma o cadastro, sem garantir a entrega de e-mails aos colaboradores. A validação do código é feita pela API, e a interface avança somente após a resposta de sucesso.

- /mainPositionScreen: cargos do workspace carregados pela API, com busca e filtro local, criação (`POST /roles`), edição (`PUT /roles/{roleId}`) e alternância de status (`PATCH /roles/{roleId}/status`). A quantidade de colaboradores vem do backend. Gerenciar NRs consulta os vínculos (`GET /roles/{roleId}/nrs`) e as opções (`GET /roles/{roleId}/nrs/options`); salvar envia todas as opções com `nr` e `ativo` para `POST /roles/{roleId}/nrs`, incluindo desvinculações. As chamadas usam token Firebase Bearer e `firebase_uid` do gestor autenticado. Os diálogos aguardam sucesso antes de fechar, preservam os dados em caso de erro e bloqueiam envios duplicados. A listagem e as NRs permitem tentar novamente após falha. As recomendações de IA mockadas foram removidas dessa tela porque esses endpoints não fornecem recomendações.
- /mainEmployeerScreen: colaboradores do escopo do gestor via `GET /collaborators`, com busca e filtros locais por cargo e pelos três status. Informações e edição consultam `GET /collaborators/{collaboratorId}`; a lista não contém CPF. O pré-cadastro usa `POST /collaborators`, sem senha ou status no corpo, e retorna `PRE_CADASTRADO`. Cargo e unidade são selecionados pelos IDs das listas da API; somente vínculos ativos são oferecidos para novos cadastros, e a edição preserva vínculos inativos atuais. Após confirmar a identidade do gestor, a edição envia todos os campos administrativos para `PUT /collaborators/{collaboratorId}`, incluindo o status atual. Ativar/desativar envia o status desejado (`ATIVO`/`DESATIVADO`) para `PATCH /collaborators/{collaboratorId}/status`; a ativação não conclui um pré-cadastro e pode ser recusada pelo backend. Os cinco endpoints usam Bearer Firebase sem `firebase_uid`. Carregamento, sucesso e erros aparecem na página ou no diálogo, com nova tentativa nas consultas e campos preservados após falha ao salvar. Fotos usam as iniciais como fallback. Eventos, conformidades e outras telas que ainda consomem mocks de colaboradores continuam demonstrativos.
- /createForms: perguntas de texto, opções, foto e data; cópia, exclusão e reordenação por arraste ou Alt + setas. Salva um exemplo em astro-created-form no navegador.
- /mainFormScreen: listagem mockada de formulários com cartões, busca, filtro de status, paginação, menu de edição e confirmação de exclusão. A exclusão altera somente a instância atual da listagem.
- /editForms: edição de um formulário mockado com quatro tipos de pergunta e confirmações de saída/salvamento. Ao abrir pela listagem, usa o nome e a descrição do cartão selecionado. As alterações ficam na instância atual da página.
- URLs desconhecidas abrem a página de erro com retorno ao início.

Pagamento continua demonstrativo. O login autentica com Firebase e abre a página inicial do workspace. Recuperação de senha, suporte e itens do menu Em breve ainda dependem de implementação. `/loadingScreen?context=registration` aguarda o cadastro real; `/loadingScreen` sem esse contexto mantém a transição para uma sessão já autenticada.

## Formulários e acessibilidade

Criação e edição compartilham utils/forms.ts: validam nome, gestor, data, existência de perguntas, títulos e opções normais. A opção Outros é uma prévia de resposta e pode ficar vazia. Datas impossíveis ou incompletas não mantêm silenciosamente o prazo anterior; limpar o campo limpa o valor do formulário.

As máscaras de email, CNPJ, CEP e cartão ficam em utils/. No cadastro, a seleção da planilha valida extensão .xlsx/.xls, arquivo não vazio e limite de 5 MB, bloqueando o avanço sem um arquivo válido. Outras importações demonstrativas conservam o limite de 10 MB.

Erros e confirmações gerais de createForms continuam destinados a leitores de tela durante esta fase mockada. Erros de data e de confirmação da edição são apresentados junto ao controle correspondente. Prévia de respostas e botão de carregar foto permanecem desabilitados e com opacidade reduzida.

AppModal/ConfirmationModal usam opções explícitas backdrop e preservePageScroll. Confirmações independentes escurecem a página; confirmações sobre outro modal podem usar fundo transparente. O foco inicial é definido na abertura e não volta ao título quando a validação atualiza o diálogo.

- Menus e seletores: setas, Home/End e Escape, foco visível e estados ARIA.
- Calendário: setas entre dias, Home/End para semana, PageUp/PageDown para mês, Enter para escolher e Escape para fechar. A entrada manual continua disponível.
- Texto truncado: Tab para receber foco quando há corte, tooltip associado por aria-describedby e Escape para fechar. Recomendações de NRs também têm associação ARIA e fechamento por Escape.
- Placeholder ativo: #b6b2c3 sobre #444252, contraste superior a 4,5:1. Prévias desabilitadas conservam a opacidade definida para o protótipo.

## Persistência

createForms grava astro-created-form e astro-create-forms-draft com _versao: 1 e trata falhas de escrita. Ainda não existe coleção de formulários nem carga/migração desses registros. A recuperação de rascunho será definida posteriormente. EditForms usa estado local. Cargos e seus vínculos de NRs são persistidos na API; NRs das outras telas ainda usam dados demonstrativos. O cadastro inicial do workspace é persistido na API na etapa final; o rascunho é descartado após autenticar o gestor na confirmação de sucesso.

## Critérios DAD (14/05/2026)

| Critério | Estado atual |
| --- | --- |
| M01–M04 | Vite/React/TS estrito, somente TS/TSX em src, componentes/páginas em pastas próprias, props e domínio tipados, sem any. Lógica de perguntas e validação compartilhada. |
| M05 | Firebase, login, chatbot e cadastro inicial em src/services, retornos Promise tipados, tratamento de erros e .env fora do versionamento. A gestão das entidades internas ainda usa dados demonstrativos. |
| M06–M08 | Estados locais agrupados, atualizações imutáveis, efeitos com dependências verificadas pelo lint e ids estáveis nas listas dinâmicas. |
| M09 | Nenhuma rota recebe parâmetros atualmente. |
| M10 | React Router, navegação interna e rota curinga com retorno ao início. |
| M11 | Correções de contraste, foco, teclado e tooltips realizadas. Certificação integral WCAG AA e validação com leitor de tela ainda não concluídas. |
| M12 | Login e cadastro inicial apresentam carregamento, sucesso com navegação e erros no DOM. Demais integrações assíncronas reais ainda pendentes. |
| M13 | Publicação segue pendente. |
| M14 | Histórico em desenvolvimento; acompanhar 20 commits convencionais distribuídos por quatro semanas reais. |

E01 também é usado no cadastro: Provider dedicado com hook e tipagem, mantendo o rascunho entre as rotas. E04 implementado com lazy/Suspense por página e chunks separados no build. E05 parcial: versão ao gravar, sem carga/migração. E08 inclui validação e normalização do cadastro em `utils/workspaceRegistration.ts` antes do envio. E10 tem melhorias de ARIA/foco/teclado, mas ainda precisa de demonstração com NVDA ou VoiceOver. Os demais extras não são declarados concluídos.

## Verificação manual

Conferir limpeza de prazo, datas inválidas, seleção pelo teclado, opções vazias, Outros, confirmação de edição e retorno de foco. Testar tooltips com Tab/Escape e NRs com modais aninhados. Verificar desktop e mobile, inclusive 360 px. Os testes automatizados de contrato e validação rodam com `npm test`. Ainda não há uma suíte contínua de navegação no navegador nem prova completa com leitor de tela.

## Nomes de arquivos e pastas

Use camelCase em inglês nos arquivos e pastas da aplicação (por exemplo, `appModal/index.tsx`, `errorScreenLayout/index.tsx` e `accessKeyVerified.png`). Componentes React e seus tipos permanecem em PascalCase no código. Cada página e componente mantém seu `index.tsx`, conforme M02 da skill DAD. Imagens e CSS permanecem fora de `src/`, conforme M01.

Exceções: nomes convencionais de ferramentas e metadados (`package.json`, `package-lock.json`, `tsconfig*.json`, `vite.config.ts`, `.oxlintrc.json`, `.env.example`, `.gitignore`, `.github`, `.gitkeep`, `LICENSE` e `README.md`). O README mantém o nome indicado no critério M13. Siglas oficiais, como CNPJ e NR, permanecem nos dados e textos do domínio. URLs existentes são preservadas nesta organização de arquivos.
