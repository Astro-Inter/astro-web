# Acessibilidade — verificação de 30/10/2026

## Auditoria automática

Ferramentas: Chrome desktop headless, axe-core 4.14.0 e regras WCAG 2 A/AA e WCAG 2.1 A/AA. A dependência de auditoria foi utilizada somente na pasta temporária de testes, sem inclusão nas dependências da aplicação.

| Cenário | Violações automáticas |
| --- | ---: |
| Login | 0 |
| Login com erros de campos | 0 |
| Esqueci minha senha | 0 |
| Esqueci minha senha com erro de campo | 0 |
| E-mail de recuperação enviado | 0 |
| Senha alterada | 0 |
| Substituição de senha sem token | 0 |
| Usuário inativado | 0 |
| Rota inexistente — 404 | 0 |
| Modal com controles fechados | 0 |
| Modal com seletor aberto | 0 |
| Modal com calendário aberto | 0 |

Esses primeiros controles de modal foram montados isoladamente usando os componentes reais. A revisão foi ampliada para as telas autenticadas e os popups reais, conforme o escopo abaixo. Nenhum cadastro foi criado, editado ou excluído durante a auditoria.

### Telas autenticadas

As 12 rotas abaixo foram abertas no Chrome em 1366 × 900, após autenticação de uma conta de teste. Todas apresentaram **zero violações automáticas** nas regras utilizadas:

- Home, colaboradores, gestores e conformidades.
- Unidades, cargos, formulários e eventos.
- Dashboards, conta, configurações do workspace e criação de formulário.

Home, dashboards, conta, configurações e criação de formulário foram verificadas também em **320 × 900**: zero violações e nenhuma rolagem horizontal do documento nos cinco cenários.

Na etapa seguinte, as cinco telas foram verificadas com **texto em 150%, fonte OpenDyslexic e alto contraste**, também em 320 × 900. Foram corrigidos excessos de largura no resumo da galeria, no link dos cards, na paginação e nos títulos. Dashboards e formulários foram reavaliados após as correções: documento com 309 px e 313 px de largura, respectivamente, sem violações automáticas e sem botões sem nome na árvore de acessibilidade do Chrome. Essa árvore complementa a auditoria e não substitui uma execução com leitor de tela.

### Popups e controles reais

| Cenário autenticado | Violações automáticas |
| --- | ---: |
| Menu do card de dashboard | 0 |
| Nova visão, com nome preenchido | 0 |
| Filtros de conformidades | 0 |
| Informações de criação de evento | 0 |
| Criação de evento com erros de validação | 0 |
| Seletor de gestor aberto na criação de formulário | 0 |
| Calendário aberto na criação de formulário | 0 |

### Itens inconclusivos

O axe não determina sozinho o contraste do centro do gráfico com gradiente, de textos encobertos por popups e de eventos fora da área visível de rolagem. Esses avisos permanecem separados das violações. Os testes de contraste dos tokens compartilhados complementam a auditoria, mas não equivalem à inspeção de toda combinação visual possível.

Nos popups abertos, o axe solicita conferência das referências `aria-controls`; a existência do elemento controlado foi conferida no navegador para menu, seletor e calendário. A rolagem do seletor também exige conferência contextual por usar opções com `tabindex="-1"`, acessíveis pelas setas.

## Correções decorrentes da revisão

- Seletor e calendário mantêm `aria-controls` somente enquanto o elemento controlado está montado.
- O conjunto de dias do calendário tem `role="group"` e nome acessível com o mês.
- Escape no seletor fechado não bloqueia o fechamento do modal.
- Tab e Shift+Tab circulam no dialog ativo, incluindo os controles intermediários de seções expansíveis.
- O foco retorna à origem; quando ela foi removida, segue para um título ou para o dialog que permanece aberto.
- Textos truncados mantêm seu conteúdo completo disponível para tecnologias assistivas, sem `aria-label` inválido em elementos genéricos.
- Campos de conta, colaboradores, conformidades, eventos, NRs e gráficos usam um único rótulo associado, evitando anúncios duplicados.
- Os dias de fora do mês e a ação Excluir usam cores com contraste suficiente; opções de seletores e campos mantêm foco visível por teclado.
- A área vazia de perguntas não se apresenta como uma lista sem itens; referências do menu de formulário só existem enquanto ele está montado.

## Teclado no Chrome

Foram conferidos Tab no login, envio por Enter, seleção por End/Enter, abertura do calendário por ArrowDown, fechamento por Escape, circulação de Tab/Shift+Tab no modal e retorno do foco ao botão de origem. Nos componentes autenticados, foram conferidos End e Escape no menu de dashboard, contenção de foco no popup de nova visão e retorno ao campo de data ao fechar o calendário. O seletor de gestor rola até a última opção via End e mantém contorno sólido de 2 px; no calendário, ArrowRight muda o dia focado. Os erros de criação de evento permanecem no DOM e associados aos campos por `aria-describedby`.

Os testes automatizados de componentes verificam ainda erros associados por `aria-describedby`, anúncios com `role="alert"`, remoção da origem do foco e contraste dos tokens compartilhados nos fundos de página, popup, campo e botões.

Após as correções, o build e o lint concluíram sem erros, e a suíte completa aprovou os 508 testes. As regressões incluem rótulo externo único, preservação do texto completo para leitura assistiva e contraste dos dias fora do mês e da ação Excluir.

## Limites e validação final

### Complemento de 31/10/2026 — mínimo AA

As 12 telas autenticadas foram reavaliadas com axe-core e percorridas com Tab. O menu mobile foi aberto com Enter, percorrido com Tab e fechado com Escape, devolvendo o foco ao botão de abertura. O link de salto foi conferido em Unidades e Configurações e moveu o foco ao conteúdo principal.

Também foram verificados o chat aberto, os popups de cargo, colaborador, promoção a gestor e filtros, os erros de envio vazio de cargo e colaborador, o menu de dashboard e a personalização do formulário com setas. Esses cenários não apresentaram violações automáticas. Nenhum cadastro foi salvo, alterado ou excluído na conta de teste.

Correções adicionais:

- O menu de ações conserva o foco quando passa de oculto para posicionado. A restauração à origem ocorre na desmontagem, preservando o uso de Home, End e setas. A regressão reproduz essa transição e verifica também a devolução do foco.
- A navegação lateral permite rolagem em janelas baixas, mantendo Configurações acessível. O botão do menu mobile, o lançador do chat e o cabeçalho móvel do chat têm contorno visível pelo teclado.
- A área de rolagem dos calendários tem nome acessível, `role="region"`, `tabIndex={0}` e contorno de foco. Isso corrige a violação `scrollable-region-focusable` encontrada nas visualizações semanal e anual. As três visualizações foram reavaliadas: zero violações automáticas.
- Os testes de contraste incluem as cinco cores do calendário e a composição do contorno translúcido nos fundos do chat, com razão mínima de 3:1 para o foco.
- O teste da saída dos skeletons de formulários usa relógio controlado, evitando que a carga da máquina faça a animação terminar antes da asserção intermediária.

A suíte completa terminou com **509 testes aprovados**. Após o ajuste final do calendário, os **40 testes de eventos, foco, contraste e seletores foram reexecutados e aprovados**. A compilação também passou após esse ajuste.

No Chrome, Home e PageDown foram executados com foco na área do calendário. PageDown deslocou a visão semanal em 644 px e a anual em 405 px, mantendo o foco e o contorno sólido. A mensal não tinha excesso de altura nesse cenário e permaneceu em 0 px, sem rolagem desnecessária.

### Alcance da conclusão

O mínimo M11 está implementado e validado no escopo descrito, combinando auditoria automática, comportamento por teclado e regressões dos componentes compartilhados. A cobertura anterior inclui 17 cenários de telas autenticadas e sete de controles abertos, além dos 12 cenários públicos/isolados. Zero violações automáticas não constitui certificação de todo critério WCAG em toda combinação de dados, estado e permissão.

A demonstração com leitor de tela do extra E10 continua separada: o NVDA 2026.3 foi obtido da fonte oficial, teve sua assinatura validada e foi executado em modo portátil com autorização. Foram observados anúncios dos valores e das consultas do gráfico. A navegação dos campos não foi concluída: o navegador integrado anunciou a moldura do aplicativo e a automação da janela externa do Chrome foi interrompida por não conseguir confirmar a URL. Essa tentativa não é registrada como aprovação integral com leitor de tela.

### Novos blocos do chat após integrar a main

Na integração de `33b46ab`, os blocos de gráfico, tabela e galeria foram conferidos
isoladamente no Chrome com os componentes e estilos reais. A tabela recebeu foco
e rolou horizontalmente com ArrowRight, mantendo contorno sólido. O axe registrou
zero violações no tema padrão e em 360 px com texto a 200% e alto contraste; o
documento ficou sem rolagem horizontal. Os gráficos possuem os mesmos dados em
texto, e as fotos têm alternativa descritiva ou iniciais.

Após as correções desta integração, build e lint passaram e a suíte completa
aprovou **518 testes**. Essa verificação não enviou mensagens ao chatbot nem
substitui a demonstração com leitor de tela registrada acima como pendente.
