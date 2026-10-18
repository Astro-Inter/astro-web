# Acessibilidade — SCRUM-545

Referência: [Ludos](https://github.com/Ludos-Souk/ludos), especialmente `configuracoesService.js`, `faceNavigation.js`, `vlibras.js`, `accessibility.css` e a pesquisa por voz em `utils/ui.js`. Consulte também o [manual oficial do VLibras](https://vlibras.gov.br/doc/widget/installation/webpageintegration.html) e a [documentação do Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js).

## Recursos adaptados

| Ludos | Astro |
| --- | --- |
| Tamanho do texto | 90–150%, com slider e botões −/+ para uso sem arrastar, tokens em rem e reflow de controles e popups. |
| Fonte alternativa | OpenDyslexic regular e negrito, servida localmente por Fontsource. |
| Temas | Escuro (padrão Astro) e claro. Preferências antigas com tema sistema voltam ao escuro. |
| Alto contraste | Contraste adicional independente do tema. |
| Visão de cores | Protanopia, deuteranopia, tritanopia, protanomalia, deuteranomalia, tritanomalia e acromatopsia. Paletas alternativas, sem remover os textos dos estados. |
| Guia visual de leitura mencionada no README | Faixa que acompanha o ponteiro e o foco do teclado. |
| Preferências persistentes | localStorage com `_versao: 1`, validação, limites, recuperação de JSON inválido e sincronização entre abas. |
| Reset | Restaura o tema original e desativa os recursos opcionais. |
| VLibras | Ativação opcional, carregamento/erro acessíveis, somente esquerda/direita e Ctrl + ←/→ fora dos campos de digitação. Posições antigas acima/abaixo voltam para esquerda. Troca de posição ou dialog preserva a integração. O player abre por clique, sem retomar WebGL automaticamente após reload. |
| Navegação facial (chamada Eye Tracking no Ludos) | Mira espelhada como a prévia, velocidade ajustada ao tempo entre quadros, calibração com 35 amostras estáveis consecutivas e reinício ao perder o rosto. Clique exige 1,4 s na mesma região (tolerância de 12 px), sem repetição até sair do controle. Rolagem nas bordas após 600 ms, sem clique durante a rolagem. Painel flutuante com botões e cores dos popups Astro. Alt + P pausa/retoma os cliques; também é possível mirar em Retomar durante a pausa. Não é rastreamento preciso dos olhos. |
| Pesquisa por voz | Botão de microfone nas buscas compartilhadas, pt-BR, cancelamento e erros. |
| Teclado/HTML/ARIA | Link de salto, Alt + A, foco ao abrir e fechar o painel, controles nativos rotulados, mensagens acessíveis e integração com dialogs. |
| Animações | Respeita preferência do sistema e controle adicional para reduzir movimentos. |

Os controles ficam no bloco **Acessibilidade**, nas **Configurações do workspace**. Antes do login, há um link de acesso ao painel; Alt + A também abre os mesmos controles. As preferências se aplicam ao login, cadastro, páginas internas, popups e conteúdo carregado dinamicamente por CSS e Context, sem reescrever os tamanhos dos elementos via MutationObserver. As preferências são individuais neste navegador, não configurações impostas a todos os colaboradores.

## Permissões e processamento

- A câmera só é solicitada ao clicar em **Ativar câmera e navegar**. O estado ativo não é persistido e não reativa após reload. Escape, Parar câmera, ocultar a aba, sair da conta ou desmontar a interface encerram as trilhas e o detector.
- MediaPipe roda localmente; imagens da câmera não são enviadas pela aplicação. WASM e modelo são baixados ao ativar o recurso. O pacote/WASM usam versão 1.1.0.
- A pesquisa por voz só começa ao clicar no microfone. A Web Speech API pode usar o serviço remoto do navegador, conforme informado no painel. O reconhecimento é abortado ao desmontar a busca, ocultar a aba ou desabilitar o campo.
- VLibras é um serviço externo opcional e pode receber conteúdo selecionado para tradução. Seu script só é carregado após ativação. Desativar ou restaurar o padrão fecha o tradutor, encerra a captura de texto e remove as marcações do cursor; não desfaz uma tradução já solicitada.
- Credenciais, áudio, vídeo e marcos faciais não são persistidos nas preferências.

## Verificação e limites

Testes automatizados cobrem normalização/persistência, armazenamento indisponível, limites da mira, permanência, suporte/idioma de voz e descarte de câmera recebida após cancelamento. Build verifica contratos TypeScript.

A revisão funcional também cobre cancelamento de voz com resultados/erros tardios, troca de posição/dialog sem reiniciar VLibras, calibração/pausa/retomada facial sem repetir cliques e encerramento por Escape. O contraste das mensagens de erro nas sete paletas é verificado sobre as superfícies claras e escuras. Câmera e voz usam serviços simulados nesses testes; não substituem validação com dispositivos reais.

Os atalhos Alt + A e Alt + P também funcionam com foco em campos; Ctrl + setas preserva a edição de texto, inclusive dentro de Shadow DOM. Repetição de tecla, composição e AltGr não repetem ou disparam os atalhos indevidamente. A integração reaproveita o SDK já carregado nas atualizações do Vite e remove raízes duplicadas. Fechar pelo X limpa as marcações e desativa o cursor de tradução; reabrir restaura seu estilo roxo. A saída acompanha o lado escolhido, sem salto vertical, e respeita redução de movimento.

### Resposta da interface

A inferência facial roda em um Web Worker do tipo módulo (MediaPipe/WASM com `useModule: true`), com uma imagem em voo, imagens de 320 × 240 e câmera limitada a 20 quadros/s. Cancelar termina o worker e descarta resultados pendentes; não há fallback de inferência síncrona na interface. Inicialização e inferência têm limites de 60 s e 10 s para encerrar um worker que não responde. No navegador, o modelo real processou 20 imagens vazias sem acessar câmera ou microfone, enquanto a interface mantinha seu contador ativo.

O VLibras só reaplica a posição quando necessário, agrupa a recuperação do estilo em um quadro e desconecta os observers ao desativar. Sair da aba pausa o player; desativar também solicita a pausa direta do renderizador carregado. A busca pelo dialog ativo ignora alterações que não envolvem dialogs e agrupa as demais por quadro. Essas medidas não garantem que o player externo ou o driver gráfico nunca trave.

O painel e o botão lateral do VLibras recebem um estilo isolado em seus Shadow Roots (`styles/librasWidget.css`): Montserrat, superfícies dos popups Astro, destaque roxo, ícones com contraste e hover, cantos e sombra compartilhados. As variáveis herdadas acompanham tema claro, alto contraste e adaptação de cores. A instalação do estilo ocorre uma vez por Shadow Root, sem atualização por quadro. No SDK 7.12.2, foram conferidos menu, abertura/fechamento, reprodução da apresentação inicial e contraste da marca nos temas escuro e claro. O iframe externo do avatar não é alterado; roupa e cenário continuam sendo os originais do VLibras. Mudanças futuras na estrutura do SDK podem exigir revisão dos seletores.

O botão usa fundo roxo uniforme e uma máscara vetorial local das mãos, sem o filtro que produzia manchas claras no gradiente oficial. Os dois cursores de seleção (texto e imagem) preservam os PNGs originais do SDK em 48 × 48, transparência e ponto de clique (0, 0), recolorindo somente o azul por uma matriz SVG. As regras cobrem texto, imagens e imagens descendentes no documento e nos Shadow Roots, com prioridade sobre as regras azuis do SDK. A máscara do botão em `styles/assets/librasHands.svg` deriva do [ícone oficial do VLibras](https://vlibras.gov.br/app/assets/images/vlibras-access.svg). A inicialização também remove o contorno externo, a borda da marca e o aro decorativo do avatar para acompanhar os outros popups; campos e foco de teclado mantêm seus próprios contornos.

No navegador foram conferidos tema claro, alto contraste, aplicação das sete paletas, Ctrl + setas com foco em switch/select sem interferir na digitação, OpenDyslexic e 150% a 390 px, redução de movimento e foco do guia em dialog com zoom. O player externo do VLibras abriu, mas sua recarga deixou a prévia sem responder; não foi concluída uma tradução real. A integração agora exige clique para reabrir o player após reload. Isso não elimina o custo do WebGL e dos downloads do serviço externo.

Não declarar certificação WCAG completa a partir desses recursos. M11 e E10 continuam exigindo auditoria de todas as páginas, contraste em cada combinação, teclado, NVDA/VoiceOver e validação real de câmera/microfone em navegadores compatíveis. Paletas e fonte são opções de preferência, sem promessa de benefício clínico. Conteúdo do VLibras e suporte do reconhecimento de voz dependem dos provedores e do navegador.

## Licenças

Referências de implementação Ludos: MIT, © 2026 Ludos Souk, com aviso em `public/licenses/ludos-MIT.txt`. OpenDyslexic: SIL Open Font License 1.1, © Abbie Gonzalez; licença em `public/licenses/opendyslexic-OFL.txt`. MediaPipe: Apache-2.0, conforme o pacote instalado. As dependências mantêm suas licenças e avisos.

Os cursores em `styles/assets/librasCursor.svg` e `librasImageCursor.svg` contêm os PNGs originais do SDK VLibras 7.12.2 sem redesenho. O hover do botão centraliza o texto horizontal e verticalmente. As linhas decorativas entre cabeçalho, player e rodapé foram removidas, mantendo o foco de teclado nos controles.
