import type { CSSProperties } from 'react'

interface ApiContentSkeletonProps {
  label: string
  variant?: 'form' | 'profile' | 'cards'
  fields?: number
  columns?: 1 | 2 | 3
  actions?: number
  className?: string
}

function ApiContentSkeleton({ label, variant = 'form', fields = 6, columns = 2, actions = 2, className = '' }: ApiContentSkeletonProps) {
  return <div aria-busy="true" className={`api-loading api-loading--${variant} ${className}`}>
    <span className="sr-only" role="status">{label}</span>
    <div aria-hidden="true">
      {variant === 'cards' ? <div className="forms-grid api-loading-cards">{['first', 'second', 'third', 'fourth', 'fifth', 'sixth'].map(id =>
        <div className="form-card api-loading-card" key={id}><div className="form-card-heading"><span className="api-skeleton form-card-icon" /><div className="form-card-copy api-loading-identity-lines"><span className="api-skeleton api-skeleton-heading" /><span className="api-skeleton api-skeleton-text" /><span className="api-skeleton api-skeleton-text api-skeleton-short" /></div><span className="api-skeleton api-skeleton-table-action" /></div><div className="api-loading-card-badges"><span className="api-skeleton api-skeleton-table-status" /><span className="api-skeleton api-skeleton-table-status" /></div></div>)}</div> : <>
        {variant === 'profile' && <div className="account-profile-header api-loading-identity">
          <span className="api-skeleton api-skeleton-avatar" /><div className="api-loading-identity-lines"><span className="api-skeleton api-skeleton-heading" /><span className="api-skeleton api-skeleton-text" /></div>
        </div>}
        <div className="api-loading-fields" style={{ '--api-loading-columns': columns } as CSSProperties}>
          {Array.from({ length: fields }, (_, index) => <div className="api-loading-field" key={`field-${index}`}><span className="api-skeleton api-skeleton-label" /><span className="api-skeleton api-skeleton-control" /></div>)}
        </div>
        {actions > 0 && <div className="api-loading-actions">{Array.from({ length: actions }, (_, index) => <span className="api-skeleton api-skeleton-action" key={`action-${index}`} />)}</div>}
      </>}
    </div>
  </div>
}

export default ApiContentSkeleton
