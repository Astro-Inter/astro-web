import type { AnalyticsDashboard } from '../../types/dashboard'
import AnalyticsLoadingContent from '../analyticsLoadingContent'
import TruncatedText from '../truncatedText'

interface AnalyticsMetricCardProps {
  metric?: AnalyticsDashboard['kpis'][number]
  loading: boolean
}
const number = new Intl.NumberFormat('pt-BR')

export default function AnalyticsMetricCard({ metric, loading }: AnalyticsMetricCardProps) {
  const title = metric?.label.replace(/\s+no lake\b/gi, '') ?? ''
  return <article className="create-forms-card analytics-kpi-card" aria-label={title || 'Indicador'}>
    <AnalyticsLoadingContent loading={loading} variant="metric" contentKey={JSON.stringify(metric)} label="Carregando indicador">
      {metric && <>
        <h3 className="analytics-kpi-label"><TruncatedText nativeEllipsis>{title}</TruncatedText></h3>
        <strong className="analytics-kpi-value"><TruncatedText nativeEllipsis>{number.format(metric.value)}</TruncatedText></strong>
      </>}
    </AnalyticsLoadingContent>
  </article>
}
