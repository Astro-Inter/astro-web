# Corrigir falhas reais do chatbot na API de IA do Astro

Trabalhe no repositório `Astro-Inter/astro-ai-api`. Investigue, implemente as
correções e execute os testes. Não entregue apenas um diagnóstico ou um plano.
Siga as instruções locais e os padrões de código já usados nesse repositório.
Preserve mudanças de outros trabalhos. Não altere o contrato do frontend para
contornar uma falha do backend. Não faça merge ou deploy sem pedido explícito.

## Contexto verificado

Em 01/11/2026 foi feita homologação real pelo site publicado:
https://astro-inter.github.io/astro-web/mainFormScreen

Perfil autorizado: GESTOR_WORKSPACE. Peça/reutilize uma conta autorizada disponível
na sessão para homologação; este prompt não contém senha, token ou URL assinada.
Não crie eventos, usuários, inscrições ou evidências apenas para fabricar cenários.

A PR 70 do web já foi incorporada no merge
`0fbda2d7b9374905f5896d9ec4e770141c5a51e2`.
O web suporta indicadores v1, matriz_conformidade v1, contexto_dados v1, tabela
v1/v2 local, ficha_usuario e gráficos de barras, setores, linhas e rosca.
Tabelas e gráficos existentes foram exibidos na interface real.

`GET https://ia.astro-app.solutions/version` retornou
`3ad06be7bf696bac04d954439e63fd8be5d66c79`; `/health` retornou ok.
A PR 33 da API foi incorporada na revisão `f4e9135`.
Antes de alterar, confira revisões posteriores e a versão efetivamente publicada.

Leia os schemas atuais e estes documentos da API:
- docs/contrato-dados-analiticos.md
- docs/integracao-graficos-chat.md
- docs/consultas-gestao-equipe.md
- docs/homologacao-consultas-gestao.md

## 1. Blocos analíticos não chegam ao cliente, mesmo em HTTP 200

Pergunta: “Mostre indicadores de cobertura da equipe.”

Primeira tentativa: resposta textual “Não consegui obter os indicadores de
cobertura da equipe. Tente novamente mais tarde.”

Na repetição, a observação de rede confirmou HTTP 200 e `blocos` contendo SOMENTE
um bloco `texto`. Conteúdo recebido:

“Retornados 6 de 6 NRs autorizados. Quantidade solicitada: 100. Indicadores e
gráficos consideram o conjunto autorizado completo descrito nos critérios.
As quatro etapas são exclusivas: vigente, em análise, agendado, sem encaminhamento.
O gráfico conta pares pessoa/NR sem encaminhamento, não pessoas únicas globais.”

Não havia indicadores, tabela, gráfico ou contexto_dados no JSON. A ausência dos
cartões nessa execução não é causada pelo renderer do web: a API não os enviou.
Não trate esse resumo textual como sucesso da entrega do contrato analítico.

A simulação “Se exigirmos NR-35 no cargo Soldador, qual o impacto? Apenas simule,
sem alterar cadastros.” também respondeu somente com resumo textual de uma
categoria e critérios, sem componentes. “Tenho treinamentos no mesmo horário?”
respondeu 0/0 pares apenas em texto, sem o contexto/indicadores esperados pelo
contrato para conjunto vazio.

Rastreie o resultado estruturado da tool até os blocos finais e a persistência:
montagem de candidatos, plano visual, Juiz, guardrail, fallback, serialização,
resposta POST e histórico. Não assuma em qual etapa ocorre a perda. Quando a
consulta autorizada é bem-sucedida e aprovada, preserve seus blocos na ordem e
versão corretas. Rejeição/falha real deve ser tratada explicitamente, nunca
apresentar texto de sucesso com componentes prometidos mas ausentes.

## 2. Resposta anterior ou ferramenta errada ao mudar a pergunta

Na conversa em que cobertura já havia sido pedida, foi enviada:
“Mostre 100 registros da matriz de conformidade da equipe.”

A API retornou HTTP 200 com o MESMO resumo textual da cobertura de seis NRs,
sem matriz, embora a pergunta atual visível fosse de matriz.

Outro caso: “Mostre 500 usuários da minha equipe em uma tabela.”, depois de uma
listagem de 100 usuários, respondeu que os dados não haviam sido fornecidos.
Em conversa nova o mesmo pedido funcionou: 141 de 141 usuários, 15 páginas visuais,
sem corte de segurança. Isso demonstra diferença por contexto; não confirma por
si só qual camada interna é responsável.

Investigue seleção da intenção atual, reaproveitamento de candidato anterior,
estado persistido/checkpoints, referências ao turno anterior e escolha da tool.
O histórico deve ajudar a resolver referências, sem substituir uma nova intenção
explícita por resultado antigo. Preserve sessão e isolamento por usuário.

## 3. Erros/intermitência das consultas de gestão

Os seguintes pedidos falharam por conexão na interface real:
- “Mostre 100 registros da matriz de conformidade da equipe.”, também repetido em
  conversa nova, sem contexto de cobertura.
- “Mostre a evolução mensal das conclusões da equipe.”
- “Compare a conformidade entre as unidades.”
- “Quais evidências aguardam minha validação?”

“Mostre as lacunas sem encaminhamento por NR em barras.” retornou texto dizendo
que não tinha os resultados, sem gráfico. Uma busca por nome sem resultados
retornou “Servico de IA indisponivel. Tente novamente em instantes.”; em conversa
nova, retornou corretamente que não encontrou usuários.

“Como acesso os dashboards?” retornou erro “Consulta as normas indisponivel.”

Use logs/métricas e reproduções para distinguir problemas de HTTP/CORS/proxy,
timeout, exceção de tool/SQL/Java, schema, provedor, roteamento ou outra causa.
Apenas `/health=ok` não comprova o funcionamento das consultas. Não aumente
indiscriminadamente os timeouts, não suprima exceções e não converta indisponibilidade
em conjunto vazio. Deixe mensagens de erro úteis e estados coerentes com HTTP.
Preserve os limites e autorizações existentes e não exponha detalhes sensíveis.

## 4. Pedido de linhas pessoais virou somente texto

“Mostre um gráfico de linhas dos meus treinamentos concluídos.” retornou apenas
resumo dos 12 meses, todos zero. Nenhum bloco grafico_linhas foi exibido.

Investigue se a ausência do gráfico vem da montagem/aprovação dos blocos. Preserve
o contrato quando todas as categorias têm zero; não fabrique fatias, não divida
por zero nem substitua silenciosamente o gráfico solicitado por outro tipo.
Diferencie o contrato de conclusões pessoais (meses previstos pela tool) da
evolução de equipe (meses ausentes podem ser omitidos). Não invente meses na UI.

## 5. Referência selecionável para resumo de evento

“Faça um resumo desse treinamento.” corretamente pediu seleção de um evento.
Depois pedimos “Liste meus eventos e treinamentos disponíveis com a referência
para selecionar um.” A lista trouxe três treinamentos em texto, mas não uma
referência explícita utilizável. Pedir o resumo de um deles pelo nome listado
continuou respondendo “Selecione o evento desejado em um resultado anterior;
não vou adivinhá-lo.”

Investigue o fluxo existente para disponibilizar/recuperar referência autorizada
e resolver seleção inequívoca, sem inventar IDs e sem usar nome como autorização.
Se houver ambiguidade, peça esclarecimento útil. A aprovação de um resumo deve
consultar o evento autorizado, não fabricar participantes ou conclusões.

Uma listagem também trouxe `http://localhost:5173/mainEventScreen` como link de
um evento no site publicado. Verifique primeiro se é dado gravado pelo usuário
no evento ou URL construída pela aplicação. Não reescreva URLs de usuário sem
justificativa; se o backend monta o endereço, use a configuração correta.

## 6. Preserve o que funcionou

- Meus dados: ficha com modalidade; cargo específico: apenas texto.
- Tabelas locais: 100/141 e 141/141, páginas de dez, sem nova consulta ao navegar.
- Rosca por perfil, barras por cargo/situação/pendências, setores por unidade e
  treinamentos pessoais, vencimentos por faixa, inclusive categorias zeradas.
- Fontes, unidades, avisos sobre pessoas únicas e pares pessoa/NR.
- Esclarecimento de referência de conformidade e recusa de outro workspace.
- Recuperação dos gráficos e tabelas pelo histórico.

Indicadores/gráficos precisam usar o conjunto autorizado completo, independente
do limite da tabela. Percentual nulo com base zero continua sem base; não o
transforme em zero. tem_mais e limitado são conceitos diferentes. Não migre ou
recalcule mensagens antigas a partir do estado atual do banco.

## Testes e critérios de entrega

1. Regressões pelo endpoint de chat, com providers/tools simulados e contratos
   reais, cobrindo o pipeline completo até POST e histórico, não só a tool isolada.
2. Resposta de cobertura bem-sucedida com indicadores + tabela + gráfico + contexto,
   e matriz com referências pessoa/NR estáveis e homônimos.
3. Sequência cobertura -> matriz -> comparação -> lista de usuários, com mudança
   de intenção explícita e blocos da consulta atual, sem reutilização indevida.
4. Pedido de 100 seguido de 500: 200 ou total disponível menor, conforme contrato;
   solicitada/retornada/total/tem_mais/limitado/motivo_limite coerentes.
5. Zero total, percentual sem base, zero recebido com total positivo, corte por
   quantidade/tamanho, falha de tool/provedor e bloqueio do Juiz/guardrail separados.
6. Gráfico de linhas com categorias zeradas, rosca zerada e preservação do tipo.
7. Seleção autorizada de evento, ambiguidade e acesso negado sem ações de negócio.
8. Testes de isolamento por UID, retomada de sessão e igualdade de blocos no histórico.
9. Executar a suíte, verificações estáticas existentes e homologação autorizada
   dos pedidos acima. Não registrar credenciais, tokens, dados pessoais ou URLs
   assinadas. Não criar dados de negócio para forçar sucesso.

Entregue correções concretas, causa confirmada de cada falha, arquivos alterados,
testes e resultados, versão testada e limitações. Separe o que foi simulado do que
foi verificado na API real. Não declare todo o fluxo aprovado com base em HTTP 200
ou testes de ferramentas que não passam pelo pipeline final. Não faça deploy ou
merge nesta tarefa sem autorização explícita.

O erro React #185 da página de Formulários pertence ao frontend e está sendo
tratado separadamente no web; não tente resolvê-lo alterando a API ou seus contratos.
