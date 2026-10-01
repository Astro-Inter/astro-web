import AstroIcon from '../AstroIcon'
import PurpleButton from '../PurpleButton'
import type { QuickAction } from '../../types/home'

interface QuickActionCardProps {
  action: QuickAction
  onSelect?: () => void
}

function QuickActionCard({ action, onSelect }: QuickActionCardProps) {
  return (
    <article aria-labelledby={`quick-action-${action.id}`} className="home-card quick-action">
      <div className="quick-action-heading">
        <span aria-hidden="true" className={`quick-action-icon quick-action-icon--${action.color}`}><AstroIcon name={action.icon} /></span>
        <div className="quick-action-copy">
          <h3 id={`quick-action-${action.id}`}>{action.title}</h3>
          <p>{action.description}</p>
        </div>
      </div>
      <PurpleButton
        aria-disabled={onSelect ? undefined : true}
        className="quick-action-button"
        onClick={onSelect}
        title={onSelect ? undefined : 'Em breve'}
      >
        <AstroIcon name="plus" />
        {action.actionLabel}
      </PurpleButton>
    </article>
  )
}

export default QuickActionCard
