import { AstroBrand, CreatePasswordForm, HelpLink } from '../../components'

function CreatePasswordPage() {
  return (
    <main className="create-password-page">
      <header className="create-password-header">
        <AstroBrand />
      </header>

      <section className="login-card create-password-card" aria-labelledby="create-password-title">
        <CreatePasswordForm />
      </section>

      <HelpLink />
    </main>
  )
}

export default CreatePasswordPage
