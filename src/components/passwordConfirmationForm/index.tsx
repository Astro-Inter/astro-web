import ActionLoading from '../actionLoading'
import { BUTTONS, confirmationAction } from '../../gtm/buttons'
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
    <form data-track-submit={confirmationAction(confirmLabel)} aria-busy={confirmation.status === 'loading'} noValidate onSubmit={event => {
      event.preventDefault()
      if (!confirmation.blocked) void onContinue()
    }}>
      <PasswordField autoComplete="off" disabled={confirmation.blocked} error={confirmation.error} id={passwordId} label="Senha" onChange={confirmation.updatePassword} onToggleVisibility={confirmation.toggleVisibility} placeholder="Insira a senha" required value={confirmation.password} visible={confirmation.visible} />
      <ActionLoading active={confirmation.status === 'loading'} />
      <div className="astro-modal-actions">
        <button data-track-action={BUTTONS.comuns.cancelar} className="astro-modal-cancel" disabled={confirmation.status === 'success'} onClick={onCancel} type="button">Cancelar</button>
        <PurpleButton data-track-action={confirmationAction(confirmLabel)} disabled={confirmation.blocked} type="submit" variant={danger ? 'danger' : 'solid'}>{confirmLabel}</PurpleButton>
      </div>
    </form>
  )
}

export default PasswordConfirmationForm
