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
      if (name.startsWith('./use')) { const alias = '../../hooks/' + name.slice(2); if (Object.hasOwn(overrides, alias)) return overrides[alias] }
      if (name === '../../hooks/useAuthentication') return { useAuthentication: () => ({ user: { uid: 'gestor' } }) }
      if (name.endsWith('/useEventCandidates')) return { useEventCandidates: () => candidates }
      if (name.endsWith('/useEventCollaboratorPhotos')) return { useEventCollaboratorPhotos: people => people }
      if (name === '../appModal') return { __esModule: true, default: Modal }
      if (name === '../truncatedText') return { __esModule: true, default: ({ children }) => React.createElement('span', null, children) }
      if (name.endsWith('/usePopupStepTransition')) return { usePopupStepTransition: () => update => update() }
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
  assert.ok(document.querySelector('.event-create-random-trigger .astro-icon--dice'))
  assert.match(document.querySelector('.event-create-random-trigger .astro-icon--dice').getAttribute('src'), /^\/icons\/dicePairBold\.svg\?v=/)
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
    const scroll = document.querySelector('.event-calendar-scroll')
    assert.equal(scroll.scrollTop, 0)
    assert.equal(scroll.tabIndex, 0)
    assert.equal(scroll.getAttribute('role'), 'region')
    assert.match(scroll.getAttribute('aria-label'), /^Conteúdo do calendário de /)
    scroll.focus()
    assert.equal(document.activeElement, scroll)
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
  const people = [{ ...person, unit: 'Unidade 1' }, { ...person, id: '12', name: 'Bruno API', email: 'bruno@example.test', unit: 'Unidade 10', modality: 'Remoto' }]
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
  const search = async value => act(async () => {
    const input = document.getElementById('event-create-search')
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value)
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
  })
  await search('ausente')
  assert.match(document.body.textContent, /Nenhum colaborador corresponde/)
  assert.equal([...document.querySelectorAll('button')].some(button => button.textContent === 'Limpar filtros'), false)
  await search('')
  assert.equal(document.querySelectorAll('tbody tr').length, 2)
  await search('bruno@example.test')
  assert.equal(document.querySelectorAll('tbody tr').length, 1)
  assert.match(document.querySelector('tbody').textContent, /Bruno API/)
  await search('')
  await filter('event-create-unit', 'Unidade 1')
  assert.equal(document.querySelectorAll('tbody tr').length, 1)
  assert.match(document.querySelector('tbody').textContent, /Ana API/)
  await act(async () => document.querySelector('input[aria-label="Selecionar todos os colaboradores visíveis"]').click())
  assert.equal(document.querySelector('[role=alert]'), null)
  await filter('event-create-unit', '')
  assert.equal(document.querySelector('input[aria-label="Selecionar Ana API"]').checked, true)
  assert.equal(document.querySelector('input[aria-label="Selecionar Bruno API"]').checked, false)
  assert.match(document.body.textContent, /1 colaborador selecionado de 2 elegíveis/)
  await search('ana')
  assert.equal(document.querySelectorAll('tbody tr').length, 1)
  await act(async () => document.querySelector('input[aria-label="Selecionar Ana API"]').click())
  assert.equal(document.querySelector('input[aria-label="Selecionar Ana API"]').checked, false)
  await search('')
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
    React.useLayoutEffect(() => { update = schedule => setSchedules({ '90': schedule }) }, [])
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

test('programação valida e remove erros durante a edição, sem clicar em continuar', async () => withDom(async root => {
  const controls = new Map()
  function Picker(props) {
    controls.set(props.id, props)
    return React.createElement('input', { id: props.id, value: props.value, readOnly: true, 'aria-invalid': !!props.error })
  }
  const Schedule = environment({ '../formDatePicker': { __esModule: true, default: Picker }, '../eventTimePicker': { __esModule: true, default: Picker } }).load('src/components/eventGroupScheduleModal/index.tsx').default
  let advances = 0
  function Host() {
    const [schedules, setSchedules] = React.useState({})
    return React.createElement(Schedule, { groups: value.groups, assignments: value.assignments, schedules, onChange: (id, changes) => setSchedules(current => ({ ...current, [id]: { ...(current[id] || { date: '', startTime: '', endTime: '' }), ...changes } })), onBack() {}, onContinue() { advances++ } })
  }
  const change = async (field, value) => act(async () => controls.get(`event-${field}-90`).onChange(value))
  await act(async () => root.render(React.createElement(Host)))
  assert.equal(document.querySelectorAll('[aria-invalid=true]').length, 0)
  await change('start', '01:30'); await change('end', '00:00')
  assert.match(controls.get('event-end-90').error, /posterior ao horário de início/)
  assert.match(document.querySelector('[role=alert]').textContent, /posterior/)
  await change('end', '02:00')
  assert.equal(controls.get('event-end-90').error, undefined)
  await change('date', '2020-01-01')
  assert.match(controls.get('event-date-90').error, /anterior ao dia atual/)
  await change('date', '2099-11-05'); await change('start', '10:00'); await change('end', '09:00')
  assert.equal(controls.get('event-date-90').error, undefined)
  assert.match(document.querySelector('[role=alert]').textContent, /posterior/)
  await change('start', '08:00')
  assert.equal(document.querySelector('[role=alert]'), null)
  await change('end-date', '2099-11-04')
  assert.match(controls.get('event-end-date-90').error, /igual ou posterior/)
  await change('end-date', '2099-11-06')
  await act(async () => controls.get('event-end-date-90').onValidityChange(false))
  await click('Continuar'); assert.equal(advances, 0)
  assert.equal(document.activeElement.id, 'event-end-date-90')
  await act(async () => controls.get('event-end-date-90').onValidityChange(true))
  await click('Continuar'); assert.equal(advances, 1)
}))

test('criação limita grupos manuais e aleatórios ao total de participantes, inclusive chamadas diretas', async () => withDom(async root => {
  const env = environment()
  const { useEventCreationFlow } = env.load('src/hooks/useEventCreationFlow.ts')
  let flow
  function Host() {
    const current = useEventCreationFlow({ initialValue: { ...value, selectedIds: ['11', '12'] }, managerId: '7', mode: 'create', onSubmit: async () => {} })
    React.useLayoutEffect(() => { flow = current }, [current])
    return null
  }
  await act(async () => root.render(React.createElement(Host)))
  assert.deepEqual(flow.distributionCounts, [1, 2])
  await act(async () => flow.addGroup()); assert.equal(flow.groups.length, 2)
  await act(async () => flow.addGroup()); assert.equal(flow.groups.length, 2)
  await act(async () => flow.distributeRandomly(5)); assert.equal(flow.groups.length, 2)
  await act(async () => flow.distributeRandomly(2))
  assert.equal(new Set(Object.values(flow.assignments)).size, 2)
  await act(async () => flow.updateSelection(['11']))
  assert.deepEqual(flow.distributionCounts, [1])
  await act(async () => flow.distributeRandomly(1))
  assert.equal(flow.groups.length, 1); assert.deepEqual(Object.keys(flow.assignments), ['11'])
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

test('edição distribui aleatoriamente sem alterar turma iniciada nem horários das turmas mantidas', async () => withDom(async root => {
  const people = [person, { ...person, id: '12', name: 'Bruna' }, { ...person, id: '13', name: 'Carlos' }]
  const original = structuredClone(value)
  original.selectedIds = people.map(row => row.id)
  original.collaborators = people
  original.groups = [{ id: '90', name: 'Turma iniciada' }, { id: '91', name: 'Turma futura' }, { id: '92', name: 'Outra turma' }]
  original.assignments = { 11: '90', 12: '91', 13: '92' }
  original.schedules = { 90: { date: '2020-01-01', startTime: '08:00', endTime: '12:00' }, 91: value.schedules['90'], 92: value.schedules['90'] }
  original.permissions.lockedGroupIds = ['90']
  let submitted, available
  const env = environment({
    '../../hooks/useEventCandidates': { useEventCandidates: () => ({ ...candidates, collaborators: people }) },
    '../eventGroupDistributionModal': { __esModule: true, default: ({ onContinue, allowedCounts }) => {
      available = allowedCounts
      return React.createElement('button', { onClick: () => onContinue(2) }, 'Distribuir em dois grupos')
    } },
  })
  const Flow = env.load('src/components/createEventFlowModal/index.tsx').default
  await act(async () => root.render(React.createElement(Flow, { initialValue: original, mode: 'edit', managerId: '7', onClose() {}, onSubmit: async result => { submitted = result } })))
  await click('Continuar'); await click('Continuar')
  const trigger = document.querySelector('.event-create-random-trigger')
  assert.equal(trigger.disabled, false)
  await click('Distribuir aleatoriamente')
  assert.ok(available.includes(2)); assert.ok(!available.includes(1))
  await click('Distribuir em dois grupos')
  await click('Continuar'); await click('Continuar'); await click('Continuar')
  await click('Salvar alterações'); await click('Salvar')
  assert.ok(submitted)
  assert.deepEqual(submitted.groups, original.groups.slice(0, 2))
  assert.deepEqual(submitted.assignments, { 11: '90', 12: '91', 13: '91' })
  assert.deepEqual(submitted.schedules, { 90: original.schedules['90'], 91: original.schedules['91'] })
  assert.deepEqual(original.assignments, { 11: '90', 12: '91', 13: '92' })
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
  const row = { id: '42:90:' + iso, eventId: '42', category: 'event', title: 'Treinamento API', date: iso, startTime: '08:00', endTime: '12:00', status: 'ATIVO', eventPeriod: { startDate: '2099-11-05T08:00:00', endDate: '2099-11-05T12:00:00' }, eventPeriods: [{ startDate: '2099-11-05T08:00:00', endDate: '2099-11-05T12:00:00' }] }
  const result = { events: [row], loading: false, error: '', retry() {}, retryDetails() {}, details: { data: { canEdit: false, canCancel: false, status: 'ATIVO', eventClasses: [] }, loading: false, error: '' }, save() {}, cancel: async (_id, text) => { reason = text; return cancelRequest.promise } }
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
  result.details.data = { canEdit: true, canCancel: true, status: 'ATIVO', eventClasses: [] }; await act(async () => render())
  await act(async () => eventButton.click())
  await click('Inativar')
  const input = document.getElementById('event-cancellation-reason')
  assert.ok(input); assert.equal(document.querySelector('label[for=event-cancellation-reason]').textContent, 'Justificativa')
  await click('Inativar', document.querySelector('[role=dialog]'))
  assert.equal(reason, undefined)
  assert.equal(input.getAttribute('aria-invalid'), 'true')
  assert.equal(input.getAttribute('aria-describedby'), 'event-cancellation-error')
  assert.match(document.getElementById('event-cancellation-error').textContent, /3 a 1000 caracteres/)
  assert.equal(document.activeElement, input)
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
  assert.equal(document.querySelectorAll('.event-year-skeleton-day').length + document.querySelectorAll('.event-year-day--today').length, 365)
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


test('setas animam nos dois sentidos mesmo quando o próximo período está carregando', async () => withDom(async (root, dom) => {
  dom.window.matchMedia = () => ({ matches: false })
  const { useAnimatedResults } = environment().load('src/hooks/useAnimatedResults.ts')
  function Host({ period, loading }) {
    const items = React.useMemo(() => [{ period, loading }], [period, loading])
    const result = useAnimatedResults(items, `${period}|${loading}`, period, 'month', true, loading, true)
    return React.createElement('div', { 'data-exiting': result.exiting, 'data-direction': result.direction, 'data-animated': result.changed }, `${result.items[0].period}/${result.items[0].loading}`)
  }
  const render = (period, loading) => act(async () => root.render(React.createElement(Host, { period, loading })))
  await render(9, false)
  await render(10, true)
  assert.equal(document.querySelector('[data-exiting]').getAttribute('data-exiting'), 'true')
  assert.equal(document.querySelector('[data-direction]').getAttribute('data-direction'), 'next')
  assert.equal(document.getElementById('root').textContent, '9/false')
  await act(async () => new Promise(resolve => dom.window.setTimeout(resolve, 200)))
  assert.equal(document.getElementById('root').textContent, '10/true')
  assert.equal(document.querySelector('[data-animated]').getAttribute('data-animated'), 'true')
  assert.equal(document.querySelector('[data-direction]').getAttribute('data-direction'), 'next')
  await render(10, false)
  assert.equal(document.querySelector('[data-exiting]').getAttribute('data-exiting'), 'false')
  await act(async () => new Promise(resolve => dom.window.setTimeout(resolve, 20)))
  await render(9, true)
  assert.equal(document.querySelector('[data-exiting]').getAttribute('data-exiting'), 'true')
  assert.equal(document.querySelector('[data-direction]').getAttribute('data-direction'), 'previous')
  await act(async () => new Promise(resolve => dom.window.setTimeout(resolve, 200)))
  assert.equal(document.getElementById('root').textContent, '9/true')
}))

test('semana preenche todos os horários e mostra os eventos durante a saída do skeleton', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  return withDom(async (root, dom) => {
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
    await act(async () => t.mock.timers.tick(220))
    assert.equal(scroll.scrollTop, 2100)
    assert.equal(document.querySelector('.api-skeleton'), null)
    assert.ok(document.querySelectorAll('.event-week-table tbody tr')[22].querySelector('button'))
    assert.equal(scroll.classList.contains('event-loading-ready'), false)
  })
})


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
  const row = { id: '42:90:' + iso, eventId: '42', category: 'event', title: 'Treinamento API', date: iso, startTime: '08:00', endTime: '12:00', status: 'ATIVO', eventPeriod: { startDate: '2099-11-05T08:00:00', endDate: '2099-11-05T12:00:00' }, eventPeriods: [{ startDate: '2099-11-05T08:00:00', endDate: '2099-11-05T12:00:00' }] }
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
    result.details = { data: { canEdit: false, canCancel: false, status: 'ATIVO', eventClasses: [] }, loading: false, error: '' }
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


test('mês permite acessar todos os eventos por dia e ano limita a três marcadores', async () => withDom(async root => {
  const Calendar = environment().load('src/components/eventCalendar/index.tsx').default
  const entries = Array.from({ length: 6 }, (_, index) => ({ id: String(index), title: 'Evento ' + index, date: '2026-10-23', category: 'event', startTime: '08:00', endTime: '08:30' }))
  let opened
  const props = { month: new Date(2026, 9, 23), events: entries, selectedEventId: null, onMonthChange() {}, onOpenOptions(event) { opened = event } }
  for (const view of ['month', 'year', 'week']) {
    await act(async () => root.render(React.createElement(Calendar, { ...props, view })))
    assert.equal(document.querySelectorAll('button.event-calendar-item').length, view === 'year' ? 3 : 6)
    if (view === 'month') {
      const region = document.querySelector('.event-calendar-day-events[role=region]')
      assert.equal(region.tabIndex, 0)
      assert.match(region.getAttribute('aria-label'), /23/)
      await act(async () => region.querySelectorAll('button')[5].click())
      assert.equal(opened.id, '5')
    }
  }
  await act(async () => root.render(React.createElement(Calendar, { ...props, events: entries.slice(0, 2), view: 'month' })))
  assert.equal(document.querySelectorAll('button.event-calendar-item').length, 2)
  assert.equal(document.querySelector('.event-calendar-day-events[role=region]'), null)
}))

test('evento em andamento remove as ações de editar e inativar sem enviar alterações', async () => withDom(async root => {
  const today = new Date(), iso = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0')
  const row = { id: '42:90:' + iso, eventId: '42', title: 'Evento em andamento', date: iso, category: 'event', startTime: '00:00', endTime: '23:59', status: 'ATIVO' }
  let mutations = 0
  const data = { canEdit: true, status: 'ATIVO', eventClasses: [{ startDate: new Date(Date.now() - 60000).toISOString(), endDate: new Date(Date.now() + 60000).toISOString() }] }
  const result = { events: [row], loading: false, error: '', retry() {}, retryDetails() {}, details: { data, loading: false, error: '' }, save() { mutations++ } }
  const env = environment({ '../../hooks/useEvents': { useEvents: () => result, detailedCalendarEvent: entry => ({ ...entry, configuration: value }) } })
  const Page = env.load('src/pages/mainEventScreen/index.tsx').default
  await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(Page))))
  await act(async () => document.querySelector('.event-calendar-item--event').click())
  assert.equal(document.querySelector('.event-calendar-item--in-progress') !== null, true)
  assert.equal(document.querySelector('[role=menu]'), null)
  assert.equal(document.querySelector('#event-create-title'), null)
  assert.ok(document.querySelector('[role=dialog]'))
  assert.equal(mutations, 0)
}))


test('calendário destaca o número de hoje sem criar um evento extra nas visões mensal e anual', async () => withDom(async root => {
  const Calendar = environment().load('src/components/eventCalendar/index.tsx').default
  const now = new Date()
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const events = Array.from({ length: 4 }, (_, index) => ({ id: `today-event-${index}`, category: 'event', date: iso, title: `Evento ${index + 1}`, startTime: '08:00', endTime: '09:00' }))
  const props = { events, month: now, onMonthChange() {}, onOpenOptions() {}, selectedEventId: null }
  for (const view of ['month', 'week', 'year']) {
    await act(async () => root.render(React.createElement(Calendar, { ...props, view })))
    assert.equal(document.querySelectorAll('[aria-current="date"]').length, 1, view)
    if (view === 'month') {
      const day = document.querySelector('.event-calendar-day--today')
      const marker = day.querySelector('.event-calendar-day-number')
      assert.equal(marker.tagName, 'SPAN')
      assert.equal(marker.textContent, String(now.getDate()))
      assert.equal(marker.hasAttribute('aria-haspopup'), false)
      assert.equal(day.querySelector('.event-calendar-item--today'), null)
      assert.equal(day.querySelector('.event-calendar-day-events').firstElementChild.textContent, 'Evento 1')
      assert.equal(day.querySelectorAll('.event-calendar-day-events button').length, 4)
    } else if (view === 'week') {
      assert.ok(document.querySelector('thead [aria-current="date"]').textContent.includes('Dia atual'))
      assert.equal(document.querySelectorAll('.event-week-cell--today').length, 24)
    } else {
      const day = document.querySelector('.event-year-day--today')
      assert.ok(day.getAttribute('aria-label').startsWith('Hoje,'))
      assert.equal(day.querySelectorAll('.event-year-day-events button').length, 3)
    }
  }
  await act(async () => root.render(React.createElement(Calendar, { ...props, view: 'month', month: new Date(now.getFullYear(), now.getMonth() + 2, 15) })))
  assert.equal(document.querySelector('[aria-current="date"]'), null)
}))

test('evento em andamento fica atenuado nas três visões e oferece somente informações', () => withDom(async root => {
  const env = environment()
  const Calendar = env.load('src/components/eventCalendar/index.tsx').default
  const Options = env.load('src/components/eventOptionsModal/index.tsx').default
  const event = { id: 'ongoing', eventId: '42', title: 'Treinamento em andamento', category: 'event', date: '2099-11-05', startTime: '08:00', endTime: '10:00', status: 'ATIVO' }
  const start = new Date('2099-11-05T08:00:00').getTime()
  let viewed = 0, edited = 0, cancelled = 0
  for (const view of ['month', 'week', 'year']) {
    await act(async () => root.render(React.createElement(Calendar, { events: [event], month: new Date(2099, 10, 5), view, now: start, onMonthChange() {}, onOpenOptions() {}, selectedEventId: null })))
    const buttons = [...document.querySelectorAll('button')].filter(button => button.getAttribute('aria-label')?.includes(event.title))
    assert.ok(buttons.length)
    assert.ok(buttons.every(button => button.classList.contains('event-calendar-item--in-progress')))
    assert.ok(buttons.every(button => /em andamento/.test(button.getAttribute('aria-label'))))
  }
  const renderOptions = now => root.render(React.createElement(Options, { event, now, closing: false, panelRef: { current: null }, style: {}, onClose() {}, onViewInformation: () => viewed++, onEdit: () => edited++, onInactivate: () => cancelled++ }))
  await act(async () => renderOptions(start))
  assert.doesNotMatch(document.body.textContent, /Editar|Inativar/)
  await click('Ver informações')
  assert.equal(viewed, 1); assert.equal(edited, 0); assert.equal(cancelled, 0)
  await act(async () => renderOptions(start - 1))
  assert.match(document.body.textContent, /Editar/)
  assert.match(document.body.textContent, /Inativar/)
  await act(async () => renderOptions(new Date('2099-11-05T10:00:00').getTime()))
  assert.doesNotMatch(document.body.textContent, /Editar|Inativar/)
}))

test('relógio atualiza o bloqueio no início e no término mesmo sem sair da tela', () => withDom(async root => {
  const { useEventClock } = environment().load('src/hooks/useEventClock.ts')
  const originalNow = Date.now, originalTimer = window.setTimeout, originalClear = window.clearTimeout
  let now = new Date('2099-11-05T07:59:00').getTime(), next, delay
  const start = new Date('2099-11-05T08:00:00').getTime(), end = new Date('2099-11-05T09:00:00').getTime()
  const events = [{ id: 'clock', category: 'event', date: '2099-11-05', title: 'Teste', startTime: '08:00', endTime: '09:00', status: 'ATIVO' }]
  Date.now = () => now
  window.setTimeout = (callback, ms) => { next = callback; delay = ms; return 1 }
  window.clearTimeout = () => {}
  function Clock() { return React.createElement('output', null, useEventClock(events)) }
  try {
    await act(async () => root.render(React.createElement(Clock)))
    assert.equal(delay, 60010)
    now = start; await act(async () => next())
    assert.equal(Number(document.querySelector('output').textContent), start)
    assert.equal(delay, end - start + 10)
    now = end; await act(async () => next())
    assert.equal(Number(document.querySelector('output').textContent), end)
  } finally { Date.now = originalNow; window.setTimeout = originalTimer; window.clearTimeout = originalClear }
}))

test('concluídos, atrasados e inativos mantêm consulta e distinguem inativação em todas as visões', () => withDom(async root => {
  const env = environment(), Calendar = env.load('src/components/eventCalendar/index.tsx').default, Options = env.load('src/components/eventOptionsModal/index.tsx').default
  const now = new Date('2099-11-05T12:00:00').getTime()
  const base = { id: 'history', eventId: '42', category: 'event', title: 'Histórico', date: '2099-11-05', startTime: '08:00', endTime: '10:00', status: 'ATIVO' }
  for (const event of [base, { ...base, status: 'CONCLUIDO', startTime: '14:00', endTime: '16:00' }, { ...base, status: 'CANCELADO', inactive: true }, { ...base, inactive: true, startTime: '14:00', endTime: '16:00' }]) {
    for (const view of ['month', 'week', 'year']) {
      await act(async () => root.render(React.createElement(Calendar, { now, events: [event], month: new Date(2099, 10, 5), view, onMonthChange() {}, onOpenOptions() {}, selectedEventId: null })))
      const buttons = [...document.querySelectorAll('button')].filter(button => button.getAttribute('aria-label')?.includes('Histórico'))
      assert.ok(buttons.length)
      assert.ok(buttons.every(button => button.classList.contains('event-calendar-item--read-only')))
      assert.ok(buttons.every(button => button.classList.contains('event-calendar-item--inactive') === Boolean(event.inactive || event.status === 'CANCELADO')))
      assert.ok(buttons.every(button => /apenas para consulta/.test(button.title)))
    }
    await act(async () => root.render(React.createElement(Options, { now, event, closing: false, panelRef: { current: null }, style: {}, onClose() {}, onViewInformation() {}, onEdit() { assert.fail('Editar') }, onInactivate() { assert.fail('Inativar') } })))
    assert.match(document.body.textContent, /Ver informações/)
    assert.doesNotMatch(document.body.textContent, /Editar|Inativar/)
  }
}))

test('eventos somente para consulta abrem informações diretamente, sem menu intermediário', () => withDom(async root => {
  const now = new Date(), iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  for (const [index, changes] of [{ status: 'CONCLUIDO' }, { status: 'CANCELADO', inactive: true }, { status: 'ATIVO', endTime: '00:00' }].entries()) {
    const row = { id: '42:90:' + iso, eventId: '42', title: 'Evento para consulta', date: iso, category: 'event', startTime: '00:00', endTime: '23:59', ...changes }
    const result = { events: [row], loading: false, error: '', retry() {}, retryDetails() {}, details: { data: { status: row.status, canEdit: false, eventClasses: [] }, loading: false, error: '' }, save() { assert.fail('Não deve alterar evento') }, cancel() { assert.fail('Não deve inativar evento') } }
    const env = environment({ '../../hooks/useEvents': { useEvents: () => result, detailedCalendarEvent: entry => ({ ...entry, configuration: value }) } })
    const Page = env.load('src/pages/mainEventScreen/index.tsx').default
    await act(async () => root.render(React.createElement(MemoryRouter, { key: index }, React.createElement(Page))))
    await act(async () => document.querySelector('.event-calendar-item--event').click())
    assert.equal(document.querySelector('[role=menu]'), null)
    assert.ok(document.querySelector('[role=dialog]'))
    assert.equal(document.querySelector('#event-create-title'), null)
  }
}))

test('cada turma mantém sua cor sem bloquear as próximas turmas do mesmo evento', () => withDom(async root => {
  const Calendar = environment().load('src/components/eventCalendar/index.tsx').default
  const periods = [
    { startDate: '2099-11-01T08:00:00', endDate: '2099-11-01T10:00:00' },
    { startDate: '2099-11-02T08:00:00', endDate: '2099-11-02T18:00:00' },
    { startDate: '2099-11-03T08:00:00', endDate: '2099-11-03T10:00:00' },
  ]
  const events = periods.map((period, index) => ({ id: `42:${90 + index}:${period.startDate.slice(0, 10)}`, eventId: '42', title: `Turma ${index + 1}`, category: 'event', status: 'ATIVO', date: period.startDate.slice(0, 10), startTime: period.startDate.slice(11, 16), endTime: period.endDate.slice(11, 16), eventPeriod: period, eventPeriods: periods }))
  for (const view of ['month', 'week', 'year']) {
    await act(async () => root.render(React.createElement(Calendar, { events, month: new Date(2099, 10, 2), now: new Date('2099-11-02T12:00:00').getTime(), view, onMonthChange() {}, onOpenOptions() {}, selectedEventId: null })))
    const buttons = [...document.querySelectorAll('button.event-calendar-item')]
    const group = number => buttons.filter(button => button.getAttribute('aria-label').startsWith(`Turma ${number},`))
    assert.ok(group(1).length && group(2).length && group(3).length)
    assert.ok(group(1).every(button => button.classList.contains('event-calendar-item--read-only') && !button.classList.contains('event-calendar-item--in-progress')))
    assert.ok(group(2).every(button => button.classList.contains('event-calendar-item--in-progress')))
    assert.ok(group(3).every(button => !button.classList.contains('event-calendar-item--read-only') && !button.classList.contains('event-calendar-item--in-progress')))
    assert.ok(group(1).every(button => button.getAttribute('aria-haspopup') === 'dialog'))
    assert.ok(group(3).every(button => button.getAttribute('aria-haspopup') === 'menu'))
  }
}))
