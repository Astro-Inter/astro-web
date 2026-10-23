# Dashboards editáveis

A tela `/mainDashboardsScreen` usa a sessão Firebase existente e confirma o usuário e o workspace na API antes de consultar dados. Os gráficos são desenhados no React com os resultados reais das consultas fixas do Databricks. Não há iframe do dashboard nem números simulados nesta tela.

## Usar

- **Visão geral** e **Eventos** abrem os indicadores disponíveis.
- Datas e granularidade só entram na consulta depois de **Aplicar filtros**.
- **Personalizar visão** permite editar um modelo e salvá-lo como uma visão pessoal.
- **Nova visão** começa vazia. Adicione até 12 gráficos. Todos têm a mesma largura e altura; em telas menores, ficam em uma coluna.
- Em **Montar meu cálculo**, escolha a base, a informação, a operação e como organizar o resultado. Cada campo explica o que representa e para que serve. **Usar indicador pronto** mantém os oito indicadores anteriores.
- Exemplo: **Pessoas → Pessoa → Contar sem repetir → Organizar por Perfil da pessoa → Gerar prévia**. Isso conta pessoas diferentes em cada perfil, sem somar os códigos de identificação.
- **Combinar com outro indicador** oferece adição, subtração, multiplicação, divisão e percentual entre duas agregações da mesma base. Filtros opcionais permitem até três condições.
- IDs, datas e textos oferecem contagem. Soma, média, menor e maior valor aparecem nos campos numéricos compatíveis, incluindo medidas derivadas como **Dias até a validação**. O catálogo informa quando o campo é calculado e qual data recebe o filtro do período.
- A prévia consulta dados reais ao clicar em **Gerar prévia**; alterar a configuração oculta a prévia anterior. **Atualizar prévia** consulta a fonte sem usar o cache anterior.
- Arraste pelo controle de cada gráfico ou use as setas para mudar a ordem.
- **Salvar visão** guarda nome, filtros e layout no servidor. Cada visão salva aparece como uma aba com seu próprio nome; o seletor “Minhas visões” foi removido.
- A tela tem somente **Voltar para a Home** como navegação externa, sem sidebar nem aviso de workspace.
- Em gráficos de linhas e barras, passe o mouse ou toque no gráfico: data/categoria e quantidades aparecem em uma dica flutuante junto ao ponto. As setas esquerda/direita consultam os pontos quando o gráfico está focado.
- Em gráficos estreitos, as datas do eixo usam ano abreviado para evitar sobreposição; a dica mantém a data completa.
- Em gráficos de linhas e barras, arraste sobre uma área do próprio gráfico para ampliar os eixos. **Limpar zoom**, dois cliques ou a tecla **0** restauram o recorte completo. **Shift + arrastar** move a área ampliada. Não há painéis de valores nem barras de controle abaixo do gráfico.
- Em gráficos de linhas e barras com múltiplas séries, clique em uma série da legenda para ocultá-la ou mostrá-la; pelo menos uma permanece visível. Registros ausentes são identificados como **Sem registro**, sem inventar zeros. Gráficos de pizza exibem os valores na legenda e uma dica nativa ao passar o mouse sobre uma fatia.
- Não há exibição ou opção de tabela. Configurações antigas desse tipo reabrem no gráfico padrão do indicador. Distribuições em pizza com mais de 20 categorias usam barras para preservar a leitura.

As visões salvas pertencem ao usuário e ao workspace. O frontend não envia IDs para escolher outro workspace. Os dados analíticos não são salvos junto com a configuração; abrir uma visão solicita os resultados à API, que pode reutilizar o cache curto. Atualizar dados solicita uma nova consulta ao Databricks. Alguns indicadores mostram o estado disponível, independentemente de datas; isso é indicado junto ao gráfico.

## Carregamento e cache

A API pode reutilizar resultados por até **90 segundos**, com cache separado por usuário, workspace, acesso atual e consulta. A autorização continua sendo verificada em cada chamada. A data da consulta original é preservada e a tela indica quando recebeu dados em cache. **Atualizar dados** ignora o cache e busca a fonte novamente.

O cache fica na memória do Worker e pode ser perdido em reinícios ou entre instâncias; acelera hits, sem garantir que toda abertura será instantânea. Dados, credenciais e tokens não são persistidos em localStorage pelo serviço de dashboards.

## Desenvolvimento

No `.env` do web:

```dotenv
VITE_DASHBOARD_API_URL=https://astro-dashboard-api.app-4str0.workers.dev
VITE_DASHBOARD_API_PROXY_URL=http://127.0.0.1:8787
```

Inicie a API local com `npm run dev` na pasta `astro-dashboard-api` e o frontend com `npm run dev` nesta pasta. Abra `http://localhost:5173/mainDashboardsScreen` e entre com uma conta Astro autorizada. O proxy `/dashboard-api` só existe no desenvolvimento e preserva o proxy anterior do sistema.

O `.env` do frontend contém apenas configuração pública. Credenciais Databricks e conexão PostgreSQL ficam no servidor, no `.dev.vars` local ignorado ou nos secrets/bindings do Cloudflare.

## Publicação posterior

A API precisa publicar as rotas `/api/saved-dashboards`, `/api/dashboard-catalog`, `/api/explorer/catalog` e `/api/explorer/query`, aplicar a migração `001_saved_dashboards.sql` no banco escolhido e permitir a origem exata do web em `CORS_ALLOWED_ORIGINS`. O CORS também permite `X-Dashboard-Refresh`. Em produção o frontend usa diretamente `VITE_DASHBOARD_API_URL`, sem o proxy Vite.

Os indicadores prontos estão em `src/data/dashboardCatalog.ts`. As bases e os campos do editor de cálculos vêm de `/api/explorer/catalog`, definidos e autorizados no servidor. O frontend configura o cálculo; a API monta a consulta com operações e parâmetros permitidos. O editor não aceita SQL livre, joins arbitrários nem fórmulas entre bases diferentes.

## Coerência visual

Esta é uma extensão da tela existente. A referência visual continua em `styles/global.css`: Montserrat, escala `astro-scale-90`, tokens de texto, tipografia, alturas e raio dos controles. A página tem layout próprio sem `AppSidebar`, com retorno explícito à Home.

`styles/analytics.css` e os gráficos usam a paleta solicitada: `#641A91`, `#8A63B1`, `#C4A8E0`, `#4D327A`, `#72529E`, `#B68CCC`, `#D4C0E8`, com neutros para texto e fundos. Abas, filtros, indicadores, editor inline com prévia SVG, controles de exploração e estados de carregamento/erro são componentes locais. As variáveis `--analytics-*` e o destaque `--astro-orb-accent` são definidos no escopo da tela; não alteram o tema das demais rotas.

O código existente já combina tokens com cores e medidas locais. A nova tela também mantém valores locais para superfícies secundárias, bordas, estados e cartões; esta documentação não representa uma auditoria visual de todo o produto.
