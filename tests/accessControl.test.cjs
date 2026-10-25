const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { MemoryRouter, Navigate } = require('react-router-dom')

function environment(accountType, development = false, nrMode = 'demo') {
  const context = { user: accountType ? { uid: 'manager', accountType } : null, status: 'ready', error: '' }
  const cache = new Map()
  function load(filename) {
    filename = path.resolve(filename)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }
    cache.set(filename, module)
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'")
      .replaceAll('import.meta.env.VITE_API_URL', "'https://api.example.test'").replaceAll('import.meta.env.DEV', String(development))
      .replaceAll('import.meta.env.VITE_NR_DATA_MODE', JSON.stringify(nrMode))
    const code = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText
    new Function('require', 'module', 'exports', code)(specifier => {
      if (specifier.endsWith('/useAuthentication')) return { useAuthentication: () => context }
      if (specifier.endsWith('/useAccountProfile')) return { useAccountProfile: () => ({ data: null, loading: true, error: '', retry() {} }) }
      if (specifier.endsWith('/useAccountDetails')) return { useAccountDetails: () => ({ data: null, loading: true, error: '', submission: { pending: false } }) }
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
    const { AccessibilityContext } = load('src/contexts/accessibility.ts')
    const { AccessibilityRuntimeContext } = load('src/contexts/accessibilityRuntime.ts')
    const { DEFAULT_ACCESSIBILITY } = load('src/utils/accessibility.ts')
    return renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [route] },
      React.createElement(AccessibilityContext.Provider, { value: { preferences: DEFAULT_ACCESSIBILITY, update() {}, reset() {} } },
        React.createElement(AccessibilityRuntimeContext.Provider, { value: { face: { status: 'idle', stop() {}, start() {} }, libras: { loading: false, error: '' } } }, React.createElement(component, props)))))
  }
  return { ...load('src/utils/accessControl.ts'), context, load, render }
}

test('perfis compartilham as áreas do Figma; gestão de gestores e configurações são exclusivas do workspace', () => {
  const env = environment()
  for (const route of ['/mainHomeScreen', '/mainDashboardsScreen', '/mainEmployeerScreen', '/mainConformityScreen',
    '/mainUnitScreen', '/mainPositionScreen', '/mainFormScreen', '/mainEventScreen', '/mainAccountScreen', '/mainWorkspaceSettingsScreen', '/createForms', '/editForms', '/loadingScreen']) {
    for (const role of ['GESTOR', 'GESTOR_WORKSPACE']) assert.equal(env.canAccessPage(role, route), true, `${role}: ${route}`)
  }
  for (const route of ['/mainManagerScreen', '/MAINMANAGERSCREEN/']) {
    assert.equal(env.canAccessPage('GESTOR', route), false)
    assert.equal(env.canAccessPage('GESTOR_WORKSPACE', route), true)
  }
  for (const role of [null, undefined, 'COLABORADOR', 'ADMIN']) {
    assert.equal(env.canAccessPage(role, '/mainHomeScreen'), false)
    assert.equal(env.canAccessPage(role, '/mainManagerScreen'), false)
    if (role !== 'ADMIN') assert.deepEqual(env.getNavigationItems(role), [])
  }
})

test('somente ADMIN acessa a revisão de NRs, inclusive diretamente e sem promoção por query string', () => {
  const env = environment()
  for (const route of ['/admin/nrs/pending', '/admin/nrs/pending/20', '/ADMIN/NRS/PENDING/20/']) {
    assert.equal(env.canAccessPage('ADMIN', route), true)
    for (const role of ['GESTOR', 'GESTOR_WORKSPACE', 'COLABORADOR', null, undefined]) {
      assert.equal(env.canAccessPage(role, route, '?role=ADMIN&accountType=ADMIN'), false)
    }
  }
  assert.equal(env.canAccessPage('ADMIN', '/admin/nrs/pending/20/excluir'), false)
  assert.equal(env.canAccessPage('ADMIN', '/loadingScreen'), true)
  assert.equal(env.getDefaultAuthenticatedPath('ADMIN'), '/admin/nrs/pending')
  const admin = environment('ADMIN')
  assert.deepEqual(admin.getNavigationItems('ADMIN').map(item => item.path), ['/admin/nrs/pending'])
  const menu = admin.render(admin.load('src/components/appSidebar/index.tsx').default, '/admin/nrs/pending')
  assert.match(menu, /Revisão de NRs/)
  for (const role of ['GESTOR', 'GESTOR_WORKSPACE']) {
    const manager = environment(role)
    assert.doesNotMatch(manager.render(manager.load('src/components/appSidebar/index.tsx').default), /Revisão de NRs/)
  }
})

test('PrivateRoute não monta a tela de revisão para gestores, sessão ausente ou em verificação', () => {
  for (const role of ['ADMIN', 'GESTOR', 'GESTOR_WORKSPACE', null]) {
    const env = environment(role), Guard = env.load('src/components/privateRoute/index.tsx').default
    let result
    function Probe() { result = Guard({}); return result }
    const markup = env.render(Probe, '/admin/nrs/pending/20?role=ADMIN')
    if (role === 'ADMIN') assert.match(markup, /Conteúdo autorizado/)
    else {
      assert.doesNotMatch(markup, /Conteúdo autorizado/)
      assert.equal(result.type, Navigate)
      assert.equal(result.props.to, role ? '/mainHomeScreen' : '/')
    }
    env.context.status = 'loading'
    assert.doesNotMatch(env.render(Probe, '/admin/nrs/pending'), /Conteúdo autorizado/)
  }
  const env = environment('ADMIN'), Guard = env.load('src/components/privateRoute/index.tsx').default
  let result
  function AdminProbe() { result = Guard({}); return result }
  env.render(AdminProbe, '/mainHomeScreen')
  assert.equal(result.props.to, '/admin/nrs/pending')
})

test('prévia de NRs libera gestores apenas em desenvolvimento e mantém autenticação obrigatória', () => {
  for (const development of [false, true]) {
    for (const role of ['ADMIN', 'GESTOR', 'GESTOR_WORKSPACE', null]) {
      const env = environment(role, development)
      const PreviewRoute = env.load('src/components/nrReviewRoute/index.tsx').default
      for (const path of ['/admin/nrs/pending', '/admin/nrs/pending/20']) {
        const markup = env.render(PreviewRoute, path)
        assert.equal(markup.includes('Conteúdo autorizado'), role === 'ADMIN' || (development && role !== null), `${development}: ${role}: ${path}`)
      }
      env.context.status = 'loading'
      assert.doesNotMatch(env.render(PreviewRoute, '/admin/nrs/pending'), /Conteúdo autorizado/)
    }
  }
  const env = environment()
  assert.equal(env.canAccessPage('GESTOR', '/mainManagerScreen', '', true), false)
  assert.equal(env.canAccessPage('COLABORADOR', '/admin/nrs/pending', '', true), false)
  assert.equal(env.canAccessPage('GESTOR', '/admin/nrs/pending/20/excluir', '', true), false)
})

test('modo API exige ADMIN nas telas de NRs também durante o desenvolvimento', () => {
  for (const role of ['ADMIN', 'GESTOR', 'GESTOR_WORKSPACE', null]) {
    const env = environment(role, true, 'api')
    const Guard = env.load('src/components/nrReviewRoute/index.tsx').default
    for (const route of ['/admin/nrs/pending', '/admin/nrs/catalog']) {
      assert.equal(env.render(Guard, route).includes('Conteúdo autorizado'), role === 'ADMIN')
    }
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

test('menu de gestor mostra Configurações e preserva restrições de gestão', () => {
  const env = environment('GESTOR')
  const menu = env.render(env.load('src/components/appSidebar/index.tsx').default)
  assert.doesNotMatch(menu, /Gestores|mainManagerScreen/)
  assert.match(menu, /href="\/mainWorkspaceSettingsScreen"/)
  assert.match(menu, />Configurações<\/span>/)
  for (const label of ['Home', 'Colaboradores', 'Conformidade', 'Unidades', 'Cargos', 'Formulários', 'Eventos']) {
    assert.ok(menu.includes(`>${label}</span>`))
  }
  assert.match(menu, /icons\/sidebar\/settings.svg/)
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

test('ambos os gestores acessam as abas Workspace e Conta nas configurações', () => {
  for (const role of ['GESTOR', 'GESTOR_WORKSPACE']) {
    const env = environment(role)
    const markup = env.render(env.load('src/components/settingsTabs/index.tsx').default, '/mainAccountScreen', { active: 'account', from: '/mainHomeScreen' })
    {
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
        assert.doesNotMatch(markup, />Substituir<\/button>/)
        assert.match(markup, />Workspace<\/button>/)
      } else {
        assert.match(markup, />Substituir<\/button>/)
        assert.doesNotMatch(markup, />Enviar email<\/button>/)
        assert.match(markup, />Workspace<\/button>/)
      }
      assert.match(markup, />Sair da conta<\/button>/)
      assert.doesNotMatch(markup, /id="account-accessibility-title"/)
    }
  }
})

test('guarda de rotas impede montar telas exclusivas ao acessar a URL diretamente', () => {
  const env = environment('GESTOR')
  const PrivateRoute = env.load('src/components/privateRoute/index.tsx').default
  let result
  function Probe() { result = PrivateRoute({}); return result }
  for (const route of ['/mainManagerScreen', '/attachExcelFile?context=settings',
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

test('conta inativada vai para sua tela de bloqueio nas rotas privadas e de login', () => {
  const env = environment('GESTOR')
  env.context.status = 'inactive'
  env.context.user = null
  for (const [component, route] of [['privateRoute', '/mainHomeScreen'], ['guestRoute', '/']]) {
    const Guard = env.load(`src/components/${component}/index.tsx`).default
    let result
    function Probe() { result = Guard({}); return result }
    const markup = env.render(Probe, route)
    assert.equal(result.type, Navigate)
    assert.equal(result.props.to, '/inactiveScreenLayout')
    assert.doesNotMatch(markup, /Conteúdo autorizado/)
  }
})

test('primeiro destino do login autenticado é o carregamento do planeta antes da Home', () => {
  const env = environment('GESTOR')
  const GuestRoute = env.load('src/components/guestRoute/index.tsx').default
  let result
  function Probe() { result = GuestRoute({}); return result }
  env.render(Probe, '/')
  assert.equal(result.props.to, '/loadingScreen')
  assert.equal(result.props.state.afterLogin, true)
  const markup = env.render(env.load('src/pages/loadingScreen/index.tsx').default, '/loadingScreen')
  assert.match(markup, /loading-planet-svg/)
  assert.doesNotMatch(markup, /login-loading-spinner/)
})

test('guarda do frame do planeta nunca monta o spinner e login interativo mantém seu formulário', () => {
  const env = environment(null)
  env.context.status = 'loading'
  for (const [component, route, planet] of [['guestRoute', '/', undefined], ['privateRoute', '/mainHomeScreen', false]]) {
    const Guard = env.load(`src/components/${component}/index.tsx`).default
    let result
    function Probe() { result = Guard({}); return result }
    env.render(Probe, route)
    assert.equal(result.props.planet, planet)
  }
  env.context.status = 'authenticating'
  const GuestRoute = env.load('src/components/guestRoute/index.tsx').default
  assert.match(env.render(GuestRoute, '/'), /Conteúdo autorizado/)
  const PrivateRoute = env.load('src/components/privateRoute/index.tsx').default
  assert.doesNotMatch(env.render(PrivateRoute, '/mainHomeScreen'), /Conteúdo autorizado/)
  assert.match(env.render(PrivateRoute, '/loadingScreen'), /Conteúdo autorizado/)
  env.context.status = 'ready'
  env.context.user = { uid: 'manager', accountType: 'GESTOR' }
  assert.match(env.render(PrivateRoute, '/loadingScreen'), /Conteúdo autorizado/)
})


test('Workspace do gestor comum mostra só acessibilidade; responsável vê gestão antes dela', () => {
  for (const role of ['GESTOR', 'GESTOR_WORKSPACE']) {
    const env = environment(role)
    const page = env.load('src/pages/mainWorkspaceSettingsScreen/index.tsx').default
    const markup = env.render(page, '/mainWorkspaceSettingsScreen')
    assert.match(markup, /id="workspace-accessibility-title"/)
    for (const control of ['Tamanho do texto', 'Alto contraste', 'Tradutor VLibras', 'Navegação facial']) assert.ok(markup.includes(control))
    assert.doesNotMatch(markup, />Tema<|>Claro</)
    if (role === 'GESTOR') assert.doesNotMatch(markup, /Editar informações|Alterar informações|Alterar unidades|Alterar pagamentos|Adicionar planilha|Substituir/)
    else {
      assert.ok(markup.indexOf('Editar informações') < markup.indexOf('id="workspace-accessibility-title"'))
      assert.match(markup, /Substituir/)
    }
  }
})
