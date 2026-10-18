import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import LoadingIndicator from '../loadingIndicator'

function LoginLoadingOverlay() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const focused = document.activeElement
    if (dialog.showModal) dialog.showModal()
    else dialog.setAttribute('open', '')
    return () => {
      if (dialog.open && dialog.close) dialog.close()
      else dialog.removeAttribute('open')
      if (focused instanceof window.HTMLElement && focused.isConnected && document.activeElement === document.body) focused.focus({ preventScroll: true })
    }
  }, [])
  return createPortal(
    <dialog ref={dialogRef} className="login-loading-overlay astro-scale-90" aria-label="Carregando" onCancel={event => event.preventDefault()}>
      <LoadingIndicator />
    </dialog>, document.body)
}
export default LoginLoadingOverlay
