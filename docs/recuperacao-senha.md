# Recuperação de senha

O fluxo de recuperação e troca de senha está descrito em [recuperacao-de-senha.md](recuperacao-de-senha.md), incluindo rotas, contrato com o Worker e configuração local.

As rotas da interface são /forgotPassword, /passwordRecoverySent, /replacePassword e /passwordChanged. A senha é redefinida pelo serviço Worker; a interface não simula contas nem alterações de senha.
