const assert = require('node:assert/strict')
const { test, afterEach } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const user = { getIdToken: async () => 'firebase-token' }, auth = { currentUser: user }, cache = new Map()
function load(filename) {
  filename = path.resolve(filename)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }; cache.set(filename, module)
  const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.VITE_API_URL', "'https://api.example.test'").replaceAll('import.meta.env.DEV', 'false')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', code)(name => name === './firebase' ? { firebaseAuth: auth } : name.startsWith('.') ? load(path.resolve(path.dirname(filename), `${name}.ts`)) : require(name), module, module.exports)
  return module.exports
}
const api = load('src/services/forms.ts'), utils = load('src/utils/formApi.ts')
const id = '550e8400-e29b-41d4-a716-446655440000'
const form = {
  id, workspaceId: 1, senderManagerId: 7, managerId: 8, title: 'Inspeção', description: 'Segurança', nrCode: 6, unitId: 3, dueDate: '2026-10-30',
  status: 'RASCUNHO', createdAt: '2026-10-17T12:00:00Z', updatedAt: '2026-10-17T12:00:00Z', respondedAt: null,
  questions: [
    { id: 1, type: 'texto', question: 'Descreva o local', required: true, multiple: null, options: [], maxFiles: null, maxFileSizeMb: null, answer: [] },
    { id: 2, type: 'alternativa', question: 'Riscos?', required: false, multiple: true, options: [{ id: 1, text: 'Queda', other: false }, { id: 2, text: 'Outros', other: true }], maxFiles: null, maxFileSizeMb: null, answer: [] },
    { id: 3, type: 'foto', question: 'Fotos', required: false, multiple: null, options: [], maxFiles: 3, maxFileSizeMb: 10, answer: [] },
    { id: 4, type: 'data', question: 'Quando?', required: false, multiple: null, options: [], maxFiles: null, maxFileSizeMb: null, answer: [] },
  ],
}
const response = data => new Response(JSON.stringify({ success: true, data }))
const originalFetch = global.fetch, originalToken = user.getIdToken
afterEach(() => { global.fetch = originalFetch; auth.currentUser = user; user.getIdToken = originalToken })

test('lista global pagina rascunhos, pendentes e respondidos sem misturar a ordem entre páginas', async () => {
  const buckets = Object.fromEntries(['RASCUNHO', 'PENDENTE', 'CONCLUIDO'].map((status, index) => [status, Array.from({ length: index + 3 }, (_, number) => ({
    id: `550e8400-e29b-41d4-a716-${String(index * 10 + number).padStart(12, '0')}`, title: `${status} ${number}`, description: '', questionCount: 1, status,
  }))]))
  const statuses = [], queries = []
  global.fetch = async url => {
    const query = new URL(url).searchParams; queries.push(query)
    const rows = buckets[query.get('status')], page = Number(query.get('page')), size = Number(query.get('size'))
    assert.ok(rows, 'consulta deve usar um status do contrato da API')
    return response({ items: rows.slice(page * size, (page + 1) * size), page, size, totalElements: rows.length, totalPages: Math.ceil(rows.length / size) })
  }
  for (let page = 0; page < 3; page++) {
    const data = await api.listForms('  inspeção  ', '', page, 4)
    assert.equal(data.page, page); assert.equal(data.totalElements, 12); assert.equal(data.totalPages, 3)
    statuses.push(...data.items.map(row => row.status))
  }
  assert.deepEqual(statuses, [...Array(3).fill('RASCUNHO'), ...Array(4).fill('PENDENTE'), ...Array(5).fill('CONCLUIDO')])
  assert.ok(queries.every(query => query.get('search') === 'inspeção'))
  const answered = await api.listForms('', 'completed', 0, 4)
  assert.deepEqual(answered.items.map(row => row.status), Array(4).fill('CONCLUIDO'))
  const empty = await api.listForms('', '', 8, 4)
  assert.deepEqual(empty.items, [])
})

test('quantidade de perguntas filtra todas as páginas antes de paginar e mantém a ordem dos status', async () => {
  const row = (number, status, questionCount) => ({ id: `550e8400-e29b-41d4-a716-${String(number).padStart(12, '0')}`, title: 'Teste', description: '', status, questionCount })
  const buckets = {
    RASCUNHO: [...Array.from({ length: 100 }, (_, index) => row(index, 'RASCUNHO', 1)), row(100, 'RASCUNHO', 6)],
    PENDENTE: [row(101, 'PENDENTE', 5), row(102, 'PENDENTE', 8)],
    CONCLUIDO: [row(103, 'CONCLUIDO', 6), row(104, 'CONCLUIDO', 10)],
  }
  const calls = []
  global.fetch = async url => {
    const query = new URL(url).searchParams; calls.push(query)
    const rows = buckets[query.get('status')], page = Number(query.get('page')), size = Number(query.get('size'))
    return response({ items: rows.slice(page * size, (page + 1) * size), page, size, totalElements: rows.length, totalPages: Math.ceil(rows.length / size) })
  }
  const first = await api.listForms('Teste', '', 0, 2, undefined, { minimum: '5', maximum: '8' })
  const second = await api.listForms('Teste', '', 1, 2, undefined, { minimum: '5', maximum: '8' })
  assert.deepEqual([...first.items, ...second.items].map(item => item.id), [100, 101, 102, 103].map(number => row(number).id))
  assert.equal(first.totalElements, 4); assert.equal(first.totalPages, 2)
  assert.ok(calls.every(query => query.get('search') === 'Teste'))
  assert.ok(calls.some(query => query.get('status') === 'RASCUNHO' && query.get('page') === '1'))
  calls.length = 0
  await assert.rejects(api.listForms('', '', 0, 4, undefined, { minimum: '10', maximum: '2' }), /máxima.*mínima/)
  assert.equal(calls.length, 0)
})

test('seis endpoints usam Bearer, UUID, paginação zero e DTOs camelCase do Swagger', async () => {
  const calls = [], data = [{ items: [{ id, title: 'Inspeção', description: null, questionCount: 4, status: 'RASCUNHO' }], page: 1, size: 4, totalElements: 5, totalPages: 2 }, form, form, form, null, { ...form, status: 'PENDENTE' }]
  global.fetch = async (url, init) => { calls.push({ url, ...init }); const next = data.shift(); return init.method === 'DELETE' ? new Response(null, { status: 204 }) : response(next) }
  const signal = new AbortController().signal
  assert.equal((await api.listForms(' Inspeção ', 'draft', 1, 4, signal)).totalElements, 5)
  await api.getForm(id, signal)
  await api.createForm(utils.formValues(form), true, signal)
  await api.updateForm(id, utils.formValues(form), form, signal)
  await api.deleteForm(id, signal)
  await api.publishForm(id, signal)
  assert.deepEqual(calls.map(c => [c.method, new URL(c.url).pathname]), [['GET', '/forms'], ['GET', `/forms/${id}`], ['POST', '/forms'], ['PUT', `/forms/${id}`], ['DELETE', `/forms/${id}`], ['POST', `/forms/${id}/publish`]])
  for (const call of calls) { assert.equal(call.headers.Authorization, 'Bearer firebase-token'); assert.equal(call.signal, signal) }
  const query = new URL(calls[0].url).searchParams
  assert.equal(query.get('page'), '1'); assert.equal(query.get('size'), '4'); assert.equal(query.get('status'), 'RASCUNHO'); assert.equal(query.get('search'), 'Inspeção')
  const creation = JSON.parse(calls[2].body), edition = JSON.parse(calls[3].body)
  assert.equal(creation.questions[0].id, undefined); assert.equal(edition.questions[0].id, 1)
  assert.equal(edition.questions[1].options[1].id, 2)
  assert.equal(creation.managerId, 8); assert.equal(creation.nrCode, 6); assert.equal(creation.unitId, 3); assert.equal(creation.dueDate, '2026-10-30')
  assert.deepEqual(edition.questions.map(q => q.type), ['texto', 'alternativa', 'foto', 'data'])
  assert.equal(edition.status, 'RASCUNHO'); assert.equal(edition.questions[1].options[1].text, 'Outros')
  for (const key of ['answer', 'workspaceId', 'senderManagerId', 'createdAt', 'respondedAt']) { assert.equal(creation[key], undefined); assert.equal(edition.questions[0][key], undefined) }
  assert.equal(calls[5].body, undefined)
})

test('edição preserva IDs por pergunta, omite IDs nas cópias e mantém ordem e remoções', () => {
  const values = utils.formValues(form)
  const copy = { ...values.questions[1], id: crypto.randomUUID(), options: values.questions[1].options.map(o => ({ ...o, id: crypto.randomUUID() })) }
  values.questions = [values.questions[3], values.questions[1], copy]
  values.questions[1].options.push({ id: crypto.randomUUID(), value: 'Fogo' })
  const request = utils.formRequest(values, 'RASCUNHO', form)
  assert.deepEqual(request.questions.map(q => q.id), [4, 2, undefined])
  assert.deepEqual(request.questions[1].options.map(o => o.id), [1, 2, undefined])
  assert.deepEqual(request.questions[2].options.map(o => o.id), [undefined, undefined])
})

test('rascunho aceita campos vazios; publicação exige conteúdo e opções com limites válidos', async () => {
  global.fetch = async (_url, init) => { const body = JSON.parse(init.body); assert.equal(body.status, 'RASCUNHO'); assert.equal(body.managerId, null); assert.deepEqual(body.questions, []); return response({ ...form, title: '', managerId: null, questions: [] }) }
  await api.createForm(utils.emptyFormValues, true)
  await assert.rejects(api.createForm(utils.emptyFormValues), /nome/)
  for (const maxFileSizeMb of [1, 7, 15, 0, 101, 10.5]) {
    const values = utils.formValues(form); values.questions[2].maxFileSizeMb = maxFileSizeMb
    assert.throws(() => utils.formRequest(values, 'RASCUNHO'), /limites/)
  }
  const values = utils.formValues(form); values.questions[1].options.push({ id: 'copy', value: '', isOther: true })
  assert.throws(() => utils.formRequest(values, 'PENDENTE'), /Outros/)
  assert.throws(() => utils.formRequest({ ...utils.formValues(form), manager: 'Gerente' }, 'PENDENTE'), /identificador válido/)
  assert.throws(() => utils.formRequest({ ...utils.formValues(form), deadline: '2026-02-30' }, 'PENDENTE'), /data limite/)
})

test('IDs, status, busca e paginação inválidos são recusados antes da rede', async () => {
  let calls = 0; global.fetch = async () => { calls++; throw Error('não deveria chamar') }
  for (const badId of ['', '42', 'fake/../forms', '550e8400-e29b-41d4-a716-44665544000z']) await assert.rejects(api.getForm(badId), /Identificador/)
  for (const args of [['x'.repeat(241), '', 0, 4], ['', 'active', 0, 4], ['', 'constructor', 0, 4], ['', 'toString', 0, 4], ['', '__proto__', 0, 4], ['', '', -1, 4], ['', '', .5, 4], ['', '', 0, 101], ['', '', 0, 0]]) await assert.rejects(api.listForms(...args), /Filtros/)
  assert.equal(calls, 0)
})

test('filtros normalizam a busca sem mutação e identificam cada campo inválido', () => {
  const { validateAndSanitizeFormFilters } = load('src/utils/formFilters.ts')
  const input = { search: '  Inspeção  ', status: 'draft', page: 0, size: 4 }
  const before = structuredClone(input)
  assert.deepEqual(validateAndSanitizeFormFilters(input), { values: { ...input, search: 'Inspeção' }, errors: {} })
  assert.deepEqual(input, before)
  const invalid = validateAndSanitizeFormFilters({ search: 'a'.repeat(241), status: 'constructor', page: NaN, size: 0 })
  assert.equal(invalid.values, null)
  assert.deepEqual(Object.keys(invalid.errors), ['search', 'status', 'page', 'size'])
})

test('erros HTTP, conflitos, falha de rede e DTOs malformados nunca viram sucesso', async () => {
  for (const [status, message] of [[401, /sessão expirou/], [403, /permissão/], [404, /não encontrado/], [409, /Consulte novamente/], [500, /concluir/]]) {
    global.fetch = async () => new Response('', { status })
    await assert.rejects(api.getForm(id), message)
    await assert.rejects(api.deleteForm(id), message)
  }
  global.fetch = async () => new Response(JSON.stringify({ success: false, message: 'Inválido', errors: ['Gestor inativo'] }), { status: 400 })
  await assert.rejects(api.createForm(utils.formValues(form)), /Gestor inativo/)
  global.fetch = async () => { throw new TypeError('offline') }
  await assert.rejects(api.getForm(id), /conectar à API/)
  for (const data of [null, {}, { ...form, id: '42' }, { ...form, questions: [{ ...form.questions[0], type: 'nr' }] }, { ...form, questions: [form.questions[0], form.questions[0]] }]) {
    global.fetch = async () => response(data)
    await assert.rejects(api.getForm(id), /detalhes inválidos/)
  }
  global.fetch = async () => response({ items: [], page: 0, size: 4, totalPages: 0, totalElements: 1 })
  await assert.rejects(api.listForms('', '', 0, 4), /lista de formulários inválida/)
})

test('sessão ausente, troca de usuário e cancelamento descartam dados e impedem envios tardios', async () => {
  let calls = 0; global.fetch = async () => { calls++; return response(form) }
  auth.currentUser = null; await assert.rejects(api.getForm(id), /Entre na sua conta/)
  auth.currentUser = user
  const controller = new AbortController()
  user.getIdToken = async () => { controller.abort(); return 'token' }
  await assert.rejects(api.getForm(id, controller.signal), { name: 'AbortError' }); assert.equal(calls, 0)
  user.getIdToken = originalToken
  global.fetch = async () => { auth.currentUser = { ...user }; return response(form) }
  await assert.rejects(api.getForm(id), /sessão mudou/)
})

test('destinatários usam endpoint próprio, filtram o próprio gestor e preservam IDs para seleção', async () => {
  const calls = []
  global.fetch = async url => {
    const pathname = new URL(url).pathname; calls.push(pathname)
    return response(pathname === '/units/3/nrs' ? [{ nr: 1, description: 'Disposições gerais', active: false }] : pathname === '/units' ? [
      { unitId: 3, name: 'Ativa', collaboratorCount: 0, status: 'ativo' }, { unitId: 4, name: 'Inativa', collaboratorCount: 0, status: 'inativo' },
    ] : { currentManagerId: 7, items: [
      { id: 7, name: 'Eu mesmo', unitName: 'Sede' }, { id: 8, name: 'Ana', unitName: 'Ativa' },
    ] })
  }
  const options = await api.getFormOptions()
  assert.deepEqual(options.managers.map(o => o.value), ['8']); assert.deepEqual(options.units.map(o => o.value), ['3']); assert.equal(options.nrs[0].value, '1')
  assert.equal(options.currentManagerId, '7'); assert.equal(options.managersError, '')
  assert.deepEqual(calls.sort(), ['/forms/recipients', '/units', '/units/3/nrs'])
})

test('formulários usam somente o catálogo Empresa de uma unidade ativa e mantêm NRs ainda não associadas', async () => {
  const calls = [], controller = new AbortController()
  global.fetch = async (url, init) => {
    const pathname = new URL(url).pathname; calls.push(pathname)
    assert.equal(init.signal, controller.signal); assert.equal(init.headers.Authorization, 'Bearer firebase-token')
    if (pathname === '/forms/recipients') return response({ currentManagerId: 7, items: [] })
    if (pathname === '/units') return response([
      { unitId: 2, name: 'Inativa', collaboratorCount: 0, status: 'inativo' },
      { unitId: 3, name: 'Sede', collaboratorCount: 0, status: 'ativo' },
      { unitId: 4, name: 'Filial', collaboratorCount: 0, status: 'ativo' },
    ])
    assert.equal(pathname, '/units/3/nrs')
    return response([{ nr: 1, description: 'Disposições gerais', active: false }, { nr: 5, description: 'CIPA', active: true }])
  }
  assert.deepEqual((await api.getFormOptions(controller.signal)).nrs, [
    { value: '1', label: 'NR 1 — Disposições gerais' }, { value: '5', label: 'NR 5 — CIPA' },
  ])
  assert.deepEqual(calls.sort(), ['/forms/recipients', '/units', '/units/3/nrs'])
})

test('catálogo Empresa vazio, sem unidade ativa ou indisponível não libera o catálogo geral de NRs', async () => {
  let active = false, fail = false
  const calls = []
  global.fetch = async url => {
    const pathname = new URL(url).pathname; calls.push(pathname)
    if (pathname === '/forms/recipients') return response({ currentManagerId: 7, items: [] })
    if (pathname === '/units') return response([{ unitId: 3, name: 'Sede', collaboratorCount: 0, status: active ? 'ativo' : 'inativo' }])
    if (fail) throw new TypeError('Offline')
    return response([])
  }
  assert.deepEqual((await api.getFormOptions()).nrs, []); assert.equal(calls.includes('/units/3/nrs'), false)
  active = true; assert.deepEqual((await api.getFormOptions()).nrs, [])
  fail = true; await assert.rejects(api.getFormOptions(), /conectar à API de unidades/)
  assert.equal(calls.includes('/nrs'), false)
})

test('falha do catálogo não inventa gestores e não impede abrir os demais campos', async () => {
  global.fetch = async url => new URL(url).pathname === '/forms/recipients' ? new Response('', { status: 404 }) : response([])
  const options = await api.getFormOptions()
  assert.deepEqual(options.managers, []); assert.equal(options.currentManagerId, null)
  assert.match(options.managersError, /Não foi possível carregar/)
  assert.deepEqual(options.units, []); assert.deepEqual(options.nrs, [])
  for (const data of [null, {}, { currentManagerId: 7, items: [{ id: 8, name: null, unitName: 'Sede' }] },
    { currentManagerId: 7, items: [{ id: 8, name: 'Ana', unitName: 'Sede' }, { id: 8, name: 'Ana', unitName: 'Sede' }] }]) {
    global.fetch = async () => response(data)
    await assert.rejects(api.getFormRecipients(), /destinatários.*inválidos/)
  }
})

test('descrição é obrigatória fora do rascunho e espaços não contam como conteúdo', () => {
  for (const description of ['', '   ']) {
    const values = { ...utils.formValues(form), description }
    assert.throws(() => utils.formRequest(values, 'PENDENTE'), /Informe a descrição do formulário/)
    assert.doesNotThrow(() => utils.formRequest(values, 'RASCUNHO'))
  }
  assert.doesNotThrow(() => utils.formRequest(utils.formValues(form), 'PENDENTE'))
})

test('aparência persiste em campo próprio e o título permanece limpo', async () => {
  const appearanceApi = load('src/services/formCardAppearance.ts')
  let stored = structuredClone(form)
  const calls = []
  global.fetch = async (_url, init) => {
    calls.push(init)
    if (init.method === 'PUT') stored = { ...stored, ...JSON.parse(init.body), questions: stored.questions }
    return response(stored)
  }
  const selected = { icon: 'calendar', color: 'orange' }
  const card = await appearanceApi.saveFormCardAppearance(id, selected)
  assert.equal(stored.title, 'Inspeção'); assert.deepEqual(stored.appearance, selected)
  assert.equal(card.name, 'Inspeção')
  assert.equal(card.icon, 'calendar'); assert.equal(card.color, 'orange')
  assert.deepEqual(JSON.parse(calls[1].body).questions.map(q => q.id), [1, 2, 3, 4])
  const loaded = await api.getForm(id)
  assert.equal(loaded.title, 'Inspeção')
  const values = utils.formValues(loaded)
  assert.equal(values.name, 'Inspeção')
  assert.deepEqual(values.appearance, selected)
  await api.updateForm(id, { ...values, name: 'Inspeção revisada' }, loaded)
  assert.equal(stored.title, 'Inspeção revisada'); assert.deepEqual(stored.appearance, selected)
  const completed = utils.formSummary({ ...stored, status: 'CONCLUIDO', questionCount: 4 })
  assert.equal(completed.icon, 'calendar'); assert.equal(completed.color, 'orange')
  stored.status = 'CONCLUIDO'
  const count = calls.filter(call => call.method === 'PUT').length
  await assert.rejects(appearanceApi.saveFormCardAppearance(id, { icon: 'clock', color: 'blue' }), /recebeu respostas/)
  assert.equal(calls.filter(call => call.method === 'PUT').length, count)
})

test('aparência inválida é rejeitada e título permite 100 caracteres sem metadados', async () => {
  const selected = { icon: 'calendar', color: 'orange' }
  const values = { ...utils.formValues(form), name: 'A'.repeat(100), appearance: selected }
  const request = utils.formRequest(values, 'RASCUNHO')
  assert.equal(request.title.length, 100)
  assert.deepEqual(request.appearance, selected)
  assert.throws(() => utils.formRequest({ ...values, name: values.name + 'A' }, 'RASCUNHO'), /Informe um nome/)
  global.fetch = async () => response({ ...form, appearance: { icon: 'invalido', color: 'blue' } })
  await assert.rejects(api.getForm(id), /detalhes inválidos/)
  global.fetch = async () => response({ ...form, appearance: null })
  assert.equal(utils.formValues(await api.getForm(id)).appearance, undefined)
})
