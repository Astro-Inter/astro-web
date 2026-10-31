# Fluxo de envio de e-mail

A API coloca solicitações de e-mail em filas Redis. Um worker externo consome os itens e faz o envio por SMTP. A confirmação HTTP indica que a solicitação foi aceita ou enfileirada; não confirma entrega na caixa postal.

## Componentes

- O cadastro de gestor envia a solicitação para POST /add-manager-email.
- O reenvio de chave de colaborador usa POST /collaborators/{id}/access-key/resend.
- O worker de e-mail consome as filas de workspace e colaboradores. A fila de workspace se chama processamento:email:workspace.
- O worker envia a mensagem pelo SMTP e trata falhas conforme sua política de execução.

A API e o worker precisam usar a mesma instância Redis e os nomes/prefixos de chave esperados em cada fluxo. O frontend não envia a mensagem diretamente e não consegue confirmar se o worker consumiu a fila.

## Diagnóstico

Para localizar uma falha, correlacione a resposta da API, a inclusão do item na fila, o consumo pelo worker e a aceitação SMTP. Confira os logs do consumidor ativo, a conexão Redis, a retirada do item e o resultado do envio. Uma resposta 204 ou 202 da API, ou um job concluído, não comprova recebimento pelo destinatário.

Não registre senhas, tokens, códigos de acesso ou conteúdo sensível nos logs. Consumidores concorrentes podem reenviar mensagens ou alterar chaves pendentes.
