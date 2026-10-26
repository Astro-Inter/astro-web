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
const candidates = { collaborators: [person], nrs: [{ code: 10, title: 'Eletricidade' }], loading: false, nrsLoading: false, error: '', retry() {} }

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
  const titleError = document.getElementById('event-create-title-error')
  assert.ok(titleError.matches('p.login-field-error'))
  assert.equal(titleError.previousElementSibling.id, 'event-create-title')
  assert.ok(titleError.parentElement.classList.contains('event-create-field'))
  assert.equal(document.activeElement.getAttribute('aria-invalid'), 'true')
  assert.equal(document.activeElement.getAttribute('aria-describedby'), 'event-create-title-error')
  await fill('title', '   '); await fill('description', 'ab')
  assert.equal(document.querySelector('[role=alert]'), null)
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
  assert.match(document.querySelector('[role=alert]').textContent, /Selecione pelo menos um colaborador/)
  assert.equal(document.activeElement.getAttribute('aria-label'), 'Colaboradores disponíveis')
  await act(async () => root.render(React.createElement(Participants, { ...props, loading: true })))
  assert.match(document.body.textContent, /Carregando colaboradores elegíveis/)
  assert.doesNotMatch(document.body.textContent, /Nenhum colaborador elegível/)
  assert.equal(document.querySelectorAll('tbody .api-loading-row').length, 5)
  assert.equal(document.querySelector('.event-create-filters').hidden, true)
  assert.equal(document.querySelectorAll('.event-participants-filters-skeleton .api-loading-field').length, 4)
  assert.equal(document.querySelector('tbody').getAttribute('aria-hidden'), 'true')
  assert.equal(document.querySelector('.event-create-table-shell').getAttribute('aria-busy'), 'true')
  assert.equal([...document.querySelectorAll('button')].find(button => button.textContent === 'Voltar').disabled, false)
  await act(async () => root.render(React.createElement(Participants, { ...props, collaborators: [person], loading: false })))
  assert.equal(document.querySelector('.api-loading-row'), null)
  assert.match(document.querySelector('tbody').textContent, /Ana API/)
}))

test('calendário carrega no próprio layout em mês, semana e ano, sem expor eventos antigos', async () => withDom(async root => {
  const Calendar = environment().load('src/components/eventCalendar/index.tsx').default
  const event = { id: '1', title: 'Evento anterior', category: 'event', date: '2099-11-05', startTime: '08:00', endTime: '09:00' }
  let navigations = 0
  const props = { events: [event], month: new Date(2099, 10, 5), loading: true, selectedEventId: null, onMonthChange() { navigations++ }, onOpenOptions() {} }
  for (const view of ['month', 'week', 'year']) {
    await act(async () => root.render(React.createElement(Calendar, { ...props, view })))
    assert.equal(document.querySelector('.event-calendar-panel').getAttribute('aria-busy'), 'true')
    assert.ok(document.querySelector('.api-skeleton'))
    assert.equal(document.querySelector('[data-track-item]'), null)
    assert.match(document.querySelector('[role=status]').textContent, /Carregando eventos/)
    assert.ok(document.querySelector('.event-calendar-heading h2').textContent)
    assert.equal(document.querySelector('.event-calendar-scroll').scrollTop, 0)
    await act(async () => document.querySelector('.event-month-arrow--next').click())
    document.querySelector('.event-calendar-scroll').scrollTop = 150
  }
  assert.equal(navigations, 3)
  await act(async () => root.render(React.createElement(Calendar, { ...props, view: 'month', loading: false })))
  assert.equal(document.querySelector('.api-skeleton'), null)
  assert.match(document.querySelector('.event-calendar-item').textContent, /Evento anterior/)
  assert.ok(document.querySelector('.event-calendar-item.event-loading-ready'))
  assert.equal(document.querySelector('.event-calendar-scroll').classList.contains('event-loading-ready'), false)
  assert.equal(document.querySelector('.event-calendar-panel').getAttribute('aria-busy'), 'false')
}))

test('popup carrega o bloco inteiro de campos, preserva valores e mantém as ações visíveis', async () => withDom(async root => {
  const Information = environment().load('src/components/eventInformationModal/index.tsx').default
  const props = { draft: value.draft, nrs: [], onCancel() {}, onChange() {}, onContinue() {} }
  await act(async () => root.render(React.createElement(Information, { ...props, loading: true })))
  assert.equal(document.getElementById('event-create-title').value, value.draft.title)
  assert.equal(document.getElementById('event-create-description').value, value.draft.description)
  assert.equal(document.querySelector('.event-create-fields').hidden, true)
  assert.equal(document.querySelectorAll('.api-skeleton-control').length, 4)
  assert.equal(document.querySelectorAll('.api-skeleton-label').length, 4)
  assert.equal([...document.querySelectorAll('button')].find(button => button.textContent === 'Continuar').disabled, true)
  assert.equal([...document.querySelectorAll('button')].find(button => button.textContent === 'Cancelar').disabled, false)
  await act(async () => root.render(React.createElement(Information, { ...props, unavailable: true })))
  assert.equal(document.querySelector('.api-skeleton'), null)
  assert.equal(document.querySelector('.event-create-fields').hidden, false)
  assert.equal(document.getElementById('event-create-title').value, value.draft.title)
  assert.equal([...document.querySelectorAll('button')].find(button => button.textContent === 'Continuar').disabled, true)
}))

test('atualizar elegíveis mantém o formulário pronto e mostra skeleton só na etapa de participantes', async () => withDom(async root => {
  const env = environment({ '../../hooks/useEventCandidates': { useEventCandidates: () => ({ ...candidates, loading: true, nrsLoading: false }) } })
  const Flow = env.load('src/components/createEventFlowModal/index.tsx').default
  await act(async () => root.render(React.createElement(Flow, { initialValue: value, managerId: '', onClose() {}, onSubmit: async () => {} })))
  assert.equal(document.querySelector('.event-create-fields').hidden, false)
  assert.equal(document.querySelector('.event-create-fields-skeleton'), null)
  assert.equal(document.getElementById('event-create-title').value, value.draft.title)
  await click('Continuar')
  assert.equal(document.querySelectorAll('tbody .api-loading-row').length, 5)
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
  await click('Continuar')
  assert.match(document.querySelector('[role=alert]').textContent, /Selecione pelo menos um colaborador/)
  await filter('event-create-selected', 'selected')
  assert.match(document.body.textContent, /Nenhum colaborador selecionado/)
  assert.equal([...document.querySelectorAll('button')].some(button => button.textContent === 'Limpar filtros'), false)
  await filter('event-create-selected', '')
  assert.equal(document.querySelectorAll('tbody tr').length, 2)
  await filter('event-create-unit', 'Unidade 1')
  assert.equal(document.querySelectorAll('tbody tr').length, 1)
  assert.match(document.querySelector('tbody').textContent, /Ana API/)
  await act(async () => document.querySelector('input[aria-label="Selecionar todos os colaboradores visíveis"]').click())
  assert.equal(document.querySelector('[role=alert]'), null)
  await filter('event-create-unit', '')
  assert.equal(document.querySelector('input[aria-label="Selecionar Ana API"]').checked, true)
  assert.equal(document.querySelector('input[aria-label="Selecionar Bruno API"]').checked, false)
  assert.match(document.body.textContent, /1 colaborador selecionado de 2 elegíveis/)
  await filter('event-create-selected', 'selected')
  assert.equal(document.querySelectorAll('tbody tr').length, 1)
  await act(async () => document.querySelector('input[aria-label="Selecionar Ana API"]').click())
  assert.match(document.body.textContent, /Nenhum colaborador selecionado/)
  await filter('event-create-selected', '')
  assert.equal(document.querySelectorAll('tbody tr').length, 2)
}))

test('configurações validam os dois selects no padrão de campo, focam o erro e liberam ao corrigir', async () => withDom(async (root, dom) => {
  function Select({ id, value, options, onValueChange, error }) {
    return React.createElement('select', { id, value, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-error` : undefined, onChange: event => onValueChange(event.target.value) }, options.map(option => React.createElement('option', { key: option.value, value: option.value }, option.label)))
  }
  const Settings = environment({ '../toolbarSelect': { __esModule: true, default: Select } }).load('src/components/eventSettingsModal/index.tsx').default
  let advances = 0
  function Host() {
    const [settings, setSettings] = React.useState({ completion: '', evidenceRequired: '' })
    return React.createElement(Settings, { settings, onBack() {}, onChange: changes => setSettings(current => ({ ...current, ...changes })), onContinue() { advances++ } })
  }
  const select = async (id, value) => act(async () => { const input = document.getElementById(id); input.value = value; input.dispatchEvent(new dom.window.Event('change', { bubbles: true })) })
  await act(async () => root.render(React.createElement(Host)))
  assert.equal(document.querySelector('[role=alert]'), null)
  await click('Continuar')
  assert.equal(advances, 0)
  assert.equal(document.querySelectorAll('.login-field-error[role=alert]').length, 2)
  assert.equal(document.activeElement.id, 'event-completion')
  assert.equal(document.activeElement.getAttribute('aria-describedby'), 'event-completion-error')
  await select('event-completion', 'manager'); await click('Continuar')
  assert.equal(document.activeElement.id, 'event-evidence')
  await select('event-evidence', 'optional'); await click('Continuar')
  assert.equal(advances, 1)
  assert.equal(document.querySelector('[role=alert]'), null)
}))

test('grupos exigem distribuição completa e pelo menos um participante em cada grupo', async () => withDom(async (root, dom) => {
  function Select({ label, value, options, onValueChange }) {
    return React.createElement('select', { 'aria-label': label, value, onChange: event => onValueChange(event.target.value) }, options.map(option => React.createElement('option', { key: option.value, value: option.value }, option.label)))
  }
  const Groups = environment({ '../toolbarSelect': { __esModule: true, default: Select } }).load('src/components/eventGroupsModal/index.tsx').default
  let advances = 0
  const people = [person, { ...person, id: '12', name: 'Bruno API' }]
  function Host() {
    const [assignments, setAssignments] = React.useState({})
    return React.createElement(Groups, { distributionVersion: 0, collaborators: people, groups: [...value.groups, { id: '91', name: 'Grupo 2' }], assignments, onAssign: (id, group) => setAssignments(current => ({ ...current, [id]: group })), onBack() {}, onContinue() { advances++ }, onAddGroup() {}, onRandom() {}, onRemoveGroup() {}, onReset() {} })
  }
  const move = async (name, group) => act(async () => { const select = document.querySelector(`select[aria-label="Mover ${name} para o grupo"]`); select.value = group; select.dispatchEvent(new dom.window.Event('change', { bubbles: true })) })
  await act(async () => root.render(React.createElement(Host)))
  assert.equal(document.querySelector('[role=alert]'), null)
  await click('Continuar')
  assert.equal(advances, 0)
  assert.equal(document.activeElement.dataset.groupId, '')
  assert.equal(document.querySelectorAll('.login-field-error[role=alert]').length, 3)
  await move('Ana API', '90'); await move('Bruno API', '90'); await click('Continuar')
  assert.equal(advances, 0)
  assert.equal(document.activeElement.dataset.groupId, '91')
  assert.equal(document.querySelectorAll('[role=alert]').length, 1)
  await move('Bruno API', '91'); await click('Continuar')
  assert.equal(advances, 1)
  assert.equal(document.querySelector('[role=alert]'), null)
}))

test('programação exige datas e horários válidos e aceita término no dia seguinte', async () => withDom(async root => {
  function Picker({ id, value, error, onChange }) { return React.createElement('input', { id, value, onChange: event => onChange(event.target.value), 'aria-invalid': !!error }) }
  const Schedule = environment({ '../formDatePicker': { __esModule: true, default: Picker }, '../eventTimePicker': { __esModule: true, default: Picker } }).load('src/components/eventGroupScheduleModal/index.tsx').default
  let advances = 0, update
  function Host() {
    const [schedules, setSchedules] = React.useState({})
    update = schedule => setSchedules({ '90': schedule })
    return React.createElement(Schedule, { groups: value.groups, assignments: value.assignments, schedules, onChange() {}, onBack() {}, onContinue() { advances++ } })
  }
  await act(async () => root.render(React.createElement(Host)))
  await click('Continuar')
  assert.equal(advances, 0)
  assert.equal(document.activeElement.id, 'event-date-90')
  assert.equal(document.querySelectorAll('input[aria-invalid=true]').length, 4)
  await act(async () => update({ date: '2099-11-05', startTime: '10:00', endTime: '09:00' }))
  await click('Continuar')
  assert.equal(document.activeElement.id, 'event-end-90')
  assert.match(document.querySelector('[role=alert]').textContent, /posterior/)
  await act(async () => update({ date: '2099-11-05', endDate: '2099-11-06', startTime: '10:00', endTime: '09:00' }))
  await click('Continuar')
  assert.equal(advances, 1)
  assert.equal(document.querySelector('[role=alert]'), null)
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
  assert.equal(env.load('src/utils/actionFeedback.ts').getActionFeedback().pending, 1)
  assert.doesNotMatch(document.body.textContent, /Criando evento/)
  assert.equal([...document.querySelectorAll('button')].find(b => b.textContent === 'Criar evento').disabled, true)
  await click('Criar evento'); assert.equal(sends, 1)
  await act(async () => request.reject(Error('Participante não é elegível.')))
  assert.equal(env.load('src/utils/actionFeedback.ts').getActionFeedback().pending, 0)
  assert.equal(document.querySelector('[role=alert]'), null)
  assert.ok(env.load('src/utils/actionFeedback.ts').getActionFeedback().notices.some(notice => /não é elegível/.test(notice.message) && notice.tone === 'error'))
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
  assert.equal(document.querySelector('[role=menuitem]:nth-child(3)').getAttribute('aria-disabled'), null)
  assert.equal(document.querySelector('[role=menu] .api-skeleton'), null)
  const inactive = [...document.querySelectorAll('[role=menuitem]')].find(b => b.textContent === 'Inativar')
  assert.equal(inactive.getAttribute('aria-disabled'), null)
  await click('Inativar')
  assert.match(document.querySelector('[role=alert]').textContent, /não tem permissão/)
  assert.equal(document.getElementById('event-cancellation-reason'), null)
  assert.equal(reason, undefined)
  await click('Cancelar', document.querySelector('[role=dialog]'))
  result.details.data = { canEdit: true, canCancel: true }; await act(async () => render())
  await act(async () => eventButton.click())
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


test('skeleton faz saída antes dos dados e uma nova leitura cancela a saída anterior', async () => withDom(async (root, dom) => {
  dom.window.matchMedia = () => ({ matches: false })
  const Calendar = environment().load('src/components/eventCalendar/index.tsx').default
  const props = { month: new Date(2026, 9, 23), view: 'year', events: [], selectedEventId: null, onMonthChange() {}, onOpenOptions() {} }
  const render = loading => act(async () => root.render(React.createElement(Calendar, { ...props, loading })))
  await render(true)
  assert.equal(document.querySelectorAll('.event-year-month').length, 12)
  assert.equal(document.querySelectorAll('.event-year-skeleton-day').length, 365)
  await render(false)
  assert.ok(document.querySelector('.event-loading-exit .api-skeleton'))
  assert.equal(document.querySelector('section').getAttribute('aria-busy'), 'true')
  await render(true)
  await act(async () => new Promise(resolve => dom.window.setTimeout(resolve, 220)))
  assert.ok(document.querySelector('.api-skeleton'))
  assert.equal(document.querySelector('.event-loading-exit'), null)
  await render(false)
  await act(async () => new Promise(resolve => dom.window.setTimeout(resolve, 220)))
  assert.equal(document.querySelector('.api-skeleton'), null)
  assert.ok(document.querySelector('.event-loading-ready'))
  assert.equal(document.querySelector('section').getAttribute('aria-busy'), 'false')
}))

test('erro sai com animação sem manter alerta ou descrição de campo já corrigido', async () => withDom(async (root, dom) => {
  dom.window.matchMedia = () => ({ matches: false })
  const Participants = environment().load('src/components/eventParticipantsModal/index.tsx').default
  const props = { collaborators: [person], nr: '', selectedIds: [], onBack() {}, onContinue() {}, onSelectionChange() {} }
  await act(async () => root.render(React.createElement(Participants, props)))
  await click('Continuar')
  assert.ok(document.querySelector('[role=alert]'))
  assert.equal(document.querySelector('.event-create-table-shell--invalid'), null)
  await act(async () => root.render(React.createElement(Participants, { ...props, selectedIds: ['11'] })))
  assert.equal(document.querySelector('[role=alert]'), null)
  assert.equal(document.querySelector('[aria-label="Colaboradores disponíveis"]').getAttribute('aria-describedby'), null)
  assert.ok(document.querySelector('.event-field-error--exiting[aria-hidden=true]'))
  await act(async () => new Promise(resolve => dom.window.setTimeout(resolve, 220)))
  assert.equal(document.querySelector('.event-field-error--exiting'), null)
}))

test('preferência de movimento reduzido da conta dispensa a espera da saída', async () => withDom(async (root, dom) => {
  dom.window.matchMedia = () => ({ matches: false })
  document.documentElement.dataset.astroReducedMotion = 'true'
  const Information = environment().load('src/components/eventInformationModal/index.tsx').default
  const props = { draft: value.draft, nrs: candidates.nrs, onCancel() {}, onChange() {}, onContinue() {} }
  await act(async () => root.render(React.createElement(Information, { ...props, loading: true })))
  await act(async () => root.render(React.createElement(Information, { ...props, loading: false })))
  assert.equal(document.querySelector('.api-skeleton'), null)
  assert.equal(document.querySelector('.event-loading-exit'), null)
  assert.equal(document.getElementById('event-create-title').value, value.draft.title)
  assert.equal(document.querySelector('.event-create-fields').hidden, false)
}))


test('chegada de dados mantém o calendário montado e navegação continua animando o período anterior', async () => withDom(async (root, dom) => {
  dom.window.matchMedia = () => ({ matches: false })
  const env = environment()
  const { useAnimatedResults } = env.load('src/hooks/useAnimatedResults.ts')
  const Calendar = env.load('src/components/eventCalendar/index.tsx').default
  function Host({ loading, period = 9 }) {
    const items = React.useMemo(() => [{ month: new Date(2026, period, 23), loading }], [loading, period])
    const result = useAnimatedResults(items, `${period}|${loading}`, period, 'month', true, loading)
    const displayed = result.items[0]
    return React.createElement('div', { 'data-exiting': result.exiting }, React.createElement(Calendar, { ...displayed, view: 'month', events: [], selectedEventId: null, onMonthChange() {}, onOpenOptions() {} }))
  }
  await act(async () => root.render(React.createElement(Host, { loading: true })))
  const panel = document.querySelector('.event-calendar-panel')
  const dayCount = document.querySelectorAll('.event-calendar-day-number').length
  await act(async () => root.render(React.createElement(Host, { loading: false })))
  assert.equal(document.querySelector('.event-calendar-panel'), panel)
  assert.equal(document.querySelector('[data-exiting]').getAttribute('data-exiting'), 'false')
  const scroll = document.querySelector('.event-calendar-scroll')
  assert.equal(scroll.classList.contains('event-loading-exit'), false)
  assert.ok(document.querySelector('.event-calendar-table .api-skeleton.event-loading-exit'))
  assert.equal(document.querySelectorAll('.event-calendar-table thead th').length, 7)
  assert.equal(document.querySelectorAll('.event-calendar-day-number').length, dayCount)
  await act(async () => new Promise(resolve => dom.window.setTimeout(resolve, 220)))
  assert.equal(document.querySelector('.api-skeleton'), null)
  await act(async () => root.render(React.createElement(Host, { loading: false, period: 10 })))
  assert.equal(document.querySelector('[data-exiting]').getAttribute('data-exiting'), 'true')
  assert.match(document.querySelector('h2').textContent, /OUTUBRO/)
  await act(async () => new Promise(resolve => dom.window.setTimeout(resolve, 220)))
  assert.match(document.querySelector('h2').textContent, /NOVEMBRO/)
}))


test('semana preenche todos os horários e mostra os eventos durante a saída do skeleton', async () => withDom(async (root, dom) => {
  dom.window.matchMedia = () => ({ matches: false })
  const measure = dom.window.HTMLElement.prototype.getBoundingClientRect
  dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
    return this.matches('.event-week-table tbody tr') ? { height: 100 } : measure.call(this)
  }
  const Calendar = environment().load('src/components/eventCalendar/index.tsx').default
  const month = new Date(2026, 9, 23)
  const event = { id: 'late', title: 'Evento noturno', date: '2026-10-23', category: 'event', startTime: '22:00', endTime: '23:00' }
  const props = { month, view: 'week', selectedEventId: null, onMonthChange() {}, onOpenOptions() {} }
  await act(async () => root.render(React.createElement(Calendar, { ...props, events: [], loading: true })))
  const scroll = document.querySelector('.event-calendar-scroll')
  assert.equal(scroll.scrollTop, 800)
  for (const cell of document.querySelectorAll('.event-week-table tbody td')) assert.ok(cell.querySelector('.api-skeleton'))
  scroll.scrollTop = 2200
  assert.ok(document.querySelectorAll('.event-week-table tbody tr')[22].querySelector('.api-skeleton'))
  await act(async () => root.render(React.createElement(Calendar, { ...props, events: [event], loading: false })))
  assert.equal(scroll.scrollTop, 2100)
  assert.equal(scroll.classList.contains('event-loading-exit'), false)
  assert.ok(document.querySelector('.event-week-cell-skeleton.event-loading-exit'))
  assert.ok(document.querySelectorAll('.event-week-table tbody tr')[22].querySelector('button'))
  assert.equal(document.querySelector('.event-calendar-panel').getAttribute('aria-busy'), 'false')
  await act(async () => new Promise(resolve => dom.window.setTimeout(resolve, 220)))
  assert.equal(scroll.scrollTop, 2100)
  assert.equal(document.querySelector('.api-skeleton'), null)
  assert.ok(document.querySelectorAll('.event-week-table tbody tr')[22].querySelector('button'))
  assert.equal(scroll.classList.contains('event-loading-ready'), false)
}))


test('semana preserva rolagem manual durante a leitura, atualizações e recarga do mesmo período', async () => withDom(async (root, dom) => {
  const Calendar = environment().load('src/components/eventCalendar/index.tsx').default
  const month = new Date(2026, 9, 23)
  const event = { id: 'late', title: 'Evento noturno', date: '2026-10-23', category: 'event', startTime: '22:00', endTime: '23:00' }
  const props = { month, view: 'week', selectedEventId: null, onMonthChange() {}, onOpenOptions() {} }
  await act(async () => root.render(React.createElement(Calendar, { ...props, events: [], loading: true })))
  const scroll = document.querySelector('.event-calendar-scroll')
  scroll.scrollTop = 1234
  await act(async () => scroll.dispatchEvent(new dom.window.Event('wheel', { bubbles: true })))
  await act(async () => root.render(React.createElement(Calendar, { ...props, events: [event], loading: false })))
  assert.equal(scroll.scrollTop, 1234)
  await act(async () => root.render(React.createElement(Calendar, { ...props, events: [{ ...event, title: 'Evento atualizado' }], loading: false })))
  assert.equal(scroll.scrollTop, 1234)
  await act(async () => root.render(React.createElement(Calendar, { ...props, events: [], loading: true })))
  assert.equal(scroll.scrollTop, 1234)
  await act(async () => root.render(React.createElement(Calendar, { ...props, events: [event], loading: false })))
  assert.equal(scroll.scrollTop, 1234)
}))


test('menu não consulta detalhes; cada opção abre seu próprio skeleton e valida permissão antes de agir', async () => withDom(async root => {
  const today = new Date(), iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const row = { id: '42:90:' + iso, eventId: '42', category: 'event', title: 'Treinamento API', date: iso, startTime: '08:00', endTime: '12:00', status: 'ATIVO' }
  let requestedId, retries = 0, mutations = 0
  const result = { events: [row], loading: false, error: '', retry() {}, retryDetails() { retries++ }, details: { data: null, loading: true, error: '' }, save() { mutations++ }, cancel() { mutations++ } }
  const env = environment({ '../../hooks/useEvents': { useEvents: (_month, _view, id) => { requestedId = id; return result }, detailedCalendarEvent: entry => ({ ...entry, configuration: value }) } })
  const Page = env.load('src/pages/mainEventScreen/index.tsx').default
  for (const label of ['Ver informações', 'Editar', 'Inativar']) {
    result.details = { data: null, loading: true, error: '' }
    const render = () => root.render(React.createElement(MemoryRouter, { key: label }, React.createElement(Page)))
    await act(async () => render())
    await act(async () => document.querySelector('.event-calendar-item--event').click())
    assert.equal(requestedId, undefined)
    assert.equal(document.querySelector('[role=menu] .api-skeleton'), null)
    assert.match(document.querySelector('[role=menu]').textContent, /Ver informaçõesEditarInativar/)
    await click(label)
    assert.equal(requestedId, '42')
    assert.equal(document.querySelector('[role=menu]'), null)
    assert.ok(document.querySelector('[role=dialog] .api-skeleton'))
    assert.equal(mutations, 0)
    assert.equal(document.querySelectorAll('[role=dialog] .astro-modal-actions .api-skeleton').length, 0)
    result.details = { data: null, loading: false, error: 'Falha ao carregar evento.' }
    await act(async () => render())
    assert.match(document.querySelector('[role=alert]').textContent, /Falha ao carregar/)
    await click('Tentar novamente')
    assert.equal(retries, ['Ver informações', 'Editar', 'Inativar'].indexOf(label) + 1)
    result.details = { data: { canEdit: false, canCancel: false }, loading: false, error: '' }
    await act(async () => render())
    if (label === 'Ver informações') assert.match(document.querySelector('[role=dialog]').textContent, /Treinamento API/)
    else {
      assert.match(document.querySelector('[role=alert]').textContent, /não tem permissão/)
      assert.equal(document.querySelector('[role=dialog] textarea'), null)
      assert.equal(document.querySelector('[role=dialog] input'), null)
    }
    assert.equal(mutations, 0)
  }
}))
