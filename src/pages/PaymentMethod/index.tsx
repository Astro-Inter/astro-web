import { useNavigate } from 'react-router-dom'
import { AstroIcon, HelpLink, PaymentMethodForm, PaymentSummary } from '../../components'

function PaymentMethodPage() {
  const navigate = useNavigate()

  return (
    <main className="payment-page">
      <button className="payment-back-button" onClick={() => navigate('/')} type="button">
        <AstroIcon name="back" />
        <span className="sr-only">Voltar para o login</span>
      </button>

      <div className="payment-stage astro-scale-90">
        <section className="payment-content" aria-labelledby="payment-title">
          <div className="payment-heading">
            <h1 id="payment-title">Método de pagamento</h1>
            <p>Assinatura mensal de R$ 10 por funcionário ativo</p>
          </div>

          <PaymentMethodForm />
        </section>

        <section className="payment-aside" aria-label="Detalhes da compra">
          <PaymentSummary onCompletePurchase={() => navigate('/createWorkspace')} />
        </section>
      </div>
      <HelpLink />
    </main>
  )
}

export default PaymentMethodPage
