import { useNavigate } from 'react-router-dom'
import { AstroBrand, AstroIcon } from '../../components'
import DashboardBarChart from '../../components/dashboardBarChart'
import DashboardMetricCard from '../../components/dashboardMetricCard'
import { dashboardDetailCharts, dashboardDetailMetrics, dashboardOverviewChart, dashboardOverviewMetrics } from '../../data/dashboards'

function MainDashboardsScreenPage() {
  const navigate = useNavigate()
  return <div className="create-forms-page astro-scale-90 dashboards-page">
    <button aria-label="Voltar" className="payment-back-button" onClick={() => navigate('/mainHomeScreen')} type="button"><AstroIcon name="back" /></button>
    <header className="create-password-header create-forms-header"><AstroBrand /></header>
    <main className="create-forms-main dashboards-content" aria-labelledby="dashboards-title">
      <h1 id="dashboards-title">Dashboards</h1>
      <div className="dashboard-overview-grid">
        <DashboardBarChart chart={dashboardOverviewChart} />
        <div className="dashboard-metrics">{dashboardOverviewMetrics.map(metric => <DashboardMetricCard key={metric.id} metric={metric} />)}</div>
      </div>
      <div className="dashboard-details-grid">
        {dashboardDetailCharts.map(chart => <section className="dashboard-detail" key={chart.id} aria-label={chart.title}>
          <div className="dashboard-metrics">{dashboardDetailMetrics.map(metric => <DashboardMetricCard key={metric.id} metric={metric} />)}</div>
          <DashboardBarChart chart={chart} />
        </section>)}
      </div>
    </main>
  </div>
}

export default MainDashboardsScreenPage
