const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')

test('gráfico acompanha largura e altura da prévia sem reduzir os textos; consulta por teclado continua funcionando', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  const keys = ['window', 'document', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT']
  const originals = Object.fromEntries(keys.map(key => [key, Object.getOwnPropertyDescriptor(global, key)]))
  let resize, disconnected = false, root
  try {
    for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true,
      ResizeObserver: class { constructor(callback) { resize = callback } observe() {} disconnect() { disconnected = true } },
    })) Object.defineProperty(global, key, { value, configurable: true, writable: true })
    const source = fs.readFileSync(path.join(__dirname, '../src/components/analyticsChart/index.tsx'), 'utf8')
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    const module = { exports: {} }
    new Function('require', 'module', 'exports', code)(name => {
      if (name === '../../data/dashboardCatalog') return { dimensionLabels: { data: 'Data' } }
      if (name === '../truncatedText') return { __esModule: true, default: ({ children }) => React.createElement('span', null, children) }
      return require(name)
    }, module, module.exports)
    root = createRoot(document.getElementById('root'))
    const chart = { title: 'Colaboradores', kind: 'line', dimensions: ['data'], measure: 'quantidade', dateSensitive: true,
      rows: [{ data: '2026-07-01', quantidade: 20 }, { data: '2026-10-01', quantidade: 130 }] }
    await React.act(async () => root.render(React.createElement(module.exports.default, { chart, kind: 'line' })))
    await React.act(async () => resize([{ contentRect: { width: 320, height: 160 } }]))
    const svg = document.querySelector('svg')
    assert.equal(svg.getAttribute('viewBox'), '0 0 320 160')
    assert.ok([...svg.querySelectorAll('circle')].every(point => Number(point.getAttribute('cy')) <= 160))
    await React.act(async () => svg.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
    assert.match(document.querySelector('[role="tooltip"]').textContent, /01\/10\/2026.*130/)
    await React.act(async () => resize([{ contentRect: { width: 840, height: 300 } }]))
    assert.equal(svg.getAttribute('viewBox'), '0 0 840 300')
    await React.act(async () => svg.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    assert.equal(document.querySelector('[role="tooltip"]'), null)
    await React.act(async () => root.unmount()); root = null
    assert.equal(disconnected, true)
  } finally {
    if (root) await React.act(async () => root.unmount())
    dom.window.close()
    for (const key of keys) { if (originals[key]) Object.defineProperty(global, key, originals[key]); else delete global[key] }
  }
})
