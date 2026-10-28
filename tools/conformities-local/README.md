# Ambiente local de conformidades — SCRUM-657

Tarefa: https://luizacursino.atlassian.net/browse/SCRUM-657 (Sprint 7).
Branch dos três repositórios: `feat/SCRUM-657-conformidades-unidades`.

As views de listagem são `vw_conformidade_colaborador` (`07_vw_conformidade_colaborador.sql`) e `vw_conformidade_unidade` (`09_vw_conformidade_unidade.sql`), ambas no singular. API, testes e documentação usam esses nomes.

As rotas de colaboradores foram posteriormente padronizadas em `/conformities/collaborators`: GET/POST na base, GET/PUT em `/{id}`, PATCH em `/{id}/applicability` e POST multipart em `/import`. As rotas de unidades permanecem em `/conformities/units`. O caminho antigo `/conformities` foi substituído; o web local usa os novos caminhos.

O PostgreSQL desta tarefa foi instalado vazio usando os scripts locais alterados do repositório de banco. Não é uma cópia do banco publicado. Nenhuma migração foi executada no banco atual. As PRs desta tarefa contêm apenas as alterações de conformidades.

| Serviço | Endereço |
| --- | --- |
| WEB | http://127.0.0.1:5167 |
| API | http://127.0.0.1:8067 |
| PostgreSQL | 127.0.0.1:54657 / astro657 |
| MongoDB | 127.0.0.1:27657 / astro657 |
| Redis | 127.0.0.1:63657 |
| Firebase Auth Emulator | 127.0.0.1:9167 / demo-astro657 |

Conta fictícia principal: `gestor@astro.local`, senha de teste `AstroLocal657!`.
Outras contas com a mesma senha: `respondente@astro.local` (gestor da Matriz) e `outro@astro.local` (outro workspace, para testar isolamento).
As credenciais acima servem apenas aos serviços locais descartáveis.
PostgreSQL local: usuário `astro_local`, senha `astro657_local_only`.

Abra Conformidades para alternar entre Colaboradores e Unidades. A aba de Unidades permite adicionar manualmente, editar validade/NR e tornar não aplicável. Importação Excel continua exclusiva de colaboradores.

Em Formulários há três exemplos concluídos aguardando análise:

1. Inspeção NR1 na Filial: aprovar gera conformidade para a Filial.
2. Inspeção NR1 sem unidade: aprovar gera conformidade para a Matriz, unidade do destinatário.
3. Inspeção NR6 para reprovar: reprovar não gera conformidade.

A aprovação de formulário com NR calcula validade pela data de resposta em America/Sao_Paulo mais os meses de reciclagem. O exemplo NR1 tem resposta em 27/10/2026 e prazo de 24 meses: validade 27/10/2028. Aprovações acrescentam histórico; a listagem escolhe o aplicável de maior validade, depois maior ID. A unidade de fallback é consultada na aprovação. Uma conformidade já gerada mantém seu destinatário.

MongoDB e PostgreSQL têm transações separadas. Se a aprovação for salva e a conformidade falhar, repetir `POST /forms/{id}/review` com `{"status":"approved"}` reconcilia sem duplicar. A decisão não pode ser trocada. Não há reconciliação automática nesta versão. O contrato completo fica em `docs/unit-conformities.md` da API.

Para reiniciar, abra o Docker Desktop e execute no repositório WEB:

```powershell
./tools/conformities-local/Start.ps1
```

O script só inicia os contêineres exclusivos `astro657-*` e as portas desta tarefa. Não apaga volumes. API e Firebase Auth Emulator também rodam em contêineres Linux locais, pois o Java do Windows apresentou falha de sockets AF_UNIX mesmo em um programa mínimo. Os contêineres se comunicam pela rede privada `astro657-local`; todas as portas publicadas ficam em 127.0.0.1. O WEB continua em Vite no Windows.

Para encerrar somente os serviços desta tarefa, execute `./tools/conformities-local/Stop.ps1`. Ele preserva os volumes. Para aplicar futuras alterações Java, recompile o JAR na API e recrie seu contêiner com Docker Compose; o Vite atualiza o WEB durante o desenvolvimento.

O estado inicial das contas está em `.backup/conformidades-local/auth-state`, ignorado pelo Git. Os logs da API e do emulador podem ser consultados com `docker --context desktop-linux logs astro657-api` e `docker --context desktop-linux logs astro657-auth`. Os bancos persistem em volumes separados. O emulador precisa ser encerrado normalmente para exportar contas adicionais.

O WEB usa `.env.conformity-local`, sem substituir `.env` ou `.env.local`; `Start.ps1` copia o exemplo desta pasta quando o arquivo ainda não existe. A API usa o perfil `conformity-local`, `FIREBASE_AUTH_EMULATOR_HOST=astro657-auth:9167` e `--spring.config.import=`. O perfil normal mantém a autenticação Firebase atual. O perfil local recusa iniciar sem o emulador esperado. Tracking externo fica desativado no modo local. R2 e geocodificação externa não estão configurados: teste com formulários de texto; upload de imagens e essas integrações não fazem parte da verificação local.

Hibernate não cria nem modifica tabelas (`ddl-auto=none`); o schema é responsabilidade dos scripts oficiais. A validação global do Hibernate encontrou uma divergência preexistente entre `usuario.cpf CHAR(11)` no SQL e String/VARCHAR no mapeamento Java, por isso o perfil local não usa `validate`. As constraints novas e os fluxos desta tarefa são verificados diretamente no PostgreSQL.

Para recriar em outro PC, instale dependências dos três projetos, compile a API e inicie os serviços. O script Start.ps1 copia `.env.example` para `.env.conformity-local`, sempre usando o projeto demo e o emulador. Execute `node tools/conformities-local/initialize.cjs` apenas com a base `astro657` vazia; ele recusa bases já inicializadas e não remove dados. Depois exporte as contas do emulador com `firebase emulators:export .backup/conformidades-local/auth-state --project demo-astro657 --config tools/conformities-local/firebase.json`.

Verificação integrada, sempre contra localhost:

```powershell
node tools/conformities-local/check.cjs
```

O verificador cria seus próprios formulários fictícios e remove somente os registros criados por ele. Os três formulários de demonstração permanecem disponíveis.

As verificações integradas usam dados fictícios e serviços locais. A migração do banco atual será preparada separadamente, após aprovação; as PRs não executam essa migração.

## Indicadores de unidades na Home

A view local de estatísticas inclui as NRs vigentes exigidas em `unidade_nr` para unidades ativas, contando como pendentes os pares ainda sem conformidade. Inclui também conformidades aplicáveis de unidade já registradas fora desse vínculo, sem duplicar o par. Histórico exclusivamente não aplicável exclui o par; com algum aplicável, usa a maior validade aplicável. Preserva o cálculo anterior dos colaboradores, sem acrescentar requisitos de `cargo_nr` nesta alteração. Os valores mudam conforme os formulários forem aprovados; atualize a Home para consultá-los. Os testes SQL de unidades e a regressão de gestores passaram, e os totais foram confirmados em `GET /home/workspace`.
