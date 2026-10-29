import AstroIcon from '../astroIcon'

export default function DashboardGallerySkeleton() {
  return <div className="dashboard-gallery-skeleton">
    <span className="sr-only" role="status">Carregando dashboards...</span>
    <div className="forms-grid" aria-hidden="true">
      {[0, 1, 2, 3].map(id => <div className="dashboard-card dashboard-card--skeleton" key={id}>
        <div className="dashboard-card-header">
          <span className="dashboard-card-art"><span className="api-skeleton dashboard-skeleton-art" /></span>
          <div className="dashboard-card-copy">
            <span className="dashboard-card-category"><span className="api-skeleton dashboard-skeleton-category" /></span>
            <h2 className="dashboard-card-title"><span className="api-skeleton dashboard-skeleton-title" /></h2>
            <p className="dashboard-card-description"><span className="api-skeleton dashboard-skeleton-description" /></p>
          </div>
        </div>
        <div className="dashboard-card-footer">
          <span className="api-skeleton dashboard-skeleton-count" />
          <span className="dashboard-card-link"><span className="dashboard-card-link-label">Abrir dashboard</span><span className="dashboard-card-link-icon"><AstroIcon name="chevron-right" /></span></span>
        </div>
        <span className="dashboard-card-options"><AstroIcon name="dots" /></span>
      </div>)}
    </div>
  </div>
}
