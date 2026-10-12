const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { FirebaseError } = require('firebase/app')

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function environment(react = React) {
  const user = { uid: 'current-user', email: 'current@example.test', providerData: [{ providerId: 'password' }] }
  const auth = { currentUser: user }
  const context = { user }
  const requests = []
  let reauthenticate = async () => undefined
  const cache = new Map()
  function load(filename) {
    filename = path.resolve(filename)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }
    cache.set(filename, module)
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'")
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'module', 'exports', code)(specifier => {
      if (specifier === 'react') return react
      if (specifier === './firebase') return { firebaseAuth: auth }
      if (specifier === './useAuthentication') return { useAuthentication: () => context }
      if (specifier === '../../hooks/usePopupStepTransition') return { usePopupStepTransition: () => update => update() }
      if (specifier === '../appModal') return { default: function AppModal() {} }
      if (specifier === 'firebase/auth') return {
        EmailAuthProvider: { PROVIDER_ID: 'password', credential: (email, password) => ({ email, password }) },
        reauthenticateWithCredential: async (currentUser, credential) => {
          requests.push({ user: currentUser, credential })
          return reauthenticate(currentUser, credential)
        },
      }
      if (!specifier.startsWith('.')) return require(specifier)
      const resolved = path.resolve(path.dirname(filename), specifier)
      return load([`${resolved}.ts`, `${resolved}.tsx`, path.join(resolved, 'index.tsx')].find(file => fs.existsSync(file)))
    }, module, module.exports)
    return module.exports
  }
  return { user, auth, context, requests, load, respondWith: callback => { reauthenticate = callback } }
}

// Scheduler mínimo para testar o controlador sem DOM nem chamadas a uma conta real.
// Exercita o código do hook com refs persistentes, re-render e cleanup dos efeitos.
function hookHarness() {
  const slots = []
  let cursor = 0
  let pendingEffects = []
  let renderFunction
  const react = {
    ...React,
    useLayoutEffect() {},
    useRef: value => {
      const index = cursor++
      slots[index] ??= { current: value }
      return slots[index]
    },
    useState: initial => {
      const index = cursor++
      slots[index] ??= { value: typeof initial === 'function' ? initial() : initial }
      return [slots[index].value, update => { slots[index].value = typeof update === 'function' ? update(slots[index].value) : update }]
    },
    useEffect: (effect, dependencies) => {
      const index = cursor++
      const old = slots[index]
      if (!old || dependencies.some((value, position) => !Object.is(value, old.dependencies[position]))) {
        pendingEffects.push(() => {
          old?.cleanup?.()
          slots[index] = { dependencies, cleanup: effect() }
        })
      }
    },
  }
  const env = environment(react)
  const useConfirmation = env.load('src/hooks/usePasswordConfirmation.ts').usePasswordConfirmation
  renderFunction = useConfirmation
  return {
    ...env,
    render() {
      cursor = 0
      pendingEffects = []
      const result = renderFunction()
      pendingEffects.forEach(effect => effect())
      return result
    },
    renderWith(fn) { renderFunction = fn; return this.render() },
    unmount() { slots.forEach(slot => slot.cleanup?.()) },
  }
}

test('reautentica exclusivamente o usuário atual, preservando a senha exatamente como digitada', async () => {
  const env = environment()
  const service = env.load('src/services/identityConfirmation.ts')
  await service.confirmarIdentidadeDoUsuario(' senha com espaços ', env.user.uid)
  assert.equal(env.requests.length, 1)
  assert.equal(env.requests[0].user, env.user)
  assert.deepEqual(env.requests[0].credential, { email: env.user.email, password: ' senha com espaços ' })
})

test('recusa sessão ausente, usuário diferente, email ausente e provedor sem senha antes do Firebase', async () => {
  const env = environment()
  const service = env.load('src/services/identityConfirmation.ts')
  for (const user of [null, { ...env.user, uid: 'another-user' }, { ...env.user, email: null }, { ...env.user, providerData: [{ providerId: 'google.com' }] }]) {
    env.auth.currentUser = user
    await assert.rejects(service.confirmarIdentidadeDoUsuario('senha', env.user.uid))
  }
  assert.equal(env.requests.length, 0)
})

test('valida senha vazia ou excessiva sem reautenticar', async () => {
  const env = environment()
  const service = env.load('src/services/identityConfirmation.ts')
  await assert.rejects(service.confirmarIdentidadeDoUsuario('', env.user.uid), /Informe sua senha/)
  await assert.rejects(service.confirmarIdentidadeDoUsuario('x'.repeat(129), env.user.uid), /128 caracteres/)
  assert.equal(env.requests.length, 0)
})

test('traduz erros de credencial, bloqueio, rede, conta desativada, sessão e erro desconhecido', async () => {
  const env = environment()
  const service = env.load('src/services/identityConfirmation.ts')
  for (const [code, message] of [
    ['auth/wrong-password', /Senha incorreta/], ['auth/invalid-credential', /Senha incorreta/],
    ['auth/invalid-login-credentials', /Senha incorreta/], ['auth/too-many-requests', /Muitas tentativas/],
    ['auth/network-request-failed', /conexão/], ['auth/user-disabled', /desativada/],
    ['auth/user-token-expired', /sessão expirou/], ['auth/invalid-user-token', /sessão expirou/],
    ['auth/user-mismatch', /sessão mudou/], ['auth/user-not-found', /Entre novamente/],
    ['auth/operation-not-allowed', /não está disponível/], ['auth/unknown-error', /Não foi possível confirmar/],
  ]) {
    env.respondWith(async () => { throw new FirebaseError(code, 'Detalhes internos que não devem chegar à interface') })
    await assert.rejects(service.confirmarIdentidadeDoUsuario('senha', env.user.uid), error => {
      assert.match(error.message, message)
      assert.doesNotMatch(error.message, /Detalhes internos/)
      assert.equal(error.cause, undefined)
      return true
    })
  }
  env.respondWith(async () => { throw Error('Erro interno com dados sensíveis') })
  await assert.rejects(service.confirmarIdentidadeDoUsuario('senha', env.user.uid), /Não foi possível confirmar/)
})

test('rejeita resultado se a sessão mudou durante a requisição, inclusive novo login com o mesmo UID', async () => {
  for (const sameUid of [false, true]) {
    const env = environment()
    const service = env.load('src/services/identityConfirmation.ts')
    env.respondWith(async () => { env.auth.currentUser = { ...env.user, uid: sameUid ? env.user.uid : 'another-user' } })
    await assert.rejects(service.confirmarIdentidadeDoUsuario('senha', env.user.uid), /sessão mudou/)
  }
})

test('bloqueia envios simultâneos, limpa senha e visibilidade e permite consumir sucesso uma única vez', async () => {
  const env = hookHarness()
  const response = deferred()
  env.respondWith(() => response.promise)
  let controller = env.render()
  controller.updatePassword('senha')
  controller.toggleVisibility()
  controller = env.render()
  const first = controller.submit()
  assert.equal(await controller.submit(), false)
  controller = env.render()
  assert.equal(controller.status, 'loading')
  assert.equal(controller.password, '')
  assert.equal(controller.visible, false)
  assert.equal(controller.blocked, true)
  assert.equal(controller.consumeConfirmation(), false)
  controller.updatePassword('outra senha')
  assert.equal(env.render().password, '')
  response.resolve()
  assert.equal(await first, true)
  controller = env.render()
  assert.equal(controller.status, 'success')
  assert.equal(await controller.submit(), false)
  assert.equal(controller.consumeConfirmation(), true)
  assert.equal(controller.consumeConfirmation(), false)
  assert.equal(env.requests.length, 1)
})

test('senha incorreta bloqueia a ação, limpa o campo e permite uma nova tentativa', async () => {
  const env = hookHarness()
  env.respondWith(async () => { throw new FirebaseError('auth/wrong-password', 'internal') })
  let controller = env.render()
  controller.updatePassword('errada')
  controller = env.render()
  assert.equal(await controller.submit(), false)
  controller = env.render()
  assert.equal(controller.password, '')
  assert.equal(controller.status, 'error')
  assert.match(controller.error, /Senha incorreta/)
  assert.equal(controller.consumeConfirmation(), false)
  env.respondWith(async () => undefined)
  controller.updatePassword('certa')
  controller = env.render()
  assert.equal(controller.error, '')
  assert.equal(await controller.submit(), true)
  assert.equal(env.render().consumeConfirmation(), true)
})

test('cancelar durante a validação ignora sucesso e erro tardios e não libera ações', async () => {
  for (const failure of [false, true]) {
    const env = hookHarness()
    const response = deferred()
    env.respondWith(() => response.promise)
    let controller = env.render()
    controller.updatePassword('senha')
    controller = env.render()
    const pending = controller.submit()
    controller.cancel()
    if (failure) response.reject(new FirebaseError('auth/wrong-password', 'internal'))
    else response.resolve()
    assert.equal(await pending, false)
    controller = env.render()
    assert.equal(controller.status, 'cancelled')
    assert.equal(controller.password, '')
    assert.equal(controller.error, '')
    assert.equal(controller.consumeConfirmation(), false)
    assert.equal(await controller.submit(), false)
  }
})

test('desmontar o modal descarta a resposta pendente', async () => {
  const env = hookHarness()
  const response = deferred()
  env.respondWith(() => response.promise)
  let controller = env.render()
  controller.updatePassword('senha')
  controller = env.render()
  const pending = controller.submit()
  env.unmount()
  response.resolve()
  assert.equal(await pending, false)
  assert.equal(controller.consumeConfirmation(), false)
})

test('trocar usuário com o modal aberto invalida senha e sucesso antes de fechar', async () => {
  const env = hookHarness()
  let controller = env.render()
  controller.updatePassword('senha')
  controller = env.render()
  assert.equal(await controller.submit(), true)
  env.auth.currentUser = { ...env.user, uid: 'another-user' }
  assert.equal(controller.consumeConfirmation(), false)
  env.context.user = env.auth.currentUser
  env.render()
  controller = env.render()
  assert.equal(controller.status, 'cancelled')
  assert.equal(controller.password, '')
  assert.equal(await controller.submit(), false)
})

test('modal só chama a ação original após sucesso e fechamento, sem trocar o callback durante a tentativa', async () => {
  const env = hookHarness()
  const Modal = env.load('src/components/passwordConfirmationModal/index.tsx').default
  const response = deferred()
  env.respondWith(() => response.promise)
  let originalCalls = 0, otherCalls = 0, cancelCalls = 0
  let onContinue = () => { originalCalls++ }
  const render = () => Modal({ className: '', onContinue, onCancel: () => { cancelCalls++ } })
  let modal = env.renderWith(render)
  let form = modal.props.children(() => modal.props.onDismissRequest())
  form.props.confirmation.updatePassword('senha')
  modal = env.render()
  form = modal.props.children(() => modal.props.onDismissRequest())
  const pending = form.props.onContinue()
  onContinue = () => { otherCalls++ }
  modal = env.render()
  assert.equal(originalCalls, 0)
  response.resolve()
  await pending
  modal = env.render()
  assert.equal(originalCalls, 0)
  modal.props.onClose()
  assert.equal(originalCalls, 1)
  assert.equal(otherCalls, 0)
  assert.equal(cancelCalls, 0)
})

test('Escape/backdrop/cancelamento usam o mesmo descarte e não executam a ação após resposta tardia', async () => {
  const env = hookHarness()
  const Modal = env.load('src/components/passwordConfirmationModal/index.tsx').default
  const response = deferred()
  env.respondWith(() => response.promise)
  let calls = 0, cancelled = 0
  let modal = env.renderWith(() => Modal({ className: '', onContinue: () => { calls++ }, onCancel: () => { cancelled++ } }))
  modal.props.children(() => modal.props.onDismissRequest()).props.confirmation.updatePassword('senha')
  modal = env.render()
  const pending = modal.props.children(() => modal.props.onDismissRequest()).props.onContinue()
  modal.props.onDismissRequest()
  response.resolve()
  await pending
  env.render().props.onClose()
  assert.equal(calls, 0)
  assert.equal(cancelled, 1)
})

test('formulário apresenta carregamento, erro acessível e sucesso, com botões e campo bloqueados', () => {
  const env = environment()
  const Form = env.load('src/components/passwordConfirmationForm/index.tsx').default
  const render = (status, error = '') => renderToStaticMarkup(React.createElement(Form, {
    confirmation: { password: '', visible: false, status, error, blocked: status === 'loading' || status === 'success', updatePassword() {}, toggleVisibility() {} },
    onCancel() {}, onContinue: async () => undefined,
  }))
  const loading = render('loading')
  assert.match(loading, /aria-busy="true"/)
  assert.match(loading, /role="status">Confirmando sua identidade/)
  assert.match(loading, /<input[^>]*disabled=""/)
  assert.match(loading, /<button[^>]*type="submit"[^>]*disabled=""/)
  assert.doesNotMatch(loading, /class="astro-modal-cancel" disabled/)
  assert.match(render('error', 'Senha incorreta.'), /role="alert">Senha incorreta/)
  assert.match(render('success'), /role="status">Identidade confirmada/)
})

test('transferência do gestor usa a mesma validação e só confirma depois do Firebase', async () => {
  const env = hookHarness()
  const Modal = env.load('src/components/replaceAccountFlowModal/index.tsx').default
  const response = deferred()
  env.respondWith(() => response.promise)
  let replaced = 0
  let modal = env.renderWith(() => Modal({ collaborators: [{ id: 'replacement', name: 'Novo gestor', email: 'new@example.test' }], onCancel() {}, onReplaced: () => { replaced++ } }))
  const dismiss = () => modal.props.onDismissRequest()
  const children = () => modal.props.children(dismiss).props.children
  children()[0].props.onChange('replacement')
  modal = env.render()
  children()[0].props.onContinue()
  modal = env.render()
  // Confirmação administrativa -> etapa de senha.
  children()[1].props.children[1].props.children[1].props.onClick()
  modal = env.render()
  children()[2].props.confirmation.updatePassword('senha')
  modal = env.render()
  const pending = children()[2].props.onContinue()
  assert.equal(replaced, 0)
  response.resolve()
  await pending
  modal = env.render()
  modal.props.onClose()
  assert.equal(replaced, 1)
  assert.equal(env.requests.length, 1)
  assert.equal(env.requests[0].credential.email, env.user.email)
})
