# Dashboards editáveis

A tela /mainDashboardsScreen usa a sessão Firebase e confirma na API o usuário e o workspace antes de consultar os dados. Os gráficos são desenhados no React com os resultados das consultas; a tela não incorpora um dashboard por iframe.

## Visões e cálculos

**Visão geral** e **Eventos** abrem os indicadores disponíveis. Datas e granularidade entram na consulta somente após **Aplicar filtros**.

**Personalizar visão** edita uma visão pessoal; **Nova visão** cria uma configuração vazia. Uma visão aceita até 12 gráficos, com tamanho uniforme e uma coluna em telas menores. O usuário pode ordenar gráficos por arraste ou pelas setas.

O editor permite escolher base, informação, operação e agrupamento. **Usar indicador pronto** mantém os indicadores predefinidos. **Combinar com outro indicador** aplica adição, subtração, multiplicação, divisão ou percentual entre duas agregações da mesma base, com até três condições opcionais. Soma, média, mínimo e máximo são oferecidos para campos numéricos; IDs, datas e textos permitem contagem. O catálogo descreve campos derivados e a data associada ao filtro do período.

**Gerar prévia** consulta a API e alterar a configuração oculta o resultado anterior. **Atualizar prévia** solicita dados sem reutilizar o cache anterior. O editor não aceita SQL livre, joins arbitrários ou fórmulas entre bases diferentes; a API monta a consulta a partir de operações e parâmetros permitidos.

As visões pessoais guardam nome, filtros, layout e receitas de cálculo no localStorage do navegador, separados por UID Firebase, usuário Astro e workspace. Não sincronizam entre dispositivos, navegadores ou origens. A chave é astro:dashboard-views:v1:{uid}:{userId}:{workspaceId}; o formato tem versão, limite de 200 visões e 2 milhões de caracteres. Somente propriedades de configuração são persistidas, sem resultados analíticos, credenciais ou tokens. Alterações em outras abas atualizam a lista; controle de versão e Web Locks, quando disponíveis, evitam sobrescrita silenciosa. Erros de armazenamento mantêm os dados anteriores.

A tela oferece **Voltar para a Home** como navegação externa. Visões salvas não chamam a API; abrir uma visão consulta resultados no serviço, que mantém autorização no servidor. **Atualizar dados** solicita uma nova consulta.

## Gráficos

Linhas e barras mostram data/categoria e valores em tooltip. Com foco no gráfico, as setas esquerda/direita percorrem os pontos. Datas do eixo podem usar ano abreviado em gráficos estreitos; o tooltip conserva a data completa.

Arrastar sobre o gráfico amplia os eixos. **Limpar zoom**, dois cliques ou a tecla **0** restauram o recorte; **Shift + arrastar** move a área ampliada. Em gráficos com várias séries, clicar na legenda alterna sua visibilidade, mantendo pelo menos uma série. Dados ausentes aparecem como **Sem registro**, sem conversão para zero. Pizza exibe valores na legenda; distribuições com mais de 20 categorias usam barras. A interface não exibe tabela de dados.

## API e configuração

VITE_DASHBOARD_API_URL define a API publicada; VITE_DASHBOARD_API_PROXY_URL configura o proxy local. Em desenvolvimento, inicie também a API de dashboards na pasta astro-dashboard-api; o proxy /dashboard-api é exclusivo do Vite. Em produção, o navegador usa diretamente a URL configurada.

As rotas de catálogo e consulta são /api/dashboard-catalog, /api/explorer/catalog e /api/explorer/query. O serviço define e autoriza bases e campos. Credenciais Databricks e conexão PostgreSQL ficam no servidor, em .dev.vars local ou secrets/bindings Cloudflare; não devem ser incluídas no ambiente público do frontend.

O cache da API pode reutilizar resultados por até 90 segundos, separado por usuário, workspace, acesso e consulta. A autorização é conferida em cada chamada. O cache fica na memória do Worker e pode ser perdido em reinícios ou entre instâncias.

## Estilo

Os estilos da tela ficam em styles/analytics.css; as variáveis --analytics-* e --astro-orb-accent são limitadas ao escopo da página. A tipografia e os tokens compartilhados vêm de styles/global.css.

A paleta dos gráficos usa #641A91, #8A63B1, #C4A8E0, #4D327A, #72529E, #B68CCC e #D4C0E8, com neutros para texto e fundos. Superfícies secundárias, bordas, estados e cartões também usam variáveis locais.
