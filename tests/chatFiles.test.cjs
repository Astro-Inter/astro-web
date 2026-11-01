const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const React = require('react'), { act } = React
const { renderToStaticMarkup } = require('react-dom/server'), { JSDOM } = require('jsdom')
const scenarios = JSON.parse(fs.readFileSync('tools/chat-contracts-preview/scenarios.json', 'utf8'))
function environment(overrides = {}) {
  const cache = new Map()
  function load(file) {
    const filename = path.resolve(file)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'")
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText
    new Function('require', 'module', 'exports', code)(name => {
      if (overrides[name]) return overrides[name]
      if (!name.startsWith('.')) return require(name)
      const target = path.resolve(path.dirname(filename), name)
      return load([target + '.ts', target + '.tsx', path.join(target, 'index.tsx')].find(f => fs.existsSync(f)))
    }, module, module.exports)
    return module.exports
  }
  return { load }
}
const env = environment(), ChatBlocks = env.load('src/components/chatBlocks/index.tsx').default
const { parseBlocks } = env.load('src/utils/chatBlocks.ts')
const { chatFileState } = env.load('src/utils/chatFiles.ts')
const { downloadChatFile } = env.load('src/services/chatFiles.ts')
const file = scenarios.pdf.blocos[1]
const html = blocks => renderToStaticMarkup(React.createElement(ChatBlocks, { blocks, fallback: '' }))

test('arquivo v1 valida o schema e mantém componentes reconhecidos entre tipos inválidos', () => {
  assert.deepEqual(parseBlocks([file]), [file])
  const invalid = [{ versao: 2 }, { id: 'arquivo' }, { nome: '../arquivo.pdf' }, { nome: 'a'.repeat(100) + '.pdf' }, { mime_type: 'text/html' }, { tamanho_bytes: 0 }, { tamanho_bytes: -1 }, { tamanho_bytes: 2000001 }, { tamanho_bytes: 1.5 }, { url: 'http://files.example/a.pdf' }, { url: 'javascript:alert(1)' }, { url: 'https://u:p@files.example/a.pdf' }, { expira_em: 'amanhã' }, { expira_em: '2099-02-30T20:00:00Z' }, { expira_em: '2099-11-01T20:00:00' }, { estado: 'sucesso' }]
  for (const changes of invalid) {
    assert.equal(parseBlocks([{ ...file, ...changes }]), null)
    assert.equal(parseBlocks([{ tipo: 'texto', conteudo: 'Antes' }, { ...file, ...changes }, file]).length, 2)
  }
  for (const estado of ['disponivel', 'expirado', 'indisponivel']) assert.ok(parseBlocks([{ ...file, estado }]))
  assert.ok(parseBlocks([{ ...file, expira_em: '2099-11-01T20:00:00.123456+00:00', tamanho_bytes: 2000000 }]))
})

test('cartão separa PDF do texto, omite tamanho nulo e não coloca a URL temporária no DOM', () => {
  const markup = html(scenarios.pdf.blocos)
  assert.ok(markup.indexOf('PDF gerado') < markup.indexOf('chat-file-card'))
  assert.match(markup, /Baixar PDF/); assert.doesNotMatch(markup, /assinatura|https:\/\/files|kB/)
  assert.match(html([{ ...file, tamanho_bytes: 76360 }]), /76,4 kB/)
  for (const state of [scenarios.expirado, scenarios.indisponivel]) assert.match(html(state.blocos), /disabled/)
  assert.equal(chatFileState({ ...file, url: null }), 'indisponivel')
  assert.equal(chatFileState({ ...file, estado: 'indisponivel', expira_em: '2020-01-01T00:00:00Z' }), 'indisponivel')
  assert.equal(chatFileState(file, Date.parse(file.expira_em)), 'expirado')
  assert.doesNotMatch(html(scenarios.falha_pdf.blocos), /chat-file-card|Baixar PDF/)
  const { chatMessageText } = env.load('src/utils/chatMessageText.ts')
  assert.equal(chatMessageText(undefined, [file]), file.nome)
  assert.deepEqual(scenarios.lembrar.blocos[1], file)
})

test('download explícito usa apenas URL recebida, sem token/cookies/referrer/cache e rejeita erros sem expor link', async t => {
  const calls = []
  t.mock.method(global, 'fetch', async (url, options) => { calls.push({ url, options }); return new Response('%PDF-1.4\nfixture', { headers: { 'Content-Type': 'application/pdf' } }) })
  const blob = await downloadChatFile(file)
  assert.equal(blob.type, 'application/pdf')
  assert.equal(calls.length, 1); assert.equal(calls[0].url, file.url)
  assert.deepEqual(calls[0].options.headers, { Accept: 'application/pdf' })
  assert.equal(calls[0].options.credentials, 'omit'); assert.equal(calls[0].options.referrerPolicy, 'no-referrer'); assert.equal(calls[0].options.cache, 'no-store')
  await assert.rejects(downloadChatFile({ ...file, estado: 'expirado' }), /Não foi possível/)
  assert.equal(calls.length, 1)
  for (const response of [new Response('negado', { status: 403 }), new Response('erro', { status: 500 }), new Response('<html>', { headers: { 'content-type': 'text/html' } }), new Response('', { headers: { 'content-type': 'application/pdf' } }), new Response('x', { headers: { 'content-type': 'application/pdf', 'content-length': '2000001' } }), new Response(new Uint8Array(2000001), { headers: { 'content-type': 'application/pdf' } })]) {
    global.fetch = async () => response
    await assert.rejects(downloadChatFile(file), error => !error.message.includes('assinatura') && /Não foi possível/.test(error.message))
  }
  global.fetch = async () => { throw Error(file.url) }
  await assert.rejects(downloadChatFile(file), error => !error.message.includes(file.url))
})

async function withDom(run) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  const names = ['window','document','IS_REACT_ACT_ENVIRONMENT','fetch']
  const previous = Object.fromEntries(names.map(name => [name,global[name]]))
  Object.assign(global, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
  const root = require('react-dom/client').createRoot(document.getElementById('root'))
  try { await run(root,dom) } finally { await act(async () => root.unmount()); dom.window.close(); Object.assign(global,previous) }
}

test('PDF não faz prefetch, baixa por clique uma vez, trata erro e expira enquanto a conversa está aberta', async t => withDom(async (root,dom) => {
  let requests = 0, clicks = 0
  t.mock.method(global,'fetch',async () => { requests++; return new Response('%PDF-1.4\nfixture', { headers: { 'content-type':'application/pdf' } }) })
  t.mock.method(URL,'createObjectURL',()=>'blob:fixture')
  t.mock.method(URL,'revokeObjectURL',()=>{})
  dom.window.HTMLAnchorElement.prototype.click = function () { clicks++; assert.equal(this.download,file.nome); assert.equal(this.href,'blob:fixture') }
  const short = { ...file, expira_em: new Date(Date.now()+60000).toISOString() }
  await act(async () => root.render(React.createElement(ChatBlocks,{blocks:[short],fallback:''})))
  assert.equal(requests,0)
  await act(async () => { document.querySelector('button').click(); document.querySelector('button').click() })
  assert.equal(requests,1); assert.equal(clicks,1)
  global.fetch=async()=>{requests++; throw Error('CORS/rede')}
  await act(async()=>document.querySelector('button').click())
  assert.match(document.querySelector('[role="alert"]').textContent,/Não foi possível baixar/)
  let opened
  dom.window.open = (...args) => { opened = args }
  const beforeOpen = requests
  await act(async()=>document.querySelectorAll('button')[1].click())
  assert.deepEqual(opened, [file.url, '_blank', 'noopener,noreferrer'])
  assert.equal(requests, beforeOpen, 'abrir o mesmo arquivo não chama API nem usa outro link')
  const after=Date.parse(short.expira_em)+1
  t.mock.method(Date,'now',()=>after)
  await act(async()=>window.dispatchEvent(new dom.window.Event('focus')))
  assert.equal(document.querySelector('button').disabled,true)
  assert.match(document.querySelector('[role="status"]').textContent,/Link expirado/)
  assert.equal(document.querySelectorAll('button').length, 1, 'não oferece abertura de URL expirada')
  assert.equal(dom.window.localStorage.length,0)
}))

test('download pendente é cancelado ao desmontar e não dispara arquivo depois', async t=>withDom(async root=>{
  let resolveDownload, signal, clicks=0
  t.mock.method(global,'fetch',(_url,options)=>{signal=options.signal;return new Promise(resolve=>{resolveDownload=resolve})})
  t.mock.method(URL,'createObjectURL',()=>{clicks++;return 'blob:fixture'})
  await act(async()=>root.render(React.createElement(ChatBlocks,{blocks:[file],fallback:''})))
  await act(async()=>document.querySelector('button').click())
  await act(async()=>root.render(null))
  assert.equal(signal.aborted,true)
  await act(async()=>resolveDownload(new Response('%PDF-1.4',{headers:{'content-type':'application/pdf'}})))
  assert.equal(clicks,0)
}))

test('fixtures novas preservam contratos: homônimos, 12 meses zero, vazio e 100 → 500',()=>{
  for(const [name,scenario] of Object.entries(scenarios)) {
    if(scenario.error)continue
    assert.equal(parseBlocks(scenario.blocos).length,scenario.blocos.length-(name==='desconhecido'?1:0),name)
  }
  assert.equal(scenarios.linhas.blocos[0].dados.length,12)
  assert.equal(scenarios.linhas.blocos[0].dados.every(p=>p.valor===0),true)
  assert.match(html(scenarios.vazio.blocos),/Sem base/)
  assert.equal(scenarios.usuarios500.blocos[0].retornada,141)
  assert.equal(scenarios.usuarios500.blocos[0].limitado,false)
  assert.match(html(scenarios.limite200.blocos),/máximo de 200/)
})

test('controlador preserva sequência, arquivo/lembrar/histórico e erros sem recalcular ou renovar dados', async t => withDom(async (root,dom)=>{
  const auth={user:{uid:'autorizado'},status:'ready'}, calls=[], saved=[]
  let controller, nextScenario
  const services={
    ChatApiError:class extends Error{},
    listChatSessions:async()=>({sessions:[],next_cursor:null}),
    startChatSession:async()=>{},
    getChatSessionMessages:async()=>({session_id:'sessao',status:'ativa',total:saved.length,mensagens:structuredClone(saved)}),
    sendChatMessage:async(question,id)=>{
      calls.push({question,id})
      const scenario=scenarios[nextScenario]
      if(scenario.error)throw Error(scenario.error)
      saved.push({role:'user',content:question},{role:'assistant',content:'',blocos:structuredClone(scenario.blocos)})
      return {session_id:'sessao',agentes_chamados:[],blocos:structuredClone(scenario.blocos)}
    },
  }
  const runtime=environment({'./useAuthentication':{useAuthentication:()=>auth},'react-router-dom':{useNavigate:()=>()=>{}},'../services/chat':services})
  const useController=runtime.load('src/hooks/useAstroChatController.ts').useAstroChatController
  function Probe(){
    const value=useController()
    React.useEffect(()=>{controller=value},[value])
    return React.createElement('div',null,value.chat.messages.filter(m=>m.author==='astro').map(m=>React.createElement(ChatBlocks,{key:m.id,blocks:m.blocos,fallback:m.text})),value.chat.error&&React.createElement('p',{role:'alert'},value.chat.error))
  }
  t.mock.method(global,'fetch',()=>{throw Error('Não deve haver rede na renderização/paginação')})
  await act(async()=>root.render(React.createElement(Probe)))
  const sequence=['cobertura','matriz','comparacao','usuarios100','usuarios500','barras','linhas','vazio','eventos','ambiguo','evento42','negado','pdf','lembrar','desconhecido']
  for(const key of sequence){
    nextScenario=key
    await act(async()=>controller.sendMessage(scenarios[key].question))
    assert.deepEqual(controller.chat.messages.at(-1).blocos,scenarios[key].blocos,key)
  }
  assert.equal(calls[0].id,null);assert.ok(calls.slice(1).every(c=>c.id==='sessao'))
  const aggregate=document.querySelectorAll('figure')[2].outerHTML, before=calls.length
  await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Próxima'&&!b.disabled).click())
  assert.equal(calls.length,before)
  assert.equal(document.querySelectorAll('figure')[2].outerHTML,aggregate)
  const fileMessages=controller.chat.messages.filter(m=>m.blocos?.some(b=>b.tipo==='arquivo'))
  assert.deepEqual(fileMessages[0].blocos.at(-1),fileMessages[1].blocos.at(-1))
  assert.equal(dom.window.localStorage.length,0)
  await act(async()=>controller.selectSession('sessao'))
  assert.equal(document.querySelectorAll('.chat-file-card').length,2)
  assert.equal(document.querySelectorAll('.chat-line').length,1)
  assert.match(document.body.textContent,/Página 1 de 15/)
  const last=controller.chat.messages.at(-1).blocos
  for(const error of ['validacao','indisponibilidade']){
    nextScenario=error
    await act(async()=>controller.sendMessage(scenarios[error].question))
    assert.match(document.querySelector('[role="alert"]').textContent,new RegExp(scenarios[error].error.replace(/[.]/g,'\\.')))
    assert.deepEqual(controller.chat.messages.at(-1).blocos,last)
  }
}))
