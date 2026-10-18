import StatusScreenLayout from '../../components/statusScreenLayout'
import { BUTTONS } from '../../gtm/buttons'
import { Navigate, useNavigate } from 'react-router-dom'
import { PurpleButton } from '../../components'
import { useWorkspaceRegistration } from '../../hooks/useWorkspaceRegistration'
import { useCreatedWorkspaceLogin } from '../../hooks/useCreatedWorkspaceLogin'
import LoginLoadingOverlay from '../../components/loginLoadingOverlay'

function WorkspaceCreatedPage() {
  const navigate = useNavigate()
  const { result, reset } = useWorkspaceRegistration()
  const login = useCreatedWorkspaceLogin()
  if (!result) return <Navigate to="/createWorkspace" replace />

  return <>
    <StatusScreenLayout titleId="workspace-created-title" title="Criação do workspace concluída!" busy={login.pending}
      description={`Seu workspace foi cadastrado com sucesso. ${login.canSignIn ? 'Continue para acessar sua conta.' : 'Faça login para acessar sua conta.'}`} descriptionRole="status"
      illustration="workspaceCreated.png" illustrationWidth={1536} illustrationHeight={1024}
      illustrationBounds={{ left: 182, top: 177, right: 1310, bottom: 951 }}
      actions={<PurpleButton data-track-action={login.canSignIn ? (login.error ? BUTTONS.comuns.tentar_novamente : BUTTONS.comuns.continuar) : BUTTONS.comuns.login} disabled={login.pending} onClick={async () => {
        if (!login.canSignIn) { reset(); navigate('/', { replace: true }); return }
        if (await login.submit()) navigate('/mainHomeScreen', { replace: true })
      }}>{login.canSignIn ? (login.error ? 'Tentar novamente' : 'Continuar') : 'Ir para o login'}</PurpleButton>} />
    {login.pending && <LoginLoadingOverlay />}
  </>
}
export default WorkspaceCreatedPage
