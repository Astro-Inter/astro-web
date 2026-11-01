# Gestores: despromoção para colaborador

A tela de gestores oferece a ação **Despromover para colaborador** no menu de
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

A despromoção altera somente `GESTOR` para `COLABORADOR`; não ativa contas,
não conclui pré-cadastro e não altera a conta do gestor do workspace. O acesso
de gestor deixa de ser aceito nas próximas requisições protegidas, inclusive
com um token emitido antes da alteração.

## Verificação

- `node --test tests/managers.test.cjs tests/managersController.test.cjs tests/managersDemotionUi.test.cjs`:
  contrato sem corpo, Bearer, IDs inválidos, falhas HTTP, concorrência de envios,
  remoção somente após sucesso, atualização dos candidatos, troca de sessão,
  confirmação/cancelamento para os três status e destino do foco após remoção.
- `npm run build`: tipagem TypeScript e bundle Vite.
- `npm run lint`: padrões estáticos do projeto.

A demanda preserva os critérios DAD M04/M05 (tipagem e API em services),
M06/M07/M08 (estado imutável, efeitos com dependências e IDs estáveis),
M11/M12 (controles semânticos, foco, carregamento/sucesso/erro) e E03
(descarte de respostas de sessões anteriores). Os testes do fluxo usam serviços
simulados. A navegação manual autenticada e o uso de leitor de tela devem ser
verificados separadamente; não houve nova publicação por esta mudança.

## Resultado local em 01/11/2026

- `node --test --test-concurrency=1 tests/*.test.cjs`: **589 aprovados**, zero falhas,
  nenhum ignorado.
- Os três arquivos de testes de gestores também passaram isoladamente:
  **23 aprovados**, incluindo contrato, estado e confirmação da despromoção.
- `npm run build`: aprovado com TypeScript e Vite.
- `npm run lint`: aprovado.
- `git diff --check`: aprovado.
