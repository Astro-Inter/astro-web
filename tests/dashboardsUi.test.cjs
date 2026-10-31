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
function environment({ realEditor = false } = {}) {
  const cache = new Map(), calls = [], notices = [], removals = []
  let saved = []
  const services = { save: async (draft, existing) => ({ ...structuredClone(draft), id: existing?.id || crypto.randomUUID(), version: (existing?.version || 0) + 1, createdAt: '2026-10-25T12:00:00Z', updatedAt: '2026-10-25T12:00:00Z' }) }
  services.remove = async () => {}
  services.load = async () => saved
  services.analytics = { results: {}, errors: {}, pending: false }
  const storage = {
    loadSavedDashboards: () => services.load(),
    subscribeSavedDashboards: () => () => {},
    saveDashboard: async (draft, existing) => {
      calls.push({ draft: structuredClone(draft), existing: existing && structuredClone(existing) })
      const result = await services.save(draft, existing)
      saved = [result, ...saved.filter(item => item.id !== result.id)]
      return result
    }, removeDashboard: async item => { removals.push(item); await services.remove(item); saved = saved.filter(row => row.id !== item.id) },
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
      if (name.endsWith('/useAnalyticsData')) return { useAnalyticsData: () => services.analytics }
      if (name.endsWith('/useExplorerData')) return { useExplorerData: () => ({ results: {}, errors: {}, pending: false }), useExplorerCatalog: () => ({ catalog: undefined, loading: false, error: '', retry() {} }) }
      if (name.endsWith('/services/dashboards') || name === './dashboards') return { loadAnalyticsIdentity: async () => ({ userId: '1', workspaceId: '1', role: 'GESTOR_WORKSPACE' }), queryExplorer: (...args) => services.query(...args) }
      if (name.endsWith('/services/dashboardStorage') || name === './dashboardStorage') return storage
      if (name.endsWith('/analyticsPageLayout')) return { __esModule: true, default: ({ children, onBack, backLabel = 'Voltar para a Home' }) => h('main', null, h('button', { 'aria-label': backLabel, onClick: onBack }, 'Voltar'), children) }
      if (name.endsWith('/analyticsChart')) return { __esModule: true, default: () => null }
      if (name.endsWith('/analyticsEditor') && !realEditor) return { __esModule: true, default: Editor }
      if (name.endsWith('/actionLoading')) return { __esModule: true, default: () => null }
      if (name.endsWith('/toolbarSearch')) return { __esModule: true, default: ({ label, value, onChange }) => h('input', { 'aria-label': label, value, onChange }) }
      if (name.endsWith('/formDatePicker')) return { __esModule: true, default: ({ id, label, value, onChange }) => h('input', { id, 'aria-label': label, value, onChange: event => onChange(event.target.value) }) }
      if (name.endsWith('/toolbarSelect')) return { __esModule: true, default: ({ id, label, value, options, onValueChange, disabled }) => h('select', { id, 'aria-label': label, value, disabled, onChange: event => onValueChange(event.target.value) }, options.map(option => h('option', { value: option.value, key: option.value }, option.label))) }
      if (name === '../../components' || name.endsWith('/astroIcon')) return { __esModule: true, AstroIcon: () => null, default: () => null }
      if (name.endsWith('/appModal')) return { __esModule: true, default: ({ title, children, onClose, dismissible, className }) => h('section', { role: 'dialog', 'aria-label': title, className }, children(() => { if (dismissible !== false) onClose() })) }
      if (!name.startsWith('.')) return require(name)
      const resolved = path.resolve(path.dirname(filename), name)
      return load([`${resolved}.ts`, `${resolved}.tsx`, path.join(resolved, 'index.tsx')].find(file => fs.existsSync(file)))
    }, module, module.exports)
    return module.exports
  }
  return { load, services, calls, notices, removals }
}
async function withPage(run, openOverview = true, setup = () => {}) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
  const names = ['window', 'document', 'Element', 'requestAnimationFrame', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT']
  const previous = Object.fromEntries(names.map(name => [name, global[name]]))
  Object.assign(global, { window: dom.window, document: dom.window.document, Element: dom.window.Element, getComputedStyle: dom.window.getComputedStyle.bind(dom.window), requestAnimationFrame: callback => { callback(); return 0 }, IS_REACT_ACT_ENVIRONMENT: true })
  window.matchMedia = () => ({ matches: false })
  window.confirm = () => true
  window.scrollTo = () => {}
  const root = require('react-dom/client').createRoot(document.getElementById('root'))
  const env = environment()
  setup(env)
  const Page = env.load('src/pages/mainDashboardsScreen/index.tsx').default
  try { await act(async () => root.render(h(Page))); await act(async () => new Promise(resolve => setTimeout(resolve, 200))); if (openOverview) await click('Abrir visão Visão geral'); await run(env) }
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
async function viewAfterEditing() {
  const name = document.querySelector('.analytics-view-name input').value
  await click('Voltar para os dashboards')
  await click(`Abrir visão ${name}`)
}
async function editFromGallery(name = 'Visão geral') {
  if (document.querySelector('.analytics-dashboard-detail')) await click('Voltar para os dashboards')
  await menu(name, 'Editar')
}

test('popup adiciona e salva uma única vez; fecha só após sucesso e voltar mantém o gráfico salvo', async () => withPage(async env => {
  assert.ok(document.querySelector('.analytics-dashboard-detail'))
  await editFromGallery()
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
  await viewAfterEditing()
  assert.equal(chartTitles().length, 4)
  assert.ok(chartTitles().includes('Gráfico novo'))
  assert.ok(env.notices.some(notice => notice.message === 'Gráfico adicionado com sucesso.'))
}))

test('erro de salvamento preserva o popup e os campos; nova tentativa não duplica o gráfico', async () => withPage(async env => {
  await editFromGallery(); await click('Adicionar gráfico'); await change('chart-name', 'Inspeções por mês')
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
  await editFromGallery(); await click('Editar Colaboradores no tempo'); await change('chart-name', 'Cadastros por mês')
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

test('reordenar e remover salvam automaticamente; voltar não restaura dados antigos', async () => withPage(async env => {
  await editFromGallery()
  assert.equal(document.querySelector('.analytics-widget-actions [draggable], .analytics-move-up, .analytics-move-down'), null)
  assert.equal(document.querySelector('.analytics-widget-actions').querySelectorAll('button').length, 2)
  const handle = document.querySelector('[aria-label="Reordenar Colaboradores no tempo"]')
  await act(async () => handle.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true })))
  assert.equal(env.calls.length, 1)
  assert.equal(chartTitles()[1], 'Colaboradores no tempo')
  await click('Remover Colaboradores por NR do catálogo')
  assert.equal(env.calls.length, 2)
  assert.equal(env.calls[1].existing.version, 1)
  assert.equal(chartTitles().length, 2)
  await viewAfterEditing()
  assert.equal(chartTitles().length, 2)
  assert.equal(chartTitles()[1], 'Colaboradores no tempo')
}))

test('arraste entre colunas mostra prévia, permite cancelar e restaura a ordem se salvar falhar', async () => withPage(async env => {
  await editFromGallery()
  window.requestAnimationFrame = callback => window.setTimeout(() => callback(16), 16)
  window.cancelAnimationFrame = id => window.clearTimeout(id)
  const grid = document.querySelector('.analytics-widget-grid')
  const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height })
  grid.getBoundingClientRect = () => rect(0, 100, 620, 600)
  const originals = chartTitles()
  grid.querySelectorAll('[data-widget-id]').forEach((card, index) => { card.getBoundingClientRect = () => rect(index % 2 * 320, 100 + Math.floor(index / 2) * 300, 300, 280) })
  const handle = document.querySelector('[aria-label="Reordenar Colaboradores no tempo"]')
  async function pointer(target, type, x, y) {
    await act(async () => {
      const event = new window.MouseEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true })
      Object.defineProperty(event, 'pointerId', { value: 1 })
      target.dispatchEvent(event)
    })
  }
  await pointer(handle, 'pointerdown', 100, 105)
  await pointer(window, 'pointermove', 440, 150)
  assert.equal(chartTitles()[1], originals[0])
  assert.equal(env.calls.length, 0)
  assert.ok(document.querySelector('.create-forms-drag-position-badge'))
  await act(async () => window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' })))
  assert.deepEqual(chartTitles(), originals)
  assert.equal(document.querySelector('.create-forms-drag-position-badge'), null)
  await pointer(handle, 'pointerdown', 100, 105)
  await pointer(window, 'pointermove', 440, 150)
  env.services.save = async () => { throw new Error('Falha ao salvar') }
  await pointer(window, 'pointerup', 440, 150)
  assert.equal(env.calls.length, 1)
  assert.deepEqual(chartTitles(), originals)
  assert.ok(env.notices.some(notice => notice.message === 'Falha ao salvar'))
  assert.equal(document.querySelector('.create-forms-drag-position-badge'), null)
  await pointer(handle, 'pointerdown', 100, 105)
  await pointer(window, 'pointermove', 440, 150)
  env.services.save = async draft => ({ ...draft, id: 'reordered', version: 1 })
  await pointer(window, 'pointerup', 440, 150)
  assert.equal(env.calls.length, 2)
  assert.equal(chartTitles()[1], originals[0])
}))

test('renomear pelo Enter salva automaticamente e voltar mantém o nome confirmado', async () => withPage(async env => {
  await editFromGallery()
  const input = document.querySelector('.analytics-view-name input')
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'Indicadores da equipe')
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  await act(async () => input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })))
  assert.equal(env.calls.length, 1)
  assert.equal(env.calls[0].draft.name, 'Indicadores da equipe')
  await viewAfterEditing()
  assert.ok(document.body.textContent.includes('Indicadores da equipe'))
}))

test('voltar sem confirmar uma alteração de nome não dispara salvamento', async () => withPage(async env => {
  await editFromGallery()
  const input = document.querySelector('.analytics-view-name input')
  const cancel = document.querySelector('[aria-label="Voltar para os dashboards"]')
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'Nome não confirmado')
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  await act(async () => input.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true, relatedTarget: cancel })))
  await click('Voltar para os dashboards')
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


test('dez ilustrações podem ser escolhidas na criação e alteradas sem perder os gráficos', async () => withPage(async env => {
  await click('Nova visão')
  let dialog = document.querySelector('[role="dialog"]')
  assert.equal(dialog.querySelectorAll('input[name="dashboard-artwork"]').length, 10)
  await change('dashboard-view-name', 'Resultados da equipe')
  await act(async () => dialog.querySelector('input[value="activity"]').click())
  await click('Criar visão', dialog)
  assert.equal(env.calls[0].draft.config.artwork, 'activity')
  await click('Adicionar gráfico')
  await click('Confirmar gráfico', document.querySelector('[role="dialog"]'))
  await click('Editar card')
  dialog = document.querySelector('[role="dialog"]')
  assert.equal(dialog.querySelector('#dashboard-view-name'), null)
  assert.equal(dialog.querySelector('input[value="activity"]').checked, true)
  assert.equal(dialog.querySelector('.dashboard-artwork-preview [data-artwork]').getAttribute('data-artwork'), 'activity')
  await act(async () => dialog.querySelector('input[value="bars"]').click())
  await click('Cancelar', dialog)
  assert.equal(env.calls.length, 2)
  await click('Editar card')
  dialog = document.querySelector('[role="dialog"]')
  assert.equal(dialog.querySelector('input[value="activity"]').checked, true)
  await act(async () => dialog.querySelector('input[value="donut"]').click())
  assert.equal(dialog.querySelector('.dashboard-artwork-preview [data-artwork]').getAttribute('data-artwork'), 'donut')
  const save = env.services.save
  env.services.save = async () => { throw new Error('Falha ao salvar o card') }
  await click('Salvar alterações', dialog)
  assert.ok(document.querySelector('[role="dialog"]'))
  assert.equal(dialog.querySelector('input[value="donut"]').checked, true)
  env.services.save = save
  await click('Salvar alterações', dialog)
  assert.equal(document.querySelector('[role="dialog"]'), null)
  assert.equal(env.calls.at(-1).draft.config.artwork, 'donut')
  assert.equal(env.calls.at(-1).draft.name, 'Resultados da equipe')
  assert.equal(env.calls.at(-1).draft.config.widgets.length, 1)
  await click('Voltar para os dashboards')
  const card = [...document.querySelectorAll('.dashboard-card')].find(card => card.textContent.includes('Resultados da equipe'))
  assert.equal(card.querySelector('[data-artwork]').getAttribute('data-artwork'), 'donut')
  await menu('Resultados da equipe', 'Editar')
  await click('Editar card')
  assert.equal(document.querySelector('input[value="donut"]').checked, true)
}, false))

test('entrada mostra cards sem filtros; abrir e voltar preserva a visão salva', async () => withPage(async env => {
  assert.equal(document.querySelector('.analytics-filters'), null)
  assert.equal(document.querySelector('#analytics-view'), null)
  assert.equal(document.querySelectorAll('.dashboard-card').length, 2)
  await click('Abrir visão Visão geral'); assert.equal(document.querySelector('.analytics-dashboard-detail .analytics-actions'), null); assert.equal(document.querySelector('[aria-label="Excluir visão Visão geral"]'), null); await editFromGallery(); await click('Adicionar gráfico'); await click('Confirmar gráfico', document.querySelector('[role="dialog"]')); await click('Voltar para os dashboards')
  assert.equal(document.querySelector('.analytics-filters'), null)
  assert.ok([...document.querySelectorAll('button')].find(item => item.getAttribute('aria-label') === 'Abrir visão Visão geral'))
  await click('Abrir visão Eventos')
  assert.ok(document.querySelector('.analytics-filters'))
  await click('Voltar para os dashboards'); await click('Abrir visão Visão geral')
  assert.ok(chartTitles().includes('Gráfico novo'))
  assert.equal(env.calls.length, 1)
}, false))

async function createView(name) {
  await click('Nova visão'); await change('dashboard-view-name', name); await click('Criar visão')
}

test('criação fica na galeria e abre a nova visão em edição após salvar', async () => withPage(async env => {
  await createView('Resumo mensal')
  assert.equal(env.calls.length, 1)
  assert.equal(env.calls[0].existing, null)
  assert.deepEqual(env.calls[0].draft.config.widgets, [])
  assert.ok(document.querySelector('.analytics-dashboard-detail'))
  assert.equal([...document.querySelectorAll('button')].find(item => item.textContent === 'Nova visão').closest('[hidden]') !== null, true)
  await click('Adicionar gráfico'); await click('Confirmar gráfico', document.querySelector('[role="dialog"]')); await click('Voltar para os dashboards')
  assert.ok(document.querySelector('[aria-label="Abrir visão Resumo mensal"]'))
  await click('Abrir visão Resumo mensal')
  assert.ok(chartTitles().includes('Gráfico novo'))
}, false))

test('nova visão valida nome vazio e duplicado; cancelar mantém a galeria', async () => withPage(async env => {
  await click('Nova visão'); await click('Criar visão')
  assert.equal(document.getElementById('dashboard-view-name').getAttribute('aria-invalid'), 'true')
  await change('dashboard-view-name', '  VISÃO GERAL  '); await click('Criar visão')
  assert.ok(document.body.textContent.includes('Já existe uma visão com esse nome.'))
  await click('Cancelar', document.querySelector('[role="dialog"]'))
  assert.equal(env.calls.length, 0)
  assert.equal(document.querySelector('.analytics-dashboard-detail'), null)
  assert.equal(document.querySelectorAll('.dashboard-card').length, 2)
}, false))

test('falha na criação preserva o popup e repetir cria sem sobrescrever outra visão', async () => withPage(async env => {
  await createView('Primeira visão'); await click('Voltar para os dashboards')
  const save = env.services.save
  env.services.save = async () => { throw Error('Armazenamento indisponível') }
  await createView('Resumo mensal')
  assert.ok(document.querySelector('[role="dialog"]'))
  assert.equal(document.getElementById('dashboard-view-name').value, 'Resumo mensal')
  assert.ok(env.notices.some(notice => notice.message === 'Armazenamento indisponível'))
  env.services.save = save; await click('Criar visão'); await click('Voltar para os dashboards')
  assert.ok(document.querySelector('[aria-label="Abrir visão Primeira visão"]'))
  assert.ok(document.querySelector('[aria-label="Abrir visão Resumo mensal"]'))
  assert.equal(env.calls.at(-1).existing, null)
}, false))

async function menu(name, action) {
  await click(`Opções para ${name}`)
  await click(action, document.querySelector('[role="menu"]'))
  await act(async () => new Promise(resolve => setTimeout(resolve, 220)))
}

test('personalizar pelo menu abre só o popup e salva a ilustração no card correto', async () => withPage(async env => {
  await menu('Eventos', 'Personalizar card')
  assert.equal(document.querySelector('.analytics-dashboard-detail'), null)
  let dialog = document.querySelector('[role="dialog"]')
  assert.equal(dialog.querySelector('[value="trends"]').checked, true)
  await act(async () => dialog.querySelector('[value="scatter"]').click())
  await click('Cancelar', dialog)
  assert.equal(env.calls.length, 0)
  await menu('Eventos', 'Personalizar card')
  dialog = document.querySelector('[role="dialog"]')
  await act(async () => dialog.querySelector('[value="scatter"]').click())
  await click('Salvar alterações', dialog)
  assert.equal(document.querySelector('.analytics-dashboard-detail'), null)
  assert.equal(env.calls[0].draft.name, 'Eventos')
  assert.equal(env.calls[0].draft.config.artwork, 'scatter')
  assert.equal(env.calls[0].draft.config.widgets.length, 5)
  await menu('Visão geral', 'Personalizar card')
  dialog = document.querySelector('[role="dialog"]')
  await act(async () => dialog.querySelector('[value="bars"]').click())
  await click('Salvar alterações', dialog)
  assert.equal(env.calls[1].existing, null)
  assert.equal(env.calls[1].draft.name, 'Visão geral')
  await menu('Eventos', 'Personalizar card')
  assert.equal(document.querySelector('[value="scatter"]').checked, true)
}, false))

test('três pontos abrem edição da visão e exclusão usa o popup padrão', async () => withPage(async env => {
  await createView('Resumo mensal'); await click('Voltar para os dashboards')
  await menu('Resumo mensal', 'Editar')
  assert.ok(document.querySelector('.analytics-view-name input'))
  await click('Voltar para os dashboards')
  window.confirm = () => assert.fail('Não deve usar confirmação nativa para excluir')
  await menu('Resumo mensal', 'Excluir')
  assert.ok(document.querySelector('[role="dialog"].forms-deletion-modal'))
  await click('Cancelar', document.querySelector('[role="dialog"]'))
  assert.equal(env.removals.length, 0)
  await menu('Resumo mensal', 'Excluir'); await click('Excluir', document.querySelector('[role="dialog"]'))
  assert.equal(env.removals.length, 1)
  assert.equal(document.querySelector('[aria-label="Abrir visão Resumo mensal"]'), null)
  assert.ok(document.querySelector('[aria-label="Abrir visão Visão geral"]'))
}, false))

test('falha na exclusão mantém a visão e permite tentar novamente', async () => withPage(async env => {
  await createView('Resumo mensal'); await click('Voltar para os dashboards')
  env.services.remove = async () => { throw Error('Não foi possível excluir agora.') }
  await menu('Resumo mensal', 'Excluir'); await click('Excluir', document.querySelector('[role="dialog"]'))
  assert.ok(document.querySelector('[role="dialog"] [role="alert"]'))
  assert.ok(document.querySelector('[aria-label="Abrir visão Resumo mensal"]'))
  env.services.remove = async () => {}; await click('Excluir', document.querySelector('[role="dialog"]'))
  assert.equal(document.querySelector('[aria-label="Abrir visão Resumo mensal"]'), null)
}, false))

test('galeria limita quatro cards por página e preserva busca ao voltar da visão', async () => withPage(async () => {
  for (const name of ['Equipe A', 'Equipe B', 'Equipe C']) { await createView(name); await click('Voltar para os dashboards') }
  assert.equal(document.querySelectorAll('.dashboard-card').length, 4)
  await click('Próxima página')
  assert.equal(document.querySelectorAll('.dashboard-card').length, 1)
  const search = document.querySelector('[aria-label="Buscar dashboards"]')
  await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(search, 'Equipe A'); search.dispatchEvent(new window.Event('input', { bubbles: true })) })
  assert.equal(document.querySelectorAll('.dashboard-card').length, 1)
  await click('Abrir visão Equipe A'); await click('Voltar para os dashboards')
  assert.equal(search.value, 'Equipe A')
  assert.equal(document.querySelectorAll('.dashboard-card').length, 1)
}, false))


test('editor real usa os selects compartilhados e o rodapé confirma o formulário nos dois modos', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
  const names = ['window', 'document', 'Element', 'IS_REACT_ACT_ENVIRONMENT']
  const previous = Object.fromEntries(names.map(name => [name, global[name]]))
  Object.assign(global, { window: dom.window, document: dom.window.document, Element: dom.window.Element, IS_REACT_ACT_ENVIRONMENT: true })
  window.matchMedia = () => ({ matches: false })
  const root = require('react-dom/client').createRoot(document.getElementById('root'))
  const env = environment({ realEditor: true }), Editor = env.load('src/components/analyticsEditor/index.tsx').default
  const saved = [], selectedDatasets = []
  const catalog = { version: '1', datasets: [{
    id: 'pessoas', label: 'Pessoas', description: 'Cadastros da equipe.', dateDescription: 'Data do cadastro',
    fields: [
      { id: 'pessoa', label: 'Pessoa', kind: 'identifier', description: 'Pessoa cadastrada.', value: 'Contagem de pessoas', operations: ['count', 'distinct'], groupable: false },
      { id: 'unidade', label: 'Unidade', kind: 'text', description: 'Unidade da pessoa.', value: 'Unidades', operations: ['count', 'distinct'], groupable: true },
    ],
  }] }
  const props = { widget: null, charts: {}, pending: false, errors: {}, onDataset: value => selectedDatasets.push(value), onSave: value => saved.push(value), onCancel() {}, filters: {}, workspaceId: '1', catalog, catalogLoading: false, catalogError: '', retryCatalog() {} }
  async function select(label, value) {
    const input = document.querySelector(`select[aria-label="${label}"]`)
    assert.ok(input, label)
    await act(async () => { input.value = value; input.dispatchEvent(new window.Event('change', { bubbles: true })) })
  }
  try {
    await act(async () => root.render(h(Editor, props)))
    const footer = document.querySelector('.astro-modal-actions')
    assert.equal(footer.closest('form'), null)
    const submit = footer.querySelector('button[type=submit]')
    assert.equal(submit.form, document.querySelector('form'))
    assert.equal(document.querySelector('.analytics-advanced').open, false)
    assert.equal(document.querySelector('[autofocus]'), null)
    assert.doesNotMatch(document.body.textContent, /Origem no catálogo|Nome no catálogo/)
    const generation = deferred()
    env.services.query = () => generation.promise
    await act(async () => document.querySelector('.analytics-editor-preview button').click())
    const preview = document.querySelector('.analytics-editor-preview')
    assert.ok(preview.querySelector('[aria-busy="true"]'))
    assert.equal(preview.querySelector('.analytics-skeleton-legend'), null)
    assert.equal(preview.querySelectorAll('.analytics-skeleton-description').length, 0)
    assert.ok(preview.querySelector('.analytics-skeleton-timestamp'))
    const generated = { generatedAt: '2026-10-28T12:00:00Z', chart: { title: 'Pessoas', kind: 'bar', dimensions: ['unidade'], measure: 'value', dateSensitive: false, undefinedGroups: 2, rows: [{ unidade: 'Matriz', value: 4 }] } }
    await act(async () => generation.resolve(generated))
    await act(async () => new Promise(resolve => setTimeout(resolve, 200)))
    assert.equal(preview.querySelector('.analytics-skeleton'), null)
    const refresh = deferred()
    env.services.query = () => refresh.promise
    await act(async () => preview.querySelector('button').click())
    assert.equal(preview.querySelectorAll('.analytics-skeleton-description').length, 2)
    assert.equal(preview.querySelector('.analytics-skeleton-legend'), null)
    await act(async () => refresh.resolve(generated))
    await act(async () => new Promise(resolve => setTimeout(resolve, 200)))
    assert.ok(document.querySelector('.analytics-field-help-content p'))
    const addFilter = document.querySelector('.analytics-filter-add')
    assert.equal(addFilter.type, 'button')
    assert.equal(addFilter.classList.contains('astro-action'), false)
    await act(async () => addFilter.click())
    assert.equal(document.querySelectorAll('.analytics-condition').length, 1)
    const removeFilter = document.querySelector('.analytics-filter-remove')
    assert.equal(removeFilter.type, 'button')
    await act(async () => removeFilter.click())
    assert.ok(document.querySelector('.analytics-condition--closing'))
    await act(async () => new Promise(resolve => setTimeout(resolve, 180)))
    assert.equal(document.querySelectorAll('.analytics-condition').length, 0)
    await act(async () => addFilter.click())
    await act(async () => addFilter.click())
    const filterValues = [...document.querySelectorAll('.analytics-condition input')]
    await change(filterValues[0].id, 'Primeira unidade')
    await change(filterValues[1].id, 'Segunda unidade')
    const remainingInput = filterValues[1]
    for (const input of filterValues) assert.equal(document.querySelector('label[for="' + input.id + '"]').control, input)
    await act(async () => document.querySelector('.analytics-filter-remove').click())
    await act(async () => new Promise(resolve => setTimeout(resolve, 180)))
    assert.equal(document.querySelector('.analytics-condition input'), remainingInput)
    assert.equal(remainingInput.value, 'Segunda unidade')
    await act(async () => document.querySelector('.analytics-filter-remove').click())
    await act(async () => new Promise(resolve => setTimeout(resolve, 180)))
    await select('Organizar por', 'unidade')
    await select('O que deseja calcular?', 'count')
    await select('Tipo de gráfico', 'pie')
    await act(async () => submit.click())
    assert.equal(saved.length, 1)
    assert.equal(saved[0].datasetId, 'custom')
    assert.equal(saved[0].query.groupBy, 'unidade')
    assert.equal(saved[0].type, 'pie')
    await select('Como deseja criar o gráfico?', 'ready')
    assert.ok(document.querySelector('select[aria-label="Indicador"]'))
    assert.match(document.querySelector('.analytics-indicator-guide').textContent, /quantidade de colaboradores entre as datas/)
    await select('Tipo de gráfico', 'bar')
    assert.match(document.querySelector('.analytics-indicator-guide').textContent, /quantidade de colaboradores entre as datas/)
    await select('Indicador', 'eventos-gestor')
    assert.match(document.querySelector('.analytics-indicator-guide').textContent, /eventos vinculada a cada gestor/)
    assert.equal(submit.form, document.querySelector('form'))
    await act(async () => submit.click())
    assert.equal(saved.length, 2)
    assert.notEqual(saved[1].datasetId, 'custom')
    assert.ok(selectedDatasets.at(-1))
    await select('Como deseja criar o gráfico?', 'catalog')
    await act(async () => root.render(h(Editor, { ...props, catalogLoading: true })))
    assert.equal(submit.disabled, true)
  } finally {
    await act(async () => root.unmount())
    dom.window.close(); Object.assign(global, previous)
  }
})


test('skeletons próprios dos dashboards incluem descrição, valores e metadados na estrutura real', async () => withPage(async env => {
  const Gallery = env.load('src/components/dashboardGallerySkeleton/index.tsx').default
  const Metric = env.load('src/components/analyticsMetricCard/index.tsx').default
  const Editor = env.load('src/components/analyticsEditorSkeleton/index.tsx').default
  const Loading = env.load('src/components/analyticsLoadingContent/index.tsx').default
  const host = document.createElement('div'); document.body.append(host)
  const root = require('react-dom/client').createRoot(host)
  try {
    await act(async () => root.render(h(Gallery)))
    assert.equal(host.querySelectorAll('.dashboard-card').length, 4)
    assert.equal(host.querySelector('.form-card-badges'), null)
    for (const card of host.querySelectorAll('.dashboard-card')) {
      assert.ok(card.querySelector('.dashboard-card-art .api-skeleton'))
      assert.ok(card.querySelector('.dashboard-card-title .api-skeleton'))
      assert.ok(card.querySelector('.dashboard-card-description .api-skeleton'))
      assert.ok(card.querySelector('.dashboard-card-footer .api-skeleton'))
    }
    await act(async () => root.render(h(Metric, { loading: true })))
    assert.equal(host.querySelectorAll('.analytics-kpi-label .api-skeleton').length, 1)
    assert.ok(host.querySelector('.analytics-kpi-value .api-skeleton'))
    assert.equal(host.querySelector('.analytics-kpi-scope'), null)
    await act(async () => root.render(h(Metric, { loading: false, metric: { key: 'pessoas', label: 'Colaboradores', value: 0, dateSensitive: true } })))
    assert.ok(host.querySelector('.analytics-skeleton--exit'))
    await act(async () => new Promise(resolve => setTimeout(resolve, 200)))
    assert.equal(host.querySelector('.analytics-kpi-value').textContent, '0')
    assert.equal(host.querySelector('.analytics-kpi-scope'), null)
    await act(async () => root.render(h(Editor, { title: 'Meu gráfico' })))
    assert.equal(host.querySelectorAll('.analytics-editor-layout').length, 1)
    assert.equal(host.querySelectorAll('.api-skeleton-control').length, 5)
    assert.equal(host.querySelector('.analytics-dataset-help'), null)
    assert.ok(host.querySelector('.analytics-calculation-summary .api-skeleton'))
    assert.equal(host.querySelector('button').textContent, 'Gerar prévia')
    for (const chartKind of ['bar', 'line', 'pie']) {
      await act(async () => root.render(h(Loading, { loading: true, chartKind, timestamp: true, descriptionLines: 2 })))
      assert.equal(host.querySelectorAll('.analytics-skeleton-description').length, 2)
      assert.ok(host.querySelector('.analytics-skeleton-timestamp'))
      if (chartKind === 'pie') assert.equal(host.querySelector('.analytics-skeleton-legend'), null)
      assert.ok(host.querySelector(chartKind === 'pie' ? '.analytics-skeleton-pie' : chartKind === 'line' ? '.analytics-skeleton-line' : '.analytics-skeleton-plot'))
    }
  } finally { await act(async () => root.unmount()); host.remove() }
}, false))

test('cabeçalho da visão e datas dos gráficos acompanham o carregamento e a saída do skeleton', async () => withPage(async env => {
  env.services.analytics = { results: {}, errors: {}, pending: true }
  await click('Atualizar dados')
  const heading = document.querySelector('.analytics-view-heading')
  assert.equal(heading.querySelector('h2').textContent, 'Visão geral')
  assert.ok(heading.querySelector('.analytics-skeleton-metadata'))
  assert.doesNotMatch(heading.textContent, /Consultado em/)
  for (const widget of document.querySelectorAll('.analytics-widget')) assert.ok(widget.querySelector('.analytics-skeleton-timestamp'))
  env.services.analytics = { results: { 'visao-geral': { generatedAt: '2026-10-27T14:49:36Z', charts: [], kpis: [] } }, errors: {}, pending: false }
  const nextStart = new Date(`${document.getElementById('analytics-start').value}T00:00:00Z`)
  nextStart.setUTCDate(nextStart.getUTCDate() + 1)
  await change('analytics-start', nextStart.toISOString().slice(0, 10))
  assert.ok(heading.querySelector('.analytics-skeleton--exit'))
  assert.doesNotMatch(heading.textContent, /Consultado em/)
  await act(async () => new Promise(resolve => setTimeout(resolve, 200)))
  assert.equal(heading.querySelector('.analytics-skeleton-metadata'), null)
  assert.match(heading.textContent, /Consultado em/)
  assert.equal(document.querySelector('.analytics-skeleton-timestamp'), null)
}))

test('entrada aguarda os dados dentro da galeria com skeleton e sem bloquear na tela anterior', async () => {
  const request = deferred()
  let loads = 0
  await withPage(async () => {
    assert.equal(document.querySelector('h1').textContent, 'Dashboards')
    assert.equal(document.querySelectorAll('.dashboard-card--skeleton').length, 4)
    assert.ok(document.querySelector('.dashboard-gallery-page-skeleton'))
    assert.doesNotMatch(document.querySelector('.dashboard-gallery-page').textContent, /Página/)
    assert.equal(loads, 1)
    await act(async () => request.resolve([]))
    await act(async () => new Promise(resolve => setTimeout(resolve, 200)))
    assert.equal(document.querySelectorAll('.dashboard-card--skeleton').length, 0)
    assert.equal(document.querySelector('.dashboard-gallery-page-skeleton'), null)
    assert.match(document.querySelector('.dashboard-gallery-page').textContent, /Página 1 de 1/)
    assert.ok(document.querySelector('[aria-label="Abrir visão Visão geral"]'))
    assert.equal(loads, 1)
  }, false, env => { env.services.load = () => { loads++; return request.promise } })
})
