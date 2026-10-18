const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { createRoot } = require('react-dom/client')
const { JSDOM } = require('jsdom')

function load(filename) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('require', 'module', 'exports', code)(name => {
    if (!name.startsWith('.')) return require(name)
    const target = path.resolve(path.dirname(filename), name)
    return load([target + '.ts', target + '.tsx', path.join(target, 'index.tsx')].find(file => fs.existsSync(file)))
  }, module, module.exports)
  return module.exports
}

test('opção longa mostra tooltip no foco do botão sem criar outro ponto de tabulação', async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const names = ['window', 'document', 'Node', 'HTMLElement', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'IS_REACT_ACT_ENVIRONMENT']
  const previous = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(global, name)]))
  Object.assign(global, { window: dom.window, document: dom.window.document, Node: dom.window.Node, HTMLElement: dom.window.HTMLElement,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window), requestAnimationFrame: fn => { fn(); return 0 }, cancelAnimationFrame() {}, IS_REACT_ACT_ENVIRONMENT: true })
  Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 120 })
  Object.defineProperty(dom.window.HTMLElement.prototype, 'scrollWidth', { configurable: true, get() { return this.textContent.length * 8 } })
  const Text = load(path.resolve('src/components/truncatedText/index.tsx')).default
  const label = 'amanda.c689bedf0fc64d4c.96@example.com'
  const root = createRoot(document.getElementById('root'))
  try {
    await React.act(async () => root.render(React.createElement('button', { 'aria-label': label }, React.createElement(Text, { focusParent: true, nativeEllipsis: true }, label))))
    const text = document.querySelector('.astro-truncated-text')
    assert.equal(text.getAttribute('data-truncated'), 'true')
    assert.equal(text.hasAttribute('tabindex'), false)
    await React.act(async () => document.querySelector('button').focus())
    assert.equal(document.querySelector('[role="tooltip"]').textContent, label)
    assert.equal(document.activeElement.tagName, 'BUTTON')
    await React.act(async () => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    assert.equal(document.querySelector('[role="tooltip"]'), null)
  } finally {
    await React.act(async () => root.unmount()); dom.window.close()
    for (const name of names) { if (previous[name]) Object.defineProperty(global, name, previous[name]); else delete global[name] }
  }
})
