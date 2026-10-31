const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

function loadStorage() {
  const cache = new Map()
  let remote = null
  const api = { dashboardRequest: async (url, init = {}) => {
    if (!init.method) return { items: remote ? [remote] : [] }
    const body = JSON.parse(init.body)
    remote = { ...body, id: url.split('/').pop(), config: { ...body.config, artwork: body.config.artwork ?? 'overview' }, version: body.version + 1, createdAt: '2026-10-31T12:00:00Z', updatedAt: '2026-10-31T12:00:00Z' }
    return remote
  } }
  global.window = { dispatchEvent() {} }
  function load(filename) {
    filename = path.resolve(filename)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    new Function('require', 'module', 'exports', code)(name => {
      if (name === './dashboards') return api
      if (name === './firebase') return { firebaseAuth: { currentUser: { uid: 'artwork-test' } } }
      if (!name.startsWith('.')) return require(name)
      return load(path.resolve(path.dirname(filename), `${name}.ts`))
    }, module, module.exports)
    return module.exports
  }
  return load('src/services/dashboardStorage.ts')
}

test('ilustração persiste por visão, aceita dados antigos e rejeita opções desconhecidas', async () => {
  const previous = Object.getOwnPropertyDescriptor(global, 'localStorage')
  const items = new Map()
  Object.defineProperty(global, 'localStorage', { configurable: true, value: { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value) } })
  try {
    const storage = loadStorage(), identity = { userId: '1', workspaceId: '2', role: 'GESTOR_WORKSPACE' }
    const draft = { name: 'Minha visão', config: { filters: { start: '2026-10-01', end: '2026-10-28', granularity: 'mes' }, widgets: [] } }
    let saved = await storage.saveDashboard(draft, null, identity)
    assert.equal((await storage.loadSavedDashboards(identity))[0].config.artwork, 'overview')
    for (const artwork of ['overview', 'trends', 'bars', 'donut', 'area', 'progress', 'comparison', 'scatter', 'activity', 'metrics']) {
      saved = await storage.saveDashboard({ ...draft, config: { ...draft.config, artwork } }, saved, identity)
      assert.equal((await storage.loadSavedDashboards(identity))[0].config.artwork, artwork)
      assert.equal((await storage.loadSavedDashboards(identity))[0].name, 'Minha visão')
      assert.equal(items.size, 0)
      assert.doesNotMatch(saved.name, /\[ac1:d:/)
    }
    const before = [...items.values()][0]
    await assert.rejects(storage.saveDashboard({ ...draft, config: { ...draft.config, artwork: 'unknown' } }, saved, identity), /ilustração válida/)
    assert.equal([...items.values()][0], before)
  } finally { if (previous) Object.defineProperty(global, 'localStorage', previous); else delete global.localStorage }
})
