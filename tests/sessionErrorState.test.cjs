const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { createRoot } = require('react-dom/client')
const { JSDOM } = require('jsdom')

function load(recovery, file = 'src/components/sessionErrorState/index.tsx') {
  const cache = new Map()
  function read(filename) {
    filename = path.resolve(filename)
    if (cache.has(filename)) return cache.get(filename)
    const module = { exports: {} }
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'")
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'module', 'exports', code)(name => {
      if (name.endsWith('/useSessionRecovery')) return { useSessionRecovery: () => recovery }
      if (!name.startsWith('.')) return require(name)
      const target = path.resolve(path.dirname(filename), name)
      return read([target + '.ts', target + '.tsx', path.join(target, 'index.tsx')].find(file => fs.existsSync(file)))
    }, module, module.exports)
    cache.set(filename, module.exports)
    return module.exports
  }
  return read(file).default
}

test('falha de sessão usa ilustração própria e botão secundário padronizado', () => {
  const View = load({ pending: false, error: '', retry() {}, returnToLogin() {} })
  const document = new JSDOM(renderToStaticMarkup(React.createElement(View, { error: 'Confira sua conexão.' }))).window.document
  assert.equal(document.querySelector('img[src="/sessionUnavailable.png"]') !== null, true)
  assert.equal(document.querySelector('.session-error-card'), null)
  assert.equal(document.querySelector('[role="alert"]').textContent, 'Confira sua conexão.')
  const buttons = [...document.querySelectorAll('.status-screen-actions button')]
  assert.equal(buttons.length, 2)
  assert.equal(buttons[1].classList.contains('astro-action--outline'), true)
  assert.equal(buttons[0].classList.contains('astro-action--compact'), false)
  assert.equal(buttons[1].classList.contains('astro-action--compact'), false)
})

test('recuperação pendente desabilita ações e mantém o retorno de estado acessível', () => {
  const View = load({ pending: true, error: 'Falha ao sair.', retry() {}, returnToLogin() {} })
  const document = new JSDOM(renderToStaticMarkup(React.createElement(View, { error: 'Falha de acesso.' }))).window.document
  assert.equal(document.querySelector('main').getAttribute('aria-busy'), 'true')
  assert.equal(document.querySelectorAll('.status-screen-actions button:disabled').length, 2)
  assert.doesNotMatch(document.body.textContent, /Voltando ao login/)
  assert.doesNotMatch(document.body.textContent, /Falha ao sair/)
})

test('tentar novamente e voltar ao login preservam as ações e o foco inicial', async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const names = ['window', 'document', 'HTMLElement', 'IS_REACT_ACT_ENVIRONMENT']
  const saved = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(global, name)]))
  Object.defineProperties(global, {
    window: { configurable: true, value: dom.window }, document: { configurable: true, value: dom.window.document },
    HTMLElement: { configurable: true, value: dom.window.HTMLElement }, IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
  })
  let retries = 0, exits = 0
  const View = load({ pending: false, error: '', retry() { retries++ }, async returnToLogin() { exits++ } })
  const root = createRoot(document.getElementById('root'))
  try {
    await React.act(async () => root.render(React.createElement(View, { error: 'Falha de acesso.' })))
    assert.equal(document.activeElement.id, 'session-error-title')
    const buttons = document.querySelectorAll('.status-screen-actions button')
    await React.act(async () => { buttons[0].click(); buttons[1].click() })
    assert.equal(retries, 1)
    assert.equal(exits, 1)
  } finally {
    await React.act(async () => root.unmount())
    dom.window.close()
    for (const name of names) { if (saved[name]) Object.defineProperty(global, name, saved[name]); else delete global[name] }
  }
})

test('ilustrações de status preservam o mesmo tamanho visível e o centro da composição', () => {
  const View = load({}, 'src/components/statusScreenLayout/index.tsx')
  const cases = [
    { illustration: 'sessionUnavailable.png', illustrationWidth: 1667, illustrationHeight: 944, illustrationBounds: { left: 185, top: 24, right: 1483, bottom: 905 }, illustrationCenterX: 812 },
    { illustration: 'error404.png', illustrationWidth: 470, illustrationHeight: 266, illustrationBounds: { left: 56, top: 9, right: 417, bottom: 255 } },
    { illustration: 'inactiveUser.png', illustrationWidth: 470, illustrationHeight: 252, illustrationBounds: { left: 69, top: 9, right: 416, bottom: 241 } },
    { illustration: 'accessKeyVerified.png', illustrationWidth: 509, illustrationHeight: 339, illustrationBounds: { left: 53, top: 60, right: 437, bottom: 290 } },
    { illustration: 'workspaceCreated.png', illustrationWidth: 1536, illustrationHeight: 1024, illustrationBounds: { left: 182, top: 177, right: 1310, bottom: 951 } },
  ]
  for (const props of cases) {
    const document = new JSDOM(renderToStaticMarkup(React.createElement(View, { ...props, titleId: 'status-title', title: 'Status', description: 'Descrição', actionLabel: 'Continuar', onAction() {} }))).window.document
    const img = document.querySelector('.status-screen-illustration img')
    const scale = parseFloat(img.style.width) / 100 * 509 / props.illustrationWidth
    const bounds = props.illustrationBounds
    const centerX = props.illustrationCenterX ?? (bounds.left + bounds.right) / 2
    assert.ok(Math.abs(parseFloat(img.style.left) / 100 * 509 + centerX * scale - 509 / 2) < 0.001)
    assert.ok(Math.abs(parseFloat(img.style.top) / 100 * 339 + (bounds.top + bounds.bottom) / 2 * scale - 339 / 2) < 0.001)
    assert.ok(Math.abs((bounds.bottom - bounds.top) * scale - 230) < 0.001)
    assert.ok(document.querySelector('.status-screen-actions .astro-action'))
    assert.equal(document.querySelector('.astro-action--compact'), null)
    assert.equal(document.querySelector('.help-link').tagName, 'A')
  }
})
