const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { act } = React
const { MemoryRouter, useLocation } = require('react-router-dom')
const { JSDOM } = require('jsdom')
const id = '550e8400-e29b-41d4-a716-446655440000'
const detail = { id, status: 'RASCUNHO', managerId: 8, nrCode: null, unitId: null, dueDate: null, title: 'Inspeção API', description: 'Dados reais', respondedAt: null,
  questions: [{ id: 1, type: 'texto', question: 'Texto da API', required: true, multiple: null, options: [], maxFiles: null, maxFileSizeMb: null, answer: [] }] }
const options = { managers: [{ value: '8', label: 'Ana da API' }], nrs: [{ value: '6', label: 'NR 6' }], units: [{ value: '3', label: 'Unidade da API' }], currentManagerId: '7', managersError: '' }
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
function Modal({ children, title, onClose }) { return React.createElement('section', { role: 'dialog', 'aria-label': title }, typeof children === 'function' ? children(onClose) : children) }
function environment({ development = true, realResults = false } = {}) {
  const cache = new Map(), calls = [], context = { user: { uid: 'gestor', accountType: 'GESTOR_WORKSPACE' } }
  const services = {
    getFormOptions: async () => options, getFormRecipients: async () => options, getForm: async () => structuredClone(detail), createForm: async () => structuredClone(detail),
    updateForm: async (_id, values) => ({ ...structuredClone(detail), title: values.name }), publishForm: async () => ({ ...structuredClone(detail), status: 'PENDENTE' }),
    listForms: async (_search, _status, page, size) => ({ items: [{ id, title: 'Inspeção API', description: 'Dados reais', status: 'RASCUNHO', questionCount: 1 }], page, size, totalPages: 1, totalElements: 1 }), deleteForm: async () => {},
  }
  const tracked = Object.fromEntries(Object.keys(services).map(name => [name, (...args) => { calls.push({ name, args }); return services[name](...args) }]))
  function load(filename) {
    filename = path.resolve(filename)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'").replaceAll('import.meta.env.DEV', String(development))
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'module', 'exports', code)(name => {
      if (name.startsWith('.') && path.resolve(path.dirname(filename), name) === path.resolve('src/services/forms')) return tracked
      if (name === './useAuthentication') return { useAuthentication: () => context }
      if (name === '../appModal') return { __esModule: true, default: Modal }
      if (name === '../../hooks/useAnimatedClose') return { useAnimatedClose: () => ({ closing: false, requestClose: done => done() }) }
      if (name === '../../hooks/useAnimatedResults' && !realResults) return { useAnimatedResults: (items, signature) => ({ items, signature, exiting: false }) }
      if (name === '../../hooks/useQuestionReorder') return { useQuestionReorder: values => ({ renderedQuestions: values.questions }) }
      if (name === '../../components') return Object.fromEntries(['AppSidebar', 'AstroBrand', 'AstroIcon', 'CompactPurpleButton', 'ConfirmationModal', 'OptionsPopup', 'ToolbarSearch', 'ToolbarSelect'].map(component => [component,
        component === 'AppSidebar' || component === 'AstroBrand' ? () => null : load(`src/components/${component[0].toLowerCase()}${component.slice(1)}/index.tsx`).default]))
      if (!name.startsWith('.')) return require(name)
      const resolved = path.resolve(path.dirname(filename), name)
      return load([`${resolved}.ts`, `${resolved}.tsx`, path.join(resolved, 'index.tsx')].find(file => fs.existsSync(file)))
    }, module, module.exports)
    if (filename.includes(`${path.sep}src${path.sep}pages${path.sep}`)) {
      const Page = module.exports.default
      const Host = load('src/components/actionFeedbackHost/index.tsx').default
      module.exports.default = props => React.createElement(React.Fragment, null, React.createElement(Host), React.createElement(Page, props))
    }
    return module.exports
  }
  return { load, services, calls, context }
}
async function withDom(run) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  const names = ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT', 'requestAnimationFrame', 'ResizeObserver', 'getComputedStyle']
  const previous = Object.fromEntries(names.map(name => [name, global[name]]))
  Object.assign(global, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true, requestAnimationFrame: fn => { fn(); return 0 },
    ResizeObserver: class { observe() {} disconnect() {} }, getComputedStyle: element => new Proxy(dom.window.getComputedStyle(element), {
      get(style, key) { return ({ gridTemplateColumns: '300px 300px', rowGap: '12px', paddingTop: '0px', paddingBottom: '0px' })[key] ?? style[key] },
    }) })
  dom.window.matchMedia = () => ({ matches: true })
  dom.window.HTMLElement.prototype.scrollIntoView = () => {}
  const { createRoot } = require('react-dom/client'), root = createRoot(document.getElementById('root'))
  try { await run(root, dom) } finally { await act(async () => root.unmount()); dom.window.close(); Object.assign(global, previous) }
}
function RouteProbe() { const location = useLocation(); return React.createElement('output', { id: 'location' }, location.pathname + location.search) }
async function mount(root, Page, route) { await act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(Page), React.createElement(RouteProbe)))) }
async function click(label, within = document) {
  const button = [...within.querySelectorAll('button')].find(button => button.textContent === label || button.getAttribute('aria-label') === label)
  assert.ok(button, `Botão: ${label}`)
  await act(async () => button.click())
}
const waitForList = async () => act(async () => { await new Promise(resolve => setTimeout(resolve, 280)) })

test('entrada mantém quatro skeletons até terminar a saída e revela os quatro cards sem intervalo vazio', async t => withDom(async root => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  window.matchMedia = () => ({ matches: false })
  const env = environment({ realResults: true }), pending = deferred()
  env.services.listForms = () => pending.promise
  const Page = env.load('src/pages/mainFormScreen/index.tsx').default
  await mount(root, Page, '/mainFormScreen'); await act(async () => t.mock.timers.tick(280))
  assert.equal(document.querySelectorAll('.api-loading-card').length, 4)
  const rows = Array.from({ length: 4 }, (_, index) => ({ id: `550e8400-e29b-41d4-a716-44665544000${index}`, title: `Formulário ${index + 1}`, description: 'Descrição do formulário', status: 'PENDENTE', questionCount: 3 }))
  await act(async () => pending.resolve({ items: rows, page: 0, size: 4, totalPages: 1, totalElements: 4 }))
  assert.equal(document.querySelectorAll('.forms-skeleton--exiting .api-loading-card').length, 4)
  assert.equal(document.querySelector('.forms-empty'), null)
  assert.equal(document.querySelector('[data-track-showcase]').hidden, true)
  await act(async () => t.mock.timers.tick(200))
  assert.equal(document.querySelector('.api-loading--cards'), null)
  const grid = document.querySelector('[data-track-showcase]')
  assert.equal(grid.hidden, false)
  assert.equal(grid.querySelectorAll('.form-card').length, 4)
  assert.equal(grid.classList.contains('forms-grid--exiting'), false)
  assert.equal(document.querySelector('.forms-empty'), null)
}))

test('criação associa validação ao nome e gestor sem enviar formulário inválido', async () => withDom(async root => {
  const env = environment(), Page = env.load('src/pages/createForm/index.tsx').default
  await mount(root, Page, '/createForms')
  await act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  for (const field of ['name', 'description', 'manager']) {
    const input = document.getElementById(`create-forms-${field}`)
    assert.equal(input.getAttribute('aria-invalid'), 'true')
    const message = document.getElementById(input.getAttribute('aria-describedby'))
    assert.equal(message.getAttribute('role'), 'alert')
    assert.ok(message.classList.contains('login-field-error'))
  }
  assert.equal(env.calls.filter(call => call.name === 'createForm').length, 0)
  await act(async () => {
    const input = document.getElementById('create-forms-name')
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'Inspeção')
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  for (const field of ['name', 'description', 'manager']) {
    assert.equal(document.getElementById(`create-forms-${field}`).getAttribute('aria-invalid'), 'false')
    assert.equal(document.getElementById(`create-forms-${field}-error`), null)
  }
  await act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  assert.equal(document.getElementById('create-forms-name').getAttribute('aria-invalid'), 'false')
  for (const field of ['description', 'manager']) assert.equal(document.getElementById(`create-forms-${field}`).getAttribute('aria-invalid'), 'true')
  assert.equal(env.calls.filter(call => call.name === 'createForm').length, 0)
}))

test('calendário associa erro externo e remove o estado inválido ao corrigir', async () => withDom(async root => {
  const env = environment(), Picker = env.load('src/components/formDatePicker/index.tsx').default
  const props = { id: 'test-date', label: 'Validade', value: '2026-10-18', onChange() {} }
  await act(async () => root.render(React.createElement(Picker, { ...props, error: 'Deve ser após a data inicial.' })))
  assert.equal(document.getElementById('test-date').getAttribute('aria-invalid'), 'true')
  assert.equal(document.getElementById('test-date').getAttribute('aria-describedby'), 'test-date-error')
  assert.equal(document.querySelectorAll('[role="alert"]').length, 1)
  assert.ok(document.getElementById('test-date-error').classList.contains('login-field-error'))
  await act(async () => root.render(React.createElement(Picker, props)))
  assert.equal(document.getElementById('test-date').getAttribute('aria-invalid'), 'false')
  assert.equal(document.getElementById('test-date').hasAttribute('aria-describedby'), false)
  assert.equal(document.querySelector('[role="alert"]'), null)
}))

test('edição consulta o UUID da URL, mostra dados reais e só navega após PUT confirmado', async () => withDom(async root => {
  const env = environment(), pending = deferred(), Page = env.load('src/pages/editForm/index.tsx').default
  await mount(root, Page, `/editForms?id=${id}`)
  assert.equal(env.calls.find(c => c.name === 'getForm').args[0], id)
  assert.equal(document.getElementById('edit-forms-name').value, 'Inspeção API')
  assert.equal(document.querySelector('[aria-label="Perguntas do formulário"] input').value, 'Texto da API')
  assert.equal(document.querySelector('[aria-label="Gestor destinatário"]').value, 'Ana da API')
  env.services.updateForm = () => pending.promise
  await click('Salvar alterações'); await click('Salvar')
  assert.match(document.getElementById('location').textContent, /editForms/)
  assert.equal(document.querySelector('fieldset').disabled, true)
  assert.match(document.body.textContent, /Carregando/)
  await act(async () => pending.resolve(detail))
  assert.equal(document.getElementById('location').textContent, '/mainFormScreen')
}))

test('publicação salva conteúdo antes do POST; falha mantém edição e permite repetir', async () => withDom(async root => {
  const env = environment(), Page = env.load('src/pages/editForm/index.tsx').default
  env.services.publishForm = async () => { throw Error('Gestor ficou inativo') }
  await mount(root, Page, `/editForms?id=${id}`)
  await click('Publicar formulário'); await click('Publicar')
  assert.deepEqual(env.calls.filter(c => ['updateForm', 'publishForm'].includes(c.name)).map(c => c.name), ['updateForm', 'publishForm'])
  assert.match(document.querySelector('[role="alert"]').textContent, /Gestor ficou inativo/)
  assert.equal(document.getElementById('edit-forms-name').value, 'Inspeção API')
  assert.match(document.getElementById('location').textContent, /editForms/)
  env.services.publishForm = async () => ({ ...detail, status: 'PENDENTE' })
  await click('Publicar')
  assert.equal(document.getElementById('location').textContent, '/mainFormScreen')
}))

test('rascunho vazio é salvo remotamente; erro de criação mantém conteúdo e pode ser corrigido', async () => withDom(async root => {
  const env = environment(), Page = env.load('src/pages/createForm/index.tsx').default
  env.services.createForm = async () => { throw Error('Falha temporária na API') }
  await mount(root, Page, '/createForms')
  await click('Voltar e abrir opções do formulário'); await click('Salvar rascunho')
  assert.equal(env.calls.find(c => c.name === 'createForm').args[1], true)
  assert.match(document.querySelector('[role="alert"]').textContent, /Falha temporária/)
  assert.equal(document.getElementById('location').textContent, '/createForms')
  env.services.createForm = async () => ({ ...detail, title: '', managerId: null, questions: [] })
  await click('Voltar e abrir opções do formulário'); await click('Salvar rascunho')
  assert.equal(document.getElementById('location').textContent, '/mainFormScreen')
}))

test('formulário respondido fica somente para consulta; falha de consulta oferece retry', async () => withDom(async root => {
  const env = environment(), Page = env.load('src/pages/editForm/index.tsx').default
  env.services.getForm = async () => { throw Error('Formulário não encontrado') }
  await mount(root, Page, '/editForms')
  assert.match(document.querySelector('[role="alert"]').textContent, /não encontrado/)
  assert.equal(document.querySelector('fieldset').disabled, true)
  env.services.getForm = async () => ({ ...detail, questions: [{ ...detail.questions[0], answer: ['Respondido'] }] })
  await click('Tentar novamente')
  assert.match(document.body.textContent, /somente para consulta/)
  assert.equal(document.querySelector('fieldset').disabled, true)
}))

test('card salva na API, mantém prévia em falhas e bloqueia edição depois de respondido', async () => withDom(async root => {
  const env = environment(), Page = env.load('src/pages/mainFormScreen/index.tsx').default
  let current = structuredClone(detail)
  env.services.getForm = async () => structuredClone(current)
  env.services.listForms = async (_search, _status, page, size) => ({ items: [{ id, title: current.title, appearance: current.appearance, description: current.description, status: current.status, questionCount: 1 }], page, size, totalPages: 1, totalElements: 1 })
  env.services.updateForm = async (_id, values) => { current = { ...current, title: values.name, appearance: values.appearance }; return structuredClone(current) }
  await mount(root, Page, '/mainFormScreen'); await waitForList()
  await click('Opções para Inspeção API'); await click('Personalizar card')
  let dialog = document.querySelector('[role="dialog"]')
  assert.equal(dialog.querySelectorAll('[name="form-card-icon"]').length, 10)
  assert.equal(dialog.querySelectorAll('[name="form-card-color"]').length, 10)
  await act(async () => { dialog.querySelector('[value="security"]').click(); dialog.querySelector('[value="teal"]').click() })
  await click('Cancelar', dialog)
  assert.equal(env.calls.some(call => call.name === 'updateForm'), false)
  await click('Opções para Inspeção API'); await click('Personalizar card')
  dialog = document.querySelector('[role="dialog"]')
  await act(async () => { dialog.querySelector('[value="calendar"]').click(); dialog.querySelector('[value="orange"]').click() })
  const save = env.services.updateForm
  env.services.updateForm = async () => { throw new Error('Falha na API') }
  await click('Salvar alterações', dialog)
  assert.ok(document.querySelector('[role="dialog"]'))
  assert.equal(document.querySelector('.form-card .form-card-icon--orange'), null)
  env.services.updateForm = save
  await click('Salvar alterações', dialog)
  assert.equal(document.querySelector('[role="dialog"]'), null)
  assert.ok(document.querySelector('.form-card .form-card-icon--orange .astro-icon--calendar'))
  assert.equal(current.title, 'Inspeção API'); assert.deepEqual(current.appearance, { icon: 'calendar', color: 'orange' })
  assert.doesNotMatch(document.querySelector('.form-card').textContent, /ac1/)
  await act(async () => root.render(null))
  current.status = 'CONCLUIDO'
  await mount(root, Page, '/mainFormScreen'); await waitForList()
  assert.ok(document.querySelector('.form-card .form-card-icon--orange .astro-icon--calendar'))
  await click('Opções para Inspeção API')
  assert.equal(document.querySelector('[aria-label="Personalizar card"]'), null)
}))
test('lista usa paginação da API e exclusão aguarda confirmação; erro mantém card', async () => withDom(async root => {
  const env = environment(), Page = env.load('src/pages/mainFormScreen/index.tsx').default, pending = deferred()
  await mount(root, Page, '/mainFormScreen'); await waitForList()
  assert.deepEqual(env.calls.find(c => c.name === 'listForms').args.slice(0, 4), ['', '', 0, 4])
  assert.match(document.body.textContent, /Inspeção API/)
  env.services.deleteForm = () => pending.promise
  await click('Opções para Inspeção API'); await click('Excluir'); await click('Excluir', document.querySelector('[role="dialog"]'))
  assert.match(document.body.textContent, /Carregando/)
  assert.ok(document.querySelector('.form-card'))
  await act(async () => pending.reject(Error('Formulário recebeu respostas')))
  assert.match(document.querySelector('[role="alert"]').textContent, /recebeu respostas/)
  assert.ok(document.querySelector('.form-card'))
  env.services.deleteForm = async () => {}
  env.services.listForms = async (_search, _status, page, size) => ({ items: [], page, size, totalPages: 0, totalElements: 0 })
  await click('Excluir', document.querySelector('[role="dialog"]')); await waitForList()
  assert.equal(document.querySelector('.form-card'), null)
  assert.match(document.body.textContent, /excluído/)
}))

test('troca de formulário cancela leitura antiga; desmontagem cancela gravação e descarta resultado', async () => withDom(async root => {
  const env = environment(), first = deferred(), pending = deferred(), hook = env.load('src/hooks/useFormEditor.ts').useFormEditor
  let current
  function Probe({ formId }) { current = hook(formId); return null }
  env.services.getForm = formId => formId === 'primeiro' ? first.promise : Promise.resolve(detail)
  await act(async () => root.render(React.createElement(Probe, { formId: 'primeiro' })))
  const oldRead = env.calls.find(c => c.name === 'getForm')
  await act(async () => root.render(React.createElement(Probe, { formId: id })))
  assert.equal(oldRead.args[1].aborted, true)
  await act(async () => first.resolve({ ...detail, title: 'Antigo' }))
  assert.equal(current.values.name, 'Inspeção API')
  env.services.updateForm = () => pending.promise
  let operation
  await act(async () => { operation = current.save() })
  await assert.rejects(current.save(), /Aguarde/)
  const writing = env.calls.find(c => c.name === 'updateForm')
  await act(async () => root.render(null))
  assert.equal(writing.args[3].aborted, true)
  pending.resolve(detail)
  await assert.rejects(operation, { name: 'AbortError' })
}))

test('paginação remota recua após excluir o último item; filtro de status volta à primeira página', async () => withDom(async root => {
  const env = environment(), Page = env.load('src/pages/mainFormScreen/index.tsx').default
  env.services.listForms = async (_search, _status, page, size) => ({ items: [{ id, title: 'Inspeção API', description: '', status: 'RASCUNHO', questionCount: 1 }], page, size, totalPages: 2, totalElements: 5 })
  await mount(root, Page, '/mainFormScreen'); await waitForList()
  await click('Próxima página'); await waitForList()
  assert.equal(env.calls.filter(c => c.name === 'listForms').at(-1).args[2], 1)
  await click('Abrir opções de Filtrar por status'); await click('Pendente'); await waitForList()
  assert.deepEqual(env.calls.filter(c => c.name === 'listForms').at(-1).args.slice(0, 4), ['', 'pending', 0, 4])
  await click('Próxima página'); await waitForList()
  env.services.listForms = async (_search, _status, page, size) => ({ items: page === 0 ? [{ id, title: 'Outro formulário', description: '', status: 'PENDENTE', questionCount: 1 }] : [], page, size, totalPages: 1, totalElements: 4 })
  await click('Opções para Inspeção API'); await click('Excluir'); await click('Excluir', document.querySelector('[role="dialog"]'))
  await waitForList(); await waitForList()
  assert.equal(env.calls.filter(c => c.name === 'listForms').at(-1).args[2], 0)
  assert.match(document.body.textContent, /Outro formulário/)
}))

test('busca cancela resposta anterior e erro da lista oferece recuperação sem dados de exemplo', async () => withDom(async root => {
  const env = environment(), old = deferred(), hook = env.load('src/hooks/useForms.ts').useForms
  let current
  function Probe({ search }) { current = hook(search, '', 1, 4); return null }
  env.services.listForms = () => old.promise
  await act(async () => root.render(React.createElement(Probe, { search: 'antiga' }))); await waitForList()
  const oldRead = env.calls.find(c => c.name === 'listForms')
  env.services.listForms = async () => { throw Error('Lista indisponível') }
  await act(async () => root.render(React.createElement(Probe, { search: 'nova' }))); await waitForList()
  assert.equal(oldRead.args[4].aborted, true)
  await act(async () => old.resolve({ items: [{ id, title: 'Antigo', description: '', status: 'RASCUNHO', questionCount: 1 }], totalPages: 1, totalElements: 1 }))
  assert.deepEqual(current.rows, []); assert.match(current.error, /Lista indisponível/)
  env.services.listForms = async () => ({ items: [], totalPages: 0, totalElements: 0 })
  await act(async () => current.retry()); await waitForList()
  assert.equal(current.loading, false); assert.equal(current.error, ''); assert.deepEqual(current.rows, [])
}))

test('troca de conta oculta os campos anteriores e cancela publicação pendente', async () => withDom(async root => {
  const env = environment(), pending = deferred(), hook = env.load('src/hooks/useFormEditor.ts').useFormEditor
  let current
  function Probe() { current = hook(id); return null }
  await act(async () => root.render(React.createElement(Probe)))
  env.services.updateForm = () => pending.promise
  let operation
  await act(async () => { operation = current.save(false, true) })
  env.context.user = { uid: 'outro', accountType: 'GESTOR' }
  env.services.getForm = () => deferred().promise
  await act(async () => root.render(React.createElement(Probe)))
  assert.equal(current.loading, true); assert.equal(current.values.name, ''); assert.equal(current.saving, false)
  pending.resolve(detail); await assert.rejects(operation, { name: 'AbortError' })
  assert.equal(env.calls.filter(c => c.name === 'publishForm').length, 0)
}))

test('gestor comum escolhe outro gestor pelo nome; o próprio usuário não aparece nem como seleção salva', async () => withDom(async root => {
  const env = environment(), Page = env.load('src/pages/createForm/index.tsx').default
  env.context.user.accountType = 'GESTOR'
  env.services.getFormOptions = async () => ({ ...options, managers: [{ value: '7', label: 'Eu mesmo' }, ...options.managers] })
  await mount(root, Page, '/createForms')
  assert.equal(document.getElementById('create-forms-manager').getAttribute('aria-invalid'), 'false')
  await click('Abrir opções de Gestor destinatário')
  assert.equal(document.querySelector('[role="option"]')?.textContent, 'Selecione o gestor')
  assert.doesNotMatch(document.querySelector('[role="listbox"]').textContent, /Eu mesmo/)
  await click('Ana da API')
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 220)) })
  assert.equal(document.querySelector('[aria-label="Gestor destinatário"]').value, 'Ana da API')
  await click('Voltar e abrir opções do formulário'); await click('Salvar rascunho')
  assert.equal(env.calls.find(c => c.name === 'createForm').args[0].manager, '8')
}))

test('falha de destinatários permite nova tentativa sem apagar os campos preenchidos', async () => withDom(async (root, dom) => {
  const env = environment(), Page = env.load('src/pages/createForm/index.tsx').default
  env.services.getFormOptions = async () => ({ ...options, managers: [], managersError: 'Não foi possível carregar os gestores.' })
  await mount(root, Page, '/createForms')
  await act(async () => {
    const input = document.getElementById('create-forms-name')
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, 'Rascunho preservado')
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
  })
  const pending = deferred()
  env.services.getFormRecipients = () => pending.promise
  await click('Tentar novamente')
  assert.equal(document.querySelector('[aria-label="Gestor destinatário"]').disabled, true)
  assert.ok(document.querySelector('.login-loading-overlay .login-loading-spinner'))
  assert.equal(document.querySelector('.api-skeleton'), null)
  await act(async () => pending.resolve(options))
  assert.equal(document.querySelector('.login-loading-overlay'), null)
  assert.equal(document.getElementById('create-forms-name').value, 'Rascunho preservado')
  assert.equal(document.querySelector('[aria-label="Gestor destinatário"]').disabled, false)
  assert.equal(document.querySelector('[role="alert"]'), null)
}))

test('editor mantém o menu de voltar sem os botões extras de navegação', async () => withDom(async root => {
  const env = environment(), Page = env.load('src/pages/editForm/index.tsx').default
  await mount(root, Page, `/editForms?id=${id}`)
  assert.equal([...document.querySelectorAll('button')].some(button => ['Voltar aos formulários', 'Recarregar formulário'].includes(button.textContent)), false)
  assert.ok(document.querySelector('[aria-label="Voltar e abrir opções do formulário"]'))
}))

test('NR antiga fora do catálogo Empresa não reaparece no dropdown e precisa ser substituída ou removida', async () => withDom(async root => {
  const env = environment(), Page = env.load('src/pages/editForm/index.tsx').default
  env.services.getForm = async () => ({ ...structuredClone(detail), nrCode: 99 })
  await mount(root, Page, `/editForms?id=${id}`)
  assert.equal(document.querySelector('[aria-label="NR (opcional)"]').value, 'Selecionar a NR')
  assert.match(document.querySelector('[role="alert"]').textContent, /catálogo de empresa/)
  await click('Abrir opções de NR (opcional)')
  assert.doesNotMatch(document.querySelector('[role="listbox"]').textContent, /99|seleção salva/)
  await click('NR 6')
  await click('Salvar alterações'); await click('Salvar')
  assert.equal(env.calls.find(call => call.name === 'updateForm').args[1].nr, '6')
}))

test('salvamento recusa NR fora do catálogo e aceita remover o vínculo opcional', async () => withDom(async root => {
  const env = environment(), hook = env.load('src/hooks/useFormEditor.ts').useFormEditor
  let current
  function Probe() { current = hook(id); return null }
  env.services.getForm = async () => ({ ...structuredClone(detail), nrCode: 99 })
  await act(async () => root.render(React.createElement(Probe)))
  await assert.rejects(current.save(), /Selecione uma NR de empresa/)
  assert.equal(env.calls.filter(call => call.name === 'updateForm').length, 0)
  await act(async () => current.setValues(values => ({ ...values, nr: '' })))
  await act(async () => { await current.save() })
  assert.equal(env.calls.find(call => call.name === 'updateForm').args[1].nr, '')
}))


test('menu de formulário pendente não oferece prévia nem análise em desenvolvimento', async () => withDom(async root => {
  const env = environment(), Page = env.load('src/pages/mainFormScreen/index.tsx').default
  env.services.listForms = async (_search, _status, page, size) => ({ items: [{ id, title: 'Inspeção API', description: 'Dados reais', status: 'PENDENTE', questionCount: 1 }], page, size, totalPages: 1, totalElements: 1 })
  await mount(root, Page, '/mainFormScreen'); await waitForList()
  const card = document.querySelector('.form-card')
  assert.equal(card.querySelectorAll('button').length, 1)
  assert.equal(document.querySelector('a[href*="preview=1"]'), null)
  assert.equal(document.querySelector('[role="menu"]'), null)
  await click('Opções para Inspeção API')
  const menu = document.querySelector('[role="menu"]')
  assert.ok(menu.querySelector('[aria-label="Editar"]'))
  assert.doesNotMatch(menu.textContent, /Ver respostas|prévia/)
  assert.equal(document.getElementById('location').textContent, '/mainFormScreen')
  assert.equal(env.calls.some(call => ['getForm', 'updateForm', 'publishForm', 'deleteForm'].includes(call.name)), false)
}))

test('produção não oferece prévia nem análise de formulário ainda pendente', async () => withDom(async root => {
  const env = environment({ development: false }), Page = env.load('src/pages/mainFormScreen/index.tsx').default
  env.services.listForms = async (_search, _status, page, size) => ({ items: [{ id, title: 'Inspeção API', description: 'Dados reais', status: 'PENDENTE', questionCount: 1 }], page, size, totalPages: 1, totalElements: 1 })
  await mount(root, Page, '/mainFormScreen'); await waitForList()
  await click('Opções para Inspeção API')
  const menu = document.querySelector('[role="menu"]')
  assert.ok(menu.querySelector('[aria-label="Editar"]'))
  assert.doesNotMatch(menu.textContent, /Ver respostas|prévia/)
  assert.equal(document.querySelector('a[href*="preview=1"]'), null)
}))

test('respondidos oferecem apenas cancelar e ver respostas, sem edição, personalização ou exclusão', async () => withDom(async root => {
  const env = environment(), Page = env.load('src/pages/mainFormScreen/index.tsx').default
  env.services.listForms = async (_search, _status, page, size) => ({ items: [{ id, title: 'Inspeção API', description: 'Dados reais', status: 'CONCLUIDO', questionCount: 1 }], page, size, totalPages: 1, totalElements: 1 })
  await mount(root, Page, '/mainFormScreen'); await waitForList()
  assert.equal(document.querySelector('.form-card').querySelectorAll('button').length, 1)
  await click('Opções para Inspeção API')
  const menu = document.querySelector('[role="menu"]')
  assert.deepEqual([...menu.querySelectorAll('[role="menuitem"]')].map(item => item.getAttribute('aria-label')), ['Cancelar', 'Ver respostas'])
  assert.doesNotMatch(menu.textContent, /prévia/)
  await click('Ver respostas', menu)
  assert.equal(document.getElementById('location').textContent, `/mainFormScreen/responses?id=${id}`)
}))

for (const [page, route, title] of [
  ['createForm', '/createForms', 'Crie seu formulário'],
  ['editForm', `/editForms?id=${id}`, 'Editar formulário'],
]) {
  test(`${page}: carregamento inicial não sobrepõe título ou conteúdo ao indicador`, async () => withDom(async root => {
    const env = environment(), pending = deferred()
    env.services.getFormOptions = () => pending.promise
    const Page = env.load(`src/pages/${page}/index.tsx`).default
    await mount(root, Page, route)
    assert.ok(document.querySelector('.login-loading-overlay .login-loading-spinner'))
    assert.equal(document.querySelector('h1'), null)
    assert.equal(document.querySelector('.create-forms-header'), null)
    assert.equal(document.querySelector('.create-forms-card'), null)
    await act(async () => pending.resolve(options))
    assert.equal(document.querySelector('.login-loading-overlay'), null)
    assert.equal(document.querySelector('h1').textContent, title)
    assert.ok(document.querySelector('.create-forms-header'))
    assert.ok(document.querySelector('.create-forms-card'))
  }))
}


test('valida e normaliza o formulário antes do serviço, preservando rascunho e exigindo conteúdo na publicação', async () => withDom(async root => {
  const env = environment(), hook = env.load('src/hooks/useFormEditor.ts').useFormEditor
  let current
  function Probe() { current = hook(id); return null }
  await act(async () => root.render(React.createElement(Probe)))
  const valid = structuredClone(current.values)
  for (const [changes, message] of [[{ manager: '7' }, /outro gestor/], [{ nr: '99' }, /NR de empresa/], [{ unit: 'inválida' }, /identificador válido/]]) {
    await act(async () => current.setValues({ ...valid, ...changes }))
    await assert.rejects(current.save(), message)
  }
  assert.equal(env.calls.filter(call => call.name === 'updateForm').length, 0)
  await act(async () => current.setValues({ ...valid, description: '' }))
  await assert.rejects(current.save(false, true), /descrição/)
  assert.equal(env.calls.filter(call => ['updateForm', 'publishForm'].includes(call.name)).length, 0)
  await act(async () => { await current.save() })
  assert.equal(env.calls.filter(call => call.name === 'updateForm').length, 1)
  await act(async () => current.setValues({ ...valid, name: '  Inspeção limpa  ', manager: ' 8 ', nr: ' 6 ' }))
  await act(async () => { await current.save() })
  const sent = env.calls.filter(call => call.name === 'updateForm').at(-1).args[1]
  assert.equal(sent.name, 'Inspeção limpa'); assert.equal(sent.manager, '8'); assert.equal(sent.nr, '6')
}))

test('filtros inválidos são recusados antes de chamar o serviço da lista', async () => withDom(async root => {
  const env = environment(), hook = env.load('src/hooks/useForms.ts').useForms
  let current
  function Probe() { current = hook('x'.repeat(241), '', 1, 4); return null }
  await act(async () => root.render(React.createElement(Probe)))
  await waitForList()
  assert.equal(current.loading, false)
  assert.match(current.error, /240 caracteres/)
  assert.equal(env.calls.filter(call => call.name === 'listForms').length, 0)
}))
