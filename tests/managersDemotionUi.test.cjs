const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

function environment(status = 'ATIVO') {
  const slots = [], notices = [], calls = []
  let cursor = 0, frame
  const person = { id: '42', name: 'Ana Silva', email: 'ana@example.test', unitId: '8', unit: 'Sede', status }
  const api = { managers: [person], loading: false, saving: false, error: '',
    demote: async id => { calls.push(id); return { error: null, manager: person } } }
  const trigger = { focus() { calls.push('trigger-focus') } }
  const origin = { focus() { calls.push('origin-focus') } }
  const actions = { openId: '42', closing: false, style: {}, triggerRef: { current: trigger }, panelRef: { current: null }, close(next) { next?.() } }
  const react = {
    useRef(value) { const index = cursor++; slots[index] ??= { current: value }; return slots[index] },
    useState(initial) { const index = cursor++; slots[index] ??= { value: initial }; return [slots[index].value, update => { slots[index].value = typeof update === 'function' ? update(slots[index].value) : update }] },
    useEffect() {},
  }
  const cache = new Map()
  function load(filename) {
    filename = path.resolve(filename)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'module', 'exports', code)(name => {
      if (name === 'react') return react
      if (name === 'react-dom') return { createPortal: child => child }
      if (name === '../../hooks/useManagers') return { useManagers: () => api }
      if (name === '../../hooks/useActionFeedback') return { useActionFeedback: () => (message, tone) => notices.push({ message, tone }) }
      if (name === '../../hooks') return { useActionsMenu: () => actions }
      if (name === '../../components') return Object.fromEntries(['AppSidebar', 'AstroIcon', 'CompactPurpleButton', 'ConfirmationModal', 'DataTable', 'OptionsPopup', 'ToolbarSearch', 'TruncatedText'].map(component => [component, component]))
      if (name.startsWith('../../components/')) return { default: name }
      if (!name.startsWith('.')) return require(name)
      return load(path.resolve(path.dirname(filename), `${name}.ts`))
    }, module, module.exports)
    return module.exports
  }
  function elements(node) {
    if (!node || typeof node !== 'object') return []
    if (Array.isArray(node)) return node.flatMap(elements)
    return [node, ...elements(node.props?.children)]
  }
  const Page = load('src/pages/mainManagerScreen/index.tsx').default
  return { api, calls, notices,
    render() {
      cursor = 0
      const previous = global.document
      global.document = { body: {} }
      try { frame = elements(Page()); frame.find(node => node.type === 'CompactPurpleButton').props.ref.current = origin } finally { global.document = previous }
      return frame
    },
    menu() { return frame.find(node => node.type === 'OptionsPopup') },
    confirmation() { return frame.find(node => node.type === 'ConfirmationModal') },
  }
}

test('despromoção aparece para todos os status e exige confirmação, com cancelamento sem escrita', async () => {
  for (const status of ['ATIVO', 'DESATIVADO', 'PRE_CADASTRADO']) {
    const env = environment(status)
    env.render()
    const item = env.menu().props.items.find(item => item.id === 'demote')
    assert.equal(item.label, 'Despromover para colaborador')
    item.onSelect()
    assert.deepEqual(env.calls, [])
    env.render()
    const modal = env.confirmation()
    assert.match(modal.props.title, /Ana Silva/)
    assert.match(modal.props.description, /status.*cargo.*unidade.*histórico/)
    assert.equal(modal.props.confirmLabel, 'Despromover')
    modal.props.onCancel()
    env.render()
    assert.equal(env.confirmation(), undefined)
    assert.deepEqual(env.calls, ['trigger-focus'])
  }
})

test('confirmação envia o ID, propaga erro para retry e restaura foco após a remoção da linha', async () => {
  const env = environment()
  env.render()
  env.menu().props.items.find(item => item.id === 'demote').onSelect()
  env.render()
  env.api.demote = async id => { env.calls.push(id); return { error: 'Sem permissão.', manager: null } }
  assert.equal(await env.confirmation().props.onConfirm(), 'Sem permissão.')
  assert.deepEqual(env.notices, [])
  env.api.demote = async id => { env.calls.push(id); return { error: null, manager: { name: 'Ana Silva' } } }
  assert.equal(await env.confirmation().props.onConfirm(), null)
  assert.deepEqual(env.notices, [{ message: 'Ana Silva voltou a ser colaborador(a).', tone: undefined }])
  const previous = global.requestAnimationFrame
  global.requestAnimationFrame = action => action()
  try { env.confirmation().props.onConfirmed() } finally { global.requestAnimationFrame = previous }
  env.render()
  assert.equal(env.confirmation(), undefined)
  assert.deepEqual(env.calls, ['42', '42', 'origin-focus'])
})
