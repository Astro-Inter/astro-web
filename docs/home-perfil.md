# Perfil na Home

A Home exibe a foto da própria conta no lugar da central de notificações. O avatar abre Minha conta e usa profilePhotoUrl de GET /home/workspace, junto com o nome e os indicadores. A página não consulta separadamente GET /user/me/account-summary.

Durante a consulta, o avatar apresenta skeleton. Sem foto, em falha da consulta ou de carregamento da imagem, mostra as iniciais do nome; se o nome também estiver indisponível, usa o ícone de conta. O acesso à conta permanece disponível.

A central de notificações não faz parte da Home. Avisos de sucesso e erro das operações usam os componentes de feedback da interface.

## Contrato da API

A resposta de GET /home/workspace inclui profilePhotoUrl opcional. Sem foto ou se a consulta auxiliar estiver indisponível, a API retorna null sem impedir os indicadores. O resumo de conta continua sendo usado pela página Minha conta.

O serviço do frontend normaliza campos ausentes, null ou URLs inválidas para null. Aceita somente HTTP e HTTPS sem credenciais e preserva a URL assinada original.

A API pode retornar indicadores em camelCase ou no formato legado nome_usuario/estatisticas. src/services/home.ts valida ambos e normaliza a resposta para o modelo da Home; respostas incompletas são recusadas.

HomeProfileLink recebe props tipadas e apresenta o avatar. A consulta permanece em services/home.ts e no hook useWorkspaceHome; a página não usa o hook de conta.
