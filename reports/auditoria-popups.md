# Auditoria visual dos popups

Conferência em 02/10/2026 no navegador, com viewport de 1366 × 900 e fonte raiz de 16 px. As medidas abaixo são da caixa renderizada (`getBoundingClientRect`), equivalente à medida mostrada pelo DevTools ao passar o mouse. Os modais usam zoom de 0,81.

## Medidas comuns verificadas

| Elemento | Medida visual |
| --- | --- |
| Título, uma linha | 27,33 px de altura; peso 600 |
| Título, duas linhas | 54,65 px de altura |
| Botões de ação do rodapé | 203,85 × 40,50 px |
| Distância entre ações no rodapé comum | 11,66 px |
| Campos e seletores, caixa externa | 40,50 px de altura |
| Padding horizontal dos campos | 12,96 px |
| Raio dos campos e botões | 5,83 px |
| Borda dos campos | 0,80 px; transparente em repouso |
| Padding do modal: superior / lados / inferior | 35,64 / 48,60 / 34,02 px |
| Raio do modal | 8,10 px |
| Fundo do modal | `#332754` |
| Fundo dos campos | `#444252` |
| Subtítulo de NRs e eventos, uma linha | 17,99 px de altura; peso 400 |
| Distância título → subtítulo em NRs e eventos | 4,54 px |
| Distância subtítulo → conteúdo em NRs e eventos | 17,50 px |

A altura da caixa do título não é o `font-size`. O título tem fonte computada de 28,1173 px, line-height de 33,7407 px e zoom de 0,81, resultando em aproximadamente 27,33 px de caixa. Variações de 0,01 px vêm do arredondamento do navegador.

## Cobertura no navegador

| Área | Popups abertos e medidos |
| --- | --- |
| Cargos | Adicionar cargo; Editar cargo; NRs; Editar NRs; confirmar alterações de cargo; confirmar alterações de NRs; Inativar cargo; menu de ações; seletor de status; recomendação de IA |
| Eventos | Informações do evento; Selecionar colaboradores; Organizar grupos; distribuição aleatória; Excluir evento; menu de ações; filtros do calendário; seletor de NR |
| Formulários | Adicionar pergunta; calendário de data limite; menu de ações; Excluir formulário; menu de saída; confirmação de saída; confirmação de alterações |
| Cobrança | Como funciona a cobrança |
| Planilha | Como importar planilha |

Todos os rodapés de ação medidos nesses modais apresentam botões de 203,85 × 40,50 px após a entrada terminar. Os títulos de uma linha medidos apresentam 27,32–27,33 px. Os títulos de duas linhas apresentam 54,65 px. Em confirmações com ícone, a caixa do cabeçalho tem aproximadamente 55,08 px porque contém também o ícone.

## Bordas, alinhamento e conteúdo

- Cargos e informações do evento: padding externo, fundo, raio, altura dos campos, tipografia dos inputs e geometria das ações coincidem. A largura dos campos depende da divisão em colunas.
- Tabelas de NRs e colaboradores: mesma fonte computada de 17,08 px e line-height de 21,35 px; cabeçalho de 71,28 px. As larguras e o padding horizontal das colunas variam com o conteúdo. Linhas de edição podem crescer para acomodar ações.
- Organizar grupos: cabeçalhos de “Não distribuídos” e “Grupo 1” medidos com a mesma altura de 28,50 px. Cards de funcionários com 40,50 px de altura, mesma fonte das tabelas e raio de 5,83 px. Padding horizontal de 12,96 px e vertical de 6,48 px.
- Menus de cargos, eventos e formulários: ações medidas com a mesma caixa de 119,21 × 44,06 px. São opções de menu; sua geometria é diferente da ação principal de um rodapé.
- Cobrança e importação: título principal, padding externo, raio e botão “Entendi” seguem os modais comuns. Textos de seções e exemplos têm hierarquia própria.
- Filtros, calendário e tooltips: conferidos como componentes compactos. Seus títulos, controles e espaçamentos não têm a geometria dos formulários de modal.

## Correções desta auditoria

- Removido o padding inferior específico dos modais de NRs para seguir o padding comum.
- Igualada a altura de linha dos subtítulos de NRs, eventos e cobrança.
- Igualados os espaços entre título, subtítulo e conteúdo de eventos aos de NRs.
- Igualada a altura dos cabeçalhos dos grupos, incluindo o espaço ocupado pela lixeira.
- Reservada a mesma espessura de borda em todos os grupos para manter o alinhamento interno.
- Ajustado o tamanho do ícone de “Distribuir aleatoriamente” ao padrão das ações principais.
- Unificadas a entrada e a saída dos modais em fade, sem deslocamento nem alteração de escala. Menus, seletores, filtros e tooltips também aparecem e desaparecem sem deslocamento.

## Limites da conferência

Esta auditoria cobre os fluxos listados, na viewport indicada, e os estados abertos acessíveis pela interface. Não representa uma validação de todas as larguras de tela. Variantes que reutilizam os mesmos componentes — como os demais seletores e o menu de edição de formulário — foram comparadas pela implementação compartilhada, sem abrir cada combinação. Componentes sem uso em uma tela não tiveram medição visual. Alturas de textos com mais linhas e larguras determinadas pelo conteúdo podem variar legitimamente.
