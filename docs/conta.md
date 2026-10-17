# Perfil da conta — SCRUM-567

A rota `/mainAccountScreen`, compartilhada por `GESTOR` e `GESTOR_WORKSPACE`, consulta `GET /user/me` com o ID token do usuário Firebase no cabeçalho `Authorization: Bearer`. A chamada fica em `src/services/account.ts`; o hook `useAccountProfile` controla carregamento, erro, nova tentativa e cancelamento ao sair. Não há persistência do perfil ou da URL temporária da foto no armazenamento do navegador.

O cartão inicial mostra nome, e-mail e foto. A foto vem de `profilePhotoUrl`; ausência ou falha no carregamento mostra as iniciais do próprio usuário. A confirmação de identidade por senha continua antes de “Ver tudo”. Depois dela, o modal apresenta nome, CPF, e-mail, unidade, cargo e modalidade. O CPF permanece vazio porque o contrato atual não o retorna; e-mail ausente, nulo ou vazio também fica vazio. Dados profissionais ausentes são indicados como não informados. A senha não é exibida. As NRs retornadas pela API não fazem parte desta tela.

A edição permanece pendente: o botão está desativado e há uma explicação visível, sem salvamento fictício no estado local. Esta etapa não envia `PUT /user/me/profile-photo`, não altera dados administrativos e preserva o fluxo existente de transferência do gestor.

O conteúdo da conta é remontado quando o UID muda, fechando os modais da sessão anterior. Consultas canceladas e resultados recebidos após a troca de usuário são descartados.

## Verificação

`tests/account.test.cjs` cobre autenticação da consulta, mapeamento, respostas incompletas, erros HTTP e de rede, cancelamento, mudança de sessão, os dois tipos de gestor, nova tentativa, foto indisponível, campos de CPF/e-mail vazios e ausência de senha no modal. A confirmação de identidade mantém a cobertura de `tests/identityConfirmation.test.cjs`.

Critérios DAD aplicáveis: M04 (contratos TypeScript), M05 (chamada no serviço), M06–M07 (estado e efeitos com limpeza), M11 (labels, alt e erro acessível), M12 (carregamento, sucesso e erro) e E03 (hook com cancelamento). Publicação, histórico e auditoria completa de acessibilidade são verificações de projeto, fora desta alteração.
