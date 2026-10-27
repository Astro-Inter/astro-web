const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { act } = React
const { MemoryRouter, Routes, Route } = require('react-router-dom')
const { JSDOM } = require('jsdom')

function environment(profile) {
  const cache = new Map()
  function load(filename) {
    filename = path.resolve(filename)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }
    cache.set(filename, module)
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'")
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'module', 'exports', code)(name => {
      if (name === '../../hooks/useAccountProfile') return { useAccountProfile: () => profile }
      if (name === '../../hooks/useWorkspaceHome') return { useWorkspaceHome: () => ({ data: { userName: 'Ana Silva', summaryStats: [] }, loading: false, error: '' }) }
      if (name === '../../components') return Object.fromEntries(['AppSidebar', 'ComplianceOverviewCard', 'QuickActionCard', 'SummaryStatCard'].map(name => [name, () => null]))
      if (name === '../truncatedText') return { __esModule: true, default: ({ children }) => children }
      if (!name.startsWith('.')) return require(name)
      const resolved = path.resolve(path.dirname(filename), name)
      return load([resolved + '.ts', resolved + '.tsx', path.join(resolved, 'index.tsx')].find(file => fs.existsSync(file)))
    }, module, module.exports)
    return module.exports
  }
  return { load }
}

async function withDom(run) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/mainHomeScreen' })
  const previous = { window: global.window, document: global.document, IS_REACT_ACT_ENVIRONMENT: global.IS_REACT_ACT_ENVIRONMENT }
  Object.assign(global, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
  const root = require('react-dom/client').createRoot(document.getElementById('root'))
  try { await run(root, dom) } finally { await act(async () => root.unmount()); dom.window.close(); Object.assign(global, previous) }
}

test('home usa foto da conta, remove a central de notificações e permite navegar pelo perfil', () => withDom(async (root, dom) => {
  const profile = { data: { name: 'Ana Silva', photoUrl: 'https://images.example.test/ana.jpg' }, loading: false }
  const Page = environment(profile).load('src/pages/mainHomeScreen/index.tsx').default
  await act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/mainHomeScreen'] }, React.createElement(Routes, null,
    React.createElement(Route, { path: '/mainHomeScreen', element: React.createElement(Page) }),
    React.createElement(Route, { path: '/mainAccountScreen', element: React.createElement('h1', null, 'Página da conta') })))))
  const link = document.querySelector('a[aria-label="Minha conta"]')
  assert.equal(link.getAttribute('href'), '/mainAccountScreen')
  assert.equal(link.querySelector('img').getAttribute('src'), profile.data.photoUrl)
  assert.equal(document.querySelector('[aria-label="Notificações"]'), null)
  assert.equal(document.querySelector('.notification-modal'), null)
  await act(async () => link.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })))
  assert.equal(document.querySelector('h1').textContent, 'Página da conta')
}))

test('avatar trata carregamento, ausência de foto, falha de imagem e nova foto', () => withDom(async (root, dom) => {
  const profile = { data: null, loading: true }
  const Profile = environment(profile).load('src/components/homeProfileLink/index.tsx').default
  const render = () => root.render(React.createElement(MemoryRouter, null, React.createElement(Profile, { profile: profile.data, loading: profile.loading, error: profile.error, nameFallback: 'Ana Silva' })))
  await act(async () => render())
  assert.equal(document.querySelector('a').getAttribute('aria-busy'), 'true')
  assert.ok(document.querySelector('.home-profile-skeleton'))
  profile.loading = false
  profile.data = { name: 'Ana Silva' }
  await act(async () => render())
  assert.equal(document.querySelector('.manager-avatar').textContent, 'AS')
  profile.data.photoUrl = 'https://images.example.test/ana.jpg'
  await act(async () => render())
  await act(async () => document.querySelector('img').dispatchEvent(new dom.window.Event('error')))
  assert.equal(document.querySelector('img'), null)
  assert.equal(document.querySelector('.manager-avatar').textContent, 'AS')
  profile.data.photoUrl = 'https://images.example.test/ana-new.jpg'
  await act(async () => render())
  assert.equal(document.querySelector('img').getAttribute('src'), profile.data.photoUrl)
  profile.data = null
  profile.error = 'Falha ao consultar a conta.'
  await act(async () => render())
  assert.equal(document.querySelector('.manager-avatar').textContent, 'AS')
  assert.equal(document.querySelector('[role=status]').textContent, 'Foto indisponível')
}))
