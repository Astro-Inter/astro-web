import { AnimatedWelcome, AstroBrand, HelpLink, LoginForm } from '../../components'

function LoginPage() {
  return (
    <main className="login-page">
      <AnimatedWelcome />

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-card">
          <AstroBrand />
          <LoginForm />
        </div>

        <HelpLink />
      </section>
    </main>
  )
}

export default LoginPage
