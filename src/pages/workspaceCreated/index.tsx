import { BUTTONS } from '../../gtm/buttons'
import { Navigate, useNavigate } from 'react-router-dom'
import { AstroBrand, PurpleButton } from '../../components'
import { useWorkspaceRegistration } from '../../hooks/useWorkspaceRegistration'
import { useCreatedWorkspaceLogin } from '../../hooks/useCreatedWorkspaceLogin'
import LoginLoadingOverlay from '../../components/loginLoadingOverlay'

function WorkspaceCreatedPage() {
  const navigate = useNavigate()
  const { result, reset } = useWorkspaceRegistration()
  const login = useCreatedWorkspaceLogin()
  if (!result) return <Navigate to="/createWorkspace" replace />

  return (
    <>
    <main data-track-page={true} className="workspace-created-page" inert={login.pending} aria-busy={login.pending}>
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
          <p role="status">Seu workspace foi cadastrado com sucesso. {login.canSignIn ? 'Continue para acessar sua conta.' : 'Faça login para acessar sua conta.'}</p>
        </header>

        {login.error && <p className="login-field-error workspace-created-error" role="alert">{login.error}</p>}

        <PurpleButton data-track-action={login.canSignIn ? (login.error ? BUTTONS.comuns.tentar_novamente : BUTTONS.comuns.continuar) : BUTTONS.comuns.login} className="workspace-created-button" disabled={login.pending} onClick={async () => {
          if (!login.canSignIn) { reset(); navigate('/', { replace: true }); return }
          if (await login.submit()) navigate('/mainHomeScreen', { replace: true })
        }}>
          {login.canSignIn ? (login.error ? 'Tentar novamente' : 'Continuar') : 'Ir para o login'}
        </PurpleButton>
      </section>
    </main>
    {login.pending && <LoginLoadingOverlay />}
    </>
  )
}

export default WorkspaceCreatedPage
