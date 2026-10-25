# Revisão visual das configurações — SCRUM-608

## Correções

- Nas configurações, a ajuda fica após o conteúdo e o chat usa o mesmo posicionamento flutuante das outras telas. Foram removidos o rodapé centralizado e as sobrescritas que prendiam o robô ao fluxo da página. Não há faixa reservada, fundo adicional ou limite próprio de altura/rolagem para as configurações. A janela e o arraste do chat mantêm seu comportamento padrão.
- O formulário de unidades deixa de limitar sua altura ao viewport: os campos, ações, ajuda e chat ocupam espaços separados, inclusive em telas estreitas.
- Empresa, unidades e importação só confirmam o descarte quando existem dados locais não salvos. Navegar entre unidades ou apenas aplicar máscaras não conta como edição. Restaurar o conteúdo original elimina o aviso.
- CNPJ e CEP são exibidos com máscara desde o carregamento. A API continua recebendo os valores normalizados pelos serviços existentes.
- A seleção do sucessor usa “E-mail do gestor”. A aba Conta esclarece que o responsável anterior continua gestor e perde somente as permissões exclusivas de responsável.
- A prévia da planilha usa fonte de 16 px, rolagem horizontal acessível por teclado e botão de download separado. As linhas vazias decorativas foram removidas para manter os controles do diálogo acessíveis em janelas baixas.
- Textos secundários e placeholders das configurações usam `#d4cfe2`: contraste calculado de 6,44:1 sobre `#444252`, 8,87:1 sobre `#332754` e 11,16:1 sobre `#1c1839`. Isso não representa uma certificação de todos os pares de cores da aplicação.
- Falhas de módulo ou renderização de rota mostram mensagem de recuperação, foco no título e botão para recarregar. O carregamento possui estado visível, em vez de fallback vazio. Não há recarga automática que possa descartar formulários.

## Pagamentos

A tela anterior aceitava dados de cartão/Pix e exibia um salvamento aparente sem serviço de persistência. Em `context=settings`, ela foi substituída por um estado informativo: consulta e alteração de pagamento ainda não estão disponíveis, com contato da equipe Astro. Nenhum dado financeiro é coletado nessa tela. O fluxo inicial de cadastro continua separado.

## Verificação

- Build TypeScript/Vite aprovado e 390 testes automatizados do projeto aprovados. Os 16 testes de configurações cobrem retorno limpo, confirmação de descarte, cancelamento, comparação de máscaras, restauração, arquivo selecionado, estado de pagamentos e recuperação de rota, além dos contratos anteriores de sucesso e falha. Lint sem novos avisos; permanecem cinco avisos em arquivos fora da alteração.
- Autorrevisão em uma aba local no Chrome, com a conta autorizada e consultas reais. Nenhum formulário foi salvo, nenhuma planilha foi enviada e nenhuma permissão ou transferência foi alterada durante essa revisão.
- Desktop e viewport de 390 × 844: conferidos os formulários de empresa e unidades, ajuda/chat sem sobreposição, pagamentos e os controles de navegação. O modelo foi conferido em desktop, com rolagem horizontal por teclado.
- Simulada uma falha de módulo somente na aba local por bloqueio de rede do DevTools. A tela de recuperação apareceu com foco no título; após remover o bloqueio e acionar o botão, a tela de pagamentos abriu normalmente. O bloqueio de teste foi removido.
- Leitor de tela e todas as combinações de preferências de acessibilidade não foram auditados. A integração de pagamentos permanece pendente de implementação própria.

## Critérios DAD aplicáveis

| Critérios | Evidência e limite |
| --- | --- |
| M01–M02 | Nenhum arquivo fora de `.ts`/`.tsx` em `src/`; CSS em `styles/`; novos componentes/página em pastas com `index.tsx`. |
| M03–M05 | Apresentação em componentes/páginas, comparação de dados em hooks/utilitário, requisições nos serviços existentes. Novas props/estado tipados, sem `any` nos arquivos novos. Isso não é uma auditoria de todos os tipos do projeto. |
| M06–M08 | Alterações imutáveis, campos relacionados preservados, dependências e limpeza dos efeitos existentes mantidas; listas continuam com identificadores estáveis. |
| M09–M10 | Sem novos parâmetros dinâmicos. Rotas e query `context=settings` existentes preservadas; navegação interna pelo Router, recuperação explícita por recarga da página. |
| M11–M12 | Rótulos, foco, alerta de falha de rota, região de tabela por teclado e estados existentes de carregamento/sucesso/erro. Contraste verificado nos pares descritos, sem afirmar WCAG integral. |
| M13 | Site publicado inspecionado; esta alteração ainda depende de merge e publicação da PR. |
| M14 | Commits desta entrega seguem Conventional Commits/Astro; distribuição global por quatro semanas não foi reavaliada. |
| E03, E04, E07–E09 | Cancelamento existente preservado; lazy/Suspense com recuperação; conteúdo interpolado em JSX; validações e rotas privadas existentes mantidas. |
| E10 | Parcial: teclado e foco conferidos nos fluxos citados. Auditoria completa com NVDA/VoiceOver permanece pendente. |

Não foram introduzidos Context, reducer, armazenamento persistente ou memoização sem necessidade para essa demanda.

## Correção complementar do chat

A revisão posterior encontrou que o robô no fluxo criava um rodapé centralizado e podia ficar cortado. Esse posicionamento foi removido para restaurar o chat flutuante padrão. Uma tentativa intermediária de reservar uma faixa inferior também foi descartada após a captura enviada pelo usuário: a versão final não contém essa faixa nem limita a altura da página. A prévia da porta 5178 recebeu o mesmo ajuste. O controle do navegador estava desativado nesta etapa, portanto não houve nova captura automatizada da versão final; as evidências visuais anteriores acima não devem ser tratadas como validação dessa correção complementar.
