import ActionNotice from '../actionNotice'
import { BUTTONS } from '../../gtm/buttons'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { LoginCredentials, LoginFieldErrors, LoginStatus } from '../../types/authentication'
import EmailField from '../emailField'
import PageHeading from '../pageHeading'
import PasswordField from '../passwordField'
import PurpleButton from '../purpleButton'

interface LoginFormProps {
  credentials: LoginCredentials
  errors: LoginFieldErrors
  status: LoginStatus
  message: string
  invalidCredentials: boolean
  onCredentialChange: (field: keyof LoginCredentials, value: string) => void
  onSubmit: () => Promise<void>
}

function LoginForm({ credentials, errors, status, message, invalidCredentials, onCredentialChange, onSubmit }: LoginFormProps) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const pending = status === 'loading' || status === 'success'

  return (
    <>
      <PageHeading description="Acesse sua conta para continuar." title="Acesse sua conta" titleId="login-title" />

      <form data-track-submit={BUTTONS.comuns.enviar} aria-busy={status === 'loading'} className="login-form" noValidate onSubmit={(event) => {
        event.preventDefault()
        if (!pending) void onSubmit()
      }}>
        <EmailField id="email" label="Email" placeholder="example@email.com" value={credentials.email}
          onChange={value => onCredentialChange('email', value)} error={errors.email} invalid={invalidCredentials}
          describedBy={invalidCredentials ? 'password-error' : undefined} disabled={pending} required />
        <PasswordField
          autoComplete="current-password"
          disabled={pending}
          error={errors.password || (invalidCredentials ? message : undefined)}
          invalid={invalidCredentials}
          id="password"
          label="Senha"
          onChange={(value) => onCredentialChange('password', value)}
          onToggleVisibility={() => setPasswordVisible((current) => !current)}
          placeholder="Inserir Senha"
          required
          value={credentials.password}
          visible={passwordVisible}
        />

        {status === 'error' && message && !invalidCredentials && <p className="login-authentication-error" id="login-authentication-error" role="alert">{message}</p>}

        <a data-track-action={BUTTONS.comuns.esqueceu_senha} className="forgot-link" href="#forgot-password">
          Esqueceu a senha?
        </a>

        <PurpleButton data-track-action={BUTTONS.comuns.enviar} className="astro-form-action" disabled={pending} type="submit">
          {status === 'success' ? 'Login realizado' : 'Entrar'}
        </PurpleButton>
        <ActionNotice message={status === 'success' ? message : undefined} />
      </form>

      <p className="workspace-link">
        Não tem uma conta?{' '}
        <Link data-track-action={BUTTONS.comuns.criar_workspace} to="/paymentMethod">Criar workspace</Link>
      </p>
    </>
  )
}

export default LoginForm
