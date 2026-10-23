# Configurações de workspace — SCRUM-608

## Integrações

- Empresa: `GET /workspace` preenche o formulário existente; `PUT /workspace` salva nome e CNPJ. Validação de 2–255 caracteres e CNPJ string com 14 dígitos. A confirmação aguarda a API antes de retornar às configurações.
- Unidades: `GET /units` preenche os endereços; `POST /units` cria; `PUT /units/{unitId}` atualiza. O mapper recebe os campos em inglês e converte explicitamente `postalCode` para `cep`. Número legado nulo fica vazio para preenchimento. IDs persistidos são separados dos IDs locais do carrossel; unidades já salvas não são removidas pelo formulário. Cada gravação confirmada é preservada se outra unidade falhar.
- Planilha: `POST /workspace/import` recebe arquivo XLS/XLSX de até 10 MiB em `FormData`, com parte JSON `data` apenas quando há endereços novos. O navegador define o boundary. O leitor da primeira aba é compartilhado com o cadastro inicial, preservando o limite e a exigência do gestor no fluxo inicial. A sincronização dispensa essa exigência e compara as unidades por nome normalizado com a listagem real; apenas as novas pedem endereço. Não há endpoint de prévia.
- Resultado da planilha: mostra colaboradores criados, atualizados e inalterados, unidades e cargos criados, além dos motivos das linhas ignoradas. Erros 422 são lidos de `data` e exibem linha, campo e mensagem. Arquivo, seleção e endereços permanecem disponíveis para correção e reenvio.
- Transferência: `GET /managers` mantém o mapper existente (`id_usuario`, `nome`, `email`, `status`), filtra `ATIVO` e envia o ID selecionado em `POST /workspace/manager-transfer`. Acesso pela aba Workspace e pelo fluxo existente na aba Conta. Reaproveita seleção, aviso administrativo e confirmação de senha pelo Firebase; remove os candidatos fictícios desse fluxo. Após sucesso, revalida a autenticação e navega para Home.
- Colaboradores: somente os requests de criação e edição passam a enviar `name` e `workModel`. Respostas e contratos de gestores conservam seus nomes existentes.

Todos os requests usam a base URL configurada no projeto e Bearer do Firebase pelo padrão dos serviços existentes. O envelope é extraído uma única vez. Escritas não têm repetição automática; os modais impedem envios simultâneos e apresentam os erros da API.

As listagens de colaboradores, unidades e cargos ficam nos hooks das respectivas páginas, sem cache persistente ou store compartilhado. Ao retornar a essas páginas, suas consultas são executadas novamente. Revalidar a autenticação após a transferência desmonta as rotas privadas e descarta seus estados administrativos; perfil e navegação voltam a ser carregados com a autorização atualizada. A autorização real das próximas requisições permanece sob responsabilidade do backend.

Pagamentos não foram integrados nem tiveram seu fluxo alterado. Os registros Git desta entrega seguem o card SCRUM-608 e o padrão Astro.

## Verificações

- `npm run build`: aprovado, incluindo TypeScript e Vite.
- `npm run lint`: sem avisos novos; permanecem os dois avisos anteriores em `workspaceCodeForm` e `useAstroChatController`.
- `npm test`: 345 testes aprovados, nenhuma falha; inclui contratos de unidades e colaboradores atualizados, controle de acesso, cadastro inicial e novos testes de configurações.
- `tests/workspaceSettings.test.cjs`: Bearer e payloads, envelope, mapeamento CEP/número legado, multipart, validação anterior ao envio, erros HTTP e 422, ausência de retry automático, leitor Excel compartilhado, formulário preservado em conflito, transferência com confirmação de senha/revalidação, falha parcial nas unidades e reenvio da importação.
- `git diff --check`: sem erros de whitespace.

## Ambiente e limites da validação

Em 23/10/2026, o OpenAPI da base configurada em `VITE_API_URL` respondeu HTTP 200 e publicou `GET/PUT /workspace`, `POST /workspace/import`, `POST /workspace/manager-transfer`, `GET/POST /units` e `PUT /units/{unitId}`. A [PR 50 da API](https://github.com/Astro-Inter/astro-api/pull/50) está mesclada.

Consultas sem credencial a `/workspace` e `/units` responderam HTTP 403. Em seguida, o usuário forneceu uma conta para testes no navegador em `http://localhost:5173/mainUnitScreen`. A autenticação real pelo Firebase foi concluída como responsável pelo workspace.

Validação manual realizada no navegador:

- `GET /workspace`: formulário preenchido com a empresa real. `PUT /workspace`: sucesso mantendo nome/CNPJ existentes.
- `GET /units`: Matriz São Paulo e Unidade Guarulhos carregadas, com contagens de 116 e 14 colaboradores. Números legados nulos apresentados vazios. A tentativa de salvar sem número foi bloqueada, exibindo erro e foco no campo obrigatório.
- `PUT /units/{unitId}`: com autorização do usuário para números genéricos, a Matriz recebeu `1001` e Guarulhos `1002`. Ambos foram confirmados em nova consulta após reabrir a página.
- `POST /units`: criada a unidade `Unidade teste SCRUM-608` (ID 34), com endereço genérico e zero colaboradores. A nova unidade apareceu na listagem e foi inativada pelo fluxo existente após o teste. O registro de teste permanece no ambiente, inativo.
- `POST /workspace/import`, cenário inválido: arquivo sintético com CPF inválido retornou a mensagem da API, detalhando linha 2 e campo `cpf`. O arquivo permaneceu selecionado para correção e reenvio.
- `POST /workspace/import`, cenário de sucesso: após autorização explícita do payload de teste, o backend identificou a responsável pelo e-mail e retornou zero colaboradores criados/atualizados/inalterados, zero unidades/cargos criados e uma linha ignorada. A tela exibiu `Linha 2, campo tipo: Gestor mantido sem alterações`. Nenhum convite foi gerado por esse cenário.
- `GET /managers`: seletor carregou gestores ativos reais; o aviso de perda de permissões e a etapa final de senha foram verificados. O usuário autorizou especificamente a transferência para Lucas L. B. R. A requisição foi enviada após reautenticação, mas o backend recusou com a regra `O workspace deve ter um único gestor responsável para realizar a transferência`. A interface manteve a seleção e apresentou o erro, sem simular sucesso. Não houve troca de responsável. É necessário corrigir a consistência dos responsáveis desse workspace no backend antes de validar a troca efetiva e a nova autorização.
- Correção encontrada no teste real: a API repetiu a mesma mensagem em `message` e `errors`; o serviço de configurações agora remove mensagens idênticas antes de apresentá-las. O caso está coberto por teste de regressão.

Os contratos automatizados também usam DOM simulado. Houve inspeção visual no navegador, acionamento de formulários por teclado e conferência do foco no erro de número. Auditoria completa por teclado, leitor de tela e contraste dos novos estados ainda não realizada. Criação de novos colaboradores por planilha e alteração de seus dados profissionais não foram exercitadas no ambiente real; o teste de sucesso usou a regra de ignorar o gestor para evitar convites e mudanças em pessoas. A transferência efetiva e sua atualização de autorização estão bloqueadas pela consistência do workspace no backend.

## Critérios DAD aplicáveis

- M01–M05: mantida a estrutura React/TypeScript; novos contratos em `src/types`, acesso remoto em `src/services` e regras em hooks/utilitários. Build e testes globais aprovados.
- M06–M08 e M12: estado imutável, limpeza das leituras com AbortController, dependências explícitas, chaves estáveis e estados de carregamento, sucesso e erro cobertos por testes.
- M10 e E09: rotas existentes e `useNavigate`, com guarda exclusiva de configurações para `GESTOR_WORKSPACE`; testes de acesso aprovados.
- M11 e E10: parcial. Labels, mensagens `role="alert"`/`role="status"` e componentes existentes de modal/foco foram preservados. Envio por teclado e foco no erro de número foram verificados no navegador; auditoria completa de teclado, leitor de tela e contraste permanece pendente.
- E03, E07 e E08: consultas canceláveis, renderização dos dados externos por JSX e validações tipadas nos utilitários, com limites específicos para configurações e importação.
- M13 e M14: publicação e histórico global não foram auditados nesta demanda; os commits desta entrega seguem o padrão Astro, sem criar histórico artificial.

## Arquivos alterados ou criados

- `docs/workspace-settings-scrum608.md`
- `src/components/addressForm/index.tsx`
- `src/components/attachExcelFileForm/index.tsx`
- `src/components/companyInformationForm/index.tsx`
- `src/components/confirmationModal/index.tsx`
- `src/components/replaceAccountFlowModal/index.tsx`
- `src/components/workspaceImportSummary/index.tsx`
- `src/components/workspaceManagerTransferModal/index.tsx`
- `src/components/workspaceQueryFeedback/index.tsx`
- `src/components/workspaceSettingsSaveModal/index.tsx`
- `src/hooks/useWorkspaceAddresses.ts`
- `src/hooks/useWorkspaceCompany.ts`
- `src/hooks/useWorkspaceImport.ts`
- `src/hooks/useWorkspaceManagerTransfer.ts`
- `src/hooks/useWorkspaceQuery.ts`
- `src/hooks/useWorkspaceUnitEditor.ts`
- `src/pages/attachExcelFile/index.tsx`
- `src/pages/includeCompanyInformation/index.tsx`
- `src/pages/mainAccountScreen/index.tsx`
- `src/pages/mainWorkspaceSettingsScreen/index.tsx`
- `src/pages/setAddress/index.tsx`
- `src/pages/workspaceAddressSettings/index.tsx`
- `src/pages/workspaceCompanySettings/index.tsx`
- `src/pages/workspaceSpreadsheetSettings/index.tsx`
- `src/services/collaborators.ts`
- `src/services/units.ts`
- `src/services/workspaceSettings.ts`
- `src/types/address.ts`
- `src/types/collaborator.ts`
- `src/types/unit.ts`
- `src/types/workspaceSettings.ts`
- `src/utils/excelUnits.ts`
- `src/utils/spreadsheet.ts`
- `src/utils/workspaceSettings.ts`
- `styles/workspaceSettings.css`
- `tests/accessControl.test.cjs`
- `tests/collaborators.test.cjs`
- `tests/forms.test.cjs`
- `tests/identityConfirmation.test.cjs`
- `tests/units.test.cjs`
- `tests/unitsUi.test.cjs`
- `tests/workspaceSettings.test.cjs`
