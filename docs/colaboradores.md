# Colaboradores — SCRUM-532

A aba `/mainEmployeerScreen` usa os cinco endpoints de colaboradores do [Swagger da API principal](https://astro-api-h2hx.onrender.com/swagger-ui/index.html#/collaborator-controller). As chamadas usam o token Firebase Bearer e o escopo é definido pelo backend.

| Operação | Endpoint | Comportamento |
| --- | --- | --- |
| Listar | `GET /collaborators` | Busca e filtros locais; mantém os três status e não recebe CPF. |
| Consultar | `GET /collaborators/{collaboratorId}` | Carrega os detalhes para visualização e edição, incluindo CPF e modalidade. |
| Pré-cadastrar | `POST /collaborators` | Envia nome, CPF, e-mail, roleId, unitId e modalidade, sem senha ou status. |
| Editar | `PUT /collaborators/{collaboratorId}` | Envia todos os campos administrativos e o status selecionado após confirmar a identidade do gestor. |
| Alterar status | `PATCH /collaborators/{collaboratorId}/status` | Envia explicitamente ATIVO ou DESATIVADO; ativação não conclui um pré-cadastro. |

Os formulários de colaboradores não mostram nem editam senhas. A confirmação de identidade pede somente a senha atual do gestor e mantém a integração Firebase existente. O antigo formulário demonstrativo com senha foi removido.

Cargos e unidades são selecionados pelos IDs retornados pela API. O cadastro oferece vínculos ativos; a edição também permite manter os vínculos atuais quando estão inativos. CPF é validado e enviado sem máscara, e-mail é normalizado e os três status permanecem distintos. O backend continua responsável pelas permissões, conflitos e regras de ativação.

## Verificações

- `npm test`: 94 testes aprovados. Os testes de colaboradores cobrem os cinco contratos, respostas inválidas, erros, validação, cancelamento, envios duplicados, retry, isolamento entre sessões e leitura/renderização com CPF e modalidade ausentes.
- `npm run build`: aprovado, incluindo TypeScript.
- `npm run lint`: sem erros; dois avisos preexistentes em `workspaceCodeForm` e `useAstroChatController`.
- Chrome headless com autenticação e respostas simuladas: listagem, busca, filtro de status, detalhes, cadastro e edição com falhas/retry, bloqueio durante envio, preservação de vínculos inativos, ativação/desativação, layout em 1440 e 360 px e Escape com retorno do foco. Nenhum dado real foi alterado.

## Evidências DAD da integração

| Critério | Estado e evidência |
| --- | --- |
| M01–M04 | Estrutura e tipagem preservadas: arquivos TS/TSX em src, componentes em pastas com index.tsx, entidades em `types/collaborator.ts`, lógica remota no hook/serviço e ausência de any nos novos arquivos. Build aprovado. |
| M05 | Atendido: os cinco endpoints ficam em `services/collaborators.ts`, com Promise tipada, tratamento de erros e URL de ambiente. |
| M06–M08 | Atendidos nesta integração: estados agrupados e imutáveis, efeitos com dependências e cancelamento, listas com IDs da API. Lint e testes do controlador aprovados. |
| M10 | Rota existente preservada com React Router; acesso à aba exercitado no navegador. |
| M11 | Parcial: labels, erros associados aos campos, estados ARIA, Escape e retorno de foco verificados. Auditoria integral de contraste e WCAG AA não realizada. |
| M12 | Atendido: carregamento, sucesso e erro visíveis; falhas preservam os formulários e consultas oferecem nova tentativa. |
| E03/E07/E08 | Implementados na integração: hook tipado com cancelamento, interpolação JSX de dados externos e validação em `utils/collaborator.ts`. |

A validação com conta real e a auditoria com leitor de tela (E10) permanecem pendentes. Publicação (M13) e histórico de commits por quatro semanas (M14) não foram auditados nesta demanda. Outras telas que consomem mocks de colaboradores continuam com seus dados demonstrativos.

## Leitura de cadastros incompletos

A validação inicial dos detalhes exigia CPF com 11 dígitos e modalidade preenchida. O modelo da API permite CPF/modalidade nulos e o [mapper dos detalhes](https://github.com/Astro-Inter/astro-api/blob/c6f697d176f341a12420a62ee67fba0f1ea4cae3/src/main/java/com/astro/api/user/mapper/CollaboratorMapper.java) preserva a modalidade nula. Esses registros faziam o frontend mostrar “A API retornou detalhes inválidos para o colaborador” antes de abrir a visualização ou a edição.

A leitura agora aceita valores nulos, vazios ou ausentes e mostra “Não informado” na visualização. CPF legado em formato incompleto permanece visível para correção. A edição abre normalmente e continua exigindo CPF válido e modalidade selecionada antes do PUT, como determina o contrato de escrita. Respostas com CPF de tipo incorreto ou modalidade desconhecida continuam sendo recusadas, com erro específico por campo. Não foi possível inspecionar o payload da sessão que originou a captura; a regressão foi reproduzida com respostas simuladas contendo campos nulos.
