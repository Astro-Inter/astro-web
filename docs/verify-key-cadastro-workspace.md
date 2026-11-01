# Verificação de chave no cadastro de workspace

A API usa /verify-key para validar a chave de colaborador. No cadastro inicial de workspace, a chave precisa poder ser verificada antes de o gestor existir no PostgreSQL. O patch complementar da API está em docs/backend/verificar-workspace-so-chave.patch; o contrato que envia e-mail e chave permanece compatível.

## Fluxo de colaborador

A chamada POST /verify-key envia e-mail e chave. O serviço valida que o usuário existe, é do tipo COLABORADOR e tem status PRE_CADASTRADO antes de comparar a chave Redis de colaborador.

## Fluxo de workspace com e-mail disponível

A interface envia POST /verify-key?tipoConta=GESTOR_WORKSPACE com email e accessKey. Esse fluxo compara a chave Redis de workspace associada ao e-mail normalizado e não exige registro prévio do gestor no PostgreSQL.

O parâmetro identifica qual chave Redis consultar; não atribui perfil nem substitui a validação do código. Parâmetro omitido ou vazio corresponde a COLABORADOR. Tipo desconhecido ou GESTOR deve ser rejeitado com HTTP 400.

## Respostas

| Situação | HTTP |
| --- | --- |
| Chave válida e requisitos atendidos | 204, sem corpo |
| Chave incorreta ou ausente no Redis | 403 |
| Colaborador inexistente, de outro tipo ou fora de PRE_CADASTRADO | 403 |
| JSON inválido | 400 |

## Chaves Redis

A API e o worker precisam usar a mesma instância Redis, prefixos e normalização do e-mail (trim e minúsculas). Versões da API e do worker podem diferir entre chave por ID de usuário e chave por e-mail; os serviços implantados precisam compartilhar o mesmo contrato.

A rota sem e-mail está descrita em backend/verificar-workspace-so-chave.md. Ela procura chaves pendentes no namespace de workspace e retorna o e-mail associado, sem emitir sessão de login.
