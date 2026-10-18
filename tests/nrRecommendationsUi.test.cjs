const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { createRoot } = require('react-dom/client')
const { JSDOM } = require('jsdom')
global.IS_REACT_ACT_ENVIRONMENT = true

test('sugestões marcam apenas linhas correspondentes e preservam a seleção manual em espera, erro e retry', async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const previous = { window: global.window, document: global.document, getComputedStyle: global.getComputedStyle }
  global.window = dom.window; global.document = dom.window.document; global.getComputedStyle = dom.window.getComputedStyle
  const cache = new Map()
  function load(filename) {
    filename = path.resolve(filename)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'module', 'exports', code)(specifier => {
      if (specifier === '../appModal') return { __esModule: true, default: ({ children }) => React.createElement('dialog', { open: true, className: 'nrs-edit-dialog' }, children(() => {})) }
      if (!specifier.startsWith('.')) return require(specifier)
      const resolved = path.resolve(path.dirname(filename), specifier)
      return load([`${resolved}.ts`, `${resolved}.tsx`, path.join(resolved, 'index.tsx')].find(file => fs.existsSync(file)))
    }, module, module.exports)
    return module.exports
  }
  const Component = load('src/components/editRegulatoryStandardsDialog/index.tsx').default
  const root = createRoot(dom.window.document.getElementById('root'))
  let saved, retried = 0
  let props = {
    enabledIds: ['1'], positionName: 'Operador', onCancel() {},
    onRequestConfirmation(ids) { saved = ids },
    rows: [1, 4, 6].map(id => ({ id: String(id), code: `NR ${id}`, description: `Descrição ${id}.` })),
    onRetryRecommendations() { retried++ }, recommendationsLoading: true,
  }
  const render = async updates => { props = { ...props, ...updates }; await React.act(async () => root.render(React.createElement(Component, props))) }
  const click = async selector => { await React.act(async () => dom.window.document.querySelector(selector).click()) }
  try {
    await render({})
    assert.match(dom.window.document.querySelector('[role=status]').textContent, /Consultando/)
    await click('input[aria-label="Ativar NR 4"]')
    await render({ recommendationsLoading: false, recommendedIds: ['4', '6', '99'], recommendationDescriptions: { '4': 'Justificativa exclusiva da NR 4.', '6': 'Justificativa da NR 6.' } })
    assert.equal(dom.window.document.querySelectorAll('.nrs-edit-row-recommendation').length, 2)
    assert.match(dom.window.document.querySelector('.nrs-edit-recommendation').textContent, /Recomendação de IA/)
    assert.equal(dom.window.document.querySelector('input[aria-label="Ativar NR 6"]').checked, false)
    assert.equal(dom.window.document.querySelector('input[aria-label="Desativar NR 4"]').checked, true)
    await click('button[aria-label="Ver recomendação de IA para NR 4"]')
    assert.match(dom.window.document.querySelector('[role=tooltip]').textContent, /Justificativa exclusiva da NR 4/)
    const tooltip = dom.window.document.querySelector('[role=tooltip]')
    assert.equal(dom.window.document.querySelector('button[aria-label="Ver recomendação de IA para NR 4"]').getAttribute('aria-describedby'), tooltip.id)
    await React.act(async () => dom.window.document.querySelector('button[aria-label="Ver recomendação de IA para NR 4"]').dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    assert.equal(dom.window.document.querySelector('[role=tooltip]'), null)
    await render({ recommendedIds: [], recommendationsError: 'IA indisponível.' })
    assert.match(dom.window.document.querySelector('[role=alert]').textContent, /edição manual continua disponível/)
    await click('.nrs-edit-ai-feedback button')
    assert.equal(retried, 1)
    await click('.nrs-edit-footer-actions .astro-action')
    assert.deepEqual(saved, ['1', '4'])
    await render({ recommendationsError: '' })
    assert.equal(dom.window.document.querySelector('.nrs-edit-ai-feedback'), null)
    assert.equal(dom.window.document.querySelector('.nrs-edit-recommendation'), null)
  } finally {
    await React.act(async () => root.unmount()); dom.window.close(); Object.assign(global, previous)
  }
})
