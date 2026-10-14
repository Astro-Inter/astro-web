import { DIALOG_NAMES } from '../../gtm/dialogs'
import AppModal from '../appModal'

interface RegulatoryStandardRecommendationModalProps {
  description: string
  onClose: () => void
  title: string
}

function RegulatoryStandardRecommendationModal({ description, onClose, title }: RegulatoryStandardRecommendationModalProps) {
  return (
    <AppModal trackingName={DIALOG_NAMES.informacoes_nr} backdrop="transparent" className="nrs-recommendation-modal" onClose={onClose} title={title}>
      <p className="nrs-recommendation-description">{description}</p>
    </AppModal>
  )
}

export default RegulatoryStandardRecommendationModal
