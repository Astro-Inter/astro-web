const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const { FirebaseError } = require('firebase/app')

function environment() {
  const requests = []
  const signIns = []
  const auth = {}
  const credential = { user: { uid: 'manager' } }
  let verify = async () => response('GESTOR')
  let signIn = async () => credential
  let authListener
  let authErrorListener
  let unsubscribed = false
  const cache = new Map()

  function load(filename) {
    filename = path.resolve(filename)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }
    cache.set(filename, module)
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    new Function('require', 'module', 'exports', 'fetch', code)(specifier => {
      if (specifier === './firebase') return { firebaseAuth: auth }
      if (specifier === './systemApi') return { getSystemApiBaseUrl: () => 'https://api.example.test' }
      if (specifier === 'firebase/auth') return {
        signInWithEmailAndPassword: async (...args) => { signIns.push(args); return signIn(...args) },
        onAuthStateChanged: (_auth, listener, errorListener) => {
          authListener = listener
          authErrorListener = errorListener
          return () => { unsubscribed = true }
        },
        signOut: async () => authListener?.(null),
      }
      return specifier.startsWith('.') ? load(path.resolve(path.dirname(filename), `${specifier}.ts`)) : require(specifier)
    }, module, module.exports, async (...args) => { requests.push(args); return verify(...args) })
    return module.exports
  }

  return {
    ...load('src/services/authentication.ts'), requests, signIns, auth, credential,
    respondWith(fn) { verify = fn },
    signInWith(fn) { signIn = fn },
    emit(user) { return authListener(user) },
    emitError() { authErrorListener() },
    get unsubscribed() { return unsubscribed },
  }
}

function response(userType) {
  return Response.json({ success: true, data: { userType, userStatus: 'ATIVO' } })
}

const credentials = { email: ' GESTOR@Example.com ', password: ' Senha123 ' }

test('verifica o email antes do Firebase para os dois tipos de gestor, sem enviar a senha à API', async () => {
  for (const userType of ['GESTOR', 'GESTOR_WORKSPACE']) {
    const env = environment()
    env.respondWith(async (url, options) => {
      assert.equal(env.signIns.length, 0)
      assert.equal(url, 'https://api.example.test/verify-email')
      assert.equal(options.method, 'POST')
      assert.deepEqual(options.headers, { Accept: 'application/json', 'Content-Type': 'application/json' })
      assert.deepEqual(JSON.parse(options.body), { email: 'gestor@example.com' })
      assert.ok(options.signal instanceof AbortSignal)
      assert.equal(options.signal.aborted, false)
      return response(userType)
    })
    assert.equal(await env.loginWithEmailAndPassword(credentials), env.credential)
    assert.equal(env.requests.length, 1)
    assert.deepEqual(env.signIns, [[env.auth, 'gestor@example.com', ' Senha123 ']])
  }
})

test('aguarda a conclusão da verificação para enviar as credenciais ao Firebase', async () => {
  const env = environment()
  let resolve
  env.respondWith(() => new Promise(done => { resolve = done }))
  const pending = env.loginWithEmailAndPassword(credentials)
  assert.equal(env.requests.length, 1)
  assert.equal(env.signIns.length, 0)
  resolve(response('GESTOR'))
  await pending
  assert.equal(env.signIns.length, 1)
})

test('email não cadastrado e colaborador interrompem o login antes do Firebase com mensagens específicas', async () => {
  for (const [result, message] of [
    [Response.json({ success: false }, { status: 404 }), /Email não cadastrado/],
    [response('COLABORADOR'), /apenas para gestores/],
  ]) {
    const env = environment()
    env.respondWith(async () => result)
    await assert.rejects(env.loginWithEmailAndPassword(credentials), error => {
      assert.ok(error instanceof env.AuthenticationError)
      assert.match(error.message, message)
      assert.equal(error.invalidCredentials, false)
      return true
    })
    assert.equal(env.signIns.length, 0)
  }
})

test('falhas HTTP e respostas incompletas ou desconhecidas nunca liberam o Firebase', async () => {
  const results = [
    ...[400, 401, 403, 429, 500, 503].map(status => new Response('Detalhes internos', { status })),
    new Response(null, { status: 204 }),
    new Response('<html>Falha</html>'),
    ...[null, true, [], {}, { success: true }, { success: true, data: null },
      { success: true, data: {} }, { success: false, data: { userType: 'GESTOR' } },
      { success: 'true', data: { userType: 'GESTOR' } },
      ...['ADMIN', 'GESTOR_WORSPACE', 'gestor', null, 1].map(userType => ({ success: true, data: { userType } })),
    ].map(body => Response.json(body)),
  ]
  for (const result of results) {
    const env = environment()
    env.respondWith(async () => result)
    await assert.rejects(env.loginWithEmailAndPassword(credentials), /Não conseguimos verificar seu email/)
    assert.equal(env.signIns.length, 0)
  }
})

test('falhas de rede e timeout bloqueiam o Firebase e permitem repetir a verificação', async () => {
  for (const error of [new TypeError('Failed to fetch'), new DOMException('Timeout', 'TimeoutError')]) {
    const env = environment()
    env.respondWith(async () => { throw error })
    await assert.rejects(env.loginWithEmailAndPassword(credentials), /Não conseguimos verificar seu email/)
    assert.equal(env.signIns.length, 0)
    env.respondWith(async () => response('GESTOR_WORKSPACE'))
    assert.equal(await env.loginWithEmailAndPassword(credentials), env.credential)
    assert.equal(env.requests.length, 2)
    assert.equal(env.signIns.length, 1)
  }
})

test('campos inválidos não chamam a API nem o Firebase', async () => {
  const env = environment()
  for (const invalid of [
    { ...credentials, email: '' }, { ...credentials, email: 'invalid' },
    { ...credentials, password: '' }, { ...credentials, password: 'x'.repeat(129) },
  ]) await assert.rejects(env.loginWithEmailAndPassword(invalid))
  assert.equal(env.requests.length, 0)
  assert.equal(env.signIns.length, 0)
})

test('preserva as mensagens do Firebase após a API liberar o gestor', async () => {
  for (const [code, message, invalidCredentials] of [
    ['auth/invalid-credential', /E-mail ou senha inválido/, true],
    ['auth/wrong-password', /E-mail ou senha inválido/, true],
    ['auth/user-disabled', /conta está desativada/, false],
    ['auth/network-request-failed', /Não foi possível conectar/, false],
  ]) {
    const env = environment()
    env.signInWith(async () => { throw new FirebaseError(code, 'internal') })
    await assert.rejects(env.loginWithEmailAndPassword(credentials), error => {
      assert.ok(error instanceof env.AuthenticationError)
      assert.match(error.message, message)
      assert.equal(error.invalidCredentials, invalidCredentials)
      return true
    })
    assert.equal(env.requests.length, 1)
    assert.equal(env.signIns.length, 1)
  }
})

function sessionUser(email = 'gestor@example.com', uid = 'manager') {
  return { uid, email, displayName: 'Gestor' }
}

test('publica o perfil retornado pela verificação inicial depois do Firebase, sem repetir a consulta', async () => {
  for (const accountType of ['GESTOR', 'GESTOR_WORKSPACE']) {
    const env = environment()
    const users = []
    let pending = 0
    env.respondWith(async () => response(accountType))
    env.observeAuthentication(user => users.push(user), assert.fail, () => pending++)
    env.signInWith(async () => { await env.emit(sessionUser()); return env.credential })
    await env.loginWithEmailAndPassword(credentials)
    assert.deepEqual(users, [{ ...sessionUser(), accountType }])
    assert.equal(env.requests.length, 1)
    assert.equal(pending, 1)
  }
})

test('sessão restaurada consulta novamente a API e aguarda o perfil antes de liberar a aplicação', async () => {
  const env = environment()
  const users = []
  let resolve
  let pending = false
  env.respondWith(() => new Promise(done => { resolve = done }))
  env.observeAuthentication(user => users.push(user), assert.fail, () => { pending = true })
  const restoring = env.emit(sessionUser())
  assert.equal(pending, true)
  assert.equal(users.length, 0)
  assert.deepEqual(JSON.parse(env.requests[0][1].body), { email: 'gestor@example.com' })
  resolve(response('GESTOR'))
  await restoring
  assert.deepEqual(users, [{ ...sessionUser(), accountType: 'GESTOR' }])
})

test('novo evento de sessão não reutiliza perfil antigo nem verificação de login com senha incorreta', async () => {
  const env = environment()
  const users = []
  env.observeAuthentication(user => users.push(user), assert.fail)
  env.signInWith(async () => { throw new FirebaseError('auth/wrong-password', 'internal') })
  await assert.rejects(env.loginWithEmailAndPassword(credentials))
  env.respondWith(async () => response('GESTOR_WORKSPACE'))
  await env.emit(sessionUser())
  env.respondWith(async () => response('GESTOR'))
  await env.emit(sessionUser())
  assert.deepEqual(users.map(user => user.accountType), ['GESTOR_WORKSPACE', 'GESTOR'])
  assert.equal(env.requests.length, 3)
})

test('sessão restaurada sem perfil permitido ou com falha da API não publica usuário autenticado', async () => {
  for (const result of [response('COLABORADOR'), response('ADMIN'), new Response(null, { status: 404 }), new Response(null, { status: 503 })]) {
    const env = environment()
    const users = [], errors = []
    env.respondWith(async () => result)
    env.observeAuthentication(user => users.push(user), error => errors.push(error))
    await env.emit(sessionUser())
    assert.equal(users.length, 0)
    assert.equal(errors.length, 1)
    assert.doesNotMatch(errors[0], /Atualize a página/)
  }
  const env = environment()
  const errors = []
  env.observeAuthentication(assert.fail, error => errors.push(error))
  await env.emit(sessionUser(null))
  assert.equal(env.requests.length, 0)
  assert.match(errors[0], /email válido/)
})

test('logout e desmontagem cancelam verificação pendente e descartam respostas tardias', async () => {
  for (const action of ['logout', 'unmount', 'observer-error']) {
    for (const failure of [false, true]) {
      const env = environment()
      const users = [], errors = []
      let resolve, reject
      env.respondWith(() => new Promise((done, fail) => { resolve = done; reject = fail }))
      const stop = env.observeAuthentication(user => users.push(user), error => errors.push(error))
      const restoring = env.emit(sessionUser())
      if (action === 'logout') await env.logout()
      else if (action === 'unmount') stop()
      else env.emitError()
      assert.equal(env.requests[0][1].signal.aborted, true)
      if (failure) reject(new TypeError('offline'))
      else resolve(response('GESTOR_WORKSPACE'))
      await restoring
      assert.deepEqual(users, action === 'logout' ? [null] : [])
      assert.equal(errors.length, action === 'observer-error' ? 1 : 0)
      if (action === 'unmount') assert.equal(env.unsubscribed, true)
    }
  }
})

test('trocar de conta descarta o perfil e o erro tardios da conta anterior, mesmo com email igual', async () => {
  for (const failure of [false, true]) {
    const env = environment()
    const users = [], errors = []
    let resolve, reject
    env.respondWith(() => new Promise((done, fail) => { resolve = done; reject = fail }))
    env.observeAuthentication(user => users.push(user), error => errors.push(error))
    const first = env.emit(sessionUser())
    env.respondWith(async () => response('GESTOR'))
    await env.emit(sessionUser('gestor@example.com', 'another-manager'))
    assert.equal(env.requests[0][1].signal.aborted, true)
    if (failure) reject(new TypeError('offline'))
    else resolve(response('GESTOR_WORKSPACE'))
    await first
    assert.deepEqual(users, [{ ...sessionUser('gestor@example.com', 'another-manager'), accountType: 'GESTOR' }])
    assert.deepEqual(errors, [])
  }
})
