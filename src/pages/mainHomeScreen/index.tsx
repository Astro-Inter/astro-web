import { BUTTONS } from '../../gtm/buttons'
import { useNavigate } from 'react-router-dom'
import { AppSidebar, QuickActionCard } from '../../components'
import { quickActions } from '../../data/home'
import { useWorkspaceHome } from '../../hooks/useWorkspaceHome'
import HomeProfileLink from '../../components/homeProfileLink'
import HomeDashboardSkeleton from '../../components/homeDashboardSkeleton'

function MainHomeScreenPage() {
  const navigate = useNavigate()
  const { data, loading, error, retry } = useWorkspaceHome()

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
            <HomeProfileLink name={data?.userName ?? ''} photoUrl={data?.profilePhotoUrl} loading={loading} error={error} />
          </header>

          <section aria-labelledby="home-dashboards-title" aria-busy={loading} className="home-section">
            <h2 id="home-dashboards-title">Dashboards</h2>
            {(loading || data) && <HomeDashboardSkeleton loading={loading} data={data} onViewDashboards={() => navigate('/mainDashboardsScreen')} />}
            {error && <div className="home-card home-api-feedback"><p role="alert">{error}</p><button data-track-action={BUTTONS.comuns.tentar_novamente} className="astro-action" onClick={retry} type="button">Tentar novamente</button></div>}

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
    </div>
  )
}

export default MainHomeScreenPage
