import { BUTTONS } from '../../gtm/buttons'
import AstroIcon from '../astroIcon'

interface NotificationButtonProps {
  onClick: () => void
  expanded: boolean
}

function NotificationButton({ onClick, expanded }: NotificationButtonProps) {
  return (
    <button data-track-action={BUTTONS.comuns.notificacao} aria-expanded={expanded} aria-haspopup="dialog" aria-label="Notificações" className="notification-button" onClick={onClick} type="button">
      <AstroIcon name="bell" />
    </button>
  )
}

export default NotificationButton
