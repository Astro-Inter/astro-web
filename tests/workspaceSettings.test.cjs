const assert = require('node:assert/strict')
const { test, afterEach } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { act } = React
const { JSDOM } = require('jsdom')
const originalFetch = global.fetch
afterEach(() => { global.fetch = originalFetch })

function environment() {
  const cache = new Map(), navigations = []
  const auth = { currentUser: { getIdToken: async () => 'firebase-token' } }
  let refreshed = 0, reauthenticated = 0
  function load(file) {
    const filename = path.resolve(file)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.VITE_API_URL', "'https://api.example.test'")
      .replaceAll('import.meta.env.DEV', 'false').replaceAll('import.meta.env.BASE_URL', "'/'")
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'module', 'exports', code)(name => {
      if (name === './firebase') return { firebaseAuth: auth }
      if (name === '../services/identityConfirmation') return { confirmarIdentidadeDoUsuario: async () => { reauthenticated++ }, isCurrentAuthenticatedUser: () => true }
      if (name === '../toolbarSelect') return { __esModule: true, default: ({ id, value, options, onValueChange }) => React.createElement('select', { id, value, onChange: event => onValueChange(event.target.value) }, options.map(option => React.createElement('option', { key: option.value, value: option.value }, option.label))) }
      if (name.endsWith('/useAuthentication')) return { useAuthentication: () => ({ user: { uid: 'owner', accountType: 'GESTOR_WORKSPACE' }, retryAuthentication: () => refreshed++ }) }
      if (name === 'react-router-dom') return { useNavigate: () => (...args) => navigations.push(args), useLocation: () => ({ state: null }) }
      if (name === '../appModal') return { default: ({ children, onClose, title }) => React.createElement('dialog', { open: true, 'aria-label': typeof title === 'string' ? title : 'Confirmação' }, typeof children === 'function' ? children(onClose) : children), __esModule: true }
      if (name === '../../components') return Object.fromEntries(['CompanyInformationForm', 'AddressForm', 'AttachExcelFileForm', 'PurpleButton'].map(component => [component, load(`src/components/${component[0].toLowerCase()}${component.slice(1)}/index.tsx`).default]).concat(['AstroBrand', 'AstroIcon', 'HelpLink'].map(component => [component, () => null])))
      if (!name.startsWith('.')) return require(name)
      const target = path.resolve(path.dirname(filename), name)
      return load([target + '.ts', target + '.tsx', path.join(target, 'index.tsx')].find(fs.existsSync))
    }, module, module.exports)
    return module.exports
  }
  return { load, auth, navigations, refreshed: () => refreshed, reauthenticated: () => reauthenticated }
}

const unit = { unitId: 12, workspaceId: 3, name: 'Filial', status: 'Ativo', collaboratorCount: 10,
  postalCode: '01234567', state: 'SP', city: 'São Paulo', neighborhood: 'Centro', street: 'Rua Exemplo', number: null, addressLine2: null }
const address = { id: 12, persistedId: 12, name: 'Filial', cep: '01234-567', state: 'SP', city: 'São Paulo', neighborhood: 'Centro', street: 'Rua Exemplo', number: '10A', complement: '' }
const company = { id: 3, name: 'Empresa Exemplo', cnpj: '12345678000199' }
const result = { created: 5, updated: 2, unchanged: 10, unitsCreated: 1, rolesCreated: 2, ignored: [{ row: 4, field: 'cpf', message: 'Linha idêntica repetida' }] }
const response = (data, status = 200) => Response.json({ success: true, data, errors: null }, { status })

test('empresa, unidades e transferência usam envelope único, Bearer e IDs corretos', async () => {
  const env = environment(), calls = []
  const api = env.load('src/services/workspaceSettings.ts'), units = env.load('src/services/units.ts')
  global.fetch = async (url, init) => {
    calls.push({ url, ...init })
    if (url.endsWith('/manager-transfer')) return response({ workspaceId: 3, previousManagerId: 8, newManagerId: 42 })
    if (url.endsWith('/workspace')) return response(company)
    return response(init.method === 'GET' ? [unit] : { ...unit, number: '10A' }, init.method === 'POST' ? 201 : 200)
  }
  assert.deepEqual(await api.getWorkspace(), company)
  await api.updateWorkspace({ name: ' Empresa Exemplo ', cnpj: '12.345.678/0001-99' })
  const [legacy] = await units.listUnitAddresses()
  assert.equal(legacy.number, '')
  assert.equal(legacy.cep, '01234567')
  assert.equal(legacy.persistedId, 12)
  await units.saveUnitAddress(address)
  await units.saveUnitAddress({ ...address, persistedId: undefined })
  await api.transferWorkspaceManager('42')
  assert.deepEqual(calls.map(call => [call.method, new URL(call.url).pathname]), [
    ['GET', '/workspace'], ['PUT', '/workspace'], ['GET', '/units'], ['PUT', '/units/12'], ['POST', '/units'], ['POST', '/workspace/manager-transfer'],
  ])
  calls.forEach(call => assert.equal(call.headers.Authorization, 'Bearer firebase-token'))
  assert.deepEqual(JSON.parse(calls[1].body), { name: company.name, cnpj: company.cnpj })
  assert.deepEqual(JSON.parse(calls[3].body), { name: 'Filial', cep: '01234567', state: 'SP', city: 'São Paulo', neighborhood: 'Centro', street: 'Rua Exemplo', number: '10A', addressLine2: null })
  assert.deepEqual(JSON.parse(calls[5].body), { newManagerId: 42 })
})

test('importação envia arquivo e parte JSON sem forçar Content-Type do multipart', async () => {
  const api = environment().load('src/services/workspaceSettings.ts')
  const file = new File(['excel'], 'equipe.xlsx')
  global.fetch = async (url, init) => {
    assert.equal(new URL(url).pathname, '/workspace/import')
    assert.equal(init.headers['Content-Type'], undefined)
    assert.equal(init.headers.Authorization, 'Bearer firebase-token')
    assert.equal(init.body.get('file').name, 'equipe.xlsx')
    const data = init.body.get('data')
    assert.equal(data.type, 'application/json')
    assert.equal(JSON.parse(await data.text()).units[0].cep, '01234567')
    return response(result)
  }
  assert.deepEqual(await api.importWorkspace(file, [address]), result)
  global.fetch = async (_url, init) => { assert.equal(init.body.has('data'), false); return response(result) }
  await api.importWorkspace(file, [])
})

test('erros de planilha são extraídos de data e escritas nunca têm retry automático', async () => {
  const api = environment().load('src/services/workspaceSettings.ts')
  const rows = [{ row: 4, field: 'unidade', message: 'Informe o endereço da Filial' }]
  let calls = 0
  global.fetch = async () => { calls++; return Response.json({ success: false, message: 'A planilha contém linhas inválidas', data: rows, errors: ['Corrija e envie novamente'] }, { status: 422 }) }
  await assert.rejects(api.importWorkspace(new File(['excel'], 'equipe.xlsx'), []), error => {
    assert.equal(error.status, 422); assert.deepEqual(error.rows, rows); return /linhas inválidas/.test(error.message)
  })
  assert.equal(calls, 1)
  const repeatedMessage = 'O workspace deve ter um único gestor responsável para realizar a transferência'
  global.fetch = async () => Response.json({ success: false, message: repeatedMessage, errors: [repeatedMessage] }, { status: 409 })
  await assert.rejects(api.transferWorkspaceManager('42'), error => error.message === repeatedMessage && error.status === 409)
  for (const status of [400, 401, 403, 404, 409, 413]) {
    global.fetch = async () => Response.json({ message: `Erro ${status}` }, { status })
    await assert.rejects(api.updateWorkspace(company), error => error.status === status && error.message === `Erro ${status}`)
  }
})

test('valida campos e arquivo antes de enviar, preservando zeros iniciais e número alfanumérico', async () => {
  const env = environment(), api = env.load('src/services/workspaceSettings.ts'), units = env.load('src/services/units.ts')
  let calls = 0
  global.fetch = async () => { calls++; return response(null) }
  for (const invalid of [{ ...company, name: 'A' }, { ...company, name: 'x'.repeat(256) }, { ...company, cnpj: '123' }]) await assert.rejects(api.updateWorkspace(invalid))
  for (const invalid of [{ ...address, number: '' }, { ...address, number: 'x'.repeat(31) }, { ...address, state: 'XX' }, { ...address, cep: '1234567' }, { ...address, city: 'A' }]) await assert.rejects(units.saveUnitAddress(invalid))
  await assert.rejects(api.importWorkspace(new File(['x'], 'equipe.csv'), []))
  await assert.rejects(api.importWorkspace(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'equipe.xls'), []))
  await assert.rejects(api.importWorkspace(new File(['x'], 'equipe.xls'), Array(101).fill(address)))
  await assert.rejects(api.transferWorkspaceManager('ana@example.com'))
  env.auth.currentUser = null
  await assert.rejects(api.getWorkspace(), /Entre na sua conta/)
  assert.equal(calls, 0)
})

test('leitura compartilhada da importação aceita planilha sem gestor e mantém regra do cadastro inicial', () => {
  const { utils, write } = require('xlsx'), { extractSpreadsheetUnitNames } = environment().load('src/utils/excelUnits.ts')
  const book = utils.book_new()
  utils.book_append_sheet(book, utils.aoa_to_sheet([['Nome', 'CPF', 'Email', 'Unidade', 'Cargo', 'Modalidade'], ['Ana', '01234567890', 'ana@example.com', 'Filial', 'Analista', 'Híbrido']]), 'Equipe')
  const buffer = write(book, { type: 'array', bookType: 'xlsx' })
  assert.deepEqual(extractSpreadsheetUnitNames(buffer, '', true), ['Filial'])
  assert.throws(() => extractSpreadsheetUnitNames(buffer, 'gestor@example.com'), /gestor/i)
})

async function withDOM(run) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  const names = ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT', 'requestAnimationFrame', 'getComputedStyle']
  const previous = Object.fromEntries(names.map(name => [name, global[name]]))
  Object.assign(global, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true, requestAnimationFrame: fn => { fn(); return 0 }, getComputedStyle: dom.window.getComputedStyle })
  dom.window.matchMedia = () => ({ matches: true })
  const root = require('react-dom/client').createRoot(document.getElementById('root'))
  try { await run(root, environment()) } finally { await act(async () => root.unmount()); Object.assign(global, previous); dom.window.close() }
}

test('empresa carrega dados reais, preserva formulário após erro e navega só após salvar', async () => withDOM(async (root, env) => {
  let writes = 0
  global.fetch = async (_url, init) => {
    if (init.method === 'GET') return response(company)
    writes++
    return writes === 1 ? Response.json({ message: 'CNPJ em conflito' }, { status: 409 }) : response(company)
  }
  const Page = env.load('src/pages/workspaceCompanySettings/index.tsx').default
  await act(async () => root.render(React.createElement(Page)))
  assert.equal(document.querySelector('#company-name').value, company.name)
  await act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  const save = () => [...document.querySelectorAll('dialog button')].find(button => button.textContent === 'Salvar')
  await act(async () => save().click())
  assert.match(document.querySelector('dialog').textContent, /CNPJ em conflito/)
  assert.equal(document.querySelector('#company-cnpj').value, company.cnpj)
  assert.equal(env.navigations.length, 0)
  const feedback = env.load('src/utils/actionFeedback.ts')
  assert.equal(feedback.getActionFeedback().notices.some(notice => notice.tone === 'success'), false)
  await act(async () => save().click())
  assert.equal(writes, 2)
  assert.equal(env.navigations[0][0], '/mainWorkspaceSettingsScreen')
  assert.ok(feedback.getActionFeedback().notices.some(notice => notice.tone === 'success' && /Informações da empresa atualizadas com sucesso/.test(notice.message)))
}))

test('transferência filtra gestores ativos, envia ID, confirma perda de acesso e revalida sessão', async () => withDOM(async (root, env) => {
  const calls = []
  global.fetch = async (url, init) => {
    calls.push([new URL(url).pathname, init.body])
    return url.endsWith('/managers') ? response([
      { id_usuario: 42, nome: 'Ana', email: 'ana@example.com', unidade_id: 12, unidade: 'Filial', status: 'ATIVO' },
      { id_usuario: 99, nome: 'Inativo', email: 'inativo@example.com', unidade_id: 12, unidade: 'Filial', status: 'DESATIVADO' },
    ]) : response({ workspaceId: 3, previousManagerId: 8, newManagerId: 42 })
  }
  const Modal = env.load('src/components/workspaceManagerTransferModal/index.tsx').default
  await act(async () => root.render(React.createElement(Modal, { onClose() {} })))
  assert.equal(document.querySelectorAll('option').length, 2)
  await act(async () => { const select = document.querySelector('select'); select.value = '42'; select.dispatchEvent(new window.Event('change', { bubbles: true })) })
  await act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  assert.match(document.body.textContent, /perderá as permissões exclusivas/)
  await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Alterar gestor').click())
  assert.equal(calls.length, 1)
  await act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  assert.equal(env.reauthenticated(), 1)
  assert.deepEqual(JSON.parse(calls[1][1]), { newManagerId: 42 })
  assert.equal(env.refreshed(), 1)
  assert.equal(env.navigations[0][0], '/mainHomeScreen')
}))

test('unidades salvas antes de falha parcial conservam ID e não são recriadas no reenvio', async () => withDOM(async (root, env) => {
  let editor
  function Harness() { editor = env.load('src/hooks/useWorkspaceUnitEditor.ts').useWorkspaceUnitEditor([address]); return null }
  await act(async () => root.render(React.createElement(Harness)))
  for (const name of ['Nova A', 'Nova B']) {
    await act(async () => editor.addresses.addUnit())
    for (const [field, value] of Object.entries({ ...address, name })) {
      if (field === 'id' || field === 'persistedId') continue
      await act(async () => editor.addresses.changeField(field, value))
    }
  }
  const calls = []
  global.fetch = async (_url, init) => {
    const payload = JSON.parse(init.body)
    calls.push([init.method, payload.name])
    if (calls.length === 2) return Response.json({ message: 'Nome em conflito' }, { status: 409 })
    return response({ ...unit, unitId: calls.length === 1 ? 90 : 91, name: payload.name, number: '10A' }, 201)
  }
  let error
  await act(async () => { error = await editor.save() })
  assert.match(error, /já confirmadas foram mantidas/)
  assert.equal(editor.addresses.address.units.find(unit => unit.name === 'Nova A').persistedId, 90)
  await act(async () => { error = await editor.save() })
  assert.equal(error, null)
  assert.deepEqual(calls, [['POST', 'Nova A'], ['POST', 'Nova B'], ['POST', 'Nova B']])
}))

test('importação identifica só unidades novas, preserva arquivo e endereços após 422 e mostra resumo no reenvio', async () => withDOM(async (root, env) => {
  const { utils, write } = require('xlsx'), book = utils.book_new()
  utils.book_append_sheet(book, utils.aoa_to_sheet([
    ['Nome', 'CPF', 'Email', 'Unidade', 'Cargo', 'Modalidade'],
    ['Ana', '01234567890', 'ana@example.com', ' filial ', 'Analista', 'Remoto'],
    ['Bia', '12345678901', 'bia@example.com', 'Nova', 'Analista', 'Híbrido'],
  ]), 'Equipe')
  const file = new File([write(book, { type: 'array', bookType: 'xlsx' })], 'equipe.xlsx')
  let importer, writes = 0, reads = 0
  function Harness() { importer = env.load('src/hooks/useWorkspaceImport.ts').useWorkspaceImport(); return React.createElement(env.load('src/components/workspaceImportSummary/index.tsx').default, { result: importer.result, rows: importer.rows }) }
  global.fetch = async (url) => {
    if (url.endsWith('/units')) { reads++; return response([unit]) }
    writes++
    return writes === 1 ? Response.json({ message: 'Corrija a planilha', data: [{ row: 3, field: 'cpf', message: 'CPF inválido' }] }, { status: 422 }) : response(result)
  }
  await act(async () => root.render(React.createElement(Harness)))
  await act(async () => assert.equal(await importer.prepare(file), true))
  assert.deepEqual(importer.units.map(unit => unit.name), ['Nova'])
  const newAddress = { ...address, name: 'Nova', persistedId: undefined }
  await act(async () => assert.match(await importer.save([newAddress]), /Corrija/))
  assert.equal(importer.file, file)
  assert.match(document.body.textContent, /Linha 3, campo cpf: CPF inválido/)
  await act(async () => assert.equal(await importer.save([newAddress]), null))
  assert.match(document.body.textContent, /5 colaboradores criados; 2 atualizados; 10 sem alterações/)
  assert.match(document.body.textContent, /Linha 4, campo cpf: Linha idêntica repetida/)
  assert.equal(reads, 1)
  assert.equal(writes, 2)
}))


test('leitura do workspace usa o mesmo carregamento do login e o remove ao concluir, falhar ou desmontar', async () => withDOM(async (root, env) => {
  const Feedback = env.load('src/components/workspaceQueryFeedback/index.tsx').default
  const Host = env.load('src/components/actionFeedbackHost/index.tsx').default
  const state = env.load('src/utils/actionFeedback.ts')
  let retries = 0
  const render = props => root.render(React.createElement(React.Fragment, null, React.createElement(Host), React.createElement(Feedback, { onRetry: () => { retries++ }, error: '', ...props })))
  await act(async () => render({ loading: true }))
  assert.equal(state.getActionFeedback().pending, 1)
  assert.ok(document.querySelector('dialog.login-loading-overlay .login-loading-indicator'))
  assert.doesNotMatch(document.body.textContent, /Carregando informações do workspace/)
  await act(async () => render({ loading: false, error: 'Falha ao consultar workspace.' }))
  assert.equal(document.querySelector('.login-loading-overlay'), null)
  assert.equal(state.getActionFeedback().pending, 0)
  assert.match(document.querySelector('[role=alert]').textContent, /Falha ao consultar/)
  await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Tentar novamente').click())
  assert.equal(retries, 1)
  await act(async () => render({ loading: true }))
  assert.ok(document.querySelector('.login-loading-overlay'))
  await act(async () => render({ loading: false }))
  assert.equal(document.querySelector('.login-loading-overlay'), null)
  await act(async () => render({ loading: true }))
  await act(async () => root.render(null))
  assert.equal(state.getActionFeedback().pending, 0)
  assert.equal(document.querySelector('.login-loading-overlay'), null)
}))


test('carregamento permanece contínuo entre senha confirmada, navegação e consulta do workspace', async () => withDOM(async (root, env) => {
  const Host = env.load('src/components/actionFeedbackHost/index.tsx').default
  const Form = env.load('src/components/passwordConfirmationForm/index.tsx').default
  const Feedback = env.load('src/components/workspaceQueryFeedback/index.tsx').default
  const state = env.load('src/utils/actionFeedback.ts')
  const confirmation = { password: '', visible: false, error: '', blocked: true, updatePassword() {}, toggleVisibility() {} }
  const render = phase => root.render(React.createElement(React.Fragment, null, React.createElement(Host), phase < 2
    ? React.createElement(Form, { confirmation: { ...confirmation, status: phase === 0 ? 'loading' : 'success' }, onCancel() {}, onContinue: async () => {} })
    : React.createElement(Feedback, { loading: phase === 2, error: '', onRetry() {} })))
  await act(async () => render(0))
  const overlay = document.querySelector('.login-loading-overlay')
  assert.ok(overlay)
  await act(async () => render(1))
  assert.equal(state.getActionFeedback().pending, 1)
  assert.equal(document.querySelector('.login-loading-overlay'), overlay)
  await act(async () => render(2))
  assert.equal(state.getActionFeedback().pending, 1)
  assert.equal(document.querySelector('.login-loading-overlay'), overlay)
  await act(async () => render(3))
  assert.equal(state.getActionFeedback().pending, 0)
  assert.equal(document.querySelector('.login-loading-overlay'), null)
}))

test('dialog não reabre enquanto a navegação mantém a tela anterior montada e pode abrir em novo ciclo', async () => withDOM(async (root, env) => {
  window.matchMedia = () => ({ matches: false })
  window.scrollTo = () => {}
  document.documentElement.style.setProperty('--astro-popup-duration', '20ms')
  let opened = 0, closed = 0, dismissals = 0
  window.HTMLDialogElement.prototype.showModal = function () { opened++; this.setAttribute('open', '') }
  window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
    const dialog = this
    window.setTimeout(() => dialog.dispatchEvent(new window.Event('close')), 0)
  }
  const Modal = env.load('src/components/appModal/index.tsx').default
  const render = open => root.render(React.createElement(Modal, { title: 'Confirmar senha', open, onDismissRequest: () => { dismissals++ }, onClose: () => { closed++ } }, dismiss => React.createElement('button', { onClick: dismiss }, 'Fechar')))
  await act(async () => render(true))
  await act(async () => document.querySelector('button').click())
  await act(async () => new Promise(resolve => window.setTimeout(resolve, 40)))
  assert.equal(closed, 1)
  await act(async () => render(true))
  assert.equal(document.querySelector('dialog').open, false)
  assert.equal(opened, 1)
  assert.equal(dismissals, 1)
  await act(async () => render(false))
  await act(async () => render(true))
  assert.equal(document.querySelector('dialog').open, true)
  assert.equal(opened, 2)
}))
