import { useNavigate } from 'react-router-dom'
import StatusScreenLayout from '../../components/statusScreenLayout'

function NotFoundPage() {
  const navigate = useNavigate()
  return <StatusScreenLayout actionLabel="Voltar ao início" onAction={() => navigate('/mainHomeScreen', { replace: true })} description="Parece que o conteúdo que você procura ainda não está disponível." illustration="error404.png" illustrationBounds={{ left: 56, top: 9, right: 417, bottom: 255 }} illustrationHeight={266} illustrationWidth={470} title="Ops! Página não encontrada" titleId="error-screen-title" />
}
export default NotFoundPage
