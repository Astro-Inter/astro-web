-- Diagnóstico somente leitura. Execute no MESMO banco e com o MESMO usuário da API.
-- Não cria objetos, não altera dados e não solicita credenciais.
BEGIN TRANSACTION READ ONLY;

SELECT current_schema() AS schema_atual,
       current_setting('search_path') AS caminho_de_busca,
       to_regclass('vw_home_estatisticas_gerais') AS view_visivel,
       to_regprocedure('fn_carrega_workspace(text)') AS funcao_visivel;

-- NULL em view_visivel ou funcao_visivel indica objeto ausente do search_path.
-- A ordem de instalação documentada no banco é:
-- 1. database/views/04_vw_home_estatisticas_gerais.sql
-- 2. database/functions/14_fn_carrega_workspace.sql

SELECT n.nspname AS schema, p.proname AS funcao,
       pg_get_function_identity_arguments(p.oid) AS argumentos,
       has_function_privilege(p.oid, 'EXECUTE') AS pode_executar
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'fn_carrega_workspace';

SELECT n.nspname AS schema, c.relname AS objeto,
       has_table_privilege(c.oid, 'SELECT') AS pode_consultar
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'vw_home_estatisticas_gerais';

-- Detecta diferenças entre a função instalada e o script da main.
SELECT pg_get_functiondef(p.oid) AS definicao_instalada
FROM pg_proc p
WHERE p.oid = to_regprocedure('fn_carrega_workspace(text)');

ROLLBACK;

-- Após confirmar os objetos, execute separadamente no editor do banco:
-- SELECT fn_carrega_workspace('UID_DO_GESTOR');
-- Use o UID real apenas no editor autorizado, sem publicá-lo na PR.
-- Retorno NULL: conferir gestor ativo, tipo de conta e unidade ativa.
-- Exceção SQL: guardar a mensagem/SQLSTATE para identificar a causa do HTTP 500.
-- JSON válido: conferir nos logs da API a desserialização de
-- WorkspaceHomeResponse/WorkspaceHomeStatisticsResponse.
