import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { WorkspaceSettingsNavigationState } from '../../types/workspaceSettings'
import AstroIcon from '../astroIcon'
import ConfirmationModal from '../confirmationModal'

interface WorkspaceSettingsBackButtonProps {
  screen: 'backCompanyModalWeb' | 'backExcelModalWeb' | 'backAdressesModalWeb' | 'backPaymentsModalWeb'
}

function WorkspaceSettingsBackButton({ screen }: WorkspaceSettingsBackButtonProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as WorkspaceSettingsNavigationState | null)?.from
  const [confirming, setConfirming] = useState(false)
  return (
    <>
      <button aria-haspopup="dialog" aria-label="Voltar para configurações" className="payment-back-button workspace-settings-back" onClick={() => setConfirming(true)} type="button">
        <AstroIcon name="back" />
      </button>
      {confirming && (
        <ConfirmationModal
          backdrop="dimmed"
          className={`create-forms-exit-modal ${screen}`}
          confirmLabel="Sair"
          icon={<span aria-hidden="true" className="position-deactivation-icon"><AstroIcon name="warning" /></span>}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            navigate('/mainWorkspaceSettingsScreen', { state: { from } })
            return null
          }}
          onConfirmed={() => null}
          preservePageScroll
          title="Tem certeza de que deseja sair? As alterações não serão salvas."
          tone="danger"
        />
      )}
    </>
  )
}

export default WorkspaceSettingsBackButton
