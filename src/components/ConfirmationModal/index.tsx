import { useEffect, useRef, useState } from 'react'
import AppModal from '../AppModal'
import PurpleButton from '../PurpleButton'

interface ConfirmationModalProps {
  cancelLabel?: string
  className?: string
  confirmCloseDelay?: number
  confirmLabel: string
  onCancel: () => void
  onCancelRequest?: () => void
  onConfirm: () => string | null
  onConfirmed: () => void
  title: string
}

function ConfirmationModal({ cancelLabel = 'Cancelar', className = '', confirmCloseDelay = 0, confirmLabel, onCancel, onCancelRequest, onConfirm, onConfirmed, title }: ConfirmationModalProps) {
  const confirmedRef = useRef(false)
  const confirmTimerRef = useRef<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => () => {
    if (confirmTimerRef.current !== null) window.clearTimeout(confirmTimerRef.current)
  }, [])

  return (
    <AppModal className={`astro-confirmation-modal${className ? ` ${className}` : ''}`} onClose={() => {
      if (confirmedRef.current) onConfirmed()
      else onCancel()
    }} onDismissRequest={() => {
      if (!confirmedRef.current) onCancelRequest?.()
    }} title={title}>
      {(dismiss) => <>
        {error && <p className="astro-confirmation-error" role="alert">{error}</p>}
        <div className="astro-modal-actions">
          <button className="astro-modal-cancel" onClick={dismiss} type="button">{cancelLabel}</button>
          <PurpleButton onClick={() => {
            const nextError = onConfirm()
            if (nextError) {
              setError(nextError)
              return
            }
            confirmedRef.current = true
            if (confirmCloseDelay > 0) {
              confirmTimerRef.current = window.setTimeout(dismiss, confirmCloseDelay)
            } else {
              dismiss()
            }
          }} type="button">{confirmLabel}</PurpleButton>
        </div>
      </>}
    </AppModal>
  )
}

export default ConfirmationModal
