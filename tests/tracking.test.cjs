const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const { JSDOM } = require('jsdom')
const cache = new Map()
function loadTs(filename) {
  filename = path.resolve(filename)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  cache.set(filename, module)
  const source = fs.readFileSync(filename, 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', code)(specifier => specifier.startsWith('.')
    ? loadTs(path.resolve(path.dirname(filename), `${specifier}.ts`)) : require(specifier), module, module.exports)
  return module.exports
}
const { buildPayload, pushTracking, initGTM, EVENT_NAMES } = loadTs(path.join(__dirname, '../src/gtm/track.ts'))
const { createTrackingRuntime } = loadTs(path.join(__dirname, '../src/gtm/runtime.ts'))
const { resolveScreen, ROUTE_SCREENS } = loadTs(path.join(__dirname, '../src/gtm/routes.ts'))
const { BUTTONS } = loadTs(path.join(__dirname, '../src/gtm/buttons.ts'))
const screen = { nome_tela: 'cadastro', contexto_tela: 'principal' }
const flush = () => new Promise(resolve => setTimeout(resolve, 0))
function setup(html = '<button data-track-action="criar_workspace"><span>Criar workspace</span></button>', pathname = '/') {
  const dom = new JSDOM(`<div data-track-route="${pathname}" data-track-search="" data-track-visit="inicial"><main data-track-page>${html}</main></div>`, { url: 'http://127.0.0.1:5174/' })
  let uid = null
  dom.window.document.addEventListener('submit', event => event.preventDefault())
  const runtime = createTrackingRuntime({ document: dom.window.document, browser: dom.window, getUid: () => uid })
  const stop = runtime.start()
  return { dom, runtime, stop, document: dom.window.document, events: () => dom.window.dataLayer.filter(row => row.astro_event), setUid: value => { uid = value } }
}

test('os seis tipos geram exatamente o envelope e os campos aceitos pela API', () => {
  const required = {
    screen_view: {}, button_click: { nome_botao: 'enviar' }, dialog_viewed: { nome_dialog: 'convidar_gestor' },
    dialog_clicked: { nome_dialog: 'convidar_gestor', dialog_clicado: 'convidar' },
    showcase_viewed: { nome_showcase: 'sidebar' }, showcase_clicked: { nome_showcase: 'sidebar', showcase_click: 'gestores' },
  }
  for (const event of EVENT_NAMES) {
    const payload = buildPayload(event, { ...screen, ...required[event], email: 'nao-enviar@example.test', password: 'segredo', id_usuario: 123 })
    assert.deepEqual(Object.keys(payload).sort(), ['tipo_evento','firebase_uid','nome_tela','contexto_tela','nome_botao','nome_dialog','dialog_clicado','nome_showcase','showcase_click'].sort())
    for (const key of ['nome_botao','nome_dialog','dialog_clicado','nome_showcase','showcase_click']) assert.equal(payload[key], required[event][key] ?? null)
    assert.equal(payload.firebase_uid, null)
    assert.ok(!JSON.stringify(payload).includes('segredo'))
  }
  const browser = {}
  pushTracking(browser, 'screen_view', screen)
  assert.deepEqual(browser.dataLayer[0], { event: 'screen_view', astro_event: buildPayload('screen_view', screen) })
})

test('rejeita evento desconhecido, ação ausente e textos que excedem o contrato', () => {
  assert.throws(() => buildPayload('conversation_started', screen))
  assert.throws(() => buildPayload('button_click', screen))
  assert.throws(() => buildPayload('dialog_clicked', { ...screen, nome_dialog: 'janela' }))
  assert.throws(() => buildPayload('button_click', { ...screen, nome_botao: 'x'.repeat(256) }))
  assert.throws(() => buildPayload('screen_view', { ...screen, contexto_tela: 'x'.repeat(8001) }))
  assert.throws(() => buildPayload('showcase_clicked', { ...screen, nome_showcase: 'lista', showcase_click: '\0' }))
})

test('todas as rotas do catálogo têm nome e contexto; cadastro e configurações não se misturam', () => {
  assert.deepEqual(resolveScreen('/paymentMethod'), { nome_tela:'cadastro', contexto_tela:'pagamento' })
  assert.deepEqual(resolveScreen('/includeCompanyInformation'), { nome_tela:'workspace', contexto_tela:'dados_cadastrais' })
  assert.deepEqual(resolveScreen('/includeCompanyInformation', '?context=settings'), { nome_tela:'configuracoes', contexto_tela:'dados_cadastrais' })
  assert.deepEqual(resolveScreen('/mainAccountScreen'), { nome_tela:'configuracoes', contexto_tela:'conta' })
  assert.deepEqual(resolveScreen('/rota-inexistente'), { nome_tela:'erro', contexto_tela:'pageNotFound' })
  assert.equal(resolveScreen('/loadingScreen'), null)
  assert.deepEqual(resolveScreen('/loadingScreen','?context=registration'), {nome_tela:'erro',contexto_tela:'cadastro_workspace'})
  for (const [route, expected] of Object.entries(ROUTE_SCREENS)) assert.deepEqual(resolveScreen(route), expected)
})

test('inicialização do GTM é idempotente e não faz POST direto à API', () => {
  const dom = new JSDOM('<html><head></head><body></body></html>')
  dom.window.fetch = () => { throw new Error('O frontend não pode contornar o GTM') }
  initGTM(dom.window.document, dom.window, 'GTM-NF932KMT')
  initGTM(dom.window.document, dom.window, 'GTM-NF932KMT')
  assert.equal(dom.window.document.querySelectorAll('#astro-gtm').length, 1)
  assert.equal(dom.window.document.querySelector('#astro-gtm').src, 'https://www.googletagmanager.com/gtm.js?id=GTM-NF932KMT')
  assert.equal(dom.window.dataLayer.length, 1)
  pushTracking(dom.window, 'screen_view', screen)
  assert.equal(dom.window.dataLayer.at(-1).event, 'screen_view')
  assert.throws(() => initGTM(dom.window.document, dom.window, 'ID_INVALIDO'))
  dom.window.close()
})

test('não registra a rota privada enquanto a página não foi renderizada', async () => {
  const ctx = setup('', '/mainManagerScreen')
  ctx.document.querySelector('main').removeAttribute('data-track-page')
  ctx.stop(); ctx.dom.window.dataLayer = []
  const next = createTrackingRuntime({ document:ctx.document,browser:ctx.dom.window,getUid:()=>null })
  const stop = next.start()
  assert.equal(ctx.events().length, 0)
  ctx.document.querySelector('main').setAttribute('data-track-page','true')
  await flush()
  assert.equal(ctx.events()[0].astro_event.nome_tela, 'gestor')
  stop(); ctx.dom.window.close()
})

test('um clique no ícone do botão identifica a ação sem ler texto nem valores', () => {
  const ctx = setup()
  ctx.document.querySelector('span').click()
  assert.deepEqual(ctx.events().map(e=>e.event), ['screen_view','button_click'])
  assert.equal(ctx.events()[1].astro_event.nome_botao, 'criar_workspace')
  ctx.stop(); ctx.dom.window.close()
})

test('StrictMode, renderização e mudança de filtro não duplicam a tela; voltar registra nova visita', async () => {
  const ctx = setup()
  ctx.stop()
  const stop = ctx.runtime.start()
  ctx.document.querySelector('main').appendChild(ctx.document.createElement('p'))
  await flush()
  assert.equal(ctx.events().length, 1)
  const route = ctx.document.querySelector('[data-track-route]')
  route.dataset.trackRoute = '/paymentMethod'; route.dataset.trackVisit = 'pagamento'
  await flush()
  route.dataset.trackRoute = '/'; route.dataset.trackVisit = 'volta'
  await flush()
  assert.deepEqual(ctx.events().map(e=>e.astro_event.contexto_tela), ['principal','pagamento','principal'])
  stop(); ctx.dom.window.close()
})

test('submit pelo clique e pelo Enter registra uma ação por envio', () => {
  const ctx = setup('<form data-track-submit="enviar"><input value="email-privado"><button data-track-action="enviar" type="submit">Entrar</button></form>')
  ctx.document.querySelector('button').click()
  ctx.document.querySelector('form').dispatchEvent(new ctx.dom.window.Event('submit', { bubbles:true, cancelable:true }))
  assert.equal(ctx.events().filter(e=>e.event==='button_click').length, 2)
  assert.ok(!JSON.stringify(ctx.events()).includes('email-privado'))
  ctx.stop(); ctx.dom.window.close()
})

test('ignora controles desativados, conteúdo escondido e cliques fora das marcações', () => {
  const ctx = setup('<button data-track-action="a" disabled>A</button><div inert><button data-track-action="b">B</button></div><button hidden data-track-action="c">C</button><button aria-disabled="true" data-track-action="d">D</button><button>Sem evento</button>')
  for (const button of ctx.document.querySelectorAll('button')) button.dispatchEvent(new ctx.dom.window.MouseEvent('click', { bubbles:true }))
  assert.equal(ctx.events().length, 1)
  ctx.stop(); ctx.dom.window.close()
})

test('filtro operado pelo teclado registra abertura e seleção, sem capturar o texto digitado', () => {
  const ctx=setup('<input role="combobox" aria-expanded="false" data-track-action="status">')
  const input=ctx.document.querySelector('input')
  input.value='texto-privado'
  input.dispatchEvent(new ctx.dom.window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))
  input.setAttribute('aria-expanded','true')
  input.dispatchEvent(new ctx.dom.window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))
  input.dispatchEvent(new ctx.dom.window.KeyboardEvent('keydown',{key:'a',bubbles:true}))
  input.dispatchEvent(new ctx.dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}))
  assert.equal(ctx.events().filter(e=>e.event==='button_click').length,2)
  assert.equal(ctx.events().at(-1).astro_event.nome_botao,'status')
  assert.ok(!JSON.stringify(ctx.events()).includes('texto-privado'))
  ctx.stop(); ctx.dom.window.close()
})

test('dialog só é visto aberto, não duplica, e sua ação usa dialog_clicado', async () => {
  const ctx = setup('<dialog data-track-dialog="convidar_gestor"><button data-track-action="convidar">Convidar</button></dialog>','/mainManagerScreen')
  assert.equal(ctx.events().length, 1)
  const dialog = ctx.document.querySelector('dialog')
  dialog.setAttribute('open','')
  await flush()
  dialog.appendChild(ctx.document.createElement('p')); await flush()
  ctx.document.querySelector('button').click()
  assert.deepEqual(ctx.events().map(e=>e.event), ['screen_view','dialog_viewed','dialog_clicked'])
  assert.equal(ctx.events().at(-1).astro_event.nome_dialog, 'convidar_gestor')
  assert.equal(ctx.events().at(-1).astro_event.dialog_clicado, 'convidar')
  assert.equal(ctx.events().at(-1).astro_event.nome_botao, null)
  dialog.removeAttribute('open'); await flush(); dialog.setAttribute('open',''); await flush()
  assert.equal(ctx.events().filter(e=>e.event==='dialog_viewed').length, 2)
  ctx.stop(); ctx.dom.window.close()
})

test('etapas distintas na mesma janela geram visualizações distintas', async () => {
  const ctx = setup('<dialog open data-track-dialog="selecionar_colaboradores_evento"></dialog>','/mainEventScreen')
  ctx.document.querySelector('dialog').dataset.trackDialog='organizar_equipes_evento'; await flush()
  assert.deepEqual(ctx.events().filter(e=>e.event==='dialog_viewed').map(e=>e.astro_event.nome_dialog), ['selecionar_colaboradores_evento','organizar_equipes_evento'])
  ctx.stop(); ctx.dom.window.close()
})

test('menus em portal preservam a tela e a ação não duplica o botão', () => {
  const ctx = setup('','/mainManagerScreen')
  const popup=ctx.document.createElement('div')
  popup.dataset.trackDialog='acoes_gestor'
  popup.setAttribute('role','menu')
  popup.innerHTML='<button data-track-action="editar">Editar</button>'
  ctx.document.body.append(popup)
  popup.querySelector('button').click()
  assert.equal(ctx.events().at(-1).astro_event.nome_tela,'gestor')
  assert.equal(ctx.events().at(-1).astro_event.nome_dialog,'acoes_gestor')
  popup.querySelector('button').dispatchEvent(new ctx.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}))
  assert.equal(ctx.events().at(-1).astro_event.dialog_clicado,'fechar')
  ctx.stop(); ctx.dom.window.close()
})

test('Escape registra fechar só para um dialog que pode ser dispensado', () => {
  const ctx=setup('<dialog open data-track-dialog="confirmar_senha"><button>Cancelar</button></dialog>')
  const dialog=ctx.document.querySelector('dialog')
  dialog.dispatchEvent(new ctx.dom.window.Event('cancel',{cancelable:true}))
  assert.equal(ctx.events().at(-1).astro_event.dialog_clicado,'fechar')
  const count=ctx.events().length
  dialog.dataset.trackDismissible='false'
  dialog.dispatchEvent(new ctx.dom.window.Event('cancel',{cancelable:true}))
  assert.equal(ctx.events().length,count)
  ctx.stop(); ctx.dom.window.close()
})

test('showcase só é visto quando entra na viewport e clicar no item usa nomes estáveis', async () => {
  const ctx = setup()
  ctx.stop()
  let observer
  ctx.dom.window.IntersectionObserver=class {
    constructor(callback) { this.callback=callback; observer=this }
    observe() {} unobserve() {} disconnect() {}
  }
  ctx.document.querySelector('main').innerHTML='<nav data-track-showcase="sidebar"><a data-track-item="gestores">Nome do usuário que não deve sair</a></nav>'
  const stop=ctx.runtime.start()
  assert.equal(ctx.events().filter(e=>e.event==='showcase_viewed').length,0)
  observer.callback([{target:ctx.document.querySelector('nav'),isIntersecting:true}])
  observer.callback([{target:ctx.document.querySelector('nav'),isIntersecting:true}])
  ctx.document.querySelector('a').click()
  assert.equal(ctx.events().filter(e=>e.event==='showcase_viewed').length,1)
  assert.equal(ctx.events().at(-1).astro_event.showcase_click,'gestores')
  assert.ok(!JSON.stringify(ctx.events()).includes('Nome do usuário'))
  stop(); ctx.dom.window.close()
})

test('Firebase UID acompanha a identidade atual e some no logout; não envia tokens', () => {
  const ctx=setup()
  assert.equal(ctx.events()[0].astro_event.firebase_uid,null)
  ctx.setUid('firebase-uid-teste'); ctx.document.querySelector('button').click()
  assert.equal(ctx.events().at(-1).astro_event.firebase_uid,'firebase-uid-teste')
  ctx.setUid(null); ctx.document.querySelector('button').click()
  assert.equal(ctx.events().at(-1).astro_event.firebase_uid,null)
  ctx.stop(); ctx.dom.window.close()
})

test('permite desativar tracking sem criar eventos nem ouvintes', () => {
  const dom = new JSDOM('<main data-track-page><button data-track-action="enviar">Enviar</button></main>')
  const runtime=createTrackingRuntime({document:dom.window.document,browser:dom.window,getUid:()=>null,enabled:false})
  runtime.start(); dom.window.document.querySelector('button').click()
  assert.equal(dom.window.dataLayer,undefined)
  dom.window.close()
})

test('os nomes originais de botões permanecem iguais', () => {
  assert.equal(BUTTONS.cadastro.principal.criarWorkspace,'criar_workspace')
  assert.equal(BUTTONS.cadastro.pagamento.finalizar,'finalizar_compra')
  assert.equal(BUTTONS.workspace.endereco.remover,'remover_rede')
  assert.equal(BUTTONS.home.adicionar,'adicionar_forms')
})
