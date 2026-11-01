const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
function load(file) {
  const filename = path.resolve(file), module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', code)(name => {
    if (!name.startsWith('.')) return require(name)
    const target = path.resolve(path.dirname(filename), name)
    return load([target + '.ts', target + '.tsx', path.join(target, 'index.tsx')].find(candidate => fs.existsSync(candidate)))
  }, module, module.exports)
  return module.exports
}
const ChatBlocks = load('src/components/chatBlocks/index.tsx').default
const { parseBlocks, safeChatImage, keyChatItems } = load('src/utils/chatBlocks.ts')
const chart = { tipo: 'grafico_linhas', versao: 1, titulo: 'Evolução', fonte: 'Astro', unidade: 'participações', dados: [{ categoria: '2026-01', valor: 0 }, { categoria: '2026-02', valor: 2 }] }
test('mostra texto, gráfico e tabela na ordem com valores acessíveis', () => {
  const table = { tipo: 'tabela', versao: 1, titulo: 'Pessoas', colunas: [{ chave: 'nome', titulo: 'Nome' }], linhas: [{ nome: 'Ana' }], pagina: 1, total_paginas: 1, total: 1 }
  const html = renderToStaticMarkup(React.createElement(ChatBlocks, { fallback: 'Alternativa', blocks: [{ tipo: 'texto', conteudo: 'Antes' }, chart, table, { tipo: 'texto', conteudo: 'Depois' }] }))
  assert.ok(html.indexOf('Antes') < html.indexOf('Evolução') && html.indexOf('Evolução') < html.indexOf('Ana') && html.indexOf('Ana') < html.indexOf('Depois'))
  assert.match(html, /2026-02/); assert.doesNotMatch(html, /Alternativa/)
})
test('respostas antigas, blocos inválidos e versões desconhecidas usam o texto', () => {
  for (const blocks of [null, [], [{ tipo: 'desconhecido', versao: 1, titulo: 'x' }], [{ ...chart, versao: 2 }], [{ ...chart, dados: [{ categoria: 'x', valor: -1 }] }]]) {
    assert.equal(parseBlocks(blocks), null)
    assert.match(renderToStaticMarkup(React.createElement(ChatBlocks, { blocks, fallback: 'Resposta alternativa' })), /Resposta alternativa/)
  }
})
test('galeria usa iniciais e não carrega URLs externas não confiáveis', () => {
  const blocks = [{ tipo: 'galeria_usuarios', versao: 1, titulo: 'Pessoas', imagens: [{ nome: 'Ana Lima', email: null, url: 'https://evil.example/foto' }] }]
  const html = renderToStaticMarkup(React.createElement(ChatBlocks, { blocks, fallback: 'alternativa' }))
  assert.match(html, /AL/); assert.doesNotMatch(html, /evil.example/)
})
const tableWithPhoto = { tipo: 'tabela', versao: 1, titulo: 'Pessoas', colunas: [{ chave: 'foto', titulo: 'Foto' }, { chave: 'nome', titulo: 'Nome' }], linhas: [{ foto: { tipo: 'imagem', descricao: 'Foto de Ana Lima', url: 'https://evil.example/foto' }, nome: 'Ana Lima' }], pagina: 1, total_paginas: 1, total: 1 }
test('foto identificada na linha é exibida com alternativa segura', () => {
  const html = renderToStaticMarkup(React.createElement(ChatBlocks, { blocks: [tableWithPhoto], fallback: 'alternativa' }))
  assert.match(html, /Ana Lima/); assert.match(html, /AL/); assert.doesNotMatch(html, /evil.example/)
  assert.equal(parseBlocks([{ ...tableWithPhoto, linhas: [{ foto: { tipo: 'script', url: null, descricao: 'x' }, nome: 'Ana' }] }]), null)
})
const userCard = { tipo: 'ficha_usuario', versao: 1, titulo: 'Ficha do usuário', nome: 'Ana Lima', email: 'ana@example.com', cargo: 'Técnica', unidade: 'Matriz', perfil: null, situacao: null, foto: { tipo: 'imagem', descricao: 'Foto de Ana Lima', url: null }, conformidade: { percentual: 50, vigentes: 1, total: 2, data_referencia: '2026-10-30', criterio: 'NRs vigentes / NRs aplicáveis retornadas' } }
test('ficha mostra campos e conformidade cadastral sem inventar dados', () => {
  const html = renderToStaticMarkup(React.createElement(ChatBlocks, { blocks: [userCard], fallback: 'alternativa' }))
  assert.match(html, /Ana Lima/); assert.match(html, /50%/); assert.match(html, /1 de 2/)
  assert.equal(parseBlocks([{ ...userCard, conformidade: { ...userCard.conformidade, percentual: 100 } }]), null)
  const empty = { ...userCard, conformidade: { ...userCard.conformidade, percentual: null, total: 0, vigentes: 0 } }
  assert.match(renderToStaticMarkup(React.createElement(ChatBlocks, { blocks: [empty], fallback: 'alternativa' })), /Sem NRs aplicáveis/)
});

test('tabela tem região nomeada e acessível pelo teclado, com paginação validada', () => {
  const table = { tipo: 'tabela', versao: 1, titulo: 'Pessoas', colunas: [{ chave: 'nome', titulo: 'Nome' }], linhas: [{ nome: '<img src=x onerror=alert(1)>' }], pagina: 1, total_paginas: 1, total: 1 }
  const html = renderToStaticMarkup(React.createElement(ChatBlocks, { blocks: [table], fallback: 'alternativa' }))
  assert.match(html, /role="region" aria-label="Tabela: Pessoas" tabindex="0"/)
  assert.match(html, /&lt;img/)
  assert.doesNotMatch(html, /<img/)
  for (const changes of [{ pagina: 0 }, { pagina: 2 }, { total_paginas: '1' }, { total: -1 }, { colunas: [...table.colunas, ...table.colunas] }, { linhas: [{ nome: Infinity }] }]) {
    assert.equal(parseBlocks([{ ...table, ...changes }]), null)
  }
  assert.equal(parseBlocks([{ ...chart, dados: [{ categoria: 'a', valor: Number.MAX_VALUE }, { categoria: 'b', valor: Number.MAX_VALUE }] }]), null)
  assert.equal(parseBlocks([{ tipo: 'galeria_usuarios', versao: 1, titulo: 'Pessoas', imagens: [{ nome: 'Ana', url: null, email: 42 }] }]), null)
})

test('identificadores do chat permanecem estáveis ao reordenar dados e distinguem duplicatas', () => {
  const a = { nome: 'Ana' }, b = { nome: 'Bruno' }
  const first = keyChatItems([a, b]), reordered = keyChatItems([b, a])
  assert.equal(first[0].key, reordered[1].key)
  assert.equal(first[1].key, reordered[0].key)
  assert.equal(new Set(keyChatItems([a, a, b]).map(item => item.key)).size, 3)
  for (const url of ['javascript:alert(1)', 'http://x.r2.cloudflarestorage.com/photo', 'https://x.r2.cloudflarestorage.com.evil.test/photo', 'https://user:pass@x.r2.cloudflarestorage.com/photo']) assert.equal(safeChatImage(url), undefined)
  assert.equal(safeChatImage('https://x.r2.cloudflarestorage.com/photo'), 'https://x.r2.cloudflarestorage.com/photo')
})

function localTable(count, changes = {}) {
  return { tipo: 'tabela', versao: 2, titulo: 'Equipe', colunas: [{ chave: 'nome', titulo: 'Nome' }],
    linhas: Array.from({ length: count }, (_, i) => ({ nome: `Pessoa ${i + 1}` })), pagina: 1, total_paginas: 1,
    solicitada: count || 100, retornada: count, total: 273, limitado: false, tem_mais: true, motivo_limite: null, paginacao: 'local', ...changes }
}
const indicators = { tipo: 'indicadores', versao: 1, titulo: 'Indicadores globais', abrangencia: 'conjunto_autorizado', universo: 'Exigências antes do filtro de encaminhamento',
  indicadores: [{ chave: 'pares', rotulo: 'Exigências', valor: 120, unidade: 'pares_pessoa_nr', numerador: null, denominador: null, criterio: 'Pares exigidos' },
    { chave: 'percentual', rotulo: 'Vigência', valor: null, unidade: '%', numerador: 0, denominador: 0, criterio: 'Vigentes / exigidos' }] }
const context = { tipo: 'contexto_dados', versao: 1, fonte: 'Consulta autorizada', referencia: '2026-10-31', inicio: null, fim: null, escopo: 'Equipe autorizada',
  filtros: { nr: 10, status: ['ATIVO'], incluir_agendados: false }, criterios: ['Exigências cadastrais'], avisos: ['Célula ausente não comprova vigência.'],
  conjunto: { solicitada: 100, retornada: 100, total: 273, limitado: false, tem_mais: true, motivo_limite: null, unidade_total: 'pares pessoa/NR' } }
const matrix = { ...localTable(2, { solicitada: 100, total: 2, tem_mais: false }), tipo: 'matriz_conformidade', versao: 1, titulo: 'Matriz',
  chave_pessoa: 'referencia_pessoa', chave_categoria: 'nr', chave_situacao: 'situacao',
  colunas: ['referencia_pessoa', 'nome', 'nr', 'situacao', 'unidade', 'validade', 'conformidade_id', 'agendado', 'em_analise'].map(chave => ({ chave, titulo: chave })),
  linhas: [{ referencia_pessoa: 42, nome: 'Ana Lima', nr: 10, situacao: 'VIGENTE', unidade: 'Matriz', validade: '2027-01-01', conformidade_id: 5, agendado: false, em_analise: false },
    { referencia_pessoa: 43, nome: 'Ana Lima', nr: 10, situacao: 'SEM_REGISTRO', unidade: 'Filial', validade: null, conformidade_id: null, agendado: true, em_analise: true }] }
const htmlFor = blocks => renderToStaticMarkup(React.createElement(ChatBlocks, { blocks, fallback: '' }))

test('preserva blocos reconhecidos, ordem e aviso sem JSON ao encontrar tipo ou versão desconhecida', () => {
  const blocks = [{ tipo: 'texto', conteudo: 'Antes' }, indicators, { tipo: 'novo', segredo: 'nao-exibir' }, matrix, { ...chart, tipo: 'grafico_rosca' }, context, { tipo: 'texto', conteudo: 'Depois' }]
  const html = htmlFor(blocks)
  assert.equal(parseBlocks(blocks).length, 6)
  const labels = ['Antes', 'Indicadores globais', 'Matriz', 'Evolução', 'Contexto dos dados', 'Depois']
  labels.forEach((label, i) => { if (i) assert.ok(html.indexOf(labels[i - 1]) < html.indexOf(label)) })
  assert.match(html, /Parte da resposta/); assert.doesNotMatch(html, /nao-exibir/)
  assert.deepEqual(parseBlocks([{ ...chart, versao: 99 }, ...blocks]), parseBlocks(blocks))
})

test('valida 100 e 200 linhas locais e mantém semântica da tabela v1', () => {
  for (const count of [100, 200]) {
    const table = localTable(count)
    assert.equal(parseBlocks([table])[0].linhas.length, count)
    const html = htmlFor([table])
    assert.equal((html.match(/<tr>/g) || []).length, 11)
    assert.match(html, new RegExp(`Página 1 de ${count / 10}`))
    assert.match(html, new RegExp(`Recebidos: ${count} de 273`))
    assert.doesNotMatch(html, /Pedido limitado/)
    assert.equal(parseBlocks([{ ...table, versao: 1 }]), null)
  }
  assert.equal(parseBlocks([localTable(201)]), null)
  assert.equal(parseBlocks([localTable(100, { retornada: 99 })]), null)
  assert.equal(parseBlocks([localTable(100, { tem_mais: false })]), null)
  assert.equal(parseBlocks([localTable(100, { limitado: true })]), null)
})

test('distingue pedido atendido, corte de 200, corte por tamanho e total vazio', () => {
  const quantity = localTable(200, { solicitada: 500, limitado: true, motivo_limite: 'maximo_resultados' })
  assert.match(htmlFor([quantity]), /máximo de 200 resultados/)
  const bytes = { ...context, conjunto: { ...context.conjunto, retornada: 0, limitado: true, motivo_limite: 'tamanho_resposta' } }
  const html = htmlFor([bytes])
  assert.match(html, /tamanho da resposta/); assert.match(html, /Nenhuma linha recebida; existem registros/)
  const empty = { ...context, conjunto: { ...context.conjunto, retornada: 0, total: 0, tem_mais: false } }
  assert.match(htmlFor([empty]), /Recebidos: 0 de 0/); assert.doesNotMatch(htmlFor([empty]), /existem registros disponíveis/)
  assert.equal(parseBlocks([bytes, empty]).length, 2)
})

test('matriz preserva homônimos por referência e NR, metadados e todas as situações', () => {
  const html = htmlFor([matrix])
  assert.equal((html.match(/Ana Lima/g) || []).length, 2)
  for (const value of ['42', '43', 'VIGENTE', 'SEM_REGISTRO', '2027-01-01', 'Filial', 'Sim', 'Não']) assert.ok(html.includes(value))
  assert.equal(parseBlocks([{ ...matrix, linhas: [matrix.linhas[0], matrix.linhas[0]] }]), null)
  for (const situacao of ['VIGENTE', 'VENCIDA', 'SEM_VALIDADE', 'SEM_REGISTRO']) {
    assert.ok(parseBlocks([{ ...matrix, linhas: [{ ...matrix.linhas[0], situacao }, matrix.linhas[1]] }]))
  }
})

test('indicadores preservam sem base, unidade, universo e contagens; aceitam arredondamento da API', () => {
  const html = htmlFor([indicators])
  assert.match(html, /Sem base/); assert.doesNotMatch(html, /0%/)
  assert.match(html, /Numerador: 0 · Denominador: 0/); assert.match(html, /pares pessoa\/NR/)
  const ratio = { ...indicators.indicadores[1], valor: 3.12, numerador: 1, denominador: 32 }
  assert.ok(parseBlocks([{ ...indicators, indicadores: [ratio] }]))
  for (const invalid of [{ valor: 0 }, { numerador: 1 }, { denominador: -1 }]) {
    assert.equal(parseBlocks([{ ...indicators, indicadores: [{ ...indicators.indicadores[1], ...invalid }] }]), null)
  }
})

test('rosca mantém zeros e todos os gráficos disponibilizam valores sem fabricar meses', () => {
  for (const tipo of ['grafico_barras', 'grafico_linhas', 'grafico_setores', 'grafico_rosca']) {
    const zero = { ...chart, tipo, dados: [{ categoria: 'Mês informado', valor: 0 }] }
    const html = htmlFor([zero])
    assert.match(html, /Mês informado/); assert.match(html, /<strong>0<\/strong>/)
    assert.doesNotMatch(html, /NaN|Infinity|2026-03/)
    if (tipo === 'grafico_rosca' || tipo === 'grafico_setores') assert.match(html, /Sem valores para distribuir/)
  }
  assert.match(htmlFor([{ ...chart, tipo: 'grafico_rosca' }]), /chat-pie--donut/)
  assert.doesNotMatch(htmlFor([{ ...chart, tipo: 'grafico_rosca' }]), /chat-bars/)
})

test('ficha própria aceita opcionais, nome nulo, origem nula no legado e nenhuma conformidade inventada', () => {
  const card = { tipo: 'ficha_usuario', versao: 1, titulo: 'Meu perfil', origem: 'usuario_autenticado', nome: null, modalidade: 'HIBRIDO', foto: null }
  assert.ok(parseBlocks([card])); const html = htmlFor([card])
  assert.match(html, /Meu perfil/); assert.match(html, /HIBRIDO/); assert.match(html, /\?/)
  assert.doesNotMatch(html, /Conformidade|Cadastrado em|Status/)
  assert.ok(parseBlocks([{ ...userCard, origem: null }]))
})

async function withChatDom(run) {
  const { JSDOM } = require('jsdom'), { act } = React
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  const previous = { window: global.window, document: global.document, IS_REACT_ACT_ENVIRONMENT: global.IS_REACT_ACT_ENVIRONMENT, fetch: global.fetch }
  let requests = 0
  Object.assign(global, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true, fetch: () => { requests++; throw Error('Paginação não pode usar rede') } })
  const root = require('react-dom/client').createRoot(document.getElementById('root'))
  try { await run(root, dom, () => requests) } finally { await act(async () => root.unmount()); dom.window.close(); Object.assign(global, previous) }
}

test('paginação real no DOM é isolada por mensagem/bloco, sem rede e mantém agregados globais', async () => withChatDom(async (root, dom, requests) => {
  const { act } = React
  const blocks = [indicators, localTable(200), { ...chart, tipo: 'grafico_rosca' }, context]
  const messages = () => React.createElement(React.Fragment, null,
    React.createElement(ChatBlocks, { key: 'primeira', blocks, fallback: '' }),
    React.createElement(ChatBlocks, { key: 'segunda', blocks: [localTable(100)], fallback: '' }))
  await act(async () => root.render(messages()))
  const graphics = document.querySelector('figure').outerHTML, cards = document.querySelector('.chat-indicators').outerHTML
  const next = () => document.querySelectorAll('nav button')[1]
  for (let page = 2; page <= 20; page++) await act(async () => next().click())
  const tables = document.querySelectorAll('tbody')
  assert.match(tables[0].textContent, /Pessoa 191/); assert.match(tables[1].textContent, /Pessoa 1/)
  assert.equal(next().disabled, true)
  assert.match(document.querySelectorAll('nav')[0].textContent, /Página 20 de 20/)
  assert.match(document.querySelectorAll('nav')[1].textContent, /Página 1 de 10/)
  assert.equal(document.querySelector('figure').outerHTML, graphics)
  assert.equal(document.querySelector('.chat-indicators').outerHTML, cards)
  assert.equal(requests(), 0)
  // Histórico traz o mesmo snapshot de blocos e reinicia apenas páginas visuais ao reabrir.
  await act(async () => root.render(null))
  const history = JSON.parse(JSON.stringify({ role: 'assistant', content: '', blocos: blocks }))
  assert.equal(htmlFor(history.blocos), htmlFor(blocks))
  await act(async () => root.render(React.createElement(ChatBlocks, { blocks: history.blocos, fallback: history.content })))
  assert.match(document.querySelector('nav').textContent, /Página 1 de 20/)
  assert.equal(requests(), 0)
}))

test('foto com falha de carregamento usa iniciais sem persistência', async () => withChatDom(async (root, dom) => {
  const { act } = React
  await act(async () => root.render(React.createElement(ChatBlocks, { blocks: [{ ...userCard, foto: { ...userCard.foto, url: 'https://example.r2.cloudflarestorage.com/photo' } }], fallback: '' })))
  assert.equal(document.querySelector('img').getAttribute('referrerpolicy'), 'no-referrer')
  await act(async () => document.querySelector('img').dispatchEvent(new dom.window.Event('error')))
  assert.equal(document.querySelector('img'), null)
  assert.match(document.querySelector('.chat-gallery-person').textContent, /AL/)
  assert.equal(dom.window.localStorage.length, 0)
}))

test('prévia do POST e histórico usa blocos sem depender de resposta legada', () => {
  const { chatMessageText } = load('src/utils/chatMessageText.ts')
  assert.equal(chatMessageText(undefined, [indicators, context]), 'Indicadores globais · Contexto dos dados')
  assert.equal(chatMessageText('', [indicators, context]), chatMessageText(undefined, [indicators, context]))
  assert.equal(chatMessageText('Legado', []), 'Legado')
  assert.equal(chatMessageText('Antigo', [{ tipo: 'texto', conteudo: 'Atual' }]), 'Atual')
})

test('fixture de homologação visual usa somente contratos reconhecidos', () => {
  const fixture = JSON.parse(fs.readFileSync('tools/chat-blocks-preview/fixture.json', 'utf8').replace(/^\uFEFF/, ''))
  assert.equal(parseBlocks(fixture).length, fixture.length)
})

test('controlador mantém POST/histórico, retoma sessão e isola troca de usuário com operação pendente', async () => withChatDom(async root => {
  const { act } = React, cache = new Map(), auth = { user: { uid: 'primeira' }, status: 'ready' }
  const blocks = [indicators, localTable(100), chart, context], calls = []
  let state, pendingResolve, pendingSignal
  const services = {
    ChatApiError: class extends Error {},
    listChatSessions: async () => ({ sessions: [], next_cursor: null }),
    getChatSessionMessages: async () => ({ session_id: 'sessao', status: 'encerrada', total: 1, mensagens: [{ role: 'assistant', content: '', blocos: structuredClone(blocks) }] }),
    startChatSession: async id => { calls.push(['retomar', id]) },
    sendChatMessage: async (_text, id) => { calls.push(['enviar', id]); return { session_id: 'sessao', agentes_chamados: [], blocos: structuredClone(blocks) } },
  }
  function loader(file) {
    const filename = path.resolve(file)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText
    new Function('require', 'module', 'exports', code)(name => {
      if (name.endsWith('useAuthentication')) return { useAuthentication: () => auth }
      if (name === 'react-router-dom') return { useNavigate: () => () => {} }
      if (name.endsWith('/services/chat')) return services
      if (name === '../astroChatView') return { __esModule: true, default: Probe }
      if (!name.startsWith('.')) return require(name)
      const target = path.resolve(path.dirname(filename), name)
      return loader([target + '.ts', target + '.tsx', path.join(target, 'index.tsx')].find(candidate => fs.existsSync(candidate)))
    }, module, module.exports)
    return module.exports
  }
  const useController = loader('src/hooks/useAstroChatController.ts').useAstroChatController
  function Probe() {
    const controller = useController()
    React.useEffect(() => { state = controller }, [controller])
    return React.createElement('div', null, controller.chat.messages.filter(m => m.author === 'astro').map(m => React.createElement(ChatBlocks, { key: m.id, blocks: m.blocos, fallback: m.text })))
  }
  const Chat = loader('src/components/astroChat/index.tsx').default
  await act(async () => root.render(React.createElement(Chat)))
  await act(async () => state.sendMessage('Consultar'))
  const posted = document.getElementById('root').innerHTML
  assert.deepEqual(state.chat.messages[1].blocos, blocks)
  await act(async () => state.selectSession('sessao'))
  assert.equal(document.getElementById('root').innerHTML, posted)
  assert.deepEqual(state.chat.messages[0].blocos, blocks)
  await act(async () => state.sendMessage('Continuar'))
  assert.deepEqual(calls.slice(-2), [['retomar', 'sessao'], ['enviar', 'sessao']])
  services.sendChatMessage = (_text, _id, signal) => { pendingSignal = signal; return new Promise(resolve => { pendingResolve = resolve }) }
  let operation
  await act(async () => { operation = state.sendMessage('Pendente') })
  auth.user = { uid: 'segunda' }
  await act(async () => root.render(React.createElement(Chat)))
  assert.equal(pendingSignal.aborted, true)
  assert.equal(state.chat.messages.length, 0)
  assert.equal(state.chat.sessionId, null)
  await act(async () => { pendingResolve({ session_id: 'sessao-antiga', blocos: blocks }); await operation })
  assert.equal(state.chat.messages.length, 0)
  assert.equal(document.querySelector('.chat-data-card'), null)
}))
