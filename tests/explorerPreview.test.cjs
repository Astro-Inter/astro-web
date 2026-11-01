const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const React = require('react')
const { JSDOM } = require('jsdom')

test('prévia cancela consultas antigas, não duplica envio e permite recuperar erro antes do sucesso', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
  const names = ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT']
  const previous = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(global, name)]))
  const calls = []
  function load(file) {
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const module = { exports: {} }
    new Function('require', 'module', 'exports', code)(name => {
      if (name === '../services/dashboards') return { queryExplorer: (...args) => new Promise((resolve, reject) => calls.push({ args, resolve, reject })) }
      if (name === '../utils/dashboardQuery') return load('src/utils/dashboardQuery.ts')
      return require(name)
    }, module, module.exports)
    return module.exports
  }
  let root
  try {
    for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) Object.defineProperty(global, name, { value, writable: true, configurable: true })
    const { useExplorerPreview } = load('src/hooks/useExplorerPreview.ts')
    const catalog = { datasets: [{ id: 'pessoas', fields: [{ id: 'pessoa', kind: 'identifier', operations: ['distinct'], groupable: false }] }] }
    const filters = { start: '2026-10-01', end: '2026-10-31', granularity: 'mes' }
    const query = { dataset: 'pessoas', groupBy: 'none', metric: { field: 'pessoa', operation: 'distinct' }, where: [] }
    const observation = { current: null }
    function Host({ query }) {
      const preview = useExplorerPreview(query, filters, '1', catalog)
      React.useLayoutEffect(() => { observation.current = preview })
      return null
    }
    root = require('react-dom/client').createRoot(document.getElementById('root'))
    await React.act(async () => root.render(React.createElement(Host, { query })))
    await React.act(async () => { void observation.current.calculate(); void observation.current.calculate() })
    assert.equal(calls.length, 1)
    assert.equal(observation.current.pending, true)
    await React.act(async () => root.render(React.createElement(Host, { query: { ...query, where: [{ id: 'ui', field: 'pessoa', operator: 'equals', value: ' Lucas ' }] } })))
    assert.equal(calls[0].args[3].aborted, true)
    await React.act(async () => calls[0].resolve({ generatedAt: 'antigo' }))
    assert.equal(observation.current.result, undefined)
    await React.act(async () => { void observation.current.calculate() })
    assert.deepEqual(calls[1].args[0].where, [{ field: 'pessoa', operator: 'equals', value: 'Lucas' }])
    await React.act(async () => calls[1].reject(new Error('Serviço temporariamente indisponível')))
    assert.match(observation.current.error, /indisponível/)
    assert.equal(observation.current.pending, false)
    await React.act(async () => { void observation.current.calculate() })
    const result = { generatedAt: 'atual' }
    await React.act(async () => calls[2].resolve(result))
    assert.equal(observation.current.result, result)
    assert.equal(observation.current.error, undefined)
    await React.act(async () => { void observation.current.calculate() })
    await React.act(async () => root.unmount()); root = null
    assert.equal(calls[3].args[3].aborted, true)
    await React.act(async () => calls[3].reject(new Error('Resposta após desmontar')))
  } finally {
    if (root) await React.act(async () => root.unmount())
    dom.window.close()
    for (const name of names) { if (previous[name]) Object.defineProperty(global, name, previous[name]); else delete global[name] }
  }
})
