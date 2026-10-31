export interface DashboardSeries {
  id: string
  label: string
  color: 'cream' | 'lavender' | 'purple' | 'teal'
}

export interface DashboardCategory {
  id: string
  label: string
  values: readonly number[]
}

export interface DashboardChartData {
  id: string
  title: string
  unit: string
  maximum: number
  series: readonly DashboardSeries[]
  categories: readonly DashboardCategory[]
}

export interface DashboardMetric {
  id: string
  label: string
  value: number
  suffix?: string
}

export type AnalyticsView = 'visao-geral' | 'eventos'
export type ChartKind = 'bar' | 'line' | 'pie'
export interface AnalyticsFilters { start: string; end: string; granularity: 'dia' | 'semana' | 'mes' | 'ano' }
export interface AnalyticsIdentity { userId: string; workspaceId: string; role: string }
export interface AnalyticsChart {
  title: string; kind: 'bar' | 'line'; dimensions: string[]; measure: string; dateSensitive: boolean
  rows: Record<string, string | number>[]
  metricLabel?: string; format?: 'number' | 'percent'; undefinedGroups?: number
}
export interface AnalyticsCache { hit: boolean; ttlSeconds: number; expiresAt: string }
export interface AnalyticsDashboard {
  view: AnalyticsView; workspaceId: string; title: string; generatedAt: string; dataSource: 'databricks'
  filters: AnalyticsFilters & { view: AnalyticsView }
  kpis: { key: string; label: string; value: number; dateSensitive: boolean }[]
  charts: AnalyticsChart[]
  cache?: AnalyticsCache
}
export type AggregateOperation = 'count' | 'distinct' | 'sum' | 'avg' | 'min' | 'max'
export interface ExplorerField { id: string; label: string; kind: 'identifier' | 'text' | 'date' | 'number'; description: string; value: string; sourceColumn: string | null; operations: AggregateOperation[]; groupable: boolean }
export interface ExplorerDataset { id: string; label: string; description: string; source: string; dateField: string; dateDescription: string; fields: ExplorerField[] }
export interface ExplorerCatalog { version: string; datasets: ExplorerDataset[] }
export interface ExplorerMetric { field: string; operation: AggregateOperation }
export interface ExplorerQuery { dataset: string; groupBy: string; series?: string; metric: ExplorerMetric; formula?: { operator: 'add' | 'subtract' | 'multiply' | 'divide' | 'percentage'; operand: ExplorerMetric }; where: { id?: string; field: string; operator: 'equals' | 'not_equals'; value: string }[] }
export interface ExplorerResult { workspaceId: string; dataSource: 'databricks'; generatedAt: string; filters: AnalyticsFilters; chart: AnalyticsChart; cache?: AnalyticsCache }
export interface AnalyticsWidget { id: string; datasetId: string; title: string; type: ChartKind; width: 'half' | 'full'; query?: ExplorerQuery }
export type DashboardArtworkId = 'overview' | 'trends' | 'bars' | 'donut' | 'area' | 'progress' | 'comparison' | 'scatter' | 'activity' | 'metrics'
export interface DashboardConfig { filters: AnalyticsFilters; widgets: AnalyticsWidget[]; artwork?: DashboardArtworkId }
export interface SavedDashboard { id: string; name: string; config: DashboardConfig; version: number; createdAt: string; updatedAt: string }
export interface DashboardDraft { name: string; config: DashboardConfig }
