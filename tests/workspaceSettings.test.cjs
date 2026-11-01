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

function environment(overrides = {}) {
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
      if (Object.hasOwn(overrides, name)) return overrides[name]
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
const company = { id: 3, name: 'Empresa Exemplo', cnpj: '12345678000195' }
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
  await api.updateWorkspace({ name: ' Empresa Exemplo ', cnpj: '12.345.678/0001-95' })
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
  for (const invalid of [{ ...company, name: 'A' }, { ...company, name: 'x'.repeat(256) }, { ...company, cnpj: '123' }, { ...company, cnpj: '12345678000199' }, { ...company, cnpj: '00000000000000' }]) await assert.rejects(api.updateWorkspace(invalid))
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
  utils.book_append_sheet(book, utils.aoa_to_sheet([['Nome', 'CPF', 'Email', 'Unidade', 'Cargo', 'Modalidade'], ['Ana', '52998224725', 'ana@example.com', 'Filial', 'Analista', 'Híbrido']]), 'Equipe')
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

for (const settingsMode of [false, true]) test(`CNPJ bloqueia avanço inválido e aceita correção em ${settingsMode ? 'atualização' : 'cadastro'}`, async () => withDOM(async (root, env) => {
  const Form = env.load('src/components/companyInformationForm/index.tsx').default
  const advances = []
  await act(async () => root.render(React.createElement(Form, { settingsMode, initialCompany: { name: 'Empresa', cnpj: '23.542.345/3252-34' }, onContinue: value => advances.push(value) })))
  await act(async () => document.querySelector('button[type="submit"]').click())
  const input = document.getElementById('company-cnpj')
  assert.equal(advances.length, 0)
  assert.equal(document.activeElement, input)
  assert.equal(input.getAttribute('aria-invalid'), 'true')
  assert.equal(input.getAttribute('aria-describedby'), 'company-cnpj-error')
  assert.match(document.querySelector('[role="alert"]').textContent, /CNPJ válido/)
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, '11.222.333/0001-81')
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  await act(async () => document.querySelector('button[type="submit"]').click())
  assert.equal(document.querySelector('[role="alert"]'), null)
  assert.deepEqual(advances, [{ name: 'Empresa', cnpj: '11.222.333/0001-81' }])
}))

test('endereço bloqueia UF inválida no campo antes de finalizar e libera após corrigir', async () => withDOM(async (root, env) => {
  global.fetch = async () => Response.json({ uf: 'SP', localidade: 'São Paulo', bairro: 'Centro', logradouro: 'Rua Exemplo' })
  const Form = env.load('src/components/addressForm/index.tsx').default
  const { useWorkspaceAddresses } = env.load('src/hooks/useWorkspaceAddresses.ts')
  const completions = []
  function Harness() {
    const addresses = useWorkspaceAddresses([{ ...address, state: 'PG' }])
    return React.createElement(Form, { addresses, onComplete: units => completions.push(units) })
  }
  await act(async () => root.render(React.createElement(Harness)))
  await act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  assert.equal(completions.length, 0)
  const input = document.getElementById('unit-state')
  assert.equal(input.getAttribute('aria-invalid'), 'true')
  assert.match(document.getElementById('unit-state-error').textContent, /UF brasileira válida/)
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'SP')
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  await act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  assert.equal(document.getElementById('unit-state-error'), null)
  assert.equal(completions.length, 1)
  assert.equal(completions[0][0].state, 'SP')
}))

for (const settingsMode of [false, true]) test(`CEP de todas as unidades validado antes de ${settingsMode ? 'salvar atualização' : 'finalizar cadastro'}`, async () => withDOM(async (root, env) => {
  const Form = env.load('src/components/addressForm/index.tsx').default
  const { useWorkspaceAddresses } = env.load('src/hooks/useWorkspaceAddresses.ts')
  const completions = [], calls = []
  let addresses
  global.fetch = async url => {
    calls.push(url)
    return Response.json(url.includes('/54532523/') ? { erro: true } : { uf: 'SP', localidade: 'São Paulo', bairro: 'Centro', logradouro: 'Rua Exemplo' })
  }
  function Harness() {
    const currentAddresses = useWorkspaceAddresses([
      { ...address, cep: '01310-100' },
      { ...address, id: 13, name: 'Outra unidade', cep: '54532-523' },
    ])
    React.useEffect(() => { addresses = currentAddresses }, [currentAddresses])
    return React.createElement(Form, { settingsMode, addresses: currentAddresses, onComplete: units => completions.push(units) })
  }
  await act(async () => root.render(React.createElement(Harness)))
  const submit = () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
  await act(async () => submit())
  assert.equal(completions.length, 0)
  assert.equal(addresses.activeUnit.id, 13)
  assert.equal(document.getElementById('unit-cep').getAttribute('aria-invalid'), 'true')
  assert.match(document.getElementById('unit-cep-error').textContent, /CEP não encontrado/)
  assert.equal(calls.length, 2)
  await act(async () => {
    const input = document.getElementById('unit-cep')
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, '01310-100')
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 400)) })
  await act(async () => submit())
  assert.equal(document.getElementById('unit-cep-error'), null)
  assert.equal(completions.length, 1)
  assert.equal(calls.length, 4, 'CEPs iguais são consultados só uma vez na finalização')
}))

test('falha na consulta de CEP bloqueia avanço, encerra loading e permite tentar novamente', async () => withDOM(async (root, env) => {
  let validation, release
  function Harness() { validation = env.load('src/hooks/useRegistrationPostalValidation.ts').useRegistrationPostalValidation(); return null }
  await act(async () => root.render(React.createElement(Harness)))
  global.fetch = () => new Promise(resolve => { release = () => resolve(new Response('', { status: 503 })) })
  let pending
  await act(async () => { pending = validation.validate([address]) })
  assert.equal(validation.validating, true)
  assert.equal(await validation.validate([address]), null, 'não duplica consultas em andamento')
  await act(async () => release())
  const errors = await pending
  assert.match(errors[address.id], /Não foi possível validar o CEP/)
  assert.equal(validation.validating, false)
  global.fetch = async () => Response.json({ uf: 'SP', localidade: 'São Paulo' })
  await act(async () => assert.deepEqual(await validation.validate([address]), {}))
}))

test('falha do cadastro apresenta linha, campo e motivo com orientação para reenviar o Excel', async () => withDOM(async root => {
  const paths = []
  const env = environment({
    'react-router-dom': { useNavigate: () => path => paths.push(path), Navigate: () => null },
    '../../hooks/useWorkspaceRegistration': { useWorkspaceRegistration: () => ({
      draft: { email: 'gestor@empresa.com', password: 'Senha123', company: { name: 'Empresa' }, file: {}, units: [{}] },
      verifiedEmail: 'gestor@empresa.com', status: 'error', error: 'A planilha contém linhas inválidas', failureStatus: 422,
      importErrors: [{ row: 2, field: 'cpf', message: 'CPF já cadastrado' }, { row: 4, field: 'email', message: 'E-mail repetido na planilha' }],
      submit: () => {}, result: null,
    }) },
  })
  const Page = env.load('src/pages/registerWorkspaceLoading/index.tsx').default
  await act(async () => root.render(React.createElement(Page)))
  const rows = [...document.querySelectorAll('ul[role=alert] li')].map(item => item.textContent)
  assert.match(rows[0], /Linha 2 · CPF:.*CPF já cadastrado/)
  assert.match(rows[1], /Linha 4 · E-mail:.*E-mail repetido na planilha/)
  assert.match(document.body.textContent, /Corrija esses campos no Excel.*anexar o arquivo corrigido/)
  await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Planilha').click())
  assert.deepEqual(paths, ['/attachExcelFile'])
}))

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
  assert.equal(document.querySelector('#company-cnpj').value, '12.345.678/0001-95')
  assert.equal(env.navigations.length, 0)
  const feedback = env.load('src/utils/actionFeedback.ts')
  assert.equal(feedback.getActionFeedback().notices.some(notice => notice.tone === 'success'), false)
  await act(async () => save().click())
  assert.equal(writes, 2)
  assert.equal(env.navigations[0][0], '/mainWorkspaceSettingsScreen')
  assert.ok(feedback.getActionFeedback().notices.some(notice => notice.tone === 'success' && /Informações da empresa atualizadas com sucesso/.test(notice.message)))
}))

test('voltar sem alterações navega diretamente; com alterações pede confirmação e permite cancelar', async () => withDOM(async (root, env) => {
  const Back = env.load('src/components/workspaceSettingsBackButton/index.tsx').default
  await act(async () => root.render(React.createElement(Back, { screen: 'backCompanyModalWeb' })))
  await act(async () => document.querySelector('button').click())
  assert.equal(document.querySelector('dialog'), null)
  assert.equal(env.navigations.length, 1)
  await act(async () => root.render(React.createElement(Back, { screen: 'backCompanyModalWeb', hasChanges: true })))
  await act(async () => document.querySelector('button').click())
  assert.ok(document.querySelector('dialog'))
  assert.ok([...document.querySelectorAll('dialog button')].some(button => button.textContent === 'Sair'))
  await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Cancelar').click())
  assert.equal(document.querySelector('dialog'), null)
  assert.equal(env.navigations.length, 1)
}))

test('empresa distingue alteração real de máscara e restauração dos valores iniciais', async () => withDOM(async (root, env) => {
  global.fetch = async () => response(company)
  let editor
  function Harness() { editor = env.load('src/hooks/useWorkspaceCompany.ts').useWorkspaceCompany(); return null }
  await act(async () => root.render(React.createElement(Harness)))
  assert.equal(editor.hasChanges, false)
  await act(async () => editor.setCompany({ ...company, cnpj: '12.345.678/0001-95' }))
  assert.equal(editor.hasChanges, false)
  await act(async () => editor.setCompany({ ...company, name: 'Empresa alterada' }))
  assert.equal(editor.hasChanges, true)
  await act(async () => editor.setCompany(company))
  assert.equal(editor.hasChanges, false)
}))

test('unidades ignoram navegação e máscara de CEP ao detectar mudanças', async () => withDOM(async (root, env) => {
  let editor
  function Harness() { editor = env.load('src/hooks/useWorkspaceUnitEditor.ts').useWorkspaceUnitEditor([{ ...address, cep: '01234567' }, { ...address, id: 13, persistedId: 13 }]); return null }
  await act(async () => root.render(React.createElement(Harness)))
  assert.equal(editor.hasChanges, false)
  await act(async () => editor.addresses.moveUnit(1))
  assert.equal(editor.hasChanges, false)
  await act(async () => editor.addresses.changeField('cep', '01234567'))
  assert.equal(editor.hasChanges, false)
  await act(async () => editor.addresses.changeField('number', '99'))
  assert.equal(editor.hasChanges, true)
  await act(async () => editor.addresses.changeField('number', address.number))
  assert.equal(editor.hasChanges, false)
}))

test('pagamentos das configurações informam indisponibilidade sem campos financeiros ou falso salvamento', async () => withDOM(async (root, env) => {
  const Page = env.load('src/pages/workspacePaymentSettings/index.tsx').default
  await act(async () => root.render(React.createElement(Page)))
  assert.match(document.body.textContent, /ainda não estão disponíveis/)
  assert.equal(document.querySelector('input'), null)
  assert.doesNotMatch(document.body.textContent, /Pagamento inicial|Salvar alterações/)
  assert.equal(document.querySelector('a').getAttribute('href'), 'mailto:app.4str0@gmail.com')
}))

test('arquivo selecionado é preservado para detectar descarte antes de iniciar a importação', async () => withDOM(async (root, env) => {
  let importer
  function Harness() { importer = env.load('src/hooks/useWorkspaceImport.ts').useWorkspaceImport(); return null }
  await act(async () => root.render(React.createElement(Harness)))
  const file = new File(['example'], 'equipe.xlsx')
  await act(async () => importer.reset(file))
  assert.equal(importer.file, file)
  await act(async () => importer.reset(null))
  assert.equal(importer.file, null)
}))

test('falha de carregamento da rota oferece recuperação visível em vez de tela vazia', async () => withDOM(async (root, env) => {
  const Boundary = env.load('src/components/routeErrorBoundary/index.tsx').default
  function BrokenPage() { throw new Error('Chunk unavailable') }
  const originalError = console.error
  console.error = () => {}
  try {
    await act(async () => root.render(React.createElement(Boundary, null, React.createElement(BrokenPage))))
    assert.match(document.querySelector('[role="alert"]').textContent, /conexão|nova versão/)
    assert.match(document.querySelector('button').textContent, /Recarregar página/)
  } finally { console.error = originalError }
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

test('conflito de transferência explica o bloqueio sem misturar aviso de permissões nem repetir a operação', async () => withDOM(async (root, env) => {
  let writes = 0
  const message = 'O workspace deve ter um único gestor responsável para realizar a transferência'
  global.fetch = async (url) => {
    if (url.endsWith('/managers')) return response([
      { id_usuario: 42, nome: 'Ana', email: 'ana@example.com', unidade_id: 12, unidade: 'Filial', status: 'ATIVO' },
    ])
    writes++
    return Response.json({ success: false, message, data: null, errors: [message] }, { status: 409 })
  }
  let closed = 0
  const Modal = env.load('src/components/workspaceManagerTransferModal/index.tsx').default
  await act(async () => root.render(React.createElement(Modal, { onClose() { closed++ } })))
  await act(async () => { const select = document.querySelector('select'); select.value = '42'; select.dispatchEvent(new window.Event('change', { bubbles: true })) })
  await act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Alterar gestor').click())
  await act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  assert.equal(document.querySelector('dialog').getAttribute('aria-label'), 'Transferência bloqueada')
  assert.equal(document.querySelector('[role="alert"]').textContent, message)
  assert.doesNotMatch(document.body.textContent, /perderá as permissões|Tentar novamente/)
  assert.equal(writes, 1)
  assert.equal(env.refreshed(), 0)
  assert.equal(env.navigations.length, 0)
  await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Voltar à seleção').click())
  assert.equal(document.querySelector('select').value, '42')
  assert.equal(writes, 1)
  assert.equal(closed, 0)
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
    ['Ana', '52998224725', 'ana@example.com', ' filial ', 'Analista', 'Remoto'],
    ['Bia', '11144477735', 'bia@example.com', 'Nova', 'Analista', 'Híbrido'],
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

test('selecionar Excel valida imediatamente com loading, bloqueia erro e só navega no Continuar', async () => withDOM(async root => {
  let draft = { company: { name: 'Empresa' }, units: [], email: 'gestor@empresa.com', file: null }
  const navigations = [], notices = []
  let registeredEmails = []
  const env = environment({
    'react-router-dom': { useNavigate: () => path => navigations.push(path), useSearchParams: () => [new URLSearchParams()], Navigate: () => null },
    '../../hooks/useWorkspaceRegistration': { useWorkspaceRegistration: () => ({ draft, updateDraft: changes => { draft = { ...draft, ...changes } } }) },
    '../../hooks/useActionFeedback': { useActionFeedback: () => (...args) => notices.push(args) },
    '../services/registrationValidation': { validateRegistrationEmails: async () => registeredEmails },
    '../workspaceSpreadsheetSettings': { __esModule: true, default: () => null },
    '../spreadsheetExplanationModal': { __esModule: true, default: () => null },
    '../../components/loginLoadingOverlay': { __esModule: true, default: () => React.createElement('div', { role: 'status' }, 'Carregando') },
  })
  const Page = env.load('src/pages/attachExcelFile/index.tsx').default
  await act(async () => root.render(React.createElement(Page)))
  const { utils, write } = require('xlsx')
  function makeFile(cpf) {
    const book = utils.book_new()
    utils.book_append_sheet(book, utils.aoa_to_sheet([
      ['nome', 'cpf', 'email', 'unidade', 'cargo', 'modalidade'],
      ['Gestor', '', draft.email, 'Matriz', 'Diretor', ''],
      ['Pessoa', cpf, 'pessoa@empresa.com', 'Matriz', 'Analista', 'Remoto'],
    ]), 'Equipe')
    return new File([write(book, { type: 'array', bookType: 'xlsx' })], 'equipe.xlsx')
  }
  async function select(file) {
    const input = document.querySelector('input[type=file]')
    Object.defineProperty(input, 'files', { configurable: true, value: [file] })
    await act(async () => input.dispatchEvent(new window.Event('change', { bubbles: true })))
  }
  await select(makeFile('11111111111'))
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)) })
  assert.match(document.querySelector('[role=alert]').textContent, /Linha 3: informe um CPF válido/)
  assert.deepEqual(navigations, [])
  assert.deepEqual(notices, [])
  registeredEmails = [{ row: 3, field: 'email', message: 'E-mail já cadastrado. Use outro e-mail para esta pessoa.' }]
  await select(makeFile('52998224725'))
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)) })
  assert.match(document.querySelector('[role=alert]').textContent, /Linha 3 · E-mail: E-mail já cadastrado/)
  assert.deepEqual(navigations, [])
  await act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)) })
  assert.deepEqual(navigations, [], 'Continuar não avança enquanto existe e-mail já cadastrado')
  assert.deepEqual(notices, [])
  registeredEmails = []
  const validFile = makeFile('52998224725')
  const realRead = validFile.arrayBuffer.bind(validFile)
  let release, reads = 0
  validFile.arrayBuffer = () => { reads++; return new Promise(resolve => { release = async () => resolve(await realRead()) }) }
  await select(validFile)
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
  assert.match(document.querySelector('[role=status]').textContent, /Carregando/)
  assert.equal(document.querySelector('button[type=submit]').disabled, true)
  assert.equal(document.querySelector('[role=alert]'), null)
  await act(async () => release())
  assert.equal(document.querySelector('[role=status]'), null)
  assert.deepEqual(notices, [['Planilha validada com sucesso.', 'success']])
  assert.deepEqual(navigations, [])
  await act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  assert.deepEqual(navigations, ['/setAddress'])
  assert.equal(reads, 1, 'Continuar reutiliza a validação do mesmo arquivo')
}))

test('importação valida CPF, e-mail, nomes, modalidade e duplicidade antes de aceitar a planilha', () => {
  const { utils, write } = require('xlsx'), { extractSpreadsheetUnitNames } = environment().load('src/utils/excelUnits.ts')
  const header = ['Nome', 'CPF', 'Email', 'Unidade', 'Cargo', 'Modalidade']
  const person = ['Ana Lima', '529.982.247-25', 'ana@example.com', 'Filial', 'Analista', 'Híbrido']
  function parse(rows) {
    const book = utils.book_new(); utils.book_append_sheet(book, utils.aoa_to_sheet([header, ...rows]), 'Equipe')
    return extractSpreadsheetUnitNames(write(book, { type: 'array', bookType: 'xlsx' }), '', true)
  }
  assert.deepEqual(parse([person]), ['Filial'])
  for (const [column, value, message] of [[0, 'A', /Linha 2.*nome/], [1, '000.000.000-00', /Linha 2.*CPF válido/], [2, 'invalido', /Linha 2.*e-mail válido/], [4, '', /Linha 2.*cargo/], [5, 'Outro', /Linha 2.*modalidade/]]) {
    const invalid = [...person]; invalid[column] = value
    assert.throws(() => parse([invalid]), message)
  }
  assert.throws(() => parse([person, [...person]]), /Linha 3.*e-mail duplicado/)
  const duplicateCpf = [...person]; duplicateCpf[2] = 'outra@example.com'
  assert.throws(() => parse([person, duplicateCpf]), /Linha 3.*CPF duplicado/)
})

test('planilha nas configurações valida ao selecionar, bloqueia erro e reutiliza a análise antes de confirmar', async () => withDOM(async (root, env) => {
  const { utils, write } = require('xlsx')
  let requests = 0
  global.fetch = async (_url, init) => { requests++; assert.equal(init.method, 'GET'); return response([unit]) }
  const Page = env.load('src/pages/workspaceSpreadsheetSettings/index.tsx').default
  function file(cpf) {
    const book = utils.book_new()
    utils.book_append_sheet(book, utils.aoa_to_sheet([['Nome', 'CPF', 'Email', 'Unidade', 'Cargo', 'Modalidade'], ['Ana Lima', cpf, 'ana@example.com', 'Filial', 'Analista', 'Híbrido']]), 'Equipe')
    return new File([write(book, { type: 'array', bookType: 'xlsx' })], 'equipe.xlsx')
  }
  await act(async () => root.render(React.createElement(Page)))
  const select = async selected => {
    const input = document.querySelector('input[type=file]')
    Object.defineProperty(input, 'files', { configurable: true, value: [selected] })
    await act(async () => input.dispatchEvent(new window.Event('change', { bubbles: true })))
    await act(async () => new Promise(resolve => setTimeout(resolve, 40)))
  }
  await select(file('000.000.000-00'))
  assert.match(document.getElementById('spreadsheet-error').textContent, /Linha 2.*CPF válido/)
  assert.equal(document.querySelector('dialog[open]'), null)
  assert.equal(requests, 0)
  const valid = file('529.982.247-25'), read = valid.arrayBuffer.bind(valid)
  let reads = 0
  valid.arrayBuffer = () => { reads++; return read() }
  await select(valid)
  assert.equal(document.getElementById('spreadsheet-error'), null)
  assert.equal(requests, 1)
  assert.equal(document.querySelector('dialog[open]'), null)
  await act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  assert.ok(document.querySelector('dialog[open]'))
  assert.equal(reads, 1)
  assert.equal(requests, 1, 'Ainda não salva antes da confirmação')
}))

test('transferência abre o popup de seleção com skeleton e mantém o mesmo diálogo ao carregar gestores', async () => withDOM(async (root, env) => {
  let resolveManagers
  global.fetch = () => new Promise(resolve => { resolveManagers = resolve })
  const Modal = env.load('src/components/workspaceManagerTransferModal/index.tsx').default
  await act(async () => root.render(React.createElement(Modal, { onClose() {} })))
  const dialog = document.querySelector('dialog')
  assert.equal(dialog.getAttribute('aria-label'), 'Selecione o novo gestor do workspace')
  assert.equal(document.querySelector('form').getAttribute('aria-busy'), 'true')
  assert.ok(document.querySelector('.api-skeleton-control'))
  assert.equal(document.querySelector('button[type="submit"]').disabled, true)
  assert.ok([...document.querySelectorAll('button')].some(button => button.textContent === 'Cancelar' && !button.disabled))
  assert.equal(document.querySelector('.action-loading'), null)
  await act(async () => resolveManagers(response([
    { id_usuario: 42, nome: 'Ana', email: 'ana@example.com', unidade_id: 12, unidade: 'Filial', status: 'ATIVO' },
  ])))
  assert.equal(document.querySelector('dialog'), dialog)
  assert.equal(document.querySelector('form').getAttribute('aria-busy'), 'false')
  assert.equal(document.querySelector('.api-skeleton-control'), null)
  assert.equal(document.querySelector('option[value="42"]').textContent, 'ana@example.com')
}))
