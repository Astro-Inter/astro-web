const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { act } = React
const { JSDOM } = require('jsdom')

function Modal({ children, title, onClose, open = true }) {
  return React.createElement('dialog', { open, 'aria-label': title }, typeof children === 'function' ? children(onClose) : children)
}
function environment() {
  const cache = new Map()
  function load(file) {
    const filename = path.resolve(file)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'").replaceAll('import.meta.env.VITE_API_URL', "'https://api.example.test'").replaceAll('import.meta.env.DEV', 'false')
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'module', 'exports', code)(name => {
      if (name === './firebase') return { firebaseAuth: { currentUser: { uid: 'gestor', getIdToken: async () => 'token' } } }
      if (name === './useAuthentication') return { useAuthentication: () => ({ user: { uid: 'gestor' } }) }
      if (name === '../appModal') return { __esModule: true, default: Modal }
      if (name === '../../hooks') return { useActionsMenu() {
        const [openId, setOpenId] = React.useState(null)
        const triggerRef = React.useRef(null), panelRef = React.useRef(null)
        return { openId, triggerRef, panelRef, style: {}, closing: false,
          toggle(id, trigger) { triggerRef.current = trigger; setOpenId(id) }, close(done) { setOpenId(null); done?.() } }
      } }
      if (name === '../../components') return Object.fromEntries(['AppSidebar', 'AstroChat', 'AstroIcon', 'ConfirmationModal', 'DataTable', 'EditRegulatoryStandardsDialog', 'OptionsPopup', 'RegulatoryStandardsDialog', 'ToolbarSearch', 'ToolbarSelect', 'TruncatedText'].map(component => [component,
        ['AppSidebar', 'AstroChat', 'AstroIcon'].includes(component) ? () => null : load(`src/components/${component[0].toLowerCase()}${component.slice(1)}/index.tsx`).default]))
      if (!name.startsWith('.')) return require(name)
      const target = path.resolve(path.dirname(filename), name)
      return load([target + '.ts', target + '.tsx', path.join(target, 'index.tsx')].find(fs.existsSync))
    }, module, module.exports)
    return module.exports
  }
  return { load }
}
async function click(label, within = document) {
  const button = [...within.querySelectorAll('button')].find(button => button.textContent.trim() === label || button.getAttribute('aria-label') === label)
  assert.ok(button, `Botão: ${label}`)
  await act(async () => button.click())
}

test('erro no modal mantém seleção para retry e reabrir consulta os vínculos persistidos', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  const names = ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT', 'requestAnimationFrame', 'ResizeObserver', 'getComputedStyle', 'fetch']
  const previous = Object.fromEntries(names.map(name => [name, global[name]]))
  Object.assign(global, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true,
    requestAnimationFrame: fn => { fn(); return 0 }, ResizeObserver: class { observe() {} disconnect() {} }, getComputedStyle: dom.window.getComputedStyle })
  dom.window.matchMedia = () => ({ matches: true })
  // JSDOM não mede texto; o truncamento visual não faz parte deste fluxo.
  dom.window.HTMLCanvasElement.prototype.getContext = () => null
  const env = environment()
  let options = [{ nr: 6, descricao: 'EPI', ativo: true }, { nr: 17, descricao: 'Ergonomia', ativo: false }]
  const calls = [], writes = []
  global.fetch = async (url, init) => {
    const pathname = new URL(url).pathname
    calls.push([init.method, pathname])
    assert.equal(init.headers.Authorization, 'Bearer token')
    assert.equal(new URL(url).search, '')
    if (init.method === 'POST') {
      const body = JSON.parse(init.body)
      assert.ok(Array.isArray(body))
      writes.push(body)
      if (writes.length === 1) return new Response(JSON.stringify({ success: false, message: 'Não foi possível salvar as NRs.' }), { status: 422 })
      options = options.map(row => ({ ...row, ativo: body.find(item => item.nr === row.nr).ativo }))
      return new Response(JSON.stringify({ success: true, data: null }))
    }
    const data = pathname.endsWith('/associated') ? options.filter(row => row.ativo).map(({ nr, descricao }) => ({ nr, descricao }))
      : pathname.endsWith('/nrs') ? options : [{ id_unidade: 42, nome: 'Unidade API', quantidade_colaboradores: 2, status: 'ativo' }]
    return new Response(JSON.stringify({ success: true, data }))
  }
  const { createRoot } = require('react-dom/client'), root = createRoot(document.getElementById('root'))
  try {
    const Page = env.load('src/pages/mainUnitScreen/index.tsx').default
    const Host = env.load('src/components/actionFeedbackHost/index.tsx').default
    await act(async () => root.render(React.createElement(React.Fragment, null, React.createElement(Host), React.createElement(Page))))
    await click('Ações para Unidade API'); await click('Gerenciar NRs'); await click('Editar NRs')
    const editor = document.querySelector('dialog[aria-label="Edite as NRs de Unidade API"]')
    const switches = [...editor.querySelectorAll('input[type="checkbox"]')]
    assert.deepEqual(switches.map(input => input.checked), [true, false])
    await act(async () => { switches[0].click(); switches[1].click() })
    await click('Salvar', editor)
    const confirmation = document.querySelector('dialog[aria-label="Deseja salvar as alterações das NRs desta unidade?"]')
    await click('Salvar', confirmation)
    assert.match(confirmation.querySelector('[role="alert"]').textContent, /Não foi possível salvar/)
    assert.equal(confirmation.open, true)
    assert.deepEqual(switches.map(input => input.checked), [false, true])
    assert.deepEqual(options.map(row => row.ativo), [true, false])
    await click('Salvar', confirmation)
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 100)) })
    assert.deepEqual(writes, [[{ nr: 6, ativo: false }, { nr: 17, ativo: true }], [{ nr: 6, ativo: false }, { nr: 17, ativo: true }]])
    const viewer = document.querySelector('dialog[aria-label="NRs de Unidade API"]')
    assert.match(viewer.textContent, /NR 17/)
    assert.doesNotMatch(viewer.textContent, /NR 6/)
    await click('Voltar', viewer)
    const reads = calls.length
    await click('Ações para Unidade API'); await click('Gerenciar NRs')
    assert.deepEqual(calls.slice(reads), [['GET', '/units/42/nrs/associated'], ['GET', '/units/42/nrs']])
    await click('Editar NRs')
    assert.deepEqual([...document.querySelectorAll('dialog[aria-label="Edite as NRs de Unidade API"] input[type="checkbox"]')].map(input => input.checked), [false, true])
  } finally {
    await act(async () => root.unmount())
    dom.window.close()
    Object.assign(global, previous)
  }
})
