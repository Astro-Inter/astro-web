import { useNavigate } from 'react-router-dom'
import StatusScreenLayout from '../../components/statusScreenLayout'

function PasswordChangedPage() {
  const navigate = useNavigate()
  return <StatusScreenLayout titleId="password-changed-title" title="Senha alterada com sucesso!"
    description="Sua nova senha foi definida. Agora você pode entrar na sua conta."
    illustration="passwordChanged.png" illustrationWidth={1416} illustrationHeight={1111}
    illustrationBounds={{ left: 238, top: 204, right: 1191, bottom: 882 }}
    actionLabel="Ir para o login" onAction={() => navigate('/', { replace: true })} />
}

export default PasswordChangedPage
