# Astro Web

Aplicação React + TypeScript com Vite e React Router. Atualmente contém as telas de login, método de pagamento e criação de workspace, além do modal de explicação da cobrança.

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
  payment.css                  estilos da tela de pagamento
  payment-layout.css           proporções e adaptações do pagamento
  charge-explanation.css      estilos do modal de cobrança
```

As pastas reservadas não contêm implementações artificiais: seus arquivos `index.ts` apenas preservam a estrutura até haver uma necessidade real. Todos os arquivos dentro de `src/` são `.ts` ou `.tsx`.

As rotas existentes são `/` (login), `/paymentMethod` (pagamento) e `/createWorkspace` (código de criação). Os formulários ainda não têm autenticação, processamento de pagamento ou API implementados. A tela de código aceita a digitação e a colagem dos seis dígitos, mas a verificação depende de um serviço futuro. Copie `.env.example` para uma configuração local somente quando existir um serviço a conectar.
