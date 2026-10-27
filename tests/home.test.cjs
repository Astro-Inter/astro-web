const assert = require('node:assert/strict')
const { test, afterEach } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const { renderToStaticMarkup } = require('react-dom/server')
const React = require('react')
const auth = { currentUser: { uid: 'gestor/uid', getIdToken: async () => 'firebase-token' } }
const cache = new Map()
function loadTs(filename) {
  filename = path.resolve(filename)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  cache.set(filename, module)
  const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.VITE_API_URL', "'https://api.example.test'").replaceAll('import.meta.env.DEV', 'false')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('require', 'module', 'exports', code)(specifier => {
    if (specifier === './firebase') return { firebaseAuth: auth }
    return specifier.startsWith('.') ? loadTs(path.resolve(path.dirname(filename), `${specifier}.ts`)) : require(specifier)
  }, module, module.exports)
  return module.exports
}
const api = loadTs(path.join(__dirname, '../src/services/home.ts'))
const Chart = loadTs(path.join(__dirname, '../src/components/complianceDonutChart/index.tsx')).default
const originalFetch = global.fetch
const user = auth.currentUser
afterEach(() => { global.fetch = originalFetch; auth.currentUser = user })
const statistics = {
  quantidade_unidades: 4, quantidade_colaboradores: 248, quantidade_requisitos: 20,
  quantidade_conformes: 12, quantidade_proximos_vencimento: 3, quantidade_vencidos: 1,
  quantidade_pendentes: 4, percentual_conformidade_geral: 60.25, data_referencia: '2026-10-12',
}
function respond(stats = statistics) {
  return new Response(JSON.stringify({ success: true, data: { nome_usuario: ' Gestor do workspace ', estatisticas: stats } }))
}

test('consulta home/workspace com Bearer sem UID e mapeia todos os indicadores do Swagger', async () => {
  const controller = new AbortController()
  global.fetch = async (url, init) => {
    assert.equal(url, 'https://api.example.test/home/workspace')
    assert.equal(init.headers.Authorization, 'Bearer firebase-token')
    assert.equal(init.headers.Accept, 'application/json')
    assert.equal(init.body, undefined)
    assert.equal(init.signal, controller.signal)
    return respond()
  }
  const home = await api.loadWorkspaceHome(controller.signal)
  assert.equal(home.userName, 'Gestor do workspace')
  assert.equal(home.referenceDate, '2026-10-12')
  assert.equal(home.complianceOverview.overallPercentage, 60.25)
  assert.deepEqual(home.complianceOverview.slices.map(slice => [slice.status, slice.percentage]), [
    ['compliant', 60], ['expiring', 15], ['expired', 5], ['pending', 20],
  ])
  assert.deepEqual(home.summaryStats.map(stat => [stat.value, stat.path]), [[4, '/mainUnitScreen'], [248, '/mainEmployeerScreen']])
  const markup = renderToStaticMarkup(React.createElement(Chart, { overview: home.complianceOverview }))
  assert.match(markup, /60,3%/)
  assert.match(markup, /Pendentes: 20%/)
})

test('workspace sem requisitos mantém os totais zero e apresenta gráfico vazio sem NaN', async () => {
  global.fetch = async () => respond(Object.fromEntries(Object.keys(statistics).map(key => [key, key === 'data_referencia' ? statistics[key] : 0])))
  const home = await api.loadWorkspaceHome()
  assert.ok(home.complianceOverview.slices.every(slice => slice.percentage === 0))
  assert.ok(home.summaryStats.every(stat => stat.value === 0))
  const markup = renderToStaticMarkup(React.createElement(Chart, { overview: home.complianceOverview }))
  assert.match(markup, /Sem requisitos/)
  assert.doesNotMatch(markup, /NaN|Infinity|conic-gradient/)
})

test('trata sessão ausente, recusas HTTP, erros de negócio e falhas de rede', async () => {
  global.fetch = async () => { throw new Error('não deveria enviar') }
  auth.currentUser = null
  await assert.rejects(api.loadWorkspaceHome(), /Entre na sua conta/)
  auth.currentUser = user
  global.fetch = async () => new Response('', { status: 401 })
  await assert.rejects(api.loadWorkspaceHome(), /sessão expirou/)
  global.fetch = async () => new Response('', { status: 403 })
  await assert.rejects(api.loadWorkspaceHome(), /permissão/)
  global.fetch = async () => new Response(JSON.stringify({ success: false, errors: ['Workspace indisponível.'] }))
  await assert.rejects(api.loadWorkspaceHome(), /Workspace indisponível/)
  global.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(api.loadWorkspaceHome(), /conectar à API da Home/)
})

test('rejeita respostas fora do contrato em vez de exibir dados fictícios', async () => {
  for (const body of [null, {}, { success: true, data: null }, { success: true, data: { nome_usuario: 'Gestor', estatisticas: {} } }]) {
    global.fetch = async () => new Response(JSON.stringify(body))
    await assert.rejects(api.loadWorkspaceHome(), /inválid/)
  }
  for (const stats of [{ ...statistics, quantidade_unidades: -1 }, { ...statistics, quantidade_colaboradores: '248' }, { ...statistics, percentual_conformidade_geral: 101 }]) {
    global.fetch = async () => respond(stats)
    await assert.rejects(api.loadWorkspaceHome(), /dados inválidos/)
  }
  global.fetch = async () => new Response('<html>Indisponível</html>', { status: 502 })
  await assert.rejects(api.loadWorkspaceHome(), /Não foi possível carregar/)
})

test('preserva cancelamento da leitura', async () => {
  const controller = new AbortController()
  global.fetch = async (_url, init) => {
    assert.equal(init.signal, controller.signal)
    controller.abort()
    throw new DOMException('Abortado', 'AbortError')
  }
  await assert.rejects(api.loadWorkspaceHome(controller.signal), { name: 'AbortError' })
})

test('erro 500 real da API informa falha no servidor em vez da mensagem genérica', async () => {
  global.fetch = async () => new Response(JSON.stringify({
    success: false, message: 'Erro interno do servidor', errors: ['Ocorreu um erro inesperado'], path: '/home/workspace',
  }), { status: 500 })
  await assert.rejects(api.loadWorkspaceHome(), /O servidor não conseguiu carregar os indicadores do workspace \(erro 500\)/)
})


test('foto vem da resposta da home; ausência ou URL inválida não impede os indicadores', async () => {
  for (const value of [undefined, null, '', 123, 'javascript:alert(1)', 'data:image/png;base64,AAA', 'https://', 'https://user:secret@example.test/photo.jpg']) {
    global.fetch = async () => new Response(JSON.stringify({ success: true, data: { nome_usuario: 'Ana Silva', estatisticas: statistics, profilePhotoUrl: value } }))
    const home = await api.loadWorkspaceHome()
    assert.equal(home.profilePhotoUrl, null)
    assert.equal(home.summaryStats[0].value, statistics.quantidade_unidades)
  }
  const url = 'https://images.example.test/avatar.jpg?signature=123'
  let requests = 0
  global.fetch = async endpoint => {
    requests++
    assert.equal(endpoint, 'https://api.example.test/home/workspace')
    return new Response(JSON.stringify({ success: true, data: { nome_usuario: 'Ana Silva', estatisticas: statistics, profilePhotoUrl: url } }))
  }
  assert.equal((await api.loadWorkspaceHome()).profilePhotoUrl, url)
  assert.equal(requests, 1)
})


test('aceita o contrato camelCase da home e mantém os mesmos indicadores do formato anterior', async () => {
  global.fetch = async () => respond()
  const legacy = await api.loadWorkspaceHome()
  global.fetch = async () => new Response(JSON.stringify({ success: true, data: {
    userName: ' Gestor do workspace ', profilePhotoUrl: 'https://images.example.test/profile.jpg',
    statistics: { unitCount: 4, collaboratorCount: 248, requirementCount: 20,
      compliantCount: 12, expiringSoonCount: 3, expiredCount: 1, pendingCount: 4,
      overallCompliancePercentage: 60.25, referenceDate: '2026-10-12' },
  } }))
  const current = await api.loadWorkspaceHome()
  assert.deepEqual(current, { ...legacy, profilePhotoUrl: 'https://images.example.test/profile.jpg' })
  global.fetch = async () => new Response(JSON.stringify({ success: true, data: { userName: 'Gestor', statistics: { unitCount: 4 } } }))
  await assert.rejects(api.loadWorkspaceHome(), /dados inválidos/)
})
