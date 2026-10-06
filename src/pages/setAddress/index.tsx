import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { HelpLink, AddressForm } from '../../components'
import WorkspaceSettingsSaveModal from '../../components/workspaceSettingsSaveModal'
import WorkspaceSettingsBackButton from '../../components/workspaceSettingsBackButton'

function SetAddressPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const settingsMode = searchParams.get('context') === 'settings'
  const [confirming, setConfirming] = useState(false)

  return (
    <main className="set-address-page">
      {settingsMode && <WorkspaceSettingsBackButton screen="backAdressesModalWeb" />}
      <AddressForm settingsMode={settingsMode} onComplete={() => {
        if (settingsMode) setConfirming(true)
        else navigate('/workspaceCreated')
      }} />
      <HelpLink />
      {confirming && <WorkspaceSettingsSaveModal onCancel={() => setConfirming(false)} section="addresses" />}
    </main>
  )
}

export default SetAddressPage
