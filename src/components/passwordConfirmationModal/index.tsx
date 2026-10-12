import { useRef } from 'react'
import { usePasswordConfirmation } from '../../hooks/usePasswordConfirmation'
import AppModal from '../appModal'
import PasswordConfirmationForm from '../passwordConfirmationForm'

interface PasswordConfirmationModalProps {
  className: string
  confirmLabel?: string
  danger?: boolean
  backdrop?: 'dimmed' | 'transparent'
  onCancel: () => void
  onContinue: () => void
}

function PasswordConfirmationModal({ className, confirmLabel = 'Continuar', danger = false, backdrop = 'dimmed', onCancel, onContinue }: PasswordConfirmationModalProps) {
  const continuingRef = useRef(false)
  const actionRef = useRef(onContinue)
  const confirmation = usePasswordConfirmation()
  return (
    <AppModal backdrop={backdrop} className={`workspace-password-modal ${className}`} dismissible={confirmation.status !== 'success'} onDismissRequest={() => { if (!continuingRef.current) confirmation.cancel() }} onClose={() => confirmation.consumeConfirmation() ? actionRef.current() : onCancel()} preservePageScroll title="Digite sua senha atual para poder continuar">
      {dismiss => <PasswordConfirmationForm confirmation={confirmation} confirmLabel={confirmLabel} danger={danger} onCancel={dismiss} onContinue={async () => {
        if (await confirmation.submit()) { continuingRef.current = true; dismiss() }
      }} />}
    </AppModal>
  )
}

export default PasswordConfirmationModal
