const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const filename = path.resolve('src/components/chatBlocks/index.tsx')
const source = fs.readFileSync(filename, 'utf8').replace("import './style.css'", '')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText
const moduleInstance = new Module(filename, module)
moduleInstance.filename = filename
moduleInstance.paths = Module._nodeModulePaths(path.dirname(filename))
moduleInstance._compile(code, filename)
const { default: ChatBlocks, parseBlocks } = moduleInstance.exports
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
