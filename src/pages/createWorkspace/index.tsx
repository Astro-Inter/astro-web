import { useNavigate } from 'react-router-dom'
import { AnimatedWelcome, AstroBrand, HelpLink, WorkspaceCodeForm } from '../../components'
import { useWorkspaceRegistration } from '../../hooks/useWorkspaceRegistration'
import { useWorkspaceEmailVerification } from '../../hooks/useWorkspaceEmailVerification'
import LoginLoadingOverlay from '../../components/loginLoadingOverlay'

function CreateWorkspacePage() {
  const navigate = useNavigate()
  const { draft, updateDraft, markEmailVerified } = useWorkspaceRegistration()
  const { status, message, verifyCode } = useWorkspaceEmailVerification()
  const busy = status === 'loading'

  async function handleVerify(accessKey: string): Promise<void> {
    const email = await verifyCode(accessKey, draft.email)
    if (email) {
      updateDraft({ email })
      markEmailVerified(email)
      navigate('/accessKeyVerified')
    }
  }

  return (
    <>
    <main data-track-page={true} className="login-page create-workspace-page" inert={busy} aria-busy={busy}>
      <AnimatedWelcome
        title={<>Crie seu workspace<br />no Astro!</>}
        description={<>Insira o código enviado por e-mail<br className="create-workspace-desktop-break" />{' '}para criar seu workspace.</>}
      />

      <section className="login-panel" aria-labelledby="create-workspace-title">
        <div className="login-card astro-scale-90">
          <AstroBrand />
          <WorkspaceCodeForm status={status} message={message} onVerify={handleVerify} />
        </div>

        <HelpLink />
      </section>
    </main>
    {busy && <LoginLoadingOverlay />}
    </>
  )
}

export default CreateWorkspacePage
