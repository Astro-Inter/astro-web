const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
function load(file) {
  const filename = path.resolve(file), module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', code)(name => {
    if (!name.startsWith('.')) return require(name)
    const target = path.resolve(path.dirname(filename), name)
    return load([target + '.ts', target + '.tsx', path.join(target, 'index.tsx')].find(candidate => fs.existsSync(candidate)))
  }, module, module.exports)
  return module.exports
}
const ChatBlocks = load('src/components/chatBlocks/index.tsx').default
const { parseBlocks, safeChatImage, keyChatItems } = load('src/utils/chatBlocks.ts')
const chart = { tipo: 'grafico_linhas', versao: 1, titulo: 'Evolução', fonte: 'Astro', unidade: 'participações', dados: [{ categoria: '2026-01', valor: 0 }, { categoria: '2026-02', valor: 2 }] }
test('mostra texto, gráfico e tabela na ordem com valores acessíveis', () => {
  const table = { tipo: 'tabela', versao: 1, titulo: 'Pessoas', colunas: [{ chave: 'nome', titulo: 'Nome' }], linhas: [{ nome: 'Ana' }], pagina: 1, total_paginas: 1, total: 1 }
  const html = renderToStaticMarkup(React.createElement(ChatBlocks, { fallback: 'Alternativa', blocks: [{ tipo: 'texto', conteudo: 'Antes' }, chart, table, { tipo: 'texto', conteudo: 'Depois' }] }))
  assert.ok(html.indexOf('Antes') < html.indexOf('Evolução') && html.indexOf('Evolução') < html.indexOf('Ana') && html.indexOf('Ana') < html.indexOf('Depois'))
  assert.match(html, /2026-02/); assert.doesNotMatch(html, /Alternativa/)
})
test('respostas antigas, blocos inválidos e versões desconhecidas usam o texto', () => {
  for (const blocks of [null, [], [{ tipo: 'desconhecido', versao: 1, titulo: 'x' }], [{ ...chart, versao: 2 }], [{ ...chart, dados: [{ categoria: 'x', valor: -1 }] }]]) {
    assert.equal(parseBlocks(blocks), null)
    assert.match(renderToStaticMarkup(React.createElement(ChatBlocks, { blocks, fallback: 'Resposta alternativa' })), /Resposta alternativa/)
  }
})
test('galeria usa iniciais e não carrega URLs externas não confiáveis', () => {
  const blocks = [{ tipo: 'galeria_usuarios', versao: 1, titulo: 'Pessoas', imagens: [{ nome: 'Ana Lima', email: null, url: 'https://evil.example/foto' }] }]
  const html = renderToStaticMarkup(React.createElement(ChatBlocks, { blocks, fallback: 'alternativa' }))
  assert.match(html, /AL/); assert.doesNotMatch(html, /evil.example/)
})

test('tabela tem região nomeada e acessível pelo teclado, com paginação validada', () => {
  const table = { tipo: 'tabela', versao: 1, titulo: 'Pessoas', colunas: [{ chave: 'nome', titulo: 'Nome' }], linhas: [{ nome: '<img src=x onerror=alert(1)>' }], pagina: 1, total_paginas: 1, total: 1 }
  const html = renderToStaticMarkup(React.createElement(ChatBlocks, { blocks: [table], fallback: 'alternativa' }))
  assert.match(html, /role="region" aria-label="Tabela: Pessoas" tabindex="0"/)
  assert.match(html, /&lt;img/)
  assert.doesNotMatch(html, /<img/)
  for (const changes of [{ pagina: 0 }, { pagina: 2 }, { total_paginas: '1' }, { total: -1 }, { colunas: [...table.colunas, ...table.colunas] }, { linhas: [{ nome: Infinity }] }]) {
    assert.equal(parseBlocks([{ ...table, ...changes }]), null)
  }
  assert.equal(parseBlocks([{ ...chart, dados: [{ categoria: 'a', valor: Number.MAX_VALUE }, { categoria: 'b', valor: Number.MAX_VALUE }] }]), null)
  assert.equal(parseBlocks([{ tipo: 'galeria_usuarios', versao: 1, titulo: 'Pessoas', imagens: [{ nome: 'Ana', url: null, email: 42 }] }]), null)
})

test('identificadores do chat permanecem estáveis ao reordenar dados e distinguem duplicatas', () => {
  const a = { nome: 'Ana' }, b = { nome: 'Bruno' }
  const first = keyChatItems([a, b]), reordered = keyChatItems([b, a])
  assert.equal(first[0].key, reordered[1].key)
  assert.equal(first[1].key, reordered[0].key)
  assert.equal(new Set(keyChatItems([a, a, b]).map(item => item.key)).size, 3)
  for (const url of ['javascript:alert(1)', 'http://x.r2.cloudflarestorage.com/photo', 'https://x.r2.cloudflarestorage.com.evil.test/photo', 'https://user:pass@x.r2.cloudflarestorage.com/photo']) assert.equal(safeChatImage(url), undefined)
  assert.equal(safeChatImage('https://x.r2.cloudflarestorage.com/photo'), 'https://x.r2.cloudflarestorage.com/photo')
})
