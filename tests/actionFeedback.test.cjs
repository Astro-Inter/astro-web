const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')
function environment(overrides = {}) {
  const cache = new Map()
  function load(file) {
    const filename = path.resolve(file)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'module', 'exports', code)(name => {
      if (overrides[name]) return overrides[name]
      if (!name.startsWith('.')) return require(name)
      const target = path.resolve(path.dirname(filename), name)
      return load([target + '.ts', path.join(target, 'index.tsx')].find(fs.existsSync))
    }, module, module.exports)
    return module.exports
  }
  return { load }
}

test('rota desconhecida mostra 404, ajuda por email e retorno conforme a sessão', async () => {
  const { MemoryRouter, Routes, Route } = require('react-router-dom')
  for (const [user, status] of [[null, 'ready'], [{ uid: 'gestor' }, 'ready'], [null, 'loading']]) {
    const dom = new JSDOM('<!doctype html><div id="root"></div>')
    const previous = { window: global.window, document: global.document, IS_REACT_ACT_ENVIRONMENT: global.IS_REACT_ACT_ENVIRONMENT }
    Object.assign(global, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
    const env = environment({ '../../hooks/useAuthentication': { useAuthentication: () => ({ user, status }) } })
    const Page = env.load('src/pages/notFound/index.tsx').default
    const root = createRoot(document.getElementById('root'))
    try {
      await React.act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/rota-inexistente'] },
        React.createElement(Routes, null,
          React.createElement(Route, { path: '*', element: React.createElement(Page) }),
          React.createElement(Route, { path: '/', element: React.createElement('h1', null, 'Login') }),
          React.createElement(Route, { path: '/mainHomeScreen', element: React.createElement('h1', null, 'Home') })))))
      assert.equal(document.querySelector('h1').textContent, 'Ops! Página não encontrada')
      assert.equal(document.querySelector('.help-link').getAttribute('href'), 'mailto:astro.instituto@gmail.com')
      const button = document.querySelector('.status-screen-actions button')
      assert.equal(button.disabled, status === 'loading')
      if (status === 'ready') {
        await React.act(async () => button.click())
        assert.equal(document.querySelector('h1').textContent, user ? 'Home' : 'Login')
      }
    } finally {
      await React.act(async () => root.unmount())
      dom.window.close()
      Object.assign(global, previous)
    }
  }
})

test('ajuda mantém carregamento até perder foco, expirar ou desmontar', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>')
  const previous = { window: global.window, document: global.document, IS_REACT_ACT_ENVIRONMENT: global.IS_REACT_ACT_ENVIRONMENT }
  Object.assign(global, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
  let timeout
  dom.window.setTimeout = callback => { timeout = callback; return 1 }
  dom.window.clearTimeout = () => { timeout = null }
  const env = environment(), Help = env.load('src/components/helpLink/index.tsx').default
  const store = env.load('src/utils/actionFeedback.ts')
  const root = createRoot(document.getElementById('root'))
  try {
    await React.act(async () => root.render(React.createElement(Help)))
    const link = document.querySelector('a')
    link.addEventListener('click', event => event.preventDefault())
    await React.act(async () => { link.click(); link.click() })
    assert.equal(store.getActionFeedback().pending, 1)
    assert.equal(link.getAttribute('aria-busy'), 'true')
    await React.act(async () => window.dispatchEvent(new window.Event('blur')))
    assert.equal(store.getActionFeedback().pending, 0)
    assert.equal(timeout, null)
    await React.act(async () => link.click())
    await React.act(async () => timeout())
    assert.equal(store.getActionFeedback().pending, 0)
    await React.act(async () => link.click())
    await React.act(async () => root.unmount())
    assert.equal(store.getActionFeedback().pending, 0)
  } finally {
    await React.act(async () => root.unmount())
    dom.window.close()
    Object.assign(global, previous)
  }
})

test('preferências são isoladas por conta, não atuam no login e resetam ao sair', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://astro.test' })
  const globals = { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, requestAnimationFrame: callback => { callback(); return 0 }, IS_REACT_ACT_ENVIRONMENT: true }
  const previous = Object.fromEntries(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(global, key)]))
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(global, key, { value, configurable: true, writable: true })
  const auth = { user: null, status: 'loading' }
  const env = environment({ '../../hooks/useAuthentication': { useAuthentication: () => auth } })
  const Provider = env.load('src/providers/accessibility/index.tsx').default
  const { useAccessibility } = env.load('src/hooks/useAccessibility.ts')
  const storage = env.load('src/utils/accessibility.ts')
  storage.saveAccessibility({ ...storage.DEFAULT_ACCESSIBILITY, textSize: 125, highContrast: true }, 'A')
  let controls
  function Probe() {
    const current = useAccessibility()
    React.useEffect(() => { controls = current }, [current])
    return null
  }
  const root = createRoot(document.getElementById('root'))
  const render = async () => React.act(async () => root.render(React.createElement(Provider, null, React.createElement(Probe))))
  try {
    await render()
    assert.equal(document.documentElement.dataset.astroTextSize, '100')
    await React.act(async () => { controls.update({ textSize: 150 }); controls.openPanel() })
    assert.equal(controls.panelOpen, false)
    auth.user = { uid: 'A' }; auth.status = 'ready'; await render()
    assert.equal(document.documentElement.dataset.astroTextSize, '125')
    await React.act(async () => { controls.update({ textSize: 140 }); controls.openPanel() })
    assert.equal(controls.panelOpen, true)
    assert.equal(JSON.parse(localStorage.getItem(storage.ACCESSIBILITY_KEY)).accountId, 'A')
    auth.user = { uid: 'B' }; await render()
    assert.deepEqual(controls.preferences, storage.DEFAULT_ACCESSIBILITY)
    assert.equal(controls.panelOpen, false)
    await React.act(async () => controls.update({ dyslexicFont: true, readingGuide: true, libras: true }))
    auth.user = null; await render()
    assert.deepEqual(controls.preferences, storage.DEFAULT_ACCESSIBILITY)
    assert.equal(document.documentElement.dataset.astroDyslexic, 'false')
    assert.equal(document.documentElement.dataset.astroContrast, 'false')
    assert.equal(document.documentElement.dataset.astroTextSize, '100')
    assert.equal(localStorage.getItem(storage.ACCESSIBILITY_KEY), null)
    await React.act(async () => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a', code: 'KeyA', altKey: true, bubbles: true })))
    assert.equal(controls.panelOpen, false)
    auth.user = { uid: 'B' }; await render()
    assert.deepEqual(controls.preferences, storage.DEFAULT_ACCESSIBILITY)
  } finally {
    await React.act(async () => root.unmount())
    dom.window.close()
    for (const [key, descriptor] of Object.entries(previous)) { if (descriptor) Object.defineProperty(global, key, descriptor); else delete global[key] }
  }
})

test('overlay normal é fechado antes do primeiro layout do frame do planeta', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>')
  const previous = { window: global.window, document: global.document, IS_REACT_ACT_ENVIRONMENT: global.IS_REACT_ACT_ENVIRONMENT }
  Object.assign(global, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
  let closed = false
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  dom.window.HTMLDialogElement.prototype.close = function () { closed = true; this.removeAttribute('open') }
  const env = environment()
  const Overlay = env.load('src/components/loginLoadingOverlay/index.tsx').default
  const Loading = env.load('src/components/loadingScreenState/index.tsx').default
  function PlanetFrame() {
    React.useLayoutEffect(() => { assert.equal(closed, true) }, [])
    return React.createElement(Loading, { label: 'Carregando', planet: true })
  }
  const root = createRoot(document.getElementById('root'))
  try {
    await React.act(async () => root.render(React.createElement(Overlay)))
    assert.ok(document.querySelector('.login-loading-spinner'))
    await React.act(async () => root.render(React.createElement(PlanetFrame)))
    assert.ok(document.querySelector('.loading-planet-svg'))
    assert.equal(document.querySelector('.login-loading-spinner'), null)
  } finally {
    await React.act(async () => root.unmount())
    dom.window.close()
    Object.assign(global, previous)
  }
})

test('entrada no planeta preserva o SVG ao confirmar a sessão e só depois inicia a ida à Home', async () => {
  const { MemoryRouter, useNavigate } = require('react-router-dom')
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost' })
  const previous = { window: global.window, document: global.document, IS_REACT_ACT_ENVIRONMENT: global.IS_REACT_ACT_ENVIRONMENT }
  Object.assign(global, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
  dom.window.scrollTo = () => {}
  const timers = []
  dom.window.setTimeout = (callback, duration) => { timers.push({ callback, duration }); return timers.length }
  dom.window.clearTimeout = () => {}
  const context = { status: 'ready', user: null, error: '' }
  function beginLogin(navigate) {
    context.status = 'authenticating'
    navigate('/loadingScreen', { state: { afterLogin: true } })
  }
  function Login() {
    const navigate = useNavigate()
    return React.createElement('button', { onClick: () => beginLogin(navigate) }, 'Concluir login')
  }
  const authentication = { useAuthentication: () => context }
  const env = environment({
    '../hooks/useAuthentication': authentication,
    '../../hooks/useAuthentication': authentication,
    '../../hooks/useSessionRecovery': { useSessionRecovery: () => ({ pending: false, error: '', retry() {}, returnToLogin() {} }) },
    '../pages/login': { __esModule: true, default: Login },
    '../pages/mainHomeScreen': { __esModule: true, default: () => React.createElement('h1', null, 'Home') },
  })
  const Routes = env.load('src/routes/index.tsx').default
  const root = createRoot(document.getElementById('root'))
  const render = () => root.render(React.createElement(MemoryRouter, null, React.createElement(Routes)))
  try {
    await React.act(async () => render())
    await React.act(async () => document.querySelector('button').click())
    const planet = document.querySelector('.loading-planet-svg')
    assert.ok(planet)
    assert.ok(document.querySelector('.astro-route-content--planet'))
    assert.equal(document.querySelector('.login-loading-spinner'), null)
    assert.equal(timers.some(timer => timer.duration === 10000), false)
    context.status = 'ready'; context.user = { uid: 'manager', accountType: 'GESTOR' }
    await React.act(async () => render())
    assert.equal(document.querySelector('.loading-planet-svg'), planet)
    const homeTimer = timers.find(timer => timer.duration === 10000)
    assert.ok(homeTimer)
    await React.act(async () => homeTimer.callback())
    assert.match(document.body.textContent, /Home/)
    assert.equal(document.querySelector('.loading-planet-svg'), null)
  } finally {
    await React.act(async () => root.unmount())
    dom.window.close()
    Object.assign(global, previous)
  }
})
test('ações simultâneas exibem um único Carregando, liberado apenas após todas terminarem', async () => {
  const dom = new JSDOM('<div id="root"><button>Origem</button></div><dialog open><button>Confirmar</button></dialog>')
  const previous = { window: global.window, document: global.document, IS_REACT_ACT_ENVIRONMENT: global.IS_REACT_ACT_ENVIRONMENT }
  Object.assign(global, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
  const env = environment(), Host = env.load('src/components/actionFeedbackHost/index.tsx').default
  const store = env.load('src/utils/actionFeedback.ts')
  const root = createRoot(document.getElementById('root'))
  try {
    await React.act(async () => root.render(React.createElement(Host)))
    let finishFirst, finishSecond
    await React.act(async () => { finishFirst = store.beginActionLoading(); finishSecond = store.beginActionLoading() })
    assert.equal(document.querySelectorAll('.login-loading-overlay').length, 1)
    assert.equal(document.querySelector('.login-loading-label').textContent, 'Carregando')
    assert.equal(document.querySelector('.login-loading-overlay').tagName, 'DIALOG')
    assert.equal(document.querySelector('.login-loading-overlay').open, true)
    assert.equal(document.querySelector('.login-loading-overlay').parentElement, document.body)
    await React.act(async () => { finishFirst(); finishFirst() })
    assert.equal(store.getActionFeedback().pending, 1)
    assert.equal(document.querySelectorAll('.login-loading-overlay').length, 1)
    await React.act(async () => finishSecond())
    assert.equal(document.querySelector('.login-loading-overlay'), null)
    assert.equal(Boolean(document.getElementById('root').inert), false)
    assert.equal(Boolean(document.querySelector('dialog button').inert), false)
  } finally { await React.act(async () => root.unmount()); dom.window.close(); Object.assign(global, previous) }
})
test('notificação sobrevive à origem, pausa com foco, fecha com animação e expira; repetição renova o aviso', async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const previous = { window: global.window, document: global.document, IS_REACT_ACT_ENVIRONMENT: global.IS_REACT_ACT_ENVIRONMENT }
  Object.assign(global, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
  let sequence = 0; const timers = new Map()
  dom.window.setTimeout = (callback, delay) => { const id = ++sequence; timers.set(id, { callback, delay }); return id }
  dom.window.clearTimeout = id => timers.delete(id)
  const runTimer = async delay => {
    const entry = [...timers].find(([, item]) => item.delay === delay)
    assert.ok(entry, `Timer ${delay}ms`)
    timers.delete(entry[0]); await React.act(async () => entry[1].callback())
  }
  const env = environment(), Host = env.load('src/components/actionFeedbackHost/index.tsx').default
  const useFeedback = env.load('src/hooks/useActionFeedback.ts').useActionFeedback
  const store = env.load('src/utils/actionFeedback.ts')
  const root = createRoot(document.getElementById('root'))
  function Origin() { const notify = useFeedback(); return React.createElement('button', { onClick: () => notify('Amanda agora tem acesso de gestor.') }, 'Concluir') }
  try {
    await React.act(async () => root.render(React.createElement(React.Fragment, null, React.createElement(Host), React.createElement(Origin))))
    await React.act(async () => document.querySelector('button').click())
    assert.match(document.querySelector('.astro-action-notice [role=status]').textContent, /Amanda/)
    await React.act(async () => root.render(React.createElement(Host)))
    assert.equal(document.querySelectorAll('.astro-action-notice').length, 1)
    const oldId = store.getActionFeedback().notices[0].id
    await React.act(async () => store.notifyAction('Amanda agora tem acesso de gestor.'))
    assert.equal(document.querySelectorAll('.astro-action-notice').length, 1)
    assert.ok(store.getActionFeedback().notices[0].id > oldId)
    await React.act(async () => document.querySelector('[aria-label="Fechar notificação"]').focus())
    assert.equal(timers.size, 0)
    await React.act(async () => document.querySelector('[aria-label="Fechar notificação"]').click())
    assert.equal(document.querySelector('.astro-action-notice').dataset.leaving, 'true')
    await runTimer(180)
    assert.equal(document.querySelector('.astro-action-notice'), null)
    await React.act(async () => store.notifyAction('Alterações salvas.'))
    await runTimer(5000); await runTimer(180)
    assert.equal(document.querySelector('.astro-action-notice'), null)
    await React.act(async () => store.notifyAction('Não foi possível salvar.', 'error'))
    assert.match(document.querySelector('.astro-action-notice [role=alert]').textContent, /Não foi possível/)
    assert.ok(document.querySelector('.astro-action-notice .astro-icon--warning-circle'))
  } finally { await React.act(async () => root.unmount()); dom.window.close(); Object.assign(global, previous) }
})

test('impedimento de ativação gera aviso temporário sem erro inline, mantém o popup e permite nova tentativa', async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const previous = { window: global.window, document: global.document, IS_REACT_ACT_ENVIRONMENT: global.IS_REACT_ACT_ENVIRONMENT }
  Object.assign(global, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
  let confirmed = 0, attempts = 0
  const message = 'Não é permitido ativar um colaborador sem autenticação concluída'
  const Modal = ({ children, title, onClose }) => React.createElement('dialog', { open: true, 'aria-label': title }, children(onClose))
  const env = environment({ '../appModal': { __esModule: true, default: Modal } })
  const Host = env.load('src/components/actionFeedbackHost/index.tsx').default
  const Confirmation = env.load('src/components/confirmationModal/index.tsx').default
  const store = env.load('src/utils/actionFeedback.ts')
  const root = createRoot(document.getElementById('root'))
  try {
    await React.act(async () => root.render(React.createElement(React.Fragment, null, React.createElement(Host), React.createElement(Confirmation, {
      title: 'Deseja ativar este colaborador?', confirmLabel: 'Ativar', onCancel() {}, onConfirmed() { confirmed++ }, onConfirm: async () => { attempts++; return message },
    }))))
    const activate = [...document.querySelectorAll('button')].find(button => button.textContent === 'Ativar')
    await React.act(async () => activate.click())
    assert.equal(document.querySelector('.astro-confirmation-error'), null)
    assert.equal(document.querySelector('.astro-action-notice [role=alert]').textContent, message)
    assert.equal(document.querySelector('.astro-action-notices').parentElement.tagName, 'DIALOG')
    assert.equal(confirmed, 0)
    assert.equal(activate.disabled, false)
    const firstId = store.getActionFeedback().notices[0].id
    await React.act(async () => activate.click())
    assert.equal(attempts, 2)
    assert.ok(store.getActionFeedback().notices[0].id > firstId)
    assert.equal(document.querySelectorAll('.astro-action-notice').length, 1)
    const dialog = document.querySelector('dialog')
    await React.act(async () => { dialog.removeAttribute('open'); dialog.dispatchEvent(new dom.window.Event('close')) })
    assert.equal(document.querySelector('.astro-action-notices').parentElement, document.body)
    assert.equal(document.querySelector('.astro-action-notice [role=alert]').textContent, message)
  } finally { await React.act(async () => root.unmount()); dom.window.close(); Object.assign(global, previous) }
})
