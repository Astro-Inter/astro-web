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
const api = loadTs(path.join(__dirname, '../src/services/managers.ts'))
const validation = loadTs(path.join(__dirname, '../src/utils/collaborator.ts'))
const originalFetch = global.fetch
afterEach(() => { global.fetch = originalFetch; auth.currentUser = user })

const summary = { id_usuario: 42, nome: 'Ana Silva', email: 'ana@example.test', unidade_id: 8, unidade: 'São Paulo', status: 'ATIVO' }
const details = { ...summary, cargo_id: 5, cargo: 'Analista', cpf: '52998224725', modalidade: 'HIBRIDO', workspace_id: 1 }
const values = { name: ' Ana Silva ', email: ' ANA@example.test ', cpf: '529.982.247-25', roleId: '5', unitId: '8', modality: 'HIBRIDO', status: 'ATIVO' }
function respond(data, status = 200) { return new Response(JSON.stringify({ success: true, data }), { status }) }

test('conecta os cinco endpoints com Bearer, IDs e DTOs do Swagger, preservando o ID ao promover', async () => {
  const calls = []
  const responses = [[summary], details, details, { ...details, nome: 'Ana Souza' }, { ...details, status: 'DESATIVADO' }]
  global.fetch = async (url, init) => { calls.push({ url, ...init }); return respond(responses.shift()) }
  assert.equal((await api.listManagers())[0].unitId, '8')
  assert.equal((await api.getManager('42')).cpf, '529.982.247-25')
  assert.equal((await api.promoteManager({ collaboratorId: '42', status: 'active' })).id, '42')
  assert.equal((await api.updateManager('42', values)).name, 'Ana Souza')
  assert.equal((await api.changeManagerStatus('42', 'DESATIVADO')).status, 'DESATIVADO')
  assert.deepEqual(calls.map(c => [c.method, new URL(c.url).pathname]), [
    ['GET', '/managers'], ['GET', '/managers/42'], ['POST', '/managers'], ['PUT', '/managers/42'], ['PATCH', '/managers/42/status'],
  ])
  for (const call of calls) {
    assert.equal(call.headers.Authorization, 'Bearer firebase-token')
    assert.equal(new URL(call.url).search, '')
    if (call.method === 'GET') assert.equal(call.body, undefined)
  }
  assert.deepEqual(JSON.parse(calls[2].body), { collaboratorId: 42, status: 'ATIVO' })
  assert.deepEqual(JSON.parse(calls[3].body), { nome: 'Ana Silva', email: 'ana@example.test', cpf: '52998224725', roleId: 5, unitId: 8, modalidade: 'HIBRIDO', status: 'ATIVO' })
  assert.deepEqual(JSON.parse(calls[4].body), { status: 'DESATIVADO' })
})

test('promoção inativa, edição de pré-cadastro e PATCH enviam status explícito', async () => {
  const calls = []
  global.fetch = async (_url, init) => { calls.push(JSON.parse(init.body)); return respond(details) }
  await api.promoteManager({ collaboratorId: '42', status: 'inactive' })
  await api.updateManager('42', { ...values, status: 'PRE_CADASTRADO' })
  await api.changeManagerStatus('42', 'ATIVO')
  await api.changeManagerStatus('42', 'ATIVO')
  assert.equal(calls[0].status, 'DESATIVADO')
  assert.equal(calls[1].status, 'PRE_CADASTRADO')
  assert.deepEqual(calls.slice(2), [{ status: 'ATIVO' }, { status: 'ATIVO' }])
})

test('preserva foto e iniciais na lista, detalhes e retornos de promoção, edição e status', async () => {
  const photo = { profilePhotoUrl: 'https://images.example.test/ana.jpg', avatarInitials: 'AS' }
  global.fetch = async (_url, init) => respond(init.method === 'GET' && _url.endsWith('/managers') ? [{ ...summary, ...photo }] : { ...details, ...photo })
  const managers = [
    (await api.listManagers())[0], await api.getManager('42'),
    await api.promoteManager({ collaboratorId: '42', status: 'active' }),
    await api.updateManager('42', values), await api.changeManagerStatus('42', 'ATIVO'),
  ]
  for (const manager of managers) {
    assert.equal(manager.profilePhotoUrl, photo.profilePhotoUrl)
    assert.equal(manager.avatarInitials, 'AS')
  }
  const React = require('react')
  const { renderToStaticMarkup } = require('react-dom/server')
  const Identity = loadTs(path.join(__dirname, '../src/components/collaboratorIdentity/index.tsx')).default
  const Form = loadTs(path.join(__dirname, '../src/components/collaboratorForm/index.tsx')).default
  const avatar = renderToStaticMarkup(React.createElement(Identity, { name: managers[0].name, photoUrl: managers[0].profilePhotoUrl, initials: managers[0].avatarInitials }))
  assert.match(avatar, /<img[^>]*src="https:\/\/images.example.test\/ana.jpg"/)
  const form = renderToStaticMarkup(React.createElement(Form, { subject: 'gestor', collaborator: managers[1], mode: 'view', options: { positions: [], units: [] }, disabled: false, saving: false, onCancel() {}, onSubmit() {} }))
  assert.match(form, /<img[^>]*src="https:\/\/images.example.test\/ana.jpg"/)
})

test('foto ausente ou com protocolo inválido usa fallback e campos malformados são recusados', async () => {
  const React = require('react')
  const { renderToStaticMarkup } = require('react-dom/server')
  const Identity = loadTs(path.join(__dirname, '../src/components/collaboratorIdentity/index.tsx')).default
  for (const photo of [undefined, null, '', 'javascript:alert(1)', 'data:image/png;base64,a']) {
    global.fetch = async () => respond([{ ...summary, profilePhotoUrl: photo, avatarInitials: 'AN' }])
    const manager = (await api.listManagers())[0]
    assert.equal(manager.profilePhotoUrl, null)
    const markup = renderToStaticMarkup(React.createElement(Identity, { name: manager.name, photoUrl: manager.profilePhotoUrl, initials: manager.avatarInitials }))
    assert.match(markup, />AN</)
    assert.doesNotMatch(markup, /<img/)
  }
  global.fetch = async () => respond(details)
  assert.equal((await api.getManager('42')).avatarInitials, null)
  for (const malformed of [{ profilePhotoUrl: 123 }, { avatarInitials: [] }]) {
    global.fetch = async () => respond([{ ...summary, ...malformed }])
    await assert.rejects(api.listManagers(), /dados inválidos/)
    global.fetch = async () => respond({ ...details, ...malformed })
    await assert.rejects(api.getManager('42'), /dados inválidos/)
  }
})

test('detalhes toleram campos opcionais ausentes; edição exige CPF e modalidade válidos', async () => {
  for (const missing of [null, '', undefined]) {
    global.fetch = async () => respond({ ...details, cpf: missing, modalidade: missing })
    const manager = await api.getManager('42')
    assert.equal(manager.cpf, '')
    assert.equal(manager.modality, '')
  }
  let calls = 0
  global.fetch = async () => { calls++; return respond(details) }
  for (const changes of [{ name: '' }, { cpf: '' }, { cpf: '111.111.111-11' }, { email: 'invalid' }, { roleId: 'cargo-local' }, { unitId: '0' }, { modality: '' }, { status: 'inactive' }]) {
    await assert.rejects(api.updateManager('42', { ...values, ...changes }))
  }
  for (const id of ['local', '0', '-1', '9007199254740993', '42/other']) await assert.rejects(api.getManager(id), /Identificador/)
  await assert.rejects(api.promoteManager({ collaboratorId: 'local', status: 'active' }))
  await assert.rejects(api.promoteManager({ collaboratorId: '42', status: '' }))
  await assert.rejects(api.changeManagerStatus('42', 'PRE_CADASTRADO'), /Status inválido/)
  auth.currentUser = null
  await assert.rejects(api.listManagers(), /Entre na sua conta/)
  assert.equal(calls, 0)
})

test('valida respostas e preserva erros de conflito, permissão e sessão', async () => {
  for (const malformed of [null, {}, [null], [{ ...summary, status: 'inativo' }], [{ ...summary, unidade_id: 0 }]]) {
    global.fetch = async () => respond(malformed)
    await assert.rejects(api.listManagers(), /inválid/)
  }
  global.fetch = async () => respond({ ...details, cargo_id: 0 })
  await assert.rejects(api.getManager('42'), /detalhes inválidos/)
  global.fetch = async () => new Response(JSON.stringify({ success: false, errors: ['Colaborador precisa estar ativo.'] }), { status: 409 })
  await assert.rejects(api.promoteManager({ collaboratorId: '42', status: 'active' }), /precisa estar ativo/)
  global.fetch = async () => new Response('', { status: 403 })
  await assert.rejects(api.listManagers(), /permissão/)
  global.fetch = async () => new Response('', { status: 401 })
  await assert.rejects(api.getManager('42'), /sessão expirou/)
  global.fetch = async () => new Response('<html>Bad gateway</html>', { status: 502 })
  await assert.rejects(api.listManagers(), /Não foi possível concluir/)
  global.fetch = async () => new Response(JSON.stringify({ data: [] }))
  await assert.rejects(api.listManagers(), /resposta inválida/)
})

test('cancelamento impede fetch durante obtenção de token e propaga AbortError', async () => {
  const controller = new AbortController()
  auth.currentUser = { ...user, getIdToken: async () => { controller.abort(); return 'token' } }
  let calls = 0
  global.fetch = async () => { calls++; return respond([]) }
  await assert.rejects(api.listManagers(controller.signal), { name: 'AbortError' })
  assert.equal(calls, 0)
  auth.currentUser = user
  const other = new AbortController()
  global.fetch = async (_url, init) => { assert.equal(init.signal, other.signal); other.abort(); throw new DOMException('Abortado', 'AbortError') }
  await assert.rejects(api.getManager('42', other.signal), { name: 'AbortError' })
  global.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(api.listManagers(), /conectar à API/)
})

test('formulário de gestores usa vínculos por ID, preserva vínculos inativos atuais e não mostra senha', () => {
  const React = require('react')
  const { renderToStaticMarkup } = require('react-dom/server')
  const Form = loadTs(path.join(__dirname, '../src/components/collaboratorForm/index.tsx')).default
  const manager = { id: '42', name: 'Ana', email: 'ana@example.test', cpf: '', modality: '', status: 'ATIVO', unitId: '8', unit: 'Matriz', roleId: '5', position: 'Analista', profilePhotoUrl: null, avatarInitials: null }
  const options = { positions: [{ id: '5', name: 'Analista', active: false }], units: [{ id: '8', name: 'Matriz', active: false }] }
  const markup = renderToStaticMarkup(React.createElement(Form, { subject: 'gestor', collaborator: manager, mode: 'edit', options, disabled: false, saving: false, onCancel() {}, onSubmit() { return null } }))
  assert.match(markup, /Dados do gestor/)
  assert.match(markup, /value="Analista"/)
  assert.match(markup, /value="Matriz"/)
  assert.match(markup, /Selecione modalidade/)
  assert.doesNotMatch(markup, /type="password"|astro-demo/)
  assert.deepEqual(validation.validateCollaborator(values), {})
})

function inviteEnvironment(operation) {
  const slots = []
  let cursor = 0, closed = 0
  const react = {
    useRef(value) { const i = cursor++; slots[i] ??= { current: value }; return slots[i] },
    useState(value) {
      const i = cursor++; slots[i] ??= { value }
      return [slots[i].value, update => { slots[i].value = typeof update === 'function' ? update(slots[i].value) : update }]
    },
  }
  const module = { exports: {} }
  const filename = path.resolve('src/components/inviteManagerDialog/index.tsx')
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('require', 'module', 'exports', code)(name => {
    if (name === 'react') return react
    if (name.startsWith('../../utils/')) return loadTs(path.resolve(path.dirname(filename), `${name}.ts`))
    if (name.startsWith('../')) return { default: name }
    return require(name)
  }, module, module.exports)
  function elements(node) {
    if (!node || typeof node !== 'object') return []
    if (Array.isArray(node)) return node.flatMap(elements)
    return [node, ...elements(node.props?.children)]
  }
  return {
    get closed() { return closed },
    render() {
      cursor = 0
      const modal = module.exports.default({ candidates: [{ id: '42', email: 'ana@example.test' }], loading: false, error: '', saving: false,
        onRetry() {}, onClose() {}, onInvite: operation })
      const form = modal.props.children(() => { closed++ })
      return { modal, form, select: id => elements(form).find(node => node.props?.id === id),
        alerts: elements(form).filter(node => node.props?.role === 'alert').map(node => node.props.children) }
    },
  }
}

test('modal de promoção aguarda a API, bloqueia duplo envio e só fecha após sucesso', async () => {
  let resolve, calls = 0
  const pending = new Promise(yes => { resolve = yes })
  const env = inviteEnvironment(() => { calls++; return pending })
  env.render().select('invite-manager-email').props.onValueChange('42')
  env.render().select('invite-manager-status').props.onValueChange('active')
  const initial = env.render()
  initial.form.props.onSubmit({ preventDefault() {} })
  initial.form.props.onSubmit({ preventDefault() {} })
  assert.equal(calls, 1)
  assert.equal(env.closed, 0)
  assert.equal(env.render().modal.props.dismissible, false)
  assert.equal(env.render().form.props['aria-busy'], true)
  resolve(null)
  await new Promise(setImmediate)
  assert.equal(env.closed, 1)
})

test('modal de promoção mantém valores e exibe erro acessível para tentar novamente', async () => {
  const env = inviteEnvironment(async () => 'Colaborador não está mais ativo.')
  env.render().select('invite-manager-email').props.onValueChange('42')
  env.render().select('invite-manager-status').props.onValueChange('inactive')
  env.render().form.props.onSubmit({ preventDefault() {} })
  await new Promise(setImmediate)
  const result = env.render()
  assert.equal(env.closed, 0)
  assert.equal(result.select('invite-manager-email').props.value, '42')
  assert.equal(result.select('invite-manager-status').props.value, 'inactive')
  assert.deepEqual(result.alerts, ['Colaborador não está mais ativo.'])
  assert.equal(result.modal.props.dismissible, true)
})
