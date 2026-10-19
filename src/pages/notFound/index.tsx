import { useNavigate } from 'react-router-dom'
import StatusScreenLayout from '../../components/statusScreenLayout'
import { useAuthentication } from '../../hooks/useAuthentication'

function NotFoundPage() {
  const navigate = useNavigate()
  const { user, status } = useAuthentication()
  const pending = status === 'loading' || status === 'authenticating'
  return <StatusScreenLayout busy={pending} actionLabel={user ? 'Voltar à Home' : 'Voltar ao início'} onAction={() => navigate(user ? '/mainHomeScreen' : '/', { replace: true })} description="Parece que o conteúdo que você procura ainda não está disponível." illustration="error404.png" illustrationBounds={{ left: 56, top: 9, right: 417, bottom: 255 }} illustrationHeight={266} illustrationWidth={470} title="Ops! Página não encontrada" titleId="error-screen-title" />
}
export default NotFoundPage
