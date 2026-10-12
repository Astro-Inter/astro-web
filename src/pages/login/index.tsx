import { AnimatedWelcome, AstroBrand, HelpLink, LoginForm } from '../../components'
import { useLocation, useNavigate } from 'react-router-dom'
import { useLogin } from '../../hooks/useLogin'
import { getLoginDestination } from '../../utils/authentication'
import LoginLoadingOverlay from '../../components/loginLoadingOverlay'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { credentials, errors, status, message, invalidCredentials, updateCredential, submit } = useLogin()

  async function handleSubmit(): Promise<void> {
    if (await submit()) navigate('/loadingScreen', {
      replace: true,
      state: { afterLogin: true, returnTo: getLoginDestination(location.state) },
    })
  }

  return (
    <>
    <main className="login-page" inert={status === 'loading'} aria-busy={status === 'loading'}>
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
    {status === 'loading' && <LoginLoadingOverlay />}
    </>
  )
}

export default LoginPage
