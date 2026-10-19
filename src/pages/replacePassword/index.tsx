import { useNavigate } from 'react-router-dom'
import PasswordRecoveryForm from '../../components/passwordRecoveryForm'
import PasswordRecoveryLayout from '../../components/passwordRecoveryLayout'
import { usePasswordRecovery } from '../../hooks/usePasswordRecovery'

function ReplacePasswordPage() {
  const navigate = useNavigate()
  const recovery = usePasswordRecovery()
  return <PasswordRecoveryLayout titleId="replace-password-title" pending={recovery.pending}>
    <PasswordRecoveryForm mode="replace" {...recovery} onChange={recovery.update} onSubmit={async () => {
      if (await recovery.submit('replace')) navigate('/passwordChanged', { replace: true })
    }} />
  </PasswordRecoveryLayout>
}

export default ReplacePasswordPage
