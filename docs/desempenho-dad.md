# Desempenho — verificação de 30/10/2026

## Cenário e método

O componente real `analyticsInteractiveChart` foi medido no Chrome headless, com React em desenvolvimento e a API `React.Profiler`. O conjunto de teste tinha 4.000 registros, 200 períodos e 20 séries, mantendo duas séries visíveis.

Foram executadas três rodadas alternadas com a implementação atual e uma versão de teste sem os dois `useMemo` do componente. A alteração da versão de comparação ocorreu somente na resposta do servidor de testes para aquele navegador; o código da aplicação permaneceu com a memoização.

Cada rodada teve dez consultas de aquecimento e cinquenta consultas por ArrowRight. O Profiler registrou cem commits de atualização por rodada, incluindo atualizações dos componentes descendentes. Os valores abaixo são durações de renderização, não tempos totais de navegação ou consulta à API.

| Rodada | Mediana com memoização | Mediana sem memoização | Soma com memoização | Soma sem memoização |
| --- | ---: | ---: | ---: | ---: |
| 1 | 27,3 ms | 27,8 ms | 1.875,8 ms | 1.877,7 ms |
| 2 | 13,6 ms | 9,1 ms | 1.640,1 ms | 1.723,1 ms |
| 3 | 4,0 ms | 7,2 ms | 1.382,1 ms | 1.681,5 ms |

A soma das durações foi menor com memoização nas três rodadas, mas a mediana da segunda rodada foi maior. A primeira diferença foi pequena. Esses resultados não sustentam um ganho percentual universal: aquecimento, coleta de lixo, instrumentação de desenvolvimento e componentes descendentes influenciam os tempos.

## Justificativa das referências estáveis

- `useMemo` em `analyticsInteractiveChart` mantém categorias, séries, mapa de valores e totais enquanto o conjunto de dados continua igual. Consultar outro ponto ou mover o zoom não exige reconstruir essas estruturas.
- `useCallback` em `useAstroChatController` mantém `loadSessions` estável enquanto a autenticação não muda. O efeito que carrega o histórico depende dessa função; atualizar a lista não deve criar uma nova dependência e disparar outra leitura.
- `useCallback` em `truncatedText` mantém `updateTooltipPosition` estável enquanto `maxLines` não muda. O efeito de posicionamento não precisa remover e registrar listeners de scroll e resize a cada atualização da posição.

## Demonstração na apresentação

Abrir um gráfico no React DevTools Profiler, repetir as mesmas interações com dados estáveis e comparar as gravações com e sem a memoização em uma cópia de teste. A medição acima usa a API do Profiler e não substitui essa demonstração na interface do React DevTools nem a explicação oral do grupo.

## Verificação na interface do React DevTools

A comparação também foi executada na interface oficial **React DevTools 8.0.0**, integrada por `react-devtools-inline`. A ferramenta reproduzível está em [tools/react-profiler](../tools/react-profiler/README.md), separada da aplicação.

As duas gravações utilizaram o componente real do Astro e o mesmo conjunto de 4.000 registros, 200 períodos e 20 séries, com duas séries visíveis. Em cada versão foram executadas 50 consultas por teclado; o Profiler registrou **52 commits** e exibiu a árvore de componentes, o flamegraph e a causa das atualizações.

| Primeiro commit selecionado na interface | Com useMemo | Sem useMemo |
| --- | ---: | ---: |
| Render total | 11,6 ms | 30,6 ms |
| Render próprio de InteractiveChart | 8,0 ms | 23,3 ms |

Os valores da tabela são do **primeiro commit selecionado**, não médias das sessões. A demonstração comprova a gravação e a comparação na interface; variações de aquecimento e instrumentação impedem usar esse par isolado como ganho percentual geral. As três rodadas da medição anterior continuam registradas separadamente.
