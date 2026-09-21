import { useState } from 'react'
import PasswordField from '../PasswordField'

interface PasswordValues {
  password: string
  confirmation: string
}

interface PasswordVisibility {
  password: boolean
  confirmation: boolean
}

function CreatePasswordForm() {
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
      <header className="login-heading">
        <h1 id="create-password-title">Crie sua senha</h1>
        <p>Defina sua senha de acesso.</p>
      </header>

      <form autoComplete="off" className="create-password-form" onSubmit={(event) => event.preventDefault()} noValidate>
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

        <button type="submit">Continuar</button>
      </form>
    </>
  )
}

export default CreatePasswordForm
