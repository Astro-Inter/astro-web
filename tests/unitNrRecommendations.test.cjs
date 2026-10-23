const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const ts = require('typescript')
const React = require('react')
const { createRoot } = require('react-dom/client')
const { JSDOM } = require('jsdom')
global.IS_REACT_ACT_ENVIRONMENT = true
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const suggestion = { numero: 12, nome: 'Máquinas', justificativa: 'Opera máquinas.', confianca: 'alta' }

async function setup() {
  const previous = { window: global.window, document: global.document }
  const dom = new JSDOM('<div id="root"></div>')
  global.window = dom.window; global.document = dom.window.document
  const context = { user: { uid: 'manager' } }, calls = []
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync('src/hooks/useUnitNrRecommendations.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', code)(name => name === 'react' ? React : name === './useAuthentication' ? { useAuthentication: () => context } : { suggestUnitNrs: (id, signal) => { const pending = deferred(); calls.push({ id, signal, ...pending }); return pending.promise } }, module, module.exports)
  let result
  function Probe({ id }) { result = module.exports.useUnitNrRecommendations(id); return null }
  const root = createRoot(dom.window.document.getElementById('root'))
  return {
    calls, context, get result() { return result },
    async render(id) { await React.act(async () => root.render(React.createElement(Probe, { id }))) },
    async close() { await React.act(async () => root.unmount()); dom.window.close(); Object.assign(global, previous) },
  }
}

test('consulta apenas no editor, cancela unidade anterior e ignora resposta após fechar ou trocar conta', async () => {
  const env = await setup()
  try {
    await env.render(undefined)
    assert.equal(env.calls.length, 0)
    await env.render('3')
    assert.equal(env.result.loading, true)
    await env.render('4')
    assert.equal(env.calls[0].signal.aborted, true)
    await React.act(async () => env.calls[0].resolve([suggestion]))
    assert.deepEqual(env.result.rows, [])
    await React.act(async () => env.calls[1].resolve([suggestion]))
    assert.deepEqual(env.result.rows, [suggestion])
    env.context.user = { uid: 'other' }
    await env.render('4')
    assert.deepEqual(env.result.rows, [])
    await env.render(undefined)
    assert.equal(env.calls[2].signal.aborted, true)
    await React.act(async () => env.calls[2].resolve([suggestion]))
    assert.deepEqual(env.result.rows, [])
    assert.equal(env.result.loading, false)
  } finally { await env.close() }
})

test('erro permite retry e resultado vazio conclui carregamento; desmontar aborta requisição', async () => {
  const env = await setup()
  await env.render('3')
  await React.act(async () => env.calls[0].reject(new Error('IA indisponível.')))
  assert.equal(env.result.error, 'IA indisponível.')
  await React.act(async () => env.result.retry())
  assert.equal(env.result.loading, true)
  assert.equal(env.result.error, '')
  await React.act(async () => env.calls[1].resolve([]))
  assert.equal(env.result.loading, false)
  assert.deepEqual(env.result.rows, [])
  await React.act(async () => env.result.retry())
  await env.close()
  assert.equal(env.calls[2].signal.aborted, true)
})

