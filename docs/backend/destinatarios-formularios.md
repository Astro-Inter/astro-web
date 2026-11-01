# Destinatários de formulários

O seletor de destinatários usa uma consulta própria. O endpoint administrativo /managers é restrito a gestores do workspace e fornece informações além das necessárias para preencher o seletor.

## Contrato

GET /forms/recipients exige token Firebase e aceita os perfis GESTOR e GESTOR_WORKSPACE. Identidade, workspace e escopo são derivados do token e do usuário persistido; a requisição não recebe IDs de workspace ou gestor para definir o escopo.

A resposta contém o ID do gestor atual e os outros destinatários elegíveis:

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

A lista inclui somente outros gestores ativos com unidade ativa no mesmo workspace, inclusive gestores de workspace. Não inclui CPF, e-mail ou foto. Lista vazia é válida. A rota fixa deve ser resolvida antes de /forms/{id}.

## Implementação

O patch complementar da API está em [destinatarios-formularios.patch](destinatarios-formularios.patch). Ele reutiliza FormAccessService.requireManager para validar conta, unidade ativa e workspace, consulta registros pelo UserRepository e executa a leitura em transação somente leitura.

A interface envia o ID escolhido no contrato do formulário. Erros de consulta preservam os demais campos e permitem nova tentativa; a própria conta é excluída pelo servidor e filtrada novamente no web.
