import { BUTTONS } from '../../gtm/buttons'
import { useNavigate } from 'react-router-dom'
import { AstroBrand, PurpleButton } from '../../components'

function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <main data-track-page={true} className="not-found-page">
      <section className="not-found-content astro-scale-90" aria-labelledby="not-found-title">
        <AstroBrand />
        <header className="login-heading">
          <h1 id="not-found-title">Página não encontrada</h1>
          <p>Confira o endereço ou volte para a tela inicial.</p>
        </header>
        <PurpleButton data-track-action={BUTTONS.comuns.voltar_inicio} onClick={() => navigate('/')}>Voltar para o início</PurpleButton>
      </section>
    </main>
  )
}

export default NotFoundPage
