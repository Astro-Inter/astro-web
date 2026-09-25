import { useEffect, useRef, useState, type ReactNode } from 'react'
import AppModal from '../AppModal'
import PurpleButton from '../PurpleButton'

interface ConfirmationModalProps {
  cancelLabel?: string
  className?: string
  confirmCloseDelay?: number
  confirmLabel: string
  icon?: ReactNode
  onCancel: () => void
  onCancelRequest?: () => void
  onConfirm: () => string | null
  onConfirmed: () => void
  title: string
  tone?: 'default' | 'danger'
}

function ConfirmationModal({ cancelLabel = 'Cancelar', className = '', confirmCloseDelay = 0, confirmLabel, icon, onCancel, onCancelRequest, onConfirm, onConfirmed, title, tone = 'default' }: ConfirmationModalProps) {
  const confirmedRef = useRef(false)
  const confirmTimerRef = useRef<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => () => {
    if (confirmTimerRef.current !== null) window.clearTimeout(confirmTimerRef.current)
  }, [])

  return (
    <AppModal className={`astro-confirmation-modal${icon ? ' astro-confirmation-modal--with-icon' : ''}${className ? ` ${className}` : ''}`} onClose={() => {
      if (confirmedRef.current) onConfirmed()
      else onCancel()
    }} onDismissRequest={() => {
      if (!confirmedRef.current) onCancelRequest?.()
    }} title={icon ? <>{icon}{title}</> : title}>
      {(dismiss) => <>
        {error && <p className="astro-confirmation-error" role="alert">{error}</p>}
        <div className="astro-modal-actions">
          <button className="astro-modal-cancel" onClick={dismiss} type="button">{cancelLabel}</button>
          <PurpleButton variant={tone === 'danger' ? 'danger' : 'solid'} onClick={() => {
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
