import { useLocation, useNavigate } from 'react-router-dom'
import type { WorkspaceSettingsNavigationState, WorkspaceSettingsSection } from '../../types/workspaceSettings'
import ConfirmationModal from '../ConfirmationModal'

interface WorkspaceSettingsSaveModalProps {
  section: WorkspaceSettingsSection
  onCancel: () => void
}

const screens: Record<WorkspaceSettingsSection, { name: string; title: string }> = {
  company: { name: 'includeCompanyInformationConfirmationModalWeb', title: 'Deseja salvar as alterações dos dados da empresa?' },
  spreadsheet: { name: 'attachExcelFileConfirmationModalWeb', title: 'Deseja salvar as adições destes colaboradores?' },
  addresses: { name: 'setAddressConfirmationModalWeb', title: 'Deseja salvar as alterações destes endereços?' },
  payments: { name: 'paymentSettingsConfirmationModalWeb', title: 'Deseja salvar as alterações de pagamento?' },
}

function WorkspaceSettingsSaveModal({ section, onCancel }: WorkspaceSettingsSaveModalProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as WorkspaceSettingsNavigationState | null)?.from

  return (
    <ConfirmationModal
      backdrop="dimmed"
      className={screens[section].name}
      confirmLabel="Salvar"
      onCancel={onCancel}
      onConfirm={() => {
        navigate('/mainWorkspaceSettingsScreen', { state: { from, savedSection: section } })
        return null
      }}
      onConfirmed={() => null}
      preservePageScroll
      title={screens[section].title}
    />
  )
}

export default WorkspaceSettingsSaveModal
