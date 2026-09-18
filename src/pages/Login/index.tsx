import AnimatedWelcome from '../../components/AnimatedWelcome'
import AstroBrand from '../../components/AstroBrand'
import HelpLink from '../../components/HelpLink'
import LoginForm from '../../components/LoginForm'

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
