const assert = require('node:assert/strict')
const { test, afterEach } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { MemoryRouter } = require('react-router-dom')
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')
const { act } = React

const user = { uid: 'current-manager', getIdToken: async () => 'firebase-token' }
const auth = { currentUser: user }
const profileResponse = { nome: ' Rosa Maduda ', email: 'rosa@example.test', cargo: 'Gestor de Segurança', unidade: 'Matriz São Paulo', modalidade: 'PRESENCIAL', profilePhotoUrl: 'https://images.example.test/photo?signature=temporary' }
const originalFetch = global.fetch
afterEach(() => { global.fetch = originalFetch; auth.currentUser = user })

function environment(overrides = {}) {
  const cache = new Map()
  function load(filename) {
    filename = path.resolve(filename)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }
    cache.set(filename, module)
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.VITE_API_URL', "'https://api.example.test'").replaceAll('import.meta.env.DEV', 'false').replaceAll('import.meta.env.BASE_URL', "'/'")
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'module', 'exports', code)(specifier => {
      if (Object.hasOwn(overrides, specifier)) return overrides[specifier]
      if (specifier === './firebase') return { firebaseAuth: auth }
      if (specifier === '../../components') return Object.fromEntries(['AstroBrand', 'AstroIcon', 'CompactPurpleButton', 'ConfirmationModal', 'FormField', 'HelpLink'].map(name => [name, load(`src/components/${name[0].toLowerCase()}${name.slice(1)}/index.tsx`).default]))
      if (!specifier.startsWith('.')) return require(specifier)
      const resolved = path.resolve(path.dirname(filename), specifier)
      return load([`${resolved}.ts`, `${resolved}.tsx`, path.join(resolved, 'index.tsx')].find(file => fs.existsSync(file)))
    }, module, module.exports)
    return module.exports
  }
  return { load }
}
const api = environment().load('src/services/account.ts')
const respond = data => new Response(JSON.stringify({ success: true, data }))
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

test('consulta o próprio perfil com Bearer e mapeia os dados reais sem senha ou CPF fictícios', async () => {
  const controller = new AbortController()
  global.fetch = async (url, init) => {
    assert.equal(url, 'https://api.example.test/user/me')
    assert.equal(init.headers.Authorization, 'Bearer firebase-token')
    assert.equal(init.signal, controller.signal)
    assert.equal(init.body, undefined)
    return respond({ ...profileResponse, password: 'nao-exibir', cpf: 'nao-exibir' })
  }
  assert.deepEqual(await api.getAccountProfile(controller.signal), { name: 'Rosa Maduda', email: profileResponse.email, position: 'Gestor de Segurança', units: 'Matriz São Paulo', modality: 'Presencial', photoUrl: profileResponse.profilePhotoUrl })
})

test('aceita e-mail e dados profissionais ausentes e descarta URL de foto insegura', async () => {
  global.fetch = async () => respond({ ...profileResponse, email: null, cargo: null, unidade: null, modalidade: null, profilePhotoUrl: 'javascript:alert(1)' })
  const profile = await api.getAccountProfile()
  assert.equal(profile.email, '')
  assert.equal(profile.photoUrl, undefined)
  assert.equal(profile.position, '')
  assert.equal(profile.units, '')
  assert.equal(profile.modality, '')
  global.fetch = async () => respond({ ...profileResponse, modalidade: 'HIBRIDO', profilePhotoUrl: null })
  assert.equal((await api.getAccountProfile()).modality, 'Híbrido')
  for (const email of [undefined, '', '   ']) {
    global.fetch = async () => respond({ ...profileResponse, email })
    assert.equal((await api.getAccountProfile()).email, '')
  }
})

test('trata sessão ausente, HTTP, resposta inválida e rede sem recorrer ao perfil de exemplo', async () => {
  auth.currentUser = null
  global.fetch = async () => assert.fail('Não deve consultar sem autenticação')
  await assert.rejects(api.getAccountProfile(), /Entre na sua conta/)
  auth.currentUser = user
  for (const [status, message] of [[401, /sessão expirou/], [403, /permissão/], [404, /não foi encontrado/], [500, /Não foi possível carregar/]]) {
    global.fetch = async () => new Response('', { status })
    await assert.rejects(api.getAccountProfile(), message)
  }
  for (const body of [null, {}, { success: false }, { success: true, data: null }, { success: true, data: { ...profileResponse, nome: '' } }, { success: true, data: { ...profileResponse, unidade: [] } }]) {
    global.fetch = async () => new Response(JSON.stringify(body))
    await assert.rejects(api.getAccountProfile(), /inválid/)
  }
  global.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(api.getAccountProfile(), /Não foi possível conectar/)
})

test('descarta o perfil se a sessão mudar durante a leitura e preserva cancelamento', async () => {
  global.fetch = async () => { auth.currentUser = { ...user, uid: 'other' }; return respond(profileResponse) }
  await assert.rejects(api.getAccountProfile(), /sessão mudou/)
  auth.currentUser = user
  const controller = new AbortController()
  global.fetch = async () => { controller.abort(); throw new DOMException('Abortado', 'AbortError') }
  await assert.rejects(api.getAccountProfile(controller.signal), { name: 'AbortError' })
})

function Modal({ children, title, onClose }) {
  return React.createElement('section', { role: 'dialog', 'aria-label': title }, typeof children === 'function' ? children(onClose) : children)
}

test('Ver tudo apresenta os campos da API, foto e CPF vazio, sem campo de senha', () => {
  const env = environment({ '../appModal': { __esModule: true, default: Modal } })
  const Details = env.load('src/components/accountDetailsModal/index.tsx').default
  const profile = { name: 'Rosa Maduda', email: profileResponse.email, position: profileResponse.cargo, units: profileResponse.unidade, modality: 'Presencial', photoUrl: profileResponse.profilePhotoUrl }
  const markup = renderToStaticMarkup(React.createElement(Details, { profile, onCancel() {} }))
  const dom = new JSDOM(markup)
  assert.equal(dom.window.document.querySelectorAll('input').length, 6)
  assert.equal(dom.window.document.querySelector('#account-detail-cpf').value, '')
  assert.equal(dom.window.document.querySelector('input[type=password]'), null)
  assert.doesNotMatch(markup, /Senha|astro-demo|Kirk/)
  assert.equal(dom.window.document.querySelector('#account-detail-units').value, 'Matriz São Paulo')
  assert.equal(dom.window.document.querySelector('img').getAttribute('src'), profileResponse.profilePhotoUrl)
  dom.window.close()
  const empty = new JSDOM(renderToStaticMarkup(React.createElement(Details, { profile: { ...profile, email: '' }, onCancel() {} })))
  assert.equal(empty.window.document.querySelector('#account-detail-email').value, '')
  assert.equal(empty.window.document.querySelector('#account-detail-cpf').value, '')
  empty.window.close()
})

test('ambos os gestores carregam o perfil; erro permite tentar novamente, troca de sessão oculta dados antigos e foto quebrada usa iniciais', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/mainAccountScreen' })
  const saved = { window: global.window, document: global.document, IS_REACT_ACT_ENVIRONMENT: global.IS_REACT_ACT_ENVIRONMENT }
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true
  const root = createRoot(dom.window.document.getElementById('root'))
  const context = { user: { uid: 'workspace', accountType: 'GESTOR_WORKSPACE' } }
  const first = deferred(), calls = []
  let read = () => first.promise
  const env = environment({
    './useAuthentication': { useAuthentication: () => context },
    '../../hooks/useAuthentication': { useAuthentication: () => context },
    '../../hooks/useLogout': { useLogout: () => ({ pending: false, error: '', submit() {} }) },
    '../services/account': { getAccountProfile: signal => { calls.push(signal); return read() } },
    '../../components/passwordConfirmationModal': { __esModule: true, default: ({ onContinue }) => React.createElement('button', { onClick: onContinue }, 'Confirmar identidade') },
    '../appModal': { __esModule: true, default: Modal },
  })
  const Page = env.load('src/pages/mainAccountScreen/index.tsx').default
  const render = () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/mainAccountScreen'] }, React.createElement(Page)))
  const profile = { name: 'Rosa Maduda', email: profileResponse.email, position: profileResponse.cargo, units: profileResponse.unidade, modality: 'Presencial', photoUrl: profileResponse.profilePhotoUrl }
  try {
    await act(async () => render())
    assert.match(document.querySelector('[role=status]').textContent, /Carregando/)
    assert.doesNotMatch(document.body.textContent, /Kirk/)
    await act(async () => first.resolve(profile))
    assert.equal(document.getElementById('account-name').value, profile.name)
    assert.equal(document.getElementById('account-edit-action').disabled, true)
    await act(async () => document.querySelector('.account-profile-photo img').dispatchEvent(new dom.window.Event('error')))
    assert.equal(document.querySelector('.account-profile-initials').textContent, 'RM')
    await act(async () => document.getElementById('account-view-action').click())
    assert.equal(document.querySelector('[role=dialog]'), null)
    await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Confirmar identidade').click())
    assert.equal(document.querySelector('[role=dialog] input[type=password]'), null)
    assert.equal(document.getElementById('account-detail-position').value, profile.position)

    const next = deferred()
    read = () => next.promise
    context.user = { uid: 'manager', accountType: 'GESTOR' }
    await act(async () => render())
    assert.equal(calls[0].aborted, true)
    assert.equal(document.getElementById('account-name'), null)
    assert.equal(document.querySelector('[role=dialog]'), null)
    assert.doesNotMatch(document.body.textContent, /Rosa Maduda/)
    await act(async () => next.reject(new Error('Serviço indisponível.')))
    assert.match(document.querySelector('[role=alert]').textContent, /Serviço indisponível/)
    read = async () => ({ ...profile, name: 'Ana Silva', photoUrl: undefined })
    await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Tentar novamente').click())
    assert.equal(document.getElementById('account-name').value, 'Ana Silva')
    assert.equal(document.querySelector('.account-profile-initials').textContent, 'AS')
    assert.doesNotMatch(document.body.textContent, /Rosa Maduda/)
    assert.equal(document.querySelector('[aria-label=Configurações]'), null)

    const late = deferred()
    read = () => late.promise
    context.user = { uid: 'third', accountType: 'GESTOR' }
    await act(async () => render())
    const signal = calls.at(-1)
    await act(async () => root.unmount())
    assert.equal(signal.aborted, true)
    await act(async () => late.resolve(profile))
    assert.equal(document.getElementById('root').textContent, '')
  } finally {
    await act(async () => root.unmount())
    dom.window.close()
    Object.assign(global, saved)
  }
})
