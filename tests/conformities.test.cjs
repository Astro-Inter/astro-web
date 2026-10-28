const assert = require('node:assert/strict')
const { test, afterEach } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const user = { uid: 'manager', getIdToken: async () => 'firebase-token' }
const auth = { currentUser: user }
const cache = new Map()
function loadTs(filename) {
  filename = path.resolve(filename)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  cache.set(filename, module)
  const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.VITE_API_URL', "'https://api.example.test'").replaceAll('import.meta.env.DEV', 'false')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('require', 'module', 'exports', code)(specifier => {
    if (specifier === './firebase') return { firebaseAuth: auth }
    if (!specifier.startsWith('.')) return require(specifier)
    const resolved = path.resolve(path.dirname(filename), specifier)
    return loadTs([`${resolved}.ts`, `${resolved}.tsx`, path.join(resolved, 'index.tsx')].find(file => fs.existsSync(file)))
  }, module, module.exports)
  return module.exports
}
const api = loadTs('src/services/conformities.ts')
const unitsApi = loadTs('src/services/unitConformities.ts')
const validation = loadTs('src/utils/conformity.ts')
const originalFetch = global.fetch
afterEach(() => { global.fetch = originalFetch; auth.currentUser = user })
const row = { id: 42, collaboratorId: 7, collaboratorName: 'Ana Silva', collaboratorEmail: 'ana@example.test', nrId: 10, nrTitle: 'Segurança em eletricidade',
  expiresAt: '2027-12-31', origin: 'EVENTO', applicable: true, eventCompletionId: 15, status: 'Válida', profilePhotoUrl: null, avatarInitials: 'AS' }
const values = { employeeId: '7', nr: 'NR 10', expiresAt: '' }
const imported = { processed: 3, inserted: 1, updated: 1, rejected: 1, rejectedRows: [{ row: 4, cpf: '00123456789', nr: '10', reason: 'Data inválida.' }] }
const file = () => new File(['excel'], 'conformidades.xlsx')
function respond(data, status = 200) { return new Response(JSON.stringify({ success: true, data }), { status }) }

test('conformidades de unidades usam rotas próprias, preservam evidência e enviam unitId', async () => {
  const unitRow = { id: 9, type: 'UNIDADE', unitId: 2, unitName: 'Filial', nrId: 1, nrTitle: 'NR 1', expiresAt: '2028-10-27', origin: 'FORMULARIO', applicable: true, formResponseId: 'form-657', status: 'Válida' }
  const calls = []
  global.fetch = async (url, init) => { calls.push({ url, ...init }); return respond(init.method === 'GET' && new URL(url).pathname.endsWith('/units') ? [unitRow] : unitRow) }
  const rows = await unitsApi.listUnitConformities()
  assert.equal(rows[0].employeeName, 'Filial')
  assert.equal(rows[0].type, 'UNIDADE')
  assert.equal(rows[0].formResponseId, 'form-657')
  assert.equal(rows[0].origin, 'Formulário')
  await unitsApi.getUnitConformity('9')
  await unitsApi.saveUnitConformity({ employeeId: '2', nr: 'NR 1', expiresAt: '' })
  await unitsApi.saveUnitConformity({ employeeId: '2', nr: 'NR 1', expiresAt: '' }, '9')
  await unitsApi.changeUnitConformityApplicability('9', false)
  assert.deepEqual(calls.map(call => [call.method, new URL(call.url).pathname]), [['GET', '/conformities/units'], ['GET', '/conformities/units/9'], ['POST', '/conformities/units'], ['PUT', '/conformities/units/9'], ['PATCH', '/conformities/units/9/applicability']])
  assert.deepEqual(JSON.parse(calls[2].body), { unitId: 2, nrId: 1, expiresAt: null })
  assert.deepEqual(JSON.parse(calls[3].body), { nrId: 1, expiresAt: null })
})

test('conformidade de unidade rejeita tipo inconsistente e identificadores inválidos', async () => {
  global.fetch = async () => respond([{ type: 'COLABORADOR' }])
  await assert.rejects(unitsApi.listUnitConformities(), /dados inválidos/)
  await assert.rejects(unitsApi.getUnitConformity('../9'), /Identificador/)
})

test('conecta os seis endpoints de conformidades e o catálogo de NRs com Bearer e DTOs do Swagger', async () => {
  const calls = [], responses = [[row], row, { ...row, origin: 'MANUAL', eventCompletionId: null }, row, { ...row, applicable: false }, imported, [{ code: 10, title: row.nrTitle }]]
  global.fetch = async (url, init) => { calls.push({ url, ...init }); return respond(responses.shift()) }
  const [conformity] = await api.listConformities()
  assert.equal(conformity.employeeId, '7')
  assert.equal(conformity.nr, 'NR 10')
  assert.equal(conformity.origin, 'Evento')
  assert.equal(conformity.eventCompletionId, 15)
  assert.equal(conformity.status, 'valid')
  assert.equal((await api.getConformity('42')).employeeEmail, row.collaboratorEmail)
  assert.equal((await api.createConformity(values)).origin, 'Manual')
  await api.updateConformity('42', { ...values, expiresAt: '2028-02-29' })
  assert.equal((await api.changeConformityApplicability('42', false)).applicable, false)
  assert.deepEqual(await api.importConformities(file()), imported)
  assert.deepEqual(await api.listConformityNrs(), [{ code: 10, title: row.nrTitle }])
  assert.deepEqual(calls.map(c => [c.method, new URL(c.url).pathname]), [
    ['GET', '/conformities/collaborators'], ['GET', '/conformities/collaborators/42'], ['POST', '/conformities/collaborators'], ['PUT', '/conformities/collaborators/42'],
    ['PATCH', '/conformities/collaborators/42/applicability'], ['POST', '/conformities/collaborators/import'], ['GET', '/nrs'],
  ])
  for (const call of calls) {
    assert.equal(call.headers.Authorization, 'Bearer firebase-token')
    assert.equal(new URL(call.url).search, '')
    if (call.method === 'GET') assert.equal(call.body, undefined)
  }
  assert.deepEqual(JSON.parse(calls[2].body), { collaboratorId: 7, nrId: 10, expiresAt: null })
  assert.deepEqual(JSON.parse(calls[3].body), { nrId: 10, expiresAt: '2028-02-29' })
  assert.deepEqual(JSON.parse(calls[4].body), { applicable: false })
  assert.ok(calls[5].body instanceof FormData)
  assert.deepEqual([...calls[5].body.keys()], ['file'])
  assert.equal(calls[5].body.get('file').name, 'conformidades.xlsx')
  assert.equal(calls[5].headers['Content-Type'], undefined)
})

test('lista origens reais do backend juntas sem recusar a lista e preserva o vínculo de conclusão', async () => {
  global.fetch = async () => respond([row, { ...row, id: 43, origin: 'MANUAL', eventCompletionId: null }])
  const list = await api.listConformities()
  assert.deepEqual(list.map(item => [item.id, item.origin, item.eventCompletionId]), [['42', 'Evento', 15], ['43', 'Manual', null]])
  const filters = { ...validation.emptyConformityFilters, origin: 'Evento' }
  assert.deepEqual(list.filter(item => validation.matchesConformityFilters(item, filters)).map(item => item.id), ['42'])
  assert.equal(validation.isConformityOrigin('Evento'), true)
  assert.equal(validation.isConformityOrigin('Manual'), true)
  assert.equal(validation.isConformityOrigin('Análise de cargo'), false)
  global.fetch = async () => respond({ ...row, origin: 'DESCONHECIDA' })
  await assert.rejects(api.getConformity('42'), /dados inválidos/)
})

test('preserva o status calculado pelo servidor, histórico e dados de identidade sem calcular pelo relógio local', async () => {
  for (const [status, expected] of [['Vencida', 'expired'], ['Válida', 'valid'], ['Sem validade', 'no-expiry']]) {
    global.fetch = async () => respond({ ...row, status, applicable: false, expiresAt: null, profilePhotoUrl: 'https://example.test/avatar.png' })
    const result = await api.getConformity('42')
    assert.equal(result.status, expected)
    assert.equal(result.applicable, false)
    assert.equal(result.eventCompletionId, 15)
    assert.equal(result.profilePhotoUrl, 'https://example.test/avatar.png')
  }
  global.fetch = async () => respond({ ...row, profilePhotoUrl: 'javascript:invalid' })
  assert.equal((await api.getConformity('42')).profilePhotoUrl, null)
})

test('recusa DTOs malformados de lista, detalhes, NRs e importação', async () => {
  for (const malformed of [null, {}, [null], [{ ...row, nrId: 0 }], [{ ...row, status: 'Outro' }], [{ ...row, expiresAt: '2027-02-29' }]]) {
    global.fetch = async () => respond(malformed)
    await assert.rejects(api.listConformities(), /inválid/)
  }
  global.fetch = async () => respond(null)
  await assert.rejects(api.getConformity('42'), /inválid/)
  global.fetch = async () => respond([{ code: 0, title: 'NR' }])
  await assert.rejects(api.listConformityNrs(), /inválid/)
  global.fetch = async () => respond({ ...imported, rejectedRows: [null] })
  await assert.rejects(api.importConformities(file()), /inválid/)
})

test('valida IDs, datas reais e arquivo antes de enviar e permite remover validade com null', async () => {
  let calls = 0
  global.fetch = async () => { calls++; return respond(row) }
  for (const changes of [{ employeeId: 'local' }, { nr: 'NR 0' }, { nr: 'NR 9007199254740992' }, { expiresAt: '2026-02-30' }, { expiresAt: '31/12/2026' }]) {
    await assert.rejects(api.createConformity({ ...values, ...changes }))
  }
  for (const id of ['', '0', '-1', '42/other', '9007199254740992']) await assert.rejects(api.getConformity(id), /Identificador/)
  await assert.rejects(api.changeConformityApplicability('42', 'false'), /Aplicabilidade/)
  for (const invalidFile of [new File(['data'], 'arquivo.csv'), new File([], 'vazio.xls'), { name: 'grande.xlsx', size: 10 * 1024 * 1024 + 1 }]) await assert.rejects(api.importConformities(invalidFile))
  assert.equal(calls, 0)
  global.fetch = async (_url, init) => { assert.deepEqual(JSON.parse(init.body), { nrId: 10, expiresAt: null }); return respond(row) }
  await api.updateConformity('42', values)
  assert.equal(validation.isConformityDate('2028-02-29'), true)
  assert.equal(validation.isConformityDate('2026-02-29'), false)
})

test('expõe erros de negócio, sessão, permissão, conflito e rede sem sucesso fictício', async () => {
  for (const [status, expected] of [[401, /sessão expirou/], [403, /permissão/], [404, /escopo/], [409, /Já existe/], [413, /10 MB/], [503, /Não foi possível concluir/]]) {
    global.fetch = async () => new Response('', { status })
    await assert.rejects(api.listConformities(), expected)
  }
  global.fetch = async () => new Response(JSON.stringify({ success: false, message: 'NR revogada.', errors: ['A NR de evento deve corresponder à conclusão.'] }), { status: 400 })
  await assert.rejects(api.updateConformity('42', values), /NR de evento/)
  global.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(api.listConformities(), /conectar à API/)
  global.fetch = async () => new Response(JSON.stringify({ data: [] }))
  await assert.rejects(api.listConformities(), /resposta inválida/)
  auth.currentUser = null
  await assert.rejects(api.listConformities(), /Entre na sua conta/)
})

test('cancelamento durante obtenção do token impede fetch; leituras e escritas recebem AbortSignal', async () => {
  const controller = new AbortController()
  auth.currentUser = { ...user, getIdToken: async () => { controller.abort(); return 'token' } }
  let calls = 0
  global.fetch = async () => { calls++; return respond([]) }
  await assert.rejects(api.listConformities(controller.signal), { name: 'AbortError' })
  assert.equal(calls, 0)
  auth.currentUser = user
  const other = new AbortController()
  global.fetch = async (_url, init) => { assert.equal(init.signal, other.signal); return respond(row) }
  await api.updateConformity('42', values, other.signal)
  global.fetch = async (_url, init) => { assert.equal(init.signal, other.signal); other.abort(); throw new DOMException('Abortado', 'AbortError') }
  await assert.rejects(api.getConformity('42', other.signal), { name: 'AbortError' })
})
