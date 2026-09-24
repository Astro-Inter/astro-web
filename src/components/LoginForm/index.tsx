import { useState } from 'react'
import { Link } from 'react-router-dom'
import { blockEmailWhitespaceInput, blockEmailWhitespaceKey, sanitizeEmail } from '../../utils/inputFormatting'
import FormField from '../FormField'
import PageHeading from '../PageHeading'
import PasswordField from '../PasswordField'
import PurpleButton from '../PurpleButton'

function LoginForm() {
  const [credentials, setCredentials] = useState({ email: '', password: '', passwordVisible: false })

  return (
    <>
      <PageHeading description="Acesse sua conta para continuar." title="Acesse sua conta" titleId="login-title" />

      <form className="login-form" onSubmit={(event) => event.preventDefault()}>
        <FormField
            autoComplete="email"
            id="email"
            label="Email"
            maxLength={254}
            name="email"
            onBeforeInput={blockEmailWhitespaceInput}
            onChange={(event) => setCredentials((current) => ({ ...current, email: sanitizeEmail(event.target.value) }))}
            onKeyDown={blockEmailWhitespaceKey}
            placeholder="example@email.com"
            type="email"
            value={credentials.email}
          />

        <PasswordField
            autoComplete="current-password"
            id="password"
            label="Senha"
            onChange={(value) => setCredentials((current) => ({ ...current, password: value }))}
            onToggleVisibility={() => setCredentials((current) => ({ ...current, passwordVisible: !current.passwordVisible }))}
            placeholder="Inserir Senha"
            value={credentials.password}
            visible={credentials.passwordVisible}
          />

        <a className="forgot-link" href="#forgot-password">
          Esqueceu a senha?
        </a>

        <PurpleButton className="astro-form-action" type="submit">Entrar</PurpleButton>
      </form>

      <p className="workspace-link">
        Não tem uma conta?{' '}
        <Link to="/paymentMethod">Criar workspace</Link>
      </p>
    </>
  )
}

export default LoginForm
