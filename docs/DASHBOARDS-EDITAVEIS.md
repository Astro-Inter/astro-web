# Dashboards editáveis

A tela /mainDashboardsScreen usa a sessão Firebase e confirma na API o usuário e o workspace antes de consultar dados. Os gráficos são renderizados no React com dados do Databricks; a tela não incorpora um dashboard por iframe.

## Visões e cálculos

**Visão geral** e **Eventos** abrem os indicadores disponíveis. Datas e granularidade entram na consulta somente após **Aplicar filtros**.

**Personalizar visão** edita uma visão pessoal; **Nova visão** cria uma configuração vazia. Uma visão aceita até 12 gráficos de tamanho uniforme, em coluna única em telas menores. É possível ordenar os gráficos por arraste ou pelas setas.

O editor permite escolher base, informação, operação e agrupamento. **Usar indicador pronto** seleciona um indicador do catálogo. **Combinar com outro indicador** aplica adição, subtração, multiplicação, divisão ou percentual entre duas agregações da mesma base, com até três condições opcionais. Soma, média, mínimo e máximo estão disponíveis para campos numéricos; IDs, datas e textos permitem contagem. O catálogo descreve campos derivados e a data associada ao filtro de período.

**Gerar prévia** consulta a API; mudar a configuração oculta a prévia anterior. **Atualizar prévia** consulta a fonte sem reutilizar o cache anterior. O editor não aceita SQL livre, joins arbitrários ou fórmulas entre bases diferentes: o servidor monta consultas a partir de operações e parâmetros permitidos.

Cada visão salva aparece em sua própria aba. A tela oferece **Voltar para a Home** como navegação externa. Indicadores que apresentam o estado disponível independentemente do período identificam essa condição junto ao gráfico.

## Gráficos

Linhas e barras mostram data/categoria e valores em tooltip. Com foco no gráfico, as setas esquerda/direita percorrem os pontos. Em gráficos estreitos, o eixo pode abreviar o ano; o tooltip mantém a data completa.

Arrastar sobre o gráfico amplia os eixos. **Limpar zoom**, dois cliques ou a tecla **0** restauram o recorte; **Shift + arrastar** move a área ampliada. Em gráficos com várias séries, clicar na legenda alterna a visibilidade de uma série, mantendo pelo menos uma visível. Dados ausentes aparecem como **Sem registro**, sem conversão para zero. Gráficos de pizza exibem valores na legenda; distribuições com mais de 20 categorias usam barras. A interface não oferece tabela; configurações legadas de tabela são abertas no tipo de gráfico padrão do indicador.

## Persistência das visões

As configurações são persistidas pela API de dashboards no MongoDB, por conta e workspace. O navegador não envia IDs para escolher outro workspace. A autorização e a associação ao workspace são determinadas no servidor.

| Operação | Endpoint | Comportamento |
| --- | --- | --- |
| Listar visões | GET /api/views | Retorna as configurações acessíveis à identidade autenticada. |
| Criar ou atualizar | PUT /api/views/{id} | Recebe nome, configuração e versão. Versão 0 cria; a versão atual atualiza. |
| Excluir | DELETE /api/views/{id}?version=N | Remove somente se a versão enviada ainda for a atual. |

A configuração salva inclui nome, filtros, layout, receitas de cálculo e estilo do cartão. O armazenamento no Mongo usa a coleção configuracoes_paineis; o estilo fica em campos próprios, separado do nome. Um conflito de versão retorna HTTP 409 para evitar sobrescrever alterações concorrentes. Ao salvar ou excluir, a interface atualiza as abas; foco da janela também atualiza a lista para refletir mudanças feitas em outra sessão.

### Importação de configurações locais antigas

A primeira consulta pode importar configurações legadas de localStorage. A origem usa a chave astro:dashboard-views:v1:{uid}:{userId}:{workspaceId}, com schemaVersion 1, limite de 200 visões e 2 milhões de caracteres. O frontend envia cada configuração ainda ausente no servidor com versão 0, consulta a lista atualizada e grava um marcador local para não repetir a migração. Um HTTP 409 durante uma importação indica que o registro já existe no servidor e não substitui a versão remota. A cópia local antiga é mantida; novas alterações são salvas pela API.

A leitura das configurações existentes reconhece marcadores de estilo antigos embutidos no nome e os converte para o campo de estilo. Novas gravações mantêm o nome limpo e persistem o estilo na configuração.

## Dados e cache

A API de dashboards fornece os indicadores e o catálogo de bases/campos do editor. As consultas de dados podem usar cache por até 90 segundos, separado por usuário, workspace, acesso e consulta; a autorização é verificada em cada chamada. O cache fica na memória do Worker e pode ser perdido em reinícios ou entre instâncias. **Atualizar dados** envia a solicitação de atualização à API para consultar a fonte novamente.

Credenciais Databricks, conexão MongoDB e demais secrets ficam no servidor, em configuração local .dev.vars ou em secrets/bindings do Cloudflare. Não devem ser incluídos na configuração pública do frontend.

## Configuração e desenvolvimento

VITE_DASHBOARD_API_URL define a API publicada. Em desenvolvimento, o frontend usa o proxy /dashboard-api, configurado para a API local; VITE_DASHBOARD_API_PROXY_URL define esse destino. Inicie a API de dashboards na pasta astro-dashboard-api e o frontend nesta pasta.

As rotas usadas pelo web incluem /api/me, /api/dashboard, /api/dashboard-catalog, /api/explorer/catalog, /api/explorer/query e /api/views. Em produção, o navegador chama diretamente a URL definida por VITE_DASHBOARD_API_URL. A API precisa permitir a origem do web em CORS_ALLOWED_ORIGINS e as rotas de visão precisam estar disponíveis.

## Estilo

Os estilos da tela ficam em styles/analytics.css. As variáveis --analytics-* e o destaque --astro-orb-accent têm escopo local à página; tipografia e tokens compartilhados vêm de styles/global.css.

A paleta dos gráficos usa #641A91, #8A63B1, #C4A8E0, #4D327A, #72529E, #B68CCC e #D4C0E8, com neutros para texto e fundos. Superfícies secundárias, bordas, estados e cartões também usam variáveis locais.
