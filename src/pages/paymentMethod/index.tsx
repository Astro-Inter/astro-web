import { BUTTONS } from '../../gtm/buttons'
import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AstroIcon, HelpLink, PaymentMethodForm, PaymentSummary } from '../../components'
import WorkspaceSettingsBackButton from '../../components/workspaceSettingsBackButton'
import WorkspaceSettingsSaveModal from '../../components/workspaceSettingsSaveModal'
import { useWorkspaceRegistration } from '../../hooks/useWorkspaceRegistration'
import { useWorkspaceEmailVerification } from '../../hooks/useWorkspaceEmailVerification'
import { validateManagerEmail } from '../../utils/workspaceRegistration'
import LoginLoadingOverlay from '../../components/loginLoadingOverlay'
import WorkspaceCodeSentModal from '../../components/workspaceCodeSentModal'
import { useWorkspaceCodeCooldown } from '../../hooks/useWorkspaceCodeCooldown'

function PaymentMethodPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const settingsMode = searchParams.get('context') === 'settings'
  const [confirming, setConfirming] = useState(false)
  const { draft, updateDraft } = useWorkspaceRegistration()
  const emailVerification = useWorkspaceEmailVerification()
  const [emailError, setEmailError] = useState('')
  const [codePopup, setCodePopup] = useState<{ email: string; kind: 'sent' | 'already-sent' | 'resent' } | null>(null)
  const requestedEmails = useRef(new Set<string>())
  const pending = !settingsMode && emailVerification.status === 'loading'
  const resendWait = useWorkspaceCodeCooldown(codePopup?.email ?? draft.email)

  async function requestCode(email: string, resend = false): Promise<void> {
    const result = await emailVerification.requestCode(email)
    if (result === 'error') return
    requestedEmails.current.add(email.toLowerCase())
    updateDraft({ email })
    setCodePopup({ email, kind: result === 'already-sent' ? 'already-sent' : resend ? 'resent' : 'sent' })
  }

  async function handleCompletePurchase(): Promise<void> {
    if (settingsMode) { setConfirming(true); return }
    if (pending) return
    const message = validateManagerEmail(draft.email)
    setEmailError(message)
    if (message) return
    const email = draft.email.trim()
    if (requestedEmails.current.has(email.toLowerCase())) {
      emailVerification.clearError()
      setCodePopup({ email, kind: 'sent' })
    } else {
      await requestCode(email)
    }
  }

  return (
    <>
    <main data-track-page={true} className="payment-page" aria-busy={pending} inert={pending}>
      {settingsMode ? <WorkspaceSettingsBackButton screen="backPaymentsModalWeb" /> : <button data-track-action={BUTTONS.comuns.voltar} className="payment-back-button" disabled={pending} onClick={() => navigate('/')} type="button">
        <AstroIcon name="back" />
        <span className="sr-only">Voltar para o login</span>
      </button>}

      <div className="payment-stage astro-scale-90">
        <section className="payment-content" aria-labelledby="payment-title">
          <div className="payment-heading">
            <h1 id="payment-title">Método de pagamento</h1>
            <p>Assinatura mensal de R$ 10 por funcionário ativo</p>
          </div>

          <PaymentMethodForm disabled={pending} emailError={emailError || (!settingsMode && !codePopup && emailVerification.status === 'error' ? emailVerification.message : '')} initialEmail={settingsMode ? '' : draft.email} onEmailChange={settingsMode ? undefined : email => {
            setEmailError('')
            emailVerification.clearError()
            updateDraft({ email })
          }} />
        </section>

        <section className="payment-aside" aria-label="Detalhes da compra">
          <PaymentSummary settingsMode={settingsMode} status={pending ? 'loading' : 'idle'}
            onCompletePurchase={() => { void handleCompletePurchase() }} />
        </section>
      </div>
      <HelpLink />
      {confirming && <WorkspaceSettingsSaveModal onCancel={() => setConfirming(false)} section="payments" />}
    </main>
    {pending && !codePopup && <LoginLoadingOverlay />}
    {codePopup && <WorkspaceCodeSentModal kind={codePopup.kind} pending={pending} resendWait={resendWait}
      error={emailVerification.status === 'error' ? emailVerification.message : ''}
      onResend={() => { void requestCode(codePopup.email, true) }}
      onContinue={() => { updateDraft({ email: codePopup.email }); navigate('/createWorkspace') }}
      onClose={() => { setCodePopup(null); emailVerification.clearError() }} />}
    </>
  )
}

export default PaymentMethodPage
