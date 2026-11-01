const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { MemoryRouter, Routes, Route } = require('react-router-dom')
const { JSDOM } = require('jsdom')
const { act } = React

function environment() {
  const cache = new Map(), repositories = new Map()
  function Modal({ title, children, onClose }) {
    return React.createElement('section', { role: 'dialog' }, React.createElement('h2', null, title), typeof children === 'function' ? children(onClose) : children)
  }
  function load(filename) {
    filename = path.resolve(filename)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'").replaceAll('import.meta.env', "{ DEV: true, VITE_NR_DATA_MODE: 'demo' }")
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'module', 'exports', code)(name => {
      if (name.endsWith('/useAuthentication')) return { useAuthentication: () => ({ user: { uid: 'nr-review-test' } }) }
      if (name.endsWith('/useLogout')) return { useLogout: () => ({ pending: false, error: '', submit: async () => {} }) }
      if (name.endsWith('/appSidebar')) return { __esModule: true, default: () => null }
      if (name.endsWith('/appModal')) return { __esModule: true, default: Modal }
      if (name.endsWith('/services/nrReviewRepository')) return { getNrReviewRepository: (_uid, scenario) => {
        if (!repositories.has(scenario)) repositories.set(scenario, load('src/services/nrReview.ts').createNrReviewDemo({ scenario, delay: 0 }))
        return repositories.get(scenario)
      } }
      if (!name.startsWith('.')) return require(name)
      const resolved = path.resolve(path.dirname(filename), name)
      return load([`${resolved}.ts`, `${resolved}.tsx`, path.join(resolved, 'index.tsx')].find(file => fs.existsSync(file)))
    }, module, module.exports)
    return module.exports
  }
  return { load, repositories }
}

test('confirmação distingue aprovação completa de sincronização SQL pendente', () => {
  const Notice = environment().load('src/components/nrApprovalNotice/index.tsx').default
  const render = sqlSynchronized => require('react-dom/server').renderToStaticMarkup(
    React.createElement(MemoryRouter, null, React.createElement(Notice, { nrId: 20, demonstration: false, sqlSynchronized, onDismiss() {} })))
  assert.match(render(true), /catálogo SQL também foi atualizado/)
  const pending = render(false)
  assert.match(pending, /NR aprovada com sucesso/)
  assert.match(pending, /tentada novamente automaticamente/)
  assert.match(pending, /Não é necessário aprovar a NR outra vez/)
})

test('adapter isolates snapshots, derives existing versions and removes only the reviewed candidate', async () => {
  const env = environment(), repository = env.load('src/services/nrReview.ts').createNrReviewDemo({ delay: 0 })
  const items = await repository.listPending()
  assert.equal(items.length, 6)
  assert.ok(await repository.getApproved(20))
  assert.equal(await repository.getApproved(35), null)
  items[0].document.nome = 'Changed after review'
  await assert.rejects(repository.approve(items[0]), /mudou/)
  assert.equal((await repository.listPending()).length, 6)
  const candidate = await repository.getPending(20)
  await repository.approve(candidate)
  assert.equal(await repository.getPending(20), null)
  assert.equal((await repository.listPending()).length, 5)
  await assert.rejects(repository.approve(candidate), /mudou/)
  assert.equal((await repository.getApproved(20)).ultima_atualizacao, '10/12/2019')
})

test('approval failure, missing candidate, empty list, read failure and cancellation', async () => {
  const { createNrReviewDemo } = environment().load('src/services/nrReview.ts')
  const failure = createNrReviewDemo({ scenario: 'approval-error', delay: 0 })
  await assert.rejects(failure.approve(await failure.getPending(20)), /Falha simulada/)
  assert.ok(await failure.getPending(20))
  assert.equal(await failure.getPending(999), null)
  assert.deepEqual(await createNrReviewDemo({ scenario: 'empty', delay: 0 }).listPending(), [])
  await assert.rejects(createNrReviewDemo({ scenario: 'load-error', delay: 0 }).listPending(), /carregar/)
  const controller = new AbortController()
  const request = createNrReviewDemo({ delay: 100 }).listPending(controller.signal)
  controller.abort()
  await assert.rejects(request, { name: 'AbortError' })
})

test('filters combine number/name, usability and revocation; route IDs reject malformed input', () => {
  const env = environment(), utils = env.load('src/utils/nrReview.ts'), data = env.load('src/data/nrReview.ts').pendingNrExamples
  const filters = { search: 'NR-20', usability: '', revoked: '', page: 1 }
  assert.deepEqual(utils.filterPendingNrs(data, filters).map(item => item._id), [20])
  assert.equal(utils.filterPendingNrs(data, { ...filters, search: 'inflamáveis' }).length, 1)
  assert.equal(utils.filterPendingNrs(data, { ...filters, usability: 'Empresa' }).length, 0)
  assert.deepEqual(utils.filterPendingNrs(data, { ...filters, search: '', usability: 'Empresa', revoked: 'true' }).map(item => item._id), [2])
  for (const id of [undefined, null, '', '0', '-1', '20x', 'Infinity', '9007199254740992']) assert.equal(utils.parseNrId(id), null)
  assert.equal(utils.parseNrId('20'), 20)
})

test('aprovação com correções valida a versão original antes de aplicar o conteúdo revisado', async () => {
  const { createNrReviewDemo } = environment().load('src/services/nrReview.ts')
  const repository = createNrReviewDemo({ delay: 0 }), candidate = await repository.getPending(20)
  const corrected = { ...candidate.document, nome: 'Conteúdo corrigido', revogada: true }
  await assert.rejects(repository.approve(candidate, undefined, { ...corrected, tempo_reciclagem_meses: 0 }), /campos/)
  assert.ok(await repository.getPending(20))
  await repository.approve(candidate, undefined, corrected)
  assert.deepEqual(await repository.getApproved(20), corrected)
  assert.equal(await repository.getPending(20), null)
  await assert.rejects(repository.approve(candidate, undefined, corrected), /mudou/)
})

test('destaque textual preserva o conteúdo original em inclusões, remoções e substituições', () => {
  const { nrTextDifference } = environment().load('src/utils/nrReview.ts')
  for (const [before, after] of [['Texto original final', 'Texto revisado final'], ['Trabalho seguro', 'Trabalho muito seguro'], ['Trabalho muito seguro', 'Trabalho seguro'], ['', 'Novo'], ['Anterior', ''], ['Mesmo texto', 'Mesmo texto'], ['a\n\nb', 'a\n\nc']]) {
    const parts = nrTextDifference(before, after)
    assert.equal(parts.before.join(''), before)
    assert.equal(parts.after.join(''), after)
  }
  const parts = nrTextDifference('Texto original final', 'Texto revisado final')
  assert.equal(parts.before[1], 'original')
  assert.equal(parts.after[1], 'revisado')
})

test('catálogo edita somente a versão atual, mantém pendente e recusa conflito, campos inválidos e falha simulada', async () => {
  const env = environment(), { createNrReviewDemo } = env.load('src/services/nrReview.ts')
  const repository = createNrReviewDemo({ delay: 0 })
  const current = await repository.getApproved(20), pending = await repository.getPending(20)
  assert.equal((await repository.listApproved()).length, 2)
  const updated = { ...current, nome: 'Nome revisado manualmente', tempo_reciclagem_meses: 36 }
  const saved = await repository.saveApproved(updated, current)
  saved.nome = 'Mutação externa'
  assert.equal((await repository.getApproved(20)).nome, updated.nome)
  assert.deepEqual(await repository.getPending(20), pending)
  await assert.rejects(repository.saveApproved(updated, current), /mudou/)
  await assert.rejects(repository.saveApproved({ ...updated, data_criacao: '2026-01-01T00:00:00Z' }, updated), /criação/)
  for (const invalid of [{ nome: ' ' }, { tempo_reciclagem_meses: 0 }, { tempo_reciclagem_meses: 1.5 }, { ultima_atualizacao: '31/02/2026' }, { usabilidade: 'Outro' }]) {
    await assert.rejects(repository.saveApproved({ ...updated, ...invalid }, updated), /campos/)
  }
  const failure = createNrReviewDemo({ scenario: 'approval-error', delay: 0 }), original = await failure.getApproved(20)
  await assert.rejects(failure.saveApproved({ ...original, nome: 'Alteração' }, original), /Falha simulada/)
  assert.deepEqual(await failure.getApproved(20), original)
})

async function withPage(route, run) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
  const keys = ['window', 'document', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT']
  const previous = Object.fromEntries(keys.map(key => [key, global[key]]))
  dom.window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
  Object.assign(global, { window: dom.window, document: dom.window.document, getComputedStyle: dom.window.getComputedStyle.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true })
  const root = require('react-dom/client').createRoot(document.getElementById('root'))
  const env = environment(), List = env.load('src/pages/pendingNrList/index.tsx').default, Detail = env.load('src/pages/pendingNrReview/index.tsx').default, Catalog = env.load('src/pages/nrCatalog/index.tsx').default
  try {
    await act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(Routes, null,
      React.createElement(Route, { path: '/admin/nrs/catalog', element: React.createElement(Catalog) }),
      React.createElement(Route, { path: '/admin/nrs/pending', element: React.createElement(List) }),
      React.createElement(Route, { path: '/admin/nrs/pending/:id', element: React.createElement(Detail) })))))
    await settle()
    await run(env)
  } finally { await act(async () => root.unmount()); dom.window.close(); Object.assign(global, previous) }
}
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)) }) }
async function waitFor(check) {
  const deadline = Date.now() + 5000
  while (!check()) {
    if (Date.now() >= deadline) assert.fail('O conteúdo esperado não terminou de carregar.')
    await settle()
  }
}
async function click(label) {
  const button = [...document.querySelectorAll('button')].find(button => button.textContent === label || button.getAttribute('aria-label') === label)
  assert.ok(button, label)
  await act(async () => button.click())
}
async function chooseFilter(id, label) {
  await act(async () => document.getElementById(id).click())
  await act(async () => window.dispatchEvent(new window.Event('scroll')))
  const option = [...document.getElementById(`${id}-options`).querySelectorAll('[role="option"]')].find(item => item.getAttribute('aria-label') === label)
  assert.ok(option, label)
  await act(async () => option.click())
}

test('catálogo abre consulta, habilita edição, pede confirmação e informa salvamento simulado', async () => withPage('/admin/nrs/catalog', async () => {
  assert.match(document.body.textContent, /2 resultado/)
  await click('Consultar NR-20')
  assert.equal(document.querySelector('fieldset').disabled, true)
  assert.equal(document.querySelectorAll('textarea').length, 3)
  await click('Editar NR')
  assert.equal(document.querySelector('fieldset').disabled, false)
  await act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  assert.match(document.body.textContent, /Salvar alterações da NR-20/)
  await act(async () => [...document.querySelectorAll('button')].filter(button => button.textContent === 'Cancelar').at(-1).click())
  assert.ok(document.querySelector('textarea'))
  await act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  await click('Confirmar alterações simuladas')
  await settle()
  assert.match(document.body.textContent, /alterada na simulação local/)
  assert.equal(document.querySelector('textarea'), null)
}))

test('catálogo combina filtros de usabilidade e revogação e permite limpar a seleção', async () => withPage('/admin/nrs/catalog', async () => {
  const usability = document.getElementById('nr-catalog-usability')
  const revoked = document.getElementById('nr-catalog-revoked')
  assert.match(document.body.textContent, /2 resultado/)
  await chooseFilter('nr-catalog-revoked', 'Não revogada')
  assert.match(document.body.textContent, /2 resultado/)
  assert.ok(document.querySelector('button[aria-label="Consultar NR-2"]'))
  assert.ok(document.querySelector('button[aria-label="Consultar NR-20"]'))
  await chooseFilter('nr-catalog-usability', 'Colaborador')
  assert.match(document.body.textContent, /Nenhum resultado para os filtros/)
  assert.match(document.body.textContent, /0 resultado/)
  await click('Limpar filtros')
  assert.equal(usability.value, 'Todas')
  assert.equal(revoked.value, 'Todas')
  assert.match(document.body.textContent, /2 resultado/)
  await chooseFilter('nr-catalog-revoked', 'Revogada')
  assert.match(document.body.textContent, /0 resultado/)
  await click('Limpar filtros')
  assert.match(document.body.textContent, /2 resultado/)
}))

test('área administrativa mostra marca e saída sem informações da conta ou menu do workspace', async () => withPage('/admin/nrs/pending', async () => {
  assert.equal(document.querySelector('.app-sidebar'), null)
  assert.equal(document.querySelector('.app-mobile-header'), null)
  assert.ok(document.querySelector('.nr-admin-brand'))
  for (const path of ['/mainHomeScreen', '/mainManagerScreen', '/mainEmployeerScreen', '/mainConformityScreen', '/mainUnitScreen', '/mainPositionScreen', '/mainFormScreen', '/mainEventScreen']) assert.equal(document.querySelector(`a[href="${path}"]`), null)
  assert.doesNotMatch(document.body.textContent, /Minha conta|Perfil da conta/)
  await click('Sair da conta')
  assert.match(document.body.textContent, /Tem certeza que deseja sair/)
  await click('Cancelar')
  assert.equal(document.querySelector('[role="dialog"]'), null)
}))

test('list shows pagination, filters and empty results in the DOM', async () => withPage('/admin/nrs/pending', async () => {
  assert.match(document.body.textContent, /6 resultado/)
  assert.equal(document.querySelectorAll('tbody tr').length, 5)
  await click('Próxima página')
  assert.match(document.body.textContent, /Página 2 de 2/)
  await click('Limpar filtros')
  await chooseFilter('nr-usability', 'Empresa')
  assert.match(document.body.textContent, /2 resultado/)
  await chooseFilter('nr-revoked', 'Revogada')
  assert.match(document.body.textContent, /1 resultado/)
  await chooseFilter('nr-usability', 'Colaborador')
  assert.match(document.body.textContent, /Nenhum resultado para os filtros/)
  await click('Limpar filtros')
  assert.match(document.body.textContent, /6 resultado/)
}))

test('detail compares fields, cancels without deleting and confirms local approval', async () => withPage('/admin/nrs/pending/20', async env => {
  assert.equal(document.querySelector('.nr-review-version-headings'), null)
  assert.equal(document.querySelectorAll('.nr-review-reading').length, 3)
  await click('Comparar versões')
  assert.match(document.body.textContent, /Versão aprovada atual/)
  assert.equal(document.querySelectorAll('.nr-review-field--changed').length, 6)
  assert.match(document.body.textContent, /6 de 7 campos alterados/)
  assert.doesNotMatch(document.body.textContent, /Data da fonte oficial/)
  assert.ok(document.querySelector('del.nr-comparison-removed'))
  assert.ok(document.querySelector('mark.nr-comparison-added'))
  const changedOnly = document.querySelector('.nr-comparison-controls input')
  await act(async () => changedOnly.click())
  assert.equal(document.querySelectorAll('.nr-review-field').length, 6)
  assert.equal(document.querySelector('.nr-comparison-unchanged'), null)
  await act(async () => changedOnly.click())
  assert.equal(document.querySelectorAll('.nr-review-field').length, 7)
  await click('Aprovar NR'); await click('Cancelar')
  assert.equal(document.querySelectorAll('[role="dialog"]').length, 1)
  assert.ok(await env.repositories.get('normal').getPending(20))
  const repository = env.repositories.get('normal'), approve = repository.approve
  let finishApproval
  repository.approve = async candidate => { await new Promise(resolve => { finishApproval = resolve }); return approve(candidate) }
  await click('Aprovar NR'); await click('Confirmar aprovação simulada')
  assert.ok([...document.querySelectorAll('button')].find(button => button.textContent === 'Confirmar aprovação simulada').disabled)
  await act(async () => finishApproval())
  await settle()
  assert.match(document.body.textContent, /Simulação concluída/)
  assert.equal(await env.repositories.get('normal').getPending(20), null)
  assert.equal(document.querySelector('button[aria-label="Revisar NR-20"]'), null)
  assert.ok(document.querySelector('.nr-approval-notice-icon'))
  assert.equal(document.querySelector('.nr-approval-notice a').getAttribute('href'), '/admin/nrs/catalog')
  await click('Fechar confirmação de aprovação')
  assert.equal(document.querySelector('.nr-approval-notice'), null)
}))

test('Revisar abre popup sobre a listagem e fechar preserva a página e filtros', async () => withPage('/admin/nrs/pending', async () => {
  await chooseFilter('nr-usability', 'Colaborador')
  const link = document.querySelector('button[aria-label="Revisar NR-20"]')
  assert.ok(link)
  assert.equal(link.getAttribute('aria-haspopup'), 'dialog')
  await act(async () => link.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })))
  await waitFor(() => /Revisão da NR-20/.test(document.querySelector('[role="dialog"]')?.textContent ?? ''))
  assert.match(document.querySelector('[role="dialog"]').textContent, /Revisão da NR-20/)
  assert.match(document.querySelector('h1').textContent, /Revisão de NRs/)
  assert.ok(document.getElementById('nr-usability'))
  await click('Comparar versões')
  assert.match(document.body.textContent, /Comparação com o catálogo aprovado/)
  await click('Ver análise pendente')
  assert.equal(document.querySelector('.nr-review-version-headings'), null)
  const back = document.querySelector('button[aria-label="Fechar revisão"]')
  await act(async () => back.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })))
  await settle()
  assert.match(document.querySelector('h1').textContent, /Revisão de NRs/)
  assert.ok(document.querySelector('button[aria-label="Revisar NR-20"]'))
  assert.equal(document.querySelector('[role="dialog"]'), null)
  assert.equal(document.getElementById('nr-usability').value, 'Colaborador')
  assert.match(document.body.textContent, /4 resultado/)
}))

test('revisor corrige a análise, confere diferenças e aprova as correções sem mutar o candidato antes de confirmar', async () => withPage('/admin/nrs/pending/20', async env => {
  await click('Editar análise')
  const revoked = document.getElementById('pending-edit-revogada')
  await act(async () => { revoked.value = 'true'; revoked.dispatchEvent(new window.Event('change', { bubbles: true })) })
  await act(async () => document.getElementById('nr-pending-edit').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  assert.match(document.body.textContent, /Correções locais aplicadas/)
  assert.equal((await env.repositories.get('normal').getPending(20)).document.revogada, false)
  await click('Aprovar NR')
  assert.match(document.body.textContent, /correções feitas nesta revisão serão incluídas/)
  await click('Confirmar aprovação simulada'); await settle()
  assert.equal((await env.repositories.get('normal').getApproved(20)).revogada, true)
  assert.equal(await env.repositories.get('normal').getPending(20), null)
}))

test('cancelar a edição ou fechar a revisão descarta mudanças sem alterar o catálogo', async () => withPage('/admin/nrs/pending', async env => {
  await act(async () => document.querySelector('button[aria-label="Revisar NR-20"]').click())
  await waitFor(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Editar análise'))
  await click('Editar análise')
  const revoked = document.getElementById('pending-edit-revogada')
  await act(async () => { revoked.value = 'true'; revoked.dispatchEvent(new window.Event('change', { bubbles: true })) })
  await click('Cancelar edição')
  await click('Editar análise')
  assert.equal(document.getElementById('pending-edit-revogada').value, 'false')
  await act(async () => document.querySelector('button[aria-label="Fechar revisão"]').click())
  assert.ok(await env.repositories.get('normal').getPending(20))
  assert.equal((await env.repositories.get('normal').getApproved(20)).revogada, false)
}))

test('failure keeps candidate and reports error; new and missing NRs have explicit states', async () => {
  await withPage('/admin/nrs/pending/20?scenario=approval-error', async env => {
    await click('Aprovar NR'); await click('Confirmar aprovação simulada'); await settle()
    assert.match(document.querySelector('[role="alert"]').textContent, /Falha simulada/)
    assert.ok(await env.repositories.get('approval-error').getPending(20))
  })
  await withPage('/admin/nrs/pending/35', async () => assert.match(document.body.textContent, /não existe versão aprovada anterior/))
  await withPage('/admin/nrs/pending/invalido', async () => assert.match(document.body.textContent, /não encontrada/))
  await withPage('/admin/nrs/pending?scenario=empty', async () => assert.match(document.body.textContent, /Nenhuma NR aguardando/))
  await withPage('/admin/nrs/pending?scenario=load-error', async () => {
    assert.match(document.querySelector('[role="alert"]').textContent, /Falha simulada/)
    await click('Tentar novamente'); await settle()
    assert.match(document.querySelector('[role="alert"]').textContent, /Falha simulada/)
  })
})
