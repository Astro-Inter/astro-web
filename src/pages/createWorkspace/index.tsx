import { Navigate, useNavigate } from 'react-router-dom'
import { AnimatedWelcome, AstroBrand, HelpLink, WorkspaceCodeForm } from '../../components'
import { useWorkspaceRegistration } from '../../hooks/useWorkspaceRegistration'
import { useWorkspaceEmailVerification } from '../../hooks/useWorkspaceEmailVerification'
import { validateManagerEmail } from '../../utils/workspaceRegistration'

function CreateWorkspacePage() {
  const navigate = useNavigate()
  const { draft, markEmailVerified } = useWorkspaceRegistration()
  const { status, message, verifyCode } = useWorkspaceEmailVerification()
  if (validateManagerEmail(draft.email)) return <Navigate to="/paymentMethod" replace />

  async function handleVerify(accessKey: string): Promise<void> {
    if (await verifyCode(draft.email, accessKey)) {
      markEmailVerified(draft.email)
      navigate('/accessKeyVerified')
    }
  }

  return (
    <main className="login-page create-workspace-page">
      <AnimatedWelcome
        title={<>Crie seu workspace<br />no Astro!</>}
        description={<>Insira o código enviado por e-mail<br className="create-workspace-desktop-break" />{' '}para criar seu workspace.</>}
      />

      <section className="login-panel" aria-labelledby="create-workspace-title">
        <div className="login-card astro-scale-90">
          <AstroBrand />
          <WorkspaceCodeForm email={draft.email.trim()} status={status} message={message} onVerify={handleVerify} />
        </div>

        <HelpLink />
      </section>
    </main>
  )
}

export default CreateWorkspacePage
