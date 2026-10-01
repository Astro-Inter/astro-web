import { useNavigate } from 'react-router-dom'
import { AppSidebar, AstroChat, ComplianceOverviewCard, NotificationButton, QuickActionCard, SummaryStatCard } from '../../components'
import { mockComplianceOverview, mockSummaryStats, mockUserName, quickActions } from '../../data/home'

function MainHomeScreenPage() {
  const navigate = useNavigate()

  return (
    <div className="main-position-screen main-home-screen">
      <AppSidebar />
      <main className="position-main" id="conteudo-principal">
        <section aria-labelledby="home-title" className="position-content home-content astro-scale-90">
          <header className="position-heading home-heading">
            <div className="home-heading-copy">
              <h1 id="home-title">Bem-vindo, {mockUserName}!</h1>
              <p>Administre acessos, acompanhe a atuação e gerencie os responsáveis por cada função no seu sistema.</p>
            </div>
            <NotificationButton />
          </header>

          <section aria-labelledby="home-dashboards-title" className="home-section">
            <h2 id="home-dashboards-title">Dashboards</h2>
            <div className="home-dashboards">
              <ComplianceOverviewCard overview={mockComplianceOverview} />
              <div className="home-summary">
                {mockSummaryStats.map((stat) => <SummaryStatCard key={stat.id} stat={stat} />)}
              </div>
            </div>
          </section>

          <section aria-labelledby="home-quick-actions-title" className="home-section">
            <h2 id="home-quick-actions-title">Ações rápidas</h2>
            <div className="home-quick-actions">
              {quickActions.map((action) => {
                const path = action.path
                return <QuickActionCard action={action} key={action.id} onSelect={path ? () => navigate(path) : undefined} />
              })}
            </div>
          </section>
        </section>
        <AstroChat />
      </main>
    </div>
  )
}

export default MainHomeScreenPage
