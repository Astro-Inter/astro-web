import { BUTTONS, confirmationAction } from '../../gtm/buttons'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import AppModal from '../appModal'
import PurpleButton from '../purpleButton'

interface ConfirmationModalProps {
  trackingName?: string
  cancelLabel?: string
  className?: string
  backdrop?: 'dimmed' | 'transparent'
  preservePageScroll?: boolean
  confirmCloseDelay?: number
  confirmLabel: string
  progressLabel?: string
  description?: ReactNode
  icon?: ReactNode
  onCancel: () => void
  onCancelRequest?: () => void
  onConfirm: () => string | null | Promise<string | null>
  onConfirmed: () => void
  title: string
  tone?: 'default' | 'danger'
}

function ConfirmationModal({ trackingName, cancelLabel = 'Cancelar', className = '', backdrop = 'transparent', preservePageScroll = false, confirmCloseDelay = 0, confirmLabel, progressLabel = 'Salvando alterações...', description, icon, onCancel, onCancelRequest, onConfirm, onConfirmed, title, tone = 'default' }: ConfirmationModalProps) {
  const confirmedRef = useRef(false)
  const confirmTimerRef = useRef<number | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)

  useEffect(() => () => {
    if (confirmTimerRef.current !== null) window.clearTimeout(confirmTimerRef.current)
  }, [])

  return (
    <AppModal trackingName={trackingName} dismissible={!submitting} backdrop={backdrop} preservePageScroll={preservePageScroll} className={`astro-confirmation-modal${icon ? ' astro-confirmation-modal--with-icon' : ''}${className ? ` ${className}` : ''}`} onClose={() => {
      if (confirmedRef.current) onConfirmed()
      else onCancel()
    }} onDismissRequest={() => {
      if (!confirmedRef.current) onCancelRequest?.()
    }} title={icon ? <><span className="astro-confirmation-title-icon">{icon}</span><span className="astro-confirmation-title-text">{title}</span></> : title}>
      {(dismiss) => <>
        {description && <p className="astro-confirmation-description">{description}</p>}
        {submitting && progressLabel && <p role="status">{progressLabel}</p>}
        {error && <p className="astro-confirmation-error" role="alert">{error}</p>}
        <div className="astro-modal-actions">
          <button data-track-action={cancelLabel === 'Voltar' ? BUTTONS.comuns.voltar : BUTTONS.comuns.cancelar} className="astro-modal-cancel" disabled={submitting} onClick={dismiss} type="button">{cancelLabel}</button>
          <PurpleButton data-track-action={confirmationAction(confirmLabel)} variant={tone === 'danger' ? 'danger' : 'solid'} disabled={submitting} onClick={async () => {
            if (submittingRef.current || confirmedRef.current) return
            submittingRef.current = true
            setSubmitting(true)
            setError('')
            let nextError: string | null
            try { nextError = await onConfirm() }
            catch (error: unknown) { nextError = error instanceof Error ? error.message : 'Não foi possível salvar as alterações.' }
            submittingRef.current = false
            setSubmitting(false)
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
