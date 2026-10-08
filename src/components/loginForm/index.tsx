import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { LoginCredentials, LoginFieldErrors, LoginStatus } from '../../types/authentication'
import { blockEmailWhitespaceInput, blockEmailWhitespaceKey, sanitizeEmail } from '../../utils/inputFormatting'
import FormField from '../formField'
import PageHeading from '../pageHeading'
import PasswordField from '../passwordField'
import PurpleButton from '../purpleButton'

interface LoginFormProps {
  credentials: LoginCredentials
  errors: LoginFieldErrors
  status: LoginStatus
  message: string
  onCredentialChange: (field: keyof LoginCredentials, value: string) => void
  onSubmit: () => Promise<void>
}

function LoginForm({ credentials, errors, status, message, onCredentialChange, onSubmit }: LoginFormProps) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const pending = status === 'loading' || status === 'success'

  return (
    <>
      <PageHeading description="Acesse sua conta para continuar." title="Acesse sua conta" titleId="login-title" />

      <form aria-busy={status === 'loading'} className="login-form" noValidate onSubmit={(event) => {
        event.preventDefault()
        if (!pending) void onSubmit()
      }}>
        <div>
          <FormField
            aria-describedby={errors.email ? 'email-error' : undefined}
            aria-invalid={Boolean(errors.email)}
            autoComplete="email"
            disabled={pending}
            id="email"
            label="Email"
            maxLength={254}
            name="email"
            onBeforeInput={blockEmailWhitespaceInput}
            onChange={(event) => onCredentialChange('email', sanitizeEmail(event.target.value))}
            onKeyDown={blockEmailWhitespaceKey}
            placeholder="example@email.com"
            required
            type="email"
            value={credentials.email}
          />
          {errors.email && <p className="login-field-error" id="email-error" role="alert">{errors.email}</p>}
        </div>

        <PasswordField
          autoComplete="current-password"
          disabled={pending}
          error={errors.password}
          id="password"
          label="Senha"
          onChange={(value) => onCredentialChange('password', value)}
          onToggleVisibility={() => setPasswordVisible((current) => !current)}
          placeholder="Inserir Senha"
          required
          value={credentials.password}
          visible={passwordVisible}
        />

        <a className="forgot-link" href="#forgot-password">
          Esqueceu a senha?
        </a>

        <PurpleButton className="astro-form-action" disabled={pending} type="submit">
          {status === 'loading' ? 'Entrando…' : status === 'success' ? 'Login realizado' : 'Entrar'}
        </PurpleButton>
        {status === 'loading' && <p className="login-feedback" role="status">Verificando suas credenciais…</p>}
        {message && <p className={`login-feedback${status === 'error' ? ' login-field-error' : ''}`} role={status === 'error' ? 'alert' : 'status'}>{message}</p>}
      </form>

      <p className="workspace-link">
        Não tem uma conta?{' '}
        <Link to="/paymentMethod">Criar workspace</Link>
      </p>
    </>
  )
}

export default LoginForm
