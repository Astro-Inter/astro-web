# Astro Web

Aplicação React + TypeScript com Vite e React Router. Atualmente contém as telas de login, método de pagamento, criação de workspace, chave verificada, criação de senha, dados da empresa, anexo de planilha, endereços das unidades e carregamento, além dos modais explicativos.

## Executar

```bash
npm install
npm run dev
```

- `npm run build`: valida o TypeScript e gera a versão de produção.
- `npm run lint`: executa a análise estática.

## Organização

```text
public/                       imagens estáticas acessadas por URL
src/
  components/                 componentes de apresentação, um por pasta
  pages/                      composição das telas, um index.tsx por página
  routes/index.tsx            mapeamento das rotas
  types/                       tipos compartilhados por domínio
  assets/                      reservado para recursos futuros em TypeScript
  contexts/                    reservado para contextos quando necessários
  hooks/                       reservado para hooks quando necessários
  reducers/                    reservado para reducers quando necessários
  services/                    reservado para acesso a APIs quando necessário
  utils/                       reservado para validação e utilitários
  App.tsx                      entrada da árvore de rotas
  main.tsx                     montagem do React, Router, fonte e estilos
styles/                       CSS fora de src/ (regra do projeto)
  global.css                   tokens, reset e estilos compartilhados
  login.css                    estilos da tela de login
  create-workspace.css         campos de código da criação de workspace
  access-key-verified.css      tela de confirmação da chave
  create-password.css          tela de criação de senha
  include-company-information.css  tela de dados da empresa
  attach-excel-file.css        tela de anexo de planilha
  set-address.css              tela de endereços das unidades
  loading-screen.css           tela de carregamento
  payment.css                  estilos da tela de pagamento
  payment-layout.css           proporções e adaptações do pagamento
  charge-explanation.css      estilos do modal de cobrança
  spreadsheet-explanation.css estilos do modal de modelo de planilha
```

As pastas reservadas não contêm implementações artificiais: seus arquivos `index.ts` apenas preservam a estrutura até haver uma necessidade real. Todos os arquivos dentro de `src/` são `.ts` ou `.tsx`.

As rotas existentes são `/` (login), `/paymentMethod` (pagamento), `/createWorkspace` (código de criação), `/accessKeyVerified` (confirmação), `/createPassword` (criação de senha), `/includeCompanyInformation` (dados da empresa), `/attachExcelFile` (anexo de planilha), `/setAddress` (endereços das unidades) e `/loadingScreen` (carregamento). Os formulários ainda não têm autenticação, processamento de pagamento ou API implementados. A tela de código aceita a digitação e a colagem dos seis dígitos; o botão de verificação encaminha para a confirmação visual mesmo com os campos vazios, sem validar o código em um serviço. "Começar" abre a tela de senha; "Continuar" nessa tela abre os dados da empresa sem validar ou salvar a senha. O formulário da empresa formata o CNPJ e encaminha para o anexo de planilha. Essa tela aceita arquivos `.xlsx` e `.xls` de até 10 MB por seleção ou arrastar e soltar; "Continuar" abre os endereços sem enviar a planilha a um serviço. O link do modelo abre um modal com a estrutura de exemplo. Na tela de endereços é possível alternar, adicionar e remover sedes; "Finalizar workspace" abre a tela de carregamento, ainda sem persistir os endereços. Copie `.env.example` para uma configuração local somente quando existir um serviço a conectar.
