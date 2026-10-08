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
