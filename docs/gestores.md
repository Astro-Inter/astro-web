# Gestores: rebaixamento para colaborador

A tela de gestores oferece a ação **Rebaixar para colaborador** no menu de
cada gestor, nos estados ativo, desativado e pré-cadastrado. Uma confirmação
identifica a pessoa e explica a preservação da conta, status, cargo, unidade e
histórico. Cancelar não envia requisição.

Ao confirmar, `src/services/managers.ts` envia `PATCH /managers/{id}/demote`,
sem corpo e com token Firebase Bearer. A API restringe a operação ao gestor
ativo do próprio workspace. O retorno usa `ApiResult<ManagerDetailsResponse>`
com campos em inglês, como os demais endpoints de gestores.

O hook `useManagers` bloqueia envios concorrentes e aguarda o sucesso antes de
remover a pessoa da lista e limpar os detalhes. Invalida a consulta de candidatos
para permitir nova promoção quando a conta for elegível. A listagem de
colaboradores busca o estado atualizado ao entrar naquela página.

Falhas mantêm a linha e a confirmação para nova tentativa, com mensagem visível
e `role="alert"` no componente compartilhado. Respostas de sessões anteriores
são descartadas. O modal apresenta carregamento durante a escrita e bloqueia
fechamento/envios duplicados. Após sucesso, o foco retorna ao botão “Promover a
gestor”, pois a ação que abriu o modal deixa de existir junto com a linha removida.
Ao cancelar, o foco volta ao botão de ações do gestor.

O rebaixamento altera somente `GESTOR` para `COLABORADOR`; não ativa contas,
não conclui pré-cadastro e não altera a conta do gestor do workspace. O acesso
de gestor deixa de ser aceito nas próximas requisições protegidas, inclusive
com um token emitido antes da alteração.
