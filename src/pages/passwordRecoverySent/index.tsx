import { useNavigate } from 'react-router-dom'
import StatusScreenLayout from '../../components/statusScreenLayout'
import { getRecoveryChallenge } from '../../services/passwordRecoveryMock'

function PasswordRecoverySentPage() {
  const navigate = useNavigate()
  const email = getRecoveryChallenge()?.email ?? 'gestor@astro.com'
  return <StatusScreenLayout titleId="recovery-sent-title" title="E-mail enviado com sucesso!"
      description={`Enviamos um link para ${email}. Clique no botão do e-mail para alterar sua senha. Confira também a pasta de spam.`}
      illustration="passwordRecoverySent.png" illustrationWidth={1419} illustrationHeight={1109}
      illustrationBounds={{ left: 237, top: 163, right: 1186, bottom: 886 }}
      actionLabel="Continuar" onAction={() => navigate('/')} />
}

export default PasswordRecoverySentPage
