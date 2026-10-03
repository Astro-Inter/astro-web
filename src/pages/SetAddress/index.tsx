import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { HelpLink, SetAddressForm } from '../../components'
import WorkspaceSettingsSaveModal from '../../components/WorkspaceSettingsSaveModal'
import WorkspaceSettingsBackButton from '../../components/WorkspaceSettingsBackButton'

function SetAddressPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const settingsMode = searchParams.get('context') === 'settings'
  const [confirming, setConfirming] = useState(false)

  return (
    <main className="set-address-page">
      {settingsMode && <WorkspaceSettingsBackButton screen="backAdressesModalWeb" />}
      <SetAddressForm settingsMode={settingsMode} onComplete={() => {
        if (settingsMode) setConfirming(true)
        else navigate('/workspaceCreated')
      }} />
      <HelpLink />
      {confirming && <WorkspaceSettingsSaveModal onCancel={() => setConfirming(false)} section="addresses" />}
    </main>
  )
}

export default SetAddressPage
