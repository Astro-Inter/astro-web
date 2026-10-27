# Perfil na home

A home exibe a foto da própria conta no lugar da central de notificações.
O avatar abre a página Minha conta e usa `profilePhotoUrl` de
`GET /home/workspace`, junto com o nome e os indicadores. Não há consulta
separada a `GET /user/me/account-summary` ao abrir a home.

Durante a consulta do perfil, o avatar apresenta um skeleton. Sem foto ou em
falha de carregamento, mostra as iniciais do nome; se nem o nome estiver
disponível, usa o ícone de conta. O acesso à conta permanece disponível.

A central de notificações foi removida com seus componentes, mocks, tipos,
estilos e entradas de tracking. Avisos de sucesso e erro de operações
continuam funcionando com estilos próprios, independentes da antiga central.

Validação automatizada: `tests/homeProfile.test.cjs` cobre a foto da API,
a navegação para a conta, ausência da central, carregamento, ausência de foto,
falha da imagem e uma nova URL após falha. Os testes de conta existentes
cobrem o resumo autenticado e a proteção contra respostas de sessões antigas.

## Revisão Astro DAD React

A página consulta somente `useWorkspaceHome`; o componente
`HomeProfileLink` recebe props tipadas e apresenta o avatar. O acesso HTTP
permanece em `services/home.ts`. Em erro da consulta, o DOM mostra
Foto indisponível, conserva as iniciais e mantém o link para a conta.

| Critérios | Resultado e evidência |
| --- | --- |
| M01–M02 | Estrutura verificada: src contém somente TS/TSX; página e novo componente têm pasta própria com index.tsx; build Vite/TypeScript aprovado. |
| M03–M05 | Atendidos no escopo: apresentação separada da consulta, props e domínio tipados, sem any ou fetch na página/componente. Reutiliza hook e serviço existentes. Não é uma auditoria dos 145 componentes do projeto. |
| M06–M08 | Preservados no fluxo reutilizado: estado agrupado e imutável, efeitos dependentes da sessão com cleanup, ações rápidas com key do identificador. |
| M09 | O fluxo alterado não recebe parâmetros de rota. |
| M10 | Navegação real para Minha conta por Link, incluindo acionamento com Enter no navegador local. |
| M11 | Evidência no escopo: link com nome acessível e foco CSS, imagem decorativa dentro do link, iniciais brancas sobre #6d6891 com contraste calculado de 5,20:1. Não equivale a auditoria WCAG de todas as telas. |
| M12 | Skeleton durante consulta, foto/iniciais no sucesso, mensagem no DOM em falha e fallback para imagem quebrada; cobertos em homeProfile.test.cjs. |
| M13–M14 | Não reavaliados nesta demanda: publicação e distribuição do histórico por quatro semanas exigem avaliação global própria. Esta PR não comprova esses critérios. |
| E01/E03/E07/E09 | Preserva autenticação por Context e rota privada; hook reutilizado tem cancelamento, retorno tipado e tratamento de falhas; nome é interpolado em JSX e URL validada no serviço. |
| E02/E05/E06/E08 | Sem novo reducer, persistência, memoização ou formulário no escopo. Não se declara conformidade global desses extras. |
| E04/E10 | Não reavaliados integralmente: não houve nova comprovação de lazy loading por Network nem teste com NVDA/VoiceOver. |

## Contrato da API

A API acrescenta o campo opcional profilePhotoUrl à resposta de
GET /home/workspace. Sem foto ou com indisponibilidade da consulta auxiliar,
retorna null sem impedir os indicadores. A API identifica o usuário pelo token,
usa DTO do banco, mapper e serviço de foto isolado da transação da home.
O resumo da conta continua existindo para a tela Minha conta.

O serviço do web normaliza campos ausentes, null ou URLs inválidas para null.
Aceita somente HTTP/HTTPS sem credenciais e preserva a URL assinada original.
Isso permite publicar a API primeiro; enquanto a API antiga ainda estiver
respondendo sem o campo, o web mostra as iniciais sem buscar a conta por fora.

Os testes da home conferem a foto na resposta do workspace e impedem uso do
hook de conta pela página. Também validam que respostas sem foto, formatos
inválidos e protocolos não permitidos não impedem os indicadores.
