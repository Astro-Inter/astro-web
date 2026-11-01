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
const profileResponse = { name: ' Rosa Maduda ', email: 'rosa@example.test', roleName: 'Gestor de Segurança', unitName: 'Matriz São Paulo', workModel: 'PRESENCIAL', profilePhotoUrl: 'https://images.example.test/photo?signature=temporary' }
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
      if (specifier === 'firebase/auth') return { reload: async () => {}, sendEmailVerification: async () => {} }
      if (specifier === '../../components') return Object.fromEntries(['AstroBrand', 'AstroIcon', 'CompactPurpleButton', 'ConfirmationModal', 'FormField', 'HelpLink'].map(name => [name, load(`src/components/${name[0].toLowerCase()}${name.slice(1)}/index.tsx`).default]))
      if (!specifier.startsWith('.')) return require(specifier)
      const resolved = path.resolve(path.dirname(filename), specifier)
      return load([`${resolved}.ts`, `${resolved}.tsx`, path.join(resolved, 'index.tsx')].find(file => fs.existsSync(file)))
    }, module, module.exports)
    if (filename.includes(`${path.sep}src${path.sep}pages${path.sep}`)) {
      const Page = module.exports.default
      const Host = load('src/components/actionFeedbackHost/index.tsx').default
      const { AccessibilityContext } = load('src/contexts/accessibility.ts')
      const { AccessibilityRuntimeContext } = load('src/contexts/accessibilityRuntime.ts')
      const { DEFAULT_ACCESSIBILITY } = load('src/utils/accessibility.ts')
      const accessibility = { preferences: DEFAULT_ACCESSIBILITY, update() {}, reset() {} }
      const runtime = { face: { status: 'idle', stop() {}, start() {} }, libras: { loading: false, error: '' } }
      module.exports.default = props => React.createElement(AccessibilityContext.Provider, { value: accessibility },
        React.createElement(AccessibilityRuntimeContext.Provider, { value: runtime },
          React.createElement(React.Fragment, null, React.createElement(Host), React.createElement(Page, props))))
    }
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
    assert.equal(url, 'https://api.example.test/user/me/account-summary')
    assert.equal(init.headers.Authorization, 'Bearer firebase-token')
    assert.equal(init.signal.aborted, false)
    assert.equal(init.body, undefined)
    return respond({ ...profileResponse, password: 'nao-exibir', cpf: 'nao-exibir' })
  }
  assert.deepEqual(await api.getAccountProfile(controller.signal), { name: 'Rosa Maduda', email: profileResponse.email, position: '', units: '', modality: '', photoUrl: profileResponse.profilePhotoUrl })
})

test('aceita e-mail e dados profissionais ausentes e descarta URL de foto insegura', async () => {
  global.fetch = async () => respond({ ...profileResponse, email: null, roleName: null, unitName: null, workModel: null, profilePhotoUrl: 'javascript:alert(1)' })
  const profile = await api.getAccountProfile()
  assert.equal(profile.email, '')
  assert.equal(profile.photoUrl, undefined)
  assert.equal(profile.position, '')
  assert.equal(profile.units, '')
  assert.equal(profile.modality, '')
  global.fetch = async () => respond({ ...profileResponse, workModel: 'HIBRIDO', profilePhotoUrl: null })
  assert.equal((await api.getAccountDetails()).modality, 'Híbrido')
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
  for (const [status, message] of [[401, /sessão expirou/], [403, /permissão/], [404, /não foi encontrado/], [500, /Não foi possível concluir/]]) {
    global.fetch = async () => new Response('', { status })
    await assert.rejects(api.getAccountProfile(), message)
  }
  for (const body of [null, {}, { success: true, data: null }, { success: true, data: { ...profileResponse, name: '' } }, { success: true, data: { ...profileResponse, unitName: [] } }]) {
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

test('detalhes usam a nova rota, formatam CPF e preservam IDs; PUT envia somente os seis campos em inglês', async () => {
  const values = { name: ' Rosa Maduda ', cpf: '529.982.247-25', email: ' ROSA@example.test ', roleId: '7', unitId: '8', workModel: 'HIBRIDO' }
  const response = { ...profileResponse, cpf: '52998224725', roleId: 7, unitId: 8, workModel: 'HIBRIDO' }
  global.fetch = async (url, init) => {
    assert.equal(url, 'https://api.example.test/user/me/account-details')
    assert.equal(init.headers.Authorization, 'Bearer firebase-token')
    assert.equal(init.method, 'GET')
    return respond(response)
  }
  const profile = await api.getAccountDetails()
  assert.equal(profile.cpf, '529.982.247-25')
  assert.equal(profile.roleId, '7')
  assert.equal(profile.unitId, '8')
  assert.equal(profile.workModel, 'HIBRIDO')
  global.fetch = async (url, init) => {
    assert.equal(url, 'https://api.example.test/user/me/account-details')
    assert.equal(init.method, 'PUT')
    assert.equal(init.headers['Content-Type'], 'application/json')
    assert.deepEqual(JSON.parse(init.body), { name: 'Rosa Maduda', cpf: '52998224725', email: 'rosa@example.test', roleId: 7, unitId: 8, workModel: 'HIBRIDO' })
    return respond(response)
  }
  assert.deepEqual(await api.updateAccountDetails({ ...values, password: 'nao-enviar', status: 'ATIVO' }), profile)
  global.fetch = async () => assert.fail('Dados inválidos não devem ser enviados')
  for (const invalid of [{ cpf: '' }, { cpf: '11111111111' }, { roleId: '0' }, { unitId: 'abc' }, { name: 'A' }, { email: 'inválido' }, { workModel: '' }]) {
    await assert.rejects(api.updateAccountDetails({ ...values, ...invalid }), api.AccountApiError)
  }
  global.fetch = async () => new Response(JSON.stringify({ success: false, errors: ['CPF já cadastrado.'] }), { status: 409 })
  await assert.rejects(api.updateAccountDetails(values), /CPF já cadastrado/)
  global.fetch = async () => respond({ ...response, roleId: '7' })
  await assert.rejects(api.getAccountDetails(), /detalhes inválidos/)
})

test('sincronização de identidade e confirmação usam Firebase e relatam falha após salvamento sem repetir PUT', async () => {
  const calls = []
  const env = environment({ 'firebase/auth': { reload: async current => calls.push(['reload', current]), sendEmailVerification: async current => calls.push(['verify', current]) } })
  const service = env.load('src/services/account.ts')
  await service.refreshAccountIdentity()
  await service.sendAccountEmailVerification()
  assert.deepEqual(calls.map(call => call[0]), ['reload', 'reload', 'verify'])
  assert.ok(calls.every(call => call[1] === user))
  auth.currentUser = null
  await assert.rejects(service.refreshAccountIdentity(), /dados foram salvos/)
  await assert.rejects(service.sendAccountEmailVerification(), /Não foi possível enviar/)
})

test('atualiza a foto existente com PUT multipart, arquivo original e Bearer, aceitando 204 sem JSON', async () => {
  const file = new File(['photo'], 'nova-foto.webp', { type: 'image/webp' })
  const controller = new AbortController()
  global.fetch = async (url, init) => {
    assert.equal(url, 'https://api.example.test/user/me/profile-photo')
    assert.equal(init.method, 'PUT')
    assert.equal(init.headers.Authorization, 'Bearer firebase-token')
    assert.equal(init.headers['Content-Type'], undefined)
    assert.deepEqual([...init.body.keys()], ['file'])
    assert.equal(init.body.get('file'), file)
    assert.equal(init.signal.aborted, false)
    controller.abort()
    assert.equal(init.signal.aborted, true)
    return new Response(null, { status: 204 })
  }
  await assert.rejects(api.updateAccountPhoto(file, controller.signal), { name: 'AbortError' })
  global.fetch = async (url, init) => {
    assert.equal(url, 'https://api.example.test/user/me/profile-photo')
    assert.equal(init.body.get('file'), file)
    return new Response(null, { status: 204 })
  }
  assert.equal(await api.updateAccountPhoto(file), undefined)
})

test('foto vazia, formato inválido, tamanho excessivo ou sessão ausente não iniciam upload', async () => {
  global.fetch = async () => assert.fail('Arquivo inválido não deve ser enviado')
  for (const [file, message] of [
    [new File([], 'vazia.png', { type: 'image/png' }), /vazia/],
    [new File(['image'], 'foto.svg', { type: 'image/svg+xml' }), /JPEG, PNG ou WebP/],
    [new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.jpg', { type: 'image/jpeg' }), /no máximo 5 MB/],
  ]) await assert.rejects(api.updateAccountPhoto(file), message)
  auth.currentUser = null
  await assert.rejects(api.updateAccountPhoto(new File(['image'], 'foto.png', { type: 'image/png' })), /Entre na sua conta/)
  auth.currentUser = user
  global.fetch = async () => new Response(null, { status: 204 })
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
    await api.updateAccountPhoto(new File([new Uint8Array(5 * 1024 * 1024)], 'limite', { type }))
  }
})

test('upload traduz erros HTTP, recusa status inesperado e preserva a sessão', async () => {
  const file = new File(['image'], 'foto.png', { type: 'image/png' })
  for (const [status, message] of [[400, /imagem foi recusada/], [401, /sessão expirou/], [403, /permissão/], [404, /perfil não foi encontrado/], [413, /excede o limite/], [500, /Não foi possível salvar/], [200, /Não foi possível salvar/]]) {
    global.fetch = async () => new Response('', { status })
    await assert.rejects(api.updateAccountPhoto(file), message)
  }
  global.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(api.updateAccountPhoto(file), /Não foi possível enviar/)
  global.fetch = async () => { auth.currentUser = { ...user, uid: 'another' }; return new Response(null, { status: 204 }) }
  await assert.rejects(api.updateAccountPhoto(file), /sessão mudou/)
  auth.currentUser = { uid: user.uid, getIdToken: async () => { auth.currentUser = user; return 'old-token' } }
  global.fetch = async () => assert.fail('Não deve iniciar upload após trocar a sessão')
  await assert.rejects(api.updateAccountPhoto(file), /sessão mudou/)
})

function Modal({ children, title, onClose }) {
  return React.createElement('section', { role: 'dialog', 'aria-label': title }, typeof children === 'function' ? children(onClose) : children)
}

const completeProfile = { name: 'Rosa Maduda', email: profileResponse.email, position: profileResponse.roleName, units: profileResponse.unitName, modality: 'Presencial', photoUrl: profileResponse.profilePhotoUrl, cpf: '', roleId: '1', unitId: '1', workModel: 'PRESENCIAL' }

test('Ver tudo apresenta os campos da API, foto e CPF vazio, sem campo de senha', () => {
  let details = completeProfile
  const env = environment({ '../appModal': { __esModule: true, default: Modal }, '../../hooks/useAccountDetails': { useAccountDetails: () => ({ data: details, roles: [], units: [], submission: { pending: false } }) } })
  const Details = env.load('src/components/accountDetailsModal/index.tsx').default
  const profile = { name: 'Rosa Maduda', email: profileResponse.email, position: profileResponse.roleName, units: profileResponse.unitName, modality: 'Presencial', photoUrl: profileResponse.profilePhotoUrl }
  const markup = renderToStaticMarkup(React.createElement(Details, { profile, onCancel() {} }))
  const dom = new JSDOM(markup)
  assert.equal(dom.window.document.querySelectorAll('input').length, 6)
  assert.equal(dom.window.document.querySelector('#account-detail-cpf').value, '')
  assert.equal(dom.window.document.querySelector('input[type=password]'), null)
  assert.doesNotMatch(markup, /Senha|astro-demo|Kirk/)
  assert.equal(dom.window.document.querySelector('#account-detail-units').value, 'Matriz São Paulo')
  assert.equal(dom.window.document.querySelector('img').getAttribute('src'), profileResponse.profilePhotoUrl)
  dom.window.close()
  details = { ...details, email: '' }
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
  let detailsReads = 0
  let read = () => first.promise
  const env = environment({
    './useAuthentication': { useAuthentication: () => context },
    '../../hooks/useAuthentication': { useAuthentication: () => context },
    '../../hooks/useLogout': { useLogout: () => ({ pending: false, error: '', submit() {} }) },
    '../services/account': { getAccountProfile: signal => { calls.push(signal); return read() }, getAccountDetails: async () => { detailsReads++; return completeProfile } },
    '../../components/passwordConfirmationModal': { __esModule: true, default: ({ onContinue }) => React.createElement('button', { onClick: onContinue }, 'Confirmar identidade') },
    '../appModal': { __esModule: true, default: Modal },
  })
  const Page = env.load('src/pages/mainAccountScreen/index.tsx').default
  const render = () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/mainAccountScreen'] }, React.createElement(Page)))
  const profile = { name: 'Rosa Maduda', email: profileResponse.email, position: profileResponse.roleName, units: profileResponse.unitName, modality: 'Presencial', photoUrl: profileResponse.profilePhotoUrl }
  try {
    await act(async () => render())
    assert.match(document.querySelector('[role=status]').textContent, /Carregando/)
    assert.doesNotMatch(document.body.textContent, /Kirk/)
    await act(async () => first.resolve(profile))
    assert.equal(document.getElementById('account-name').value, profile.name)
    assert.equal(document.getElementById('account-edit-action').disabled, false)
    assert.equal(detailsReads, 0)
    await act(async () => document.querySelector('.account-profile-photo img').dispatchEvent(new dom.window.Event('error')))
    assert.equal(document.querySelector('.account-profile-initials').textContent, 'RM')
    await act(async () => document.getElementById('account-view-action').click())
    assert.equal(document.querySelector('[role=dialog]'), null)
    assert.equal(detailsReads, 0)
    await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Confirmar identidade').click())
    assert.equal(document.querySelector('[role=dialog] input[type=password]'), null)
    assert.equal(document.getElementById('account-detail-position').value, profile.position)
    assert.equal(detailsReads, 1)

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
    assert.ok(document.querySelector('[aria-label=Configurações]'))

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

test('troca de foto mantém a atual durante upload, compartilha o resultado e repete somente GET se a atualização falhar', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/mainAccountScreen' })
  const saved = { window: global.window, document: global.document, IS_REACT_ACT_ENVIRONMENT: global.IS_REACT_ACT_ENVIRONMENT }
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true
  const root = createRoot(document.getElementById('root'))
  const context = { user: { uid: 'manager', accountType: 'GESTOR' } }
  const profile = { name: 'Rosa Maduda', email: profileResponse.email, position: profileResponse.roleName, units: profileResponse.unitName, modality: 'Presencial', photoUrl: profileResponse.profilePhotoUrl }
  const uploads = [], reads = []
  let read = async () => profile
  let send = deferred()
  const env = environment({
    './useAuthentication': { useAuthentication: () => context },
    '../../hooks/useAuthentication': { useAuthentication: () => context },
    '../../hooks/useLogout': { useLogout: () => ({ pending: false, error: '', submit() {} }) },
    '../services/account': {
      getAccountProfile: signal => { reads.push(signal); return read() },
      getAccountDetails: async () => completeProfile,
      updateAccountPhoto: (file, signal) => { uploads.push({ file, signal }); return send.promise },
    },
    '../../components/passwordConfirmationModal': { __esModule: true, default: ({ onContinue }) => React.createElement('button', { onClick: onContinue }, 'Confirmar identidade') },
    '../appModal': { __esModule: true, default: Modal },
  })
  const Page = env.load('src/pages/mainAccountScreen/index.tsx').default
  const file = new File(['image'], 'nova.png', { type: 'image/png' })
  const select = input => {
    Object.defineProperty(input, 'files', { configurable: true, value: [file] })
    input.dispatchEvent(new dom.window.Event('change', { bubbles: true }))
  }
  try {
    await act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/mainAccountScreen'] }, React.createElement(Page))))
    await act(async () => document.getElementById('account-view-action').click())
    await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Confirmar identidade').click())
    const dialog = document.querySelector('[role=dialog]')
    let input = dialog.querySelector('input[type=file]')
    assert.equal(input.accept, 'image/jpeg,image/png,image/webp')
    await act(async () => { select(input); select(input) })
    assert.equal(uploads.length, 1)
    assert.equal(uploads[0].file, file)
    assert.equal(dialog.querySelector('[aria-label="Alterar foto do perfil"]').disabled, true)
    assert.equal(dialog.querySelector('img').getAttribute('src'), profile.photoUrl)
    assert.match(document.querySelector('.login-loading-overlay').textContent, /Carregando/)
    await act(async () => send.reject(new Error('Upload indisponível.')))
    assert.match([...document.querySelectorAll('.astro-action-notice [role=alert]')].at(-1).textContent, /Upload indisponível/)
    assert.equal(dialog.querySelector('img').getAttribute('src'), profile.photoUrl)
    assert.equal(input.value, '')

    send = deferred()
    const refresh = deferred()
    read = () => refresh.promise
    await act(async () => select(input))
    await act(async () => send.resolve())
    assert.equal(uploads.length, 2)
    assert.equal(dialog.querySelector('img').getAttribute('src'), profile.photoUrl)
    await act(async () => refresh.reject(new Error('Não foi possível consultar o perfil.')))
    assert.match([...document.querySelectorAll('.astro-action-notice [role=alert]')].at(-1).textContent, /Sua foto foi salva/)
    read = async () => ({ ...profile, photoUrl: 'https://images.example.test/updated-photo' })
    await act(async () => [...dialog.querySelectorAll('button')].find(button => button.textContent === 'Atualizar foto').click())
    assert.equal(uploads.length, 2)
    assert.equal(document.querySelector('.account-information-card img').getAttribute('src'), 'https://images.example.test/updated-photo')
    assert.equal(dialog.querySelector('img').getAttribute('src'), 'https://images.example.test/updated-photo')
    assert.match(document.querySelector('.astro-action-notice[data-tone=success]').textContent, /Foto de perfil atualizada/)
    assert.equal(dialog.querySelector('[role=alert]'), null)

    send = deferred()
    input = dialog.querySelector('input[type=file]')
    await act(async () => select(input))
    const before = reads.length
    const signal = uploads.at(-1).signal
    await act(async () => root.unmount())
    assert.equal(signal.aborted, true)
    await act(async () => send.resolve())
    assert.equal(reads.length, before)
  } finally {
    await act(async () => root.unmount())
    dom.window.close()
    Object.assign(global, saved)
  }
})

test('edição respeita o perfil, oferece vínculos ativos e mantém o formulário após conflito; sucesso atualiza o cartão', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/mainAccountScreen' })
  const saved = Object.fromEntries(['window', 'document', 'getComputedStyle', 'Node', 'IS_REACT_ACT_ENVIRONMENT'].map(key => [key, global[key]]))
  Object.assign(global, { window: dom.window, document: dom.window.document, getComputedStyle: dom.window.getComputedStyle, Node: dom.window.Node, IS_REACT_ACT_ENVIRONMENT: true })
  dom.window.matchMedia = () => ({ matches: true })
  // React was loaded before jsdom; these legacy hooks are only used by its input-event fallback.
  dom.window.HTMLElement.prototype.attachEvent = () => {}
  dom.window.HTMLElement.prototype.detachEvent = () => {}
  const root = createRoot(document.getElementById('root'))
  const context = { user: { uid: 'manager', accountType: 'GESTOR' } }
  const profile = { ...completeProfile, cpf: '529.982.247-25' }
  const writes = [], lists = []
  let pending = deferred()
  const env = environment({
    './useAuthentication': { useAuthentication: () => context },
    '../../hooks/useAuthentication': { useAuthentication: () => context },
    '../../hooks/useLogout': { useLogout: () => ({ pending: false, error: '', submit() {} }) },
    '../services/account': {
      getAccountProfile: async () => profile, getAccountDetails: async () => profile,
      updateAccountDetails: (values, signal) => { writes.push({ values, signal }); return pending.promise },
    },
    '../services/roles': { listRoles: async () => { lists.push('roles'); return [{ id: '1', name: profile.position, active: false }, { id: '2', name: 'Engenheira', active: true }, { id: '3', name: 'Cargo inativo', active: false }] } },
    '../services/units': { listUnits: async () => { lists.push('units'); return [{ id: '1', name: profile.units, active: false }, { id: '2', name: 'Campinas', active: true }, { id: '3', name: 'Unidade inativa', active: false }] } },
    '../../components/passwordConfirmationModal': { __esModule: true, default: ({ onContinue }) => React.createElement('button', { onClick: onContinue }, 'Confirmar identidade') },
    '../appModal': { __esModule: true, default: Modal },
  })
  const Page = env.load('src/pages/mainAccountScreen/index.tsx').default
  const render = () => root.render(React.createElement(MemoryRouter, null, React.createElement(Page)))
  const submit = () => document.querySelector('[role=dialog] form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }))
  const open = async () => {
    await act(async () => document.getElementById('account-edit-action').click())
    await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Confirmar identidade').click())
  }
  try {
    await act(async () => render())
    await open()
    assert.equal(document.getElementById('account-detail-roleId').disabled, true)
    assert.equal(document.getElementById('account-detail-unitId').disabled, true)
    assert.deepEqual(lists, [])
    await act(async () => { submit(); submit() })
    assert.equal(writes.length, 1)
    assert.equal(writes[0].values.roleId, '1')
    assert.equal(writes[0].values.unitId, '1')
    assert.equal(document.querySelector('[role=dialog] fieldset').disabled, true)
    await act(async () => pending.reject(new Error('CPF já cadastrado.')))
    assert.match(document.querySelector('[role=alert]').textContent, /CPF já cadastrado/)
    assert.equal(document.getElementById('account-detail-cpf').value, profile.cpf)
    assert.equal(document.getElementById('account-name').value, profile.name)

    context.user = { uid: 'workspace', accountType: 'GESTOR_WORKSPACE' }
    await act(async () => render())
    await open()
    assert.deepEqual(lists.sort(), ['roles', 'units'])
    assert.equal(document.getElementById('account-detail-roleId').disabled, false)
    assert.equal(document.getElementById('account-detail-unitId').disabled, false)
    for (const [field, label, excluded] of [['roleId', 'Engenheira', 'Cargo inativo'], ['unitId', 'Campinas', 'Unidade inativa'], ['workModel', 'Remoto', '']]) {
      await act(async () => document.getElementById(`account-detail-${field}`).click())
      const options = [...document.querySelectorAll('[role=option]')]
      if (excluded) assert.ok(!options.some(option => option.textContent === excluded))
      await act(async () => options.find(option => option.textContent === label).click())
    }
    pending = deferred()
    await act(async () => submit())
    assert.deepEqual({ roleId: writes[1].values.roleId, unitId: writes[1].values.unitId, workModel: writes[1].values.workModel }, { roleId: '2', unitId: '2', workModel: 'REMOTO' })
    await act(async () => pending.resolve({ ...profile, name: 'Rosa Atualizada', roleId: '2', unitId: '2', workModel: 'REMOTO' }))
    assert.equal(document.getElementById('account-name').value, 'Rosa Atualizada')
    assert.match(document.querySelector('[role=status]').textContent, /Informações da conta atualizadas/)
    assert.equal(document.querySelector('[role=dialog]'), null)
  } finally {
    await act(async () => root.unmount())
    dom.window.close()
    Object.assign(global, saved)
  }
})

test('detalhes permitem nova tentativa; e-mail alterado separa PUT e confirmação, e desmontagem cancela escrita', async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const saved = { window: global.window, document: global.document, IS_REACT_ACT_ENVIRONMENT: global.IS_REACT_ACT_ENVIRONMENT }
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true
  const root = createRoot(document.getElementById('root'))
  let result, request = deferred(), read = async () => { throw new Error('Falha na consulta.') }
  let writes = 0, emails = 0, signal
  const env = environment({
    '../services/account': {
      getAccountDetails: () => read(),
      updateAccountDetails: (values, currentSignal) => { writes++; signal = currentSignal; return request.promise },
      refreshAccountIdentity: async () => { throw new Error('Dados salvos; entre novamente.') },
      sendAccountEmailVerification: async () => { emails++ },
    },
    '../services/roles': { listRoles: async () => assert.fail('Visualização não deve buscar cargos') },
    '../services/units': { listUnits: async () => assert.fail('Visualização não deve buscar unidades') },
  })
  const { useAccountDetails } = env.load('src/hooks/useAccountDetails.ts')
  function Probe() { const current = useAccountDetails(false, false); React.useEffect(() => { result = current }); return null }
  try {
    await act(async () => root.render(React.createElement(Probe)))
    assert.equal(result.error, 'Falha na consulta.')
    read = async () => completeProfile
    await act(async () => result.retry())
    assert.equal(result.data.name, completeProfile.name)
    let saving
    await act(async () => { saving = result.save({}) })
    assert.equal(result.submission.pending, true)
    assert.equal(await result.save({}), null)
    assert.equal(writes, 1)
    await act(async () => { request.resolve({ ...completeProfile, email: 'novo@example.test' }); await saving })
    assert.equal(result.data.email, 'novo@example.test')
    assert.match(result.submission.message, /Dados salvos/)
    assert.equal(result.submission.error, '')
    assert.equal(emails, 0)
    await act(async () => result.verifyEmail())
    assert.equal(emails, 1)
    assert.match(result.submission.message, /Confirmação enviada/)
    request = deferred()
    await act(async () => { saving = result.save({}) })
    await act(async () => root.unmount())
    assert.equal(signal.aborted, true)
    request.resolve(completeProfile)
    assert.equal(await saving, null)
  } finally {
    await act(async () => root.unmount())
    dom.window.close()
    Object.assign(global, saved)
  }
})
