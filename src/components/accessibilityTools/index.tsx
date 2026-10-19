import { useAccessibility } from '../../hooks/useAccessibility'
import { useAccessibilityRuntime } from '../../hooks/useAccessibilityRuntime'
import { useAuthentication } from '../../hooks/useAuthentication'
import AccessibilityPanel from '../accessibilityPanel'
import ReadingGuide from '../readingGuide'
import FaceNavigationOverlay from '../faceNavigationOverlay'

function AccessibilityTools() {
  const { preferences, panelOpen, openPanel } = useAccessibility()
  const { face } = useAccessibilityRuntime()
  const { user, status } = useAuthentication()
  if (!user || status !== 'ready') return null
  return <>
    {panelOpen && <AccessibilityPanel />}
    {preferences.readingGuide && <ReadingGuide />}
    <FaceNavigationOverlay face={face} />
    {face.error && !panelOpen && <div className="a11y-global-error" role="alert">{face.error}<button onClick={openPanel} type="button">Abrir acessibilidade</button><button onClick={face.stop} type="button">Fechar aviso</button></div>}
  </>
}

export default AccessibilityTools
