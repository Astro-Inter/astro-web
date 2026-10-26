const assert = require('node:assert/strict')
const { test, afterEach } = require('node:test')
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const user = { getIdToken: async () => 'firebase-token' }, auth = { currentUser: user }, cache = new Map()
function load(filename) {
  filename = path.resolve(filename)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }; cache.set(filename, module)
  const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.VITE_API_URL', "'https://api.example.test'").replaceAll('import.meta.env.DEV', 'false')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', code)(name => name === './firebase' ? { firebaseAuth: auth } : name.startsWith('.') ? load(path.resolve(path.dirname(filename), `${name}.ts`)) : require(name), module, module.exports)
  return module.exports
}
const api = load('src/services/formReview.ts')
const preview = load('src/data/formReviewPreview.ts').createFormReviewPreview
const id = '61000000-0000-4000-8000-000000000001'
const data = (status = 'awaiting_review') => ({ ...preview(status), canReview: status === 'awaiting_review' })
const response = value => new Response(JSON.stringify({ success: true, data: value }))
const originalFetch = global.fetch
afterEach(() => { global.fetch = originalFetch; auth.currentUser = user })

test('consulta respostas usa somente GET responses com Bearer e canReview do servidor', async () => {
  const calls = []
  global.fetch = async (url, init) => { calls.push({ url, ...init }); return response({ ...data(), canReview: false }) }
  const result = await api.getFormReview(id)
  assert.equal(calls.length, 1); assert.equal(calls[0].url, `https://api.example.test/forms/${id}/responses`)
  assert.equal(calls[0].headers.Authorization, 'Bearer firebase-token')
  assert.equal(result.canReview, false); assert.equal(result.currentManagerId, null)
  assert.equal(result.recipientName, 'Ana Souza')
})

test('aprovação omite descrição e reprovação envia somente motivo validado e aparado', async () => {
  const calls = []
  global.fetch = async (url, init) => { calls.push({ url, ...init }); return response(data(JSON.parse(init.body).status)) }
  await api.submitFormReview(id, 'approved', 'não deve sair no payload')
  await api.submitFormReview(id, 'rejected', '  Foto insuficiente  ')
  assert.deepEqual(JSON.parse(calls[0].body), { status: 'approved' })
  assert.deepEqual(JSON.parse(calls[1].body), { status: 'rejected', description: 'Foto insuficiente' })
  assert.ok(calls.every(call => call.method === 'POST' && call.url.endsWith('/review')))
  await assert.rejects(api.submitFormReview(id, 'rejected', ' '), /Descreva/)
  await assert.rejects(api.submitFormReview(id, 'rejected', 'x'.repeat(1001)), /1000/)
  assert.equal(calls.length, 2)
})

test('erro HTTP preserva status para conciliação de concorrência e não simula sucesso', async () => {
  global.fetch = async () => new Response(JSON.stringify({ success: false, errors: ['Já analisado'] }), { status: 409 })
  await assert.rejects(api.submitFormReview(id, 'approved'), error => error.status === 409 && /Já analisado/.test(error.message))
  global.fetch = async () => response(data('rejected'))
  await assert.rejects(api.submitFormReview(id, 'approved'), /não confirmou/)
})

test('URLs privadas são validadas, expiram e usam somente o endpoint do anexo', async () => {
  const calls = [], imageId = 'image-id'
  global.fetch = async (url, init) => { calls.push({ url, ...init }); return response({ id: imageId, url: 'https://images.test/private.jpg', expiresAt: new Date(Date.now() + 60000).toISOString() }) }
  assert.equal((await api.getFormResponseImage(id, imageId)).url, 'https://images.test/private.jpg')
  assert.ok(calls[0].url.endsWith(`/forms/${id}/images/${imageId}`))
  assert.equal(calls[0].headers.Authorization, 'Bearer firebase-token')
  for (const url of ['javascript:alert(1)', 'https://name:secret@images.test/a.jpg']) {
    global.fetch = async () => response({ id: imageId, url, expiresAt: new Date(Date.now() + 60000).toISOString() })
    await assert.rejects(api.getFormResponseImage(id, imageId), /indisponível ou expirada/)
  }
})

test('UUID e respostas incompatíveis são rejeitados sem conceder permissão local', async () => {
  let calls = 0
  global.fetch = async () => { calls++; return response({ ...data(), form: { ...data().form, id: '61000000-0000-4000-8000-000000000002' } }) }
  await assert.rejects(api.getFormReview('invalid'), /Identificador/); assert.equal(calls, 0)
  await assert.rejects(api.getFormReview(id), /não corresponde/)
  global.fetch = async () => response({ ...data(), canReview: 'true' })
  await assert.rejects(api.getFormReview(id), /análise de formulário inválida/)
})
