# Estabilidade visual — 02/10/2026

## Correções

- Animações compartilhadas de entrada das páginas agora usam apenas opacidade, sem escala temporária.
- Saída de criar/editar formulários, seleção de datas, confirmação de arraste e entrada/saída de grupos não mudam mais a escala dos elementos.
- Abertura e fechamento do chat e dos tooltips de textos truncados não alteram seu tamanho.
- O popup de distribuição aleatória não ganha padding ao abrir o seletor.
- A página reserva o espaço da barra de rolagem para estabilizar a largura entre rotas e dialogs.
- Os quatro pesos usados da Montserrat são pré-carregados; o build gera os links dos arquivos finais corretamente.

## Conferência no navegador

As 15 rotas existentes e a página de erro foram abertas e inspecionadas após seu conteúdo carregar: login, pagamento, criação de workspace, chave verificada, senha, dados da empresa, planilha, carregamento, endereço, workspace concluído, cargos, formulários, eventos, criar formulário e editar formulário.

Na janela testada, nenhuma apresentou overflow horizontal da página. As animações de entrada das telas não apresentaram escala transitória; o planeta da tela de carregamento mantém sua animação decorativa. O deslocamento horizontal de troca de unidade não muda sua escala.

Foram comparadas as caixas ao abrir e fechar selects:

| Elemento | Fechado / aberto / fechando |
| --- | --- |
| Popup de adicionar cargo | 618,84 × 249,95 px |
| Campo de status do cargo | 217,01 × 40,50 px |
| Botão Cancelar | 203,85 × 40,50 px |
| Popup de distribuição aleatória | 618,84 × 277,27 px |
| Campo de quantidade de grupos | 521,64 × 40,50 px |

As dimensões permaneceram iguais nos três estados medidos. TypeScript, lint e build passaram.

## Alcance

A revisão combinou busca nos estilos de todo o projeto com inspeção das rotas e amostras dos componentes compartilhados. Não equivale a testar todas as combinações de dados, interações e tamanhos de tela. Mudanças de tamanho solicitadas pelo usuário, como expandir o chat e trocar o conteúdo de uma etapa, continuam fazendo parte do funcionamento.
