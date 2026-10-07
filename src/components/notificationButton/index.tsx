import AstroIcon from '../astroIcon'

interface NotificationButtonProps {
  onClick: () => void
  expanded: boolean
}

function NotificationButton({ onClick, expanded }: NotificationButtonProps) {
  return (
    <button aria-expanded={expanded} aria-haspopup="dialog" aria-label="Notificações" className="notification-button" onClick={onClick} type="button">
      <AstroIcon name="bell" />
    </button>
  )
}

export default NotificationButton
