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
