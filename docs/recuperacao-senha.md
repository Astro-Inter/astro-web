# Recuperação de senha — SCRUM-592

## Fluxo e rotas

- `/forgotPassword`: informar o e-mail; acesso pelo link **Esqueceu a senha?** do login.
- `/passwordRecoverySent`: confirmação de envio de um link e botão **Continuar** para retornar ao login. A pessoa deve clicar no botão do e-mail para abrir a troca de senha.
- `/replacePassword`: nova senha e confirmação, sem token ou código no protótipo.
- `/passwordChanged`: confirmação da troca e botão **Ir para o login**.

O fluxo é mockado. Não envia e-mails, não consulta a API e não altera senhas no Firebase. A integração real permanece pendente, incluindo emissão e validação de tokens seguros, expiração e envio do botão no e-mail.

## Dados de teste

- E-mails cadastrados: `gestor@astro.com` e `workspace@astro.com`.
- Todas as quatro rotas abrem diretamente pela URL, sem parâmetros, estado de navegação ou etapas anteriores. É possível repetir a troca mockada para validar o front.
- Ao abrir a confirmação de envio diretamente, o exemplo usa `gestor@astro.com`; vindo do formulário, mostra o e-mail informado.
- Outros e-mails válidos mostram a mensagem de conta não cadastrada.
- A senha segue as regras do cadastro: 8 a 128 caracteres, ao menos uma letra maiúscula, uma minúscula e um número; a confirmação deve corresponder.

O e-mail solicitado é mantido somente na memória da aba para exibir a confirmação. Nenhuma senha é persistida.

## Interface e ilustrações

Os formulários usam as mesmas classes de layout de `/createPassword` e `/includeCompanyInformation`: `create-password-page`, `create-password-header` e `login-card create-password-card astro-scale-90`, sem regras próprias de posição, tamanho ou espaçamento. O logo fica no topo, independente do bloco de conteúdo centralizado vertical e horizontalmente. Na criação do workspace, o mesmo cabeçalho fica no topo do painel de formulário. A recuperação acrescenta o botão de voltar padrão e troca o conteúdo do formulário.

Ilustrações geradas pelo gerador integrado, em PNG transparente:

- `public/passwordRecoverySent.png`: planeta violeta com crateras discretas, órbita lavanda, envelope com confirmação e pequenas estrelas. Arte 2D, paleta `#33205f`, `#6d35c9` e `#a878ff`, sem texto ou logotipo.
- `public/passwordChanged.png`: mesma composição e paleta, com cadeado fechado e selo de confirmação no centro, sem texto ou logotipo.

## Verificação

`tests/passwordRecovery.test.cjs` cobre validação, conta inexistente, cancelamento, acesso direto a cada rota sem pré-condições e retorno ao login pelo botão **Continuar**, além do fluxo de troca de senha.
