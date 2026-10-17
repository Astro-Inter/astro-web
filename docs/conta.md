# Perfil da conta — SCRUM-567

A rota `/mainAccountScreen`, compartilhada por `GESTOR` e `GESTOR_WORKSPACE`, usa os contratos publicados no [Swagger](https://astro-api-h2hx.onrender.com/swagger-ui/index.html) em 17/10/2026. As chamadas ficam em `src/services/account.ts` e enviam o ID token Firebase no cabeçalho `Authorization: Bearer`. Não há persistência do perfil, CPF ou URL temporária da foto no armazenamento do navegador.

| Operação | Endpoint | Uso no web |
| --- | --- | --- |
| Resumo | `GET /user/me/account-summary` | Nome, e-mail e `profilePhotoUrl` do cartão inicial. |
| Detalhes | `GET /user/me/account-details` | Nome, CPF, e-mail, `roleId`, cargo, `unitId`, unidade, modalidade e foto para visualização/edição. |
| Edição | `PUT /user/me/account-details` | Envia exatamente `name`, `cpf`, `email`, `roleId`, `unitId` e `workModel`; usa os detalhes retornados após a gravação. |
| Opções | `GET /roles?firebase_uid=...` e `GET /units` | Reaproveita os serviços existentes para as escolhas do gestor do workspace. |
| Foto | `PUT /user/me/profile-photo` | Envia o campo `file` no multipart e aceita sucesso 204. |

O hook `useAccountProfile` carrega somente o resumo. A foto vem de `profilePhotoUrl`; ausência ou falha no carregamento mostra as iniciais do próprio usuário. A confirmação de identidade por senha continua antes de “Ver tudo” e “Editar”; somente depois dela o hook `useAccountDetails` consulta os detalhes. O modal apresenta nome, CPF, e-mail, unidade, cargo e modalidade. Campos ausentes ficam vazios, incluindo CPF e e-mail. A senha não é exibida nem enviada no PUT. O endpoint móvel `/user/me` e as NRs não são consultados por esta tela. A confirmação no frontend é parte da experiência; a API continua responsável pela autorização de todas as chamadas.

O formulário valida nome, CPF, e-mail, IDs positivos e modalidade antes do envio completo. CPF segue sem máscara; e-mail segue sem espaços externos e em minúsculas; `workModel` aceita `HIBRIDO`, `REMOTO` ou `PRESENCIAL`. O gestor comum mantém cargo e unidade nos seletores bloqueados. O gestor do workspace escolhe opções ativas, podendo preservar seu vínculo atual mesmo se inativo ou ausente da lista. A API confirma o escopo e as permissões. Campos obrigatórios ausentes na leitura devem ser preenchidos antes de salvar; nenhum valor é inventado.

O formulário preserva os valores em caso de erro, exibe os conflitos informados pela API, bloqueia envios repetidos e impede fechar o diálogo durante o salvamento. O resumo é atualizado somente com a resposta confirmada do PUT. Se o e-mail mudar, o frontend recarrega a identidade Firebase, renova o token e oferece “Enviar confirmação de e-mail”. Se a recarga da sessão falhar após o PUT, a mensagem informa que os dados já foram salvos e orienta entrar novamente, sem repetir a gravação. O envio da confirmação é separado e explícito.

A foto pode ser trocada pelo ícone de lápis no cartão inicial e no modal de detalhes. Selecionar um JPEG, PNG ou WebP não vazio, de até 5 MB, envia `PUT /user/me/profile-photo` com o arquivo original no campo `file` do multipart e token Firebase. O navegador define o Content-Type e o boundary. O serviço aceita o sucesso `204` sem tentar ler JSON e limita o envio a 60 segundos.

A imagem atual é mantida durante a operação; a interface bloqueia envios duplicados e mostra carregamento, sucesso ou erro. Após o upload confirmado, uma nova consulta a `/user/me/account-summary` atualiza o perfil compartilhado pelo cartão e pelo modal, sem alterar a URL temporária assinada. Se somente essa consulta falhar, a interface informa que a foto já foi salva e oferece “Atualizar foto”, que repete apenas o GET. O envio e a consulta são cancelados ao sair ou trocar de sessão; cancelar no navegador não desfaz uma gravação já recebida pelo servidor.

A transferência do gestor preserva seu fluxo anterior e não usa o endpoint de edição dos dados pessoais.

O conteúdo da conta é remontado quando o UID muda, fechando os modais da sessão anterior. Consultas canceladas e resultados recebidos após a troca de usuário são descartados.

## Verificação

`tests/account.test.cjs` cobre os três novos contratos, payload completo com IDs numéricos e CPF sem máscara, validações, conflitos, carregamento dos detalhes somente após confirmar a identidade, permissões dos seletores, opções ativas, preservação de vínculos atuais, bloqueio de duplicação e atualização do cartão após sucesso. Também verifica confirmação de e-mail separada do PUT, falha de recarga da identidade, nova tentativa, desmontagem e descarte de resultados tardios. Mantém a cobertura do upload multipart, retorno 204, formatos/tamanhos, preservação da foto e repetição somente do GET após gravação confirmada. A confirmação de identidade mantém a cobertura de `tests/identityConfirmation.test.cjs`.

Validação desta etapa: 192 testes aprovados, build TypeScript/Vite aprovado e lint sem erros (dois avisos preexistentes em `workspaceCodeForm` e `useAstroChatController`). Os dois GETs foram consultados com autenticação real; PUTs e confirmação de e-mail foram testados com respostas simuladas, sem alterar os dados ou a foto de uma conta real. A inspeção visual e de teclado no navegador ficou pendente porque o uso do navegador local está desativado nas configurações do Work; os testes no DOM exercitaram os seletores e os dois perfis.

Critérios DAD aplicáveis: M04 (contratos TypeScript), M05 (chamadas no serviço), M06–M07 (estado e efeitos com limpeza), M11 (labels, alt e erro acessível), M12 (carregamento, sucesso e erro), E03 (hooks com cancelamento) e E08 (validação de formulário e arquivo em `src/utils/account.ts`). A verificação visual e a auditoria completa de acessibilidade permanecem pendentes; os critérios globais de publicação e histórico não são comprovados pelos testes desta página.
