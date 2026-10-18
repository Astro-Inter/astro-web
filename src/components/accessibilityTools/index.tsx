import { createPortal } from 'react-dom'
import { useAccessibility } from '../../hooks/useAccessibility'
import { useAccessibilityRuntime } from '../../hooks/useAccessibilityRuntime'
import { useAuthentication } from '../../hooks/useAuthentication'
import { useTopDialog } from '../../hooks/useTopDialog'
import AccessibilityPanel from '../accessibilityPanel'
import ReadingGuide from '../readingGuide'
import FaceNavigationOverlay from '../faceNavigationOverlay'

function AccessibilityTools() {
  const { preferences, panelOpen, openPanel } = useAccessibility()
  const { face } = useAccessibilityRuntime()
  const { user, status } = useAuthentication()
  const dialog = useTopDialog()
  return <>
    {!panelOpen && !user && status === 'ready' && createPortal(<button className="a11y-public-link" aria-label="Abrir acessibilidade" aria-haspopup="dialog" aria-keyshortcuts="Alt+A" onClick={openPanel} type="button">
      Acessibilidade
    </button>, dialog ?? document.body)}
    {panelOpen && <AccessibilityPanel />}
    {preferences.readingGuide && <ReadingGuide />}
    <FaceNavigationOverlay face={face} />
    {face.error && !panelOpen && <div className="a11y-global-error" role="alert">{face.error}<button onClick={openPanel} type="button">Abrir acessibilidade</button><button onClick={face.stop} type="button">Fechar aviso</button></div>}
  </>
}

export default AccessibilityTools
