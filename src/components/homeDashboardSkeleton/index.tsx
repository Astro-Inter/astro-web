function HomeDashboardSkeleton() {
  return <>
    <p className="sr-only" role="status">Carregando os indicadores do workspace.</p>
    <div aria-hidden="true" className="home-skeleton home-skeleton-reference" />
    <div aria-hidden="true" className="home-dashboards home-dashboards--loading">
      <div className="home-card compliance-overview">
        <div className="compliance-overview-header">
          <div className="home-skeleton-heading">
            <span className="home-skeleton home-skeleton-title" />
            <span className="home-skeleton home-skeleton-description" />
          </div>
          <span className="home-skeleton home-skeleton-action" />
        </div>
        <div className="compliance-overview-body">
          <div className="compliance-donut home-skeleton-donut">
            <div className="compliance-donut-center">
              <span className="home-skeleton home-skeleton-number" />
              <span className="home-skeleton home-skeleton-label" />
            </div>
          </div>
          <ul className="compliance-legend">
            {['compliant', 'expiring', 'expired', 'pending'].map(status => <li key={status}>
              <span className="home-skeleton compliance-legend-dot" />
              <span className="home-skeleton home-skeleton-label" />
            </li>)}
          </ul>
        </div>
      </div>
      <div className="home-summary">
        {['units', 'collaborators'].map(id => <div className="home-card summary-stat" key={id}>
          <span className="home-skeleton home-skeleton-title" />
          <div className="summary-stat-row">
            <span className="home-skeleton home-skeleton-value" />
            <span className="home-skeleton summary-stat-link" />
          </div>
        </div>)}
      </div>
    </div>
  </>
}

export default HomeDashboardSkeleton
