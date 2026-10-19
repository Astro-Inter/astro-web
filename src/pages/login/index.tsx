import { AnimatedWelcome, AstroBrand, HelpLink, LoginForm } from '../../components'
import { Navigate, useNavigate } from 'react-router-dom'
import { useLogin } from '../../hooks/useLogin'
import LoginLoadingOverlay from '../../components/loginLoadingOverlay'
import { useEffect } from 'react'
import { useWorkspaceRegistration } from '../../hooks/useWorkspaceRegistration'

function LoginPage() {
  const navigate = useNavigate()
  const { credentials, errors, status, message, invalidCredentials, updateCredential, submit } = useLogin()
  const { reset } = useWorkspaceRegistration()
  useEffect(() => { reset() }, [reset])

  async function handleSubmit(): Promise<void> {
    if (await submit()) navigate('/loadingScreen', {
      replace: true,
      state: { afterLogin: true },
    })
  }

  if (status === 'inactive') return <Navigate to="/inactiveScreenLayout" replace />

  return (
    <>
    <main data-track-page={true} className="login-page" inert={status === 'loading' || status === 'success'} aria-busy={status === 'loading'}>
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
    {(status === 'loading' || status === 'success') && <LoginLoadingOverlay />}
    </>
  )
}

export default LoginPage
