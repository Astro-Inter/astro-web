import { BUTTONS } from '../../gtm/buttons'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppSidebar, ComplianceOverviewCard, NotificationButton, NotificationModal, QuickActionCard, SummaryStatCard } from '../../components'
import { quickActions } from '../../data/home'
import { useWorkspaceHome } from '../../hooks/useWorkspaceHome'
import { mockNotifications } from '../../data/notifications'
import HomeDashboardSkeleton from '../../components/homeDashboardSkeleton'

function MainHomeScreenPage() {
  const navigate = useNavigate()
  const { data, loading, error, retry } = useWorkspaceHome()
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  return (
    <div className="main-position-screen main-home-screen">
      <AppSidebar />
      <main data-track-page={true} className="position-main" id="conteudo-principal">
        <section aria-labelledby="home-title" className="position-content home-content astro-scale-90">
          <header className="position-heading home-heading">
            <div className="home-heading-copy">
              <h1 id="home-title">{data ? `Bem-vindo, ${data.userName}!` : 'Bem-vindo!'}</h1>
              <p>Administre acessos, acompanhe a atuação e gerencie os responsáveis por cada função no seu sistema.</p>
            </div>
            <NotificationButton expanded={notificationsOpen} onClick={() => setNotificationsOpen(true)} />
          </header>

          <section aria-labelledby="home-dashboards-title" aria-busy={loading} className="home-section">
            <h2 id="home-dashboards-title">Dashboards</h2>
            {loading && <HomeDashboardSkeleton />}
            {error && <div className="home-card home-api-feedback"><p role="alert">{error}</p><button data-track-action={BUTTONS.comuns.tentar_novamente} className="astro-action" onClick={retry} type="button">Tentar novamente</button></div>}
            {data && <>
              <p className="home-reference-date">Dados de <time dateTime={data.referenceDate}>{data.referenceDate.split('-').reverse().join('/')}</time></p>
              <div className="home-dashboards home-dashboards--ready">
                <ComplianceOverviewCard overview={data.complianceOverview} onViewDashboards={() => navigate('/mainDashboardsScreen')} />
                <div className="home-summary">
                  {data.summaryStats.map((stat) => <SummaryStatCard key={stat.id} stat={stat} />)}
                </div>
              </div>
            </>}
          </section>

          <section aria-labelledby="home-quick-actions-title" className="home-section">
            <h2 id="home-quick-actions-title">Ações rápidas</h2>
            <div className="home-quick-actions">
              {quickActions.map((action) => {
                const path = action.path
                return <QuickActionCard action={action} key={action.id} onSelect={path ? () => navigate(path, { state: { openCreate: true } }) : undefined} />
              })}
            </div>
          </section>
        </section>
      </main>
      {notificationsOpen && <NotificationModal notifications={mockNotifications} onClose={() => setNotificationsOpen(false)} />}
    </div>
  )
}

export default MainHomeScreenPage
