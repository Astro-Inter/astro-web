const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { JSDOM } = require('jsdom')
const { MemoryRouter } = require('react-router-dom')

function load(file) {
  return loadModule(file).default
}

function loadModule(file) {
  const filename = path.resolve(__dirname, '..', file)
  const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'")
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => {
    if (!name.startsWith('.')) return require(name)
    const target = path.resolve(path.dirname(filename), name)
    return loadModule([target + '.ts', target + '.tsx', path.join(target, 'index.tsx')].find(fs.existsSync))
  }, module, module.exports)
  return module.exports
}

const DataTable = load('src/components/dataTable/index.tsx')
const ApiContentSkeleton = load('src/components/apiContentSkeleton/index.tsx')
const AccountProfileSkeleton = load('src/components/accountProfileSkeleton/index.tsx')
const FormEditorSkeleton = load('src/components/formEditorSkeleton/index.tsx')
const HomeDashboardSkeleton = load('src/components/homeDashboardSkeleton/index.tsx')
const InviteManagerDialog = load('src/components/inviteManagerDialog/index.tsx')
const columns = ['employee', 'nr', 'expiresAt', 'origin', 'status', 'actions'].map(id => ({ id, label: id, render: row => row[id] }))
const props = { columns, ariaLabel: 'Conformidades', emptyMessage: 'Nenhuma conformidade', rows: [], getRowKey: row => row.id }
const dom = element => new JSDOM(renderToStaticMarkup(React.createElement(MemoryRouter, null, element))).window.document

test('tabela em espera mostra skeleton de todas as colunas sem exibir estado vazio ou ações', () => {
  const document = dom(React.createElement(DataTable, { ...props, loading: true }))
  assert.equal(document.querySelector('table').getAttribute('aria-busy'), 'true')
  assert.equal(document.querySelector('tbody').getAttribute('aria-hidden'), 'true')
  assert.equal(document.querySelectorAll('tbody tr').length, 5)
  assert.equal(document.querySelectorAll('tbody tr:first-child td').length, 6)
  assert.equal(document.querySelectorAll('button,input').length, 0)
  assert.equal(document.querySelector('[role="status"]').textContent, 'Carregando conformidades.')
  assert.doesNotMatch(document.querySelector('tbody').textContent, /Nenhuma conformidade/)
})

test('resposta vazia e resposta com dados substituem os placeholders e liberam tracking', () => {
  const empty = dom(React.createElement(DataTable, { ...props, loading: false, trackingName: 'lista' }))
  assert.equal(empty.querySelector('table').getAttribute('aria-busy'), 'false')
  assert.equal(empty.querySelector('[data-track-showcase]').getAttribute('data-track-showcase'), 'lista')
  assert.match(empty.querySelector('tbody').textContent, /Nenhuma conformidade/)
  const ready = dom(React.createElement(DataTable, { ...props, rows: [{ id: '1', employee: 'Gestora', nr: 'NR 10' }] }))
  assert.equal(ready.querySelectorAll('.api-skeleton').length, 0)
  assert.match(ready.querySelector('tbody').textContent, /GestoraNR 10/)
})

test('placeholders de perfil reservam foto e campos mantendo os botões reais desabilitados', () => {
  const document = dom(React.createElement(ApiContentSkeleton, { variant: 'profile', label: 'Carregando conta', fields: 2, columns: 1 }))
  assert.equal(document.querySelectorAll('.api-skeleton-avatar').length, 1)
  assert.equal(document.querySelectorAll('.api-skeleton-control').length, 2)
  assert.equal(document.querySelectorAll('input,a').length, 0)
  assert.equal(document.querySelectorAll('button:disabled').length, 2)
  assert.equal(document.querySelectorAll('button .api-skeleton').length, 0)
  assert.equal(document.querySelector('[role="status"]').textContent, 'Carregando conta')
  assert.equal(document.querySelector('[aria-hidden="true"]') !== null, true)
})

test('perfil reserva somente os campos e ações existentes na conta, na consulta e na edição', () => {
  for (const [props, fields, actions] of [[{}, 2, 2], [{ details: true }, 6, 1], [{ details: true, editable: true, canChangeLinks: true }, 6, 2]]) {
    const document = dom(React.createElement(AccountProfileSkeleton, props))
    assert.equal(document.querySelectorAll('.field-group').length, fields)
    assert.equal(document.querySelectorAll('button:disabled').length, props.details ? actions : 0)
    assert.equal(document.querySelectorAll('.api-skeleton-action').length, props.details ? 0 : actions)
    assert.equal(document.querySelectorAll('input,select').length, 0)
    assert.equal(document.querySelector('.account-profile-photo .account-skeleton-photo') !== null, true)
    assert.equal(document.querySelector(props.details ? '.account-details-form .account-details-grid' : '.account-main-fields') !== null, true)
  }
})

test('skeleton de tabela distingue identidade de nome simples e preserva as células de ação e cabeçalho', () => {
  for (const identity of [false, true]) {
    const columns = [
      { id: 'name', label: 'Nome', rowHeader: true, skeleton: identity ? 'identity' : 'text', render() {} },
      { id: 'status', label: 'Status', render() {} },
      { id: 'actions', label: 'Ações', className: 'position-actions-cell', render() {} },
    ]
    const document = dom(React.createElement(DataTable, { ...props, columns, loading: true }))
    assert.equal(document.querySelectorAll('tbody th[scope=row]').length, 5)
    assert.equal(document.querySelectorAll('tbody .position-actions-cell').length, 5)
    assert.equal(document.querySelectorAll('.api-skeleton-table-avatar').length, identity ? 5 : 0)
  }
})

test('editor reserva as seis informações iniciais no card, sem ações ou campos extras', () => {
  for (const editing of [false, true]) {
    const document = dom(React.createElement(FormEditorSkeleton, { editing }))
    assert.equal(document.querySelectorAll('.create-forms-card').length, 1)
    assert.equal(document.querySelectorAll('.create-forms-field').length, 6)
    assert.equal(document.querySelectorAll('.api-skeleton-control').length, 6)
    assert.equal(document.querySelectorAll('.create-forms-card .astro-action,input').length, 0)
    assert.equal(document.querySelectorAll('.create-forms-footer button:disabled').length, 2)
    assert.equal(document.querySelectorAll('.create-forms-footer .api-skeleton').length, 0)
    assert.equal(document.querySelector('h2').textContent, editing ? 'Informações do formulário' : 'Informações iniciais')
  }
})

test('títulos, descrições e ações fixas permanecem visíveis enquanto somente os dados carregam', () => {
  for (const Component of [HomeDashboardSkeleton, FormEditorSkeleton]) {
    const document = dom(React.createElement(Component))
    assert.ok(document.querySelector('h2,h3').textContent.trim())
    assert.equal(document.querySelector('h2 .api-skeleton,h3 .home-skeleton'), null)
    assert.equal(document.querySelector('button.api-skeleton,button.home-skeleton'), null)
    assert.ok(document.querySelector('[role=status]'))
  }
})

test('promoção mantém título e botões visíveis durante a consulta de candidatos', () => {
  const document = dom(React.createElement(InviteManagerDialog, { candidates: [], loading: true, error: '', saving: false, onClose() {}, onRetry() {}, onInvite: async () => null }))
  assert.equal(document.querySelector('.astro-modal-title').textContent, 'Promover a gestor')
  assert.equal(document.querySelector('.astro-modal-description'), null)
  const buttons = [...document.querySelectorAll('.astro-modal-actions button')]
  assert.deepEqual(buttons.map(button => button.textContent), ['Cancelar', 'Promover a gestor'])
  assert.equal(buttons[0].disabled, false)
  assert.equal(buttons[1].disabled, true)
  assert.ok(buttons.every(button => !button.classList.contains('api-skeleton')))
  assert.equal(document.querySelectorAll('.api-skeleton-control').length, 2)
})


test('indicadores da Home animam a saída dos placeholders preservando cards, títulos e ações', async () => {
  const { createRoot } = require('react-dom/client')
  for (const reduced of [false, true]) {
    const browser = new JSDOM('<!doctype html><div id="root"></div>')
    browser.window.matchMedia = () => ({ matches: reduced })
    const previous = { window: global.window, document: global.document, IS_REACT_ACT_ENVIRONMENT: global.IS_REACT_ACT_ENVIRONMENT }
    Object.assign(global, { window: browser.window, document: browser.window.document, IS_REACT_ACT_ENVIRONMENT: true })
    const root = createRoot(document.getElementById('root'))
    const data = {
      complianceOverview: { overallPercentage: 40, totalRequirements: 10, slices: [{ status: 'compliant', label: 'Conformes', percentage: 40 }] },
      summaryStats: [
        { id: 'units', label: 'Unidades', value: 4, icon: 'building', path: '/mainUnitScreen' },
        { id: 'collaborators', label: 'Colaboradores', value: 130, icon: 'collaborators', path: '/mainEmployeerScreen' },
      ],
    }
    const render = props => root.render(React.createElement(MemoryRouter, null, React.createElement(HomeDashboardSkeleton, props)))
    try {
      await React.act(async () => render({ loading: true }))
      const cards = [...document.querySelectorAll('.home-card')]
      const heading = document.querySelector('h3')
      const action = document.querySelector('button')
      await React.act(async () => render({ loading: false, data }))
      assert.deepEqual([...document.querySelectorAll('.home-card')], cards)
      assert.equal(document.querySelector('h3'), heading)
      assert.equal(document.querySelector('button'), action)
      if (!reduced) {
        assert.equal(document.querySelectorAll('.home-data-skeleton--exiting').length, 3)
        assert.equal(document.querySelector('.home-data-ready'), null)
      }
      await React.act(async () => new Promise(resolve => setTimeout(resolve, reduced ? 10 : 200)))
      assert.equal(document.querySelector('.home-skeleton'), null)
      assert.equal(document.querySelectorAll('.home-data-ready').length, 3)
      assert.deepEqual([...document.querySelectorAll('.summary-stat-value')].map(node => node.textContent), ['4', '130'])
      await React.act(async () => render({ loading: false, data: { ...data, summaryStats: [{ ...data.summaryStats[0], value: 5 }, data.summaryStats[1]] } }))
      assert.equal(document.querySelector('.summary-stat-value').textContent, '5')
      assert.equal(document.querySelector('.home-card'), cards[0])
      await React.act(async () => render({ loading: true }))
      assert.equal(document.querySelectorAll('.home-data-skeleton').length, 3)
      assert.equal(document.querySelector('.home-data-ready'), null)
    } finally {
      await React.act(async () => root.unmount())
      browser.window.close()
      Object.assign(global, previous)
    }
  }
})
