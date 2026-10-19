import { useState } from 'react'
import type { PasswordRecoveryErrors, PasswordRecoveryValues } from '../../types/passwordRecovery'
import EmailField from '../emailField'
import PasswordField from '../passwordField'
import PageHeading from '../pageHeading'
import PurpleButton from '../purpleButton'

interface PasswordRecoveryFormProps {
  mode: 'request' | 'replace'
  values: PasswordRecoveryValues
  errors: PasswordRecoveryErrors
  pending: boolean
  onChange: (field: keyof PasswordRecoveryValues, value: string) => void
  onSubmit: () => Promise<void>
}

function PasswordRecoveryForm({ mode, values, errors, pending, onChange, onSubmit }: PasswordRecoveryFormProps) {
  const [visible, setVisible] = useState({ password: false, confirmation: false })
  const replacing = mode === 'replace'
  return <>
    <PageHeading title={replacing ? 'Substitua sua senha' : 'Esqueceu sua senha?'} titleId={replacing ? 'replace-password-title' : 'forgot-password-title'}
      description={replacing ? 'Defina sua nova senha de acesso.' : 'Enviaremos um link por e-mail.'} />
    <form className="create-password-form password-recovery-form" noValidate aria-busy={pending} onSubmit={event => { event.preventDefault(); if (!pending) void onSubmit() }}>
      <fieldset className="password-recovery-fields" disabled={pending}>
        <legend className="sr-only">{replacing ? 'Nova senha' : 'E-mail de recuperação'}</legend>
        {!replacing ? <EmailField id="recovery-email" label="E-mail" placeholder="example@email.com" value={values.email} error={errors.email} disabled={pending} required onChange={value => onChange('email', value)} /> : <>
          <PasswordField id="recovery-password" autoComplete="new-password" label="Nova senha" placeholder="Digite sua nova senha" value={values.password} error={errors.password} visible={visible.password} required disabled={pending} onChange={value => onChange('password', value)} onToggleVisibility={() => setVisible(current => ({ ...current, password: !current.password }))} />
          <PasswordField id="recovery-confirmation" autoComplete="new-password" label="Confirmar senha" placeholder="Confirme sua nova senha" value={values.confirmation} error={errors.confirmation} visible={visible.confirmation} required disabled={pending} onChange={value => onChange('confirmation', value)} onToggleVisibility={() => setVisible(current => ({ ...current, confirmation: !current.confirmation }))} />
        </>}
      </fieldset>
      {errors.form && <p className="login-field-error" role="alert">{errors.form}</p>}
      <PurpleButton className="astro-form-action" disabled={pending} type="submit">{replacing ? 'Alterar senha' : 'Enviar e-mail'}</PurpleButton>
    </form>
  </>
}

export default PasswordRecoveryForm
