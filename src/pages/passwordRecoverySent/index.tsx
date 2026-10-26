import { useNavigate } from 'react-router-dom'
import StatusScreenLayout from '../../components/statusScreenLayout'
import { getRecoveryChallenge } from '../../services/passwordRecovery'

function PasswordRecoverySentPage() {
  const navigate = useNavigate()
  const email = getRecoveryChallenge()?.email
  return <StatusScreenLayout titleId="recovery-sent-title" title="Confira seu e-mail"
      description={email ? `Se o e-mail ${email} estiver cadastrado, você receberá instruções para redefinir sua senha. Confira também a pasta de spam.` : 'Se o e-mail informado estiver cadastrado, você receberá instruções para redefinir sua senha.'}
      illustration="passwordRecoverySent.png" illustrationWidth={1419} illustrationHeight={1109}
      illustrationBounds={{ left: 237, top: 163, right: 1186, bottom: 886 }}
      actionLabel="Continuar" onAction={() => navigate('/')} />
}

export default PasswordRecoverySentPage
