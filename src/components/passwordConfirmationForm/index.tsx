import { useId } from 'react'
import type { PasswordConfirmationController } from '../../types/identityConfirmation'
import PasswordField from '../passwordField'
import PurpleButton from '../purpleButton'

interface PasswordConfirmationFormProps {
  confirmation: PasswordConfirmationController
  confirmLabel?: string
  danger?: boolean
  onCancel: () => void
  onContinue: () => Promise<void>
}

function PasswordConfirmationForm({ confirmation, confirmLabel = 'Continuar', danger = false, onCancel, onContinue }: PasswordConfirmationFormProps) {
  const passwordId = useId()
  return (
    <form aria-busy={confirmation.status === 'loading'} noValidate onSubmit={event => {
      event.preventDefault()
      if (!confirmation.blocked) void onContinue()
    }}>
      <PasswordField autoComplete="off" disabled={confirmation.blocked} error={confirmation.error} id={passwordId} label="Senha" onChange={confirmation.updatePassword} onToggleVisibility={confirmation.toggleVisibility} placeholder="Insira a senha" required value={confirmation.password} visible={confirmation.visible} />
      {confirmation.status === 'loading' && <p className="password-confirmation-status" role="status">Confirmando sua identidade…</p>}
      {confirmation.status === 'success' && <p className="password-confirmation-status" role="status">Identidade confirmada.</p>}
      <div className="astro-modal-actions">
        <button className="astro-modal-cancel" disabled={confirmation.status === 'success'} onClick={onCancel} type="button">Cancelar</button>
        <PurpleButton disabled={confirmation.blocked} type="submit" variant={danger ? 'danger' : 'solid'}>{confirmation.status === 'loading' ? 'Confirmando…' : confirmLabel}</PurpleButton>
      </div>
    </form>
  )
}

export default PasswordConfirmationForm
