import { BUTTONS } from '../../gtm/buttons'
import { AstroBrand, PurpleButton } from '../../components'
import { Navigate, useNavigate } from 'react-router-dom'
import { useWorkspaceRegistration } from '../../hooks/useWorkspaceRegistration'

function AccessKeyVerifiedPage() {
  const navigate = useNavigate()
  const { draft, verifiedEmail } = useWorkspaceRegistration()
  if (!draft.email || verifiedEmail !== draft.email.trim()) return <Navigate to="/createWorkspace" replace />

  return (
    <main data-track-page={true} className="access-verified-page">
      <section className="access-verified-content astro-scale-90" aria-labelledby="access-verified-title">
        <AstroBrand />

        <img
          className="access-verified-illustration"
          src={import.meta.env.BASE_URL + "accessKeyVerified.png"}
          alt=""
          width="474"
          height="332"
        />

        <header className="login-heading">
          <h1 id="access-verified-title">Chave de acesso verificada!</h1>
          <p>Seu e-mail foi confirmado. Siga os próximos passos<br className="access-verified-desktop-break" /> para cadastrar seu workspace.</p>
        </header>

        <PurpleButton data-track-action={BUTTONS.comuns.comecar} className="access-verified-button" onClick={() => navigate('/createPassword')}>Começar</PurpleButton>
      </section>
    </main>
  )
}

export default AccessKeyVerifiedPage
