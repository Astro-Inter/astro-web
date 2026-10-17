const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { createRoot } = require('react-dom/client')
const { JSDOM } = require('jsdom')
const { act } = React
global.IS_REACT_ACT_ENVIRONMENT = true
function deferred() { let resolve; const promise = new Promise(yes => { resolve = yes }); return { promise, resolve } }

async function setup(component, props) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.test' })
  const previous = { window: global.window, document: global.document }
  global.window = dom.window; global.document = dom.window.document
  let closed = 0
  const cache = new Map()
  const stubs = {
    '../appModal': { default: ({ children, dismissible = true }) => React.createElement('section', { 'data-dismissible': dismissible }, children(() => { closed++ })) },
    '../toolbarSelect': { default: ({ id, options, onValueChange, value }) => React.createElement('select', { id, value, onChange: event => onValueChange(event.target.value) }, options.map(option => React.createElement('option', { key: option.value, value: option.value }, option.label))) },
    '../formDatePicker': { default: ({ id, value, onChange }) => React.createElement('input', { id, value, onChange: event => onChange(event.target.value) }) },
    '../spreadsheetDropzone': { default: ({ id, disabled, onFileSelect }) => React.createElement('input', { id, type: 'file', disabled, onChange: event => onFileSelect(event.target.files[0]) }) },
    '../spreadsheetExplanationModal': { default: () => null },
    '../astroIcon': { default: () => null },
  }
  Object.values(stubs).forEach(stub => { stub.__esModule = true })
  function load(filename) {
    filename = path.resolve(filename)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'module', 'exports', code)(specifier => {
      if (stubs[specifier]) return stubs[specifier]
      if (!specifier.startsWith('.')) return require(specifier)
      const resolved = path.resolve(path.dirname(filename), specifier)
      return load([`${resolved}.ts`, `${resolved}.tsx`, path.join(resolved, 'index.tsx')].find(file => fs.existsSync(file)))
    }, module, module.exports)
    return module.exports
  }
  const Component = load(`src/components/${component}/index.tsx`).default
  const root = createRoot(dom.window.document.getElementById('root'))
  let currentProps = props
  async function render(nextProps = {}) { currentProps = { ...currentProps, ...nextProps }; await act(async () => root.render(React.createElement(Component, currentProps))) }
  await render()
  return {
    document: dom.window.document, get closed() { return closed }, render,
    async select(id, value) { await act(async () => { const field = dom.window.document.getElementById(id); field.value = value; field.dispatchEvent(new dom.window.Event('change', { bubbles: true })) }) },
    async file(file) { await act(async () => { const field = dom.window.document.querySelector('input[type=file]'); Object.defineProperty(field, 'files', { configurable: true, value: [file] }); field.dispatchEvent(new dom.window.Event('change', { bubbles: true })) }) },
    async submit() { await act(async () => { dom.window.document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })) }) },
    async close() { await act(async () => root.unmount()); dom.window.close(); global.window = previous.window; global.document = previous.document },
  }
}

test('filtro oferece apenas Evento e Manual e aplica a origem selecionada', async () => {
  let applied
  const env = await setup('conformityFilterModal', { filters: { nr: '', origin: '', from: '', to: '' }, nrs: ['NR 10'], onClose() {}, onApply(filters) { applied = filters } })
  try {
    const select = env.document.getElementById('conformity-filter-origin')
    assert.deepEqual([...select.options].map(option => option.value), ['', 'Evento', 'Manual'])
    await env.select('conformity-filter-origin', 'Evento')
    await env.submit()
    assert.equal(applied.origin, 'Evento')
    assert.equal(env.closed, 1)
  } finally { await env.close() }
})

test('formulário aguarda a API, bloqueia envio duplo e mantém os campos após erro acessível', async () => {
  const pending = deferred()
  let calls = 0
  const env = await setup('conformityFormModal', { employees: [{ id: '7', name: 'Ana' }], nrs: ['NR 10'], onClose() {}, onSubmit() { calls++; return pending.promise } })
  try {
    await env.select('conformity-form-employee', '7')
    await env.select('conformity-form-nr', 'NR 10')
    await env.submit(); await env.submit()
    assert.equal(calls, 1)
    assert.equal(env.closed, 0)
    assert.equal(env.document.querySelector('[data-dismissible]').dataset.dismissible, 'false')
    assert.equal(env.document.querySelector('button[type=submit]').disabled, true)
    assert.match(env.document.querySelector('[role=status]').textContent, /Salvando/)
    await act(async () => pending.resolve('Conformidade já cadastrada.'))
    assert.equal(env.closed, 0)
    assert.equal(env.document.getElementById('conformity-form-employee').value, '7')
    assert.equal(env.document.getElementById('conformity-form-nr').value, 'NR 10')
    assert.match(env.document.querySelector('[role=alert]').textContent, /já cadastrada/)
    await env.render({ onSubmit: async () => null })
    await env.submit()
    assert.equal(env.closed, 1)
  } finally { await env.close() }
})

test('carregamento e falha de opções bloqueiam o formulário e oferecem nova tentativa', async () => {
  let retries = 0, submitted = 0
  const env = await setup('conformityFormModal', { employees: [], nrs: [], loading: true, onClose() {}, onSubmit() { submitted++; return null }, onRetry() { retries++ } })
  try {
    assert.match(env.document.querySelector('[role=status]').textContent, /Carregando/)
    assert.equal(env.document.querySelector('fieldset').disabled, true)
    await env.submit()
    assert.equal(submitted, 0)
    await env.render({ loading: false, loadError: 'NRs indisponíveis.' })
    assert.match(env.document.querySelector('[role=alert]').textContent, /NRs indisponíveis/)
    await act(async () => env.document.querySelector('[role=alert] button').click())
    assert.equal(retries, 1)
    assert.equal(env.document.querySelector('button[type=submit]').disabled, true)
  } finally { await env.close() }
})

test('edição de colaborador histórico mantém ID e email sem depender da seleção de colaboradores ativos', async () => {
  let saved
  const env = await setup('conformityFormModal', { employee: { name: 'Ana', email: 'ana@example.test' }, employees: [], nrs: ['NR 10'],
    initialValues: { employeeId: '7', nr: 'NR 10', expiresAt: '' }, onClose() {}, onSubmit(values) { saved = values; return null } })
  try {
    assert.match(env.document.body.textContent, /ana@example.test/)
    assert.equal(env.document.getElementById('conformity-form-employee'), null)
    await env.submit()
    assert.deepEqual(saved, { employeeId: '7', nr: 'NR 10', expiresAt: '' })
    assert.equal(env.closed, 0)
  } finally { await env.close() }
})

test('importação aguarda o servidor, mostra totais e rejeições e bloqueia reenvio do lote confirmado', async () => {
  const pending = deferred()
  let calls = 0
  const env = await setup('importConformityModal', { onClose() {}, onManualAdd() {}, onImport() { calls++; return pending.promise } })
  try {
    await env.file(new File(['data'], 'conformidades.xlsx'))
    await env.submit(); await env.submit()
    assert.equal(calls, 1)
    assert.equal(env.closed, 0)
    assert.equal(env.document.querySelector('input[type=file]').disabled, true)
    assert.match(env.document.querySelector('[role=status]').textContent, /Importando/)
    await act(async () => pending.resolve({ error: null, data: { processed: 3, inserted: 1, updated: 1, rejected: 1, rejectedRows: [{ row: 4, cpf: '00123456789', nr: '10', reason: 'Data inválida.' }] } }))
    assert.match(env.document.querySelector('[role=status]').textContent, /3 processadas, 1 adicionadas, 1 atualizadas e 1 rejeitadas/)
    assert.match(env.document.querySelector('[role=alert]').textContent, /Linha 4.*Data inválida/)
    assert.equal(env.closed, 0)
    await env.submit()
    assert.equal(calls, 1)
    assert.equal(env.document.querySelector('button[type=submit]'), null)
  } finally { await env.close() }
})

test('erro de importação mantém o arquivo selecionado e permite tentar novamente', async () => {
  const uploaded = new File(['data'], 'conformidades.xls')
  const env = await setup('importConformityModal', { onClose() {}, onManualAdd() {}, onImport: async file => { assert.equal(file, uploaded); return { error: 'Serviço indisponível.', data: null } } })
  try {
    await env.file(uploaded); await env.submit()
    assert.equal(env.closed, 0)
    assert.match(env.document.querySelector('[role=alert]').textContent, /Serviço indisponível/)
    let sent
    await env.render({ onImport: async file => { sent = file; return { error: null, data: { processed: 0, inserted: 0, updated: 0, rejected: 0, rejectedRows: [] } } } })
    await env.submit()
    assert.equal(sent, uploaded)
  } finally { await env.close() }
})
