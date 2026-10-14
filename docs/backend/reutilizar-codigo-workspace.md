# Reutilizar a chave no reenvio de workspace

## Situação

O frontend não gera nem recebe a chave. O `astro-email-worker`, na base `1b0086f`, gera outra chave a cada item da fila e substitui o valor anterior no Redis. Reiniciar o Vite não muda o Redis, mas um reenvio processado pelo worker atual muda a chave.

## Correção preparada

O arquivo `reutilizar-codigo-workspace.patch` altera o worker para:

- Reutilizar a chave já salva para o e-mail normalizado.
- Criar uma chave somente quando não existir uma pendente.
- Usar `SET NX` para que pedidos simultâneos não substituam a chave.
- Enviar o valor efetivamente persistido em caso de concorrência.

O patch inclui documentação e quatro testes. Na cópia temporária do worker, os 13 testes passaram, sem Redis ou SMTP reais.

## Aplicação no repositório astro-email-worker

Aplicar o patch com `git apply`, executar `npm test` e publicar o worker atualizado. A alteração foi preparada e testada localmente; não foi enviada ao GitHub nem publicada. Enquanto o worker publicado permanecer na versão anterior, um reenvio real ainda pode trocar a chave.

O frontend implementa o intervalo de 30 segundos somente no popup, com prazo salvo em sessionStorage. A tela de digitar o código não oferece reenvio nem utiliza o estado de reenvio do popup. A página recupera somente o e-mail ao recarregar; não persiste o código, a senha nem uma confirmação de verificação.

## Diagnóstico do retorno 403

A implementação de `UserService.verifyAccessKey` consultada na main de `astro-api` usa `WORKSPACE_ACCESS_TOKEN_PREFIX + email` para `GESTOR_WORKSPACE` e compara a chave recebida com o valor no Redis. A API retorna 403 vazio quando a comparação falha; esse retorno não permite distinguir chave substituída, chave ausente ou divergência de Redis/prefixo entre os serviços. O frontend foi adaptado posteriormente para uma nova rota que aceita apenas a chave; consultar `verificar-workspace-so-chave.md` e publicar o patch correspondente na API. A substituição pelo worker é um defeito confirmado. Se persistir após publicar os patches, conferir que API e worker utilizam a mesma instância de Redis e o mesmo `WORKSPACE_ACCESS_TOKEN_PREFIX`.
