# Perfil da conta — SCRUM-567

A rota `/mainAccountScreen`, compartilhada por `GESTOR` e `GESTOR_WORKSPACE`, consulta `GET /user/me` com o ID token do usuário Firebase no cabeçalho `Authorization: Bearer`. A chamada fica em `src/services/account.ts`; o hook `useAccountProfile` controla carregamento, erro, nova tentativa e cancelamento ao sair. Não há persistência do perfil ou da URL temporária da foto no armazenamento do navegador.

O cartão inicial mostra nome, e-mail e foto. A foto vem de `profilePhotoUrl`; ausência ou falha no carregamento mostra as iniciais do próprio usuário. A confirmação de identidade por senha continua antes de “Ver tudo”. Depois dela, o modal apresenta nome, CPF, e-mail, unidade, cargo e modalidade. O CPF permanece vazio porque o contrato atual não o retorna; e-mail ausente, nulo ou vazio também fica vazio. Dados profissionais ausentes são indicados como não informados. A senha não é exibida. As NRs retornadas pela API não fazem parte desta tela.

A foto pode ser trocada pelo ícone de lápis no cartão inicial e no modal de detalhes. Selecionar um JPEG, PNG ou WebP não vazio, de até 5 MB, envia `PUT /user/me/profile-photo` com o arquivo original no campo `file` do multipart e token Firebase. O navegador define o Content-Type e o boundary. O serviço aceita o sucesso `204` sem tentar ler JSON e limita o envio a 60 segundos.

A imagem atual é mantida durante a operação; a interface bloqueia envios duplicados e mostra carregamento, sucesso ou erro. Após o upload confirmado, uma nova consulta a `/user/me` atualiza o perfil compartilhado pelo cartão e pelo modal, sem alterar a URL temporária assinada. Se somente essa consulta falhar, a interface informa que a foto já foi salva e oferece “Atualizar foto”, que repete apenas o GET. O envio e a consulta são cancelados ao sair ou trocar de sessão; cancelar no navegador não desfaz uma gravação já recebida pelo servidor.

A edição dos demais dados permanece pendente: o botão está desativado e há uma explicação visível, sem salvamento fictício no estado local. Esta etapa não altera dados administrativos e preserva o fluxo existente de transferência do gestor.

O conteúdo da conta é remontado quando o UID muda, fechando os modais da sessão anterior. Consultas canceladas e resultados recebidos após a troca de usuário são descartados.

## Verificação

`tests/account.test.cjs` cobre autenticação da consulta e do upload, multipart e retorno 204, validação de formato/tamanho, mapeamento, respostas incompletas, erros HTTP e de rede, cancelamento, mudança de sessão, os dois tipos de gestor, nova tentativa, atualização compartilhada da foto, repetição somente do GET após upload confirmado, campos de CPF/e-mail vazios e ausência de senha no modal. A confirmação de identidade mantém a cobertura de `tests/identityConfirmation.test.cjs`. Os testes de upload usam respostas simuladas e não substituem a foto de uma conta real.

Critérios DAD aplicáveis: M04 (contratos TypeScript), M05 (chamadas no serviço), M06–M07 (estado e efeitos com limpeza), M11 (labels, alt e erro acessível), M12 (carregamento, sucesso e erro), E03 (hook com cancelamento) e E08 (validação do arquivo em `src/utils/account.ts`). Publicação, histórico e auditoria completa de acessibilidade são verificações de projeto, fora desta alteração.
