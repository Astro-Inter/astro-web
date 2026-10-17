const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const ts = require('typescript')
const row = { id: '42', employeeId: '7', employeeName: 'Ana', employeeEmail: 'ana@example.test', nr: 'NR 10', nrId: 10, expiresAt: null, origin: 'Evento', applicable: true, status: 'no-expiry', eventCompletionId: 1 }
const flush = () => new Promise(setImmediate)
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
function environment() {
  const slots = [], calls = []
  let cursor = 0, effects = [], parameters = [], writes = 0
  const context = { user: { uid: 'manager' } }
  const services = {
    listConformities: async () => [row], getConformity: async () => row,
    createConformity: async () => ({ ...row, id: '43' }), updateConformity: async () => row,
    changeConformityApplicability: async () => ({ ...row, applicable: false }),
    importConformities: async () => ({ processed: 1, inserted: 1, updated: 0, rejected: 0, rejectedRows: [] }),
    listConformityNrs: async () => [{ code: 10, title: 'Eletricidade' }],
    listCollaborators: async () => [{ id: '7', name: 'Ana', status: 'ATIVO' }, { id: '8', status: 'DESATIVADO' }, { id: '9', status: 'PRE_CADASTRADO' }],
  }
  const tracked = Object.fromEntries(Object.keys(services).map(name => [name, (...args) => { calls.push({ name, args }); return services[name](...args) }]))
  const react = {
    useRef(value) { const index = cursor++; slots[index] ??= { current: value }; return slots[index] },
    useState(initial) {
      const index = cursor++; slots[index] ??= { value: typeof initial === 'function' ? initial() : initial }
      return [slots[index].value, update => { writes++; slots[index].value = typeof update === 'function' ? update(slots[index].value) : update }]
    },
    useEffect(effect, dependencies) {
      const index = cursor++, old = slots[index]
      if (!old || dependencies.some((value, i) => !Object.is(value, old.dependencies[i]))) effects.push(() => {
        old?.cleanup?.(); slots[index] = { dependencies, cleanup: effect() }
      })
    },
  }
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync('src/hooks/useConformities.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', code)(name => name === 'react' ? react : name === './useAuthentication' ? { useAuthentication: () => context } : tracked, module, module.exports)
  return {
    context, services, calls, get writes() { return writes },
    render(...args) {
      if (args.length) parameters = args
      cursor = 0; effects = []
      const result = module.exports.useConformities(...parameters)
      effects.forEach(effect => effect())
      return result
    },
    unmount() { slots.forEach(slot => slot.cleanup?.()) },
  }
}

test('consulta detalhes atuais e cancela respostas antigas após troca, retry ou fechamento', async () => {
  const env = environment(), first = deferred(), second = deferred()
  env.services.getConformity = id => id === '42' ? first.promise : second.promise
  assert.equal(env.render('42').details.loading, true)
  env.render('43')
  assert.equal(env.calls.find(call => call.name === 'getConformity').args[1].aborted, true)
  first.resolve(row)
  await flush()
  assert.equal(env.render().details.data, null)
  second.resolve({ ...row, id: '43' })
  await flush()
  assert.equal(env.render().details.data.id, '43')
  env.render(undefined)
  assert.equal(env.render().details.data, null)
})

test('salvar aguarda confirmação, bloqueia duplicação e preserva lista e dados em erro', async () => {
  const env = environment(), pending = deferred()
  env.render()
  await flush()
  env.services.updateConformity = () => pending.promise
  const api = env.render(), attempt = api.save({}, '42')
  assert.equal(env.render().saving, true)
  assert.match((await api.save({}, '42')).error, /Aguarde/)
  assert.equal(env.render().conformities[0].id, '42')
  pending.reject(new Error('A NR não corresponde à conclusão.'))
  assert.equal((await attempt).error, 'A NR não corresponde à conclusão.')
  assert.equal(env.render().saving, false)
  assert.equal(env.render().conformities[0].origin, 'Evento')
  assert.equal(env.calls.filter(call => call.name === 'listConformities').length, 1)
})

test('cada escrita recarrega a view, incluindo histórico revelado após tornar não aplicável', async () => {
  const env = environment()
  env.render()
  await flush()
  const historical = { ...row, id: '41', expiresAt: '2027-01-01' }
  env.services.listConformities = async () => [historical]
  assert.equal((await env.render().changeApplicability('42', false)).error, null)
  assert.equal(env.render().loading, true)
  await flush()
  assert.equal(env.render().conformities[0].id, '41')
  assert.deepEqual(env.calls.find(call => call.name === 'changeConformityApplicability').args.slice(0, 2), ['42', false])
  assert.equal((await env.render().save({})).error, null)
  env.render(); await flush()
  assert.equal((await env.render().save({}, '41')).error, null)
  env.render(); await flush()
  assert.equal((await env.render().importFile({})).error, null)
  env.render(); await flush()
  assert.equal(env.calls.filter(call => call.name === 'listConformities').length, 5)
})

test('falha ao recarregar depois de salvar mostra erro de leitura sem repetir a escrita', async () => {
  const env = environment()
  env.render(); await flush()
  env.services.listConformities = async () => { throw new Error('Lista indisponível.') }
  assert.equal((await env.render().save({})).error, null)
  env.render(); await flush()
  assert.equal(env.render().error, 'Lista indisponível.')
  env.services.listConformities = async () => [row]
  env.render().retry(); env.render(); await flush()
  assert.equal(env.render().error, '')
  assert.equal(env.calls.filter(call => call.name === 'createConformity').length, 1)
})

test('opções usam NRs reais e colaboradores ativos; edição de histórico dispensa lista de colaboradores', async () => {
  const env = environment()
  env.render('42', true, false); await flush()
  assert.deepEqual(env.render().options.data.nrs, [{ code: 10, title: 'Eletricidade' }])
  assert.equal(env.calls.some(call => call.name === 'listCollaborators'), false)
  env.render(undefined, true, true); await flush()
  assert.deepEqual(env.render().options.data.employees.map(person => person.id), ['7'])
  env.services.listConformityNrs = async () => { throw new Error('NRs indisponíveis.') }
  env.render().retryOptions(); env.render(); await flush()
  assert.equal(env.render().options.error, 'NRs indisponíveis.')
})

test('desmontagem e troca de conta abortam leituras e escritas, sem publicar resultado tardio', async () => {
  const env = environment(), pending = deferred()
  env.render('42', true, true); await flush()
  env.services.updateConformity = () => pending.promise
  const operation = env.render().save({}, '42')
  const signal = env.calls.find(call => call.name === 'updateConformity').args[2]
  env.context.user = { uid: 'other' }
  assert.deepEqual(env.render().conformities, [])
  assert.equal(signal.aborted, true)
  assert.equal(env.render().saving, false)
  env.context.user = { uid: 'manager' }
  env.render(); await flush()
  pending.resolve({ ...row, id: '99' })
  assert.match((await operation).error, /sessão mudou/)
  assert.equal(env.render().conformities[0].id, '42')
  const next = deferred()
  env.services.importConformities = () => next.promise
  const importing = env.render().importFile({})
  env.unmount()
  const writes = env.writes
  next.resolve({ processed: 0, inserted: 0, updated: 0, rejected: 0, rejectedRows: [] })
  await importing
  assert.equal(env.writes, writes)
  for (const call of env.calls.filter(call => ['listConformities', 'listConformityNrs', 'listCollaborators'].includes(call.name))) assert.equal(call.args[0].aborted, true)
})
