import { BUTTONS } from '../../gtm/buttons'
function HelpLink() {
  return (
    <a data-track-action={BUTTONS.comuns.ajuda} className="help-link" href="#support">
      <span aria-hidden="true" className="help-icon" />
      <span>Precisa de ajuda</span>
    </a>
  )
}

export default HelpLink
