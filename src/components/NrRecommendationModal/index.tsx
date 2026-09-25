import AppModal from '../AppModal'

interface NrRecommendationModalProps {
  description: string
  onClose: () => void
  title: string
}

function NrRecommendationModal({ description, onClose, title }: NrRecommendationModalProps) {
  return (
    <AppModal className="nrs-recommendation-modal" onClose={onClose} title={title}>
      <p className="nrs-recommendation-description">{description}</p>
    </AppModal>
  )
}

export default NrRecommendationModal
