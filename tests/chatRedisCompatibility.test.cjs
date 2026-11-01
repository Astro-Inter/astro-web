const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const React = require('react'), { act } = React
const { JSDOM } = require('jsdom')
const { renderToStaticMarkup } = require('react-dom/server')

function load(file) {
  const filename = path.resolve(file), module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText
  new Function('require', 'module', 'exports', code)(name => {
    if (!name.startsWith('.')) return require(name)
    const target = path.resolve(path.dirname(filename), name)
    return load([target + '.ts', target + '.tsx', path.join(target, 'index.tsx')].find(fs.existsSync))
  }, module, module.exports)
  return module.exports
}
const ChatBlocks = load('src/components/chatBlocks/index.tsx').default
const Avatar = load('src/components/chatBlockAvatar/index.tsx').default
const { parseBlocks } = load('src/utils/chatBlocks.ts')
// Fictitious capability. Never connect to storage or persist a real signed URL.
const photo = 'https://example.r2.cloudflarestorage.com/avatars/example.png?X-Amz-Date=20260101T000000Z&X-Amz-Expires=60&X-Amz-Signature=' + 'a'.repeat(64)
const person = { nome: 'Ana Lima', email: null, url: photo }
const image = { tipo: 'imagem', descricao: 'Foto de Ana Lima', url: photo }
const containers = {
  own: { tipo: 'ficha_usuario', versao: 1, titulo: 'Meu perfil', origem: 'usuario_autenticado', nome: person.nome, foto: image },
  third: { tipo: 'ficha_usuario', versao: 1, titulo: 'Pessoa autorizada', nome: person.nome, foto: image },
  gallery: { tipo: 'galeria_usuarios', versao: 1, titulo: 'Equipe', imagens: [person] },
  table: { tipo: 'tabela', versao: 1, titulo: 'Equipe', colunas: [{ chave: 'foto', titulo: 'Foto' }], linhas: [{ foto: image }], pagina: 1, total_paginas: 1, total: 1 },
}
async function domTest(run) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  const previous = { window: global.window, document: global.document, fetch: global.fetch, IS_REACT_ACT_ENVIRONMENT: global.IS_REACT_ACT_ENVIRONMENT }
  let network = 0
  Object.assign(global, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true,
    fetch: () => { network++; throw Error('Photo fallback must not request a new signature') } })
  const root = require('react-dom/client').createRoot(document.getElementById('root'))
  try { await run(root, dom, () => network) }
  finally { await act(async () => root.unmount()); dom.window.close(); Object.assign(global, previous) }
}

for (const [name, block] of Object.entries(containers)) {
  test(`Redis compatibility: ${name} preserves POST/history and falls back after expired or failed photo`, async () => domTest(async (root, dom, network) => {
    const posted = { blocos: [{ tipo: 'texto', conteudo: 'Antes' }, block, { tipo: 'texto', conteudo: 'Depois' }] }
    const history = JSON.parse(JSON.stringify(posted))
    assert.deepEqual(parseBlocks(posted.blocos), parseBlocks(history.blocos))
    const render = blocks => React.createElement(ChatBlocks, { blocks, fallback: '' })
    assert.equal(renderToStaticMarkup(render(posted.blocos)), renderToStaticMarkup(render(history.blocos)))
    await act(async () => root.render(render(posted.blocos)))
    assert.equal(document.querySelector('img').getAttribute('src'), photo)
    assert.equal(document.querySelector('img').getAttribute('referrerpolicy'), 'no-referrer')
    // Storage rejects an expired capability with the same image error event as other failures.
    await act(async () => document.querySelector('img').dispatchEvent(new dom.window.Event('error')))
    assert.equal(document.querySelector('img'), null)
    assert.match(document.querySelector('.chat-gallery-person').textContent, /AL/)
    assert.match(document.body.textContent, /Antes.*Depois/s)
    await act(async () => root.render(render(history.blocos)))
    assert.equal(document.querySelector('img'), null, 'same failed URL is not retried on rerender')
    assert.equal(network(), 0)
    assert.equal(dom.window.localStorage.length, 0)
    assert.equal(dom.window.sessionStorage.length, 0)
  }))
}

test('Redis compatibility: missing photos use initials; only a new URL provided by the server can replace failed photo', async () => domTest(async (root, dom, network) => {
  for (const url of [null, '', 'https://untrusted.example/photo']) {
    await act(async () => root.render(React.createElement(Avatar, { item: { ...person, url } })))
    assert.equal(document.querySelector('img'), null)
    assert.match(document.body.textContent, /AL/)
  }
  await act(async () => root.render(React.createElement(Avatar, { item: person })))
  await act(async () => document.querySelector('img').dispatchEvent(new dom.window.Event('error')))
  const updated = photo.replace('example.png', 'updated.png')
  await act(async () => root.render(React.createElement(Avatar, { item: { ...person, url: updated } })))
  assert.equal(document.querySelector('img').getAttribute('src'), updated)
  assert.equal(network(), 0)
}))
