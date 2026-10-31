# Chave de acesso do workspace em reenvios

O frontend não gera nem recebe a chave de acesso; ele solicita que a API enfileire o e-mail. O worker gera a chave e a associa ao e-mail normalizado no Redis.

## Comportamento do worker

O patch [reutilizar-codigo-workspace.patch](reutilizar-codigo-workspace.patch) altera o worker para reutilizar uma chave pendente, criar uma nova somente quando não houver chave e gravar com SET NX. Em concorrência, a mensagem deve conter o valor efetivamente persistido no Redis.

A implementação do worker é externa a este repositório. O patch deve ser aplicado no repositório astro-email-worker para que o comportamento passe a valer no consumidor implantado.

## Interface e integração

O popup de envio controla um intervalo de 30 segundos em sessionStorage. Esse intervalo não altera a chave no Redis. A tela de digitação não oferece reenvio e não persiste código, senha ou confirmação de verificação; após recarregar, recupera somente o e-mail.

A API compara a chave recebida com o valor do Redis. HTTP 403 não distingue chave incorreta, chave ausente ou divergência entre instâncias Redis e prefixos. API e worker precisam usar a mesma instância e o mesmo WORKSPACE_ACCESS_TOKEN_PREFIX. A rota de verificação sem e-mail está em [verificar-workspace-so-chave.md](verificar-workspace-so-chave.md).
