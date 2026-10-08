import type { DashboardMetric } from '../../types/dashboard'

interface DashboardMetricCardProps {
  metric: DashboardMetric
}

function DashboardMetricCard({ metric }: DashboardMetricCardProps) {
  return <article className="dashboard-metric" aria-label={`${metric.label}: ${metric.value}${metric.suffix ?? ''}`}>
    <strong className="astro-card-title">{metric.value.toLocaleString('pt-BR')}{metric.suffix}</strong>
    <span className="create-forms-label">{metric.label}</span>
  </article>
}

export default DashboardMetricCard
