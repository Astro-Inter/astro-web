import type { AggregateOperation, ChartKind, ExplorerDataset, ExplorerQuery } from '../types/dashboard'

export const aggregateLabels: Record<AggregateOperation, string> = { count: 'Contar registros preenchidos', distinct: 'Contar sem repetir', sum: 'Somar valores', avg: 'Calcular a média', min: 'Encontrar o menor valor', max: 'Encontrar o maior valor' }
export const formulaLabels = { add: 'Somar (+)', subtract: 'Subtrair (−)', multiply: 'Multiplicar (×)', divide: 'Dividir (÷)', percentage: 'Calcular percentual (A ÷ B × 100)' } as const
export function defaultQuery(dataset: ExplorerDataset): ExplorerQuery {
  const field = dataset.fields.find(item => item.kind === 'identifier') || dataset.fields[0]
  return { dataset: dataset.id, groupBy: 'none', metric: { field: field.id, operation: field.operations.includes('distinct') ? 'distinct' : field.operations[0] }, where: [] }
}
export function explorerKinds(query: ExplorerQuery, dataset?: ExplorerDataset): readonly ChartKind[] {
  if (dataset?.fields.find(item => item.id === query.groupBy)?.kind === 'date') return ['line', 'bar']
  return query.series || query.formula || ['distinct', 'avg', 'min', 'max'].includes(query.metric.operation) ? ['bar'] : ['bar', 'pie']
}
export { isExplorerQuery } from '../utils/dashboardQuery'
export function querySummary(query: ExplorerQuery, dataset?: ExplorerDataset): string {
  const field = (id: string) => dataset?.fields.find(item => item.id === id)?.label || id
  const metric = (value: ExplorerQuery['metric']) => `${aggregateLabels[value.operation]} de ${field(value.field).toLocaleLowerCase('pt-BR')}`
  return `${metric(query.metric)}${query.formula ? `; ${formulaLabels[query.formula.operator].toLocaleLowerCase('pt-BR')} com ${metric(query.formula.operand).toLocaleLowerCase('pt-BR')}` : ''}${query.groupBy !== 'none' ? `, por ${field(query.groupBy).toLocaleLowerCase('pt-BR')}` : ''}`
}
