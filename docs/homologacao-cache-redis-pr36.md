# Compatibilidade web com cache Redis da IA — PR 36

> Relatório da validação Redis, anterior aos ajustes visuais solicitados pelo
> usuário. Depois foram compactadas as fichas e substituído o download direto
> pela abertura do PDF no navegador. As contagens abaixo se referem à execução
> descrita; veja a PR para as verificações finais.


Homologação em 01/11/2026. Web `b31e337` (PR 77), que já inclui arquivo v1,
em worktree isolado. Alterações de formulários/dashboards da árvore original
foram preservadas. Nenhuma alteração em código de produção foi necessária:
foram acrescentadas somente evidências e testes de regressão. Sem merge/deploy.

## Revisões conferidas antes dos testes

- [API PR 36](https://github.com/Astro-Inter/astro-ai-api/pull/36): já mesclada
  às 16:16:58 UTC, embora a solicitação a descrevesse como pendente. Head
  `a5df1bb5a47bd4abe1bc7115d5b8c030e4e45fa0`, um commit; merge `c657c85`.
- [Catálogo PR 62](https://github.com/Astro-Inter/astro-database/pull/62):
  já mesclado às 16:17:27 UTC; head `cfa3812`, merge `8421086`.
- Lidos `docs/cache-redis.md` e o diff completo da PR 36. Não há alteração
  de schemas, campos, versões, ordem ou transporte POST/histórico.
- Backend local executado a partir do worktree original da revisão exata
  `a5df1bb`, sem usar a árvore suja da API. `/version` local confirmou o SHA.
  A variável de revisão local foi definida a partir do checkout conferido.
- `/version` publicado retornou `bf2f90998aba17d8b3480cfcbb6b0f65039b2f76`.
  A comparação GitHub confirmou que esse commit é descendente de `a5df1bb`
  (seis commits à frente, zero atrás). As consultas funcionais desta entrega
  usaram a API LOCAL, não a publicada.

## Inspeção do frontend

`safeChatImage` mantém HTTPS, domínio de armazenamento permitido e proibição
de credenciais na URL. `chatBlockAvatar` é compartilhado por ficha própria,
ficha de terceiro, galeria e célula de imagem da tabela. Falta de URL ou erro
de carregamento mostra iniciais. A mesma URL que falhou não é tentada de novo
num rerender. Não há cliente Redis, assinatura no cliente, renovação direta,
fetch autenticado de foto ou persistência de capacidades em storage do browser.
As imagens usam `referrerPolicy="no-referrer"`.

O browser decide se uma URL de imagem expirada pode ser carregada; ao receber
erro de imagem, o componente usa o mesmo fallback de outras indisponibilidades.
Não se acrescentou relógio, parser de assinatura ou tentativa de renovar a foto.
Uma URL diferente que venha do backend pode ser exibida normalmente.

`AstroChat` remonta a interface por UID. O controlador cancela operações
pendentes e ignora respostas antigas na desmontagem. Não se compartilha
estado de conversa/fotos entre contas. POST e histórico passam pelos mesmos
parser e componentes. Tabelas continuam com paginação local e gráficos usam
os agregados enviados; PDFs mantêm contrato, expiração e serviço próprio.

## Testes automatizados executados nesta entrega

`node --test tests/chatRedisCompatibility.test.cjs tests/chatBlocks.test.cjs tests/chatFiles.test.cjs`:
**31 passaram, zero falhas**. Os cinco novos casos cobrem os quatro contêineres
de fotos e a substituição por URL nova recebida. O teste existente do controlador
foi reforçado com foto, verificando sua remoção ao trocar de usuário e a rejeição
da resposta pendente da conta anterior.

Cobertura exercitada:

- Ficha própria e de terceiro, galeria e tabela com URL fictícia do mesmo formato
  recebido; igualdade de parser/renderização em POST e histórico.
- Foto ausente/nula, domínio indevido, erro de imagem representando falha ou
  expiração: iniciais, cartão preservado, sem fetch para renovar e sem storage.
- Paginação de tabelas sem rede, estado por mensagem e gráficos invariáveis;
  gráficos de zeros, metadados e blocos desconhecidos.
- PDF: contrato, prazo, indisponibilidade, download somente por clique sem token,
  cancelamento, falhas, lembrete/histórico sem renovar URL.

`npm run lint` e `git diff --check` passaram. Não foi necessário repetir o build
ou a suíte completa de 577 testes da entrega anterior: nenhum arquivo de produção
mudou; não se atribui aquela execução à homologação atual.

Na revisão LOCAL da API:

`python -B -m pytest -q -p no:cacheprovider -o pythonpath= <tests/test_avatar_urls.py> <tests/test_public_source_cache.py>`

**26 passaram**, com um aviso de dependência sobre Pydantic v1/Python 3.14.
Redis, signer e MCP são simulados nesses testes: autorização antes do hit,
MGET em lote, mesmo prazo sem renovar, cache inválido/expirado, falha de MGET,
fallback de coleta, TTL e allowlist. Isso não comprova ganho de velocidade real.

## Validação real via HTTP e renderizador do web

Login Firebase, autorização, SQL, histórico, revisão e geração de blocos da
API local permaneceram reais. Não foram substituídos Juiz, guardrails ou
permissões. Tokens, identificadores pessoais, conteúdo e URLs temporárias
ficaram em memória. Somente contagens/status/booleanos foram salvos no
[resultado sanitizado](homologacao-cache-redis-pr36.json).

| Caso | Resultado |
| --- | --- |
| Ficha própria, pedido direto “Meus dados.” | HTTP 200, texto + ficha_usuario; 2/2 blocos reconhecidos, uma imagem no HTML produzido pelo componente real. |
| Foto própria | GET sem token Astro, HTTP 200, image/png, conteúdo não vazio. |
| Listagem ampliada | HTTP 200, texto + tabela + texto; 3/3 blocos reconhecidos, 100 células de foto, três URLs presentes. Nenhuma imagem na primeira página porque essas três pessoas estavam em outras linhas; não foi tratado como erro. |
| Fotos da listagem | Dois GETs HTTP 200 image/jpeg; um HTTP 404 application/xml. Não foram criadas URLs substitutas. O fallback desse erro no componente foi exercitado no DOM simulado. |
| Histórico | HTTP 200, ficha própria e listagem com blocos exatamente iguais aos POSTs e HTML exatamente igual pelo renderizador real do frontend. |
| Outra conta | Login HTTP 200; consulta à conversa da primeira conta retornou 404. A troca da interface/remoção da imagem foi testada no controlador/DOM, não visualmente no navegador. |
| Ficha de terceiro selecionado da listagem | HTTP 200 com somente texto; sem ficha para homologar foto real. Não se fabricou cartão ou ampliou autorização. A tentativa não apareceu como turno de blocos aprovado no recorte de histórico. |

Houve também pedidos mais longos de ficha que retornaram somente texto e uma
listagem inicial de cinco pessoas com fotos nulas. Não foram convertidos em
fichas no cliente. Uma rodada imediatamente após login retornou 401; a rodada
posterior, aguardando quatro segundos após login sem alterar autenticação,
funcionou. Um token tinha emissão um segundo à frente do relógio local; é um
indício de sensibilidade ao horário, não causa definitiva do 401. Não foi
adicionada tolerância ou repetição automática no frontend.

## Interface e pendências

Web local iniciado em `http://127.0.0.1:5186/`, com `VITE_API_IA_URL` definido
somente no processo para `http://127.0.0.1:8016`. A API ficou ligada somente
em loopback, com CORS das origens locais; nenhuma configuração remota mudou.

O inventário de automação retornou **“Local browser use is disabled in Work
settings”**. Portanto esta entrega não afirma inspeção visual em browser real,
decodificação visual das fotos, navegação nas páginas reais nem troca visual
de conta. Foram usados o renderizador real React e DOM via JSDOM, com distinção
explícita em relação ao HTTP real. Não foi tentado contornar essa configuração.

Pendências:

1. Reativar navegador para homologação visual desktop/tela estreita, falha da foto
   real 404, navegação local e troca de conta completa.
2. Obter uma resposta aprovada de ficha de terceiro autorizado com foto. As
   tentativas reais ficaram só em texto; investigar no backend se recorrente,
   preservando validações e autorização. O componente está coberto por mock.
3. Medir hits e latência com Redis acessível entre instâncias. Não foi feita
   comparação de desempenho nesta tarefa; GETs de foto bem-sucedidos não provam
   hit Redis. A confirmação anterior da API permanece evidência de fallback,
   não de ganho de velocidade.

Critérios DAD aplicáveis conferidos: M04/M05 (contratos e responsabilidades
preservados), M06/M07/E03 (estado e cancelamento na troca de conta), M12
(fallback de imagem), E07 (renderização React). Não se declara auditoria global
de acessibilidade, publicação, histórico Git ou desempenho do projeto.
