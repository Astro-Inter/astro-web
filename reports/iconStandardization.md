# Padronização dos ícones

Auditoria realizada em 03/10/2026.

## Padrão dos arquivos

- 48 SVGs base, incluindo o novo relógio dos campos de horário, e 9 variantes de traço reduzido.
- Grade comum de 24 × 24. O desenho visível é centralizado, preservando sua proporção; as margens internas antigas não determinam mais o tamanho na tela.
- Extensão máxima de 20 unidades para os desenhos comuns, com espaço para o traço dentro da grade.
- Traço efetivo de 2,576 unidades, com pontas e junções arredondadas. As variantes `stroke90` usam 2,3184 unidades (0,9 da espessura base).
- Cores semânticas e desenhos existentes preservados. Pix mantém o símbolo preenchido da marca; pontos de menu e grips são círculos preenchidos.
- A lixeira passou a usar caminhos com traço, permitindo a mesma espessura dos demais símbolos.
- O botão de voltar inclui moldura e seta no mesmo arquivo: borda e seta com traço de 2,08656 px e `non-scaling-stroke`, para não engrossar com o controle maior.

## Tamanhos por contexto

Os tokens existentes continuam responsáveis pela escala. Páginas usam 0,9; os modais comuns usam zoom de 0,81, ficando 0,9 menores que as páginas. As variantes de traço reduzido já utilizadas nas explicações e endereços foram mantidas.

Medidas observadas com fonte raiz de 16 px:

| Contexto | Caixa renderizada |
| --- | --- |
| Nove ícones da sidebar, desktop, celular e tablet | 21,60 × 21,60 px |
| Ações e inputs comuns nas páginas | 19,44 × 19,44 px |
| Ações e inputs comuns nos modais | 17,49 × 17,49 px |
| Setas de seletores nos modais | 14,90 × 14,90 px |
| Copiar e excluir perguntas no celular | 20 × 20 px |
| Setas do calendário de formulário | 16,55 × 16,55 px |
| Ícone de destaque das explicações | 22,03 × 22,03 px |
| Ícones da lista de cobrança | 20,09 × 20,09 px |

Alertas, miniaturas, controles de navegação e o chat mantêm tamanhos adequados à sua função. O chat usa dimensões relativas à sua própria largura. Logos, avatares e ilustrações de estados continuam com a geometria própria desses conteúdos.

## Ajustes nos componentes

- Removidas compensações individuais de tamanho da sidebar e dos cartões de formulário.
- Unificados os tamanhos de ícones equivalentes em ações, inputs de senha, buscas, pagamento e formulários.
- Menus de cargos e formulários reutilizam o SVG de pontos, com rotação quando necessário.
- Setas tipográficas do calendário substituídas pelos SVGs compartilhados.
- Campos de horário usam um relógio; a ampulheta permanece nos alertas de vencimento.
- Limpar busca utiliza `close.svg`; removido o antigo `close.png`, sem referências restantes.
- Ampliar e fechar o chat usam a mesma caixa de ícone.
- Mantidos os alvos de toque e a funcionalidade de arrastar pela barra dos formulários.

## Cobertura e verificação

- Revisão estática de 118 arquivos TSX/CSS, incluindo os componentes de todas as páginas e popups e os usos diretos de imagens e máscaras CSS.
- Os 57 SVGs foram analisados como XML, conferindo grade e espessura efetiva. Referências literais conferidas sem arquivos ausentes.
- Catálogo renderizado com todos os 57 SVGs: centro geométrico conferido dentro de tolerância de 0,05 unidade; nenhum desenho extrapola a grade.
- Conferidas imagens carregadas e proporções quadradas em 18 rotas: login, pagamento, criação e verificação de workspace, senha, empresa, planilha, endereço, conclusão, cargos, formulários, eventos, configurações de workspace e conta, criar/editar formulário, erro e usuário inativado.
- O estado de carregamento usa uma ilustração animada, revisada pela implementação compartilhada, sem alteração nesta demanda.
- Verificação visual e medições dos popups de adicionar pergunta, calendário, participantes, grupos, agendamento, senha, edição de conta, cobrança e importação de planilha. Os demais popups reutilizam os assets e componentes auditados, inclusive confirmação com alerta, seletores e busca.
- Sidebar conferida em 390 × 844 e 768 × 1024; ações de pergunta e modal de conta conferidos no celular.
- Build de produção, TypeScript, lint e checagem de whitespace aprovados.

As medidas são da caixa da imagem. Símbolos naturalmente largos ou altos conservam sua proporção, e controles de destaque têm uma escala própria. A conferência de todos os assets e componentes não significa abrir cada combinação possível de estado de popup em todas as larguras.

## Complemento: padding dos inputs

O campo de senha também tinha um recuo inconsistente: texto a 15,20 px da borda externa e caixa do ícone a 20,29 px. Corrigido junto com CVV, calendários, seletores, busca e campos compactos de foto.

- Padding horizontal básico: 1 rem na escala base; 14,40 px nas páginas a 0,9.
- Ícones à direita têm a mesma distância da caixa até a borda: 14,40 px nas páginas e 12,96 px nos modais.
- Os botões ao redor dos ícones compensam seu espaço interno, preservando a caixa de toque e alinhando o desenho ao mesmo recuo.
- A reserva de texto à direita inclui o ícone e um intervalo igual ao padding básico. Para ícones comuns, são 48,24 px nas páginas; para chevrons, 45,36 px. Essa reserva evita sobreposição e não representa uma margem externa maior.
- Inputs sem ícone continuam com padding esquerdo e direito iguais.
- O seletor compacto de quantidade de fotos foi ampliado para acomodar o padding comum sem cortar o valor.
- Senha e CVV medidos com valores idênticos. Datas e seletores de editar formulário conferidos em desktop e 390 × 844; senha do modal de conta conferida com recuo de 12,96 px e altura de 40,50 px.

## Ajuste de espessura

Espessura final reduzida em 8% em relação à base de 2,8 unidades: 2,576 unidades. As variantes reduzidas usam 2,3184 unidades; os pontos de menu têm raio 1,932. Mantidas as escalas e os recuos.

Grip do formulário com raio 1,242; linhas do menu mobile com 1,84 px; ponto do feedback com raio 1,196. Todos os usos de SVG em componentes e máscaras CSS recebem a revisão `weightMinus8WarningBold` na URL para renovar os arquivos em cache.

O Pix preenchido usa uma máscara que remove 8% da largura dos trechos menores, preservando transparência e cor da marca.

A seta dentro da moldura de voltar/avançar foi reduzida em 20% (altura geométrica de 10 para 8 unidades), preservando posição, moldura e espessura do traço.

Corrigida a espessura visual de voltar/avançar: antes a seta renderizada no controle de 48 px tinha 3,864 px; agora moldura e seta têm 2,08656 px, equivalente ao traço comum em uma caixa de 19,44 px. O efeito `non-scaling-stroke` mantém esse traço quando o botão muda de tamanho no celular.


## Compensação visual de avaliação e alerta

Avaliação tinha o mesmo traço geométrico dos demais cartões (2,576 unidades), porém seu desenho concentrado preenchia os espaços menores. Aplicada redução óptica de 12% somente nesse desenho e no ponto da interrogação, preservando dimensões, cores e forma.

O alerta é ampliado para 31,75 px no popup; o traço antigo resultava em aproximadamente 3,41 px, enquanto os ícones comuns do mesmo contexto usam aproximadamente 1,88 px. Corrigido com traço não escalável de 2,3184 px antes do zoom do modal (0,81), resultando em aproximadamente 1,88 px. A correção vale para todas as confirmações que reutilizam o asset.

Após conferência visual do usuário, o traço não escalável do alerta foi ajustado de 2,3184 para 2,8 px antes do zoom do modal, para um peso intermediário (aproximadamente 2,27 px no popup).

Novo ajuste solicitado para o alerta: traço não escalável de 3,6 px antes do zoom do modal (aproximadamente 2,92 px no popup).
