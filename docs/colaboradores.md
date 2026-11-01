# Colaboradores

A página /mainEmployeerScreen usa a API principal com token Firebase Bearer. O backend define o escopo e revalida permissões em cada escrita.

| Operação | Endpoint | Comportamento |
| --- | --- | --- |
| Listar | GET /collaborators?excludeSelf=true | Lista COLABORADOR, GESTOR e GESTOR_WORKSPACE no escopo; oculta a própria conta e mantém os três status. |
| Consultar | GET /collaborators/{collaboratorId} | Carrega detalhes para visualização ou edição, incluindo CPF e modalidade. |
| Pré-cadastrar | POST /collaborators | Envia nome, CPF, e-mail, roleId, unitId e modalidade; não envia senha ou status. |
| Editar | PUT /collaborators/{collaboratorId} | Envia campos administrativos e status selecionado após confirmar identidade. |
| Alterar status | PATCH /collaborators/{collaboratorId}/status | Envia ATIVO ou DESATIVADO. Ativar não conclui pré-cadastro. |
| Reenviar chave | POST /collaborators/{id}/access-key/resend | Solicita reenvio para cadastro PRE_CADASTRADO elegível; o cliente não envia e-mail nem corpo. |

Os formulários não exibem nem editam senhas. A confirmação de identidade usa a senha atual do gestor por meio do Firebase; ela não substitui a autorização da API.

Cargos e unidades são selecionados pelos IDs da API. O cadastro oferece vínculos ativos; a edição pode preservar vínculos atuais mesmo inativos. CPF é validado e enviado sem máscara; e-mail é normalizado. ATIVO, DESATIVADO e PRE_CADASTRADO permanecem distintos.

Detalhes com CPF ou modalidade nulos, vazios ou ausentes continuam legíveis. A visualização apresenta “Não informado”; valores legados incompletos permanecem visíveis para correção. A edição exige CPF válido e modalidade selecionada. Valores de tipo incorreto ou modalidade desconhecida são tratados como erro de campo.

A API retorna canManage na listagem e nos detalhes. Gestores de workspace podem editar e alterar o status dos perfis dentro do próprio escopo. Gestores comuns podem consultar os registros, mas outros gestores ficam em modo somente leitura. Campo canManage ausente é tratado como somente leitura. A própria conta continua editável nos fluxos da página Conta, mas é ocultada nesta listagem.

O menu mantém **Ver mais informações** para registros autorizados. **Editar** e **Ativar/Desativar** aparecem somente quando canManage=true. O reenvio da chave aparece somente para registros PRE_CADASTRADO administráveis. Erros não apagam filtros nem dados preenchidos.
