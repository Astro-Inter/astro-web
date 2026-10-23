const assert = require('node:assert/strict')
const { test, afterEach } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const auth = { currentUser: { uid: 'gestor/uid', getIdToken: async () => 'firebase-token' } }
const cache = new Map()
function loadTs(filename) {
  filename = path.resolve(filename)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  cache.set(filename, module)
  const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.VITE_API_URL', "'https://api.example.test'").replaceAll('import.meta.env.DEV', 'false')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', code)(specifier => {
    if (specifier === './firebase') return { firebaseAuth: auth }
    return specifier.startsWith('.') ? loadTs(path.resolve(path.dirname(filename), `${specifier}.ts`)) : require(specifier)
  }, module, module.exports)
  return module.exports
}
const api = loadTs(path.join(__dirname, '../src/services/units.ts'))
const originalFetch = global.fetch
const user = auth.currentUser
afterEach(() => { global.fetch = originalFetch; auth.currentUser = user })

const unit = { unitId: 42, workspaceId: 3, name: 'Swift Pirituba', collaboratorCount: 530, status: 'ativo' }
function respond(data) { return new Response(JSON.stringify({ success: true, data }), { status: 200 }) }

test('conecta os cinco endpoints de unidades com token e contratos do Swagger', async () => {
  const calls = []
  const responses = [[unit], false, [{ nr: 6, descricao: 'EPI' }], [{ nr: 6, descricao: 'EPI', ativo: true }], null]
  global.fetch = async (url, init) => { calls.push({ url, ...init }); return respond(responses.shift()) }
  assert.deepEqual(await api.listUnits(), [{ id: '42', name: 'Swift Pirituba', collaboratorCount: 530, active: true }])
  assert.equal(await api.toggleUnitStatus('42'), false)
  assert.deepEqual(await api.listUnitNrs('42'), [{ nr: 6, descricao: 'EPI' }])
  assert.equal((await api.listUnitNrOptions('42'))[0].ativo, true)
  await api.updateUnitNrs('42', [{ nr: 6, ativo: false }, { nr: 10, ativo: true }])
  assert.deepEqual(calls.map(c => [c.method, new URL(c.url).pathname]), [
    ['GET', '/units'], ['PATCH', '/units/42/status'], ['GET', '/units/42/nrs/associated'],
    ['GET', '/units/42/nrs'], ['POST', '/units/42/nrs'],
  ])
  for (const call of calls) {
    assert.equal(call.headers.Authorization, 'Bearer firebase-token')
    assert.equal(new URL(call.url).search, '')
  }
  assert.equal(calls[1].body, undefined)
  assert.deepEqual(JSON.parse(calls[4].body), [{ nr: 6, ativo: false }, { nr: 10, ativo: true }])
})

test('erros HTTP, recusa da API e respostas inválidas são tratados', async () => {
  global.fetch = async () => new Response(JSON.stringify({ errors: ['Unidade inacessível.'] }), { status: 403 })
  await assert.rejects(api.listUnits(), /Unidade inacessível/)
  global.fetch = async () => new Response(JSON.stringify({ success: false, message: 'Operação recusada' }))
  await assert.rejects(api.toggleUnitStatus('42'), /Operação recusada/)
  global.fetch = async () => new Response('', { status: 401 })
  await assert.rejects(api.listUnits(), /sessão expirou/)
  global.fetch = async () => respond(null)
  await assert.rejects(api.listUnits(), /lista de unidades inválida/)
  global.fetch = async () => respond('false')
  await assert.rejects(api.toggleUnitStatus('42'), /status inválido/)
  global.fetch = async () => respond([{ ...unit, status: 'desconhecido' }])
  await assert.rejects(api.listUnits(), /dados inválidos/)
  global.fetch = async () => respond([{ nr: 6, descricao: 'EPI', ativo: 'true' }])
  await assert.rejects(api.listUnitNrOptions('42'), /vínculo/)
})

test('validação e sessão ausente impedem requisições indevidas', async () => {
  let calls = 0
  global.fetch = async () => { calls++; return respond(null) }
  await assert.rejects(api.toggleUnitStatus('unidade-local'), /Identificador/)
  await assert.rejects(api.updateUnitNrs('42', [{ nr: 6, ativo: true }, { nr: 6, ativo: false }]), /Seleção/)
  await assert.rejects(api.updateUnitNrs('42', [{ nr: -1, ativo: true }]), /Seleção/)
  await assert.rejects(api.updateUnitNrs('42', [{ nr: 6, ativo: 'true' }]), /Seleção/)
  await assert.rejects(api.updateUnitNrs('42', [{ nr: 1.5, ativo: false }]), /Seleção/)
  auth.currentUser = null
  await assert.rejects(api.listUnits(), /Entre na sua conta/)
  assert.equal(calls, 0)
})

test('leituras recebem AbortSignal e falhas de rede têm mensagem legível', async () => {
  const controller = new AbortController()
  global.fetch = async (_url, init) => { assert.equal(init.signal, controller.signal); controller.abort(); throw new DOMException('Abortado', 'AbortError') }
  await assert.rejects(api.listUnits(controller.signal), { name: 'AbortError' })
  global.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(api.listUnitNrOptions('42'), /conectar à API/)
})

test('cancelamento durante obtenção do token impede iniciar uma consulta', async () => {
  const controller = new AbortController()
  let calls = 0
  auth.currentUser = { uid: 'gestor', getIdToken: async () => { controller.abort(); return 'token' } }
  global.fetch = async () => { calls++; return respond([]) }
  await assert.rejects(api.listUnits(controller.signal), { name: 'AbortError' })
  assert.equal(calls, 0)
})

test('envia array vazio diretamente, com JSON e Bearer, sem UID', async () => {
  global.fetch = async (url, init) => {
    assert.equal(url, 'https://api.example.test/units/42/nrs')
    assert.equal(init.method, 'POST')
    assert.equal(init.headers.Authorization, 'Bearer firebase-token')
    assert.equal(init.headers['Content-Type'], 'application/json')
    assert.equal(init.body, '[]')
    return respond(null)
  }
  await api.updateUnitNrs('42', [])
})
