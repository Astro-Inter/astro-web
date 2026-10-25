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
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'").replaceAll('import.meta.env.VITE_PASSWORD_RESET_API_URL', "'https://worker.test'")
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
  global.fetch = async () => { await new Promise(resolve => setTimeout(resolve, 20)); return Response.json({ success: true }) }
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
  async function settle() { await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 60)) }) }
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
