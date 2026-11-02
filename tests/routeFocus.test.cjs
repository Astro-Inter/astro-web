const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const { JSDOM } = require('jsdom')

async function withPage(run) {
  const dom = new JSDOM('<main id="page"></main>')
  const previous = { document: global.document, MutationObserver: global.MutationObserver }
  Object.assign(global, { document: dom.window.document, MutationObserver: dom.window.MutationObserver })
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync('src/utils/routeFocus.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  new Function('module', 'exports', code)(module, module.exports)
  let cleanup
  try {
    const container = document.getElementById('page')
    cleanup = module.exports.focusRouteHeading(container)
    await run(container)
  } finally { cleanup?.(); dom.window.close(); Object.assign(global, previous) }
}
const settle = () => new Promise(resolve => queueMicrotask(resolve))

test('título que surge após a API recebe foco sem alterar layout ou conteúdo', () => withPage(async container => {
  container.innerHTML = '<h1>Criar formulário</h1>'
  await settle()
  assert.equal(document.activeElement, container.querySelector('h1'))
  assert.equal(document.activeElement.tabIndex, -1)
}))

test('conclusão tardia não rouba foco de um campo que a pessoa já está usando', () => withPage(async container => {
  container.innerHTML = '<label for="name">Nome</label><input id="name">'
  document.getElementById('name').focus()
  container.insertAdjacentHTML('afterbegin', '<h1>Formulário</h1>')
  await settle()
  assert.equal(document.activeElement.id, 'name')
}))

test('substituir o cabeçalho de carregamento pelo conteúdo mantém o foco no título da página', () => withPage(async container => {
  container.innerHTML = '<h1>Dashboards</h1>'
  await settle()
  const placeholderTitle = document.activeElement
  container.innerHTML = '<header><h1>Dashboards</h1></header><p>Dados carregados</p>'
  await settle()
  assert.equal(placeholderTitle.isConnected, false)
  assert.equal(document.activeElement, container.querySelector('h1'))
}))

test('foco aguarda a retirada do modal global de carregamento', () => withPage(async container => {
  document.body.insertAdjacentHTML('beforeend', '<dialog class="login-loading-overlay" open>Carregando</dialog>')
  container.innerHTML = '<h1>Formulário</h1>'
  await settle()
  assert.notEqual(document.activeElement, container.querySelector('h1'))
  document.querySelector('dialog').remove()
  await settle()
  assert.equal(document.activeElement, container.querySelector('h1'))
}))

test('cabeçalho substituído após uma consulta preserva foco no gráfico interativo', () => withPage(async container => {
  container.innerHTML = '<h1>Carregando dashboards</h1><svg role="img" tabindex="0" aria-label="Colaboradores no tempo"></svg>'
  await settle()
  const chart = container.querySelector('svg')
  chart.focus()
  assert.equal(document.activeElement, chart)
  container.querySelector('h1').outerHTML = '<h1>Dashboards</h1>'
  await settle()
  assert.equal(document.activeElement, chart)
}))
