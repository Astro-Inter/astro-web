import type { AggregateOperation, ChartKind, ExplorerDataset, ExplorerQuery } from '../types/dashboard'

export const aggregateLabels: Record<AggregateOperation, string> = { count: 'Contar registros preenchidos', distinct: 'Contar sem repetir', sum: 'Somar valores', avg: 'Calcular a média', min: 'Encontrar o menor valor', max: 'Encontrar o maior valor' }
export const formulaLabels = { add: 'Somar (+)', subtract: 'Subtrair (−)', multiply: 'Multiplicar (×)', divide: 'Dividir (÷)', percentage: 'Calcular percentual (A ÷ B × 100)' } as const
export function defaultQuery(dataset: ExplorerDataset): ExplorerQuery {
  const field = dataset.fields.find(item => item.kind === 'identifier') || dataset.fields[0]
  return { dataset: dataset.id, groupBy: 'none', metric: { field: field.id, operation: 'distinct' }, where: [] }
}
export function explorerKinds(query: ExplorerQuery, dataset?: ExplorerDataset): readonly ChartKind[] {
  if (dataset?.fields.find(item => item.id === query.groupBy)?.kind === 'date') return ['line', 'bar']
  return query.series || query.formula || ['distinct', 'avg', 'min', 'max'].includes(query.metric.operation) ? ['bar'] : ['bar', 'pie']
}
export function isExplorerQuery(value: unknown): value is ExplorerQuery {
  const item = value as ExplorerQuery
  const metric = (value: ExplorerQuery['metric']) => value && typeof value.field === 'string' && value.field.length <= 80 && Object.hasOwn(aggregateLabels, value.operation)
  return !!item && typeof item.dataset === 'string' && typeof item.groupBy === 'string' && (!item.series || typeof item.series === 'string') && !!metric(item.metric)
    && (!item.formula || (Object.hasOwn(formulaLabels, item.formula.operator) && !!metric(item.formula.operand))) && Array.isArray(item.where) && item.where.length <= 3 && item.where.every(row => row && typeof row.field === 'string' && ['equals', 'not_equals'].includes(row.operator) && typeof row.value === 'string' && row.value.trim().length > 0 && row.value.length <= 120)
}
export function querySummary(query: ExplorerQuery, dataset?: ExplorerDataset): string {
  const field = (id: string) => dataset?.fields.find(item => item.id === id)?.label || id
  const metric = (value: ExplorerQuery['metric']) => `${aggregateLabels[value.operation]} de ${field(value.field).toLocaleLowerCase('pt-BR')}`
  return `${metric(query.metric)}${query.formula ? `; ${formulaLabels[query.formula.operator].toLocaleLowerCase('pt-BR')} com ${metric(query.formula.operand).toLocaleLowerCase('pt-BR')}` : ''}${query.groupBy !== 'none' ? `, por ${field(query.groupBy).toLocaleLowerCase('pt-BR')}` : ''}`
}
