const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const ts = require('typescript')

const person = { id: '42', name: 'Ana Silva', email: 'ana@example.test', roleId: '5', position: 'Analista', unitId: '8', unit: 'São Paulo', status: 'ATIVO', cpf: '529.982.247-25', modality: 'HIBRIDO', profilePhotoUrl: null, avatarInitials: 'AS' }
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const flush = () => new Promise(setImmediate)

function environment() {
  const slots = [], calls = []
  let cursor = 0, effects = [], parameters = [], writes = 0
  const context = { user: { uid: 'manager' } }
  const services = {
    listCollaborators: async () => [person], getCollaborator: async () => person,
    createCollaborator: async () => ({ ...person, id: '43', status: 'PRE_CADASTRADO' }),
    updateCollaborator: async () => person, changeCollaboratorStatus: async () => person,
    listRoles: async () => [], listUnits: async () => [],
  }
  const trackedServices = Object.fromEntries(Object.keys(services).map(name => [name, (...args) => { calls.push({ name, args }); return services[name](...args) }]))
  const react = {
    useRef(value) { const index = cursor++; slots[index] ??= { current: value }; return slots[index] },
    useState(initial) {
      const index = cursor++
      slots[index] ??= { value: typeof initial === 'function' ? initial() : initial }
      return [slots[index].value, update => { writes++; slots[index].value = typeof update === 'function' ? update(slots[index].value) : update }]
    },
    useEffect(effect, dependencies) {
      const index = cursor++, old = slots[index]
      if (!old || dependencies.some((value, i) => !Object.is(value, old.dependencies[i]))) effects.push(() => {
        old?.cleanup?.()
        slots[index] = { dependencies, cleanup: effect() }
      })
    },
  }
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync('src/hooks/useCollaborators.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', code)(name => {
    if (name === 'react') return react
    if (name === './useAuthentication') return { useAuthentication: () => context }
    return trackedServices
  }, module, module.exports)
  return {
    context, services, calls,
    get writes() { return writes },
    render(...args) {
      if (args.length) parameters = args
      cursor = 0; effects = []
      const result = module.exports.useCollaborators(...parameters)
      effects.forEach(effect => effect())
      return result
    },
    unmount() { slots.forEach(slot => slot.cleanup?.()) },
  }
}

test('consulta detalhes ao selecionar colaborador e ignora respostas antigas após troca ou fechamento', async () => {
  const env = environment(), first = deferred(), second = deferred()
  env.services.getCollaborator = id => id === '42' ? first.promise : second.promise
  assert.equal(env.render('42').details.loading, true)
  env.render('43')
  const [old, current] = env.calls.filter(call => call.name === 'getCollaborator')
  assert.equal(old.args[1].aborted, true)
  first.resolve(person)
  await flush()
  assert.equal(env.render().details.data, null)
  second.resolve({ ...person, id: '43' })
  await flush()
  assert.equal(env.render().details.data.id, '43')
  env.render(undefined)
  assert.equal(current.args[1].aborted, true)
  assert.equal(env.render().details.data, null)
})

test('salvar aguarda a API, bloqueia duplicação, preserva lista em erro e aplica retorno confirmado', async () => {
  const env = environment()
  env.render('42')
  await flush()
  let api = env.render()
  const failed = deferred()
  env.services.updateCollaborator = () => failed.promise
  const attempt = api.save({}, '42')
  assert.equal(env.render().saving, true)
  assert.match((await api.save({}, '42')).error, /Aguarde/)
  assert.equal(env.calls.filter(call => call.name === 'updateCollaborator').length, 1)
  assert.equal(env.render().employees[0].name, 'Ana Silva')
  failed.reject(new Error('Conflito de e-mail.'))
  assert.equal((await attempt).error, 'Conflito de e-mail.')
  assert.equal(env.render().saving, false)
  assert.equal(env.render().employees[0].name, 'Ana Silva')
  env.services.updateCollaborator = async () => ({ ...person, name: 'Ana Souza', status: 'DESATIVADO' })
  api = env.render()
  assert.equal((await api.save({}, '42')).error, null)
  assert.equal(env.render().employees[0].name, 'Ana Souza')
  assert.equal(env.render().details.data.status, 'DESATIVADO')
  assert.equal((await env.render().save({})).collaborator.id, '43')
  assert.equal(env.render().employees.length, 2)
})

test('consultas exibem erro e permitem retry; desmontagem cancela e descarta respostas de leituras e escritas', async () => {
  const env = environment()
  env.services.listCollaborators = async () => { throw new Error('Serviço indisponível.') }
  env.render()
  await flush()
  assert.equal(env.render().error, 'Serviço indisponível.')
  env.services.listCollaborators = async () => [person]
  env.render().retry()
  env.render('42', true)
  await flush()
  assert.equal(env.render().employees.length, 1)
  assert.equal(env.render().options.loading, false)
  const pending = deferred()
  env.services.changeCollaboratorStatus = () => pending.promise
  const saving = env.render().changeStatus('42', 'DESATIVADO')
  env.unmount()
  const writes = env.writes
  pending.resolve({ ...person, status: 'DESATIVADO' })
  await saving
  assert.equal(env.writes, writes)
  assert.equal(env.calls.filter(call => call.name === 'getCollaborator').at(-1).args[1].aborted, true)
})

test('trocar a conta oculta dados e salvamento da sessão anterior e descarta o resultado tardio', async () => {
  const env = environment()
  env.render()
  await flush()
  const pending = deferred()
  env.services.updateCollaborator = () => pending.promise
  const saving = env.render().save({}, '42')
  env.context.user = { uid: 'another-manager' }
  env.services.listCollaborators = async () => []
  const next = env.render()
  assert.deepEqual(next.employees, [])
  assert.equal(next.saving, false)
  await flush()
  pending.resolve({ ...person, name: 'Resultado antigo' })
  await saving
  assert.deepEqual(env.render().employees, [])
})

test('a aba de colaboradores solicita exclusão da própria conta à API', async () => {
  const env = environment()
  env.render()
  await flush()
  const call = env.calls.find(call => call.name === 'listCollaborators')
  assert.equal(call.args[1], true)
  assert.ok(call.args[0] instanceof AbortSignal)
})