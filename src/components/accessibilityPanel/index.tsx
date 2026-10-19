import AppModal from '../appModal'
import AccessibilitySettings from '../accessibilitySettings'
import { useAccessibility } from '../../hooks/useAccessibility'

function AccessibilityPanel() {
  const { closePanel } = useAccessibility()
  return <AppModal className="a11y-panel" onClose={closePanel} title="Acessibilidade">
    {dismiss => <AccessibilitySettings onDone={dismiss} />}
  </AppModal>
}

export default AccessibilityPanel
