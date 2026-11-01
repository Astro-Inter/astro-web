import { createPortal } from 'react-dom'
import { useId, useState } from 'react'
import type { FaceNavigationController } from '../../hooks/useFaceNavigation'
import { useTopDialog } from '../../hooks/useTopDialog'
import AstroIcon from '../astroIcon'

interface FaceNavigationOverlayProps { face: FaceNavigationController }

function FaceNavigationOverlay({ face }: FaceNavigationOverlayProps) {
  const { status, message, calibrate, togglePause, stop, attachPreview, attachCursor } = face
  const dialog = useTopDialog()
  const [collapsed, setCollapsed] = useState(false)
  const controlsId = useId()
  if (status === 'idle' || status === 'error') return null
  return createPortal(<>
    <aside className={`a11y-face-panel${collapsed ? ' a11y-face-panel--collapsed' : ''}`} aria-label="Controles da navegação facial">
      <button className="a11y-face-panel-toggle" aria-controls={controlsId} aria-expanded={!collapsed} aria-label={collapsed ? 'Abrir controles da navegação facial' : 'Recolher controles da navegação facial'} data-face-resume="" onClick={() => setCollapsed(current => !current)} type="button"><span>Navegação facial</span><AstroIcon name="chevron-down" /></button>
      <div className="a11y-face-panel-body" id={controlsId} inert={collapsed} aria-hidden={collapsed}>
      <div className="a11y-face-panel-content">
      <div className="a11y-face-header">
        <div className="a11y-face-preview" ref={attachPreview} />
        <div className="a11y-face-copy"><p role="status">{status === 'starting' && <span className="a11y-loading-spinner" aria-hidden="true" />}{message}</p></div>
      </div>
      <p className="a11y-face-help">Mantenha a mira parada para clicar. Alt + P pausa os cliques; Escape desliga a câmera.</p>
      <div className="a11y-face-actions">
        <button className="astro-action" onClick={togglePause} disabled={status === 'starting' || status === 'calibrating'} data-face-resume={status === 'paused' ? '' : undefined} aria-keyshortcuts="Alt+P" type="button">{status === 'paused' ? 'Retomar' : 'Pausar cliques'}</button>
        <button className="astro-modal-cancel" onClick={calibrate} disabled={status === 'starting' || status === 'calibrating'} type="button">Recalibrar</button>
        <button className="a11y-face-stop" onClick={stop} type="button">Parar câmera</button>
      </div>
      </div>
      </div>
    </aside>
    <div aria-hidden="true" className="a11y-face-cursor" ref={attachCursor} />
  </>, dialog ?? document.body)
}

export default FaceNavigationOverlay
