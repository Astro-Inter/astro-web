import { Navigate, useNavigate } from 'react-router-dom'
import { AstroBrand, PurpleButton } from '../../components'
import { useWorkspaceRegistration } from '../../hooks/useWorkspaceRegistration'

function WorkspaceCreatedPage() {
  const navigate = useNavigate()
  const { result } = useWorkspaceRegistration()
  if (!result) return <Navigate to="/createWorkspace" replace />

  return (
    <main className="workspace-created-page">
      <section className="workspace-created-content astro-scale-90" aria-labelledby="workspace-created-title">
        <AstroBrand />

        <div className="workspace-created-illustration">
        <img
          className="workspace-created-image"
          src={import.meta.env.BASE_URL + "workspaceCreated.png"}
          alt=""
          width="1536"
          height="1024"
        />
        </div>

        <header className="login-heading">
          <h1 id="workspace-created-title">Criação do workspace concluída!</h1>
          <p role="status">Seu workspace foi cadastrado com sucesso. Continue para entrar com o e-mail e a senha do gestor.</p>
        </header>

        <PurpleButton className="workspace-created-button" onClick={() => navigate('/', { replace: true })}>
          Continuar
        </PurpleButton>
      </section>
    </main>
  )
}

export default WorkspaceCreatedPage
