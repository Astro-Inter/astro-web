# Destinatários do formulário — SCRUM-573

O web agora oferece seleção de gestores por nome. O endpoint administrativo `/managers` exige gestor de workspace; liberar esse endpoint para gestores comuns também liberaria dados e funcionalidades que não são necessários para enviar um formulário.

O [patch](destinatarios-formularios.patch) adiciona uma consulta específica `GET /forms/recipients`. Foi preparado sobre `Astro-Inter/astro-api` em `27dfd7e992a9870232a9197b044b13ef62905650`, em cópia temporária. Não modifica o clone local da API nem publica mudanças no Render.

## Contrato

Token Firebase obrigatório. Aceita `GESTOR` e `GESTOR_WORKSPACE`, reaproveitando `FormAccessService.requireManager` para validar conta, unidade ativa e workspace. O workspace e a identidade vêm do token e do usuário persistido, sem aceitar IDs enviados pela tela para definir o escopo.

```json
{
  "success": true,
  "message": "Destinatários retornados com sucesso",
  "data": {
    "currentManagerId": 7,
    "items": [{ "id": 8, "name": "Ana", "unitName": "Sede" }]
  },
  "errors": null,
  "path": "/forms/recipients"
}
```

Somente outros gestores ativos, com unidade ativa do mesmo workspace, são retornados, incluindo gestores de workspace. Não retorna CPF, e-mail ou foto. Lista vazia é sucesso. A rota fixa tem precedência sobre `/forms/{id}`. O serviço reaproveita `UserRepository` e executa a consulta relacional em transação de leitura.

## Aplicar e verificar

No clone atualizado da API, conferir as instruções locais e o estado do Git, então:

```powershell
git apply --check '<caminho-do-astro-web>/docs/backend/destinatarios-formularios.patch'
git apply '<caminho-do-astro-web>/docs/backend/destinatarios-formularios.patch'
mvn '-Dtest=FormRecipientsServiceTest,FormRecipientsSecurityTest' test
```

Depois de publicar a API pelo fluxo do projeto, conferir que `/forms/recipients` aparece no Swagger e testar o dropdown no web. O proxy do Vite e a URL de produção devem apontar para essa versão. Não é necessário migrar dados ou mudar o Firebase.

Os testes de serviço verificam exclusão da própria conta, gestores comuns e de workspace, contas inativas e pré-cadastradas, unidades inativas, colaborador, outro workspace e ausência de destinatários. O teste HTTP verifica token, perfis permitidos e negados, campos da resposta, parâmetros forjados de workspace/gestor e a resolução da rota fixa.

No web, os testes cobrem escolha por nome com envio do ID real, exclusão da própria conta, erro de consulta, nova tentativa preservando conteúdo e confirmação de recarga.

Validação executada na cópia temporária: `mvn -o '-Dtest=FormRecipientsServiceTest,FormRecipientsSecurityTest' test` passou com 4 testes, sem falhas. O patch foi conferido com `git apply --check --reverse` sobre os arquivos implementados. No web, o build e os 231 testes passaram após atualizar a base para main; o lint manteve apenas os dois avisos preexistentes de outros fluxos. A inspeção visual dos novos ajustes ficou pendente porque o controle do navegador foi desativado nas configurações do Work.
