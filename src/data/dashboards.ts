import type { DashboardChartData, DashboardMetric } from '../types/dashboard'

// Dados locais para reproduzir visualizações analíticas antes da integração com Databricks.
export const dashboardOverviewMetrics: readonly DashboardMetric[] = [
  { id: 'collaborators', label: 'Colaboradores', value: 248 },
  { id: 'compliance', label: 'Conformidade', value: 87, suffix: '%' },
]

export const dashboardDetailMetrics: readonly DashboardMetric[] = [
  { id: 'units', label: 'Unidades', value: 4 },
  { id: 'pending', label: 'Pendências', value: 8 },
]

export const dashboardOverviewChart: DashboardChartData = {
  id: 'unit-compliance', title: 'Conformidade por unidade', unit: '%', maximum: 100,
  series: [
    { id: 'requirements', label: 'Requisitos', color: 'cream' },
    { id: 'training', label: 'Treinamentos', color: 'lavender' },
    { id: 'documents', label: 'Documentos', color: 'purple' },
    { id: 'overall', label: 'Conformidade', color: 'teal' },
  ],
  categories: [
    { id: 'headquarters', label: 'Matriz', values: [38, 51, 72, 92] },
    { id: 'branch-1', label: 'Filial 1', values: [38, 51, 72, 81] },
    { id: 'branch-2', label: 'Filial 2', values: [38, 51, 72, 85] },
    { id: 'branch-3', label: 'Filial 3', values: [67, 72, 68, 90] },
  ],
}

const detailSeries: DashboardChartData['series'] = [
  { id: 'compliant', label: 'Conformes', color: 'cream' },
  { id: 'expiring', label: 'A vencer', color: 'lavender' },
  { id: 'expired', label: 'Vencidos', color: 'purple' },
  { id: 'review', label: 'Em análise', color: 'teal' },
]

export const dashboardDetailCharts: readonly DashboardChartData[] = [
  { id: 'requirements-status', title: 'Requisitos por status', unit: '', maximum: 100, series: detailSeries,
    categories: [{ id: 'requirements', label: 'Requisitos', values: [86, 64, 46, 32] }] },
  { id: 'training-status', title: 'Treinamentos por status', unit: '', maximum: 100, series: detailSeries,
    categories: [{ id: 'training', label: 'Treinamentos', values: [86, 64, 46, 32] }] },
]
