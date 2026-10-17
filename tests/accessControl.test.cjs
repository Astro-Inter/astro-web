const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { MemoryRouter, Navigate } = require('react-router-dom')

function environment(accountType) {
  const context = { user: accountType ? { uid: 'manager', accountType } : null, status: 'ready', error: '' }
  const cache = new Map()
  function load(filename) {
    filename = path.resolve(filename)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }
    cache.set(filename, module)
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'")
    const code = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText
    new Function('require', 'module', 'exports', code)(specifier => {
      if (specifier.endsWith('/useAuthentication')) return { useAuthentication: () => context }
      if (specifier.endsWith('/useAccountProfile')) return { useAccountProfile: () => ({ data: null, loading: true, error: '', retry() {} }) }
      if (specifier.endsWith('/useLogout')) return { useLogout: () => ({ pending: false, error: '', submit: async () => true }) }
      if (specifier === './firebase') return { firebaseAuth: { currentUser: null } }
      if (specifier === '../routeContent') return { __esModule: true, default: () => React.createElement('p', null, 'Conteúdo autorizado') }
      if (specifier === '../initialLoadingState') return { __esModule: true, default: ({ error }) => React.createElement('p', { role: error ? 'alert' : 'status' }, error || 'Carregando') }
      if (specifier === '../../components') {
        return Object.fromEntries(['AstroBrand', 'AstroIcon', 'CompactPurpleButton', 'ConfirmationModal', 'FormField', 'HelpLink']
          .map(name => [name, load(`src/components/${name[0].toLowerCase()}${name.slice(1)}/index.tsx`).default]))
      }
      if (!specifier.startsWith('.')) return require(specifier)
      const resolved = path.resolve(path.dirname(filename), specifier)
      return load([`${resolved}.ts`, `${resolved}.tsx`, path.join(resolved, 'index.tsx')].find(file => fs.existsSync(file)))
    }, module, module.exports)
    return module.exports
  }
  function render(component, route = '/mainHomeScreen', props = {}) {
    return renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(component, props)))
  }
  return { ...load('src/utils/accessControl.ts'), context, load, render }
}

test('perfis compartilham as áreas do Figma; gestão de gestores e configurações são exclusivas do workspace', () => {
  const env = environment()
  for (const route of ['/mainHomeScreen', '/mainDashboardsScreen', '/mainEmployeerScreen', '/mainConformityScreen',
    '/mainUnitScreen', '/mainPositionScreen', '/mainFormScreen', '/mainEventScreen', '/mainAccountScreen', '/createForms', '/editForms', '/loadingScreen']) {
    for (const role of ['GESTOR', 'GESTOR_WORKSPACE']) assert.equal(env.canAccessPage(role, route), true, `${role}: ${route}`)
  }
  for (const route of ['/mainManagerScreen', '/mainWorkspaceSettingsScreen', '/MAINMANAGERSCREEN/']) {
    assert.equal(env.canAccessPage('GESTOR', route), false)
    assert.equal(env.canAccessPage('GESTOR_WORKSPACE', route), true)
  }
  for (const role of [null, undefined, 'COLABORADOR', 'ADMIN']) {
    assert.equal(env.canAccessPage(role, '/mainHomeScreen'), false)
    assert.equal(env.canAccessPage(role, '/mainManagerScreen'), false)
    assert.deepEqual(env.getNavigationItems(role), [])
  }
})

test('formulários de empresa, planilha, unidades e pagamentos em contexto de configuração exigem gestor do workspace', () => {
  const env = environment()
  for (const route of ['/includeCompanyInformation', '/attachExcelFile', '/setAddress', '/paymentMethod']) {
    assert.equal(env.canAccessPage('GESTOR', route, '?context=settings'), false)
    assert.equal(env.canAccessPage('GESTOR_WORKSPACE', route, '?context=settings'), true)
  }
  assert.equal(env.canAccessPage('GESTOR', '/mainManagerScreen', '?role=workspaceManager'), false)
})

test('menu de gestor mostra Conta, preserva áreas compartilhadas e oculta Gestores e Configurações', () => {
  const env = environment('GESTOR')
  const menu = env.render(env.load('src/components/appSidebar/index.tsx').default)
  assert.doesNotMatch(menu, /Gestores|Configurações|mainManagerScreen|mainWorkspaceSettingsScreen/)
  assert.match(menu, /href="\/mainAccountScreen"/)
  assert.match(menu, /data-track-item="conta"/)
  assert.match(menu, />Conta<\/span>/)
  for (const label of ['Home', 'Colaboradores', 'Conformidade', 'Unidades', 'Cargos', 'Formulários', 'Eventos']) {
    assert.ok(menu.includes(`>${label}</span>`))
  }
  assert.match(menu, /icons\/sidebar\/account.svg/)
})

test('menu de gestor do workspace mantém Gestores e Configurações', () => {
  const env = environment('GESTOR_WORKSPACE')
  const menu = env.render(env.load('src/components/appSidebar/index.tsx').default)
  assert.match(menu, /href="\/mainManagerScreen"/)
  assert.match(menu, /href="\/mainWorkspaceSettingsScreen"/)
  assert.match(menu, /data-track-item="configuracoes"/)
  assert.match(menu, />Configurações<\/span>/)
  assert.equal(env.getNavigationItems('GESTOR_WORKSPACE').length, 9)
})

test('abas de Workspace e Conta só são renderizadas para gestor do workspace', () => {
  for (const role of ['GESTOR', 'GESTOR_WORKSPACE']) {
    const env = environment(role)
    const markup = env.render(env.load('src/components/settingsTabs/index.tsx').default, '/mainAccountScreen', { active: 'account', from: '/mainHomeScreen' })
    if (role === 'GESTOR') assert.equal(markup, '')
    else {
      assert.match(markup, />Workspace<\/button>/)
      assert.match(markup, /aria-current="page"[^>]*>Conta<\/button>/)
    }
  }
})

test('conta usa apenas o perfil autenticado, ignorando qualquer tentativa de alterá-lo por query string', () => {
  for (const role of ['GESTOR', 'GESTOR_WORKSPACE']) {
    const env = environment(role)
    const account = env.load('src/pages/mainAccountScreen/index.tsx').default
    for (const query of ['', '?role=manager', '?role=workspaceManager']) {
      const markup = env.render(account, `/mainAccountScreen${query}`)
      if (role === 'GESTOR') {
        assert.match(markup, />Enviar email<\/button>/)
        assert.doesNotMatch(markup, />Substituir<\/button>|>Workspace<\/button>/)
        assert.match(markup, /<h1 class="sr-only"/)
      } else {
        assert.match(markup, />Substituir<\/button>/)
        assert.doesNotMatch(markup, />Enviar email<\/button>/)
        assert.match(markup, />Workspace<\/button>/)
      }
      assert.match(markup, />Sair da conta<\/button>/)
    }
  }
})

test('guarda de rotas impede montar telas exclusivas ao acessar a URL diretamente', () => {
  const env = environment('GESTOR')
  const PrivateRoute = env.load('src/components/privateRoute/index.tsx').default
  let result
  function Probe() { result = PrivateRoute({}); return result }
  for (const route of ['/mainManagerScreen', '/mainWorkspaceSettingsScreen', '/attachExcelFile?context=settings',
    '/includeCompanyInformation?context=settings', '/setAddress?context=settings', '/paymentMethod?context=settings']) {
    const markup = env.render(Probe, route)
    assert.equal(result.type, Navigate)
    assert.equal(result.props.to, '/mainHomeScreen')
    assert.doesNotMatch(markup, /Conteúdo autorizado/)
  }
  env.context.user.accountType = 'GESTOR_WORKSPACE'
  assert.match(env.render(Probe, '/mainManagerScreen'), /Conteúdo autorizado/)
  env.context.user.accountType = 'GESTOR'
  assert.match(env.render(Probe, '/mainHomeScreen'), /Conteúdo autorizado/)
})

test('carregamento do perfil, falha de sessão e sessão ausente nunca montam conteúdo privado; cadastro público continua disponível', () => {
  const env = environment('GESTOR_WORKSPACE')
  const PrivateRoute = env.load('src/components/privateRoute/index.tsx').default
  env.context.status = 'loading'
  assert.match(env.render(PrivateRoute, '/mainManagerScreen'), /role="status">Carregando/)
  env.context.status = 'error'
  env.context.error = 'Não foi possível verificar seu email.'
  assert.match(env.render(PrivateRoute, '/mainManagerScreen'), /role="alert">Não foi possível verificar/)
  env.context.status = 'ready'
  env.context.user = null
  let result
  function Probe() { result = PrivateRoute({}); return result }
  env.render(Probe, '/mainHomeScreen')
  assert.equal(result.type, Navigate)
  assert.equal(result.props.to, '/')
  assert.doesNotMatch(env.render(PrivateRoute, '/includeCompanyInformation', { required: false }), /Carregando|Não foi possível/)
})
