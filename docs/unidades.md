# Sugestões de NRs por unidade

Ao abrir **Gerenciar NRs → Editar NRs**, a página consulta POST /support/unidades/{unidade_id}/nrs-sugeridas na API configurada por VITE_API_IA_URL. A chamada usa o token Firebase no cabeçalho Authorization e não envia payload. O contrato está implementado em app/modules/support/unit_nr_recommendations.py no projeto astro-ai-api.

A resposta inclui unidade, empresa, quantidade de funcionários ativos e nrs_sugeridas. Cada sugestão contém numero, nome, justificativa e confianca. O serviço valida a unidade, a contagem e os campos das sugestões antes de exibi-las.

O indicador de recomendação aparece somente nas NRs sugeridas que também estão no catálogo da unidade. O tooltip apresenta a justificativa recebida. Sugestões não ativam NRs automaticamente; a seleção só é persistida após **Salvar** e a confirmação existente.

Falha da consulta não bloqueia a edição manual e permite nova tentativa. Fechar o editor, trocar unidade ou trocar conta cancela a leitura e descarta respostas antigas.

Descrições nos diálogos usam prévia de duas linhas e exibem o texto integral no tooltip após 700 ms de hover ou ao receber foco pelo teclado. A cobertura automatizada fica em tests/nrRecommendations.test.cjs, tests/unitNrRecommendations.test.cjs, tests/unitsUi.test.cjs e tests/filterText.test.cjs.
