const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { createRoot } = require('react-dom/client')
const { JSDOM } = require('jsdom')
const { MemoryRouter, Routes, Route } = require('react-router-dom')

test('login diferencia sucesso, conta inativada e credenciais inválidas e exibe o destino correto', async () => {
  for (const outcome of ['success', 'inactive', 'invalid']) {
    const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost' })
    const previous = { window: global.window, document: global.document, IS_REACT_ACT_ENVIRONMENT: global.IS_REACT_ACT_ENVIRONMENT }
    Object.assign(global, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
    const cache = new Map()
    let finishLogin
    const loginWait = new Promise(resolve => { finishLogin = resolve })
    class AuthenticationError extends Error {
      constructor(message) { super(message); this.inactiveAccount = outcome === 'inactive'; this.invalidCredentials = outcome === 'invalid' }
    }
    function LoginForm(props) {
      return React.createElement('div', null,
        React.createElement('button', { onClick() { props.onCredentialChange('email', 'gestor@example.test'); props.onCredentialChange('password', 'Senha123') } }, 'Preencher'),
        React.createElement('button', { onClick: props.onSubmit }, 'Entrar'),
        React.createElement('p', { role: 'alert' }, props.message))
    }
    function load(filename) {
      filename = path.resolve(filename)
      if (cache.has(filename)) return cache.get(filename).exports
      const module = { exports: {} }; cache.set(filename, module)
      const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
      new Function('require', 'module', 'exports', code)(specifier => {
        if (specifier.endsWith('/services/authentication')) return { AuthenticationError, loginWithEmailAndPassword: async () => { await loginWait; if (outcome !== 'success') throw new AuthenticationError(outcome === 'inactive' ? 'Conta inativada.' : 'E-mail ou senha inválido(s).') } }
        if (specifier.endsWith('/useWorkspaceRegistration')) return { useWorkspaceRegistration: () => ({ reset() {} }) }
        if (specifier === '../../components') return { LoginForm, AnimatedWelcome: () => null, AstroBrand: () => null, HelpLink: () => null }
        if (specifier.endsWith('/loginLoadingOverlay')) return { __esModule: true, default: () => React.createElement('div', { className: 'login-loading-spinner' }, 'Carregando') }
        if (!specifier.startsWith('.')) return require(specifier)
        const resolved = path.resolve(path.dirname(filename), specifier)
        return load([`${resolved}.ts`, `${resolved}.tsx`, path.join(resolved, 'index.tsx')].find(file => fs.existsSync(file)))
      }, module, module.exports)
      return module.exports
    }
    const LoginPage = load('src/pages/login/index.tsx').default
    const root = createRoot(dom.window.document.getElementById('root'))
    try {
      await React.act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(Routes, null,
        React.createElement(Route, { path: '/', element: React.createElement(LoginPage) }),
        React.createElement(Route, { path: '/loadingScreen', element: React.createElement('h1', null, 'Planeta antes da Home') }),
        React.createElement(Route, { path: '/inactiveScreenLayout', element: React.createElement('h1', null, 'Usuário inativado') })))))
      await React.act(async () => dom.window.document.querySelector('button').click())
      await React.act(async () => [...dom.window.document.querySelectorAll('button')].find(button => button.textContent === 'Entrar').click())
      assert.ok(dom.window.document.querySelector('.login-loading-spinner'))
      assert.ok(dom.window.document.querySelector('.login-page'))
      assert.equal(dom.window.document.querySelector('.loading-planet-svg'), null)
      await React.act(async () => finishLogin())
      assert.match(dom.window.document.body.textContent, outcome === 'success' ? /Planeta antes da Home/ : outcome === 'inactive' ? /Usuário inativado/ : /E-mail ou senha inválido/)
      assert.equal(Boolean(dom.window.document.querySelector('.login-page')), outcome === 'invalid')
    } finally {
      await React.act(async () => root.unmount())
      dom.window.close()
      Object.assign(global, previous)
    }
  }
})
