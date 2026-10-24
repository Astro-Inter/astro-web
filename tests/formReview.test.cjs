const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { MemoryRouter } = require('react-router-dom')
const { JSDOM } = require('jsdom')
const { act } = React

function environment() {
  const cache = new Map(), calls = []
  const context = { user: { uid: 'current', displayName: 'Revisor', accountType: 'GESTOR' }, status: 'ready' }
  const services = { getFormReview: async () => load('src/data/formReviewPreview.ts').createFormReviewPreview() }
  function Modal({ children, title, onClose }) { return React.createElement('section', { role: 'dialog' }, React.createElement('h2', null, title), typeof children === 'function' ? children(onClose) : children) }
  function load(filename) {
    filename = path.resolve(filename)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'").replaceAll('import.meta.env.DEV', 'true')
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'module', 'exports', code)(name => {
      if (name.endsWith('/useAuthentication')) return { useAuthentication: () => context }
      if (name === '../services/formReview') return { getFormReview: (...args) => { calls.push(args); return services.getFormReview(...args) } }
      if (name.endsWith('/appModal')) return { __esModule: true, default: Modal }
      if (name.endsWith('/appSidebar')) return { __esModule: true, default: () => null }
      if (!name.startsWith('.')) return require(name)
      const resolved = path.resolve(path.dirname(filename), name)
      const file = [`${resolved}.ts`, `${resolved}.tsx`, path.join(resolved, 'index.tsx')].find(file => fs.existsSync(file))
      return load(file)
    }, module, module.exports)
    return module.exports
  }
  return { load, context, services, calls }
}
async function withDom(run) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
  const previous = Object.fromEntries(['window', 'document', 'IS_REACT_ACT_ENVIRONMENT', 'requestAnimationFrame'].map(key => [key, global[key]]))
  Object.assign(global, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true, requestAnimationFrame: fn => { fn(); return 0 } })
  const root = require('react-dom/client').createRoot(document.getElementById('root'))
  try { await run(root) } finally { await act(async () => root.unmount()); dom.window.close(); Object.assign(global, previous) }
}
async function mount(root, Page, route) { await act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(Page)))) }
async function click(text, scope = document) {
  const button = [...scope.querySelectorAll('button')].find(item => item.textContent === text)
  assert.ok(button, `Button ${text}`)
  await act(async () => button.click())
}

test('aprovação omite completamente a descrição; somente a reprovação a inclui', () => {
  const env = environment(), { createReviewDecision } = env.load('src/utils/formReview.ts')
  const approved = createReviewDecision('approved', 'Revisor', 'não pode vazar', '2026-10-23T14:00:00Z')
  assert.equal('description' in approved, false)
  assert.equal(JSON.stringify(approved).includes('description'), false)
  const rejected = createReviewDecision('rejected', 'Revisor', '  Documentação insuficiente.  ')
  assert.equal(rejected.description, 'Documentação insuficiente.')
  for (const status of ['awaiting_review', 'awaiting_response', 'approved']) {
    assert.equal('description' in env.load('src/data/formReviewPreview.ts').createFormReviewPreview(status).review, false)
  }
})
test('reprovação exige uma descrição preenchida e respeita seu limite', () => {
  const { createReviewDecision } = environment().load('src/utils/formReview.ts')
  assert.throws(() => createReviewDecision('rejected', 'Revisor', '   '), /Descreva/)
  assert.throws(() => createReviewDecision('rejected', 'Revisor', 'a'.repeat(1001)), /1000/)
})
test('somente o remetente e gestor de workspace podem validar; decisões finais não reabrem', () => {
  const env = environment(), { canReviewForm } = env.load('src/utils/formReview.ts'), { createFormReviewPreview } = env.load('src/data/formReviewPreview.ts')
  const data = createFormReviewPreview()
  assert.equal(canReviewForm(data, 'GESTOR'), true)
  assert.equal(canReviewForm({ ...data, currentManagerId: 8 }, 'GESTOR'), false)
  assert.equal(canReviewForm({ ...data, currentManagerId: 9 }, 'GESTOR_WORKSPACE'), true)
  assert.equal(canReviewForm({ ...data, currentManagerId: null }, 'GESTOR_WORKSPACE'), false)
  for (const state of ['approved', 'rejected', 'awaiting_response']) assert.equal(canReviewForm(createFormReviewPreview(state), 'GESTOR_WORKSPACE'), false)
})
test('respostas são formatadas sem aceitar datas inválidas ou URLs de arquivo executáveis', () => {
  const env = environment(), utils = env.load('src/utils/formReview.ts'), question = env.load('src/data/formReviewPreview.ts').createFormReviewPreview().form.questions[0]
  assert.deepEqual(utils.selectedOptionIds(question), [1])
  assert.equal(utils.formatResponseDate('2026-10-23'), '23/10/2026')
  assert.equal(utils.formatResponseDate('2026-02-31'), 'Não informado')
  for (const url of ['javascript:alert(1)', 'data:text/html,<script>', 'https://user:password@host.test/a.jpg']) assert.equal(utils.safeResponseFileUrl(url), null)
  assert.equal(utils.safeResponseFileUrl('https://files.test/a.jpg'), 'https://files.test/a.jpg')
})
test('prévia apresenta as respostas e não consulta a API nem exibe motivo antes da reprovação', async () => withDom(async root => {
  const env = environment(), Page = env.load('src/pages/formResponses/index.tsx').default
  await mount(root, Page, '/mainFormScreen/responses?preview=1')
  assert.match(document.body.textContent, /Ana Souza/)
  assert.match(document.body.textContent, /4 de 5 respondidas/)
  const optionalQuestion = document.getElementById('response-question-5').closest('article')
  assert.match(optionalQuestion.textContent, /Opcional/)
  assert.match(optionalQuestion.textContent, /Esta pergunta não foi respondida/)
  assert.equal(optionalQuestion.querySelector('.form-response-filled'), null)
  assert.equal(document.querySelector('textarea'), null)
  assert.doesNotMatch(document.body.textContent, /Descrição da reprovação/)
  assert.equal(env.calls.length, 0)
  await click('Reprovar formulário')
  assert.ok(document.getElementById('form-rejection-description'))
  await click('Confirmar reprovação')
  assert.match(document.querySelector('[role="alert"]').textContent, /Descreva o motivo/)
  assert.equal(document.querySelector('textarea').getAttribute('aria-invalid'), 'true')
  await click('Voltar à análise')
  assert.equal(document.querySelector('[role="dialog"]'), null)
  assert.equal(document.querySelector('textarea'), null)
}))
test('aprovar mostra resultado definitivo sem criar descrição e bloqueia uma nova decisão', async () => withDom(async root => {
  const env = environment(), Page = env.load('src/pages/formResponses/index.tsx').default
  await mount(root, Page, '/mainFormScreen/responses?preview=1')
  await click('Aprovar formulário')
  assert.equal(document.querySelector('textarea'), null)
  await click('Confirmar aprovação')
  assert.match(document.body.textContent, /Formulário aprovado/)
  assert.equal(document.querySelector('textarea'), null)
  assert.doesNotMatch(document.body.textContent, /Descrição da reprovação/)
  assert.equal([...document.querySelectorAll('button')].some(button => button.textContent === 'Reprovar formulário'), false)
  assert.equal(env.calls.length, 0)
}))
test('resultado reprovado apresenta o motivo sem edição nem novo envio', async () => withDom(async root => {
  const env = environment(), Page = env.load('src/pages/formResponses/index.tsx').default
  await mount(root, Page, '/mainFormScreen/responses?preview=1&state=rejected')
  assert.match(document.body.textContent, /Descrição da reprovação/)
  assert.match(document.body.textContent, /O formulário foi encerrado como reprovado/)
  assert.equal(document.querySelector('textarea'), null)
  assert.equal([...document.querySelectorAll('button')].some(button => /Aprovar formulário|Reprovar formulário|Reenviar/.test(button.textContent)), false)
}))
test('consulta real carrega dados pela API existente mas não simula a gravação de aprovação', async () => withDom(async root => {
  const env = environment(), Page = env.load('src/pages/formResponses/index.tsx').default
  await mount(root, Page, '/mainFormScreen/responses?id=61000000-0000-4000-8000-000000000001&workspaceId=999')
  assert.equal(env.calls.length, 1)
  assert.equal(env.calls[0][0], '61000000-0000-4000-8000-000000000001')
  assert.match(document.body.textContent, /A gravação da análise ainda não está disponível/)
  assert.ok([...document.querySelectorAll('button')].filter(button => /Aprovar formulário|Reprovar formulário/.test(button.textContent)).every(button => button.disabled))
}))
test('ID inválido é tratado sem consultar o serviço', async () => withDom(async root => {
  const env = environment(), Page = env.load('src/pages/formResponses/index.tsx').default
  await mount(root, Page, '/mainFormScreen/responses?id=invalid')
  assert.match(document.querySelector('[role="alert"]').textContent, /formulário válido/)
  assert.equal(env.calls.length, 0)
}))
