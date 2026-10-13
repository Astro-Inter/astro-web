const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const path = require('node:path')

function harness() {
  const slots = []
  let cursor = 0
  let cleanup
  let login = async () => ({ user: { uid: 'new-manager' } })
  let resets = 0
  const calls = []
  const context = { draft: { email: 'new-manager@example.com', password: ' Senha123 ' }, result: { workspaceId: 42 }, reset: () => { resets++ } }
  const react = {
    useState(initial) {
      const index = cursor++
      slots[index] ??= { value: initial }
      return [slots[index].value, value => { slots[index].value = value }]
    },
    useRef(initial) {
      const index = cursor++
      slots[index] ??= { current: initial }
      return slots[index]
    },
    useEffect(effect) { if (!cleanup) cleanup = effect() },
  }
  const module = { exports: {} }
  const source = fs.readFileSync(path.join(__dirname, '../src/hooks/useCreatedWorkspaceLogin.ts'), 'utf8')
  new Function('require', 'module', 'exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(specifier => {
    if (specifier === 'react') return react
    if (specifier === './useWorkspaceRegistration') return { useWorkspaceRegistration: () => context }
    if (specifier === '../services/authentication') return { loginWithEmailAndPassword: async credentials => { calls.push(credentials); return login(credentials) } }
    throw new Error(`Dependência inesperada: ${specifier}`)
  }, module, module.exports)
  return { context, calls, get resets() { return resets }, respondWith(fn) { login = fn }, render() { cursor = 0; return module.exports.useCreatedWorkspaceLogin() }, unmount() { cleanup?.() } }
}

test('continuar autentica exatamente o gestor criado e limpa o rascunho somente após sucesso', async () => {
  const env = harness()
  assert.equal(await env.render().submit(), true)
  assert.deepEqual(env.calls, [{ email: 'new-manager@example.com', password: ' Senha123 ' }])
  assert.equal(env.resets, 1)
  assert.equal(env.render().pending, false)
})

test('erro no login preserva cadastro concluído e permite repetir só a autenticação', async () => {
  const env = harness()
  env.respondWith(async () => { throw new Error('Não foi possível conectar.') })
  assert.equal(await env.render().submit(), false)
  assert.equal(env.resets, 0)
  assert.equal(env.render().error, 'Não foi possível conectar.')
  assert.equal(env.context.result.workspaceId, 42)
  env.respondWith(async () => ({ user: { uid: 'new-manager' } }))
  assert.equal(await env.render().submit(), true)
  assert.equal(env.calls.length, 2)
  assert.equal(env.resets, 1)
})

test('bloqueia duplo clique e limpa credenciais se o observador abrir a Home antes da promessa', async () => {
  const env = harness()
  let resolve
  env.respondWith(() => new Promise(done => { resolve = done }))
  const first = env.render().submit()
  assert.equal(env.render().pending, true)
  assert.equal(await env.render().submit(), false)
  assert.equal(env.calls.length, 1)
  env.unmount()
  resolve({ user: { uid: 'new-manager' } })
  assert.equal(await first, true)
  assert.equal(env.resets, 1)
})

test('não autentica antes da confirmação da API nem inventa credenciais para confirmações antigas', async () => {
  const env = harness()
  env.context.result = null
  assert.equal(await env.render().submit(), false)
  env.context.result = { workspaceId: 42 }
  env.context.draft.password = ''
  assert.equal(env.render().canSignIn, false)
  assert.equal(await env.render().submit(), false)
  assert.equal(env.calls.length, 0)
  assert.equal(env.resets, 0)
})
