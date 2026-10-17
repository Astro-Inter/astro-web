# Níveis de acesso — SCRUM-565

Referência: página **✅ - Web V2** do [Figma Astro](https://www.figma.com/design/qdCrRXAVuiNhNkBuim95zz/Astro-2%C2%B0-ano?node-id=2585-6917). Foram comparados todos os frames equivalentes dos blocos `workspaceManager` (`2585:9066`) e `managers` (`2585:6918`), incluindo os textos das ações e os menus das telas principais.

## Matriz aplicada

| Área ou ação | GESTOR_WORKSPACE | GESTOR |
| --- | --- | --- |
| Home e dashboards | Disponível | Disponível |
| Colaboradores, conformidade, unidades, cargos, formulários e eventos | Disponível | Disponível |
| Gestão de gestores | Disponível | Oculta e rota bloqueada |
| Item inferior do menu | Configurações | Conta |
| Configurações do workspace | Disponível | Oculta e rota bloqueada |
| Empresa, planilha, endereços e pagamentos em `?context=settings` | Disponível | Rotas bloqueadas |
| Informações e edição da própria conta | Disponível | Disponível |
| Abas Workspace e Conta | Visíveis | Ocultas |
| Transferência do responsável | Substituir | Enviar email |

As homes `2585:8996` e `2585:11514` confirmam que ações rápidas e indicadores são compartilhados. As contas `2585:7124` e `2585:9365` mostram a diferença nas abas e na transferência; a configuração do workspace é o frame `2585:9431`, exclusivo de `workspaceManager`. Diferenças pontuais de redação nos formulários não foram tratadas como restrições de acesso.

O botão de sair da conta foi mantido para ambos os perfis, para permitir encerrar a sessão também como GESTOR. O título da página de conta permanece acessível a leitores de tela e fica visualmente oculto no perfil GESTOR, que não tem o cabeçalho de configurações no Figma.

## Origem do perfil e proteção das telas

`src/services/authentication.ts` consulta `POST /verify-email`, enviando somente `{ email }`, antes de autenticar no Firebase. Exige HTTP 200, `success: true` e `data.userType` igual a `GESTOR` ou `GESTOR_WORKSPACE`. A resposta é aproveitada pelo observador durante o login e publicada como `user.accountType` somente após o Firebase confirmar a sessão. Não há perfil salvo em localStorage nem escolha por `?role=`.

Ao restaurar uma sessão Firebase, a API é consultada novamente. O provider mantém o estado de carregamento e remove o usuário anterior enquanto essa consulta está pendente. Falhas, contas inexistentes e perfis não permitidos não liberam telas privadas. Logout, troca de usuário e desmontagem cancelam a consulta e descartam respostas antigas.

Se a confirmação da sessão falhar, o aviso apresenta a marca Astro, título, motivo e duas ações. **Tentar novamente** reinicia a observação e consulta o perfil sem recarregar a página. **Voltar ao login** encerra a sessão Firebase antes de navegar ao formulário; os botões ficam bloqueados durante essa saída e possíveis erros são exibidos no aviso. O título recebe foco ao abrir, e as ações mantêm foco visível pelo teclado. O conteúdo se adapta ao celular.

`src/utils/accessControl.ts` centraliza as permissões usadas pelo menu e pelo `PrivateRoute`. Tentativas de abrir diretamente uma rota exclusiva redirecionam o GESTOR para a Home, sem montar a página restrita. O cadastro público do workspace continua separado do contexto de configurações. A opção de substituir o responsável exige o perfil do contexto, inclusive para montar o modal.

O controle implementado corresponde às telas e rotas do frontend. A autorização de endpoints e o escopo dos dados continuam sendo responsabilidade da API, que recebe o token Firebase nas chamadas internas existentes. O retorno `userStatus` não introduz uma nova regra de bloqueio nesta alteração. A transferência, o envio de email de suporte e a edição dos dados da conta preservam os fluxos demonstrativos existentes; esta tarefa controla sua apresentação por perfil, sem acrescentar endpoints para essas operações.

## Verificação

- `tests/authentication.test.cjs`: ordem API/Firebase, bloqueios, perfil no login, restauração, alteração de perfil e descarte de respostas após troca de conta/logout/desmontagem.
- `tests/accessControl.test.cjs`: matriz das rotas, menu e abas renderizados, ações da conta, tentativa de alterar perfil por query string e guarda de acesso direto.
- Build TypeScript/Vite e lint do projeto.
- Verificação em Chromium com Firebase e API simulados: login e restauração nos dois perfis, navegação Home/Conta/Configurações, tentativas de acesso direto às seis rotas exclusivas pelo GESTOR e abertura da gestão de gestores pelo GESTOR_WORKSPACE. Conferidas capturas em desktop e celular, sem rolagem horizontal na conta.

O ícone de Conta do menu foi exportado do frame de Home do perfil GESTOR, mantendo o SVG original em `public/icons/sidebar/account.svg`. O posicionamento existente do chatbot e do link de ajuda pode causar sobreposição nas configurações; essa questão de layout é anterior e fica fora do escopo das permissões.

Critérios aplicáveis: M04 (perfil tipado em `src/types/authentication.ts`), M05 (API em serviço), M12 (carregamento/erro antes de abrir conteúdo), E01 (perfil no contexto dedicado) e E09 (rotas privadas com verificação de perfil). Publicação e histórico de commits não fazem parte desta alteração.
