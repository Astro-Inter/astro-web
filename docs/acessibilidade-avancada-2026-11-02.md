# Acessibilidade avançada — verificação de 02/11/2026

O extra E10 está **atendido nos percursos verificados**. A pendência de executar a navegação com um leitor de tela real foi resolvida: foram aprovadas **53 verificações distintas com anúncios registrados pelo NVDA**, incluindo repetições dos trechos inicialmente interrompidos por mudanças de janela.

Essa conclusão descreve o escopo abaixo; não equivale a uma certificação irrestrita de todos os critérios WCAG em qualquer conteúdo, permissão, estado ou combinação de cores. A aparência original foi preservada. Este trabalho não fez uma nova auditoria integral de contraste.

## Como foi verificado

- Aplicação local com o código desta revisão, Chrome em perfil exclusivo de testes e NVDA portátil 2026.3, com voz em português. A conta usada foi autorizada pelo usuário; nenhuma credencial integra o código ou este relatório.
- Playwright operou somente esse perfil. Um auxiliar manteve sua janela ativa para que os eventos de foco chegassem ao leitor. Não houve controle da janela pessoal do Chrome.
- Os resultados exigiram os anúncios reais do registro de fala do NVDA. Inspeção do DOM, foco programático e testes automatizados de componentes foram evidências complementares, sem substituir o leitor.
- A navegação por títulos e landmarks foi exercitada também com comandos nativos do NVDA. Foram observados, por exemplo, os anúncios de “Dashboards”, “título”, “nível 2”, e “Ações rápidas”, “região”.
- Formulários vazios, consultas e abertura/fechamento de controles. Requisições de escrita foram bloqueadas, exceto as necessárias à autenticação. Não foram enviados convites, mensagens de chat, cadastros, eventos, formulários, configurações ou alterações de dashboards.
- Testes executados em desktop e menu móvel em 390 × 844. As tentativas sem fala correspondente ao cenário não foram consideradas aprovações. A tentativa em uma área inativa do Windows não forneceu evidência válida e foi descartada.
- As 53 verificações são a união dos cenários aprovados nas execuções, incluindo a repetição final de 19 etapas, todas aprovadas. O teste inicial dos campos do login foi adicional a essa contagem.

## Resultados observados

| Percurso | Resultado com NVDA e teclado |
| --- | --- |
| Login | Anúncios de Email, Senha como edição protegida e Mostrar senha como botão de alternância não pressionado. |
| Home, gestores, colaboradores, conformidades, unidades, cargos, formulários e eventos | Título da página anunciado após a navegação e foco no `h1`. |
| Títulos e landmarks | Comandos do próprio leitor alcançam o próximo título e a próxima região, mantendo o contexto da Home. |
| Importação e inclusão manual de conformidade | Diálogos anunciados com seus títulos; campos identificados. |
| Seletor de colaborador | Expansão, opções e navegação por End anunciadas; Escape devolve foco ao campo. |
| Calendário dentro do modal | Dia e mudança de data por seta anunciados; Escape fecha somente o calendário e devolve foco ao campo. Nenhuma data foi salva. |
| Modais empilhados | Shift+Tab alcança a última ação; Tab retorna ao primeiro campo. Escape fecha cada nível e anuncia o controle de origem correspondente. |
| Criação de evento | Título do diálogo e campo anunciados. Envio vazio anuncia erros e coloca foco no título inválido; fechamento retorna ao contexto de origem. |
| Editor de formulário | Título após carregar a API e nome do campo anunciados. Modal de perguntas, opções, menu e última ação acessíveis; Escape restaura o controle de origem. |
| Galeria de dashboards | Menu, navegação até Excluir e retorno ao botão do card anunciados, sem executar a exclusão. |
| Gráfico interativo | Nome e instruções anunciados. Em um gráfico com várias categorias, ArrowRight altera o ponto e o NVDA anuncia o novo valor; foco permanece no SVG. Um gráfico anual com apenas uma categoria não servia para verificar mudança de ponto. |
| Workspace e Conta | Destino atual e novo contexto anunciados durante a alternância. |
| Confirmação de identidade | Título do diálogo e Senha como edição protegida anunciados. Cancelamento devolve foco a Ver tudo, sem revelar os dados protegidos. |
| Menu móvel | Estado expandido, primeiro destino e retorno ao botão de abertura por Escape anunciados. |
| Chat | Abertura coloca foco em Digite sua mensagem; histórico e retorno à conversa são anunciados. Fechar devolve foco ao lançador. Nenhuma mensagem foi enviada. |

As verificações de Tab, foco visível, rótulos, referências ARIA e estrutura semântica realizadas anteriormente estão em [Acessibilidade mínima](acessibilidade-minima-2026-11-02.md). A navegação de Workspace/Conta corresponde a destinos do roteador, não a um widget ARIA de abas.

## Correção e regressão

`src/utils/routeFocus.ts` preserva agora também o foco de elementos com `tabindex`, incluindo SVGs de gráficos e regiões interativas. Uma atualização tardia do cabeçalho não deve retirar o foco desses controles. A proteção anterior contemplava campos, botões, links e diálogos.

`tests/routeFocus.test.cjs` reproduz a substituição do cabeçalho enquanto um gráfico SVG está em foco e verifica que o foco permanece nele. Os cenários anteriores continuam cobrindo títulos tardios, substituição do carregamento, modal global e campos em uso.

Após a correção: **611 testes aprovados, zero falhas e zero testes ignorados**, lint e build TypeScript/Vite aprovados. Nenhuma alteração de CSS, cores, contraste, tipografia ou disposição das telas.

## Roteiro para a apresentação

1. Ativar o NVDA e navegar por títulos e landmarks na Home.
2. Abrir a inclusão manual de conformidade. Demonstrar seletor e calendário com setas e Escape, depois Tab/Shift+Tab e fechamento dos dois diálogos.
3. Enviar vazio o formulário de evento e ouvir os erros, sem criar um cadastro.
4. Abrir o editor de formulário, seu diálogo de perguntas e seu menu. Fechar com Escape e mostrar o retorno de foco.
5. Abrir um dashboard com várias categorias e consultar os valores por seta.
6. Mostrar a alternância entre configurações e o menu móvel. Abrir e fechar o chat sem enviar mensagens.

A demonstração oral continua sendo uma atividade do grupo. As alterações e verificações desta revisão são locais; a versão publicada precisa receber essas alterações pelo fluxo normal de entrega.
