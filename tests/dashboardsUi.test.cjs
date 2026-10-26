const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { act } = React
const { JSDOM } = require('jsdom')
const h = React.createElement
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
function environment() {
  const cache = new Map(), calls = [], notices = []
  let saved = []
  const services = { save: async (draft, existing) => ({ ...structuredClone(draft), id: existing?.id || crypto.randomUUID(), version: (existing?.version || 0) + 1, createdAt: '2026-10-25T12:00:00Z', updatedAt: '2026-10-25T12:00:00Z' }) }
  const storage = {
    loadSavedDashboards: async () => saved,
    subscribeSavedDashboards: () => () => {},
    saveDashboard: async (draft, existing) => {
      calls.push({ draft: structuredClone(draft), existing: existing && structuredClone(existing) })
      const result = await services.save(draft, existing)
      saved = [result, ...saved.filter(item => item.id !== result.id)]
      return result
    }, removeDashboard: async () => {},
  }
  function Editor({ widget, onSave, onCancel }) {
    const [title, setTitle] = React.useState(widget?.title || 'Gráfico novo')
    return h('form', { onSubmit: event => { event.preventDefault(); onSave({ id: widget?.id || crypto.randomUUID(), datasetId: 'colaboradores-tempo', title, type: 'line', width: 'half' }) } },
      h('label', null, 'Nome do gráfico', h('input', { id: 'chart-name', value: title, onChange: event => setTitle(event.target.value) })),
      h('button', { type: 'button', onClick: onCancel }, 'Cancelar'), h('button', { type: 'submit' }, 'Confirmar gráfico'))
  }
  function load(filename) {
    filename = path.resolve(filename)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'module', 'exports', code)(name => {
      if (name.endsWith('/useAuthentication')) return { useAuthentication: () => ({ user: { uid: 'test' } }) }
      if (name.endsWith('/useActionFeedback')) return { useActionFeedback: () => (message, tone) => { if (message) notices.push({ message, tone }) } }
      if (name.endsWith('/useAnalyticsData')) return { useAnalyticsData: () => ({ results: {}, errors: {}, pending: false }) }
      if (name.endsWith('/useExplorerData')) return { useExplorerData: () => ({ results: {}, errors: {}, pending: false }), useExplorerCatalog: () => ({ catalog: undefined, loading: false, error: '', retry() {} }) }
      if (name.endsWith('/services/dashboards')) return { loadAnalyticsIdentity: async () => ({ userId: '1', workspaceId: '1', role: 'GESTOR_WORKSPACE' }) }
      if (name.endsWith('/services/dashboardStorage')) return storage
      if (name.endsWith('/analyticsPageLayout')) return { __esModule: true, default: ({ children }) => h('main', null, children) }
      if (name.endsWith('/analyticsChart')) return { __esModule: true, default: () => null }
      if (name.endsWith('/analyticsEditor')) return { __esModule: true, default: Editor }
      if (name.endsWith('/actionLoading')) return { __esModule: true, default: () => null }
      if (name.endsWith('/formDatePicker')) return { __esModule: true, default: ({ id, label, value, onChange }) => h('input', { id, 'aria-label': label, value, onChange: event => onChange(event.target.value) }) }
      if (name.endsWith('/toolbarSelect')) return { __esModule: true, default: ({ id, label, value, options, onValueChange, disabled }) => h('select', { id, 'aria-label': label, value, disabled, onChange: event => onValueChange(event.target.value) }, options.map(option => h('option', { value: option.value, key: option.value }, option.label))) }
      if (name === '../../components' || name.endsWith('/astroIcon')) return { __esModule: true, AstroIcon: () => null, default: () => null }
      if (name.endsWith('/appModal')) return { __esModule: true, default: ({ title, children, onClose, dismissible }) => h('section', { role: 'dialog', 'aria-label': title }, children(() => { if (dismissible !== false) onClose() })) }
      if (!name.startsWith('.')) return require(name)
      const resolved = path.resolve(path.dirname(filename), name)
      return load([`${resolved}.ts`, `${resolved}.tsx`, path.join(resolved, 'index.tsx')].find(file => fs.existsSync(file)))
    }, module, module.exports)
    return module.exports
  }
  return { load, services, calls, notices }
}
async function withPage(run) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
  const names = ['window', 'document', 'Element', 'requestAnimationFrame', 'IS_REACT_ACT_ENVIRONMENT']
  const previous = Object.fromEntries(names.map(name => [name, global[name]]))
  Object.assign(global, { window: dom.window, document: dom.window.document, Element: dom.window.Element, requestAnimationFrame: callback => { callback(); return 0 }, IS_REACT_ACT_ENVIRONMENT: true })
  window.matchMedia = () => ({ matches: false })
  window.confirm = () => true
  const root = require('react-dom/client').createRoot(document.getElementById('root'))
  const env = environment(), Page = env.load('src/pages/mainDashboardsScreen/index.tsx').default
  try { await act(async () => root.render(h(Page))); await act(async () => new Promise(resolve => setTimeout(resolve, 200))); await run(env) }
  finally { await act(async () => root.unmount()); dom.window.close(); Object.assign(global, previous) }
}
async function click(label, scope = document) {
  const button = [...scope.querySelectorAll('button')].find(item => item.textContent === label || item.getAttribute('aria-label') === label)
  assert.ok(button, label); await act(async () => button.click())
}
async function change(id, value) {
  const input = document.getElementById(id)
  await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value); input.dispatchEvent(new window.Event('input', { bubbles: true })) })
}
function chartTitles() { return [...document.querySelectorAll('.analytics-widget > header h3')].map(element => element.textContent) }

test('popup adiciona e salva uma única vez; fecha só após sucesso e cancelar edição mantém o gráfico salvo', async () => withPage(async env => {
  assert.ok(document.querySelector('[aria-label="Visão do dashboard"]'))
  await click('Personalizar visão')
  assert.doesNotMatch(document.body.textContent, /Salvar visão|Salvar alterações/)
  await click('Adicionar gráfico')
  const pending = deferred(); env.services.save = () => pending.promise
  await click('Confirmar gráfico', document.querySelector('[role="dialog"]'))
  await act(async () => document.querySelector('[role="dialog"] form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  assert.equal(env.calls.length, 1)
  assert.ok(document.querySelector('[role="dialog"]'))
  assert.equal(chartTitles().length, 3)
  const request = env.calls[0].draft
  await act(async () => pending.resolve({ ...request, id: crypto.randomUUID(), version: 1 }))
  assert.equal(document.querySelector('[role="dialog"]'), null)
  assert.equal(chartTitles().length, 4)
  await click('Cancelar edição')
  assert.equal(chartTitles().length, 4)
  assert.ok(chartTitles().includes('Gráfico novo'))
  assert.ok(env.notices.some(notice => notice.message === 'Gráfico adicionado com sucesso.'))
}))

test('erro de salvamento preserva o popup e os campos; nova tentativa não duplica o gráfico', async () => withPage(async env => {
  await click('Personalizar visão'); await click('Adicionar gráfico'); await change('chart-name', 'Inspeções por mês')
  const save = env.services.save
  env.services.save = async () => { throw Error('Sem espaço para salvar') }
  await click('Confirmar gráfico', document.querySelector('[role="dialog"]'))
  assert.equal(document.getElementById('chart-name').value, 'Inspeções por mês')
  assert.equal(chartTitles().length, 3)
  assert.ok(env.notices.some(notice => notice.tone === 'error' && /Sem espaço/.test(notice.message)))
  env.services.save = save
  await click('Confirmar gráfico', document.querySelector('[role="dialog"]'))
  assert.equal(document.querySelector('[role="dialog"]'), null)
  assert.equal(chartTitles().filter(title => title === 'Inspeções por mês').length, 1)
  assert.equal(env.calls.length, 2)
}))

test('editar reutiliza a visão e a versão salva sem criar cópias nem duplicar gráficos', async () => withPage(async env => {
  await click('Personalizar visão'); await click('Editar Colaboradores no tempo'); await change('chart-name', 'Cadastros por mês')
  await click('Confirmar gráfico', document.querySelector('[role="dialog"]'))
  assert.equal(chartTitles().length, 3)
  assert.equal(env.calls[0].existing, null)
  await click('Editar Cadastros por mês'); await change('chart-name', 'Cadastros por período')
  await click('Confirmar gráfico', document.querySelector('[role="dialog"]'))
  assert.equal(env.calls[1].existing.version, 1)
  assert.equal(env.calls[0].draft.config.widgets[0].id, env.calls[1].draft.config.widgets[0].id)
  assert.equal(chartTitles().length, 3)
  assert.equal(chartTitles()[0], 'Cadastros por período')
}))

test('reordenar e remover salvam automaticamente; cancelar não restaura dados antigos', async () => withPage(async env => {
  await click('Personalizar visão'); await click('Mover Colaboradores no tempo para depois')
  assert.equal(env.calls.length, 1)
  assert.equal(chartTitles()[1], 'Colaboradores no tempo')
  await click('Remover Colaboradores por NR do catálogo')
  assert.equal(env.calls.length, 2)
  assert.equal(env.calls[1].existing.version, 1)
  assert.equal(chartTitles().length, 2)
  await click('Cancelar edição')
  assert.equal(chartTitles().length, 2)
  assert.equal(chartTitles()[1], 'Colaboradores no tempo')
}))

test('renomear pelo Enter salva automaticamente e cancelar mantém o nome confirmado', async () => withPage(async env => {
  await click('Personalizar visão')
  const input = document.querySelector('.analytics-view-name input')
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'Indicadores da equipe')
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  await act(async () => input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })))
  assert.equal(env.calls.length, 1)
  assert.equal(env.calls[0].draft.name, 'Indicadores da equipe')
  await click('Cancelar edição')
  assert.ok(document.body.textContent.includes('Indicadores da equipe'))
}))

test('cancelar uma alteração de nome ainda não confirmada não dispara salvamento', async () => withPage(async env => {
  await click('Personalizar visão')
  const input = document.querySelector('.analytics-view-name input')
  const cancel = [...document.querySelectorAll('button')].find(button => button.textContent === 'Cancelar edição')
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'Nome não confirmado')
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  await act(async () => input.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true, relatedTarget: cancel })))
  await click('Cancelar edição')
  assert.equal(env.calls.length, 0)
  assert.equal(document.body.textContent.includes('Nome não confirmado'), false)
}))


test('skeleton mantém saída animada antes de revelar os dados e oculta conteúdo durante nova consulta', async () => withPage(async env => {
  const Loading = env.load('src/components/analyticsLoadingContent/index.tsx').default
  const host = document.createElement('div'); document.body.append(host)
  const root = require('react-dom/client').createRoot(host)
  try {
    await act(async () => root.render(h(Loading, { loading: true }, h('p', null, 'Dados carregados'))))
    assert.equal(host.getAttribute('aria-busy'), null)
    assert.equal(host.querySelector('[aria-busy]').getAttribute('aria-busy'), 'true')
    assert.ok(host.querySelector('.api-skeleton'))
    assert.ok(!host.textContent.includes('Dados carregados'))
    await act(async () => root.render(h(Loading, { loading: false }, h('p', null, 'Dados carregados'))))
    assert.ok(host.querySelector('.analytics-skeleton--exit'))
    await act(async () => new Promise(resolve => setTimeout(resolve, 200)))
    assert.equal(host.querySelector('.api-skeleton'), null)
    assert.ok(host.textContent.includes('Dados carregados'))
    await act(async () => root.render(h(Loading, { loading: true }, h('p', null, 'Dados carregados'))))
    assert.ok(host.querySelector('.api-skeleton'))
    assert.ok(!host.textContent.includes('Dados carregados'))
  } finally { await act(async () => root.unmount()); host.remove() }
}))

test('movimento reduzido revela conteúdo sem aguardar a animação do skeleton', async () => withPage(async env => {
  window.matchMedia = () => ({ matches: true })
  const Loading = env.load('src/components/analyticsLoadingContent/index.tsx').default
  const host = document.createElement('div'); document.body.append(host)
  const root = require('react-dom/client').createRoot(host)
  try {
    await act(async () => root.render(h(Loading, { loading: true }, 'Conteúdo')))
    await act(async () => root.render(h(Loading, { loading: false }, 'Conteúdo')))
    assert.equal(host.querySelector('.api-skeleton'), null)
    assert.equal(host.textContent, 'Conteúdo')
  } finally { await act(async () => root.unmount()); host.remove() }
}))


test('visão personalizada substitui a opção padrão, sem sufixo ou duplicação, e é restaurada ao reabrir', async () => withPage(async env => {
  await click('Personalizar visão'); await click('Adicionar gráfico'); await click('Confirmar gráfico', document.querySelector('[role="dialog"]')); await click('Cancelar edição')
  const select = document.getElementById('analytics-view')
  assert.deepEqual([...select.options].map(option => option.textContent), ['Visão geral', 'Eventos'])
  assert.doesNotMatch(select.textContent, /salva/)
  await act(async () => { select.value = 'eventos'; select.dispatchEvent(new window.Event('change', { bubbles: true })) })
  assert.equal(chartTitles().includes('Gráfico novo'), false)
  const savedValue = [...select.options].find(option => option.textContent === 'Visão geral').value
  await act(async () => { select.value = savedValue; select.dispatchEvent(new window.Event('change', { bubbles: true })) })
  assert.ok(chartTitles().includes('Gráfico novo'))
  const host = document.createElement('div'); document.body.append(host)
  const root = require('react-dom/client').createRoot(host), Page = env.load('src/pages/mainDashboardsScreen/index.tsx').default
  try {
    await act(async () => root.render(h(Page)))
    await act(async () => new Promise(resolve => setTimeout(resolve, 200)))
    assert.ok([...host.querySelectorAll('.analytics-widget > header h3')].some(element => element.textContent === 'Gráfico novo'))
    for (let attempt = 0; attempt < 40 && !host.querySelector('select[aria-label="Visão do dashboard"]'); attempt++) await act(async () => new Promise(resolve => setTimeout(resolve, 25)))
    assert.equal(host.querySelector('select[aria-label="Visão do dashboard"]').value, savedValue)
  } finally { await act(async () => root.unmount()); host.remove() }
}))


test('nova visão abre popup; cancelar não altera a visão atual nem salva', async () => withPage(async env => {
  const before = chartTitles()
  await click('Nova visão')
  assert.ok(document.querySelector('[role="dialog"][aria-label="Nova visão"]'))
  assert.deepEqual(chartTitles(), before)
  await change('dashboard-view-name', 'Indicadores da equipe')
  await click('Cancelar', document.querySelector('[role="dialog"]'))
  assert.equal(document.querySelector('[role="dialog"]'), null)
  assert.equal(env.calls.length, 0)
  assert.deepEqual(chartTitles(), before)
}))

test('nova visão valida nome vazio e duplicado antes de criar e selecionar a visão', async () => withPage(async env => {
  await click('Nova visão'); await click('Criar visão')
  assert.equal(document.getElementById('dashboard-view-name').getAttribute('aria-invalid'), 'true')
  assert.equal(env.calls.length, 0)
  await change('dashboard-view-name', '  VISÃO GERAL  '); await click('Criar visão')
  assert.ok(document.body.textContent.includes('Já existe uma visão com esse nome.'))
  assert.equal(env.calls.length, 0)
  await change('dashboard-view-name', '  Indicadores da equipe  '); await click('Criar visão')
  assert.equal(document.querySelector('[role="dialog"]'), null)
  assert.equal(env.calls.length, 1)
  assert.equal(env.calls[0].draft.name, 'Indicadores da equipe')
  assert.equal(env.calls[0].existing, null)
  assert.deepEqual(env.calls[0].draft.config.widgets, [])
  assert.equal(chartTitles().length, 0)
  assert.ok([...document.querySelectorAll('#analytics-view option')].some(option => option.textContent === 'Indicadores da equipe'))
  assert.ok([...document.querySelectorAll('button')].some(button => button.textContent === 'Adicionar gráfico'))
}))

test('erro ao criar visão preserva nome no popup; repetir não sobrescreve a visão anterior', async () => withPage(async env => {
  await click('Personalizar visão'); await click('Adicionar gráfico'); await click('Confirmar gráfico', document.querySelector('[role="dialog"]')); await click('Cancelar edição')
  await click('Nova visão'); await change('dashboard-view-name', 'Resumo mensal')
  const save = env.services.save; env.services.save = async () => { throw new Error('Armazenamento indisponível') }
  await click('Criar visão')
  assert.ok(document.querySelector('[role="dialog"]'))
  assert.equal(document.getElementById('dashboard-view-name').value, 'Resumo mensal')
  assert.ok(chartTitles().includes('Gráfico novo'))
  assert.ok(env.notices.some(notice => notice.message === 'Armazenamento indisponível'))
  env.services.save = save; await click('Criar visão')
  assert.equal(env.calls.at(-1).existing, null)
  assert.equal(document.querySelector('[role="dialog"]'), null)
  const options = [...document.getElementById('analytics-view').options]
  assert.equal(options.filter(option => option.textContent === 'Resumo mensal').length, 1)
  assert.ok(options.some(option => option.textContent === 'Visão geral'))
}))
