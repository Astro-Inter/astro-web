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

test('importa os dois schemas locais para a API sem perder visões nem sobrescrever o backup original', async () => {
  const previous = Object.getOwnPropertyDescriptor(global, 'localStorage')
  const entries = new Map()
  Object.defineProperty(global, 'localStorage', { configurable: true, value: { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) } })
  try {
    const identity = { userId: '1', workspaceId: '2', role: 'GESTOR_WORKSPACE' }
    const saved = { id: '00000000-0000-4000-8000-000000000001', name: 'Visão preservada', config: { filters: { start: '2026-10-01', end: '2026-10-28', granularity: 'mes' }, widgets: [], artwork: 'trends' }, version: 1, createdAt: '2026-10-31T12:00:00Z', updatedAt: '2026-10-31T12:00:00Z' }
    const key = 'astro:dashboard-views:v1:artwork-test:1:2'
    for (const schema of [{ _versao: 1 }, { schemaVersion: 1 }]) {
      entries.clear()
      const storage = loadStorage(), original = JSON.stringify({ ...schema, items: [saved] })
      entries.set(key, original)
      const imported = await storage.loadSavedDashboards(identity)
      assert.equal(imported[0].id, saved.id)
      assert.equal(imported[0].config.artwork, 'trends')
      assert.equal(entries.get(key), original)
      assert.equal(entries.get(`${key}:migrado`), '1')
    }
    const storage = loadStorage(), unsupported = JSON.stringify({ _versao: 99, items: [saved] })
    entries.delete(`${key}:migrado`)
    entries.set(key, unsupported)
    await assert.rejects(storage.loadSavedDashboards(identity), /preservados/)
    assert.equal(entries.get(key), unsupported)
  } finally { if (previous) Object.defineProperty(global, 'localStorage', previous); else delete global.localStorage }
})

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
