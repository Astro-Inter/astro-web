import { AstroBrand } from '../../components'

function AccessKeyVerifiedPage() {
  return (
    <main className="access-verified-page">
      <section className="access-verified-content" aria-labelledby="access-verified-title">
        <AstroBrand />

        <img
          className="access-verified-illustration"
          src="/access-key-verified.png"
          alt=""
          width="474"
          height="332"
        />

        <header className="login-heading">
          <h1 id="access-verified-title">Chave de acesso verificada!</h1>
          <p>Seu workspace está pronto. Siga os próximos passos<br className="access-verified-desktop-break" /> para personalizar a sua experiência.</p>
        </header>

        <button className="access-verified-button" type="button">Começar</button>
      </section>
    </main>
  )
}

export default AccessKeyVerifiedPage
