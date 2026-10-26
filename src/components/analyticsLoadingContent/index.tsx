import type { ReactNode } from 'react'
import { useExitPresence } from '../../hooks/useExitPresence'

interface AnalyticsLoadingContentProps {
  loading: boolean
  children?: ReactNode
  variant?: 'chart' | 'fields' | 'metric' | 'select'
  contentKey?: string
  label?: string
}

export default function AnalyticsLoadingContent({ loading, children, variant = 'chart', contentKey = 'content', label = 'Carregando dados…' }: AnalyticsLoadingContentProps) {
  const presence = useExitPresence(true, loading)
  return <div className={`analytics-loading-content analytics-loading-content--${variant}`} aria-busy={loading}>
    {presence.present ? <div className={`analytics-skeleton${presence.exiting ? ' analytics-skeleton--exit' : ''}`}>
      {loading && <span className="sr-only" role="status">{label}</span>}
      <div aria-hidden="true" className={`analytics-skeleton-${variant}`}>
        {variant === 'chart' ? <><div className="analytics-skeleton-plot">{[42, 70, 55, 90, 65, 80].map((height, index) => <span key={index} className="api-skeleton" style={{ height: `${height}%` }} />)}</div><span className="api-skeleton api-skeleton-text" /></>
          : variant === 'fields' ? <>{[0, 1, 2, 3].map(id => <div className="api-loading-field" key={id}><span className="api-skeleton api-skeleton-label" /><span className="api-skeleton api-skeleton-control" /></div>)}</>
            : <span className={`api-skeleton ${variant === 'select' ? 'api-skeleton-control' : 'api-skeleton-heading'}`} />}
      </div>
    </div> : <div className="analytics-content-ready" key={contentKey}>{children}</div>}
  </div>
}
