# Sugestões de NRs por cargo

O editor de NRs consulta POST /support/cargos/{cargo_id}/nrs-sugeridas na API configurada em VITE_API_IA_URL. A chamada envia o Bearer Firebase da sessão atual e não envia corpo JSON. O contrato está publicado na [documentação da API de IA](https://astro-ai-api-qq6l.onrender.com/docs).

Cada sugestão contém numero, nome, justificativa e confianca. O editor relaciona as sugestões ao catálogo de NRs disponíveis para o cargo; somente itens encontrados no catálogo recebem o indicador de recomendação. O tooltip apresenta a justificativa retornada pela API.

A consulta não altera os switches nem cria vínculos. A seleção só é persistida pelo fluxo existente de confirmação e pela chamada POST /roles/{id}/nrs à API principal. Cancelar descarta a edição. Falhas ou demora da API não bloqueiam a edição manual e permitem nova tentativa. Fechar o editor, trocar o cargo ou trocar de conta cancela a consulta e descarta respostas antigas.

Quando não há sugestões correspondentes ao catálogo disponível, o editor mostra a tabela sem mensagem de resultado vazio nem legenda de recomendação. Sugestões fora do catálogo não entram no payload de salvamento.

Os serviços e componentes relacionados são cobertos por tests/nrRecommendations.test.cjs, tests/roleNrRecommendations.test.cjs e tests/nrRecommendationsUi.test.cjs.
