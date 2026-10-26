# Recuperação de senha — SCRUM-643

O Web usa `https://astro-password-reset.app-4str0.workers.dev`. Configure `VITE_PASSWORD_RESET_API_URL` no `.env` (veja `.env.example`) e reinicie o Vite. A URL é pública; as credenciais SMTP e Firebase do serviço ficam somente no Worker. O serviço gera códigos no Firebase e envia o e-mail Astro por SMTP.

Os workflows CI e Pages injetam e exigem a variável `VITE_PASSWORD_RESET_API_URL`. A variável do repositório foi conferida e já contém a URL de produção.

## Contratos e interface

- `/forgotPassword` envia `POST /auth/forgot-password` com `{email}`. A confirmação exibe `message` do serviço, genérica para contas existentes, inexistentes ou desabilitadas.
- `/replacePassword?mode=resetPassword&oobCode=CODIGO` captura um único código não vazio em memória e limpa a query antes do analytics. Link ausente ou malformado bloqueia o formulário e oferece outro link. Ter um código não garante validade: o Firebase valida na confirmação.
- A senha exige 8–128 caracteres, maiúscula, minúscula, número e confirmação igual. `POST /auth/reset-password` recebe apenas `{oobCode,newPassword}`. Somente HTTP 200 com `success:true` abre `/passwordChanged`.
- `INVALID_EMAIL` indica erro no e-mail; `INVALID_PASSWORD`, na senha. Código inválido ou expirado oferece novo link. Falha de rede ou 503 mantém o formulário para tentar novamente.
- HTTP 429 inicia espera compartilhada entre os endpoints. `Retry-After` aceita segundos ou data HTTP; sem valor válido, aguarda um minuto. O botão mostra o tempo restante e o serviço bloqueia reenvios durante a espera.

As chamadas enviam apenas `Content-Type: application/json`, sem Authorization ou cookies. O código não é gravado em logs nem armazenamento persistente. O GTM permanece desabilitado na sessão iniciada pela rota de redefinição. Recarregar depois de limpar a query exige reabrir o link recebido.

## Desenvolvimento local

Execute `npm run dev`. Em desenvolvimento, o serviço chama `/password-reset-api`; o proxy exclusivo do Vite encaminha ao destino configurado em `VITE_PASSWORD_RESET_API_URL`, sem encaminhar a origem local. Isso permite testar com o Worker de produção, que rejeita chamadas diretas de localhost. No build de produção, o navegador chama o Worker diretamente, sujeito ao CORS do serviço.

Para usar o Worker local, configure `VITE_PASSWORD_RESET_API_URL=http://127.0.0.1:8787` e execute `npm run dev` no serviço com `.dev.vars` preenchido. A API de produção permite `https://astro-inter.github.io`; outro domínio de publicação precisa ser cadastrado em `ALLOWED_ORIGINS` no serviço.

O e-mail real aponta para `https://astro-inter.github.io/astro-web/replacePassword`. Para testar localmente, substitua somente a origem e o prefixo `/astro-web` pelo endereço local, preservando `/replacePassword` e os parâmetros. Não compartilhe códigos em chats ou logs. Digite e confirme a nova senha diretamente no navegador.

## Verificação

O Worker tem orçamento total de 30 segundos para OAuth, Firebase e aceitação SMTP; o Web aguarda 35 segundos. O diagnóstico real reproduziu o cancelamento do limite anterior de oito segundos durante DATA. Com 30 segundos, o SMTP aceitou o e-mail autorizado em aproximadamente 10,7 segundos no workerd local. Não há reenvio automático: em falhas ambíguas, conferir a caixa de entrada antes de repetir a solicitação.

Os testes de recuperação cobrem contratos, validação, cancelamento, navegação após HTTP 200/success, limpeza da query, ausência de código, erros, mensagem do serviço e espera de 429. O proxy permite verificar respostas reais de validação sem enviar e-mails ou alterar contas.

A validação completa exige uma conta de teste: solicitar e receber o e-mail, abrir o link, trocar a senha e fazer login. Conferir também link sem código, código inválido e reutilização após a troca. Essa validação manual antecede a PR. As entradas estáticas e o fallback do Pages devem ser conferidos após publicação.

Critérios DAD desta demanda: M01–M07, M10 e M12 preservados na estrutura TypeScript, componentes, serviço e hook; E07/E08 atendidos por interpolação JSX e validação antes do envio. M11 tem labels, alertas e estados de botão, mas não houve auditoria completa de contraste ou leitor de tela. M13 aguarda publicação desta alteração; M14 e extras globais não foram auditados.
