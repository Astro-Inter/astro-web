import { AnimatedWelcome, AstroBrand, HelpLink, LoginForm } from '../../components'
import { useNavigate } from 'react-router-dom'
import { useLogin } from '../../hooks/useLogin'

function LoginPage() {
  const navigate = useNavigate()
  const { credentials, errors, status, message, invalidCredentials, updateCredential, submit } = useLogin()

  async function handleSubmit(): Promise<void> {
    if (await submit()) navigate('/mainHomeScreen', { replace: true })
  }

  return (
    <main className="login-page">
      <AnimatedWelcome
        title="Seja bem-vindo ao Astro!"
        description="Insira suas credenciais para entrar no seu workspace."
      />

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-card astro-scale-90">
          <AstroBrand />
          <LoginForm
            credentials={credentials}
            errors={errors}
            invalidCredentials={invalidCredentials}
            message={message}
            onCredentialChange={updateCredential}
            onSubmit={handleSubmit}
            status={status}
          />
        </div>

        <HelpLink />
      </section>
    </main>
  )
}

export default LoginPage
