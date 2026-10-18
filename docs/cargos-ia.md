# Sugestões de NRs por cargo

O editor de NRs consulta `POST /support/cargos/{cargo_id}/nrs-sugeridas` da API configurada em `VITE_API_IA_URL`, com o Bearer Firebase da sessão atual e sem corpo JSON. Contrato consultado: https://astro-ai-api-qq6l.onrender.com/docs.

As sugestões retornam `numero`, `nome`, `justificativa` e `confianca`. Somente NRs disponíveis nas opções do cargo recebem o robô; o tooltip mostra a justificativa específica retornada pela IA. O rodapé identifica o ícone com “Recomendação de IA”, seguindo a imagem de referência.

A consulta não altera os switches nem cria vínculos. O usuário revisa a seleção e salva pelo fluxo existente de confirmação e `POST /roles/{id}/nrs` da API principal. Cancelar descarta a edição. Erro ou demora da IA não bloqueia a edição manual, e permite nova tentativa. Consultas são canceladas ao fechar o editor, trocar o cargo ou trocar de conta.

Quando não há sugestões correspondentes às opções disponíveis, o editor mostra somente a tabela, sem mensagem de resultado vazio nem legenda de IA. Sugestões fora desse catálogo não são adicionadas ao payload de salvamento.

Validações automatizadas: contrato/autenticação, respostas inválidas e vazias, erros de rede/HTTP, timeout, cancelamento e isolamento das sugestões por cargo e sessão em `tests/nrRecommendations.test.cjs` e `tests/roleNrRecommendations.test.cjs`. O teste `tests/nrRecommendationsUi.test.cjs` verifica os robôs, a justificativa por NR, o fechamento do tooltip por Escape, o retry e a preservação da seleção manual.

Validação em 18/10/2026: a consulta autenticada para o cargo 3, “Operador de Máquinas”, retornou HTTP 200 com `quantidade: 0` e `nrs_sugeridas: []`. O cenário com robôs foi conferido separadamente com dados controlados de teste. O teste de interface verifica que o resultado vazio não exibe mensagem nem legenda de IA.

Critérios DAD aplicados: tipos em `src/types/` (M04), acesso remoto em `src/services/` (M05), estado e efeitos com limpeza (M06–M07/E03), chaves por NR (M08), mensagens acessíveis de espera e erro (M11–M12) e interpolação JSX das justificativas externas (E07). Publicação e auditoria global/histórica não fazem parte desta alteração.
