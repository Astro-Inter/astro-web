const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const cache = new Map()
function load(file) {
  const filename = path.resolve(file)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  cache.set(filename, module)
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  new Function('require', 'module', 'exports', code)(name => name.startsWith('.')
    ? load(path.resolve(path.dirname(filename), `${name}.ts`)) : require(name), module, module.exports)
  return module.exports
}

const { validateAddressUnits, visibleAddressErrors, mergePostalErrors } = load('src/utils/addressForm.ts')
const address = { id: 1, name: 'Matriz São Paulo', cep: '01234567', state: 'SP', city: 'São Paulo',
  neighborhood: 'Centro', street: 'Rua Exemplo', number: '10', complement: '' }

test('validação conjunta identifica unidade duplicada sem alterar os endereços e respeita os limites de cada fluxo', () => {
  const units = Object.freeze([Object.freeze({ ...address }), Object.freeze({ ...address, id: 2, name: '  MATRIZ SÃO PAULO  ' })])
  const errors = validateAddressUnits(units, false)
  assert.deepEqual(errors[1], {})
  assert.match(errors[2].name, /nome da unidade já foi usado/)
  assert.equal(units[1].name, '  MATRIZ SÃO PAULO  ')
  const longName = [{ ...address, name: 'a'.repeat(81) }]
  assert.match(validateAddressUnits(longName, false)[1].name, /80/)
  assert.deepEqual(validateAddressUnits(longName, true)[1], {})
})

test('erro assíncrono de CEP cria novos objetos e preserva o estado anterior congelado', () => {
  const original = Object.freeze({ 1: Object.freeze({}), 2: Object.freeze({ name: 'Nome duplicado.' }) })
  const postal = Object.freeze({ 1: 'CEP não encontrado.' })
  const merged = mergePostalErrors(original, postal)
  assert.deepEqual(merged, { 1: { cep: 'CEP não encontrado.' }, 2: { name: 'Nome duplicado.' } })
  assert.deepEqual(original, { 1: {}, 2: { name: 'Nome duplicado.' } })
  assert.notEqual(merged, original)
  assert.notEqual(merged[1], original[1])
  assert.notEqual(merged[2], original[2])
})

test('erros visíveis acompanham a correção dos campos e conservam a falha da consulta de CEP', () => {
  const recorded = Object.freeze({ name: 'Nome duplicado.', state: 'UF inválida.', cep: 'CEP não encontrado.' })
  const duplicate = { ...address, id: 2 }
  assert.deepEqual(visibleAddressErrors(address, [address, duplicate], recorded, false), {
    name: 'Nome duplicado.', cep: 'CEP não encontrado.',
  })
  assert.deepEqual(visibleAddressErrors(address, [address], recorded, false), { cep: 'CEP não encontrado.' })
  assert.equal(recorded.state, 'UF inválida.')
})
