const assert = require('node:assert/strict')
const { test, afterEach } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const cache = new Map()
const auth = { currentUser: { getIdToken: async () => 'token' } }
function load(filename) {
  filename = path.resolve(filename)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  cache.set(filename, module)
  const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.VITE_API_IA_URL', "'https://chat.example.test'")
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', code)(specifier => {
    if (specifier === './firebase') return { firebaseAuth: auth }
    return specifier.startsWith('.') ? load(path.resolve(path.dirname(filename), `${specifier}.ts`)) : require(specifier)
  }, module, module.exports)
  return module.exports
}
const forms = load('src/utils/forms.ts')
const registration = load('src/utils/workspaceRegistrationReducer.ts')
const chat = load('src/services/chat.ts')
const originalFetch = global.fetch
const originalToken = auth.currentUser.getIdToken
afterEach(() => { global.fetch = originalFetch; auth.currentUser.getIdToken = originalToken })
function values() {
  return { name: ' Inspeção ', description: ' Segurança ', manager: ' Gestor ', nr: '', unit: '', deadline: '',
    questions: [{ id: 'q1', kind: 'text', title: ' Riscos? ', answer: '', options: [], multiple: false, required: true }] }
}

test('sanitiza sem alterar objetos originais e fornece erros por campo', () => {
  const original = values()
  const snapshot = structuredClone(original)
  const result = forms.validateAndSanitizeForm(original)
  assert.deepEqual(result.errors, {})
  assert.equal(result.values.name, 'Inspeção')
  assert.equal(result.values.questions[0].title, 'Riscos?')
  assert.deepEqual(original, snapshot)
  const invalid = forms.validateAndSanitizeForm({ ...values(), name: '', manager: '', deadline: '2026-02-30' })
  assert.deepEqual(Object.keys(invalid.errors), ['name', 'manager', 'deadline'])
})

test('valida perguntas, opções e limites de anexos antes de concluir', () => {
  for (const changes of [{ title: '' }, { kind: 'option', options: [] }, { kind: 'photo', maxFiles: 0, maxFileSizeMb: 10 }]) {
    const data = values()
    data.questions = [{ ...data.questions[0], ...changes }]
    assert.ok(forms.validateAndSanitizeForm(data).errors['questions.0'])
  }
})

test('transições do cadastro limpam erros e preservam sucesso contra reenvio', () => {
  const initial = Object.freeze(registration.initialRegistrationState)
  const failed = registration.registrationReducer(initial, { type: 'failed', error: 'Planilha inválida', failureStatus: 422, importErrors: [{ row: 2, field: 'email', message: 'Inválido' }] })
  const loading = registration.registrationReducer(failed, { type: 'started' })
  assert.equal(loading.status, 'loading')
  assert.equal(loading.error, '')
  assert.deepEqual(loading.importErrors, [])
  const success = registration.registrationReducer(loading, { type: 'succeeded', result: { workspaceId: 1, importErrors: [] } })
  assert.equal(registration.registrationReducer(success, { type: 'started' }), success)
  assert.deepEqual(registration.registrationReducer(success, { type: 'reset' }), initial)
})

test('chat não envia texto vazio, excessivo ou sessão inválida', async () => {
  let calls = 0
  global.fetch = async () => { calls++; throw Error('unexpected request') }
  await assert.rejects(chat.sendChatMessage(' ', null), /Digite uma mensagem/)
  await assert.rejects(chat.sendChatMessage('x'.repeat(10001), null), /10.000/)
  await assert.rejects(chat.getChatSessionMessages(''), /identificador/)
  assert.equal(calls, 0)
})

test('chat sanitiza a mensagem e propaga o sinal ao fetch', async () => {
  const controller = new AbortController()
  global.fetch = async (_url, init) => {
    assert.equal(init.signal, controller.signal)
    assert.deepEqual(JSON.parse(init.body), { message: 'Olá', session_id: 'session-1' })
    return new Response(JSON.stringify({ resposta: 'Olá!', session_id: 'session-1' }))
  }
  assert.equal((await chat.sendChatMessage(' Olá ', 'session-1', controller.signal)).resposta, 'Olá!')
})

test('cancelar durante a obtenção do token impede iniciar o fetch', async () => {
  const controller = new AbortController()
  let calls = 0
  auth.currentUser.getIdToken = async () => { controller.abort(); return 'token' }
  global.fetch = async () => { calls++; throw Error('unexpected request') }
  await assert.rejects(chat.listChatSessions(null, controller.signal), error => error.name === 'AbortError')
  assert.equal(calls, 0)
})

test('cancelamento de requisição não vira mensagem de erro de conexão', async () => {
  const controller = new AbortController()
  global.fetch = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    queueMicrotask(() => controller.abort())
  })
  await assert.rejects(chat.getChatSessionMessages('session-1', controller.signal), error => error.name === 'AbortError')
})
