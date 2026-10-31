const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const createRoot = container => require('react-dom/client').createRoot(container)
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

test('menu conserva foco ao terminar de posicionar e só devolve à origem ao desmontar', async () => {
  const dom = new JSDOM('<button id="origin">Opções</button><div id="root"></div>')
  const names = ['window', 'document', 'Node', 'HTMLElement', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'IS_REACT_ACT_ENVIRONMENT']
  const previous = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(global, name)]))
  Object.assign(global, { window: dom.window, document: dom.window.document, Node: dom.window.Node, HTMLElement: dom.window.HTMLElement,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window), requestAnimationFrame: fn => { fn(); return 0 }, cancelAnimationFrame() {}, IS_REACT_ACT_ENVIRONMENT: true })
  dom.window.matchMedia = () => ({ matches: true })
  const Popup = load(path.resolve('src/components/optionsPopup/index.tsx')).default
  const root = createRoot(document.getElementById('root'))
  const panelRef = { current: null }
  const origin = document.getElementById('origin')
  const render = visibility => React.createElement(Popup, { ariaLabel: 'Ações', panelRef, onClose() {}, style: { visibility }, items: [
    { id: 'edit', label: 'Editar', onSelect() {} }, { id: 'delete', label: 'Excluir', onSelect() {} },
  ] })
  try {
    origin.focus()
    await React.act(async () => root.render(render('hidden')))
    assert.equal(document.activeElement, origin)
    await React.act(async () => root.render(render('visible')))
    const items = document.querySelectorAll('[role="menuitem"]')
    assert.equal(document.activeElement, items[0])
    await React.act(async () => items[0].dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true })))
    assert.equal(document.activeElement, items[1])
    await React.act(async () => root.render(render('visible')))
    assert.equal(document.activeElement, items[1])
    await React.act(async () => root.unmount())
    assert.equal(document.activeElement, origin)
  } finally {
    await React.act(async () => root.unmount()); dom.window.close()
    for (const name of names) { if (previous[name]) Object.defineProperty(global, name, previous[name]); else delete global[name] }
  }
})

test('seletor intercepta Escape somente aberto; fechado permite dispensar o modal', async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const names = ['window', 'document', 'Node', 'HTMLElement', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'IS_REACT_ACT_ENVIRONMENT']
  const previous = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(global, name)]))
  Object.assign(global, { window: dom.window, document: dom.window.document, Node: dom.window.Node, HTMLElement: dom.window.HTMLElement,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window), requestAnimationFrame: fn => { fn(); return 0 }, cancelAnimationFrame() {}, IS_REACT_ACT_ENVIRONMENT: true })
  dom.window.matchMedia = () => ({ matches: true })
  const Select = load(path.resolve('src/components/toolbarSelect/index.tsx')).default
  const root = createRoot(document.getElementById('root'))
  try {
    await React.act(async () => root.render(React.createElement(Select, { id: 'select', label: 'Indicador', searchable: false, value: 'a', options: [{ value: 'a', label: 'Primeiro' }], onValueChange() {} })))
    const input = document.getElementById('select')
    assert.equal(input.hasAttribute('aria-controls'), false)
    function key(key) { const event = new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }); input.dispatchEvent(event); return event }
    assert.equal(key('Escape').defaultPrevented, false)
    await React.act(async () => key('Enter'))
    assert.equal(input.getAttribute('aria-expanded'), 'true')
    assert.equal(document.getElementById(input.getAttribute('aria-controls')).getAttribute('role'), 'listbox')
    let escape
    await React.act(async () => { escape = key('Escape') })
    assert.equal(escape.defaultPrevented, true)
    assert.equal(input.getAttribute('aria-expanded'), 'false')
    assert.equal(input.hasAttribute('aria-controls'), false)
    assert.equal(key('Escape').defaultPrevented, false)
    await React.act(async () => root.render(React.createElement(React.Fragment, null,
      React.createElement('label', { id: 'visible-label', htmlFor: 'select' }, 'Indicador'),
      React.createElement(Select, { id: 'select', label: 'Indicador', labelledBy: 'visible-label', searchable: false, value: 'a', options: [{ value: 'a', label: 'Primeiro' }], onValueChange() {} }))))
    assert.equal(document.querySelectorAll('label[for="select"]').length, 1)
    assert.equal(document.getElementById('select').getAttribute('aria-labelledby'), 'visible-label')
    assert.equal(document.getElementById('select').hasAttribute('aria-label'), false)
  } finally {
    await React.act(async () => root.unmount()); dom.window.close()
    for (const name of names) { if (previous[name]) Object.defineProperty(global, name, previous[name]); else delete global[name] }
  }
})

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
    assert.equal(text.hasAttribute('aria-label'), false)
    assert.equal(text.textContent, label)
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
