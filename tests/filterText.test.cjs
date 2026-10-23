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

test('texto em duas linhas aguarda o hover, cancela passagem rápida e preserva descrição completa no foco', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const dom = new JSDOM('<div id="root"></div>')
  const names = ['window', 'document', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT']
  const previous = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(global, name)]))
  let resize, fullHeight = 160
  Object.assign(global, { window: dom.window, document: dom.window.document,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window), requestAnimationFrame: fn => { fn(); return 0 }, cancelAnimationFrame() {},
    ResizeObserver: class { constructor(callback) { resize = callback } observe() {} disconnect() {} }, IS_REACT_ACT_ENVIRONMENT: true })
  Object.defineProperties(dom.window.HTMLElement.prototype, {
    clientWidth: { configurable: true, get: () => 240 },
    clientHeight: { configurable: true, get: () => 40 },
    scrollHeight: { configurable: true, get: () => fullHeight },
  })
  const Text = load(path.resolve('src/components/truncatedText/index.tsx')).default
  const description = 'A NR-1 estabelece o campo de aplicação, os direitos e deveres e os termos e definições comuns às Normas Regulamentadoras. Ela define diretrizes e requisitos para o Gerenciamento de Riscos Ocupacionais.'
  const root = createRoot(document.getElementById('root'))
  try {
    await React.act(async () => root.render(React.createElement(Text, { maxLines: 2, hoverDelay: 700 }, description)))
    const text = document.querySelector('.astro-truncated-text')
    assert.equal(text.style.webkitLineClamp, '2')
    assert.equal(text.getAttribute('data-truncated'), 'true')
    assert.equal(text.tabIndex, 0)
    assert.equal(text.textContent, description)
    await React.act(async () => text.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })))
    assert.equal(document.querySelector('[role="tooltip"]'), null)
    await React.act(async () => t.mock.timers.tick(300))
    await React.act(async () => text.dispatchEvent(new dom.window.MouseEvent('mouseout', { bubbles: true })))
    await React.act(async () => t.mock.timers.tick(700))
    assert.equal(document.querySelector('[role="tooltip"]'), null)
    await React.act(async () => text.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })))
    await React.act(async () => t.mock.timers.tick(699))
    assert.equal(document.querySelector('[role="tooltip"]'), null)
    await React.act(async () => t.mock.timers.tick(1))
    assert.equal(document.querySelector('[role="tooltip"]').textContent, description)
    assert.equal(text.getAttribute('aria-describedby'), document.querySelector('[role="tooltip"]').id)
    await React.act(async () => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    assert.equal(document.querySelector('[role="tooltip"]'), null)
    await React.act(async () => text.focus())
    assert.equal(document.querySelector('[role="tooltip"]').textContent, description)
    fullHeight = 40
    await React.act(async () => resize())
    assert.equal(text.getAttribute('data-truncated'), 'false')
    assert.equal(text.hasAttribute('tabindex'), false)
    assert.equal(document.querySelector('[role="tooltip"]'), null)
  } finally {
    await React.act(async () => root.unmount()); dom.window.close()
    for (const name of names) { if (previous[name]) Object.defineProperty(global, name, previous[name]); else delete global[name] }
  }
})
