# Análise das respostas de formulários

A tela de respostas consulta envios de formulários e registra aprovação ou reprovação pela API.

## Fluxo e contrato

- No menu de um formulário respondido, **Ver respostas** abre /mainFormScreen/responses?id={uuid}.
- GET /forms/{id}/responses fornece formulário, remetente, destinatário, unidade, análise e canReview. A interface usa essa permissão retornada pela API; remetente e gestor do workspace podem analisar conforme a regra do servidor.
- POST /forms/{id}/review recebe {"status":"approved"} para aprovar ou {"status":"rejected","description":"Motivo"} para reprovar. A descrição é aparada, obrigatória e limitada a 1.000 caracteres.
- O estado final aparece após confirmação da API. Falhas preservam o modal e o motivo; envios duplicados ficam bloqueados.
- Em HTTP 409, a tela consulta novamente a análise sem repetir a escrita. Decisões finais mostram revisor e data e não oferecem nova ação.
- CONCLUIDO indica que o formulário foi respondido; o resultado da análise é um estado diferente. Reprovar encerra a análise sem permitir novo envio.

As chamadas reutilizam autenticação Firebase, envelope e tratamento de erro dos formulários. IDs da query não definem usuário ou workspace. Consultas e gravações pendentes são canceladas ao sair da tela ou trocar identidade.

## Respostas e anexos

A tela apresenta texto, datas, alternativas (incluindo o texto de Outros), perguntas sem resposta e metadados dos anexos.

Ao abrir um anexo, GET /forms/{id}/images/{imageId} fornece uma URL HTTPS temporária. O token da API não é encaminhado ao armazenamento e a URL não é persistida. Reabrir ou tentar novamente solicita outra URL. Falhas de consulta ou carregamento permitem nova tentativa.

A descrição da reprovação só existe para estados rejected. Aprovação omite essa propriedade; ela não substitui a descrição original do formulário.

## Menu e apresentação

O menu oferece **Ver respostas** para formulários respondidos e usa o UUID do registro e a API configurada, inclusive em desenvolvimento. Formulários pendentes não oferecem análise. Fixtures de apresentação ficam separadas dos acessos do menu.

A tela usa componentes compartilhados do Astro, cards de perguntas e de análise. Em desktop, o card de análise acompanha a rolagem; em telas menores, o conteúdo fica em uma coluna.

A integração HTTP está em tests/formReviewApi.test.cjs; a coordenação da revisão e a interface são cobertas por tests/formReview.test.cjs e tests/formsUi.test.cjs.

## Ambiente da API

VITE_API_URL define a base da API. Em desenvolvimento, o proxy /api encaminha chamadas à base configurada. A aplicação não inclui URLs locais de teste nas configurações de produção.
