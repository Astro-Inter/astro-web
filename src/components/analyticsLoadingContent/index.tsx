import type { ReactNode } from 'react'
import type { ChartKind } from '../../types/dashboard'
import { useExitPresence } from '../../hooks/useExitPresence'

interface AnalyticsLoadingContentProps {
  loading: boolean
  children?: ReactNode
  variant?: 'chart' | 'fields' | 'metric' | 'select' | 'metadata'
  contentKey?: string
  label?: string
  skeleton?: ReactNode
  chartKind?: ChartKind
  descriptionLines?: number
  timestamp?: boolean
  legend?: boolean
}

export default function AnalyticsLoadingContent({ loading, children, variant = 'chart', contentKey = 'content', label = 'Carregando dados…', skeleton, chartKind = 'bar', descriptionLines = 1, timestamp = false, legend = true }: AnalyticsLoadingContentProps) {
  const presence = useExitPresence(true, loading)
  return <div className={`analytics-loading-content analytics-loading-content--${variant}`} aria-busy={loading}>
    {presence.present ? <div className={`analytics-skeleton${presence.exiting ? ' analytics-skeleton--exit' : ''}`}>
      {loading && <span className="sr-only" role="status">{label}</span>}
      <div aria-hidden="true" className={skeleton ? 'analytics-skeleton-custom' : `analytics-skeleton-${variant}`}>
        {skeleton ?? (variant === 'metadata' ? <p className="analytics-note"><span className="api-skeleton analytics-skeleton-metadata" /></p> : variant === 'chart' ? <>
          {chartKind === 'pie' ? <div className="analytics-skeleton-pie-layout"><span className="api-skeleton analytics-skeleton-pie" /><div className="analytics-skeleton-copy">{[0, 1, 2].map(id => <span className="api-skeleton" key={id} />)}</div></div>
            : <div className="analytics-skeleton-plot">{chartKind === 'line' ? <span className="api-skeleton analytics-skeleton-line" /> : [42, 70, 55, 90, 65, 80].map((height, index) => <span key={index} className="api-skeleton" style={{ height: `${height}%` }} />)}</div>}
          {legend && chartKind !== 'pie' && <div className="analytics-skeleton-legend">{[0, 1, 2].map(id => <span className="api-skeleton" key={id} />)}</div>}
          {Array.from({ length: descriptionLines }, (_, id) => <span className="api-skeleton analytics-skeleton-description" key={id} />)}
          {timestamp && <span className="api-skeleton analytics-skeleton-timestamp" />}
        </> : variant === 'metric' ? <>
          <div className="analytics-kpi-label analytics-skeleton-copy"><span className="api-skeleton" /></div>
          <strong className="analytics-kpi-value"><span className="api-skeleton analytics-skeleton-value" /></strong>
        </> : variant === 'fields' ? <>{[0, 1, 2, 3].map(id => <div className="api-loading-field" key={id}><span className="api-skeleton api-skeleton-label" /><span className="api-skeleton api-skeleton-control" /></div>)}</>
          : <span className="api-skeleton api-skeleton-control" />)}
      </div>
    </div> : <div className="analytics-content-ready" key={contentKey}>{children}</div>}
  </div>
}
