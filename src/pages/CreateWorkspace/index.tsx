import { useNavigate } from 'react-router-dom'
import { AnimatedWelcome, AstroBrand, HelpLink, WorkspaceCodeForm } from '../../components'

function CreateWorkspacePage() {
  const navigate = useNavigate()

  return (
    <main className="login-page create-workspace-page">
      <AnimatedWelcome
        title={<>Crie seu workspace<br />no Astro!</>}
        description={<>Insira o código enviado por e-mail<br className="create-workspace-desktop-break" />{' '}para criar seu workspace.</>}
      />

      <section className="login-panel" aria-labelledby="create-workspace-title">
        <div className="login-card astro-scale-90">
          <AstroBrand />
          <WorkspaceCodeForm onVerified={() => navigate('/accessKeyVerified')} />
        </div>

        <HelpLink />
      </section>
    </main>
  )
}

export default CreateWorkspacePage
