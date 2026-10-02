import AstroIcon from '../AstroIcon'

interface NotificationButtonProps {
  onClick: () => void
}

function NotificationButton({ onClick }: NotificationButtonProps) {
  return (
    <button aria-haspopup="dialog" aria-label="Notificações" className="notification-button" onClick={onClick} type="button">
      <AstroIcon name="bell" />
    </button>
  )
}

export default NotificationButton
