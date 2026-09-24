import { useNavigate } from 'react-router-dom'
import { AstroBrand, CreatePasswordForm, HelpLink } from '../../components'

function CreatePasswordPage() {
  const navigate = useNavigate()

  return (
    <main className="create-password-page">
      <header className="create-password-header">
        <AstroBrand />
      </header>

      <section className="login-card create-password-card astro-scale-90" aria-labelledby="create-password-title">
        <CreatePasswordForm onContinue={() => navigate('/includeCompanyInformation')} />
      </section>

      <HelpLink />
    </main>
  )
}

export default CreatePasswordPage
