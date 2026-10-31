const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

const moduleValue = { exports: {} }
const source = ts.transpileModule(fs.readFileSync('src/utils/dashboardQuery.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
new Function('require', 'module', 'exports', source)(require, moduleValue, moduleValue.exports)
const { isExplorerQuery, validateAndSanitizeExplorerQuery, validateAndSanitizeWidget } = moduleValue.exports
const query = { dataset: 'pessoas', groupBy: 'none', metric: { field: 'pessoa', operation: 'distinct' }, where: [] }
const catalog = { datasets: [{ id: 'pessoas', fields: [
  { id: 'pessoa', kind: 'identifier', operations: ['count', 'distinct'], groupable: false },
  { id: 'unidade', kind: 'text', operations: ['count', 'distinct'], groupable: true },
] }] }

test('cada filtro inválido identifica o campo e permite corrigir sem enviar a consulta', () => {
  const result = validateAndSanitizeExplorerQuery({ ...query, where: [{ field: 'unidade', operator: 'equals', value: ' ' }, { field: '', operator: 'other', value: 'x'.repeat(121) }] }, catalog)
  assert.equal(result.values, null)
  assert.deepEqual(Object.keys(result.errors).sort(), ['filter.0.value', 'filter.1.field', 'filter.1.operator', 'filter.1.value'])
})

test('consulta rejeita estruturas malformadas, campos excessivos e filtros vazios sem lançar erro de parsing', () => {
  for (const value of [null, [], {}, { ...query, metric: null }, { ...query, dataset: 'x'.repeat(81) },
    { ...query, formula: { operator: 'invalid', operand: query.metric } },
    { ...query, where: [{ field: 'unidade', operator: 'equals', value: '   ' }] },
    { ...query, where: Array.from({ length: 4 }, () => ({ field: 'unidade', operator: 'equals', value: 'Matriz' })) }]) {
    assert.equal(isExplorerQuery(value), false)
  }
})

test('validação usa o catálogo e não permite operações, agrupamentos ou detalhamentos incompatíveis', () => {
  for (const value of [{ ...query, dataset: 'outra' }, { ...query, metric: { field: 'pessoa', operation: 'sum' } },
    { ...query, groupBy: 'pessoa' }, { ...query, groupBy: 'unidade', series: 'unidade' },
    { ...query, where: [{ field: 'inexistente', operator: 'equals', value: 'Matriz' }] }]) {
    const result = validateAndSanitizeExplorerQuery(value, catalog)
    assert.equal(result.values, null)
    assert.ok(Object.keys(result.errors).length)
  }
})

test('sanitização preserva o estado do formulário e remove IDs de interface do payload', () => {
  const value = { ...query, where: [{ id: 'filter-ui-id', field: 'unidade', operator: 'equals', value: ' Matriz ' }] }
  const original = structuredClone(value)
  const result = validateAndSanitizeExplorerQuery(value, catalog)
  assert.deepEqual(result.errors, {})
  assert.deepEqual(result.values.where, [{ field: 'unidade', operator: 'equals', value: 'Matriz' }])
  assert.deepEqual(value, original)
  assert.equal(validateAndSanitizeWidget({ id: '1', datasetId: 'custom', title: ' Meu gráfico ', type: 'bar', width: 'half', query: value }).title, 'Meu gráfico')
  assert.throws(() => validateAndSanitizeWidget({ id: '1', datasetId: 'custom', title: '  ', type: 'bar', width: 'half', query: value }), /nome/)
})
