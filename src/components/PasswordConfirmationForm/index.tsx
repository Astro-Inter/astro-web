import { useState } from 'react'
import PasswordField from '../PasswordField'
import PurpleButton from '../PurpleButton'

interface PasswordConfirmationFormProps {
  confirmLabel?: string
  danger?: boolean
  onCancel: () => void
  onContinue: () => void
}

function PasswordConfirmationForm({ confirmLabel = 'Continuar', danger = false, onCancel, onContinue }: PasswordConfirmationFormProps) {
  const [form, setForm] = useState({ password: '', visible: false })
  return (
    <form noValidate onSubmit={event => {
      event.preventDefault()
      // Etapa visual mockada: não verifica nem armazena credenciais.
      setForm({ password: '', visible: false })
      onContinue()
    }}>
      <PasswordField autoComplete="off" id="settings-current-password" label="Senha" onChange={password => setForm(current => ({ ...current, password }))} onToggleVisibility={() => setForm(current => ({ ...current, visible: !current.visible }))} placeholder="Insira a senha" value={form.password} visible={form.visible} />
      <div className="astro-modal-actions">
        <button className="astro-modal-cancel" onClick={onCancel} type="button">Cancelar</button>
        <PurpleButton type="submit" variant={danger ? 'danger' : 'solid'}>{confirmLabel}</PurpleButton>
      </div>
    </form>
  )
}

export default PasswordConfirmationForm
