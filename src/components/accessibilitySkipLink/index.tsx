import { useAuthentication } from '../../hooks/useAuthentication'
import { useTopDialog } from '../../hooks/useTopDialog'
import { focusMainContent } from '../../utils/accessibility'

function AccessibilitySkipLink() {
  const dialog = useTopDialog()
  const { user, status } = useAuthentication()
  return dialog || !user || status !== 'ready' ? null : <a className="a11y-skip-link" href="#conteudo-principal" onClick={event => { event.preventDefault(); focusMainContent() }}>Pular para o conteúdo principal</a>
}

export default AccessibilitySkipLink
