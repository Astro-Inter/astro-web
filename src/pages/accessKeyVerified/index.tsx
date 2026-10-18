import StatusScreenLayout from '../../components/statusScreenLayout'
import { BUTTONS } from '../../gtm/buttons'
import { PurpleButton } from '../../components'
import { Navigate, useNavigate } from 'react-router-dom'
import { useWorkspaceRegistration } from '../../hooks/useWorkspaceRegistration'

function AccessKeyVerifiedPage() {
  const navigate = useNavigate()
  const { draft, verifiedEmail } = useWorkspaceRegistration()
  if (!draft.email || verifiedEmail !== draft.email.trim()) return <Navigate to="/createWorkspace" replace />

  return <StatusScreenLayout titleId="access-verified-title" title="Chave de acesso verificada!"
    description="Seu e-mail foi confirmado. Siga os próximos passos para cadastrar seu workspace."
    illustration="accessKeyVerified.png" illustrationWidth={509} illustrationHeight={339}
    illustrationBounds={{ left: 53, top: 60, right: 437, bottom: 290 }}
    actions={<PurpleButton data-track-action={BUTTONS.comuns.comecar} onClick={() => navigate('/createPassword')}>Começar</PurpleButton>} />
}
export default AccessKeyVerifiedPage
