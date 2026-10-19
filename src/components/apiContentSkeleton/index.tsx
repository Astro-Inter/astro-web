import type { CSSProperties } from 'react'

interface ApiContentSkeletonProps {
  label: string
  variant?: 'form' | 'profile' | 'cards'
  fields?: number
  columns?: 1 | 2 | 3
  actions?: number
  className?: string
  actionLabels?: readonly string[]
  onCancel?: () => void
  cardCount?: number
}

function ApiContentSkeleton({ label, variant = 'form', fields = 6, columns = 2, actions = 2, className = '', actionLabels, onCancel, cardCount = 4 }: ApiContentSkeletonProps) {
  return <div aria-busy="true" className={`api-loading api-loading--${variant} ${className}`}>
    <span className="sr-only" role="status">{label}</span>
    <div aria-hidden="true">
      {variant === 'cards' ? <div className="forms-grid api-loading-cards">{Array.from({ length: Math.min(4, Math.max(1, Math.floor(cardCount))) }, (_, id) =>
        <div className="form-card api-loading-card" key={id}><div className="form-card-heading"><span className="api-skeleton form-card-icon" /><div className="form-card-copy"><h2><span className="api-skeleton api-card-title" /></h2><p><span className="api-skeleton api-card-description" /></p></div><span className="api-skeleton form-card-options" /></div><div className="form-card-badges"><span className="api-skeleton api-card-badge" /><span className="api-skeleton api-card-badge" /></div></div>)}</div> : <>
        {variant === 'profile' && <div className="account-profile-header api-loading-identity">
          <div className="account-profile-photo"><span className="api-skeleton api-skeleton-avatar account-skeleton-photo" /></div><div className="account-profile-identity account-skeleton-identity"><h3><span className="api-skeleton" /></h3><p><span className="api-skeleton" /></p></div>
        </div>}
        <div className="api-loading-fields" style={{ '--api-loading-columns': columns } as CSSProperties}>
          {Array.from({ length: fields }, (_, index) => <div className="api-loading-field" key={`field-${index}`}><span className="api-skeleton api-skeleton-label" /><span className="api-skeleton api-skeleton-control" /></div>)}
        </div>
      </>}
    </div>
    {variant !== 'cards' && actions > 0 && <div className="astro-modal-actions">{Array.from({ length: actions }, (_, index) => <button className={index === 0 ? 'astro-modal-cancel' : 'astro-action'} disabled={index > 0 || !onCancel} onClick={index === 0 ? onCancel : undefined} type="button" key={`action-${index}`}>{actionLabels?.[index] ?? (index === 0 ? 'Cancelar' : 'Salvar alterações')}</button>)}</div>}
  </div>
}

export default ApiContentSkeleton
