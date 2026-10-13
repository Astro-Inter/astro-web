# Verificação de workspace somente pela chave

## Contrato preparado

Base de astro-api: `039cb6ea9e961cd26a09cdfdbe4cd0af6bed0a6b`.

Aplicar `verificar-workspace-so-chave.patch` no repositório `astro-api`. Sem e-mail da solicitação disponível, o frontend utiliza o novo contrato:

```http
POST /verify-workspace-key
Content-Type: application/json

{"accessKey":"012345"}
```

Sucesso: HTTP 200, `{ "success": true, "data": { "email": "gestor@example.com" }, ... }`, no envelope ApiResult existente. O frontend atualiza o cadastro com esse e-mail antes de marcar a verificação como concluída. Não envia nem exige o e-mail da página de pagamento.

## Comportamento da API

- DTO exige exatamente seis dígitos, preservando zeros à esquerda.
- Rota pública exclusiva de workspace. A rota antiga de colaboradores permanece compatível.
- Consulta as chaves pendentes no namespace `WORKSPACE_ACCESS_TOKEN_PREFIX` com SCAN, sem `KEYS`, para aceitar inclusive os códigos já enviados pelo worker atual.
- Não remove ou altera a chave após a consulta.
- Chave ausente ou substituída: 403 e orientação para conferir o e-mail novamente e usar a nova chave recebida. Sem histórico de chaves, não distingue substituição de digitação incorreta.
- Mesma chave em mais de um e-mail: 409; nunca escolhe uma conta arbitrariamente.
- Limita a dez tentativas por minuto por endereço remoto, usando Redis. O contador não inclui a chave digitada.
- Reconfere a chave depois da busca para rejeitar substituição durante a consulta.

## Publicação e limites

O patch está preparado localmente e não foi publicado. Para restaurar o fluxo já suportado pela API publicada, quando há e-mail válido no cadastro o frontend usa diretamente `/verify-key?tipoConta=GESTOR_WORKSPACE`, enviando e-mail e chave. Exige 204 antes de confirmar o cadastro; em caso de recusa não tenta outra conta ou outra rota. Sem e-mail disponível, aplicar, testar e publicar a rota nova para permitir a verificação somente pela chave. Não há sucesso simulado quando a rota estiver indisponível.

Executar `mvn -Dtest=WorkspaceKeyVerificationServiceTest test`. Os testes cobrem consulta sem sessão anterior, zero à esquerda, chave substituída, colisão, troca concorrente, limite de tentativas e isolamento de namespace.

SCAN mantém os códigos existentes utilizáveis, mas o custo cresce com o número de chaves pendentes. Em produção com volume elevado, adotar um índice reverso com reserva atômica de códigos únicos e migração das chaves existentes. Configurar corretamente os proxies confiáveis para que `request.getRemoteAddr()` represente o cliente; sem isso, o limite pode ser compartilhado pelo endereço do proxy. A verificação apenas identifica o e-mail da chave, preservando o comportamento atual de pré-cadastro; não emite sessão de login.

Este patch não acelera o envio de e-mail nem troca o agendamento do worker (GitHub Actions a cada cinco minutos). A reutilização de chave no reenvio tem um patch separado em `reutilizar-codigo-workspace.patch`.
