import { useNavigate } from 'react-router-dom'
import PasswordRecoveryForm from '../../components/passwordRecoveryForm'
import PasswordRecoveryLayout from '../../components/passwordRecoveryLayout'
import { usePasswordRecovery } from '../../hooks/usePasswordRecovery'

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const recovery = usePasswordRecovery()
  return <PasswordRecoveryLayout titleId="forgot-password-title" pending={recovery.pending} backTo="/">
    <PasswordRecoveryForm mode="request" {...recovery} onChange={recovery.update} onSubmit={async () => {
      if (await recovery.submit('request')) navigate('/passwordRecoverySent')
    }} />
  </PasswordRecoveryLayout>
}

export default ForgotPasswordPage
