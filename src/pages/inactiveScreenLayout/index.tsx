import StatusScreenLayout from '../../components/statusScreenLayout'
import { useNavigate } from 'react-router-dom'

function InactiveScreenLayoutPage() {
  const navigate = useNavigate()
  return <StatusScreenLayout actionLabel="Ir para o login" onAction={() => navigate('/')} description="Sua conta foi inativada. Entre em contato com o Administrador para reativar seu acesso." illustration="inactiveUser.png" illustrationBounds={{ left: 69, top: 9, right: 416, bottom: 241 }} illustrationHeight={252} illustrationWidth={470} title="Usuário inativado" titleId="inactive-screen-title" />
}

export default InactiveScreenLayoutPage
