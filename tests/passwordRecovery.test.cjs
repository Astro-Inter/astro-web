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
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'")
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'module', 'exports', code)(specifier => {
      if (!specifier.startsWith('.')) return require(specifier)
      const resolved = path.resolve(path.dirname(filename), specifier)
      return load([resolved + '.ts', resolved + '.tsx', path.join(resolved, 'index.tsx')].find(fs.existsSync))
    }, module, module.exports)
    return module.exports
  }
  return { load, service: load('src/services/passwordRecoveryMock.ts'), validation: load('src/utils/passwordRecovery.ts') }
}

test('mock valida e-mail e senhas sem exigir token ou alterar conta real', async () => {
  const { service, validation } = environment()
  assert.ok(validation.validateRecoveryEmail('incorreto').email)
  const values = { email: '', password: 'Astro1234', confirmation: 'Astro1234' }
  const signal = new AbortController().signal
  await assert.rejects(service.requestPasswordRecovery('nao-cadastrado@example.test', signal), /não está cadastrado/)
  const challenge = await service.requestPasswordRecovery(' Gestor@Astro.com ', signal)
  assert.equal(challenge.email, 'gestor@astro.com')
  assert.equal('password' in challenge, false)
  await assert.rejects(service.replacePassword({ ...values, confirmation: 'Outra1234' }, signal), /não conferem/)
  await service.replacePassword(values, signal)
  await service.replacePassword(values, signal)
})

test('cancelamento durante envio não cria recuperação pendente', async () => {
  const { service } = environment()
  const controller = new AbortController()
  const request = service.requestPasswordRecovery('gestor@astro.com', controller.signal)
  controller.abort()
  await assert.rejects(request, { name: 'AbortError' })
  assert.equal(service.getRecoveryChallenge(), null)
})

async function withDom(run) {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://astro.test' })
  const previous = { window: global.window, document: global.document, IS_REACT_ACT_ENVIRONMENT: global.IS_REACT_ACT_ENVIRONMENT }
  Object.assign(global, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
  const { createRoot } = require('react-dom/client')
  const root = createRoot(document.getElementById('root'))
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
  async function settle() { await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 550)) }) }
  try { await run({ ...env, mount, fill, submit, settle }) }
  finally { await React.act(async () => root.unmount()); dom.window.close(); Object.assign(global, previous) }
}

test('fluxo completo mostra carregamento, valida erros e termina no login', async () => withDom(async ui => {
  await ui.mount()
  await ui.submit()
  assert.match(document.querySelector('[role=alert]').textContent, /email/)
  await ui.fill('recovery-email', 'gestor@astro.com')
  await ui.submit()
  assert.ok(document.querySelector('.login-loading-overlay'))
  await ui.settle()
  assert.equal(document.querySelector('h1').textContent, 'E-mail enviado com sucesso!')
  assert.match(document.body.textContent, /Clique no botão do e-mail/)
  assert.ok([...document.querySelectorAll('button')].some(button => button.textContent === 'Continuar'))
  await ui.mount('/replacePassword')
  assert.equal(document.querySelector('h1').textContent, 'Substitua sua senha')
  assert.equal(document.getElementById('recovery-code'), null)
  await ui.fill('recovery-password', 'Astro1234')
  await ui.fill('recovery-confirmation', 'Outra1234')
  await ui.submit()
  assert.match(document.getElementById('recovery-confirmation-error').textContent, /não conferem/)
  await ui.fill('recovery-confirmation', 'Astro1234')
  await ui.submit(); await ui.settle()
  assert.equal(document.querySelector('h1').textContent, 'Senha alterada com sucesso!')
  assert.equal(document.querySelector('input[type=password]'), null)
  await React.act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Ir para o login').click())
  assert.equal(document.querySelector('h1').textContent, 'Login')
}))

for (const [route, title] of Object.entries({
  forgotPassword: 'Esqueceu sua senha?',
  passwordRecoverySent: 'E-mail enviado com sucesso!',
  replacePassword: 'Substitua sua senha',
  passwordChanged: 'Senha alterada com sucesso!',
})) {
  test(`acesso direto a /${route} sem token, estado ou etapas anteriores`, async () => withDom(async ui => {
    await ui.mount('/' + route)
    assert.equal(document.querySelector('h1').textContent, title)
    if (route === 'replacePassword') assert.equal(document.querySelectorAll('input').length, 2)
    if (route === 'passwordRecoverySent') {
      assert.doesNotMatch(document.body.textContent, /Usar outro e-mail|Reenviar e-mail/)
      await React.act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Continuar').click())
      assert.equal(document.querySelector('h1').textContent, 'Login')
    }
  }))
}
