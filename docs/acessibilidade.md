# Acessibilidade

## Acesso e permissões

Os controles ficam no bloco **Acessibilidade** da aba **Workspace**, em **Configurações**.

- **Gestor:** acessa somente a acessibilidade nessa aba.
- **Gestor do workspace:** acessa a gestão e, abaixo, a acessibilidade.
- **Conta:** mantém as informações pessoais.

O atalho **Alt + A** abre o painel somente durante uma sessão autenticada. As preferências são identificadas pela conta e não são compartilhadas. Ao sair, o painel restaura o padrão Astro, apaga as preferências salvas e encerra câmera, VLibras e guia de leitura. Login e cadastro usam a aparência padrão.

## Recursos

| Recurso | Funcionamento |
| --- | --- |
| Tamanho do texto | Ajuste entre 90% e 150%, pelo controle deslizante ou pelos botões −/+. |
| Fonte alternativa | OpenDyslexic regular e negrito, carregada localmente. |
| Aparência | Tema escuro Astro. Valores antigos de tema claro ou sistema são normalizados para escuro. |
| Alto contraste | Contraste adicional sobre superfícies escuras. |
| Adaptação de cores | Protanopia, deuteranopia, tritanopia, protanomalia, deuteranomalia, tritanomalia e acromatopsia; os estados mantêm descrições textuais. |
| Guia de leitura | Faixa que acompanha ponteiro e foco do teclado. |
| Redução de animações | Também respeita a preferência de movimento do sistema. |
| VLibras | Tradução opcional, com posição à esquerda ou à direita e estados de carregamento e erro. |
| Navegação facial | Mira controlada pelo rosto, com calibração, clique por permanência, pausa e rolagem nas bordas. |
| Pesquisa por voz | Microfone nas buscas compartilhadas, com reconhecimento em português quando disponível no navegador. |
| Restaurar padrão | Restaura preferências e desativa os recursos opcionais. |

## Atalhos e navegação

- **Alt + A:** abre o painel durante a sessão autenticada.
- **Ctrl + seta para esquerda/direita:** muda a posição do VLibras e preserva a edição em campos.
- **Alt + P:** pausa ou retoma os cliques da navegação facial.
- **Escape:** encerra a câmera ou fecha o painel correspondente.
- **Tab:** percorre os controles; ao fechar o painel, o foco retorna ao acionador.

A navegação facial exige calibração com amostras estáveis. O clique ocorre após 1,4 segundo na mesma região e não se repete até a mira sair do controle. A análise roda em Web Worker e processa uma imagem por vez.

O VLibras carrega sob demanda e pode receber o conteúdo selecionado para tradução. Fechar o player limpa o cursor de tradução; reabri-lo restaura o cursor. O avatar e o cenário são fornecidos pelo serviço externo.

## Permissões e processamento

- A câmera só é solicitada ao clicar em **Ativar câmera e navegar**. As imagens são processadas localmente pelo MediaPipe; o modelo e o WASM são baixados quando o recurso é ativado.
- A câmera não reativa após recarregar a página. Parar a câmera, ocultar a aba, sair da conta ou desmontar a interface encerra a captura e o detector.
- A pesquisa por voz começa ao clicar no microfone. O navegador pode usar serviço externo de reconhecimento. A captura é cancelada ao ocultar a aba, desmontar a busca ou desabilitar o campo.
- Desativar o VLibras encerra a captura de texto e remove as marcações do cursor.
- Credenciais, áudio, vídeo e marcos faciais não são persistidos nas preferências.

## Licenças

Avisos de direitos autorais e licenças de terceiros estão em public/licenses/ e nos respectivos pacotes. OpenDyslexic utiliza SIL Open Font License 1.1; MediaPipe utiliza Apache-2.0.
