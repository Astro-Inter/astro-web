import { createPortal } from 'react-dom'
import type { FaceNavigationController } from '../../hooks/useFaceNavigation'
import { useTopDialog } from '../../hooks/useTopDialog'

interface FaceNavigationOverlayProps { face: FaceNavigationController }

function FaceNavigationOverlay({ face }: FaceNavigationOverlayProps) {
  const { status, message, calibrate, togglePause, stop, attachPreview, attachCursor } = face
  const dialog = useTopDialog()
  if (status === 'idle' || status === 'error') return null
  return createPortal(<>
    <aside className="a11y-face-panel" aria-label="Controles da navegação facial">
      <div className="a11y-face-header">
        <div className="a11y-face-preview" ref={attachPreview} />
        <div className="a11y-face-copy"><h2>Navegação facial</h2><p role="status">{status === 'starting' && <span className="a11y-loading-spinner" aria-hidden="true" />}{message}</p></div>
      </div>
      <p className="a11y-face-help">Mantenha a mira parada para clicar. Alt + P pausa os cliques; Escape desliga a câmera.</p>
      <div className="a11y-face-actions">
        <button className="astro-action" onClick={togglePause} disabled={status === 'starting' || status === 'calibrating'} data-face-resume={status === 'paused' ? '' : undefined} aria-keyshortcuts="Alt+P" type="button">{status === 'paused' ? 'Retomar' : 'Pausar cliques'}</button>
        <button className="astro-modal-cancel" onClick={calibrate} disabled={status === 'starting' || status === 'calibrating'} type="button">Recalibrar</button>
        <button className="a11y-face-stop" onClick={stop} type="button">Parar câmera</button>
      </div>
    </aside>
    <div aria-hidden="true" className="a11y-face-cursor" ref={attachCursor} />
  </>, dialog ?? document.body)
}

export default FaceNavigationOverlay
