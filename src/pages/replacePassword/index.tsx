import { Link, useNavigate } from 'react-router-dom'
import PasswordRecoveryForm from '../../components/passwordRecoveryForm'
import PasswordRecoveryLayout from '../../components/passwordRecoveryLayout'
import { usePasswordRecovery } from '../../hooks/usePasswordRecovery'
import { passwordResetLink } from '../../utils/passwordResetLink'

function ReplacePasswordPage() {
  const navigate = useNavigate()
  const recovery = usePasswordRecovery('', passwordResetLink.code)
  const invalid = passwordResetLink.invalid || !passwordResetLink.code
  return <PasswordRecoveryLayout titleId="replace-password-title" pending={recovery.pending}>
    {invalid ? <>
      <h1 id="replace-password-title">Solicite um novo link</h1>
      <p role="alert">O link de recuperação é inválido ou expirou. Solicite um novo.</p>
    </> : <PasswordRecoveryForm mode="replace" {...recovery} onChange={recovery.update} onSubmit={async () => {
      if (await recovery.submit('replace')) {
        passwordResetLink.code = ''
        navigate('/passwordChanged', { replace: true })
      }
    }} />}
    <Link className="password-recovery-retry" to="/forgotPassword">Solicitar novo link</Link>
  </PasswordRecoveryLayout>
}

export default ReplacePasswordPage
