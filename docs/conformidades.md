# Conformidades — SCRUM-566

A rota `/mainConformityScreen` utiliza dados reais do escopo autorizado pelo backend. A autenticação segue a sessão Firebase existente, com `Authorization: Bearer <token>`, e a URL segue `VITE_API_URL` e o proxy de desenvolvimento já configurados.

Referência original: [OpenAPI da API Astro](https://astro-api-h2hx.onrender.com/v3/api-docs). Os caminhos com `/collaborators` abaixo pertencem à alteração local da SCRUM-657 e ainda não foram publicados.

| Ação | Endpoint |
| --- | --- |
| Listar | `GET /conformities/collaborators` |
| Consultar antes de editar | `GET /conformities/collaborators/{conformityId}` |
| Adicionar manualmente | `POST /conformities/collaborators` |
| Editar | `PUT /conformities/collaborators/{conformityId}` |
| Tornar não aplicável | `PATCH /conformities/collaborators/{conformityId}/applicability` |
| Importar Excel | `POST /conformities/collaborators/import` |

As opções de cadastro vêm de `GET /collaborators` (apenas `ATIVO`) e `GET /nrs`. A edição de histórico usa nome e email do detalhe da conformidade, sem exigir que o colaborador ainda conste nas opções de cadastro.

## Comportamento

- POST envia `collaboratorId`, `nrId` e `expiresAt`; PUT envia somente `nrId` e `expiresAt`. Validade vazia vira `null`, inclusive no PUT, em que o campo é obrigatório.
- PATCH envia `{ applicable: false }`. O serviço também aceita `true`; a interface mantém a ação existente de tornar não aplicável.
- Status é o retornado pelo servidor, calculado pela data da sessão PostgreSQL. As origens atuais do banco, `EVENTO` e `MANUAL`, são exibidas como “Evento” e “Manual” na tabela e no filtro. Aplicabilidade, conclusão vinculada, foto e iniciais são preservadas na leitura.
- Toda escrita confirmada dispara nova consulta à view. Isso permite exibir outro representante do histórico após edição, importação ou mudança de aplicabilidade. Falha nessa consulta oferece retry sem repetir a escrita já confirmada.
- Filtros e busca permanecem locais, sobre a lista autorizada. As opções do filtro incluem NRs presentes no histórico, mesmo que não constem do catálogo atual.
- Arquivos XLS/XLSX de até 10 MB são enviados como `multipart/form-data`, parte `file`, sem definir manualmente o `Content-Type`. A interpretação das linhas fica com a API.
- A importação mostra `processed`, `inserted`, `updated`, `rejected` e motivos de cada linha rejeitada. O lote confirmado não pode ser reenviado sem selecionar ou remover o arquivo. A API exige validade preenchida na planilha, embora o cadastro manual aceite ausência de validade.
- Erros mantêm o formulário ou arquivo selecionado. Durante o envio, controles e fechamento do modal ficam bloqueados. Consultas recebem `AbortSignal`; troca de sessão e desmontagem cancelam requisições e descartam respostas tardias.

## Validação e critérios DAD aplicáveis

| Critério | Evidência nesta demanda |
| --- | --- |
| M01–M04 | Tipos em `src/types/conformity.ts`, serviço e hook dedicados, componentes em pastas próprias; alterações em `src/` somente TS/TSX e sem `any`. Build valida os tipos. |
| M05 | Chamadas remotas em `src/services/conformities.ts`, reutilizando configuração e token existentes. |
| M06–M08 | Estado imutável, efeitos com dependências e cancelamento no hook, linhas identificadas por ID e rejeições pelo número da linha. |
| M11–M12 | Carregamento com `role="status"`/`aria-busy`, erros com `role="alert"`, botões bloqueados durante envio, sucesso e rejeições visíveis. Testes de DOM verificam estados; auditoria completa de contraste e teclado não foi realizada. |
| E03 | `useConformities` tipado, com loading, erro, retry e cancelamento. |
| E07–E08 | Conteúdo externo renderizado por interpolação JSX. Validação de IDs, NR, data real e arquivo antes do envio; erros específicos em `src/utils/conformity.ts`. |

Testes: `tests/conformities.test.cjs` cobre contratos, payloads, respostas inválidas, erros e cancelamento; `tests/conformitiesController.test.cjs` cobre atualização da view, concorrência, retry e troca de sessão; `tests/conformitiesUi.test.cjs` verifica os estados reais dos formulários no DOM com controles auxiliares substituídos.

Pendências de verificação: executar os fluxos com sessão autenticada contra o backend e conferir teclado/foco nos modais em navegador real. M10/E04/E09 usam a rota e as guardas existentes. Publicação (M13), histórico de commits (M14), auditoria global de acessibilidade e demais critérios de projeto não foram avaliados nesta demanda.
