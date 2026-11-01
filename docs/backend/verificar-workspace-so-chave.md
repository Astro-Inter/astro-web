# Verificação de workspace pela chave

A interface de cadastro pode verificar uma chave sem reenviar o e-mail informado em outra etapa. A implementação complementar da API está em [verificar-workspace-so-chave.patch](verificar-workspace-so-chave.patch).

## Contrato

A chamada é POST /verify-workspace-key com JSON {"accessKey":"012345"}. O serviço exige exatamente seis dígitos e preserva zeros à esquerda. Em sucesso, responde HTTP 200 no envelope ApiResult e informa o e-mail associado à chave. A interface atualiza o e-mail do cadastro antes de marcar a verificação como concluída.

A rota é exclusiva do fluxo de workspace e não substitui a verificação de colaborador em /verify-key. A verificação identifica o e-mail da chave; não cria conta, não autentica o usuário e não emite sessão.

## Consulta e respostas

O serviço busca chaves pendentes no namespace WORKSPACE_ACCESS_TOKEN_PREFIX usando SCAN, sem KEYS, e não remove nem altera a chave consultada. Chave ausente, substituída ou inválida resulta em HTTP 403. Se a mesma chave estiver associada a mais de um e-mail, retorna HTTP 409 em vez de escolher uma conta. O serviço confere novamente a chave após a busca para detectar substituição concorrente.

O patch limita tentativas a dez por minuto por endereço remoto, com contador no Redis que não inclui a chave digitada. Proxies confiáveis precisam estar configurados para que request.getRemoteAddr() represente o cliente.

## Limites operacionais

O custo de SCAN aumenta com o número de chaves pendentes. Para volumes maiores, um índice reverso com reserva atômica de códigos únicos evita varrer o namespace e exige migração das chaves. O worker de e-mail e seu agendamento são independentes desta rota; a reutilização de chave em reenvio está em [reutilizar-codigo-workspace.md](reutilizar-codigo-workspace.md).
