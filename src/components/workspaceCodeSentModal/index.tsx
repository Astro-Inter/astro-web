import { useRef } from 'react'
import AppModal from '../appModal'
import PurpleButton from '../purpleButton'

interface WorkspaceCodeSentModalProps {
  kind: 'sent' | 'already-sent' | 'resent'
  pending: boolean
  resendWait: number
  error: string
  onResend: () => void
  onContinue: () => void
  onClose: () => void
}

function WorkspaceCodeSentModal({ kind, pending, resendWait, error, onResend, onContinue, onClose }: WorkspaceCodeSentModalProps) {
  const continuing = useRef(false)
  const title = kind === 'already-sent' ? 'Código já enviado' : kind === 'resent' ? 'Reenvio de código solicitado' : 'Envio de código solicitado'

  return <AppModal className="astro-confirmation-modal" backdrop="dimmed" dismissible={!pending}
    onClose={() => { if (continuing.current) onContinue(); else onClose() }} title={title}>
    {dismiss => <>
      <p className="astro-confirmation-description">
        {kind === 'already-sent'
          ? 'Já foi enviado um código para seu e-mail. Confira sua caixa de entrada e a pasta de spam. Se não encontrar, você pode reenviar.'
          : 'Sua solicitação foi recebida. Aguarde o código no e-mail e confira também a pasta de spam. Quando recebê-lo, clique em continuar para digitar o código.'}
      </p>
      {pending && <p className="astro-confirmation-description" role="status">Reenviando código...</p>}
      {error && <p className="astro-confirmation-error" role="alert">{error}</p>}
      <div className="astro-modal-actions">
        <button className="astro-modal-cancel" disabled={pending || resendWait > 0} onClick={onResend} type="button">{resendWait > 0 ? `Reenviar em ${resendWait}s` : 'Reenviar'}</button>
        <PurpleButton disabled={pending} onClick={() => { continuing.current = true; dismiss() }}>Continuar</PurpleButton>
      </div>
    </>}
  </AppModal>
}

export default WorkspaceCodeSentModal
