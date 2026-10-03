import { useRef } from 'react'
import AppModal from '../AppModal'
import PasswordConfirmationForm from '../PasswordConfirmationForm'

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
  return (
    <AppModal backdrop={backdrop} className={`workspace-password-modal ${className}`} onClose={() => continuingRef.current ? onContinue() : onCancel()} preservePageScroll title="Digite sua senha atual para poder continuar">
      {dismiss => <PasswordConfirmationForm confirmLabel={confirmLabel} danger={danger} onCancel={dismiss} onContinue={() => { continuingRef.current = true; dismiss() }} />}
    </AppModal>
  )
}

export default PasswordConfirmationModal
