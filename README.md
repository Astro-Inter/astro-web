# Astro Web

Protótipo de interface do Astro, feito com Vite, React, TypeScript e React Router.

## Executar

```bash
npm install
npm run dev
```

`npm run lint` verifica o código. `npm run build` executa a checagem de tipos e gera a versão de produção em `dist/`.

## Estrutura

```text
public/                  imagens, logotipo e ícones acessados por URL
src/
  components/            componentes de interface; cada um tem pasta e index.tsx
  hooks/                 estado e regras reutilizáveis, como useWorkspaceAddresses
  pages/                 composição das telas; cada página tem pasta e index.tsx
  routes/index.tsx       rotas, inclusive a página para caminhos desconhecidos
  types/                 entidades e contratos por domínio
  utils/                 máscaras e validações sem dependência da interface
  App.tsx                árvore de rotas
  main.tsx               montagem do React e importação dos estilos
styles/                  CSS global e das telas, fora de src/
```

`src/` contém apenas arquivos `.ts` e `.tsx`. Os arquivos estáticos ficam em `public/` e `styles/`. Não há módulo de serviço ou de autenticação porque o protótipo ainda não se conecta a uma API.

## Fluxo atual

`/` → `/paymentMethod` → `/createWorkspace` → `/accessKeyVerified` → `/createPassword` → `/includeCompanyInformation` → `/attachExcelFile` → `/setAddress` → `/workspaceCreated` → `/loadingScreen`.

Cada rota também pode ser aberta diretamente. Uma URL desconhecida abre a página **Página não encontrada**, com retorno para o início.

Os formulários mantêm estado local e as páginas controlam a navegação. O endereço das unidades usa `useWorkspaceAddresses` para adicionar, remover, editar e alternar sedes sem mutar os dados. As máscaras de e-mail, CNPJ, CEP, cartão e demais campos ficam em `src/utils/`. A planilha aceita `.xlsx` e `.xls` de até 10 MB e mostra erro no DOM quando o arquivo não atende a esses limites.

Este fluxo ainda é demonstrativo: login, pagamento, verificação da chave e finalização do workspace não chamam serviços externos nem persistem dados. A tela `/loadingScreen` é uma apresentação visual, não um estado de uma requisição. `.env.example` reserva `VITE_API_URL` para uma integração futura; não coloque chaves privadas em variáveis `VITE_`.

## Critérios DAD (14/05/2026)

| Critério | Estado nesta versão |
| --- | --- |
| M01–M04 | Estrutura Vite/React/TypeScript, componentes e páginas em pastas próprias, tipos de domínio e props tipadas. TypeScript em modo estrito; nenhum `any` em `src/`. |
| M05 | Sem comunicação externa por enquanto. Quando houver API, concentrar as chamadas tipadas e o tratamento de erro em `src/services/`. |
| M06–M08 | Estado local imutável; os efeitos dos diálogos têm dependências explícitas; listas que mudam usam identificadores estáveis. |
| M09 | Nenhuma rota atual recebe parâmetros. Verificar presença com `useParams` se forem adicionados. |
| M10 | Dez rotas do fluxo e rota curinga com retorno ao início. |
| M11 | Estrutura semântica, labels e foco nos diálogos presentes. Auditoria completa de contraste, teclado e leitor de tela ainda pendente. |
| M12 | Integração assíncrona ainda não implementada; loading, sucesso e erro deverão acompanhar cada operação real. |
| M13 | Publicação em Vercel ou GitHub Pages e URL acessível ainda pendentes. |
| M14 | O histórico atual tem 13 commits entre 16 e 21/09/2026; faltam 20 commits distribuídos por quatro semanas reais. Não criar commits artificiais. |

Os extras E01–E10 não foram assumidos como concluídos. Há validação do arquivo de planilha e gerenciamento de foco nos diálogos, mas a validação de todos os formulários e uma prova de acessibilidade completa ainda dependem de trabalho adicional. A integração com API, autenticação, pagamento e publicação devem ser planejados conforme as regras de produto e infraestrutura da equipe.
