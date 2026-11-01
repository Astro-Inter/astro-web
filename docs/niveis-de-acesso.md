# Níveis de acesso

O frontend distingue os perfis GESTOR_WORKSPACE e GESTOR. A autorização de endpoints, os dados retornados e o escopo do workspace continuam sendo validados pelo backend.

## Matriz de acesso

| Área ou ação | GESTOR_WORKSPACE | GESTOR |
| --- | --- | --- |
| Home e dashboards | Disponível | Disponível |
| Colaboradores, conformidades, unidades, cargos, formulários e eventos | Disponível | Disponível |
| Gestão de gestores | Disponível | Oculta e rota bloqueada |
| Aba Workspace em Configurações | Gestão e acessibilidade | Somente acessibilidade |
| Empresa, planilha, endereços e pagamentos com context=settings | Disponível | Rotas bloqueadas |
| Informações e edição da própria conta | Disponível | Disponível |
| Transferência de responsável | Substituir | Enviar e-mail |

Ambos os perfis podem sair da conta. O cadastro público do workspace é separado da aba de configurações.

## Origem e validação do perfil

src/services/authentication.ts consulta POST /verify-email com {email} antes da autenticação Firebase. Exige HTTP 200, success:true e data.userType igual a GESTOR ou GESTOR_WORKSPACE. O perfil é associado a user.accountType somente após o Firebase confirmar a sessão. A escolha de perfil não vem de localStorage ou de parâmetro de URL.

Ao restaurar uma sessão Firebase, a API é consultada novamente. Enquanto a verificação está pendente, o provider mantém estado de carregamento e não libera o usuário anterior. Falha, conta inexistente ou perfil não permitido não libera rotas privadas. Logout, troca de usuário e desmontagem cancelam consultas e descartam respostas tardias.

src/utils/accessControl.ts concentra as regras usadas pelo menu e por PrivateRoute. Rotas exclusivas redirecionam GESTOR para Home antes de montar a página restrita. As rotas de configuração também verificam o perfil antes de montar seus fluxos.

userStatus precisa ser ATIVO para liberar o painel. Contas DESATIVADO, INATIVO ou INATIVADO são direcionadas à tela de usuário inativado; o erro Firebase auth/user-disabled segue o mesmo fluxo. O retorno ao login encerra a sessão antes de abrir o formulário.

Durante autenticação ou restauração, a interface mantém carregamento sem exibir conteúdo privado. Após sucesso, /loadingScreen mostra a transição para Home. O carregamento interno das páginas usa os estados próprios de cada operação.

A confirmação de perfil no frontend não concede permissões na API. Cada endpoint deve validar token, perfil e acesso ao recurso no servidor.
