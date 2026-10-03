import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AstroIcon, HelpLink, PaymentMethodForm, PaymentSummary } from '../../components'
import WorkspaceSettingsBackButton from '../../components/WorkspaceSettingsBackButton'
import WorkspaceSettingsSaveModal from '../../components/WorkspaceSettingsSaveModal'

function PaymentMethodPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const settingsMode = searchParams.get('context') === 'settings'
  const [confirming, setConfirming] = useState(false)

  return (
    <main className="payment-page">
      {settingsMode ? <WorkspaceSettingsBackButton screen="backPaymentsModalWeb" /> : <button className="payment-back-button" onClick={() => navigate('/')} type="button">
        <AstroIcon name="back" />
        <span className="sr-only">Voltar para o login</span>
      </button>}

      <div className="payment-stage astro-scale-90">
        <section className="payment-content" aria-labelledby="payment-title">
          <div className="payment-heading">
            <h1 id="payment-title">Método de pagamento</h1>
            <p>Assinatura mensal de R$ 10 por funcionário ativo</p>
          </div>

          <PaymentMethodForm />
        </section>

        <section className="payment-aside" aria-label="Detalhes da compra">
          <PaymentSummary settingsMode={settingsMode} onCompletePurchase={() => { if (settingsMode) setConfirming(true); else navigate('/createWorkspace') }} />
        </section>
      </div>
      <HelpLink />
      {confirming && <WorkspaceSettingsSaveModal onCancel={() => setConfirming(false)} section="payments" />}
    </main>
  )
}

export default PaymentMethodPage
