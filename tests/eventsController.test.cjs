const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const flush = () => new Promise(setImmediate)
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const event = { id: 42, eventClasses: [] }
const row = { eventId: 42, eventClassId: 9, eventTitle: 'Treinamento', startDate: '2099-11-05T08:00:00', endDate: '2099-11-05T09:00:00', status: 'ATIVO' }
function environment(hook = 'useEvents') {
  const slots = [], calls = [], cache = new Map()
  let cursor = 0, effects = [], args = [], writes = 0
  const context = { user: { uid: 'gestor' } }
  const services = { listEvents: async () => [row], getEvent: async () => event, createEvent: async () => event, updateEvent: async () => event, cancelEvent: async () => event, listEventCandidates: async () => [], listEventNrs: async () => [], listCollaborators: async () => [] }
  const tracked = Object.fromEntries(Object.keys(services).map(name => [name, (...parameters) => { calls.push({ name, args: parameters }); return services[name](...parameters) }]))
  const react = {
    useState(initial) { const i = cursor++; slots[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, update => { writes++; slots[i].value = typeof update === 'function' ? update(slots[i].value) : update }] },
    useRef(initial) { const i = cursor++; slots[i] ??= { current: initial }; return slots[i] },
    useEffect(effect, dependencies) { const i = cursor++, old = slots[i]; if (!old || dependencies.some((d, j) => !Object.is(d, old.dependencies[j]))) effects.push(() => { old?.cleanup?.(); slots[i] = { dependencies, cleanup: effect() } }) },
  }
  function load(filename) {
    filename = path.resolve(filename)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    new Function('require', 'module', 'exports', code)(name => {
      if (name === 'react') return react
      if (name === './useAuthentication') return { useAuthentication: () => context }
      if (name === '../services/events' || name === '../services/collaborators') return tracked
      return load(path.resolve(path.dirname(filename), `${name}.ts`))
    }, module, module.exports)
    return module.exports
  }
  const api = load(`src/hooks/${hook}.ts`)
  return { services, calls, context, get writes() { return writes },
    render(...parameters) {
      if (parameters.length) args = parameters
      let result, rerenders = 0, count
      do { count = writes; cursor = 0; effects = []; result = api[hook](...args) } while (count !== writes && ++rerenders < 10)
      effects.forEach(effect => effect()); return result
    }, unmount() { slots.forEach(slot => slot.cleanup?.()) },
  }
}
const date = new Date(2099, 10, 5)

test('fotos são cruzadas por ID em uma leitura por sessão, preservando os participantes elegíveis', async () => {
  const env = environment('useEventCollaboratorPhotos')
  const people = [{ id: '11', name: 'Ana', email: 'ana@example.test' }, { id: '12', name: 'Bruno', email: 'bruno@example.test' }]
  env.services.listCollaborators = async () => [{ id: '11', profilePhotoUrl: 'https://images.example.test/ana.jpg', avatarInitials: 'AS' }, { id: '99', profilePhotoUrl: 'https://images.example.test/outro.jpg' }]
  assert.equal(env.render(people)[0].profilePhotoUrl, undefined)
  await flush()
  const result = env.render()
  assert.equal(result[0].profilePhotoUrl, 'https://images.example.test/ana.jpg')
  assert.equal(result[0].name, 'Ana')
  assert.equal(result[1].profilePhotoUrl, undefined)
  assert.equal(result.length, 2)
  env.render(people.slice(1)); await flush()
  assert.equal(env.calls.filter(call => call.name === 'listCollaborators').length, 1)
  env.unmount()
})

test('troca de conta descarta fotos anteriores, desmontagem cancela a leitura e falha mantém as pessoas', async () => {
  const env = environment('useEventCollaboratorPhotos'), pending = deferred()
  const people = [{ id: '11', name: 'Ana' }]
  env.services.listCollaborators = async () => [{ id: '11', profilePhotoUrl: 'https://images.example.test/ana.jpg', avatarInitials: 'AS' }]
  env.render(people); await flush(); assert.ok(env.render()[0].profilePhotoUrl)
  env.services.listCollaborators = () => pending.promise
  env.context.user = { uid: 'outra-conta' }
  assert.equal(env.render()[0].profilePhotoUrl, undefined)
  env.unmount(); const writes = env.writes
  assert.equal(env.calls.at(-1).args[0].aborted, true)
  pending.resolve([{ id: '11', profilePhotoUrl: 'https://images.example.test/old.jpg' }]); await flush()
  assert.equal(env.writes, writes)
  const failed = environment('useEventCollaboratorPhotos')
  failed.services.listCollaborators = async () => { throw Error('Offline') }
  failed.render(people); await flush(); assert.deepEqual(failed.render(), people)
  failed.unmount()
})
test('calendário ignora resposta de período anterior e oferece recuperação de erro', async () => {
  const env = environment(), first = deferred(), second = deferred()
  env.services.listEvents = start => start.startsWith('2099-10') ? first.promise : second.promise
  assert.equal(env.render(new Date(2099, 9, 5), 'month').loading, true)
  env.render(date, 'month')
  assert.equal(env.calls[0].args[2].aborted, true)
  first.resolve([row]); await flush(); assert.equal(env.render().loading, true)
  second.reject(Error('API indisponível')); await flush()
  assert.match(env.render().error, /indisponível/)
  env.services.listEvents = async () => [row]
  env.render().retry(); env.render(); await flush()
  assert.equal(env.render().events[0].eventId, '42'); assert.equal(env.render().error, '')
  env.unmount()
})
test('detalhes trocados/fechados são cancelados; reabrir não reutiliza permissões antigas', async () => {
  const env = environment(), a = deferred(), b = deferred()
  env.services.getEvent = id => id === '42' ? a.promise : b.promise
  env.render(date, 'month', '42'); env.render(date, 'month', '43')
  a.resolve({ id: 42, canEdit: true }); await flush()
  assert.equal(env.render().details.data, null)
  b.resolve({ id: 43, canEdit: false }); await flush(); assert.equal(env.render().details.data.id, 43)
  env.render(date, 'month', undefined)
  env.services.getEvent = () => deferred().promise
  assert.equal(env.render(date, 'month', '43').details.data, null)
  assert.equal(env.render().details.loading, true)
  env.unmount()
})
test('salvar aguarda persistência, bloqueia duplicação e recarrega calendário; erro permite nova tentativa', async () => {
  const env = environment(), pending = deferred()
  env.render(date, 'month'); await flush()
  env.services.createEvent = () => pending.promise
  const saving = env.render().save({})
  await assert.rejects(env.render().save({}), /Aguarde/)
  assert.equal(env.calls.filter(c => c.name === 'createEvent').length, 1)
  pending.reject(Error('Dados inválidos')); await assert.rejects(saving, /Dados inválidos/)
  env.services.createEvent = async () => event
  assert.equal((await env.render().save({})).id, 42)
  env.render(); await flush()
  assert.equal(env.calls.filter(c => c.name === 'listEvents').length, 2)
  env.unmount()
})
test('troca de conta oculta dados e desmontagem cancela leituras e escrita pendente', async () => {
  const env = environment(), pending = deferred()
  env.render(date, 'month', '42'); await flush()
  assert.equal(env.render().events.length, 1)
  env.context.user = { uid: 'outro' }
  const next = env.render(); assert.equal(next.events.length, 0); assert.equal(next.details.data, null)
  env.services.updateEvent = () => pending.promise
  const saving = env.render().save({}, '42'), request = env.calls.at(-1)
  env.unmount(); const writes = env.writes
  assert.equal(request.args[2].aborted, true)
  pending.resolve(event); await assert.rejects(saving, { name: 'AbortError' }); await flush()
  assert.equal(env.writes, writes)
})
test('candidatos usam a NR selecionada e descartam consulta antiga e resposta após desmontar', async () => {
  const env = environment('useEventCandidates'), first = deferred(), second = deferred()
  env.services.listEventCandidates = nr => nr === '10' ? first.promise : second.promise
  env.render('10'); env.render('35')
  const nr10 = env.calls.find(c => c.name === 'listEventCandidates' && c.args[0] === '10')
  assert.equal(nr10.args[1].aborted, true)
  first.resolve([{ id: 1, name: 'Antigo', email: null, roleName: null, unitName: null, workModel: null }]); await flush()
  assert.deepEqual(env.render().collaborators, [])
  env.unmount(); const writes = env.writes
  second.resolve([]); await flush(); assert.equal(env.writes, writes)
})
