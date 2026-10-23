import { DIALOG_NAMES } from '../../gtm/dialogs'
import { useLocation, useNavigate } from 'react-router-dom'
import type { WorkspaceSettingsNavigationState, WorkspaceSettingsSection } from '../../types/workspaceSettings'
import ConfirmationModal from '../confirmationModal'

interface WorkspaceSettingsSaveModalProps {
  section: WorkspaceSettingsSection
  onCancel: () => void
  onSave?: () => Promise<string | null>
  onSaved?: () => void
}

const screens: Record<WorkspaceSettingsSection, { name: string; title: string }> = {
  company: { name: 'includeCompanyInformationConfirmationModalWeb', title: 'Deseja salvar as alterações dos dados da empresa?' },
  spreadsheet: { name: 'attachExcelFileConfirmationModalWeb', title: 'Deseja salvar as adições destes colaboradores?' },
  addresses: { name: 'setAddressConfirmationModalWeb', title: 'Deseja salvar as alterações destes endereços?' },
  payments: { name: 'paymentSettingsConfirmationModalWeb', title: 'Deseja salvar as alterações de pagamento?' },
}

function WorkspaceSettingsSaveModal({ section, onCancel, onSave, onSaved }: WorkspaceSettingsSaveModalProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as WorkspaceSettingsNavigationState | null)?.from

  return (
    <ConfirmationModal trackingName={({ company: DIALOG_NAMES.confirmar_alteracoes_dados_empresa, spreadsheet: DIALOG_NAMES.confirmar_adicao_colaboradores, addresses: DIALOG_NAMES.confirmar_alteracoes_endereco, payments: DIALOG_NAMES.confirmar_alteracoes_pagamento })[section]}
      backdrop="dimmed"
      className={screens[section].name}
      confirmLabel="Salvar"
      onCancel={onCancel}
      onConfirm={async () => {
        if (onSave) return await onSave()
        navigate('/mainWorkspaceSettingsScreen', { state: { from, savedSection: section } })
        return null
      }}
      onConfirmed={() => {
        if (onSaved) { onSaved(); return }
        if (onSave) navigate('/mainWorkspaceSettingsScreen', { state: { from, savedSection: section } })
      }}
      preservePageScroll
      title={screens[section].title}
    />
  )
}

export default WorkspaceSettingsSaveModal
