const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const React = require('react'), { act } = React
const { JSDOM } = require('jsdom')

function environment() {
  const cache = new Map()
  function load(file) {
    const filename = path.resolve(file)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'module', 'exports', code)(name => {
      if (name === '../astroIcon') return { __esModule: true, default: () => null }
      if (!name.startsWith('.')) return require(name)
      const target = path.resolve(path.dirname(filename), name)
      return load([`${target}.ts`, `${target}.tsx`, path.join(target, 'index.tsx')].find(fs.existsSync))
    }, module, module.exports)
    return module.exports
  }
  return { load }
}

const fields = [
  { id: 'status', label: 'Status', options: [{ value: '', label: 'Todos' }, { value: 'active', label: 'Ativo' }] },
  { id: 'minimum', label: 'Quantidade mínima', kind: 'number' },
  { id: 'maximum', label: 'Quantidade máxima', kind: 'number', minimumField: 'minimum' },
]

test('intervalos respeitam limites inclusivos e filtros vazios; controles não ultrapassam limites', () => {
  const { validateListFilters, matchesCountRange, stepFilterCount } = environment().load('src/utils/listFilters.ts')
  assert.deepEqual(validateListFilters(fields, { status: '', minimum: '0', maximum: '0' }), {})
  for (const value of ['-1', '1.5', '1e3', '9007199254740992']) assert.ok(validateListFilters(fields, { minimum: value }).minimum)
  assert.ok(validateListFilters(fields, { minimum: '5', maximum: '2' }).maximum)
  assert.ok(validateListFilters(fields, { status: 'fake' }).status)
  assert.equal(matchesCountRange(0, '0', '0'), true)
  assert.equal(matchesCountRange(1, '0', '0'), false)
  assert.equal(matchesCountRange(10, '5', '10'), true)
  assert.equal(matchesCountRange(100, '', ''), true)
  assert.equal(stepFilterCount('', 1), '1')
  assert.equal(stepFilterCount('0', -1), '0')
  assert.equal(stepFilterCount('3', -1), '2')
  assert.equal(stepFilterCount(String(Number.MAX_SAFE_INTEGER), 1), String(Number.MAX_SAFE_INTEGER))
})

test('popup preserva rascunho até aplicar, descarta ao cancelar, valida intervalo e limpa filtros', async () => {
  const dom = new JSDOM('<main><div id="root"></div></main>', { url: 'http://localhost' })
  const keys = ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT', 'requestAnimationFrame', 'getComputedStyle']
  const previous = Object.fromEntries(keys.map(key => [key, global[key]]))
  Object.assign(global, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true, requestAnimationFrame: callback => setTimeout(callback, 0), getComputedStyle: dom.window.getComputedStyle })
  dom.window.matchMedia = () => ({ matches: true }); dom.window.scrollTo = () => {}
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true }
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new dom.window.Event('close')) }
  const root = require('react-dom/client').createRoot(document.getElementById('root'))
  try {
    const Control = environment().load('src/components/listFilterControl/index.tsx').default
    const applied = []
    function Harness() {
      const [values, setValues] = React.useState({ status: '', minimum: '', maximum: '' })
      return React.createElement(Control, { label: 'Filtrar unidades', fields, values, onApply: value => { applied.push(value); setValues(value) } })
    }
    await act(async () => root.render(React.createElement(Harness)))
    const trigger = () => document.querySelector('button[aria-haspopup=dialog]')
    const click = async text => act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === text).click())
    const fill = async (index, value) => act(async () => {
      const input = document.querySelectorAll('input[type=number]')[index]
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value)
      input.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
    await act(async () => { trigger().focus(); trigger().click() })
    assert.equal(document.activeElement.tagName, 'H2')
    const decrease = () => document.querySelector('button[aria-label="Diminuir quantidade mínima"]')
    assert.equal(decrease().disabled, true)
    await act(async () => document.querySelector('button[aria-label="Aumentar quantidade mínima"]').click())
    assert.equal(document.querySelector('input[type=number]').value, '1')
    await act(async () => decrease().click())
    assert.equal(document.querySelector('input[type=number]').value, '0')
    assert.equal(decrease().disabled, true)
    await fill(0, '5')
    assert.equal(applied.length, 0)
    await act(async () => document.querySelector('dialog').dispatchEvent(new window.Event('cancel', { cancelable: true })))
    assert.equal(document.querySelector('dialog'), null)
    assert.equal(document.activeElement, trigger())
    await act(async () => trigger().click())
    assert.equal(document.querySelector('input[type=number]').value, '')
    await fill(0, '5'); await fill(1, '2'); await click('Aplicar filtros')
    assert.equal(applied.length, 0)
    assert.match(document.querySelector('[role=alert]').textContent, /máxima.*mínima/)
    await fill(1, '10'); await click('Aplicar filtros')
    assert.deepEqual(applied[0], { status: '', minimum: '5', maximum: '10' })
    assert.match(trigger().getAttribute('aria-label'), /2 filtros ativos/)
    await act(async () => trigger().click()); await click('Limpar filtros')
    assert.deepEqual(applied[1], { status: '', minimum: '', maximum: '' })
    assert.equal(trigger().getAttribute('aria-expanded'), 'false')
  } finally {
    await act(async () => root.unmount())
    dom.window.close(); Object.assign(global, previous)
  }
})
