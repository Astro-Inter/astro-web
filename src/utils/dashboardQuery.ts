import type { AnalyticsWidget, ExplorerCatalog, ExplorerMetric, ExplorerQuery } from '../types/dashboard'

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const identifier = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 80
const operations = ['count', 'distinct', 'sum', 'avg', 'min', 'max']
const formulaOperations = ['add', 'subtract', 'multiply', 'divide', 'percentage']
const metric = (value: unknown): value is ExplorerMetric => record(value) && identifier(value.field) && operations.includes(String(value.operation))

export function isExplorerQuery(value: unknown): value is ExplorerQuery {
  return record(value) && identifier(value.dataset) && identifier(value.groupBy)
    && (value.series === undefined || identifier(value.series)) && metric(value.metric)
    && (value.formula === undefined || record(value.formula) && formulaOperations.includes(String(value.formula.operator)) && metric(value.formula.operand))
    && Array.isArray(value.where) && value.where.length <= 3 && value.where.every(row => record(row) && identifier(row.field)
      && ['equals', 'not_equals'].includes(String(row.operator)) && typeof row.value === 'string' && row.value.trim().length > 0 && row.value.length <= 120)
}

export interface ExplorerQueryValidation { values: ExplorerQuery | null; errors: Record<string, string> }

export function validateAndSanitizeExplorerQuery(value: ExplorerQuery, catalog?: ExplorerCatalog): ExplorerQueryValidation {
  const errors: Record<string, string> = {}
  if (!record(value) || !Array.isArray(value.where) || !isExplorerQuery({ ...value, where: [] })) return { values: null, errors: { query: 'Confira a base, a informação e a operação do cálculo.' } }
  if (value.where.length > 3) errors.query = 'Adicione no máximo três filtros.'
  value.where.forEach((row, index) => {
    if (!record(row) || !identifier(row.field)) errors[`filter.${index}.field`] = 'Selecione o campo do filtro.'
    if (!record(row) || !['equals', 'not_equals'].includes(String(row.operator))) errors[`filter.${index}.operator`] = 'Selecione uma comparação válida.'
    if (!record(row) || typeof row.value !== 'string' || !row.value.trim() || row.value.length > 120) errors[`filter.${index}.value`] = 'Informe um valor de até 120 caracteres.'
  })
  if (Object.keys(errors).length) return { values: null, errors }
  const dataset = catalog?.datasets.find(item => item.id === value.dataset)
  if (catalog && !dataset) errors.dataset = 'Selecione uma base de dados disponível.'
  if (dataset) {
    for (const [key, item] of [['metric', value.metric], ['formula', value.formula?.operand]] as const) {
      if (item && !dataset.fields.some(field => field.id === item.field && field.operations.includes(item.operation))) errors[key] = 'Selecione uma informação e uma operação disponíveis nesta base.'
    }
    if (value.groupBy !== 'none' && !dataset.fields.some(field => field.id === value.groupBy && field.groupable)) errors.groupBy = 'Selecione um agrupamento disponível.'
    if (value.series && (value.groupBy === 'none' || value.series === value.groupBy || !dataset.fields.some(field => field.id === value.series && field.groupable && field.kind !== 'date'))) errors.series = 'Selecione um detalhamento diferente do agrupamento.'
    value.where.forEach((row, index) => {
      if (!dataset.fields.some(field => field.id === row.field && ['text', 'identifier'].includes(field.kind))) errors[`filter.${index}.field`] = 'Selecione um campo de filtro disponível nesta base.'
    })
  }
  const values: ExplorerQuery = { dataset: value.dataset.trim(), groupBy: value.groupBy.trim(), metric: { ...value.metric, field: value.metric.field.trim() },
    ...(value.series ? { series: value.series.trim() } : {}),
    ...(value.formula ? { formula: { operator: value.formula.operator, operand: { ...value.formula.operand, field: value.formula.operand.field.trim() } } } : {}),
    where: value.where.map(row => ({ field: row.field.trim(), operator: row.operator, value: row.value.trim() })) }
  return { values: Object.keys(errors).length ? null : values, errors }
}

export function validateChartTitle(value: string): string {
  return !value.trim() || value.trim().length > 120 ? 'Informe um nome para o gráfico de até 120 caracteres.' : ''
}

export function validateAndSanitizeWidget(widget: AnalyticsWidget): AnalyticsWidget {
  const error = validateChartTitle(widget.title)
  if (error) throw new Error(error)
  if (!['bar', 'line', 'pie'].includes(widget.type)) throw new Error('Selecione um tipo de gráfico válido.')
  if (widget.datasetId !== 'custom') return { ...widget, title: widget.title.trim() }
  if (!widget.query) throw new Error('Configure o cálculo do gráfico.')
  const validation = validateAndSanitizeExplorerQuery(widget.query)
  if (!validation.values) throw new Error(Object.values(validation.errors)[0])
  return { ...widget, title: widget.title.trim(), query: validation.values }
}
