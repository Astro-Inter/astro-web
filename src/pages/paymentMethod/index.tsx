import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AstroIcon, HelpLink, PaymentMethodForm, PaymentSummary } from '../../components'
import WorkspaceSettingsBackButton from '../../components/workspaceSettingsBackButton'
import WorkspaceSettingsSaveModal from '../../components/workspaceSettingsSaveModal'
import { useWorkspaceRegistration } from '../../hooks/useWorkspaceRegistration'
import { useWorkspaceEmailVerification } from '../../hooks/useWorkspaceEmailVerification'
import { validateManagerEmail } from '../../utils/workspaceRegistration'
import LoginLoadingOverlay from '../../components/loginLoadingOverlay'

function PaymentMethodPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const settingsMode = searchParams.get('context') === 'settings'
  const [confirming, setConfirming] = useState(false)
  const { draft, updateDraft } = useWorkspaceRegistration()
  const emailVerification = useWorkspaceEmailVerification()
  const [emailError, setEmailError] = useState('')
  const pending = !settingsMode && (emailVerification.status === 'loading' || emailVerification.status === 'success')

  async function handleCompletePurchase(): Promise<void> {
    if (settingsMode) { setConfirming(true); return }
    if (pending) return
    const message = validateManagerEmail(draft.email)
    setEmailError(message)
    if (message) return
    const email = draft.email.trim()
    if (await emailVerification.requestCode(email)) {
      updateDraft({ email })
      navigate('/createWorkspace')
    }
  }

  return (
    <>
    <main className="payment-page" aria-busy={pending} inert={pending}>
      {settingsMode ? <WorkspaceSettingsBackButton screen="backPaymentsModalWeb" /> : <button className="payment-back-button" disabled={pending} onClick={() => navigate('/')} type="button">
        <AstroIcon name="back" />
        <span className="sr-only">Voltar para o login</span>
      </button>}

      <div className="payment-stage astro-scale-90">
        <section className="payment-content" aria-labelledby="payment-title">
          <div className="payment-heading">
            <h1 id="payment-title">Método de pagamento</h1>
            <p>Assinatura mensal de R$ 10 por funcionário ativo</p>
          </div>

          <PaymentMethodForm disabled={pending} emailError={emailError || (!settingsMode && emailVerification.status === 'error' ? emailVerification.message : '')} initialEmail={settingsMode ? '' : draft.email} onEmailChange={settingsMode ? undefined : email => {
            setEmailError('')
            emailVerification.clearError()
            updateDraft({ email })
          }} />
        </section>

        <section className="payment-aside" aria-label="Detalhes da compra">
          <PaymentSummary settingsMode={settingsMode} status={settingsMode ? 'idle' : emailVerification.status}
            onCompletePurchase={() => { void handleCompletePurchase() }} />
        </section>
      </div>
      <HelpLink />
      {confirming && <WorkspaceSettingsSaveModal onCancel={() => setConfirming(false)} section="payments" />}
    </main>
    {emailVerification.status === 'loading' && !settingsMode && <LoginLoadingOverlay />}
    </>
  )
}

export default PaymentMethodPage
