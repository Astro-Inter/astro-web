# Acessibilidade

## Acesso e permissões

Os controles ficam no bloco **Acessibilidade** da aba **Workspace**, nas **Configurações**.

- **Gestor:** acessa somente a acessibilidade nessa aba.
- **Gestor do workspace:** acessa a gestão e, abaixo, a acessibilidade.
- **Conta:** mantém as informações pessoais.

Não há botão global de acessibilidade. O atalho **Alt + A** abre o painel somente com sessão autenticada.

As preferências são identificadas pela conta conectada e não são compartilhadas com outro usuário. O logout restaura o padrão Astro, apaga as preferências salvas e encerra câmera, Libras e guia de leitura. Login e cadastro usam a aparência padrão.

## Recursos disponíveis

| Recurso | Funcionamento |
| --- | --- |
| Tamanho do texto | Ajuste entre 90% e 150%, pelo controle deslizante ou pelos botões −/+. |
| Fonte alternativa | OpenDyslexic regular e negrito, carregada localmente. |
| Aparência | Padrão escuro Astro. Preferências antigas de tema claro ou sistema são normalizadas para escuro. |
| Alto contraste | Contraste adicional sobre as superfícies escuras. |
| Adaptação de cores | Protanopia, deuteranopia, tritanopia, protanomalia, deuteranomalia, tritanomalia e acromatopsia. Os estados mantêm suas descrições textuais. |
| Guia de leitura | Faixa que acompanha o ponteiro e o foco do teclado. |
| Redução de animações | Controle adicional que também respeita a preferência de movimento do sistema. |
| VLibras | Tradução opcional, com posição à esquerda ou à direita e estados de carregamento e erro. |
| Navegação facial | Mira controlada pelo rosto, com calibração, clique por permanência, pausa e rolagem nas bordas. |
| Pesquisa por voz | Microfone nas buscas compartilhadas, com reconhecimento em português quando disponível no navegador. |
| Restaurar padrão | Restaura as preferências e desativa os recursos opcionais. |

## Atalhos e navegação

- **Alt + A:** abre o painel de acessibilidade durante a sessão autenticada.
- **Ctrl + seta para esquerda/direita:** muda a posição do VLibras, preservando a edição de texto nos campos.
- **Alt + P:** pausa ou retoma os cliques da navegação facial.
- **Escape:** encerra a câmera ou fecha o painel correspondente.
- **Tab:** percorre os controles; o foco é restaurado ao fechar o painel.

A navegação facial exige calibração com amostras estáveis. O clique ocorre após 1,4 segundo na mesma região e não se repete até a mira sair do controle. A análise roda em um Web Worker, com uma imagem em processamento por vez, para preservar a resposta da interface.

O VLibras mantém as superfícies, a tipografia e os destaques do Astro. Fechar o player limpa o cursor de tradução; reabrir restaura o cursor. A saída acompanha o lado escolhido e respeita a redução de movimento. O avatar e seu cenário são fornecidos pelo serviço externo.

## Permissões e processamento

- A câmera só é solicitada ao clicar em **Ativar câmera e navegar**. As imagens são processadas localmente pelo MediaPipe; o modelo e o WASM são baixados ao ativar o recurso.
- A câmera não reativa automaticamente após recarregar a página. Parar a câmera, ocultar a aba, sair da conta ou desmontar a interface encerra a captura e o detector.
- A pesquisa por voz começa somente ao clicar no microfone. O navegador pode usar um serviço externo de reconhecimento. A captura é cancelada ao ocultar a aba, desmontar a busca ou desabilitar o campo.
- O VLibras só carrega após ativação e pode receber o conteúdo selecionado para tradução. Desativá-lo encerra a captura de texto e remove as marcações do cursor.
- Credenciais, áudio, vídeo e marcos faciais não são persistidos nas preferências.

## Verificação

Os testes automatizados cobrem normalização das preferências, isolamento por conta, reset no logout, armazenamento indisponível, atalhos, calibração e permanência da mira, cancelamento de câmera e voz e integração do VLibras. O contraste das mensagens de erro é verificado nas superfícies escuras das sete paletas.

Câmera, microfone e tradução real ainda exigem validação com dispositivos e navegadores compatíveis. Os testes simulados não substituem essa conferência nem uma auditoria completa de acessibilidade.

## Licenças

Os avisos de direitos autorais e as licenças de terceiros estão preservados em `public/licenses/` e nos respectivos pacotes instalados. OpenDyslexic utiliza SIL Open Font License 1.1; MediaPipe utiliza Apache-2.0.
