import { AnimatedWelcome, AstroBrand, HelpLink, LoginForm } from '../../components'

function LoginPage() {
  return (
    <main className="login-page">
      <AnimatedWelcome
        title="Seja bem-vindo ao Astro!"
        description="Insira suas credenciais para entrar no seu workspace."
      />

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-card astro-scale-90">
          <AstroBrand />
          <LoginForm />
        </div>

        <HelpLink />
      </section>
    </main>
  )
}

export default LoginPage
