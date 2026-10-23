import type { AnalyticsFilters, AnalyticsView, AnalyticsWidget, ChartKind } from '../types/dashboard'

interface CatalogItem { id: string; label: string; view: AnalyticsView; index: number; grouping: string; types: readonly ChartKind[] }
export const analyticsCatalog: readonly CatalogItem[] = [
  { id: 'colaboradores-tempo', label: 'Colaboradores no tempo', view: 'visao-geral', index: 0, grouping: 'Data', types: ['line', 'bar'] },
  { id: 'colaboradores-cargo', label: 'Colaboradores por cargo', view: 'visao-geral', index: 1, grouping: 'Data e cargo', types: ['line', 'bar'] },
  { id: 'colaboradores-nr', label: 'Colaboradores por NR do catálogo', view: 'visao-geral', index: 2, grouping: 'NR', types: ['bar'] },
  { id: 'turmas-nr', label: 'Turmas por NR no tempo', view: 'eventos', index: 0, grouping: 'Data e NR', types: ['line', 'bar'] },
  { id: 'conclusoes-nr', label: 'Participações concluídas por NR', view: 'eventos', index: 1, grouping: 'Data e NR', types: ['line', 'bar'] },
  { id: 'eventos-nr', label: 'Eventos por NR', view: 'eventos', index: 2, grouping: 'NR', types: ['bar', 'pie'] },
  { id: 'eventos-modo', label: 'Eventos por modo de conclusão', view: 'eventos', index: 3, grouping: 'Modo de conclusão', types: ['bar', 'pie'] },
  { id: 'eventos-gestor', label: 'Eventos por gestor', view: 'eventos', index: 4, grouping: 'Gestor', types: ['bar', 'pie'] },
]
export const chartKindLabels: Record<ChartKind, string> = { bar: 'Barras', line: 'Linhas', pie: 'Pizza' }
export const dimensionLabels: Record<string, string> = { data: 'Data', cargo: 'Cargo', codigo_nr: 'NR do catálogo', nr_id: 'NR', gestor: 'Gestor', modo_conclusao: 'Modo de conclusão' }
export function defaultAnalyticsFilters(): AnalyticsFilters {
  const date = new Date()
  const end = new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
  date.setDate(date.getDate() - 89)
  const start = new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
  return { start, end, granularity: 'mes' }
}
export function templateWidgets(view: AnalyticsView): AnalyticsWidget[] {
  return analyticsCatalog.filter(item => item.view === view).map(item => ({
    id: crypto.randomUUID(), datasetId: item.id, title: item.label,
    type: item.types[0], width: 'half',
  }))
}
export function validAnalyticsFilters(filters: AnalyticsFilters): boolean {
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
  const days = (Date.parse(filters.end) - Date.parse(filters.start)) / 86_400_000 + 1
  return validDate(filters.start) && validDate(filters.end) && days >= 1 && days <= 366
}
