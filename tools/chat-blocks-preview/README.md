# Preview local de blocos do chatbot

Execute `npm run dev` na raiz e abra
`http://127.0.0.1:5173/tools/chat-blocks-preview/index.html`.

Usa os componentes reais e uma fixture fictícia, sem autenticação, rede de negócio
ou persistência. Não faz parte das entradas do build de produção.
Teste cartões, homônimos, tabela longa com 200 linhas, páginas locais, corte,
rosca com zero, barras, linhas, contexto e ficha sem foto em desktop/mobile.
Fechar/reabrir histórico remonta o mesmo snapshot. Nova resposta reinicia a página.
O teste `tests/chatBlocks.test.cjs` valida todos os discriminadores da fixture.
