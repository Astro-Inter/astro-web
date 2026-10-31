# Perfil da conta

A rota /mainAccountScreen, disponível para GESTOR e GESTOR_WORKSPACE, usa os serviços de src/services/account.ts. As chamadas enviam o ID token Firebase no cabeçalho Authorization: Bearer. Perfil, CPF e URL temporária da foto não são persistidos no armazenamento do navegador.

| Operação | Endpoint | Uso no web |
| --- | --- | --- |
| Resumo | GET /user/me/account-summary | Nome, e-mail e profilePhotoUrl do cartão inicial. |
| Detalhes | GET /user/me/account-details | Nome, CPF, e-mail, cargo, unidade, modalidade e foto para visualização/edição. |
| Edição | PUT /user/me/account-details | Envia name, cpf, email, roleId, unitId e workModel. |
| Opções | GET /roles?firebase_uid=... e GET /units | Fornece escolhas ao gestor do workspace. |
| Foto | PUT /user/me/profile-photo | Envia o campo file em multipart; a API pode responder 204. |

useAccountProfile carrega o resumo. O detalhe é consultado somente após a confirmação de identidade que antecede **Ver tudo** ou **Editar**. Campos ausentes aparecem vazios; a tela não inventa valores. A senha não é exibida nem enviada na edição.

O formulário valida nome, CPF, e-mail, IDs positivos e modalidade. CPF é enviado sem máscara; e-mail sem espaços externos e em minúsculas; workModel aceita HIBRIDO, REMOTO ou PRESENCIAL. O gestor comum mantém cargo e unidade bloqueados. O gestor do workspace pode escolher opções ativas ou preservar seu vínculo atual mesmo que esteja inativo ou ausente da lista. A API valida novamente escopo e permissões.

O formulário preserva valores em caso de erro e bloqueia envios duplicados. O resumo só muda após resposta confirmada do PUT. Quando o e-mail muda, o frontend recarrega a identidade Firebase, renova o token e oferece o envio separado da confirmação de e-mail. Se essa recarga falhar após o PUT, a mensagem informa que os dados já foram salvos; a edição não é reenviada.

## Foto do perfil

O upload aceita JPEG, PNG ou WebP não vazio, de até 5 MB. O arquivo original é enviado em PUT /user/me/profile-photo, na parte multipart file, com token Firebase. O navegador define Content-Type e boundary. Após sucesso, uma nova consulta ao resumo atualiza o cartão e o modal.

Se a consulta do resumo falhar depois do upload, **Atualizar foto** repete somente o GET. Sair da tela ou trocar de sessão cancela operações pendentes e descarta respostas antigas; cancelar a requisição no navegador não desfaz uma gravação já recebida pelo servidor.

A transferência de responsável usa seu fluxo próprio, sem chamar o endpoint de edição do perfil. A página é remontada quando o UID muda, fechando modais da sessão anterior.
