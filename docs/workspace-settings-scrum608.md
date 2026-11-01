# Configurações de workspace

As configurações de workspace usam serviços e hooks específicos de empresa, unidades, planilha e transferência de responsável. As chamadas usam a URL configurada no projeto e Bearer Firebase; a API valida escopo e permissões.

## Empresa

- GET /workspace preenche o formulário.
- PUT /workspace salva nome e CNPJ.
- O formulário valida nome de 2 a 255 caracteres e CNPJ como string com 14 dígitos. A confirmação aguarda a resposta da API antes de voltar às configurações.

## Unidades

- GET /units carrega endereços; POST /units cria unidade; PUT /units/{unitId} atualiza.
- O mapper recebe campos em inglês e converte postalCode para cep. Número legado nulo aparece vazio para preenchimento.
- IDs persistidos são separados dos IDs locais usados pelo carrossel. Unidades já salvas não são removidas pelo formulário.
- Cada gravação confirmada é preservada mesmo que outra unidade falhe. A página pode recarregar a lista para refletir o estado do servidor.

## Importação de planilha

POST /workspace/import recebe XLS/XLSX de até 10 MiB como FormData. A parte JSON data é enviada somente quando há endereços novos; o navegador define o boundary.

A leitura da primeira aba é compartilhada com o cadastro inicial. No cadastro inicial, o fluxo exige o gestor; a sincronização das configurações não exige essa etapa. A tela compara unidades por nome normalizado com a lista real e solicita endereço apenas para unidades novas. Não há endpoint de prévia.

O resultado apresenta colaboradores criados, atualizados ou inalterados, unidades e cargos criados e motivos de linhas ignoradas. Erros 422 mostram linha, campo e mensagem. Arquivo, seleção e endereços permanecem disponíveis para correção e reenvio.

## Transferência do responsável

GET /managers fornece candidatos; a interface filtra ATIVO e envia o ID escolhido para POST /workspace/manager-transfer. O fluxo está disponível na aba Workspace e na ação existente da aba Conta.

A interface reaproveita seleção, aviso sobre permissões e confirmação da identidade Firebase. HTTP 409 é apresentado como conflito, com a mensagem da API e opção de voltar à seleção ou fechar; a mesma gravação não é repetida automaticamente. Outros erros permitem nova tentativa. Após sucesso, a autenticação é revalidada e a navegação retorna à Home.

## Colaboradores e estado das páginas

Somente requests de criação e edição de colaboradores usam name e workModel; respostas e contratos de gestores mantêm os nomes existentes.

As listagens de colaboradores, unidades e cargos ficam nos hooks das respectivas páginas, sem cache persistente ou store compartilhado. Ao voltar a essas páginas, as consultas são executadas novamente. A revalidação de autenticação após transferência desmonta rotas privadas e descarta estados administrativos da sessão anterior. A autorização das próximas requisições continua sob responsabilidade da API.

O estado de pagamento nas configurações é informativo até haver integração de consulta e gravação. O fluxo inicial de cadastro é separado.
