# Migração de campos JSON — SCRUM-684

Contratos conferidos no OpenAPI publicado em https://api.astro-app.solutions/v3/api-docs e no guia frontend-json-field-migration.md em 01/11/2026. A alteração é feita nos DTOs e adaptadores HTTP; os modelos usados pelos componentes e os valores de status/modalidade continuam preservados.

| Fluxo | Adequação |
| --- | --- |
| Resumo e detalhes da conta | name, roleName, unitName e workModel na leitura; PUT continua enviando name, cpf, email, roleId, unitId e workModel |
| Colaboradores | id, name, roleId, roleName, unitId, unitName, workspaceId e workModel; mesmos nomes nas respostas de criação, edição e status |
| Gestores | Listagem e detalhes com nomes ingleses; edição envia name e workModel; promoção continua enviando collaboratorId e status |
| Cargos | roleId, workspaceId, name e collaboratorCount; escritas usam firebaseUid e name |
| NRs de cargos | nrCode/description nas associações; nr/description/active nas opções; escrita nrs com nr e active |
| NRs de unidades | nr/description/active; POST usa o objeto { nrs: [...] }, inclusive { nrs: [] } |
| Consumidores indiretos | Conta, seleção de NRs em cargos/unidades, opções de eventos e formulários e transferência de gestor usam os adaptadores atualizados |

Os GETs de cargos mantêm o parâmetro de query firebase_uid, conforme o OpenAPI. O nome camelCase firebaseUid é usado apenas nos corpos JSON desses endpoints. Não renomear valores ativo/inativo, enum HIBRIDO/REMOTO/PRESENCIAL, dados de planilhas, tracking, respostas da IA ou documentos de NRs: são contratos separados.

## Endpoints do guia sem consumidor neste web

A revisão não encontrou chamadas a GET /collaborators/{collaboratorId}/profile, GET /home/collaborator ou GET /home/manager. A Home deste painel consulta /home/workspace e já entende userName/statistics. Esses endpoints não exigem código novo no web para esta migração. O guia menciona unit no perfil, enquanto o OpenAPI atual anuncia unitName em CollaboratorProfileResponse; como esse perfil não é consumido aqui, nenhum DTO fictício foi criado.

## Verificação

Fixtures dos serviços e testes dos fluxos de conta, colaboradores, gestores, cargos, unidades, eventos, formulários e transferência atualizadas para os novos contratos. Os testes verificam nomes exatos dos payloads, autenticação, query preservada e lista vazia de NRs no novo envelope. Também são executados TypeScript, build, lint e a suíte completa. Não há mudança em dados remotos.
