# Astro Web

Interface web do Astro para gestão de colaboradores, unidades, cargos, conformidades, eventos e formulários.

Aplicação publicada: [Astro Web — GitHub Pages](https://astro-inter.github.io/astro-web/).

## Tecnologias

React, TypeScript, Vite, React Router e Firebase Authentication. Os dados são consultados nas APIs configuradas para o ambiente.

## Desenvolvimento

Use Node.js 24. Na raiz do projeto:

```bash
cp .env.example .env
npm ci
npm run dev
```

Preencha as variáveis do Firebase e as URLs dos serviços no arquivo `.env`. O exemplo de configuração está em `.env.example`. Nunca versione credenciais; variáveis com prefixo `VITE_` ficam públicas no navegador.

| Variável | Serviço |
| --- | --- |
| `VITE_FIREBASE_*` | Configuração do projeto Firebase e autenticação |
| `VITE_API_URL` | API principal |
| `VITE_API_IA_URL` | API do chatbot |
| `VITE_DASHBOARD_API_URL` | API publicada de dashboards |
| `VITE_DASHBOARD_API_PROXY_URL` | Destino do proxy de dashboards no desenvolvimento |
| `VITE_PASSWORD_RESET_API_URL` | Serviço de recuperação de senha |
| `VITE_NR_DATA_MODE` | `api` para o catálogo real ou `demo` para demonstração local |
| `VITE_GTM_ID` e `VITE_TRACKING_ENABLED` | Configuração do tracking |

O servidor Vite encaminha as chamadas de desenvolvimento pelos proxies definidos em `vite.config.ts`. Em produção, o navegador acessa os serviços diretamente; as APIs precisam permitir a origem do frontend em sua configuração de CORS.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run lint` | Verifica padrões estáticos e regras dos hooks |
| `npm test` | Executa os testes |
| `npm run build` | Verifica os tipos e gera o build em `dist/` |
| `npm run preview` | Serve o build localmente |

## Estrutura

- `src/components/`: componentes compartilhados.
- `src/pages/`: páginas e composição dos fluxos.
- `src/hooks/`: estado e comportamento reutilizável.
- `src/services/`: integrações com APIs e serviços externos.
- `src/types/`: tipos e contratos do domínio.
- `src/utils/`: validações, máscaras e utilitários.
- `src/routes/`: roteamento e carregamento das páginas.
- `styles/`: estilos da aplicação.
- `public/`: imagens, ícones e licenças.
- `tests/`: testes e dados de teste em `tests/fixtures/`.
- `docs/`: documentação dos recursos e contratos.

Páginas e componentes ficam em pastas próprias com `index.tsx`. Os arquivos de `src/` usam TypeScript; estilos e imagens ficam fora dessa pasta.

## Documentação

- [Acessibilidade](docs/acessibilidade.md)
- [Níveis de acesso](docs/niveis-de-acesso.md)
- [Configurações do workspace](docs/workspace-settings-scrum608.md)
- [Conta e perfil](docs/conta.md)
- [Recuperação de senha](docs/recuperacao-de-senha.md)
- [Conformidades](docs/conformidades.md)
- [Eventos](docs/eventos.md)
- [Formulários](docs/formularios.md)
- [Análise de respostas](docs/validacao-formularios.md)
- [Dashboards](docs/DASHBOARDS-EDITAVEIS.md)
- [Blocos do chatbot](docs/chat-blocos.md)
- [Tracking](docs/TRACKING.md)

## Publicação

O workflow `.github/workflows/pages.yml` publica a branch `main` no GitHub Pages. Configure as variáveis e os secrets usados pelo workflow nas configurações do repositório. O build gera o fallback de rotas necessário ao React Router.

O workflow de CI executa instalação, lint, build e testes nos pushes e pull requests para `main`.
