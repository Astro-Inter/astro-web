import { BUTTONS } from '../../gtm/buttons'
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
  const [submitted, setSubmitted] = useState(false)
  const error = errors.confirmation ?? errors.password

  function updateValue(field: keyof PasswordValues, value: string) {
    const nextValues = { ...values, [field]: value }
    setValues(nextValues)
    if (submitted) setErrors(validateRegistrationPasswordFields(nextValues.password, nextValues.confirmation))
  }

  function toggleVisibility(field: keyof PasswordVisibility) {
    setVisible((current) => ({ ...current, [field]: !current[field] }))
  }

  return (
    <>
      <PageHeading description="Defina sua senha de acesso." title="Crie sua senha" titleId="create-password-title" />

      <form data-track-submit={BUTTONS.comuns.continuar} autoComplete="off" className="create-password-form" onSubmit={(event) => {
        event.preventDefault()
        setSubmitted(true)
        const nextErrors = validateRegistrationPasswordFields(values.password, values.confirmation)
        setErrors(nextErrors)
        if (!Object.keys(nextErrors).length) onContinue(values.password)
      }} noValidate>
        <PasswordField
          id="new-password"
          autoComplete="off"
          required
          label="Senha"
          invalid={Boolean(error)}
          describedBy={error ? 'confirm-password-error' : undefined}
          onChange={(value) => updateValue('password', value)}
          onToggleVisibility={() => toggleVisibility('password')}
          placeholder="Digite sua senha"
          value={values.password}
          visible={visible.password}
        />
        <PasswordField
          id="confirm-password"
          autoComplete="off"
          required
          error={error}
          invalid={Boolean(error)}
          label="Confirmar senha"
          onChange={(value) => updateValue('confirmation', value)}
          onToggleVisibility={() => toggleVisibility('confirmation')}
          placeholder="Confirme sua senha"
          value={values.confirmation}
          visible={visible.confirmation}
        />

        <PurpleButton data-track-action={BUTTONS.comuns.continuar} className="astro-form-action" type="submit">Continuar</PurpleButton>
      </form>
    </>
  )
}

export default CreatePasswordForm
