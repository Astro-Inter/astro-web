const assert = require('node:assert/strict')
const { test, afterEach } = require('node:test')
const fs = require('node:fs')
const ts = require('typescript')
const auth = { currentUser: { getIdToken: async () => 'firebase-token' } }
const moduleApi = { exports: {} }
const code = ts.transpileModule(fs.readFileSync('src/services/nrRecommendations.ts', 'utf8').replaceAll('import.meta.env.VITE_API_IA_URL', "'https://ai.example.test/'"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
new Function('require', 'module', 'exports', code)(() => ({ firebaseAuth: auth }), moduleApi, moduleApi.exports)
const api = moduleApi.exports
const originalFetch = global.fetch, user = auth.currentUser
const suggestion = { numero: 12, nome: 'Máquinas e equipamentos', justificativa: 'Opera máquinas no cargo.', confianca: 'alta' }
const body = { cargo_id: 3, cargo: 'Operador', quantidade: 1, nrs_sugeridas: [suggestion] }
afterEach(() => { global.fetch = originalFetch; auth.currentUser = user })

test('consulta o endpoint support com Bearer Firebase, sem payload ou escrita de vínculos', async () => {
  const calls = []
  global.fetch = async (url, init) => { calls.push({ url, ...init }); return Response.json(body) }
  const controller = new AbortController()
  assert.deepEqual(await api.suggestPositionNrs('3', controller.signal), [suggestion])
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://ai.example.test/support/cargos/3/nrs-sugeridas')
  assert.equal(calls[0].method, 'POST')
  assert.equal(calls[0].headers.Authorization, 'Bearer firebase-token')
  assert.equal(calls[0].body, undefined)
  controller.abort()
  assert.equal(calls[0].signal.aborted, true)
})

test('aceita resultado vazio e rejeita cargo trocado, dados incompletos e sugestões duplicadas', async () => {
  global.fetch = async () => Response.json({ ...body, quantidade: 0, nrs_sugeridas: [] })
  assert.deepEqual(await api.suggestPositionNrs('3'), [])
  for (const invalid of [null, { ...body, cargo_id: 4 }, { ...body, quantidade: 0 }, { ...body, nrs_sugeridas: [{ ...suggestion, justificativa: '' }] }, { ...body, quantidade: 2, nrs_sugeridas: [suggestion, suggestion] }]) {
    global.fetch = async () => Response.json(invalid)
    await assert.rejects(api.suggestPositionNrs('3'), /sugestões inválidas/)
  }
})

test('erros HTTP, rede e timeout são apresentados sem expor token; cancelamento é preservado', async () => {
  global.fetch = async () => Response.json({ detail: 'Cargo indisponível.' }, { status: 403 })
  await assert.rejects(api.suggestPositionNrs('3'), /Cargo indisponível/)
  global.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(api.suggestPositionNrs('3'), /continuar editando/)
  global.fetch = async () => { throw new DOMException('Timeout', 'TimeoutError') }
  await assert.rejects(api.suggestPositionNrs('3'), /demorou/)
  const controller = new AbortController(); controller.abort()
  await assert.rejects(api.suggestPositionNrs('3', controller.signal), { name: 'AbortError' })
})

test('ID inválido, sessão ausente e cancelamento durante o token impedem requisições', async () => {
  let calls = 0
  global.fetch = async () => { calls++; return Response.json(body) }
  await assert.rejects(api.suggestPositionNrs('../3'), /Identificador/)
  auth.currentUser = null
  await assert.rejects(api.suggestPositionNrs('3'), /Entre na sua conta/)
  const controller = new AbortController()
  auth.currentUser = { getIdToken: async () => { controller.abort(); return 'token' } }
  await assert.rejects(api.suggestPositionNrs('3', controller.signal), { name: 'AbortError' })
  assert.equal(calls, 0)
})
