# Edição de eventos

## Implementação

- O menu do calendário habilita Editar para compromissos e lembretes.
- CreateEventFlowModal atende criação e edição com os mesmos seis componentes, estilos e transições.
- A edição carrega EventConfiguration: informações, seleção de colaboradores, grupos, distribuição, horários e configurações. Eventos antigos de demonstração preenchem somente os dados disponíveis (título, categoria, data e horários); os demais ficam vazios.
- Voltar/Continuar preserva os grupos. Remover colaboradores limpa suas atribuições; remover/reiniciar/redistribuir grupos limpa os horários correspondentes.
- A revisão oferece Salvar alterações e valida título, existência de grupo, data, horários e término posterior ao início.
- Salvar alterações abre ConfirmationModal, o mesmo componente de cargos. Seu backdrop é transparente e apenas a revisão atrás é escurecida. Cancelar mantém a revisão e o rascunho; somente confirmar grava.
- Ao confirmar, revisão e confirmação usam a saída compartilhada de 260 ms, com o mesmo intervalo de 60 ms de cargos. Depois de fechar, as ocorrências salvas recebem um destaque de 900 ms e seus textos a mesma animação de 620 ms das linhas de cargos. Movimento reduzido desativa as animações do calendário.
- Salvar atualiza o calendário diretamente, sem a animação de troca de período. useAnimatedResults aceita uma opção de atualização sem animação, mantendo o comportamento padrão nas demais telas. Navegação pelas setas, visualizações e filtros volta a usar as transições normais.
- Cada grupo gera uma ocorrência de calendário ligada ao mesmo eventId. Salvar substitui as ocorrências anteriores, e editar qualquer ocorrência reabre o evento completo. A exclusão mantém a mesma unidade de evento.
- Criar evento também grava a configuração no calendário local para permitir edição posterior.

## Verificações executadas

- TypeScript (`tsc -b`), lint (`oxlint`), build de produção e `git diff --check`: passaram. O build precisou rodar fora do sandbox após erro de permissão ao iniciar o Vite.
- Navegador: editar um evento de demonstração, alterar título/descrição/configurações, salvar e reabrir com os dados atualizados.
- Cancelar uma alteração de título: o calendário manteve o título salvo.
- Selecionar 12 colaboradores e distribuí-los em dois grupos: seis participantes por grupo.
- Término anterior ao início: mensagem no DOM com role="alert"; salvamento bloqueado.
- Corrigir horários, salvar duas datas distintas e reabrir pela segunda ocorrência: dois grupos completos; ocorrência antiga removida; sem duplicações.
- Voltar à distribuição e continuar: grupos e horários preservados.
- Criação: um evento novo apareceu no calendário após a revisão.
- Console do navegador sem erros durante os fluxos verificados.
- Confirmação: cancelar preservou o evento antigo e removeu o escurecimento da revisão; confirmar atualizou o evento. Ambos os diálogos apresentaram astro-popup-out/0.26s, e a ocorrência apresentou event-calendar-item-saved/0.9s e astro-data-table-content-saved/0.62s após o fechamento.
- Após salvar: painel com animation-name none, transform none e opacity 1 durante e após o fechamento; destaque do evento preservado. Próximo mês continuou usando event-period-next-in. TypeScript e lint passaram após o ajuste.

## Critérios DAD aplicáveis

- M04: contratos EventConfiguration e props tipados, sem introdução de any.
- M06: alterações imutáveis e editor da página agrupado em um estado discriminado. O fluxo reaproveitado mantém seus estados de formulário existentes.
- M07/M08: efeitos existentes preservados e ocorrências/grupos com identificadores estáveis.
- M11: ações em botões, campos rotulados, erro com role="alert" e foco inicial do diálogo observado. Auditoria integral de contraste/teclado e leitor de tela não foi realizada nesta demanda.
- E08: validação antes de gravar o evento fica em src/utils/eventEditing.ts. Não há envio remoto.
- M05/M12: nenhuma operação de API foi introduzida.

## Limitação

Os eventos ainda ficam no estado local de MainEventScreen. Recarregar a página ou sair da rota restaura os dados de demonstração. Persistência remota depende da API; publicação e histórico de commits do projeto não foram auditados nesta demanda.
