import { DIALOG_NAMES } from '../../gtm/dialogs'
import { BUTTONS } from '../../gtm/buttons'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { WorkspaceSettingsNavigationState } from '../../types/workspaceSettings'
import AstroIcon from '../astroIcon'
import ConfirmationModal from '../confirmationModal'

interface WorkspaceSettingsBackButtonProps {
  screen: 'backCompanyModalWeb' | 'backExcelModalWeb' | 'backAdressesModalWeb' | 'backPaymentsModalWeb'
  hasChanges?: boolean
}

function WorkspaceSettingsBackButton({ screen, hasChanges = false }: WorkspaceSettingsBackButtonProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as WorkspaceSettingsNavigationState | null)?.from
  const [confirming, setConfirming] = useState(false)
  function goBack() {
    navigate('/mainWorkspaceSettingsScreen', { state: { from } })
  }
  return (
    <>
      <button data-track-action={BUTTONS.comuns.voltar} aria-haspopup={hasChanges ? 'dialog' : undefined} aria-label="Voltar para configurações" className="payment-back-button workspace-settings-back" onClick={() => hasChanges ? setConfirming(true) : goBack()} type="button">
        <AstroIcon name="back" />
      </button>
      {confirming && (
        <ConfirmationModal trackingName={DIALOG_NAMES.descartar_alteracoes_configuracoes}
          backdrop="dimmed"
          className={`create-forms-exit-modal ${screen}`}
          confirmLabel="Sair"
          icon={<span aria-hidden="true" className="position-deactivation-icon"><AstroIcon name="warning" /></span>}
          onCancel={() => setConfirming(false)}
          onConfirm={() => null}
          onConfirmed={goBack}
          preservePageScroll
          title="Tem certeza de que deseja sair? As alterações não serão salvas."
          tone="danger"
        />
      )}
    </>
  )
}

export default WorkspaceSettingsBackButton
