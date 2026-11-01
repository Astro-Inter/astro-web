# Correção do layout de Formulários após homologação do chat

O teste no site publicado encontrou React #185 em Formulários ao alternar
largura/altura com o chatbot aberto. O trecho indicado no bundle público
`mainFormScreen-C5W6xXxb.js` corresponde à função `fitCards`, que executava
`setPageSize` diretamente no efeito de layout e no ResizeObserver.

A correção agrupa as medições em `requestAnimationFrame`, como já faz o
controlador do chat ao acompanhar a viewport. ResizeObserver e resize compartilham
um quadro pendente; desmontagem ou substituição do efeito cancela esse quadro.
As mesmas fórmulas, filtros, cards, estilos e paginação remota foram mantidos.
Não há nova biblioteca, mudança de contrato ou componente visual paralelo.

Validação:

- Regressão no ambiente DOM existente: falha no código anterior, passa no corrigido.
- Verifica adiamento da medição, rajada de 20 notificações, uma leitura por quadro,
  mudança de quatro para dois cartões e retorno a quatro, sem repetir consulta
  para o mesmo tamanho; limpeza do observer/listener/quadro na desmontagem.
- 47 testes específicos de Formulários e blocos do chat passaram.
- `npm test`: 571 testes passaram, sem falhas.
- `npm run lint`, `npm run build` (TypeScript + Vite) e `git diff --check` passaram.
- Navegador local, conta autorizada: desktop 1366×768, mobile 390×844,
  janela baixa 390×600 e transições 680/681×621, com chat aberto. Não foi observada
  a tela de recuperação nem novo Maximum update depth/React #185.
- No mobile estabilizado, a lista mostrou dois cartões e página 1/3; no desktop,
  quatro cartões e página 1/2. Nenhuma operação de negócio foi feita.

Escopo DAD: preserva M01–M05 (estrutura/tipos/serviços existentes), M06–M07
(estado e limpeza do efeito), M11–M12 (layout e estados existentes). Não constitui
certificação global de acessibilidade ou auditoria das demais páginas.

Os problemas de cobertura, matriz, roteamento, seleção de evento e indisponibilidade
observados na API estão separados no [prompt de correção da API](prompt-correcao-api-ia.md).
Não foram mascarados por dados artificiais ou gráficos calculados no cliente.
Não houve merge nem deploy desta correção.
