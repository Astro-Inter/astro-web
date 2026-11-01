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
const api = loadTs(path.join(__dirname, '../src/services/roles.ts'))
const originalFetch = global.fetch
const user = auth.currentUser
afterEach(() => { global.fetch = originalFetch; auth.currentUser = user })
const role = { roleId: 42, workspaceId: 3, name: 'Gerente', collaboratorCount: 5, status: 'ativo' }
const values = { name: ' Gerente ', active: true }
function respond(data) { return new Response(JSON.stringify({ success: true, data }), { status: 200 }) }

test('conecta os sete endpoints somente com token e DTOs do Swagger', async () => {
  const calls = []
  const responses = [[role], null, { ...role, name: 'Diretor' }, false, [{ nrCode: 6, description: 'EPI' }], [{ nr: 6, description: 'EPI', active: true }], null]
  global.fetch = async (url, init) => { calls.push({ url, ...init }); return respond(responses.shift()) }
  assert.deepEqual(await api.listRoles(), [{ id: '42', name: 'Gerente', collaboratorCount: 5, active: true }])
  await api.createRole(values)
  assert.equal((await api.updateRole('42', { name: 'Diretor', active: true })).name, 'Diretor')
  assert.equal(await api.toggleRoleStatus('42'), false)
  assert.equal((await api.listRoleNrs('42'))[0].nrCode, 6)
  assert.equal((await api.listRoleNrOptions('42'))[0].active, true)
  await api.updateRoleNrs('42', [{ nr: 6, active: false }, { nr: 10, active: true }])
  assert.deepEqual(calls.map(c => [c.method, new URL(c.url).pathname]), [
    ['GET', '/roles'], ['POST', '/roles'], ['PUT', '/roles/42'], ['PATCH', '/roles/42/status'],
    ['GET', '/roles/42/nrs'], ['GET', '/roles/42/nrs/options'], ['POST', '/roles/42/nrs'],
  ])
  for (const call of calls) {
    assert.equal(call.headers.Authorization, 'Bearer firebase-token')
    assert.equal(new URL(call.url).search, '')
    if (call.body) {
      assert.equal(Object.hasOwn(JSON.parse(call.body), 'firebaseUid'), false)
      assert.equal(Object.hasOwn(JSON.parse(call.body), 'firebase_uid'), false)
    }
    if (call.method === 'GET' || call.method === 'PATCH') assert.equal(call.body, undefined)
  }
  assert.deepEqual(JSON.parse(calls[1].body), { name: 'Gerente', status: 'ativo' })
  assert.equal(calls[3].body, undefined)
  assert.equal(calls[3].headers['Content-Type'], undefined)
  assert.deepEqual(JSON.parse(calls[6].body).nrs, [{ nr: 6, active: false }, { nr: 10, active: true }])
})

test('recusas HTTP e success false preservam erros da API; respostas inválidas são rejeitadas', async () => {
  global.fetch = async () => new Response(JSON.stringify({ message: 'Cargo duplicado', errors: ['Já existe esse cargo.'] }), { status: 409 })
  await assert.rejects(api.createRole(values), /Já existe esse cargo/)
  global.fetch = async () => new Response(JSON.stringify({ success: false, message: 'Operação recusada' }))
  await assert.rejects(api.toggleRoleStatus('42'), /Operação recusada/)
  global.fetch = async () => new Response('', { status: 403 })
  await assert.rejects(api.listRoles(), /permissão/)
  global.fetch = async () => respond(null)
  await assert.rejects(api.listRoles(), /lista de cargos inválida/)
  global.fetch = async () => respond('false')
  await assert.rejects(api.toggleRoleStatus('42'), /status inválido/)
  global.fetch = async () => respond([{ ...role, status: 'desconhecido' }])
  await assert.rejects(api.listRoles(), /dados inválidos/)
})

test('validação e sessão ausente impedem envio de dados inválidos', async () => {
  let calls = 0
  global.fetch = async () => { calls++; return respond(null) }
  await assert.rejects(api.createRole({ name: ' ', active: true }), /2 caracteres/)
  await assert.rejects(api.updateRole('cargo-local', values), /Identificador/)
  await assert.rejects(api.updateRoleNrs('42', [{ nr: 6, active: true }, { nr: 6, active: false }]), /Seleção/)
  auth.currentUser = null
  await assert.rejects(api.listRoles(), /Entre na sua conta/)
  assert.equal(calls, 0)
})

test('repasses de AbortSignal cancelam leitura e falhas de rede têm mensagem para o usuário', async () => {
  const controller = new AbortController()
  global.fetch = async (_url, init) => { assert.equal(init.signal, controller.signal); controller.abort(); throw new DOMException('Abortado', 'AbortError') }
  await assert.rejects(api.listRoles(controller.signal), { name: 'AbortError' })
  global.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(api.listRoleNrOptions('42'), /conectar à API/)
})
