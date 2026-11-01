# Preview dos contratos da PR 34

Com `npm run dev -- --port 5175`, abra
`http://127.0.0.1:5175/tools/chat-contracts-preview/index.html`.

Esta página de desenvolvimento usa ChatBlocks e seus componentes/hook/serviço
reais. As perguntas selecionam respostas simuladas de `scenarios.json`; não há
chamada à IA nem operação de negócio. Somente nesta página, o transporte de
`files.example` é simulado para exercitar o download de um PDF fictício e HTTP 403.
Não é prova de geração/upload/autorização/CORS do armazenamento real.

Exercite a sequência cobertura → matriz → comparação → listagem, 100 → 500,
barras globais, linhas zeradas, eventos, vazios, PDF válido/expirado/indisponível,
falha de geração/download e tipos desconhecidos. Fechar/reabrir a conversa remonta
o mesmo snapshot em memória, sem renovar o prazo. O botão de cinco segundos
permite verificar a expiração com a conversa aberta.

O HTML é uma entrada de desenvolvimento e não integra o build de produção.
Os testes de `chatFiles.test.cjs` validam as fixtures e também o controlador
verdadeiro com POST/histórico simulados, preservação dos arquivos e erros.
