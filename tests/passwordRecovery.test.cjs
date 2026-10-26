const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { JSDOM } = require('jsdom')
const { MemoryRouter, Routes, Route } = require('react-router-dom')

function environment() {
  const cache = new Map()
  function load(file) {
    const filename = path.resolve(file)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'").replaceAll('import.meta.env.DEV', 'false').replaceAll('import.meta.env.VITE_PASSWORD_RESET_API_URL', "'https://worker.test'")
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'module', 'exports', code)(specifier => {
      if (!specifier.startsWith('.')) return require(specifier)
      const resolved = path.resolve(path.dirname(filename), specifier)
      return load([resolved + '.ts', resolved + '.tsx', path.join(resolved, 'index.tsx')].find(fs.existsSync))
    }, module, module.exports)
    return module.exports
  }
  return { load, service: load('src/services/passwordRecovery.ts'), validation: load('src/utils/passwordRecovery.ts') }
}

async function withDom(run) {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://astro.test/replacePassword?mode=resetPassword&oobCode=test-code' })
  const previous = { window: global.window, document: global.document, IS_REACT_ACT_ENVIRONMENT: global.IS_REACT_ACT_ENVIRONMENT, fetch: global.fetch }
  Object.assign(global, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
  const { createRoot } = require('react-dom/client')
  const root = createRoot(document.getElementById('root'))
  const pendingRequests = []
  global.fetch = () => new Promise(resolve => pendingRequests.push(() => resolve(Response.json({ success: true }))))
  const env = environment()
  const pages = Object.fromEntries(['forgotPassword', 'passwordRecoverySent', 'replacePassword', 'passwordChanged'].map(name => [name, env.load(`src/pages/${name}/index.tsx`).default]))
  async function mount(route = '/forgotPassword') {
    await React.act(async () => root.render(React.createElement(MemoryRouter, { key: route, initialEntries: [route] },
      React.createElement(Routes, null,
        ...Object.entries(pages).map(([name, Page]) => React.createElement(Route, { key: name, path: '/' + name, element: React.createElement(Page) })),
        React.createElement(Route, { path: '/', element: React.createElement('h1', null, 'Login') })))))
  }
  async function fill(id, value) {
    await React.act(async () => {
      const input = document.getElementById(id)
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value)
      input.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
  }
  async function submit() { await React.act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))) }
  async function settle() { await React.act(async () => { pendingRequests.splice(0).forEach(resolve => resolve()) }) }
  try { await run({ ...env, mount, fill, submit, settle }) }
  finally { await React.act(async () => root.unmount()); dom.window.close(); Object.assign(global, previous) }
}


test('serviço envia contratos sem enumeração e confirma usando o código', async () => {
  const previous = global.fetch
  const calls = []
  global.fetch = async (url, options) => { calls.push({ url, options }); return Response.json({ success: true }) }
  try {
    const { service } = environment()
    const signal = new AbortController().signal
    await service.requestPasswordRecovery(' desconhecido@example.test ', signal)
    assert.equal(service.getRecoveryChallenge().email, 'desconhecido@example.test')
    assert.deepEqual(JSON.parse(calls[0].options.body), { email: 'desconhecido@example.test' })
    await service.replacePassword({ email: 'ignored@example.test', password: 'Astro1234', confirmation: 'Astro1234' }, 'test-code', signal)
    assert.deepEqual(JSON.parse(calls[1].options.body), { oobCode: 'test-code', newPassword: 'Astro1234' })
    assert.equal(calls[1].options.referrerPolicy, 'no-referrer')
  } finally { global.fetch = previous }
})

test('fluxo mostra loading, valida confirmação e navega somente depois do sucesso', async () => withDom(async ui => {
  await ui.mount()
  await ui.submit()
  assert.ok(document.querySelector('[role=alert]'))
  await ui.fill('recovery-email', 'desconhecido@example.test')
  await ui.submit()
  assert.ok(document.querySelector('.login-loading-overlay'))
  await ui.settle()
  assert.equal(document.querySelector('h1').textContent, 'Confira seu e-mail')
  assert.match(document.body.textContent, /Se o e-mail/)
  assert.doesNotMatch(document.body.textContent, /gestor@astro.com/)
  await ui.mount('/replacePassword')
  await ui.fill('recovery-password', 'Astro1234')
  await ui.fill('recovery-confirmation', 'Outra1234')
  await ui.submit()
  assert.match(document.getElementById('recovery-confirmation-error').textContent, /não conferem/)
  await ui.fill('recovery-confirmation', 'Astro1234')
  await ui.submit()
  await ui.settle()
  assert.equal(document.querySelector('h1').textContent, 'Senha alterada com sucesso!')
  await React.act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Ir para o login').click())
  assert.equal(document.querySelector('h1').textContent, 'Login')
}))

for (const [code, message] of [['INVALID_OR_EXPIRED_CODE', /inválido ou expirou/], ['INVALID_PASSWORD', /política/], ['SERVICE_UNAVAILABLE', /Tente novamente/]]) {
  test('erro de backend mantém a redefinição: ' + code, async () => withDom(async ui => {
    global.fetch = async () => Response.json({ success: false, error: { code, message: 'internal-secret' } }, { status: code === 'SERVICE_UNAVAILABLE' ? 503 : 400 })
    await ui.mount('/replacePassword')
    await ui.fill('recovery-password', 'Astro1234')
    await ui.fill('recovery-confirmation', 'Astro1234')
    await ui.submit(); await ui.settle()
    assert.equal(document.querySelector('h1').textContent, 'Substitua sua senha')
    assert.match(document.body.textContent, message)
    assert.doesNotMatch(document.body.textContent, /internal-secret/)
    assert.ok(document.querySelector('[role=alert]'))
    assert.equal(document.querySelector('a').getAttribute('href'), '/forgotPassword')
  }))
}

test('ausência do código bloqueia formulário e oferece novo link', async () => withDom(async ui => {
  const link = ui.load('src/utils/passwordResetLink.ts').passwordResetLink
  link.code = ''; link.invalid = true
  await ui.mount('/replacePassword')
  assert.equal(document.querySelector('h1').textContent, 'Solicite um novo link')
  assert.equal(document.querySelector('form'), null)
  assert.ok(document.querySelector('[role=alert]'))
}))

test('captura remove parâmetros sensíveis e recusa modos desconhecidos e códigos duplicados', () => {
  const { load } = environment()
  const { capturePasswordResetLink } = load('src/utils/passwordResetLink.ts')
  for (const [search, valid] of [['?mode=resetPassword&oobCode=valid&continueUrl=https://evil.test&apiKey=private', true], ['?mode=verifyEmail&oobCode=secret', false], ['?mode=resetPassword&oobCode=a&oobCode=b', false], ['', false]]) {
    let replaced
    const result = capturePasswordResetLink({ location: { href: 'https://astro.test/astro-web/replacePassword' + search }, history: { state: {}, replaceState: (_state, _title, url) => { replaced = url } } })
    assert.equal(result.invalid, !valid)
    assert.equal(replaced, '/astro-web/replacePassword')
    assert.equal(result.code, valid ? 'valid' : '')
  }
})

test('cancelar envio não registra desafio pendente', async () => {
  const previous = global.fetch
  global.fetch = async (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted'))))
  try {
    const { service } = environment()
    const controller = new AbortController()
    const pending = service.requestPasswordRecovery('user@example.test', controller.signal)
    controller.abort()
    await assert.rejects(pending, { name: 'AbortError' })
    assert.equal(service.getRecoveryChallenge(), null)
  } finally { global.fetch = previous }
})

test('sucesso exige HTTP 200 e success=true e preserva mensagem genérica do serviço', async () => {
  const previous = global.fetch
  try {
    const { service } = environment()
    const signal = new AbortController().signal
    global.fetch = async () => Response.json({ success: true, message: 'Se o e-mail estiver cadastrado, enviaremos um link.' })
    const challenge = await service.requestPasswordRecovery('user@example.test', signal)
    assert.equal(challenge.message, 'Se o e-mail estiver cadastrado, enviaremos um link.')
    for (const [status, success] of [[202, true], [200, false], [400, true]]) {
      global.fetch = async () => Response.json({ success }, { status })
      await assert.rejects(service.replacePassword({ email: '', password: 'Astro1234', confirmation: 'Astro1234' }, 'test-code', signal))
    }
  } finally { global.fetch = previous }
})

test('INVALID_EMAIL é associado ao campo e falha de rede permite nova tentativa', async () => {
  const previous = global.fetch
  try {
    const { service } = environment()
    const signal = new AbortController().signal
    global.fetch = async () => Response.json({ success: false, error: { code: 'INVALID_EMAIL' } }, { status: 400 })
    await assert.rejects(service.requestPasswordRecovery('user@example.test', signal), { field: 'email' })
    global.fetch = async () => { throw new TypeError('Failed to fetch') }
    await assert.rejects(service.requestPasswordRecovery('user@example.test', signal), /conectar ao serviço/)
    global.fetch = async () => Response.json({ success: true })
    await service.requestPasswordRecovery('user@example.test', signal)
  } finally { global.fetch = previous }
})

test('429 respeita Retry-After e compartilha espera entre os endpoints mesmo sem JSON', async () => {
  const previous = global.fetch
  const previousNow = Date.now
  let now = 1800000000000
  Date.now = () => now
  try {
    for (const [value, seconds] of [['90', 90], ['date', 120], ['inválido', 60]]) {
      const header = value === 'date' ? new Date(now + seconds * 1000).toUTCString() : value
      const { service } = environment()
      let calls = 0
      global.fetch = async () => { calls++; return new Response('Too many requests', { status: 429, headers: { 'Retry-After': header } }) }
      const signal = new AbortController().signal
      await assert.rejects(service.requestPasswordRecovery('user@example.test', signal), /Muitas solicitações/)
      assert.equal(service.getPasswordRecoveryRetrySeconds(), seconds)
      await assert.rejects(service.replacePassword({ email: '', password: 'Astro1234', confirmation: 'Astro1234' }, 'test-code', signal), /Muitas solicitações/)
      assert.equal(calls, 1)
      now += seconds * 1000
      global.fetch = async () => Response.json({ success: true })
      await service.requestPasswordRecovery('user@example.test', signal)
      assert.equal(service.getPasswordRecoveryRetrySeconds(), 0)
    }
  } finally { global.fetch = previous; Date.now = previousNow }
})

test('429 mostra espera e bloqueia reenvio no formulário', async () => withDom(async ui => {
  global.fetch = async () => new Response('', { status: 429, headers: { 'Retry-After': '90' } })
  await ui.mount()
  await ui.fill('recovery-email', 'user@example.test')
  await ui.submit(); await ui.settle()
  assert.match(document.querySelector('[role=alert]').textContent, /Muitas solicitações/)
  const button = document.querySelector('button[type=submit]')
  assert.equal(button.disabled, true)
  assert.match(button.textContent, /Aguarde 90s/)
}))

test('envio que leva quinze segundos aguarda sucesso do Worker', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const previous = global.fetch
  global.fetch = (_url, options) => new Promise((resolve, reject) => {
    setTimeout(() => resolve(Response.json({ success: true })), 15000)
    options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
  })
  try {
    const { service } = environment()
    const pending = service.requestPasswordRecovery('user@example.test', new AbortController().signal)
    context.mock.timers.tick(15000)
    await pending
    assert.ok(service.getRecoveryChallenge())
  } finally { global.fetch = previous }
})

test('timeout do Web cancela após 35 segundos e permite tentar novamente', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const previous = global.fetch
  let requestSignal
  global.fetch = (_url, options) => new Promise((_resolve, reject) => {
    requestSignal = options.signal
    options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
  })
  try {
    const { service } = environment()
    const signal = new AbortController().signal
    const pending = service.requestPasswordRecovery('user@example.test', signal)
    const rejected = assert.rejects(pending, /conectar ao serviço/)
    context.mock.timers.tick(34999)
    assert.equal(requestSignal.aborted, false)
    context.mock.timers.tick(1)
    await rejected
    assert.equal(service.getRecoveryChallenge(), null)
    global.fetch = async () => Response.json({ success: true })
    await service.requestPasswordRecovery('user@example.test', signal)
  } finally { global.fetch = previous }
})
