import { useRef, useState } from 'react'
import type { WorkspaceSettingsSection } from '../../types/workspaceSettings'
import AppModal from '../AppModal'
import PasswordField from '../PasswordField'
import PurpleButton from '../PurpleButton'

interface WorkspaceSettingsPasswordModalProps {
  section: WorkspaceSettingsSection
  onCancel: () => void
  onContinue: () => void
}

const screenNumbers: Record<WorkspaceSettingsSection, number> = { company: 1, spreadsheet: 2, addresses: 3, payments: 4 }

function WorkspaceSettingsPasswordModal({ section, onCancel, onContinue }: WorkspaceSettingsPasswordModalProps) {
  const [form, setForm] = useState({ password: '', visible: false })
  const continuingRef = useRef(false)
  return (
    <AppModal
      className={`workspace-password-modal textPasswotdSettings${screenNumbers[section]}ModalWeb`}
      onClose={() => continuingRef.current ? onContinue() : onCancel()}
      preservePageScroll
      title="Digite sua senha atual para poder continuar"
    >
      {dismiss => (
        <form noValidate onSubmit={event => {
          event.preventDefault()
          // Fluxo visual mockado: não verifica nem armazena credenciais.
          continuingRef.current = true
          setForm({ password: '', visible: false })
          dismiss()
        }}>
          <PasswordField
            autoComplete="off"
            id="workspace-settings-password"
            label="Senha"
            onChange={password => setForm(current => ({ ...current, password }))}
            onToggleVisibility={() => setForm(current => ({ ...current, visible: !current.visible }))}
            placeholder="Insira a senha"
            value={form.password}
            visible={form.visible}
          />
          <div className="astro-modal-actions">
            <button className="astro-modal-cancel" onClick={dismiss} type="button">Cancelar</button>
            <PurpleButton type="submit">Continuar</PurpleButton>
          </div>
        </form>
      )}
    </AppModal>
  )
}

export default WorkspaceSettingsPasswordModal
