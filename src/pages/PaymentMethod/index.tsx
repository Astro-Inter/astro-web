import { useNavigate } from 'react-router-dom'
import { AstroIcon, HelpLink, PaymentMethodForm, PaymentSummary } from '../../components'

function PaymentMethodPage() {
  const navigate = useNavigate()

  return (
    <main className="payment-page">
      <div className="payment-stage">
        <section className="payment-content" aria-labelledby="payment-title">
          <button className="payment-back-button" onClick={() => navigate('/')} type="button">
            <AstroIcon name="back" />
            <span className="sr-only">Voltar para o login</span>
          </button>

          <div className="payment-heading">
            <h1 id="payment-title">Método de pagamento</h1>
            <p>Assinatura mensal de R$ 10 por funcionário ativo</p>
          </div>

          <PaymentMethodForm />
        </section>

        <section className="payment-aside" aria-label="Detalhes da compra">
          <PaymentSummary />
        </section>

        <HelpLink />
      </div>
    </main>
  )
}

export default PaymentMethodPage
