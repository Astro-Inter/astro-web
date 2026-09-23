import { AstroBrand, PurpleButton } from '../../components'
import { useNavigate } from 'react-router-dom'

function AccessKeyVerifiedPage() {
  const navigate = useNavigate()

  return (
    <main className="access-verified-page">
      <section className="access-verified-content astro-scale-90" aria-labelledby="access-verified-title">
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

        <PurpleButton className="access-verified-button" onClick={() => navigate('/createPassword')}>Começar</PurpleButton>
      </section>
    </main>
  )
}

export default AccessKeyVerifiedPage
