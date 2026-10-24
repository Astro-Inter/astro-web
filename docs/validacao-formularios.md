# SCRUM-610 — Análise das respostas de formulários

Interface web para consultar respostas e validar o fluxo de aprovação/reprovação. A consulta usa a API existente; decisões só funcionam na prévia de desenvolvimento até o backend disponibilizar o contrato de validação.

## Fluxo

- A ação **Ver respostas** fica somente no menu dos três pontos do card, para formulários respondidos, com o status visual **Respondido**. A consulta/edição da definição permanece em **Consultar**/**Editar** no mesmo menu, usando o editor existente.
- `/mainFormScreen/responses?id=<uuid>` mostra título, descrição, destinatário, unidade, remetente, prazo, data de resposta e perguntas com respostas textuais, alternativas, datas e anexos.
- O card lateral reúne status, destinatário, quantidade de respostas e ações. Aprovação abre confirmação; reprovação abre um modal com descrição obrigatória. Os estados finais mostram revisor e data, sem novas ações.
- Somente o remetente e o gestor do workspace podem validar um formulário respondido. Na prévia, a reprovação encerra o formulário sem novo envio.

Respondido e aprovado são etapas distintas. O destinatário não ganha permissão de validar apenas por ter respondido.

## Descrição da reprovação

`FormReviewDecision`, em `src/types/formReview.ts`, só contém `description` quando `status` é `rejected`. Aprovação e estados sem decisão omitem completamente essa propriedade, sem `null` ou string vazia. Ela não substitui a descrição original do formulário.

Na integração futura, o backend deverá garantir essa mesma ausência no MongoDB, validar remetente/workspace, exigir a descrição, preservar as respostas e impedir alterações de decisões finais. Esta entrega não modifica o backend nem o MongoDB.

## Prévia de desenvolvimento

1. Executar `npm run dev` e entrar na conta.
2. Na listagem, abrir os **três pontos** de qualquer formulário e escolher **Ver respostas (prévia)**. Em desenvolvimento, a opção aparece inclusive para formulários pendentes e rascunhos; ela abre dados de exemplo sem alterar o formulário selecionado. Também é possível abrir `/mainFormScreen/responses?preview=1` diretamente.
3. A tela abre em aguardando análise, sem faixa ou seletor de prévia. Para testar os estados diretamente, acrescentar `&state=awaiting_response`, `&state=approved` ou `&state=rejected` à URL de prévia. A quinta pergunta é opcional e não respondida; o contador mostra quatro de cinco respostas.
4. Aprovar/reprovar afeta somente a memória da página. Sair ou recarregar descarta a simulação.

A opção do menu e o modo de prévia só são habilitados em desenvolvimento (`import.meta.env.DEV`). Não há gravação em `localStorage` nem chamadas de escrita para simular decisões. Os anexos da prévia são nomes de arquivos de exemplo; não representam imagens carregadas.

## Integração e limites

O serviço `getFormReview` reutiliza `GET /forms/{id}` e os catálogos de destinatários/unidades. Se os catálogos não estiverem disponíveis, a página identifica os dados por ID. A consulta principal tem carregamento, erro, nova tentativa e cancelamento.

Em consultas reais, os botões de decisão permanecem desabilitados até existir o contrato de backend. A interface não inventa endpoints de aprovação/reprovação nem amplia os status da API atual. IDs adicionais na query não são usados como escopo.

Arquivos aceitam apenas URL HTTPS sem credenciais. Conteúdo dinâmico é renderizado por JSX. Datas inválidas e respostas em formato não reconhecido recebem indicação explícita. O suporte completo à opção Outros e o contrato definitivo de respostas de foto dependem do envio de respostas pela API/mobile.

## Design Astro

- Referências internas: cards de Formulários (`styles/mainFormScreen.css`), editor (`styles/createForm.css`) e resumos de Eventos (`src/components/eventReviewModal/index.tsx` e `styles/createEvent.css`).
- Montserrat, escala de 90%, superfícies/tokens do Astro, ícones e badges compartilhados e ações `CompactPurpleButton`.
- Seta de retorno à esquerda, título/subtítulo ao lado; perguntas com faixa roxa; alternativas únicas com círculo/ponto e múltiplas com check quadrado de Eventos.
- Card lateral sem carteira, com ícone de documento, resumo e textos reduzidos. Os avisos adicionais no card, no rodapé da página e no fim do modal de reprovação foram retirados conforme revisão.
- Layout em duas colunas no desktop e uma coluna em telas menores. No desktop, o card compacto permanece ao lado durante a rolagem (sticky), com altura natural até o fim do seu conteúdo, sem esticar até o rodapé da janela. A altura máxima respeita o espaço visível; conteúdo longo tem rolagem interna e foco por teclado. A coluna lateral usa alinhamento ao fim da linha do grid e fixação pela base (`align-self: end` e `bottom`), para a base do card coincidir com a base da última pergunta ao final da rolagem. O card interno conserva sua altura natural. A roda do mouse sobre o card pode continuar a rolagem da página ao atingir seus limites internos, sem bloqueio de encadeamento de scroll. Em uma coluna, sua altura acompanha o próprio conteúdo, sem fixação lateral.

O Figma fornecido foi aberto na página Web V2, mas a extração de contexto pelo conector não ficou disponível. As telas novas seguem o web existente; não se declara reprodução pixel a pixel de um frame específico.

## Verificação e critérios DAD

- `npm test`, `npm run build` e `npm run lint` são os comandos de validação. O lint mantém dois avisos preexistentes fora deste módulo: `workspaceCodeForm` e `useAstroChatController`.
- `tests/formReview.test.cjs` verifica descrição exclusiva da reprovação, obrigatoriedade/limite, permissões, decisões finais, datas/URLs, pergunta opcional vazia, prévia sem API e consulta real sem simular gravação.
- M01–M04: novos arquivos de src em TypeScript; componentes em pastas próprias, props tipadas; página compõe o fluxo, hook coordena estado e serviço concentra a leitura. CSS permanece fora de src.
- M05–M10/E03/E07–E09: serviço tipado, estados imutáveis, efeitos com dependências/cancelamento, chaves estáveis, UUID validado antes de consulta, navegação Router e rota privada.
- M11/M12: botões nativos, rótulo da descrição, mensagens de erro no DOM e estados assíncronos. A versão anterior foi inspecionada no navegador, incluindo abertura/foco do modal e fechamento por Escape. A inspeção visual e de teclado do card final continua pendente porque o navegador local está desativado nesta sessão; não se declara auditoria WCAG completa ou teste com leitor de tela (E10).
- E04: página registrada via lazy/Suspense existente; build gera chunk da página. A verificação específica na aba Network não foi realizada.
- M13/M14: publicação ocorre pelo fluxo do projeto após aprovação/merge; esta documentação não certifica deploy nem o histórico global de quatro semanas. A PR deve ter `main` como destino.
