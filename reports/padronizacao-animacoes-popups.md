# Padronização das animações dos popups

## Regras compartilhadas

- Modais: fade de entrada e saída, 260ms, curva ease, sem deslocamento ou escala.
- Backdrop e escurecimento do modal anterior: mesma duração e curva do modal.
- Menus, filtros, selects, calendários e tooltips: fade de 200ms, curva ease.
- Os timers de fechamento leem os tokens CSS por `getPopupDuration`, incluindo chat e tooltips.
- Efeitos internos (arrastar, adicionar/excluir grupos, seleção de dia e mudança de etapa) mantêm seus tempos próprios.
- Preferência de movimento reduzido desativa os efeitos. Cobrança e planilha agora entram no mesmo tratamento dos outros modais.

## Cobertura revisada no código

| Tela | Superfícies cobertas |
| --- | --- |
| Cargos | Adicionar/editar cargo, visualizar/editar NRs, recomendações, confirmações, menus e selects |
| Eventos | Fluxo de criação com seis etapas, distribuição aleatória, confirmação, menus, filtro, selects, datas e horários |
| Formulários | Confirmação de exclusão, menus e selects |
| Criar/editar formulário | Adicionar pergunta, confirmações de saída/salvamento, menus, selects e calendário |
| Pagamento | Explicação da cobrança |
| Importação de planilha | Explicação do modelo |
| Telas com chat/tabelas | Janela do chat e tooltip de texto truncado |

Todas essas famílias usam os keyframes `astro-popup-in` e `astro-popup-out`, definidos em um único arquivo. As etapas do fluxo de eventos compartilham o mesmo AppModal.

## Verificação no navegador antes do ajuste para 260ms

Estilos computados medidos em cargos, cobrança, planilha, adicionar pergunta, informações do evento e distribuição aleatória: `0.8s both astro-popup-in`. Backdrops medidos: mesmo efeito de 0.8s. Saída da planilha: `0.8s both astro-popup-out`. Select de cargos: `0.18s both astro-popup-in`. Escurecimento do modal anterior em cargos/eventos: `opacity 0.8s`. Cancelar distribuição aleatória removeu apenas o modal superior e retirou o escurecimento.

Os demais estados foram revisados no código compartilhado; não foram exercitadas individualmente todas as combinações de confirmação e seleção de cada tela.

TypeScript, lint e `git diff --check` sem erros.

## Ajuste de duração

A pedido do usuário, o token dos modais passou de 800ms para 260ms. Os timers leem esse token, incluindo o chat. Filtros, menus e selects continuam em 200ms. As medições acima registram a verificação anterior, feita com 800ms.

## Transição entre etapas de eventos

Continuar e Voltar mantêm o popup visível e trocam apenas a etapa. O fade completo entre etapas foi removido por causar uma piscada. Os 260ms permanecem na abertura e no fechamento do modal; filtros e seletores continuam em 200ms.

### Animações internas na navegação

O efeito `event-create-group-in` antes executava para todo grupo ao montar Organizar grupos. Agora executa apenas para grupos acrescentados nessa visita à etapa. Verificado no navegador: as cinco transições de avanço e as cinco de retorno não têm animações em descendentes do modal. Adicionar Grupo 2 manteve seu efeito; voltar da programação manteve os três blocos sem repetir o efeito.

## Transição contínua entre etapas

Continuar e Voltar agora usam uma transição visual entre snapshots do modal anterior e do próximo. As imagens cruzam com os keyframes compartilhados de 260ms e `plus-lighter`; a caixa real mantém opacidade 1 e o backdrop não participa da animação. Título e conteúdo ficam na mesma imagem. Sem suporte à API, ou com movimento reduzido, a troca é imediata. Verificadas as seis etapas nos dois sentidos, sem erros no console, e os pseudo-elementos de saída/entrada com 0.26s. A confirmação visual final do efeito no navegador do usuário ainda depende de seu retorno.
