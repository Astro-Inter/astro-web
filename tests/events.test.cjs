const assert = require('node:assert/strict')
const { test, afterEach } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const auth = { currentUser: { uid: 'manager/uid', getIdToken: async () => 'firebase-token' } }
const cache = new Map()
function load(filename) {
  filename = path.resolve(filename)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }; cache.set(filename, module)
  const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.VITE_API_URL', "'https://api.example.test'").replaceAll('import.meta.env.DEV', 'false')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', code)(name => name === './firebase' ? { firebaseAuth: auth } : name.startsWith('.') ? load(path.resolve(path.dirname(filename), `${name}.ts`)) : require(name), module, module.exports)
  return module.exports
}
const api = load('src/services/events.ts')
const utils = load('src/utils/eventApi.ts')
const { validateEventInformation } = load('src/utils/eventInformationValidation.ts')
const { validateEventSchedule } = load('src/utils/eventStepValidation.ts')
const edits = load('src/utils/eventEditing.ts')
const originalFetch = global.fetch, user = auth.currentUser
afterEach(() => { global.fetch = originalFetch; auth.currentUser = user })
const response = data => new Response(JSON.stringify({ success: true, data }))
const event = {
  id: 42, managerId: 7, title: 'Treinamento', description: ' Descrição histórica ', nrId: 10, externalLink: null,
  completionMode: 'COLABORADOR', mandatoryEvidence: true, status: 'ATIVO', cancellationDate: null, cancellationReason: null,
  canEdit: true, canCancel: true, detailsEditable: true,
  eventClasses: [{ id: 90, name: 'Turma A', startDate: '2099-11-05T08:07:23', endDate: '2099-11-06T06:13:49', editable: true,
    participants: [{ id: 11, name: 'Ana', email: 'ana@example.test', participationId: 22 }] }],
}
const calendar = { eventId: 42, eventClassId: 90, eventTitle: 'Treinamento', className: 'Turma A', startDate: '2099-11-05T08:07:23', endDate: '2099-11-06T06:13:49', status: 'ATIVO' }

test('validação por etapa rejeita datas impossíveis e preserva segundos de horários históricos', () => {
  const schedule = { date: '2099-11-05', startTime: '08:07', endTime: '08:07', originalStart: '2099-11-05T08:07:23', originalEnd: '2099-11-05T08:07:49' }
  assert.deepEqual(validateEventSchedule(schedule), {})
  assert.ok(validateEventSchedule({ ...schedule, originalEnd: undefined }).endTime)
  assert.ok(validateEventSchedule({ ...schedule, date: '2099-02-30' }).date)
})

test('validação inicial e envio final compartilham limites e rejeitam campos só com espaços', () => {
  const draft = { title: ' abc ', description: ' abc ', nr: '', type: 'Evento', externalLink: '' }
  assert.deepEqual(validateEventInformation(draft), {})
  assert.deepEqual(validateEventInformation({ ...draft, title: 'a'.repeat(255), description: 'a'.repeat(5000) }), {})
  for (const title of ['', '   ', ' ab ', 'a'.repeat(256)]) {
    assert.ok(validateEventInformation({ ...draft, title }).title)
  }
  for (const description of ['', '   ', ' ab ']) assert.ok(validateEventInformation({ ...draft, description }).description)
  for (const externalLink of ['https://', 'javascript:alert(1)', 'https://example.test/a b', `https://example.test/${'a'.repeat(2048)}`]) {
    const errors = validateEventInformation({ ...draft, externalLink })
    assert.ok(errors.externalLink)
    assert.equal(utils.validateEventForApi({ ...utils.eventConfiguration(event), draft: { ...draft, externalLink } }), errors.externalLink)
  }
  assert.deepEqual(validateEventInformation({ ...draft, externalLink: ' https://example.test/evento ' }), {})
})

test('seis endpoints administrativos usam token, parâmetros locais e payloads do Swagger', async () => {
  const calls = [], data = [ [calendar], event, [], event, event, { ...event, status: 'CANCELADO', canEdit: false, canCancel: false } ]
  global.fetch = async (url, init) => { calls.push({ url, ...init }); return response(data.shift()) }
  await api.listEvents('2099-11-01T00:00:00', '2099-11-30T23:59:59')
  await api.getEvent('42')
  await api.listEventCandidates('10')
  const value = utils.eventConfiguration(event)
  await api.createEvent(value)
  await api.updateEvent('42', value)
  await api.cancelEvent('42', '  Reagendamento do treinamento  ')
  assert.deepEqual(calls.map(c => [c.method, new URL(c.url).pathname]), [['GET', '/events'], ['GET', '/events/42'], ['GET', '/events/eligible-candidates'], ['POST', '/events'], ['PATCH', '/events/42'], ['PATCH', '/events/42/cancellation']])
  assert.equal(new URL(calls[0].url).searchParams.get('startDate'), '2099-11-01T00:00:00')
  assert.equal(new URL(calls[2].url).searchParams.get('nrId'), '10')
  for (const call of calls) assert.equal(call.headers.Authorization, 'Bearer firebase-token')
  const create = JSON.parse(calls[3].body), patch = JSON.parse(calls[4].body)
  assert.equal(create.completionMode, 'COLABORADOR'); assert.equal(create.nrId, 10); assert.equal(create.mandatoryEvidence, true)
  assert.equal(create.eventClasses[0].id, undefined)
  assert.deepEqual(patch.eventClasses[0], { id: 90, name: 'Turma A', startDate: '2099-11-05T08:07:23', endDate: '2099-11-06T06:13:49', participantIds: [11] })
  assert.equal(patch.description, ' Descrição histórica ')
  for (const key of ['nrId', 'completionMode', 'mandatoryEvidence', 'managerId', 'workspaceId']) assert.equal(patch[key], undefined)
  assert.deepEqual(JSON.parse(calls[5].body), { reason: 'Reagendamento do treinamento' })
})

test('NRs e candidatos preservam HIBRIDO e dados ausentes', async () => {
  global.fetch = async url => response(new URL(url).pathname === '/nrs' ? [{ code: 10, title: 'Eletricidade' }]
    : new URL(url).pathname === '/roles' ? [{ id_cargo: 7, nome: 'Operador', quantidade_colaboradores: 1, status: 'ativo' }]
      : [{ nr: 10, descricao: 'Eletricidade', ativo: true }])
  assert.deepEqual(await api.listEventNrs(), [{ code: 10, title: 'Eletricidade' }])
  global.fetch = async () => response([{ id: 11, name: 'Ana', email: null, roleId: null, roleName: null, unitId: null, unitName: null, workModel: 'HIBRIDO' }])
  const [candidate] = await api.listEventCandidates()
  const person = utils.candidateForEvent(candidate)
  assert.equal(person.modality, 'Híbrido'); assert.equal(person.position, 'Não informado')
})

test('dropdown usa opções de Colaborador de um cargo real e mantém NRs ainda não vinculadas a ele', async () => {
  const calls = []
  global.fetch = async (url, init) => {
    const parsed = new URL(url); calls.push({ ...init, url: parsed })
    if (parsed.pathname === '/nrs') return response([{ code: 6, title: 'EPI' }, { code: 10, title: 'Eletricidade' }, { code: 17, title: 'Ergonomia' }])
    if (parsed.pathname === '/roles') return response([{ id_cargo: 3, nome: 'Inativo', quantidade_colaboradores: 0, status: 'inativo' }, { id_cargo: 8, nome: 'Operador', quantidade_colaboradores: 2, status: 'ativo' }])
    assert.equal(parsed.pathname, '/roles/8/nrs/options')
    return response([{ nr: 6, descricao: 'EPI', ativo: false }, { nr: 10, descricao: 'Eletricidade', ativo: true }])
  }
  const controller = new AbortController()
  assert.deepEqual(await api.listEventNrs(controller.signal), [{ code: 6, title: 'EPI' }, { code: 10, title: 'Eletricidade' }])
  for (const call of calls) { assert.equal(call.headers.Authorization, 'Bearer firebase-token'); assert.equal(call.signal, controller.signal) }
  for (const call of calls.filter(call => call.url.pathname.startsWith('/roles'))) assert.equal(call.url.searchParams.get('firebase_uid'), 'manager/uid')
})

test('catálogo de colaborador vazio ou erro não libera o catálogo completo de NRs', async () => {
  let hasRole = false, fail = false
  global.fetch = async url => {
    const pathname = new URL(url).pathname
    if (pathname === '/nrs') return response([{ code: 17, title: 'Ergonomia' }])
    if (pathname === '/roles') return response(hasRole ? [{ id_cargo: 8, nome: 'Operador', quantidade_colaboradores: 2, status: 'ativo' }] : [])
    if (fail) throw new TypeError('Offline')
    return response([])
  }
  assert.deepEqual(await api.listEventNrs(), [])
  hasRole = true; assert.deepEqual(await api.listEventNrs(), [])
  fail = true; await assert.rejects(api.listEventNrs(), /conectar à API de cargos/)
})

test('intervalos cobrem dias adjacentes do mês e a semana na virada do ano', () => {
  const month = utils.eventCalendarRange(new Date(2026, 9, 17), 'month')
  assert.deepEqual(month, { startDate: '2026-09-27T00:00:00', endDate: '2026-10-31T23:59:59' })
  const week = utils.eventCalendarRange(new Date(2027, 0, 1), 'week')
  assert.deepEqual(week, { startDate: '2026-12-27T00:00:00', endDate: '2027-01-02T23:59:59' })
  assert.deepEqual(utils.eventCalendarRange(new Date(2026, 9, 17), 'year'), { startDate: '2026-01-01T00:00:00', endDate: '2026-12-31T23:59:59' })
})

test('calendário expande turmas por dia e limita a expansão ao intervalo solicitado', () => {
  const entries = utils.calendarFromApi([{ ...calendar, status: 'CANCELADO', startDate: '2099-10-01T10:00:00', endDate: '2099-12-01T12:00:00' }], '2099-11-05T00:00:00', '2099-11-06T23:59:59')
  assert.deepEqual(entries.map(e => [e.date, e.startTime, e.endTime, e.inactive]), [['2099-11-05', '00:00', '23:59', true], ['2099-11-06', '00:00', '23:59', true]])
  assert.equal(new Set(entries.map(e => e.id)).size, 2)
})

test('edição respeita flags, bloqueios históricos e permite adicionar/remover turmas futuras', () => {
  const value = utils.eventConfiguration({ ...event, detailsEditable: false, eventClasses: [{ ...event.eventClasses[0], editable: false }] })
  assert.equal(edits.canEditEvent(value, 'firebase-uid'), true)
  const added = structuredClone(value)
  added.groups.push({ id: 'new-id', name: 'Turma B' }); added.selectedIds.push('12'); added.assignments['12'] = 'new-id'
  added.schedules['new-id'] = { date: '2099-11-07', startTime: '09:00', endTime: '10:00' }
  assert.equal(edits.validateEventEdit(value, added, 'firebase-uid', 0), null)
  assert.equal(utils.eventRequest(added, true).eventClasses[1].id, undefined)
  added.groups = added.groups.filter(g => g.id !== '90')
  assert.match(edits.validateEventEdit(value, added, 'firebase-uid', 0), /Data e horários/)
  const renamed = structuredClone(value); renamed.draft.title = 'Outro título'
  assert.match(edits.validateEventEdit(value, renamed, 'firebase-uid', 0), /já começou/)
  assert.equal(edits.canEditEvent(utils.eventConfiguration({ ...event, canEdit: false }), '7'), false)
})

test('turma de menos de um minuto mantém segundos e só bloqueia no instante correto', () => {
  const original = utils.eventConfiguration({ ...event, eventClasses: [{ ...event.eventClasses[0], startDate: '2099-11-05T08:07:23', endDate: '2099-11-05T08:07:49' }] })
  assert.equal(utils.validateEventForApi(original), null)
  assert.equal(utils.eventRequest(original, true).eventClasses[0].endDate, '2099-11-05T08:07:49')
  assert.deepEqual(edits.startedGroupIds(original, new Date('2099-11-05T08:07:22').getTime()), [])
  assert.deepEqual(edits.startedGroupIds(original, new Date('2099-11-05T08:07:23').getTime()), ['90'])
})

test('validação impede turmas vazias, participantes não distribuídos e formulários inválidos', async () => {
  let calls = 0; global.fetch = async () => { calls++; return response(event) }
  const value = utils.eventConfiguration(event)
  for (const change of [v => v.draft.title = 'a', v => v.draft.description = ' ', v => v.draft.externalLink = 'javascript:alert(1)', v => v.draft.nr = 'NR 10', v => v.settings.completion = '', v => v.settings.evidenceRequired = '', v => v.assignments = {}, v => v.selectedIds.push('11'), v => v.schedules['90'].endDate = '2099-11-04']) {
    const invalid = structuredClone(value); change(invalid)
    await assert.rejects(api.createEvent(invalid))
  }
  await assert.rejects(api.getEvent('../42'), /Identificador/)
  await assert.rejects(api.cancelEvent('42', ' '), /justificativa/)
  await assert.rejects(api.listEventCandidates('NR 10'), /NR inválido/)
  auth.currentUser = null; await assert.rejects(api.getEvent('42'), /Entre na sua conta/)
  assert.equal(calls, 0)
})

test('erros da API e respostas malformadas não viram sucesso', async () => {
  global.fetch = async () => new Response(JSON.stringify({ errors: ['Somente o criador pode editar.'] }), { status: 403 })
  await assert.rejects(api.getEvent('42'), /Somente o criador/)
  global.fetch = async () => new Response('', { status: 401 }); await assert.rejects(api.getEvent('42'), /sessão expirou/)
  global.fetch = async () => response({ ...event, canEdit: 'true' }); await assert.rejects(api.getEvent('42'), /detalhes inválidos/)
  global.fetch = async () => response(null); await assert.rejects(api.listEvents('2099-11-01T00:00:00', '2099-11-30T23:59:59'), /calendário inválido/)
  global.fetch = async () => { throw new TypeError('Failed to fetch') }; await assert.rejects(api.getEvent('42'), /conectar à API/)
})

test('abort durante obtenção do token impede requisição', async () => {
  const controller = new AbortController(); let calls = 0
  auth.currentUser = { getIdToken: async () => { controller.abort(); return 'token' } }
  global.fetch = async () => { calls++; return response(event) }
  await assert.rejects(api.getEvent('42', controller.signal), { name: 'AbortError' }); assert.equal(calls, 0)
})

test('contratos mobile usam rotas próprias e evidências multipart sem Content-Type manual', async () => {
  const calls = []; global.fetch = async (url, init) => { calls.push({ url, ...init }); return response(url.endsWith('/collaborator') ? [] : { id: 1 }) }
  await api.listCollaboratorEvents(); await api.getCollaboratorEvent('42')
  await api.requestEventCompletion('42', [new File(['prova'], 'certificado.pdf')])
  assert.deepEqual(calls.map(c => [c.method, new URL(c.url).pathname]), [['GET', '/events/collaborator'], ['GET', '/events/collaborator/42'], ['POST', '/events/42/completion']])
  assert.equal(calls[2].headers['Content-Type'], undefined)
  assert.equal(calls[2].body.getAll('files')[0].name, 'certificado.pdf')
  await assert.rejects(api.requestEventCompletion('42', Array(4).fill(new File(['x'], 'x.txt'))), /até três/)
})
