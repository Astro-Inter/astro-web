# Conformidades

A rota /mainConformityScreen usa dados do escopo autorizado pela API. As chamadas usam a sessão Firebase, Authorization: Bearer, VITE_API_URL e o proxy /api em desenvolvimento.

| Ação | Endpoint |
| --- | --- |
| Listar | GET /conformities/collaborators |
| Consultar antes de editar | GET /conformities/collaborators/{conformityId} |
| Adicionar manualmente | POST /conformities/collaborators |
| Editar | PUT /conformities/collaborators/{conformityId} |
| Tornar não aplicável | PATCH /conformities/collaborators/{conformityId}/applicability |
| Importar Excel | POST /conformities/collaborators/import |

As opções de cadastro vêm de GET /collaborators (somente ATIVO) e GET /nrs. A edição do histórico usa nome e e-mail do detalhe da conformidade; o colaborador não precisa continuar no catálogo de cadastro.

## Regras dos dados

- POST envia collaboratorId, nrId e expiresAt; PUT envia nrId e expiresAt. Validade vazia é enviada como null.
- PATCH envia applicable:false. O serviço também aceita true, embora a interface ofereça somente tornar o item não aplicável.
- Status é calculado e retornado pelo servidor. As origens EVENTO e MANUAL são exibidas como “Evento” e “Manual”. Aplicabilidade, conclusão vinculada, foto e iniciais são preservadas na leitura.
- Filtros e busca são locais e operam sobre a lista autorizada. O filtro de NR inclui códigos do histórico mesmo se não constam do catálogo atual.
- XLS/XLSX de até 10 MB é enviado como multipart, na parte file. O navegador define o boundary; a API interpreta as linhas.
- A importação apresenta processed, inserted, updated, rejected e o motivo de cada linha rejeitada. A API exige validade preenchida na planilha, embora o cadastro manual permita ausência de validade.
- Erros mantêm o formulário ou arquivo selecionado. Durante o envio, controles e fechamento ficam bloqueados. Leituras cancelam ao desmontar ou trocar de sessão e descartam respostas antigas.

Os serviços ficam em src/services/conformities.ts; useConformities coordena o estado remoto. Normalização e validação ficam em src/utils/conformity.ts. Os testes estão em tests/conformities.test.cjs, tests/conformitiesController.test.cjs e tests/conformitiesUi.test.cjs.
