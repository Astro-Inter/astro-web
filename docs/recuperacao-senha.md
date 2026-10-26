# Recuperação de senha

O protótipo da SCRUM-592 foi substituído pela integração real com o Worker. Consulte [Recuperação de senha — SCRUM-643](recuperacao-de-senha.md) para configuração, contratos, segurança e roteiro de testes.

O fluxo usa `/forgotPassword`, `/passwordRecoverySent`, `/replacePassword` e `/passwordChanged`. Não existem contas ou alterações de senha simuladas na interface. As ilustrações ficam em `public/passwordRecoverySent.png` e `public/passwordChanged.png`.
