import { useState } from 'react'
import PasswordField from '../PasswordField'
import PageHeading from '../PageHeading'
import PurpleButton from '../PurpleButton'

interface PasswordValues {
  password: string
  confirmation: string
}

interface PasswordVisibility {
  password: boolean
  confirmation: boolean
}

interface CreatePasswordFormProps {
  onContinue: () => void
}

function CreatePasswordForm({ onContinue }: CreatePasswordFormProps) {
  const [values, setValues] = useState<PasswordValues>({ password: '', confirmation: '' })
  const [visible, setVisible] = useState<PasswordVisibility>({ password: false, confirmation: false })

  function updateValue(field: keyof PasswordValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function toggleVisibility(field: keyof PasswordVisibility) {
    setVisible((current) => ({ ...current, [field]: !current[field] }))
  }

  return (
    <>
      <PageHeading description="Defina sua senha de acesso." title="Crie sua senha" titleId="create-password-title" />

      <form autoComplete="off" className="create-password-form" onSubmit={(event) => { event.preventDefault(); onContinue() }} noValidate>
        <PasswordField
          id="new-password"
          label="Senha"
          onChange={(value) => updateValue('password', value)}
          onToggleVisibility={() => toggleVisibility('password')}
          placeholder="Digite sua senha"
          value={values.password}
          visible={visible.password}
        />
        <PasswordField
          id="confirm-password"
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
