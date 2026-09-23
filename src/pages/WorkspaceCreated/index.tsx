import { useNavigate } from 'react-router-dom'
import { AstroBrand, PurpleButton } from '../../components'

function WorkspaceCreatedPage() {
  const navigate = useNavigate()

  return (
    <main className="workspace-created-page">
      <section className="workspace-created-content astro-scale-90" aria-labelledby="workspace-created-title">
        <AstroBrand />

        <img
          className="workspace-created-illustration"
          src="/paper-create-workspace.png"
          alt=""
          width="1536"
          height="1024"
        />

        <header className="login-heading">
          <h1 id="workspace-created-title">Criação do workspace concluída!</h1>
          <p>As informações para criar seu workspace foram recebidas. Clique em continuar para carregar sua conta.</p>
        </header>

        <PurpleButton className="workspace-created-button" onClick={() => navigate('/loadingScreen')}>
          Continuar
        </PurpleButton>
      </section>
    </main>
  )
}

export default WorkspaceCreatedPage
