const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

function environment() {
  const cache = new Map(), requests = []
  const auth = { currentUser: { getIdToken: async () => 'firebase-token' } }
  let respond = async () => Response.json({ success: true, data: [] })
  function load(filename) {
    filename = path.resolve(filename)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    new Function('require', 'module', 'exports', 'fetch', code)(name => {
      if (name === './firebase') return { firebaseAuth: auth }
      if (name === './systemApi') return { getSystemApiBaseUrl: () => 'http://localhost:8081' }
      return name.startsWith('.') ? load(path.resolve(path.dirname(filename), `${name}.ts`)) : require(name)
    }, module, module.exports, async (...args) => { requests.push(args); return respond(...args) })
    return module.exports
  }
  const document = load('src/data/nrReview.ts').pendingNrExamples[0]
  const snapshot = { document, revision: 'a'.repeat(64), approvedRevision: 'b'.repeat(64) }
  return { repository: load('src/services/nrReviewApi.ts').createNrReviewApi(), requests, auth, snapshot,
    respondWith(fn) { respond = fn } }
}

test('adaptador envia token Firebase, revisões e apenas campos editáveis na aprovação', async () => {
  const env = environment()
  env.respondWith(async () => Response.json({ success: true, data: env.snapshot }))
  const candidate = await env.repository.getPending(20)
  await env.repository.approve(candidate, undefined, { ...candidate.document, nome: 'Correção humana' })
  const [url, options] = env.requests.at(-1)
  assert.equal(url, 'http://localhost:8081/admin/nrs/pendentes/20/aprovar')
  assert.equal(options.headers.Authorization, 'Bearer firebase-token')
  const payload = JSON.parse(options.body)
  assert.equal(payload.revision, env.snapshot.revision)
  assert.equal(payload.approvedRevision, env.snapshot.approvedRevision)
  assert.equal(payload.corrections.nome, 'Correção humana')
  for (const field of ['_id', 'data_criacao', 'ultima_atualizacao']) assert.equal(field in payload.corrections, false)
})

test('edição usa revisão do documento consultado e não de uma consulta posterior', async () => {
  const env = environment()
  env.respondWith(async () => Response.json({ success: true, data: env.snapshot }))
  const expected = await env.repository.getApproved(20)
  env.snapshot = { ...env.snapshot, revision: 'c'.repeat(64), document: { ...expected, nome: 'Alteração concorrente' } }
  await env.repository.getApproved(20)
  await env.repository.saveApproved({ ...expected, nome: 'Minha edição' }, expected)
  const payload = JSON.parse(env.requests.at(-1)[1].body)
  assert.equal(payload.revision, 'a'.repeat(64))
  assert.equal(payload.content.nome, 'Minha edição')
})

test('aprovação informa separadamente se o catálogo SQL foi sincronizado', async () => {
  for (const sqlSynchronized of [true, false]) {
    const env = environment()
    env.respondWith(async () => Response.json({ success: true, data: { ...env.snapshot, sqlSynchronized } }))
    const candidate = await env.repository.getPending(20)
    assert.deepEqual(await env.repository.approve(candidate), { sqlSynchronized })
  }
})

test('erros técnicos do servidor são substituídos por orientação clara e específica', async () => {
  const env = environment()
  for (const [status, message] of [[500, /temporariamente indisponível/], [503, /temporariamente indisponível/], [429, /Aguarde um momento/], [404, /ainda não está disponível/]]) {
    env.respondWith(async () => Response.json({ success: false, message: 'Erro interno do servidor: detalhes técnicos' }, { status }))
    await assert.rejects(env.repository.listPending(), error => message.test(error.message) && !error.message.includes('detalhes técnicos'))
  }
  env.respondWith(async () => { throw new TypeError('Failed to fetch') })
  await assert.rejects(env.repository.listPending(), /Confira sua conexão/)
  env.respondWith(async () => { throw new DOMException('Timeout', 'TimeoutError') })
  await assert.rejects(env.repository.listPending(), /demorou mais que o esperado/)
})

test('ausência, sessão, permissão, conflito, falha e resposta inválida não simulam sucesso', async () => {
  const env = environment()
  env.respondWith(async () => new Response(null, { status: 404 }))
  assert.equal(await env.repository.getApproved(35), null)
  for (const [status, message] of [[401, /sessão/], [403, /administradores/], [409, /versão/], [503, /indisponível/]]) {
    env.respondWith(async () => new Response(null, { status }))
    await assert.rejects(env.repository.listPending(), message)
  }
  for (const data of [null, {}, [{ ...env.snapshot, revision: 'invalid' }], [{ ...env.snapshot, document: { ...env.snapshot.document, usabilidade: 'Outro' } }]]) {
    env.respondWith(async () => Response.json({ success: true, data }))
    await assert.rejects(env.repository.listPending(), /inválid/)
  }
  env.auth.currentUser = null
  const count = env.requests.length
  await assert.rejects(env.repository.listPending(), /Entre na sua conta/)
  assert.equal(env.requests.length, count)
})
