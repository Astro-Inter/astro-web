const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { act } = React
const { MemoryRouter } = require('react-router-dom')
const { JSDOM } = require('jsdom')
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
function Modal({ children, title, onClose, open = true }) {
  return open ? React.createElement('section', { role: 'dialog', 'aria-label': title }, typeof children === 'function' ? children(onClose) : children) : null
}
function environment(overrides = {}) {
  const cache = new Map()
  function load(filename) {
    filename = path.resolve(filename)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'")
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'module', 'exports', code)(name => {
      if (Object.hasOwn(overrides, name)) return overrides[name]
      if (name === '../../hooks/useAuthentication') return { useAuthentication: () => ({ user: { uid: 'gestor' } }) }
      if (name === '../../hooks/useEventCandidates') return { useEventCandidates: () => candidates }
      if (name === '../../hooks/useEventCollaboratorPhotos') return { useEventCollaboratorPhotos: people => people }
      if (name === '../appModal') return { __esModule: true, default: Modal }
      if (name === '../truncatedText') return { __esModule: true, default: ({ children }) => React.createElement('span', null, children) }
      if (name === '../../hooks/usePopupStepTransition') return { usePopupStepTransition: () => update => update() }
      if (name === '../../hooks/useAnimatedClose') return { useAnimatedClose: () => ({ closing: false, requestClose: done => done() }) }
      if (name === '../../hooks/useAnimatedResults') return { useAnimatedResults: (items, signature) => ({ items, signature, exiting: false }) }
      if (name === '../../components') return Object.fromEntries(['AppSidebar', 'AstroIcon', 'CompactPurpleButton', 'ConfirmationModal', 'ToolbarSearch', 'ToolbarSelect'].map(component => [component, component === 'AppSidebar' ? () => null : load(`src/components/${component[0].toLowerCase()}${component.slice(1)}/index.tsx`).default]))
      if (!name.startsWith('.')) return require(name)
      const resolved = path.resolve(path.dirname(filename), name)
      return load([`${resolved}.ts`, `${resolved}.tsx`, path.join(resolved, 'index.tsx')].find(p => fs.existsSync(p)))
    }, module, module.exports)
    return module.exports
  }
  return { load }
}
async function withDom(run) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/mainEventScreen' })
  const previous = { window: global.window, document: global.document, IS_REACT_ACT_ENVIRONMENT: global.IS_REACT_ACT_ENVIRONMENT, requestAnimationFrame: global.requestAnimationFrame }
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true
  const { createRoot } = require('react-dom/client')
  global.requestAnimationFrame = callback => { callback(); return 0 }
  dom.window.matchMedia = () => ({ matches: true })
  const root = createRoot(document.getElementById('root'))
  try { await run(root, dom) } finally { await act(async () => root.unmount()); dom.window.close(); Object.assign(global, previous) }
}
const click = async (label, within = document) => {
  const button = [...within.querySelectorAll('button')].find(item => item.textContent === label)
  assert.ok(button, `Botão ${label}`)
  await act(async () => button.click())
}
const person = { id: '11', name: 'Ana API', email: 'ana@example.test', unit: 'Unidade API', position: 'Analista', modality: 'Híbrido' }
const value = {
  creatorId: '7', draft: { title: 'Treinamento API', description: 'Descrição do treinamento', nr: '10', type: 'Evento', externalLink: '' },
  selectedIds: ['11'], groups: [{ id: '90', name: 'Turma API' }], assignments: { '11': '90' }, schedules: { '90': { date: '2099-11-05', startTime: '08:00', endTime: '12:00' } }, settings: { completion: 'collaborator', evidenceRequired: 'required' },
  permissions: { canEdit: true, canCancel: true, detailsEditable: true, lockedGroupIds: [] }, collaborators: [person],
}
const candidates = { collaborators: [person], nrs: [{ code: 10, title: 'Eletricidade' }], loading: false, error: '', retry() {} }

test('avatar usa foto real, cai para iniciais em falha e aceita uma nova foto', async () => withDom(async (root, dom) => {
  const Avatar = environment().load('src/components/eventCollaboratorAvatar/index.tsx').default
  const render = props => root.render(React.createElement(Avatar, { name: 'Ana Silva', ...props }))
  await act(async () => render({ photoUrl: 'https://images.example.test/ana.jpg' }))
  assert.equal(document.querySelector('img').getAttribute('src'), 'https://images.example.test/ana.jpg')
  assert.equal(document.querySelector('img').getAttribute('alt'), '')
  await act(async () => document.querySelector('img').dispatchEvent(new dom.window.Event('error')))
  assert.equal(document.querySelector('img'), null)
  assert.equal(document.querySelector('.event-create-avatar').textContent, 'AS')
  await act(async () => render({ photoUrl: 'https://images.example.test/ana-v2.jpg' }))
  assert.equal(document.querySelector('img').getAttribute('src'), 'https://images.example.test/ana-v2.jpg')
  await act(async () => render({ photoUrl: 'javascript:alert(1)', initials: 'AN' }))
  assert.equal(document.querySelector('img'), null)
  assert.equal(document.querySelector('.event-create-avatar').textContent, 'AN')
}))

test('seleção e grupos recebem a mesma foto do colaborador sem trocar a identidade', async () => withDom(async root => {
  const env = environment()
  const Participants = env.load('src/components/eventParticipantsModal/index.tsx').default
  const Groups = env.load('src/components/eventGroupsModal/index.tsx').default
  const photoPerson = { ...person, profilePhotoUrl: 'https://images.example.test/ana.jpg' }
  await act(async () => root.render(React.createElement(Participants, { collaborators: [photoPerson], nr: '10', selectedIds: ['11'], onBack() {}, onContinue() {}, onSelectionChange() {} })))
  assert.equal(document.querySelector('tbody .event-create-avatar img').getAttribute('src'), photoPerson.profilePhotoUrl)
  assert.match(document.querySelector('tbody').textContent, /Ana API/)
  await act(async () => root.render(React.createElement(Groups, { distributionVersion: 0, collaborators: [photoPerson], groups: value.groups, assignments: value.assignments, onAddGroup() {}, onAssign() {}, onBack() {}, onContinue() {}, onRandom() {}, onRemoveGroup() {}, onReset() {} })))
  assert.equal(document.querySelector('.event-create-person-chip .event-create-avatar img').getAttribute('src'), photoPerson.profilePhotoUrl)
  const GroupPeople = env.load('src/components/eventGroupCollaboratorsModal/index.tsx').default
  await act(async () => root.render(React.createElement(GroupPeople, { collaborators: [photoPerson], groupName: 'Turma API', participantIds: ['11'], onClose() {} })))
  assert.equal(document.querySelector('tbody .event-create-avatar img').getAttribute('src'), photoPerson.profilePhotoUrl)
  assert.match(document.querySelector('tbody').textContent, /Ana API/)
}))

test('informações oferecem somente NRs do catálogo filtrado e preservam NR histórica apenas na edição', async () => withDom(async root => {
  function Select({ id, value, options, disabled }) {
    return React.createElement('select', { id, value, disabled, onChange() {} }, options.map(option => React.createElement('option', { key: option.value, value: option.value }, option.label)))
  }
  const Information = environment({ '../toolbarSelect': { __esModule: true, default: Select } }).load('src/components/eventInformationModal/index.tsx').default
  const props = { draft: { ...value.draft, nr: '37' }, nrs: [{ code: 6, title: 'EPI' }, { code: 10, title: 'Eletricidade' }], onCancel() {}, onChange() {}, onContinue() {} }
  await act(async () => root.render(React.createElement(Information, props)))
  assert.deepEqual([...document.querySelectorAll('option')].map(option => option.value), ['', '6', '10'])
  assert.match(document.querySelector('[role=alert]').textContent, /NR destinada a colaboradores/)
  assert.equal([...document.querySelectorAll('button')].find(button => button.textContent === 'Continuar').disabled, true)
  await act(async () => root.render(React.createElement(Information, { ...props, editing: true })))
  assert.deepEqual([...document.querySelectorAll('option')].map(option => option.value), ['', '6', '10', '37'])
  assert.equal(document.getElementById('event-create-nr').disabled, true)
  assert.equal(document.querySelector('[role=alert]'), null)
}))

test('informações bloqueiam avanço vazio, focam o erro e liberam após corrigir os campos', async () => withDom(async (root, dom) => {
  const Information = environment().load('src/components/eventInformationModal/index.tsx').default
  let advances = 0
  function Host() {
    const [draft, setDraft] = React.useState({ ...value.draft, title: '', description: '', nr: '' })
    return React.createElement(Information, { draft, nrs: candidates.nrs, onChange: changes => setDraft(previous => ({ ...previous, ...changes })), onCancel() {}, onContinue() { advances++ } })
  }
  const fill = async (id, value) => act(async () => {
    const input = document.getElementById(`event-create-${id}`)
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value)
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
  })
  await act(async () => root.render(React.createElement(Host)))
  assert.equal(document.querySelector('[role=alert]'), null)
  await click('Continuar')
  assert.equal(advances, 0)
  assert.equal(document.querySelectorAll('[role=alert]').length, 2)
  assert.equal(document.activeElement.id, 'event-create-title')
  assert.equal(document.activeElement.getAttribute('aria-invalid'), 'true')
  assert.equal(document.activeElement.getAttribute('aria-describedby'), 'event-create-title-error')
  await fill('title', '   '); await fill('description', 'ab')
  await act(async () => document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })))
  assert.equal(advances, 0)
  await fill('title', 'Treinamento API')
  await click('Continuar')
  assert.equal(document.activeElement.id, 'event-create-description')
  await fill('description', 'Descrição válida')
  await fill('link', 'https://')
  await click('Continuar')
  assert.equal(advances, 0)
  assert.equal(document.activeElement.id, 'event-create-link')
  assert.match(document.querySelector('[role=alert]').textContent, /link HTTP\(S\) válido/)
  await fill('link', '')
  assert.equal(document.querySelector('[role=alert]'), null)
  await click('Continuar')
  assert.equal(advances, 1)
}))

test('participantes distinguem NR sem elegíveis de carregamento e impedem avançar sem seleção', async () => withDom(async root => {
  const Participants = environment().load('src/components/eventParticipantsModal/index.tsx').default
  let advances = 0
  const props = { collaborators: [], nr: '37', selectedIds: [], onBack() {}, onSelectionChange() {}, onContinue() { advances++ } }
  await act(async () => root.render(React.createElement(Participants, props)))
  assert.match(document.body.textContent, /Nenhum colaborador elegível para a NR 37/)
  assert.match(document.body.textContent, /associada aos cargos/)
  await click('Continuar'); assert.equal(advances, 0)
  await act(async () => root.render(React.createElement(Participants, { ...props, loading: true })))
  assert.match(document.body.textContent, /Carregando colaboradores elegíveis/)
  assert.doesNotMatch(document.body.textContent, /Nenhum colaborador elegível/)
}))

test('filtros e seleção permitem recuperar a lista e selecionar somente a unidade exata', async () => withDom(async (root, dom) => {
  function Select({ id, label, value, options, onValueChange }) {
    return React.createElement('select', { id, 'aria-label': label, value, onChange: event => onValueChange(event.target.value) }, options.map(option => React.createElement('option', { key: option.value, value: option.value }, option.label)))
  }
  const Participants = environment({ '../toolbarSelect': { __esModule: true, default: Select } }).load('src/components/eventParticipantsModal/index.tsx').default
  const people = [{ ...person, unit: 'Unidade 1' }, { ...person, id: '12', name: 'Bruno API', unit: 'Unidade 10', modality: 'Remoto' }]
  function Host() {
    const [selectedIds, onSelectionChange] = React.useState([])
    return React.createElement(Participants, { collaborators: people, nr: '6', selectedIds, onSelectionChange, onBack() {}, onContinue() {} })
  }
  const filter = async (id, value) => act(async () => {
    const select = document.getElementById(id); select.value = value
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }))
  })
  await act(async () => root.render(React.createElement(Host)))
  await filter('event-create-selected', 'selected')
  assert.match(document.body.textContent, /Nenhum colaborador selecionado/)
  await click('Limpar filtros')
  assert.equal(document.querySelectorAll('tbody tr').length, 2)
  await filter('event-create-unit', 'Unidade 1')
  assert.equal(document.querySelectorAll('tbody tr').length, 1)
  assert.match(document.querySelector('tbody').textContent, /Ana API/)
  await act(async () => document.querySelector('input[aria-label="Selecionar todos os colaboradores visíveis"]').click())
  await click('Limpar filtros')
  assert.equal(document.querySelector('input[aria-label="Selecionar Ana API"]').checked, true)
  assert.equal(document.querySelector('input[aria-label="Selecionar Bruno API"]').checked, false)
  assert.match(document.body.textContent, /1 colaborador selecionado de 2 elegíveis/)
  await filter('event-create-selected', 'selected')
  assert.equal(document.querySelectorAll('tbody tr').length, 1)
  await act(async () => document.querySelector('input[aria-label="Selecionar Ana API"]').click())
  assert.match(document.body.textContent, /Nenhum colaborador selecionado/)
  await click('Limpar filtros')
  assert.equal(document.querySelectorAll('tbody tr').length, 2)
}))

test('criação percorre as etapas, aguarda a API, preserva formulário no erro e impede envio duplicado', async () => withDom(async root => {
  const env = environment({ '../../hooks/useEventCandidates': { useEventCandidates: () => candidates } })
  const Flow = env.load('src/components/createEventFlowModal/index.tsx').default
  let request = deferred(), sends = 0, closes = 0
  await act(async () => root.render(React.createElement(Flow, { initialValue: value, managerId: '', onClose: () => { closes++ }, onSubmit: () => { sends++; return request.promise } })))
  assert.equal(document.querySelector('#event-create-title').value, 'Treinamento API')
  await click('Continuar')
  assert.match(document.body.textContent, /Ana API/)
  assert.doesNotMatch(document.body.textContent, /Kirk Hammett|Pedro Silva/)
  await click('Continuar'); await click('Continuar'); await click('Continuar'); await click('Continuar')
  await click('Criar evento')
  assert.equal(sends, 1); assert.equal(closes, 0)
  assert.match(document.querySelector('[role=status]').textContent, /Criando/)
  assert.equal([...document.querySelectorAll('button')].find(b => b.textContent === 'Criar evento').disabled, true)
  await click('Criar evento'); assert.equal(sends, 1)
  await act(async () => request.reject(Error('Participante não é elegível.')))
  assert.match(document.querySelector('[role=alert]').textContent, /não é elegível/)
  assert.match(document.body.textContent, /Treinamento API/); assert.equal(closes, 0)
  request = deferred(); await click('Criar evento'); assert.equal(sends, 2)
  await act(async () => request.resolve())
  assert.equal(closes, 1)
}))

test('edição confirma e aguarda PATCH; falha mantém confirmação aberta e sucesso fecha o fluxo', async () => withDom(async root => {
  const env = environment({ '../../hooks/useEventCandidates': { useEventCandidates: () => candidates } })
  const Flow = env.load('src/components/createEventFlowModal/index.tsx').default
  let sends = 0, closes = 0, request = deferred()
  await act(async () => root.render(React.createElement(Flow, { initialValue: value, mode: 'edit', managerId: '7', onClose: () => { closes++ }, onSubmit: () => { sends++; return request.promise } })))
  for (let step = 0; step < 5; step++) await click('Continuar')
  await click('Salvar alterações'); assert.equal(sends, 0)
  await click('Salvar'); assert.equal(sends, 1); assert.equal(closes, 0)
  await act(async () => request.reject(Error('Turma já iniciada.')))
  assert.ok(document.querySelector('[role=dialog]'))
  assert.ok(env.load('src/utils/actionFeedback.ts').getActionFeedback().notices.some(notice => /já iniciada/.test(notice.message) && notice.tone === 'error'))
  request = deferred(); await click('Salvar'); assert.equal(sends, 2)
  await act(async () => request.resolve())
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 80)) })
  assert.equal(closes, 1)
}))

test('salvar evento usa a API e mantém a notificação global após fechar o formulário', async () => withDom(async root => {
  let saves = 0, request = deferred()
  const result = { events: [], loading: false, error: '', retry() {}, details: { data: null, loading: false, error: '' }, retryDetails() {}, save: async (configuration, id) => {
    saves++; assert.equal(configuration, value); assert.equal(id, undefined)
    return request.promise
  } }
  function Editor({ onSubmit, onClose }) {
    return React.createElement('button', { onClick: async () => { await onSubmit(value); onClose() } }, 'Enviar evento de teste')
  }
  const env = environment({ '../../hooks/useEvents': { useEvents: () => result }, '../../components/createEventFlowModal': { __esModule: true, default: Editor } })
  const Page = env.load('src/pages/mainEventScreen/index.tsx').default
  await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(Page))))
  await click('Criar evento'); await click('Enviar evento de teste')
  assert.equal(saves, 1)
  assert.ok(document.body.textContent.includes('Enviar evento de teste'))
  await act(async () => request.resolve({ id: 42, eventClasses: [{ startDate: '2099-11-05T08:00:00' }] }))
  assert.doesNotMatch(document.body.textContent, /Enviar evento de teste/)
  assert.ok(env.load('src/utils/actionFeedback.ts').getActionFeedback().notices.some(notice => /Treinamento API criado com sucesso/.test(notice.message)))
}))

test('calendário carrega dados da API, protege ações por permissão e envia justificativa na inativação', async () => withDom(async (root, dom) => {
  const today = new Date(), iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  let reason, cancelRequest = deferred()
  const row = { id: '42:90:' + iso, eventId: '42', category: 'event', title: 'Treinamento API', date: iso, startTime: '08:00', endTime: '12:00', status: 'ATIVO' }
  const result = { events: [row], loading: false, error: '', retry() {}, retryDetails() {}, details: { data: { canEdit: false, canCancel: false }, loading: false, error: '' }, save() {}, cancel: async (_id, text) => { reason = text; return cancelRequest.promise } }
  const context = { user: { uid: 'gestor' } }
  const env = environment({ '../../hooks/useAuthentication': { useAuthentication: () => context }, '../../hooks/useEvents': { useEvents: () => result, detailedCalendarEvent: entry => ({ ...entry, configuration: value }) } })
  const Page = env.load('src/pages/mainEventScreen/index.tsx').default
  const render = () => root.render(React.createElement(MemoryRouter, null, React.createElement(Page)))
  await act(async () => render())
  const eventButton = document.querySelector('.event-calendar-item--event')
  await act(async () => eventButton.click())
  assert.equal(document.querySelector('[role=menuitem]:nth-child(3)').getAttribute('aria-disabled'), 'true')
  const inactive = [...document.querySelectorAll('[role=menuitem]')].find(b => b.textContent === 'Inativar')
  assert.equal(inactive.getAttribute('aria-disabled'), 'true')
  await click('Inativar'); assert.equal(document.querySelector('[role=dialog]'), null)
  result.details.data = { canEdit: true, canCancel: true }; await act(async () => render())
  await click('Inativar')
  const input = document.getElementById('event-cancellation-reason')
  assert.ok(input); assert.equal(document.querySelector('label[for=event-cancellation-reason]').textContent, 'Justificativa')
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set.call(input, 'Reagendamento solicitado')
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
  })
  await click('Inativar', document.querySelector('[role=dialog]'))
  assert.equal(reason, 'Reagendamento solicitado')
  await act(async () => cancelRequest.reject(Error('Sem permissão.')))
  assert.ok(document.querySelector('[role=dialog]'))
  assert.ok(env.load('src/utils/actionFeedback.ts').getActionFeedback().notices.some(notice => /Sem permissão/.test(notice.message) && notice.tone === 'error'))
  cancelRequest = deferred(); await click('Inativar', document.querySelector('[role=dialog]'))
  await act(async () => cancelRequest.resolve())
  assert.equal(document.querySelector('[role=dialog]'), null)
  const feedback = env.load('src/utils/actionFeedback.ts').getActionFeedback()
  assert.ok(feedback.notices.some(notice => /inativado/.test(notice.message) && notice.tone === 'success'))
  await act(async () => document.querySelector('.event-calendar-item--event').click())
  await click('Ver informações')
  assert.ok(document.querySelector('[role=dialog]'))
  context.user = { uid: 'outro-gestor' }; await act(async () => render())
  assert.equal(document.querySelector('[role=dialog]'), null)
}))
