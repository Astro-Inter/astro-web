import AppModal from '../appModal'
import AstroIcon from '../astroIcon'
import { notificationKindAppearance } from '../../data/notifications'
import type { AppNotification } from '../../types/notification'

interface NotificationModalProps {
  notifications: readonly AppNotification[]
  onClose: () => void
}

function NotificationModal({ notifications, onClose }: NotificationModalProps) {
  return (
    <AppModal className="notification-modal" onClose={onClose} title="Notificações">
      {(dismiss) => <>
        <p className="notification-modal-subtitle">Acompanhe os últimos avisos da sua empresa</p>

        {notifications.length > 0 ? (
          <ul aria-label="Últimas notificações" className="notification-list">
            {notifications.map((notification) => {
              const appearance = notificationKindAppearance[notification.kind]
              return (
                <li className="notification-item" key={notification.id}>
                  <span aria-hidden="true" className={`notification-item-icon notification-item-icon--${appearance.color}`}><AstroIcon name={appearance.icon} /></span>
                  <div className="notification-item-copy">
                    <h3>{notification.title}</h3>
                    <p>{notification.description}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="notification-empty" role="status">Nenhuma notificação por enquanto.</p>
        )}

        <div className="astro-modal-actions">
          <button
            className="astro-modal-cancel"
            onClick={dismiss}
            onKeyDown={(event) => {
              // É o único controle do popup; Tab e Shift+Tab mantêm o foco nele.
              if (event.key === 'Tab') event.preventDefault()
            }}
            type="button"
          >Voltar</button>
        </div>
      </>}
    </AppModal>
  )
}

export default NotificationModal
