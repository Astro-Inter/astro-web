const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

function renderMenu(canManage, status = 'ATIVO') {
  const employee = { id: '42', name: 'Pessoa', email: 'pessoa@example.test', roleId: '5', position: 'Cargo', unitId: '8', unit: 'Sede', status, canManage }
  const cache = new Map()
  const empty = () => null
  const ref = { current: null }
  const api = { employees: [employee], loading: false, saving: false, error: '', details: { data: null }, options: { data: { positions: [], units: [] } } }
  function load(filename) {
    filename = path.resolve(filename)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'")
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'module', 'exports', code)(specifier => {
      if (specifier === 'react-dom') return { createPortal: child => child }
      if (specifier === 'react-router-dom') return { useLocation: () => ({}) }
      if (specifier === '../../hooks/useCollaborators') return { useCollaborators: () => api }
      if (specifier === '../../hooks/useActionFeedback') return { useActionFeedback: () => empty }
      if (specifier === '../../hooks') return { useActionsMenu: () => ({ openId: '42', closing: false, style: {}, triggerRef: ref, panelRef: ref, close: empty }) }
      if (specifier === '../../components') return { AppSidebar: empty, AstroIcon: empty, CompactPurpleButton: empty, ConfirmationModal: empty, DataTable: empty, OptionsPopup: load('src/components/optionsPopup/index.tsx').default, ToolbarSearch: empty, ToolbarSelect: empty, TruncatedText: empty }
      if (/components\/(actionLoading|collaboratorDialog|collaboratorIdentity|passwordConfirmationModal)$/.test(specifier)) return { __esModule: true, default: empty }
      if (!specifier.startsWith('.')) return require(specifier)
      const resolved = path.resolve(path.dirname(filename), specifier)
      return load([`${resolved}.ts`, `${resolved}.tsx`, path.join(resolved, 'index.tsx')].find(file => fs.existsSync(file)))
    }, module, module.exports)
    return module.exports
  }
  const previous = global.document
  global.document = { body: {} }
  try { return renderToStaticMarkup(React.createElement(load('src/pages/mainEmployeerScreen/index.tsx').default)) }
  finally { global.document = previous }
}

test('usuário consultável sem permissão administrativa mantém informações e oculta edição/status', () => {
  for (const permission of [false, undefined]) {
    const html = renderMenu(permission)
    assert.match(html, /aria-label="Ver mais informações"/)
    assert.doesNotMatch(html, /aria-label="Editar"/)
    assert.doesNotMatch(html, /aria-label="Desativar"/)
  }
})

test('permissão administrativa da API libera edição e mudança de status', () => {
  const html = renderMenu(true)
  assert.match(html, /aria-label="Ver mais informações"/)
  assert.match(html, /aria-label="Editar"/)
  assert.match(html, /aria-label="Desativar"/)
})

test('reenvio de chave aparece apenas para pré-cadastrados com permissão administrativa', () => {
  assert.match(renderMenu(true, 'PRE_CADASTRADO'), /aria-label="Reenviar chave de acesso"/)
  for (const status of ['ATIVO', 'DESATIVADO']) assert.doesNotMatch(renderMenu(true, status), /Reenviar chave de acesso/)
  for (const permission of [false, undefined]) assert.doesNotMatch(renderMenu(permission, 'PRE_CADASTRADO'), /Reenviar chave de acesso/)
})
