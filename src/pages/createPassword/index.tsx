import { Navigate, useNavigate } from 'react-router-dom'
import { AstroBrand, CreatePasswordForm, HelpLink } from '../../components'
import { useWorkspaceRegistration } from '../../hooks/useWorkspaceRegistration'

function CreatePasswordPage() {
  const navigate = useNavigate()
  const { draft, verifiedEmail, updateDraft } = useWorkspaceRegistration()
  if (!draft.email || verifiedEmail !== draft.email.trim()) return <Navigate to="/createWorkspace" replace />

  return (
    <main className="create-password-page">
      <header className="create-password-header">
        <AstroBrand />
      </header>

      <section className="login-card create-password-card astro-scale-90" aria-labelledby="create-password-title">
        <CreatePasswordForm initialPassword={draft.password} onContinue={password => {
          updateDraft({ password })
          navigate('/includeCompanyInformation')
        }} />
      </section>

      <HelpLink />
    </main>
  )
}

export default CreatePasswordPage
