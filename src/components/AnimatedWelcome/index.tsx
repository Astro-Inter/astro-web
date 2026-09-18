function AnimatedWelcome() {
  return (
    <section className="login-welcome" aria-label="Boas-vindas">
      <div className="welcome-orb" aria-hidden="true">
        <div className="welcome-orb-surface" />
      </div>

      <div className="welcome-content">
        <h2>Seja bem-vindo ao Astro!</h2>
        <p>Insira suas credenciais para entrar no seu workspace.</p>
      </div>
    </section>
  )
}

export default AnimatedWelcome
