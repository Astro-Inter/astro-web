# Sugestões de NRs por unidade

Ao abrir **Gerenciar NRs → Editar NRs**, a página consulta
`POST /support/unidades/{unidade_id}/nrs-sugeridas` na API configurada por
`VITE_API_IA_URL`. A chamada usa o token Firebase no cabeçalho Authorization,
sem payload. O contrato foi conferido em `app/modules/support/unit_nr_recommendations.py`
do projeto `astro-ai-api`.

A resposta contém `unidade_id`, `unidade`, `empresa`,
`quantidade_funcionarios_ativos`, `quantidade` e `nrs_sugeridas`.
Cada sugestão contém `numero`, `nome`, `justificativa` e `confianca`.
O serviço valida a unidade, a contagem e as sugestões antes de exibi-las.

O ícone de IA aparece somente nas NRs sugeridas que existem no catálogo da
unidade; seu tooltip apresenta a justificativa recebida. Sugestões não ativam
NRs automaticamente. A seleção só é persistida após Salvar e confirmar.
Falhas da IA permitem edição manual e nova tentativa. Fechar o editor,
trocar a unidade ou trocar a conta cancela a consulta e descarta respostas antigas.

As descrições nos diálogos de consulta e edição mantêm o comportamento já
integrado na main: prévia de duas linhas, com o texto integral no tooltip
após 700 ms de hover ou imediatamente ao focar pelo teclado.

## Verificação

- `nrRecommendations.test.cjs`: endpoint, autenticação, cancelamento, validação
  da resposta e falhas, com regressão do serviço de cargos.
- `unitNrRecommendations.test.cjs`: consultas condicionais, troca de unidade
  e conta, cancelamento, resultado vazio e nova tentativa.
- `unitsUi.test.cjs`: página, hook, serviço e modais com API simulada; verifica
  recomendações, justificativa, preservação da seleção, duas linhas e salvamento.
- `filterText.test.cjs`: atraso do tooltip, saída antecipada, foco e Escape.

Essas verificações cobrem os critérios DAD M04–M08 e M12 e o extra E03
aplicáveis à integração. M11 foi verificado nos comportamentos automatizados
de foco e feedback; contraste e navegação manual no navegador não foram
reavaliados nesta alteração. Publicação (M13) e histórico global (M14) ficam
fora da validação desta demanda. Não foram alterados vínculos de uma conta real.
