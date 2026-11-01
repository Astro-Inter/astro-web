# Recuperação de senha

O frontend usa o Worker configurado em VITE_PASSWORD_RESET_API_URL para solicitar e concluir a redefinição. A URL do serviço é pública; credenciais SMTP e Firebase ficam somente no Worker.

## Contratos e interface

- /forgotPassword envia POST /auth/forgot-password com {email}. A confirmação usa mensagem genérica para contas existentes, inexistentes ou desabilitadas.
- /replacePassword?mode=resetPassword&oobCode=CODIGO captura um código não vazio em memória e limpa a query. Link ausente ou malformado bloqueia o formulário e oferece outro link; o Firebase valida a validade do código na confirmação.
- A senha exige 8–128 caracteres, maiúscula, minúscula, número e confirmação igual. POST /auth/reset-password recebe somente {oobCode,newPassword}. Somente HTTP 200 com success:true abre /passwordChanged.
- INVALID_EMAIL indica erro no e-mail; INVALID_PASSWORD, na senha. Código inválido ou expirado permite solicitar outro link. Erro de rede ou 503 mantém o formulário para nova tentativa.
- HTTP 429 inicia espera compartilhada entre endpoints. Retry-After aceita segundos ou data HTTP; sem valor válido, a espera é de um minuto. O botão exibe o tempo restante e o serviço bloqueia reenvios durante a espera.

As chamadas enviam Content-Type: application/json, sem Authorization ou cookies. O código não é gravado em logs ou armazenamento persistente. O GTM fica desabilitado na sessão iniciada pela rota de redefinição. Recarregar depois de limpar a query exige abrir novamente o link recebido.

## Desenvolvimento local

Execute npm run dev. Em desenvolvimento, o frontend chama /password-reset-api; o proxy Vite encaminha a chamada a VITE_PASSWORD_RESET_API_URL. Em produção, o navegador chama o Worker diretamente, sujeito ao CORS do serviço.

Para usar um Worker local, configure VITE_PASSWORD_RESET_API_URL=http://127.0.0.1:8787 e execute o serviço com .dev.vars. A origem de publicação precisa constar em ALLOWED_ORIGINS no Worker.

O link enviado por e-mail aponta para /replacePassword no site publicado. Em testes locais, use a origem local com o mesmo caminho e parâmetros. Não compartilhe códigos em chats ou logs.

Os testes do fluxo cobrem contratos, validação, cancelamento, limpeza da query, navegação por sucesso, erros e espera de 429. Não há reenvio automático de solicitação ambígua.
