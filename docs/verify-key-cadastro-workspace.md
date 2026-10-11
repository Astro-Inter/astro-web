# Ajuste rápido do `/verify-key` para o cadastro de workspace

## Objetivo

Adicionar um parâmetro opcional na URL para separar a validação inicial de um gestor de workspace da ativação de um colaborador, mantendo o JSON atual da requisição.

- Sem parâmetro: assumir `COLABORADOR` e exigir usuário existente no PostgreSQL.
- Com `tipoConta=GESTOR_WORKSPACE`: validar o código enviado ao e-mail no Redis, sem exigir que o gestor já exista no PostgreSQL.

O parâmetro identifica o fluxo. Ele não atribui um perfil ao usuário nem substitui a validação do código.

## Por que o cadastro está sendo bloqueado

Atualmente, `UserService.verifyAccessKey` chama `findAccountTypeByEmail` antes de consultar o Redis. Essa consulta usa `fn_retornar_tipo_conta`, que retorna `NULL` quando o e-mail não existe em `usuario`. O serviço retorna `false` imediatamente e o controller responde `403`.

O gestor ainda está iniciando o cadastro, então essa exigência impede a verificação mesmo quando o código foi gerado corretamente. O registro definitivo acontece depois, em `/register-workspace`.

Não é necessário alterar a função SQL para resolver esse bloqueio. Ela pode continuar identificando usuários já cadastrados.

## Contrato proposto

### Colaborador — chamada existente

```http
POST /verify-key
Content-Type: application/json
```

```json
{
  "email": "colaborador@example.com",
  "accessKey": "123456"
}
```

Também aceitar explicitamente `POST /verify-key?tipoConta=COLABORADOR`.

Exigir usuário existente, tipo `COLABORADOR` e status `PRE_CADASTRADO`, alinhado à regra atual do worker de primeiro acesso. Depois, comparar o código com a chave Redis de colaborador.

### Gestor de workspace — chamada do web

```http
POST /verify-key?tipoConta=GESTOR_WORKSPACE
Content-Type: application/json
```

```json
{
  "email": "gestor@example.com",
  "accessKey": "654321"
}
```

Consultar diretamente a chave Redis de workspace para o e-mail normalizado e comparar o código. Não consultar o PostgreSQL para exigir a existência desse gestor.

### Respostas

| Situação | HTTP |
| --- | --- |
| Código válido e requisitos do fluxo atendidos | `204`, sem corpo |
| Código incorreto ou ausente no Redis | `403` |
| Colaborador inexistente, de outro tipo ou fora de `PRE_CADASTRADO` | `403` |
| E-mail/código inválido no JSON | `400`, mantendo a validação atual do DTO |
| `tipoConta` desconhecido ou `GESTOR` | `400` |

O parâmetro omitido ou vazio assume `COLABORADOR`, conforme o comportamento de `@RequestParam(defaultValue = ...)` do Spring.

## 1. Alterar o controller

Arquivo: `src/main/java/com/astro/api/user/controller/AuthController.java`.

Adicionar os imports:

```java
import com.astro.api.user.model.UserType;
import org.springframework.web.bind.annotation.RequestParam;
```

Atualizar o método, preservando o mapeamento e as anotações Swagger existentes:

```java
public ResponseEntity<Void> verifyAccessKey(
        @RequestBody @Valid AccessKeyVerificationRequestDto dto,
        @RequestParam(name = "tipoConta", defaultValue = "COLABORADOR") UserType tipoConta) {
    if (tipoConta == UserType.GESTOR) {
        return ResponseEntity.badRequest().build();
    }

    if (!userService.verifyAccessKey(dto, tipoConta)) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    return ResponseEntity.noContent().build();
}
```

A conversão padrão para `UserType` deve rejeitar valores desconhecidos com `400`; confirmar esse comportamento nos testes, incluindo o tratamento global de exceções do projeto. Usar os valores em maiúsculas.

Atualizar a descrição Swagger para explicar o parâmetro opcional, seu valor padrão e os dois fluxos. A resposta `400` também deve mencionar parâmetro inválido.

`AccessKeyVerificationRequestDto` continua contendo somente `email` e `accessKey`. A liberação existente de `POST /verify-key` no `SecurityConfig` permanece aplicável à URL com query string.

## 2. Separar os caminhos no serviço

Arquivo: `src/main/java/com/astro/api/user/service/UserService.java`.

Usar os mesmos prefixos de código configurados no worker. Um exemplo de configuração no serviço é:

```java
import com.astro.api.user.model.UserType;
import org.springframework.beans.factory.annotation.Value;

@Value("${WORKSPACE_ACCESS_TOKEN_PREFIX}")
private String workspaceAccessTokenPrefix;

@Value("${ACCESS_TOKEN_PREFIX}")
private String collaboratorAccessTokenPrefix;
```

Esses dois campos ficam dentro da classe. Configurar as variáveis também no ambiente da API e fornecer seus valores nos testes, ou adaptar a injeção ao padrão de configuração do projeto. São prefixos de chave, não URLs de conexão.

Substituir o método atual por esta lógica, considerando o contrato por e-mail do worker local atual:

```java
public boolean verifyAccessKey(AccessKeyVerificationRequestDto dto, UserType tipoConta) {
    String email = dto.email().trim().toLowerCase(Locale.ROOT);
    String redisKey;

    if (tipoConta == UserType.GESTOR_WORKSPACE) {
        redisKey = workspaceAccessTokenPrefix + email;
    } else if (tipoConta == UserType.COLABORADOR) {
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);

        if (user == null
                || user.getType() != UserType.COLABORADOR
                || user.getStatus() != UserStatus.PRE_CADASTRADO) {
            return false;
        }

        redisKey = collaboratorAccessTokenPrefix + email;
    } else {
        return false;
    }

    String storedAccessKey = redisTemplate.opsForValue().get(redisKey);
    return dto.accessKey().equals(storedAccessKey);
}
```

O repositório já possui `findByEmailIgnoreCase`, e `UserService` já utiliza `UserStatus` e `Locale`. A função `fn_retornar_tipo_conta` deixa de decidir qual fluxo será validado por esse método.

## 3. Conferir o contrato das chaves Redis antes de publicar

Hoje a API monta uma chave fixa:

```text
processamento:email:{tipo}:access_key:{email}
```

O worker local atual monta:

```text
Workspace:   WORKSPACE_ACCESS_TOKEN_PREFIX + email_normalizado
Colaborador: ACCESS_TOKEN_PREFIX + email_normalizado
```

Confirmar que API e worker usam a mesma instância Redis, os mesmos prefixos e a mesma normalização (`trim` e minúsculas). Não assumir que um prefixo de exemplo da documentação corresponde à configuração implantada.

**Divergência encontrada:** a documentação publicada descreve o token de colaborador por `id_usuario`, enquanto o worker local atual já o grava por e-mail. O exemplo de serviço acima segue o worker local. Se a versão implantada ainda usa ID, a consulta do colaborador deve usar `collaboratorAccessTokenPrefix + user.getId()` até que os contratos sejam alinhados.

Para workspace, ambos os materiais descrevem a chave associada ao e-mail. A documentação indica que o código de workspace é gravado sem TTL atualmente; não atribuir a ele uma expiração que o produtor ainda não configura.

## 4. Ajuste correspondente no web

Arquivo: `src/services/workspaceEmail.ts`.

Depois de disponibilizar a mudança na API, `verifyManagerEmail` deve chamar:

```ts
await postWorkspaceEmail('/verify-key?tipoConta=GESTOR_WORKSPACE', {
  email: email.trim().toLowerCase(),
  accessKey,
})
```

O tratamento de erros desse arquivo também compara `path === '/verify-key'`. Ao acrescentar a query string, ajustar essas comparações para usar somente o caminho, por exemplo:

```ts
const isVerification = path.split('?')[0] === '/verify-key'
```

Usar `isVerification` nas condições correspondentes, preservando a mensagem específica da verificação. Os clientes de colaboradores podem manter a URL atual sem parâmetro.

Manter o fluxo: `/add-manager-email` → tela de código → `/verify-key?tipoConta=GESTOR_WORKSPACE` → formulário de cadastro → `/register-workspace` no carregamento final do Astro.

## 5. Testes para liberar a alteração

Atualizar `UserServiceTest` e `AuthControllerTest`, pois o serviço passa a receber `tipoConta` como segundo argumento.

- Sem parâmetro, o controller chama o serviço com `COLABORADOR`.
- Com `GESTOR_WORKSPACE`, o controller encaminha esse tipo ao serviço.
- Gestor sem cadastro, com código correto no Redis: `204`; nenhuma consulta ao repositório de usuários.
- Gestor com código incorreto ou chave ausente: `403`.
- Colaborador inexistente: `403`, mesmo que exista código no Redis.
- Usuário existente de outro tipo ou com status diferente de `PRE_CADASTRADO`: `403`.
- Colaborador pré-cadastrado com código correto: `204`; com código incorreto: `403`.
- Um código de workspace não valida o fluxo de colaborador, e vice-versa.
- E-mail é normalizado antes de montar a chave Redis.
- Tipo desconhecido ou `GESTOR`: `400`; JSON inválido mantém `400`.

Publicar primeiro a alteração da API e, em seguida, atualizar a chamada do web. Validar com um código gerado pelo worker realmente implantado.

## Referências

- [Documentação das funções PostgreSQL](https://astro-inter.github.io/banco-de-dados/#/functions).
- [Documentação do Redis](https://astro-inter.github.io/banco-de-dados/#/redis).
- API local: `AuthController`, `UserService`, `UserRepository`, `UserType` e `UserStatus`.
- Worker local: `src/services/workspaceTokenService.js`, `src/services/tokenService.js` e os workers de e-mail.

Este documento descreve a implementação proposta. Ele não aplica mudanças na API ou no web.
