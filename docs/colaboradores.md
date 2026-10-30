# Colaboradores — SCRUM-532

A aba `/mainEmployeerScreen` usa os cinco endpoints de colaboradores do [Swagger da API principal](https://astro-api-h2hx.onrender.com/swagger-ui/index.html#/collaborator-controller). As chamadas usam o token Firebase Bearer e o escopo é definido pelo backend.

| Operação | Endpoint | Comportamento |
| --- | --- | --- |
| Listar | `GET /collaborators?excludeSelf=true` | Inclui COLABORADOR, GESTOR e GESTOR_WORKSPACE no escopo; oculta o próprio usuário. Mantém os três status e não recebe CPF. |
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

## Gestores como colaboradores

A listagem e os detalhes usam `vw_colaboradores` com COLABORADOR, GESTOR e GESTOR_WORKSPACE. A aba de colaboradores solicita `excludeSelf=true` à API para ocultar somente o usuário autenticado. As seleções de conformidades usam a consulta sem esse parâmetro, mantendo a própria conta. O backend preserva as permissões de edição e status.
## Permissões de administração por registro

A API retorna `canManage` na listagem e nos detalhes. O gestor do workspace pode editar e alterar o status dos três perfis dentro do seu escopo. O gestor comum pode consultar todos, mas outros gestores e o gestor do workspace aparecem somente para leitura. O próprio perfil permanece editável pelos fluxos da conta; a regra de ocultar a própria conta na listagem continua ativa.

O menu mantém “Ver mais informações” para todos os registros autorizados e mostra “Editar” e “Ativar/Desativar” somente com `canManage=true`. Campo ausente equivale a somente leitura. Os formulários também respeitam a permissão atualizada dos detalhes. A API revalida a autorização em cada escrita; esconder botões não substitui a autorização do backend.

Testes de renderização em `tests/collaboratorsPermissionsUi.test.cjs` cobrem os menus com e sem permissão. `tests/collaborators.test.cjs` cobre a conversão e rejeição de permissões malformadas. M05/M12/E03: comunicação permanece no serviço e no hook, preservando estados e cancelamento; M11 mantém ações por botão e navegação do menu por teclado. Auditoria integral de acessibilidade e publicação continuam fora desta alteração.

## Reenvio da chave de acesso — SCRUM-673

No menu de ações, “Reenviar chave de acesso” aparece somente para registros PRE_CADASTRADO com canManage=true. A ação chama POST /collaborators/{id}/access-key/resend com Bearer Firebase, sem corpo nem e-mail no cliente. A API responde 202 após enfileirar o e-mail no Redis. O feedback informa solicitação de reenvio, sem afirmar entrega. A interface bloqueia solicitações simultâneas, mantém filtros/lista/status e mostra os erros retornados pela API.

Para testar com a API local em http://127.0.0.1:8080, crie o arquivo ignorado `.env.access-key-local` com `VITE_API_URL=http://127.0.0.1:8080` e inicie `npm run dev -- --mode access-key-local --host 127.0.0.1 --port 5180`. Firebase continua usando a configuração existente. O consumidor de envio permanece externo ao repositório da API.

Testes focados: `node --test tests/collaborators*.test.cjs`. Incluem elegibilidade do menu, POST autenticado, validação do ID, erro do Redis, bloqueio de cliques duplicados, preservação dos dados e descarte de resposta após desmontagem.
