const assert = require('node:assert/strict')
const { test, afterEach } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const user = { uid: 'gestor/uid', getIdToken: async () => 'firebase-token' }
const auth = { currentUser: user }
const cache = new Map()
function loadTs(filename) {
  filename = path.resolve(filename)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  cache.set(filename, module)
  const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.VITE_API_URL', "'https://api.example.test'").replaceAll('import.meta.env.DEV', 'false').replaceAll('import.meta.env.BASE_URL', "'/'")
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('require', 'module', 'exports', code)(specifier => {
    if (specifier === './firebase') return { firebaseAuth: auth }
    if (!specifier.startsWith('.')) return require(specifier)
    const resolved = path.resolve(path.dirname(filename), specifier)
    return loadTs([`${resolved}.ts`, `${resolved}.tsx`, path.join(resolved, 'index.tsx')].find(file => fs.existsSync(file)))
  }, module, module.exports)
  return module.exports
}
const api = loadTs(path.join(__dirname, '../src/services/collaborators.ts'))
const validation = loadTs(path.join(__dirname, '../src/utils/collaborator.ts'))
const originalFetch = global.fetch
afterEach(() => { global.fetch = originalFetch; auth.currentUser = user })
const summary = { id: 42, name: 'Ana Silva', email: 'ana@example.com', roleId: 5, roleName: 'Analista', unitId: 8, unitName: 'São Paulo', status: 'ATIVO', profilePhotoUrl: null, avatarInitials: 'AS' }
const details = { ...summary, cpf: '52998224725', workModel: 'HIBRIDO', workspaceId: 1 }
const values = { name: ' Ana Silva ', email: ' ANA@example.com ', cpf: '529.982.247-25', roleId: '5', unitId: '8', modality: 'HIBRIDO', status: 'ATIVO' }
function respond(data, status = 200) { return new Response(JSON.stringify({ success: true, data }), { status }) }

test('reenvia a chave pelo ID com Bearer, sem aceitar destinatário ou retornar token', async () => {
  const calls = []
  global.fetch = async (url, init) => { calls.push({ url, ...init }); return respond(null, 202) }
  assert.equal(await api.resendCollaboratorAccessKey('42'), undefined)
  assert.equal(new URL(calls[0].url).pathname, '/collaborators/42/access-key/resend')
  assert.equal(calls[0].method, 'POST')
  assert.equal(calls[0].headers.Authorization, 'Bearer firebase-token')
  assert.equal(calls[0].body, undefined)
  await assert.rejects(api.resendCollaboratorAccessKey('../42'), /Identificador/)
  assert.equal(calls.length, 1)
  global.fetch = async () => new Response(JSON.stringify({ success: false, message: 'Redis indisponível.' }), { status: 503 })
  await assert.rejects(api.resendCollaboratorAccessKey('42'), /Redis indisponível/)
})

test('conecta os cinco endpoints com Bearer e os DTOs do Swagger, sem UID, senha ou dados de autenticação', async () => {
  const calls = []
  const responses = [[summary], details, { ...details, status: 'PRE_CADASTRADO' }, { ...details, name: 'Ana Souza' }, { ...details, status: 'DESATIVADO' }]
  global.fetch = async (url, init) => { calls.push({ url, ...init }); return respond(responses.shift(), init.method === 'POST' ? 201 : 200) }
  const list = await api.listCollaborators()
  assert.equal(list[0].roleId, '5')
  assert.equal(list[0].unitId, '8')
  assert.equal(list[0].status, 'ATIVO')
  assert.equal(list[0].cpf, undefined)
  assert.equal((await api.getCollaborator('42')).cpf, '529.982.247-25')
  assert.equal((await api.createCollaborator(values)).status, 'PRE_CADASTRADO')
  assert.equal((await api.updateCollaborator('42', values)).name, 'Ana Souza')
  assert.equal((await api.changeCollaboratorStatus('42', 'DESATIVADO')).status, 'DESATIVADO')
  assert.deepEqual(calls.map(c => [c.method, new URL(c.url).pathname]), [
    ['GET', '/collaborators'], ['GET', '/collaborators/42'], ['POST', '/collaborators'], ['PUT', '/collaborators/42'], ['PATCH', '/collaborators/42/status'],
  ])
  for (const call of calls) {
    assert.equal(call.headers.Authorization, 'Bearer firebase-token')
    assert.equal(new URL(call.url).search, '')
    if (call.method === 'GET') assert.equal(call.body, undefined)
  }
  const payload = { name: 'Ana Silva', cpf: '52998224725', email: 'ana@example.com', roleId: 5, unitId: 8, workModel: 'HIBRIDO' }
  assert.deepEqual(JSON.parse(calls[2].body), payload)
  assert.deepEqual(JSON.parse(calls[3].body), { ...payload, status: 'ATIVO' })
  assert.deepEqual(JSON.parse(calls[4].body), { status: 'DESATIVADO' })
})

test('preserva os três status e a foto; detalhes ausentes e DTOs malformados são recusados', async () => {
  for (const status of ['PRE_CADASTRADO', 'ATIVO', 'DESATIVADO']) {
    global.fetch = async () => respond([{ ...summary, status, profilePhotoUrl: 'https://example.com/avatar.png' }])
    const [row] = await api.listCollaborators()
    assert.equal(row.status, status)
    assert.equal(row.profilePhotoUrl, 'https://example.com/avatar.png')
  }
  global.fetch = async () => respond([{ ...summary, profilePhotoUrl: 'javascript:invalid' }])
  assert.equal((await api.listCollaborators())[0].profilePhotoUrl, null)
  for (const malformed of [null, {}]) {
    global.fetch = async () => respond(malformed)
    await assert.rejects(api.getCollaborator('42'), /inválidos/)
  }
  global.fetch = async () => respond({ ...details, cpf: 123 })
  await assert.rejects(api.getCollaborator('42'), /CPF.*formato inválido/)
  global.fetch = async () => respond({ ...details, workModel: 'ONLINE' })
  await assert.rejects(api.getCollaborator('42'), /modalidade inválida/)
  for (const malformed of [null, {}, [null], [{ ...summary, status: 'inativo' }], [{ ...summary, unitId: 0 }]]) {
    global.fetch = async () => respond(malformed)
    await assert.rejects(api.listCollaborators(), /inválid/)
  }
})

test('PUT mantém status de pré-cadastro; PATCH envia o destino explicitamente inclusive ao repetir a ativação', async () => {
  const calls = []
  global.fetch = async (_url, init) => { calls.push(JSON.parse(init.body)); return respond(details) }
  await api.updateCollaborator('42', { ...values, status: 'PRE_CADASTRADO' })
  assert.equal(calls[0].status, 'PRE_CADASTRADO')
  await api.changeCollaboratorStatus('42', 'ATIVO')
  await api.changeCollaboratorStatus('42', 'ATIVO')
  assert.deepEqual(calls.slice(1), [{ status: 'ATIVO' }, { status: 'ATIVO' }])
})

test('abre detalhes com CPF e modalidade nulos, vazios ou ausentes sem inventar informações', async () => {
  for (const missing of [null, '', undefined]) {
    global.fetch = async () => respond({ ...details, cpf: missing, workModel: missing })
    const collaborator = await api.getCollaborator('42')
    assert.equal(collaborator.cpf, '')
    assert.equal(collaborator.modality, '')
    assert.equal(collaborator.name, 'Ana Silva')
    assert.equal(collaborator.status, 'ATIVO')
    assert.ok(validation.validateCollaborator({ ...values, cpf: collaborator.cpf, modality: collaborator.modality }).cpf)
    assert.ok(validation.validateCollaborator({ ...values, cpf: collaborator.cpf, modality: collaborator.modality }).modality)
  }
  global.fetch = async () => respond({ ...details, cpf: '12345' })
  assert.equal((await api.getCollaborator('42')).cpf, '12345')
  assert.ok(validation.validateCollaborator({ ...values, cpf: '12345' }).cpf)
})

test('alterar status aceita detalhes com campos opcionais nulos e salvar continua exigindo CPF/modalidade válidos', async () => {
  const calls = []
  global.fetch = async (_url, init) => { calls.push(init); return respond({ ...details, cpf: null, workModel: null, status: 'DESATIVADO' }) }
  const updated = await api.changeCollaboratorStatus('42', 'DESATIVADO')
  assert.equal(updated.status, 'DESATIVADO')
  assert.equal(updated.cpf, '')
  assert.equal(updated.modality, '')
  assert.deepEqual(JSON.parse(calls[0].body), { status: 'DESATIVADO' })
  await assert.rejects(api.updateCollaborator('42', { ...values, cpf: '', modality: '' }), /CPF válido.*modalidade/)
  assert.equal(calls.length, 1)
})

test('visualização e edição renderizam registros sem CPF/modalidade com campos vazios e sem senha', async () => {
  const React = require('react')
  const { renderToStaticMarkup } = require('react-dom/server')
  const Form = loadTs(path.join(__dirname, '../src/components/collaboratorForm/index.tsx')).default
  global.fetch = async () => respond({ ...details, cpf: null, workModel: null })
  const collaborator = await api.getCollaborator('42')
  const render = mode => renderToStaticMarkup(React.createElement(Form, {
    collaborator, mode, options: { positions: [], units: [] }, disabled: false, saving: false,
    onCancel() {}, onSubmit() { return null },
  }))
  const view = render('view')
  assert.match(view, /id="collaborator-cpf"[^>]*placeholder="Não informado"[^>]*value=""/)
  assert.match(view, /id="collaborator-modality"[^>]*placeholder="Não informado"[^>]*value=""/)
  assert.doesNotMatch(view, /type="password"/)
  const edit = render('edit')
  assert.match(edit, /Selecione a modalidade/)
  assert.match(edit, /Salvar alterações/)
  assert.doesNotMatch(edit, /type="password"/)
})

test('erros do backend, permissões e conflitos preservam mensagens úteis', async () => {
  global.fetch = async () => new Response(JSON.stringify({ errors: ['CPF já cadastrado.'], message: 'Conflito' }), { status: 409 })
  await assert.rejects(api.createCollaborator(values), /CPF já cadastrado/)
  global.fetch = async () => respond(null, 403)
  await assert.rejects(api.listCollaborators(), /permissão/)
  global.fetch = async () => new Response('', { status: 401 })
  await assert.rejects(api.getCollaborator('42'), /sessão expirou/)
  global.fetch = async () => new Response(JSON.stringify({ success: false, message: 'Cadastro ainda não concluído.' }))
  await assert.rejects(api.changeCollaboratorStatus('42', 'ATIVO'), /Cadastro ainda não concluído/)
  global.fetch = async () => new Response('<html>Bad gateway</html>', { status: 502 })
  await assert.rejects(api.listCollaborators(), /Não foi possível concluir/)
  global.fetch = async () => new Response(JSON.stringify({ data: [] }))
  await assert.rejects(api.listCollaborators(), /resposta inválida/)
})

test('validação de CPF, vínculos, campos e sessão bloqueia envio inválido', async () => {
  let calls = 0
  global.fetch = async () => { calls++; return respond(details) }
  for (const changes of [{ name: ' ' }, { cpf: '111.111.111-11' }, { cpf: '529.982.247-26' }, { email: 'inválido' }, { roleId: 'cargo-local' }, { unitId: '0' }, { modality: 'ONLINE' }, { status: 'inactive' }]) {
    await assert.rejects(api.createCollaborator({ ...values, ...changes }))
  }
  for (const id of ['local', '0', '-1', '9007199254740993', '42/other']) await assert.rejects(api.getCollaborator(id), /Identificador/)
  await assert.rejects(api.changeCollaboratorStatus('42', 'PRE_CADASTRADO'), /Status inválido/)
  auth.currentUser = null
  await assert.rejects(api.listCollaborators(), /Entre na sua conta/)
  assert.equal(calls, 0)
  assert.deepEqual(validation.validateCollaborator(values), {})
  assert.equal(validation.isValidCpf('52998224725'), true)
})

test('cancelamento de leitura é propagado e impede fetch se ocorrer durante obtenção do token', async () => {
  const controller = new AbortController()
  auth.currentUser = { ...user, getIdToken: async () => { controller.abort(); return 'token' } }
  let calls = 0
  global.fetch = async () => { calls++; return respond([]) }
  await assert.rejects(api.listCollaborators(controller.signal), { name: 'AbortError' })
  assert.equal(calls, 0)
  auth.currentUser = user
  const other = new AbortController()
  global.fetch = async (_url, init) => { assert.equal(init.signal, other.signal); other.abort(); throw new DOMException('Abortado', 'AbortError') }
  await assert.rejects(api.getCollaborator('42', other.signal), { name: 'AbortError' })
  global.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(api.listCollaborators(), /conectar à API/)
})

test('oculta a própria conta somente quando a tela solicita, preservando os seletores de conformidades', async () => {
  const calls = []
  global.fetch = async (url) => { calls.push(new URL(url)); return respond([summary]) }
  const controller = new AbortController()
  assert.equal((await api.listCollaborators(controller.signal, true)).length, 1)
  assert.equal((await api.listCollaborators(controller.signal)).length, 1)
  assert.equal(calls[0].search, '?excludeSelf=true')
  assert.equal(calls[1].search, '')
})
test('permissões administrativas vêm da API e ausência de permissão mantém somente consulta', async () => {
  for (const canManage of [true, false, undefined]) {
    global.fetch = async () => respond([{ ...summary, canManage }])
    assert.equal((await api.listCollaborators())[0].canManage, canManage === true)
  }
  global.fetch = async () => respond([{ ...summary, canManage: 'true' }])
  await assert.rejects(api.listCollaborators(), /inválid/)
})