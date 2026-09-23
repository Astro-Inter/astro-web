import { useNavigate } from 'react-router-dom'
import { HelpLink, SetAddressForm } from '../../components'

function SetAddressPage() {
  const navigate = useNavigate()

  return (
    <main className="set-address-page">
      <SetAddressForm onComplete={() => navigate('/workspaceCreated')} />
      <HelpLink />
    </main>
  )
}

export default SetAddressPage
