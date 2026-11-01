# Interface das configurações

Esta página descreve os comportamentos visuais e de navegação das configurações de workspace e conta.

## Layout e formulários

A ajuda aparece depois do conteúdo da configuração e o chat mantém o posicionamento flutuante compartilhado com as demais telas. Os formulários não reservam faixa para o chat nem limitam a altura ou a rolagem do conteúdo. Em telas estreitas, campos e ações permanecem em fluxo próprio.

Empresa, unidades e importação confirmam descarte somente quando há dados locais não salvos. Navegar entre unidades ou aplicar máscaras não é uma edição; restaurar o conteúdo original remove o aviso. CNPJ e CEP aparecem mascarados desde a leitura, enquanto os serviços enviam valores normalizados.

A prévia da planilha usa fonte de 16 px e permite rolagem horizontal por teclado. O download é uma ação separada. O layout do diálogo mantém seus controles acessíveis em janelas baixas.

Textos secundários e placeholders usam #d4cfe2 nas superfícies escuras da tela. Falhas de carregamento de módulo ou renderização de rota mostram estado de recuperação, focam o título e oferecem recarga manual; não recarregam automaticamente nem descartam formulários.

A seleção do sucessor na transferência usa o rótulo **E-mail do gestor**. A interface informa que o responsável anterior permanece como gestor, mas perde as permissões exclusivas de responsável.

## Pagamentos

No contexto settings, a tela apresenta estado informativo: consulta e alteração de pagamento não estão disponíveis nesse fluxo. Não coleta dados de cartão ou Pix. O pagamento durante o cadastro inicial é um fluxo separado.
