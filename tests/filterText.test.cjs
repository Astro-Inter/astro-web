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
    await React.act(async () => window.dispatchEvent(new dom.window.Event('scroll')))
    assert.equal(document.querySelector('[role="tooltip"]'), null)
    assert.equal(document.activeElement.tagName, 'BUTTON')
    await React.act(async () => { document.querySelector('button').blur(); document.querySelector('button').focus() })
    assert.equal(document.querySelector('[role="tooltip"]').textContent, label)
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
    await React.act(async () => window.dispatchEvent(new dom.window.Event('scroll')))
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

test('calendário bloqueia dias anteriores ao mínimo inclusive por teclado e atalho Hoje', async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const names = ['window', 'document', 'Node', 'HTMLElement', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT']
  const previous = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(global, name)]))
  Object.assign(global, { window: dom.window, document: dom.window.document, Node: dom.window.Node, HTMLElement: dom.window.HTMLElement, getComputedStyle: dom.window.getComputedStyle.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true })
  window.matchMedia = () => ({ matches: true })
  const Picker = load(path.resolve('src/components/formDatePicker/index.tsx')).default
  const root = createRoot(document.getElementById('root')), changes = []
  try {
    await React.act(async () => root.render(React.createElement(Picker, { id: 'date', label: 'Data', value: '2099-11-20', minDate: '2099-11-20', onChange: value => changes.push(value) })))
    await React.act(async () => document.querySelector('.create-forms-date-trigger').click())
    const before = document.querySelector('[data-date="2099-11-19"]'), minimum = document.querySelector('[data-date="2099-11-20"]')
    assert.equal(before.disabled, true)
    assert.equal(minimum.disabled, false)
    const today = document.querySelector('.create-forms-calendar-footer button')
    assert.equal(today.disabled, true)
    await React.act(async () => { before.click(); today.click() })
    assert.deepEqual(changes, [])
    await React.act(async () => minimum.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })))
    assert.equal(document.activeElement, minimum)
    await React.act(async () => minimum.click())
    assert.deepEqual(changes, ['2099-11-20'])
  } finally {
    await React.act(async () => root.unmount()); dom.window.close()
    for (const name of names) { if (previous[name]) Object.defineProperty(global, name, previous[name]); else delete global[name] }
  }
})

test('painel facial recolhe e reabre sem desmontar a câmera nem a mira', async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const names = ['window', 'document', 'Node', 'Element', 'HTMLDialogElement', 'MutationObserver', 'IS_REACT_ACT_ENVIRONMENT']
  const previous = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(global, name)]))
  for (const name of names) global[name] = name === 'IS_REACT_ACT_ENVIRONMENT' ? true : name === 'window' ? dom.window : name === 'document' ? dom.window.document : dom.window[name]
  const Overlay = load(path.resolve('src/components/faceNavigationOverlay/index.tsx')).default
  const root = createRoot(document.getElementById('root'))
  let stops = 0, previewMounts = 0
  const face = { status: 'active', message: 'Navegação ativa', calibrate() {}, togglePause() {}, stop() { stops++ }, attachPreview: element => { if (element) previewMounts++ }, attachCursor() {} }
  try {
    await React.act(async () => root.render(React.createElement(Overlay, { face })))
    const toggle = document.querySelector('.a11y-face-panel-toggle'), preview = document.querySelector('.a11y-face-preview'), cursor = document.querySelector('.a11y-face-cursor')
    const controls = document.getElementById(toggle.getAttribute('aria-controls'))
    await React.act(async () => toggle.click())
    assert.equal(controls.hasAttribute('inert'), true)
    assert.equal(controls.getAttribute('aria-hidden'), 'true')
    assert.equal(toggle.getAttribute('aria-expanded'), 'false')
    assert.equal(document.querySelector('.a11y-face-preview'), preview)
    assert.equal(document.querySelector('.a11y-face-cursor'), cursor)
    await React.act(async () => toggle.click())
    assert.equal(controls.hasAttribute('inert'), false)
    assert.equal(controls.getAttribute('aria-hidden'), 'false')
    assert.equal(toggle.getAttribute('aria-expanded'), 'true')
    assert.equal(stops, 0)
    assert.equal(previewMounts, 1)
  } finally {
    await React.act(async () => root.unmount()); dom.window.close()
    for (const name of names) { if (previous[name]) Object.defineProperty(global, name, previous[name]); else delete global[name] }
  }
})

test('ditado cobre campos dinâmicos e popups sem duplicar buscas, preserva React e remove controles ao desativar', async () => {
  const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true })
  const names = ['window','document','Node','Element','HTMLElement','HTMLInputElement','HTMLTextAreaElement','HTMLDialogElement','MutationObserver','ResizeObserver','Event','innerWidth','innerHeight','getComputedStyle','requestAnimationFrame','cancelAnimationFrame','IS_REACT_ACT_ENVIRONMENT']
  const previous = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(global, name)]))
  for (const name of names) Object.defineProperty(global, name, { configurable: true, writable: true, value: name === 'window' ? dom.window : dom.window[name] })
  Object.assign(global, { IS_REACT_ACT_ENVIRONMENT: true, ResizeObserver: class { observe() {} unobserve() {} disconnect() {} }, getComputedStyle: dom.window.getComputedStyle.bind(dom.window), requestAnimationFrame: callback => setTimeout(callback, 0), cancelAnimationFrame: clearTimeout })
  Object.defineProperty(dom.window.HTMLElement.prototype, 'getBoundingClientRect', { value() { return { left: 10, right: 310, top: 20, bottom: 70, width: 300, height: 50 } } })
  Object.defineProperty(dom.window.HTMLElement.prototype, 'offsetWidth', { get() { return 300 } })
  let recognition, aborted = 0
  const received = []
  window.SpeechRecognition = class { constructor() { recognition = this } start() {} abort() { aborted++ } }
  const Controls = load(path.resolve('src/components/voiceInputControls/index.tsx')).default
  const root = createRoot(document.getElementById('root'))
  function Form({ enabled = true }) {
    const [name, setName] = React.useState('')
    return React.createElement(React.Fragment, null,
      React.createElement('label', { htmlFor: 'voice-name' }, 'Nome'), React.createElement('input', { id: 'voice-name', maxLength: 5, style: { paddingRight: '12px' }, value: name, onChange: event => { received.push(event.target.value); setName(event.target.value) } }),
      React.createElement('label', { htmlFor: 'voice-description' }, 'Descrição'), React.createElement('textarea', { id: 'voice-description' }),
      React.createElement('input', { type: 'password', 'aria-label': 'Senha' }), React.createElement('input', { readOnly: true, 'aria-label': 'Bloqueado' }),
      React.createElement('fieldset', { disabled: true }, React.createElement('input', { 'aria-label': 'Desativado' })),
      React.createElement('div', { className: 'astro-toolbar-search' }, React.createElement('input', { type: 'search', 'aria-label': 'Busca existente' })),
      enabled && React.createElement(Controls))
  }
  const settle = () => React.act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
  try {
    await React.act(async () => root.render(React.createElement(Form)))
    await settle()
    assert.equal(document.querySelectorAll('.astro-field-voice').length, 2)
    const name = document.getElementById('voice-name')
    assert.equal(name.style.paddingRight, '48px')
    await React.act(async () => document.querySelector('[aria-label="Preencher por voz: Nome"]').click())
    await React.act(async () => recognition.onresult({ results: [[{ transcript: 'Amanda Lima' }]] }))
    assert.deepEqual(received, ['Amand'])
    assert.equal(name.value, 'Amand')
    const dialog = document.createElement('dialog'); dialog.open = true
    dialog.innerHTML = '<label for="inside-voice">Título</label><input id="inside-voice">'
    await React.act(async () => document.body.append(dialog)); await settle()
    assert.equal(document.querySelectorAll('.astro-field-voice').length, 1)
    assert.ok(dialog.querySelector('[aria-label="Preencher por voz: Título"]'))
    assert.ok(aborted > 0)
    await React.act(async () => dialog.remove()); await settle()
    assert.equal(document.querySelectorAll('.astro-field-voice').length, 2)
    await React.act(async () => root.render(React.createElement(Form, { enabled: false })))
    assert.equal(document.querySelector('.astro-field-voice'), null)
    assert.equal(name.style.paddingRight, '12px')
  } finally {
    await React.act(async () => root.unmount()); dom.window.close()
    for (const name of names) { if (previous[name]) Object.defineProperty(global, name, previous[name]); else delete global[name] }
  }
})
