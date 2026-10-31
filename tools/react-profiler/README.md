# Comparação de renderização do Astro

Interface oficial do React DevTools Profiler, executada separadamente da aplicação. O painel da esquerda utiliza o componente real `src/components/analyticsInteractiveChart/index.tsx`, com a versão de React instalada na raiz do projeto.

## Executar

Na raiz do repositório:

```powershell
npm install --prefix tools/react-profiler
npm start --prefix tools/react-profiler
```

Abrir `http://127.0.0.1:5202`. A porta precisa estar disponível. O build gera apenas arquivos em `.build/`, ignorados pelo Git. Nenhum endpoint da aplicação é chamado e nenhum cadastro é alterado.

## Comparar

1. Selecionar **Com useMemo** e aguardar o gráfico. Há 4.000 registros, 200 períodos e 20 séries, das quais duas ficam visíveis.
2. Na aba **Profiler**, clicar em **Start recording**.
3. Clicar em **Executar 50 consultas** e aguardar **50 consultas concluídas**.
4. Clicar em **Stop recording**. Conferir commits, componentes, durações e causas das atualizações.
5. Selecionar **Sem useMemo — comparação** e repetir os passos com os mesmos dados.
6. Comparar as gravações completas; não transformar um único commit em média ou ganho universal.

O build da comparação substitui as chamadas de `useMemo` somente no bundle de teste. O arquivo da aplicação permanece intacto. As dependências experimentais de React são exigidas pela interface do DevTools e ficam restritas a esta ferramenta; o gráfico é compilado com React/ReactDOM da aplicação.

Fonte da integração: [documentação oficial do react-devtools-inline](https://github.com/react/react/tree/main/packages/react-devtools-inline).
