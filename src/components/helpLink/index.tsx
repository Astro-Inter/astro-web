import { BUTTONS } from '../../gtm/buttons'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { beginActionLoading } from '../../utils/actionFeedback'

function HelpLink() {
  const [opening, setOpening] = useState(false)
  const pending = useRef<(() => void) | null>(null)
  useEffect(() => () => pending.current?.(), [])

  function openEmail(event: MouseEvent<HTMLAnchorElement>) {
    if (pending.current) { event.preventDefault(); return }
    setOpening(true)
    const stopLoading = beginActionLoading()
    function cleanup() {
      window.clearTimeout(timeout)
      window.removeEventListener('blur', finish)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      stopLoading()
      pending.current = null
    }
    function finish() { cleanup(); setOpening(false) }
    function onVisibilityChange() { if (document.hidden) finish() }
    // mailto não informa quando o aplicativo externo terminou de abrir.
    const timeout = window.setTimeout(finish, 4000)
    pending.current = cleanup
    window.addEventListener('blur', finish, { once: true })
    document.addEventListener('visibilitychange', onVisibilityChange)
  }

  return (
    <a data-track-action={BUTTONS.comuns.ajuda} aria-busy={opening} aria-disabled={opening || undefined} onClick={openEmail} className="help-link" href="mailto:astro.instituto@gmail.com">
      <span aria-hidden="true" className="help-icon" />
      <span>Precisa de ajuda</span>
    </a>
  )
}

export default HelpLink
