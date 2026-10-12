import { useState } from 'react'
import PasswordField from '../passwordField'
import PageHeading from '../pageHeading'
import PurpleButton from '../purpleButton'
import { validateRegistrationPasswordFields } from '../../utils/workspaceRegistration'

interface PasswordValues {
  password: string
  confirmation: string
}

interface PasswordVisibility {
  password: boolean
  confirmation: boolean
}

interface CreatePasswordFormProps {
  onContinue: (password: string) => void
  initialPassword?: string
}

function CreatePasswordForm({ onContinue, initialPassword = '' }: CreatePasswordFormProps) {
  const [values, setValues] = useState<PasswordValues>({ password: initialPassword, confirmation: initialPassword })
  const [errors, setErrors] = useState<{ password?: string; confirmation?: string }>({})
  const [visible, setVisible] = useState<PasswordVisibility>({ password: false, confirmation: false })

  function updateValue(field: keyof PasswordValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: undefined, ...(field === 'password' ? { confirmation: undefined } : {}) }))
  }

  function toggleVisibility(field: keyof PasswordVisibility) {
    setVisible((current) => ({ ...current, [field]: !current[field] }))
  }

  return (
    <>
      <PageHeading description="Defina sua senha de acesso." title="Crie sua senha" titleId="create-password-title" />

      <form autoComplete="off" className="create-password-form" onSubmit={(event) => {
        event.preventDefault()
        const nextErrors = validateRegistrationPasswordFields(values.password, values.confirmation)
        setErrors(nextErrors)
        if (!Object.keys(nextErrors).length) onContinue(values.password)
      }} noValidate>
        <PasswordField
          id="new-password"
          autoComplete="new-password"
          required
          label="Senha"
          error={errors.password}
          onChange={(value) => updateValue('password', value)}
          onToggleVisibility={() => toggleVisibility('password')}
          placeholder="Digite sua senha"
          value={values.password}
          visible={visible.password}
        />
        <PasswordField
          id="confirm-password"
          autoComplete="new-password"
          required
          error={errors.confirmation}
          label="Confirmar senha"
          onChange={(value) => updateValue('confirmation', value)}
          onToggleVisibility={() => toggleVisibility('confirmation')}
          placeholder="Confirme sua senha"
          value={values.confirmation}
          visible={visible.confirmation}
        />

        <PurpleButton className="astro-form-action" type="submit">Continuar</PurpleButton>
      </form>
    </>
  )
}

export default CreatePasswordForm
