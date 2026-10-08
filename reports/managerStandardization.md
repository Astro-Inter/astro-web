# Revisão visual de Gestores

Referência: componentes e tokens compartilhados de Cargos, Conta e demais mainScreen.

## Conferido no navegador

- Tela em 1440 × 900: título 28,7712 px, descrição 16,2 px e ação 13,4784 px / 45 px de altura, iguais a Cargos na mesma resolução.
- Tabela, status, botão de três pontos, pesquisa e filtros usam os componentes e estilos compartilhados. O ícone dos três pontos tem 23,0375 px e fica no centro do botão.
- Convite, informações, edição, senha, confirmação de salvar e inativação usam AppModal e zoom 0,81. Os botões têm 40,5 px de altura; no desktop, largura 203,85 px. O título usa o mesmo token dos demais popups.
- A edição mantém os campos com a mesma altura e fonte. Olho e setas usam os SVGs compartilhados; o alerta de inativação é o mesmo de Cargos, incluindo sua compensação de espessura.
- Em 768 × 1024 e 768 × 640, o formulário fica em duas colunas. Em 390 × 844 e 320 × 568, fica em uma coluna e permite rolagem interna. Em 601 × 640, as mensagens de erro de nome/e-mail e os botões continuaram dentro do popup.
- Confirmação de salvar foi aberta e cancelada; confirmação de inativar foi aberta e cancelada. Nenhuma alteração de dados foi confirmada durante a revisão.

## Correções

1. O convite herdava uma regra genérica de input que substituía o padding reservado para a seta. Aplicado o mesmo padding dos seletores compartilhados: 16 px à esquerda e 50,4 px à direita antes do zoom, incluindo a área do ícone.
2. No celular, os dois filtros tinham largura de 100% cada e não encolhiam. Agora dividem a linha em partes iguais. Em 320 px, cada filtro mede 130,2 px; em 390 px, 165,4 px. A página deixou de transbordar horizontalmente; a tabela mantém sua rolagem própria.

## Verificação

- Inspeção visual e medidas reais do DOM nas resoluções acima.
- `npm run lint`: passou.
- As mudanças são locais ao CSS de Gestores.
