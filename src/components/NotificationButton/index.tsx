import AstroIcon from '../AstroIcon'

interface NotificationButtonProps {
  onClick?: () => void
  unreadCount?: number
}

function NotificationButton({ onClick, unreadCount = 0 }: NotificationButtonProps) {
  const label = unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : 'Notificações'

  return (
    <button
      aria-disabled={onClick ? undefined : true}
      aria-label={label}
      className={`notification-button${onClick ? '' : ' notification-button--unavailable'}`}
      onClick={onClick}
      title={onClick ? undefined : 'Em breve'}
      type="button"
    >
      <AstroIcon name="bell" />
      {unreadCount > 0 && <span aria-hidden="true" className="notification-button-badge" />}
    </button>
  )
}

export default NotificationButton
