const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { JSDOM } = require('jsdom')

function load(file) {
  const filename = path.resolve(__dirname, '..', file)
  const source = fs.readFileSync(filename, 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => name.startsWith('.') ? load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), name, 'index.tsx'))) : require(name), module, module.exports)
  return module.exports.default
}

const DataTable = load('src/components/dataTable/index.tsx')
const ApiContentSkeleton = load('src/components/apiContentSkeleton/index.tsx')
const AccountProfileSkeleton = load('src/components/accountProfileSkeleton/index.tsx')
const columns = ['employee', 'nr', 'expiresAt', 'origin', 'status', 'actions'].map(id => ({ id, label: id, render: row => row[id] }))
const props = { columns, ariaLabel: 'Conformidades', emptyMessage: 'Nenhuma conformidade', rows: [], getRowKey: row => row.id }
const dom = element => new JSDOM(renderToStaticMarkup(element)).window.document

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

test('placeholders de perfil reservam foto, identidade e campos sem criar controles falsos', () => {
  const document = dom(React.createElement(ApiContentSkeleton, { variant: 'profile', label: 'Carregando conta', fields: 2, columns: 1 }))
  assert.equal(document.querySelectorAll('.api-skeleton-avatar').length, 1)
  assert.equal(document.querySelectorAll('.api-skeleton-control').length, 2)
  assert.equal(document.querySelectorAll('button,input,a').length, 0)
  assert.equal(document.querySelector('[role="status"]').textContent, 'Carregando conta')
  assert.equal(document.querySelector('[aria-hidden="true"]') !== null, true)
})

test('perfil reserva somente os campos e ações existentes na conta, na consulta e na edição', () => {
  for (const [props, fields, actions] of [[{}, 2, 2], [{ details: true }, 6, 1], [{ details: true, editable: true, canChangeLinks: true }, 6, 2]]) {
    const document = dom(React.createElement(AccountProfileSkeleton, props))
    assert.equal(document.querySelectorAll('.field-group').length, fields)
    assert.equal(document.querySelectorAll('.api-skeleton-action').length, actions)
    assert.equal(document.querySelectorAll('input,button,select').length, 0)
    assert.equal(document.querySelector('.account-profile-photo .account-skeleton-photo') !== null, true)
    assert.equal(document.querySelector(props.details ? '.account-details-form .account-details-grid' : '.account-main-fields') !== null, true)
  }
})
