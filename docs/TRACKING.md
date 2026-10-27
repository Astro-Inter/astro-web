# Tracking do Astro — SCRUM-544

Você abre uma tela ou clica → o frontend põe o evento no dataLayer → o GTM recebe → a tag chama a API → a API grava na tabela eventos_astro.

~~~mermaid
flowchart LR
  A[Você usa o site] --> B[Frontend identifica tela e ação]
  B --> C[GTM-NF932KMT]
  C --> D[POST /api/eventos]
  D --> E[(eventos_astro)]
~~~

## Onde ficam as peças

| Arquivo | Para que serve |
|---|---|
| [src/gtm/screens.ts](../src/gtm/screens.ts) | Livro dos nomes de telas e contextos. |
| [src/gtm/routes.ts](../src/gtm/routes.ts) | Diz qual tela corresponde ao endereço. |
| [src/gtm/buttons.ts](../src/gtm/buttons.ts) | Nomes dos botões; comuns guarda ações reutilizadas. |
| [src/gtm/dialogs.ts](../src/gtm/dialogs.ts) | Nomes das janelas; DIALOG_NAMES reúne as janelas do frontend atual. |
| [src/gtm/showcases.ts](../src/gtm/showcases.ts) | Nomes das listas, sidebar e tipos de notificação. |
| [src/gtm/track.ts](../src/gtm/track.ts) | Monta apenas os campos aceitos pela API e entrega ao GTM. |
| [src/gtm/runtime.ts](../src/gtm/runtime.ts) | Observa as marcações e classifica as interações. |
| [src/gtm/Tracking.tsx](../src/gtm/Tracking.tsx) | Liga o GTM e pega o UID do usuário autenticado. |
| [src/routes/index.tsx](../src/routes/index.tsx) | Identifica a rota realmente renderizada, após as transições. |

## Como uma tela é identificada

Mesmo que várias etapas compartilhem um componente, o endereço e o parâmetro context escolhem nome_tela e contexto_tela. O erro de cadastro só é registrado quando a tela de erro é exibida. Carregamentos e redirecionamentos não contam como telas.

| Endereço | nome_tela | contexto_tela |
|---|---|---|
| / | cadastro | principal |
| /paymentMethod | cadastro | pagamento |
| /createWorkspace | cadastro | codigo |
| /accessKeyVerified | cadastro | sucesso |
| /createPassword | workspace | principal |
| /includeCompanyInformation | workspace | dados_cadastrais |
| /attachExcelFile | workspace | documento |
| /setAddress | workspace | endereco |
| /workspaceCreated | workspace | resumo |
| /mainHomeScreen | home | home |
| /mainDashboardsScreen | home | dashboard |
| /mainManagerScreen | gestor | gestor |
| /mainEmployeerScreen | colaboradores | colaboradores |
| /mainConformityScreen | conformidade | conformidade |
| /mainUnitScreen | unidade | unidade |
| /mainPositionScreen | cargo | cargo |
| /mainFormScreen | formulario | principal |
| /createForms | formulario | criar_formulario |
| /editForms | formulario | editar_formulario |
| /mainEventScreen | evento | calendario |
| /mainWorkspaceSettingsScreen | configuracoes | principal |
| /mainAccountScreen | configuracoes | conta |
| /inactiveScreenLayout | erro | usuario_inativo |
| /erroScreenLayout | erro | pageNotFound |
| /includeCompanyInformation?context=settings | configuracoes | dados_cadastrais |
| /attachExcelFile?context=settings | configuracoes | documento |
| /setAddress?context=settings | configuracoes | endereco |
| /paymentMethod?context=settings | configuracoes | pagamento |
| /loadingScreen?context=registration | erro | cadastro_workspace |
| qualquer endereço desconhecido | erro | pageNotFound |

## Os seis eventos

Todos levam firebase_uid (ou null antes do login), nome_tela e contexto_tela. Os demais campos ficam null quando não pertencem àquele tipo.

| O que aconteceu | tipo_evento | Identificação adicional |
|---|---|---|
| Tela apareceu | screen_view | nenhuma |
| Botão fora de janela | button_click | nome_botao |
| Janela ou menu abriu | dialog_viewed | nome_dialog |
| Ação dentro de janela | dialog_clicked | nome_dialog e dialog_clicado |
| Lista entrou na área visível | showcase_viewed | nome_showcase |
| Item de lista foi clicado | showcase_clicked | nome_showcase e showcase_click |

Os identificadores de itens são ações ou categorias fixas, como gestores, acoes e evento. Nomes de pessoas, IDs de registros, emails, senhas, códigos, datas escolhidas, arquivos, tokens e mensagens não são coletados. Há botões do chat com nomes de ações, mas nenhum evento conversation_* e nenhum conteúdo de conversa.

## Exemplo pequeno: marcar um botão

~~~tsx
<button data-track-action={BUTTONS.comuns.adicionar} onClick={abrirFormulario}>
  Adicionar
</button>
~~~

A marcação é uma etiqueta. O runtime lê a etiqueta e envia o evento. O onClick continua fazendo a ação da tela.

Uma janela recebe trackingName no AppModal. Uma lista recebe trackingName no DataTable. Um formulário recebe data-track-submit: clique e Enter passam por submit, gerando uma única ação por envio.

Os nomes originais fornecidos estão preservados. Foram acrescentados nomes para controles e janelas do frontend atualizado, como edição de formulário, recuperação de erro do cadastro, transferência de gestor, ações de chat e seleção de horário. Um nome no catálogo só gera evento quando uma tela ou componente real usa a marcação.

## Rodar no VS Code

Esta cópia precisa do .env do Firebase para abrir o aplicativo. Copie a configuração local que você já usa para o frontend; não coloque credenciais no Git. VITE_API_URL continua sendo a API principal de negócio, separada da API de tracking.

No .env local, as opções de tracking são:

~~~dotenv
VITE_GTM_ID=GTM-NF932KMT
VITE_TRACKING_ENABLED=true
~~~

Esses são os valores padrão do código. VITE_TRACKING_ENABLED=false desliga o tracking.

Abra o terminal na pasta abaixo e rode:

~~~bat
# No terminal aberto na pasta astro-web:
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
~~~

Abra http://127.0.0.1:5174/ no Chrome. O GTM publicado funciona sem Preview. Não precisa rodar uma API local para tracking. O site precisa de internet e a API/banco precisam estar disponíveis.

Para conferir o código sem gravar eventos reais:

~~~bat
npm.cmd run test:tracking
~~~

## Ver os registros

No Chrome, F12 → Console: a tag publicada mostra Tracking: evento salvo no banco e o id_evento. Em Network/Rede, o POST para https://astro-tracking-api.app-4str0.workers.dev/api/eventos deve responder 201. Estar no dataLayer confirma a entrega ao GTM; a resposta 201 confirma que a API criou o registro.

No seu cliente PostgreSQL, execute esta consulta, clique no site e execute novamente:

~~~sql
SELECT id_evento, tipo_evento, nome_tela, contexto_tela,
       nome_botao, nome_dialog, dialog_clicado,
       nome_showcase, showcase_click, criado_em
FROM public.eventos_astro
ORDER BY id_evento DESC
LIMIT 30;
~~~

A API gera id_evento e criado_em. O frontend não envia esses campos. Se o banco responder 503, consulte /health/db. Não há reenvio automático dos eventos que falharam; repita as ações depois de resolver a disponibilidade do banco.

## Mapa das marcações no código

Este mapa aponta os controles existentes. Uma ação dentro de dialog vira dialog_clicked; o mesmo controle fora de dialog vira button_click. Listas usam showcase_clicked para itens explicitamente marcados. Escape e clique no backdrop de uma janela dispensável usam fechar.

| Arquivo | Marcações |
|---|---|
| [src/components/accountDetailsModal/index.tsx](../src/components/accountDetailsModal/index.tsx#L41) | trackingName: editable ? editar_conta : informacoes_conta; data-track-submit: salvar_alteracoes; trackingAction: unidade; trackingAction: modalidade; data-track-action: editable ? cancelar : voltar; data-track-action: salvar_alteracoes; trackingName: confirmar_alteracoes_conta |
| [src/components/accountManagerSelectionForm/index.tsx](../src/components/accountManagerSelectionForm/index.tsx#L22) | data-track-submit: continuar; trackingAction: colaborador; data-track-action: cancelar; data-track-action: continuar |
| [src/components/accountProfileHeader/index.tsx](../src/components/accountProfileHeader/index.tsx#L16) | data-track-action: alterar_foto |
| [src/components/addFormQuestionModal/index.tsx](../src/components/addFormQuestionModal/index.tsx#L23) | trackingName: selecionar_tipo_pergunta; data-track-action: kind === 'nr' ? nr : kind === 'photo' ? foto : kind === 'date' ? data : kind === 'text' ? texto : kind === 'unit' ? unidade : selecao; data-track-action: cancelar |
| [src/components/addressForm/index.tsx](../src/components/addressForm/index.tsx#L51) | data-track-submit: settingsMode ? salvar_alteracoes : finalizar_workspace; data-track-action: sede_anterior; data-track-action: remover_rede; data-track-action: proxima_sede; data-track-action: adicionar_sede; data-track-action: settingsMode ? salvar_alteracoes : finalizar_workspace |
| [src/components/appModal/index.tsx](../src/components/appModal/index.tsx#L25) | data-track-dismissible: dismissible; data-track-dialog: trackingName |
| [src/components/appSidebar/index.tsx](../src/components/appSidebar/index.tsx#L86) | data-track-action: open ? fechar_menu : abrir_menu; data-track-action: fechar_menu; data-track-showcase: sidebar; data-track-item: SIDEBAR_ITEMS[item.path] |
| [src/components/astroChat/index.tsx](../src/components/astroChat/index.tsx#L29) | data-track-action: sessionList.panelOpen ? voltar_conversa : historico_conversas; data-track-action: encerrar_conversa; data-track-action: chat.expanded ? recolher_chat : ampliar_chat; data-track-action: fechar_chat; data-track-action: login; data-track-action: pergunta_sugerida; data-track-submit: enviar_mensagem; data-track-action: enviar_mensagem; data-track-action: ia |
| [src/components/astroChatSessions/index.tsx](../src/components/astroChatSessions/index.tsx#L55) | data-track-action: nova_conversa; data-track-action: abrir_conversa; data-track-action: tentar_novamente |
| [src/components/attachExcelFileForm/index.tsx](../src/components/attachExcelFileForm/index.tsx#L72) | data-track-submit: settingsMode ? adicionar : continuar; data-track-action: settingsMode ? adicionar : continuar; data-track-action: modelo |
| [src/components/chargeExplanationModal/index.tsx](../src/components/chargeExplanationModal/index.tsx#L18) | data-track-dialog: explicacao_pagamento; data-track-action: entendi |
| [src/components/collaboratorDialog/index.tsx](../src/components/collaboratorDialog/index.tsx#L22) | trackingName: mode === 'create' ? adicionar_colaborador : mode === 'edit' ? editar_colaborador : informacoes_colaborador; data-track-action: tentar_novamente; data-track-action: voltar |
| [src/components/collaboratorForm/index.tsx](../src/components/collaboratorForm/index.tsx#L71) | trackingAction: ( Cargo: cargo, Unidades: unidade, Modalidade: modalidade, Status: status  as Record<string, string>)[label] ?? selecionar_opcao; data-track-submit: mode === 'create' ? adicionar : salvar_alteracoes; data-track-action: editable ? cancelar : voltar; data-track-action: mode === 'create' ? adicionar : salvar_alteracoes |
| [src/components/companyInformationForm/index.tsx](../src/components/companyInformationForm/index.tsx#L33) | data-track-submit: settingsMode ? salvar_alteracoes : continuar; data-track-action: settingsMode ? salvar_alteracoes : continuar |
| [src/components/complianceOverviewCard/index.tsx](../src/components/complianceOverviewCard/index.tsx#L19) | data-track-action: dashboard |
| [src/components/confirmationModal/index.tsx](../src/components/confirmationModal/index.tsx#L37) | trackingName: trackingName; data-track-action: cancelLabel === 'Voltar' ? voltar : cancelar; data-track-action: confirmationAction(confirmLabel) |
| [src/components/conformityFilterModal/index.tsx](../src/components/conformityFilterModal/index.tsx#L52) | trackingName: filtros_conformidade; data-track-submit: aplicar_filtros; trackingAction: nr; trackingAction: origem; data-track-action: limpar_filtros; data-track-action: aplicar_filtros |
| [src/components/conformityFormModal/index.tsx](../src/components/conformityFormModal/index.tsx#L65) | trackingName: editing ? editar_conformidade : adicionar_conformidade; data-track-submit: editing ? salvar_alteracoes : adicionar; trackingAction: selecionar_opcao; trackingAction: nr; data-track-action: cancelar; data-track-action: editing ? salvar_alteracoes : adicionar |
| [src/components/createEventFlowModal/index.tsx](../src/components/createEventFlowModal/index.tsx#L146) | trackingName: ( details: informacoes_evento, collaborators: selecionar_colaboradores_evento, groups: organizar_equipes_evento, schedule: editar_equipes_evento, settings: configuracoes_evento, review: detalhes_evento )[step]; trackingName: confirmar_alteracoes_evento |
| [src/components/createPasswordForm/index.tsx](../src/components/createPasswordForm/index.tsx#L44) | data-track-submit: continuar; data-track-action: continuar |
| [src/components/dataTable/index.tsx](../src/components/dataTable/index.tsx#L25) | data-track-showcase: loadingContent ? undefined : trackingName |
| [src/components/editRegulatoryStandardsDialog/index.tsx](../src/components/editRegulatoryStandardsDialog/index.tsx#L187) | data-track-action: ia; trackingName: contextLabel ? editar_nrs_unidade : editar_nrs_cargo; trackingName: contextLabel ? lista_dialog_unidade : lista_dialog_cargo; data-track-action: cancelar; data-track-action: salvar |
| [src/components/emailField/index.tsx](../src/components/emailField/index.tsx#L31) | data-track-action: limpar_email |
| [src/components/eventCalendar/index.tsx](../src/components/eventCalendar/index.tsx#L77) | data-track-item: evento; data-track-showcase: calendario_eventos; data-track-action: periodo_anterior; data-track-action: proximo_periodo |
| [src/components/eventCheckbox/index.tsx](../src/components/eventCheckbox/index.tsx#L12) | data-track-action: selecionar_colaborador |
| [src/components/eventDetailsModal/index.tsx](../src/components/eventDetailsModal/index.tsx#L27) | trackingName: informacoes_evento; data-track-action: abrir_link_evento; data-track-action: voltar |
| [src/components/eventGroupCollaboratorsModal/index.tsx](../src/components/eventGroupCollaboratorsModal/index.tsx#L26) | trackingName: colaboradores_grupo_evento; trackingName: lista_dialog_evento; data-track-action: voltar |
| [src/components/eventGroupDistributionModal/index.tsx](../src/components/eventGroupDistributionModal/index.tsx#L23) | trackingName: definir_quantidade_equipes_evento; trackingAction: grupo; data-track-action: cancelar; data-track-action: continuar |
| [src/components/eventGroupScheduleModal/index.tsx](../src/components/eventGroupScheduleModal/index.tsx#L18) | data-track-submit: continuar; data-track-action: voltar; data-track-action: continuar |
| [src/components/eventGroupsModal/index.tsx](../src/components/eventGroupsModal/index.tsx#L126) | data-track-action: mover_colaborador; trackingAction: grupo; data-track-action: distribuir_aleatoriamente; data-track-action: remover_grupo; data-track-action: adicionar_grupo; data-track-action: reiniciar; data-track-action: voltar; data-track-action: continuar |
| [src/components/eventGroupsSummary/index.tsx](../src/components/eventGroupsSummary/index.tsx#L26) | data-track-action: ver_colaboradores |
| [src/components/eventInformationModal/index.tsx](../src/components/eventInformationModal/index.tsx#L27) | data-track-submit: continuar; trackingAction: nr; data-track-action: cancelar; data-track-action: continuar |
| [src/components/eventOptionsModal/index.tsx](../src/components/eventOptionsModal/index.tsx#L20) | trackingName: acoes_evento |
| [src/components/eventParticipantsModal/index.tsx](../src/components/eventParticipantsModal/index.tsx#L54) | trackingAction: selecionar_opcao; trackingAction: unidade; trackingAction: cargo; trackingAction: modalidade; data-track-showcase: lista_dialog_evento; data-track-action: voltar; data-track-action: continuar |
| [src/components/eventReviewModal/index.tsx](../src/components/eventReviewModal/index.tsx#L32) | data-track-action: abrir_link_evento; data-track-action: voltar; data-track-action: editing ? salvar_alteracoes : criar_evento |
| [src/components/eventSettingsModal/index.tsx](../src/components/eventSettingsModal/index.tsx#L16) | data-track-submit: continuar; trackingAction: forma_conclusao; trackingAction: evidencia; data-track-action: voltar; data-track-action: continuar |
| [src/components/eventTimePicker/index.tsx](../src/components/eventTimePicker/index.tsx#L22) | trackingAction: label === 'Entrada' ? horario_entrada : label === 'Saída' ? horario_saida : selecionar_horario |
| [src/components/formCard/index.tsx](../src/components/formCard/index.tsx#L22) | data-track-item: acoes |
| [src/components/formDatePicker/index.tsx](../src/components/formDatePicker/index.tsx#L217) | data-track-action: calendario; data-track-action: mes_anterior; data-track-action: proximo_mes; data-track-action: selecionar_data; data-track-action: hoje |
| [src/components/formQuestionCard/index.tsx](../src/components/formQuestionCard/index.tsx#L72) | data-track-action: reordenar_pergunta; data-track-action: duplicar_pergunta; data-track-action: excluir_pergunta; trackingAction: unidade; data-track-action: excluir_opcao; data-track-action: adicionar_opcao; data-track-action: adicionar_resposta_livre; trackingAction: limite_arquivos; trackingAction: limite_tamanho |
| [src/components/helpLink/index.tsx](../src/components/helpLink/index.tsx#L4) | data-track-action: ajuda |
| [src/components/importConformityModal/index.tsx](../src/components/importConformityModal/index.tsx#L61) | trackingName: adicionar_conformidades; data-track-submit: adicionar; data-track-action: adicionar_manualmente; data-track-action: como_importar_planilha; data-track-action: cancelar; data-track-action: adicionar |
| [src/components/inviteManagerDialog/index.tsx](../src/components/inviteManagerDialog/index.tsx#L61) | trackingName: convidar_gestor; data-track-submit: convidar; data-track-action: tentar_novamente; trackingAction: colaborador; trackingAction: status; data-track-action: cancelar; data-track-action: convidar |
| [src/components/loginForm/index.tsx](../src/components/loginForm/index.tsx#L28) | data-track-submit: enviar; data-track-action: esqueceu_senha; data-track-action: enviar; data-track-action: criar_workspace |
| [src/components/managerDetailsModal/index.tsx](../src/components/managerDetailsModal/index.tsx#L23) | trackingName: mode === 'edit' ? editar_gestor : informacoes_gestor; data-track-action: tentar_novamente; data-track-action: voltar |
| [src/components/optionsPopup/index.tsx](../src/components/optionsPopup/index.tsx#L54) | data-track-dialog: trackingName; data-track-action: item.trackingAction |
| [src/components/passwordConfirmationForm/index.tsx](../src/components/passwordConfirmationForm/index.tsx#L18) | data-track-submit: confirmationAction(confirmLabel); data-track-action: cancelar; data-track-action: confirmationAction(confirmLabel) |
| [src/components/passwordConfirmationModal/index.tsx](../src/components/passwordConfirmationModal/index.tsx#L21) | trackingName: confirmar_senha |
| [src/components/passwordField/index.tsx](../src/components/passwordField/index.tsx#L42) | data-track-action: visible ? ocultar_senha : mostrar_senha |
| [src/components/paymentMethodForm/index.tsx](../src/components/paymentMethodForm/index.tsx#L53) | data-track-action: pagar_cartao; data-track-action: pagar_pix; data-track-action: ajuda |
| [src/components/paymentSummary/index.tsx](../src/components/paymentSummary/index.tsx#L46) | data-track-action: settingsMode ? salvar_alteracoes : finalizar_compra; data-track-action: chave |
| [src/components/positionDialog/index.tsx](../src/components/positionDialog/index.tsx#L63) | trackingName: position ? editar_cargo : adicionar_cargo; data-track-submit: position ? salvar : adicionar; trackingAction: cargo; data-track-action: cancelar; data-track-action: position ? salvar : adicionar |
| [src/components/quickActionCard/index.tsx](../src/components/quickActionCard/index.tsx#L21) | data-track-action: ( 'add-collaborator': adicionar_colaborador, 'add-form': adicionar_forms, 'add-event': adicionar_evento  as Record<string, string>)[action.id] |
| [src/components/regulatoryStandardRecommendationModal/index.tsx](../src/components/regulatoryStandardRecommendationModal/index.tsx#L12) | trackingName: informacoes_nr |
| [src/components/regulatoryStandardsDialog/index.tsx](../src/components/regulatoryStandardsDialog/index.tsx#L41) | trackingName: contextLabel ? nrs_unidade : nrs_cargo; data-track-action: editar_nrs; data-track-action: tentar_novamente; trackingName: contextLabel ? lista_dialog_unidade : lista_dialog_cargo; data-track-action: voltar |
| [src/components/replaceAccountFlowModal/index.tsx](../src/components/replaceAccountFlowModal/index.tsx#L48) | trackingName: ( selection: selecionar_gestor_workspace, confirmation: confirmar_substituicao_gestor, password: confirmar_senha )[step]; data-track-action: cancelar; data-track-action: substituir |
| [src/components/settingsTabs/index.tsx](../src/components/settingsTabs/index.tsx#L13) | data-track-action: workspace; data-track-action: conta |
| [src/components/spreadsheetDropzone/index.tsx](../src/components/spreadsheetDropzone/index.tsx#L73) | data-track-action: remover_arquivo; data-track-action: file ? substituir : anexar_arquivo |
| [src/components/spreadsheetEmailMissingModal/index.tsx](../src/components/spreadsheetEmailMissingModal/index.tsx#L7) | trackingName: email_ausente_planilha; data-track-action: entendi |
| [src/components/spreadsheetExplanationModal/index.tsx](../src/components/spreadsheetExplanationModal/index.tsx#L47) | data-track-dialog: instrucoes_importacao_conformidades; data-track-action: modelo; data-track-action: entendi |
| [src/components/statusScreenLayout/index.tsx](../src/components/statusScreenLayout/index.tsx#L25) | tela exibida; data-track-action: voltar_inicio; data-track-action: ajuda |
| [src/components/summaryStatCard/index.tsx](../src/components/summaryStatCard/index.tsx#L21) | data-track-action: stat.path === '/mainUnitScreen' ? unidade : colaboradores |
| [src/components/toggleSwitch/index.tsx](../src/components/toggleSwitch/index.tsx#L14) | data-track-action: status |
| [src/components/toolbarSearch/index.tsx](../src/components/toolbarSearch/index.tsx#L23) | data-track-action: limpar_busca |
| [src/components/toolbarSelect/index.tsx](../src/components/toolbarSelect/index.tsx#L193) | data-track-action: trackingAction |
| [src/components/workspaceCodeForm/index.tsx](../src/components/workspaceCodeForm/index.tsx#L73) | data-track-submit: validar_codigo; data-track-action: validar_codigo; data-track-action: login |
| [src/components/workspaceCodeSentModal/index.tsx](../src/components/workspaceCodeSentModal/index.tsx#L21) | trackingName: codigo_enviado; data-track-action: reenviar_codigo; data-track-action: continuar |
| [src/components/workspaceSettingsBackButton/index.tsx](../src/components/workspaceSettingsBackButton/index.tsx#L20) | data-track-action: voltar; trackingName: descartar_alteracoes_configuracoes |
| [src/components/workspaceSettingsSaveModal/index.tsx](../src/components/workspaceSettingsSaveModal/index.tsx#L24) | trackingName: ( company: confirmar_alteracoes_dados_empresa, spreadsheet: confirmar_adicao_colaboradores, addresses: confirmar_alteracoes_endereco, payments: confirmar_alteracoes_pagamento )[section] |
| [src/pages/accessKeyVerified/index.tsx](../src/pages/accessKeyVerified/index.tsx#L12) | tela exibida; data-track-action: comecar |
| [src/pages/attachExcelFile/index.tsx](../src/pages/attachExcelFile/index.tsx#L22) | tela exibida |
| [src/pages/createForm/index.tsx](../src/pages/createForm/index.tsx#L147) | data-track-action: acoes; tela exibida; data-track-submit: criar_forms; trackingAction: gestor; trackingAction: nr; trackingAction: unidade; data-track-action: adicionar_pergunta; data-track-action: criar_forms; trackingName: acoes_formulario; trackingName: descartar_alteracoes_formulario |
| [src/pages/createPassword/index.tsx](../src/pages/createPassword/index.tsx#L11) | tela exibida |
| [src/pages/createWorkspace/index.tsx](../src/pages/createWorkspace/index.tsx#L24) | tela exibida |
| [src/pages/editForm/index.tsx](../src/pages/editForm/index.tsx#L196) | data-track-action: acoes; tela exibida; data-track-submit: salvar_alteracoes; trackingAction: gestor; trackingAction: nr; trackingAction: unidade; data-track-action: adicionar_pergunta; data-track-action: salvar_alteracoes; trackingName: acoes_formulario; trackingName: descartar_alteracoes_formulario; trackingName: confirmar_alteracoes_formulario |
| [src/pages/includeCompanyInformation/index.tsx](../src/pages/includeCompanyInformation/index.tsx#L17) | tela exibida |
| [src/pages/login/index.tsx](../src/pages/login/index.tsx#L23) | tela exibida |
| [src/pages/mainAccountScreen/index.tsx](../src/pages/mainAccountScreen/index.tsx#L55) | data-track-action: voltar; tela exibida; data-track-action: ver_tudo; data-track-action: editar; data-track-action: substituir; data-track-action: enviar_email; data-track-action: sair; trackingName: confirmar_logout |
| [src/pages/mainConformityScreen/index.tsx](../src/pages/mainConformityScreen/index.tsx#L130) | data-track-item: acoes; tela exibida; data-track-action: adicionar; data-track-action: filtro; trackingName: lista_conformidades; trackingName: acoes_conformidade; trackingName: confirmar_alteracoes_conformidade; trackingName: confirmar_conformidade_nao_aplicavel |
| [src/pages/mainDashboardsScreen/index.tsx](../src/pages/mainDashboardsScreen/index.tsx#L11) | data-track-action: voltar; tela exibida |
| [src/pages/mainEmployeerScreen/index.tsx](../src/pages/mainEmployeerScreen/index.tsx#L125) | data-track-item: acoes; tela exibida; data-track-action: adicionar; trackingAction: cargo; trackingAction: status; data-track-action: tentar_novamente; trackingName: lista_colaboradores; trackingName: acoes_colaborador; trackingName: confirmar_alteracoes_colaborador; trackingName: confirmar_inativacao_colaborador |
| [src/pages/mainEventScreen/index.tsx](../src/pages/mainEventScreen/index.tsx#L162) | tela exibida; data-track-action: criar_evento; trackingAction: calendario; trackingName: confirmar_inativacao_evento |
| [src/pages/mainFormScreen/index.tsx](../src/pages/mainFormScreen/index.tsx#L114) | tela exibida; data-track-action: criar_forms; trackingAction: status; data-track-showcase: lista_formularios; data-track-action: pagina_anterior; data-track-action: proxima_pagina; trackingName: acoes_formulario; trackingName: confirmar_exclusao_formulario |
| [src/pages/mainHomeScreen/index.tsx](../src/pages/mainHomeScreen/index.tsx#L18) | tela exibida; data-track-action: tentar_novamente |
| [src/pages/mainManagerScreen/index.tsx](../src/pages/mainManagerScreen/index.tsx#L123) | data-track-item: acoes; tela exibida; data-track-action: adicionar; trackingAction: unidade; trackingAction: status; data-track-action: tentar_novamente; trackingName: lista_gestores; trackingName: acoes_gestor; trackingName: confirmar_alteracoes_gestor; trackingName: confirmar_inativacao_gestor |
| [src/pages/mainPositionScreen/index.tsx](../src/pages/mainPositionScreen/index.tsx#L183) | data-track-item: acoes; tela exibida; data-track-action: adicionar; trackingAction: status; data-track-action: tentar_novamente; trackingName: lista_cargos; trackingName: acoes_cargo; trackingName: confirmar_alteracoes_cargo; trackingName: confirmar_alteracoes_nrs_cargo; trackingName: confirmar_inativacao_cargo |
| [src/pages/mainUnitScreen/index.tsx](../src/pages/mainUnitScreen/index.tsx#L83) | data-track-item: acoes; tela exibida; trackingAction: status; data-track-action: tentar_novamente; trackingName: lista_unidades; trackingName: acoes_unidade; trackingName: confirmar_alteracoes_nrs_unidade; trackingName: confirmar_inativacao_unidade |
| [src/pages/mainWorkspaceSettingsScreen/index.tsx](../src/pages/mainWorkspaceSettingsScreen/index.tsx#L45) | data-track-action: voltar; tela exibida; data-track-action: ( company: editar_dados, spreadsheet: anexar_arquivo, addresses: editar_endereco, payments: editar_pagamento )[item.id] |
| [src/pages/notFound/index.tsx](../src/pages/notFound/index.tsx#L9) | tela exibida; data-track-action: voltar_inicio |
| [src/pages/paymentMethod/index.tsx](../src/pages/paymentMethod/index.tsx#L52) | tela exibida; data-track-action: voltar |
| [src/pages/registerWorkspaceLoading/index.tsx](../src/pages/registerWorkspaceLoading/index.tsx#L20) | tela exibida; data-track-action: login; data-track-action: tentar_novamente; data-track-action: e_mail_do_gestor; data-track-action: senha; data-track-action: dados_da_empresa; data-track-action: planilha; data-track-action: unidades_e_enderecos |
| [src/pages/setAddress/index.tsx](../src/pages/setAddress/index.tsx#L25) | tela exibida |
| [src/pages/workspaceCreated/index.tsx](../src/pages/workspaceCreated/index.tsx#L16) | tela exibida; data-track-action: login.canSignIn ? (login.error ? tentar_novamente : continuar) : login |
| [src/routes/index.tsx](../src/routes/index.tsx#L184) | data-track-route: renderedLocation.pathname; data-track-search: renderedLocation.search; data-track-visit: renderedLocation.key |

## Conferência realizada

O schema publicado da API foi consultado em 14/10/2026. O container público contém os seis acionadores e o destino correto. /health/db confirmou banco conectado nessa consulta. Testes automatizados cobrem navegação, StrictMode, submit/Enter, janelas reabertas e por etapa, menus em portal, showcases na viewport, UID/logout, campos proibidos e controles desativados. A navegação no Chrome foi verificada com a configuração Firebase local: o clique em Ver dashboards gerou button_click (home/home/dashboard) e a gravação foi confirmada por consulta ao banco da API.
