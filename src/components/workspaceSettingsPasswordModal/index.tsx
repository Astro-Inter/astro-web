import type { WorkspaceSettingsSection } from '../../types/workspaceSettings'
import PasswordConfirmationModal from '../passwordConfirmationModal'

interface WorkspaceSettingsPasswordModalProps {
  section: WorkspaceSettingsSection
  onCancel: () => void
  onContinue: () => void
}

const screenNumbers: Record<WorkspaceSettingsSection, number> = { company: 1, spreadsheet: 2, addresses: 3, payments: 4 }

function WorkspaceSettingsPasswordModal({ section, onCancel, onContinue }: WorkspaceSettingsPasswordModalProps) {
  return (
    <PasswordConfirmationModal className={`textPasswotdSettings${screenNumbers[section]}ModalWeb`} onCancel={onCancel} onContinue={onContinue} />
  )
}

export default WorkspaceSettingsPasswordModal
