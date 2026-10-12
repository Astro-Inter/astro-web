const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

function baseUrl(env) {
  const source = fs.readFileSync(path.join(__dirname, '../src/services/systemApi.ts'), 'utf8').replaceAll('import.meta.env', 'environment')
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  new Function('module', 'exports', 'environment', code)(module, module.exports, env)
  return module.exports.getSystemApiBaseUrl()
}

test('desenvolvimento chama o proxy local mesmo com a URL do backend remoto', () => {
  assert.equal(baseUrl({ DEV: true, VITE_API_URL: 'https://astro-api-h2hx.onrender.com/' }), '/api')
})

test('produção chama a API principal configurada, sem barras finais', () => {
  assert.equal(baseUrl({ DEV: false, VITE_API_URL: ' https://astro-api-h2hx.onrender.com/// ' }), 'https://astro-api-h2hx.onrender.com')
})

test('URL ausente falha antes de enviar a requisição em ambos os ambientes', () => {
  for (const DEV of [true, false]) assert.throws(() => baseUrl({ DEV }), /URL da API principal/)
})
