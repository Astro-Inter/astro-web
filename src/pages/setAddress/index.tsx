import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { HelpLink, AddressForm } from '../../components'
import WorkspaceSettingsSaveModal from '../../components/workspaceSettingsSaveModal'
import WorkspaceSettingsBackButton from '../../components/workspaceSettingsBackButton'
import { useWorkspaceRegistration } from '../../hooks/useWorkspaceRegistration'
import { useWorkspaceAddresses } from '../../hooks/useWorkspaceAddresses'

function SetAddressPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const settingsMode = searchParams.get('context') === 'settings'
  const [confirming, setConfirming] = useState(false)
  const { draft, updateDraft } = useWorkspaceRegistration()
  const addresses = useWorkspaceAddresses(settingsMode ? undefined : draft.units)
  if (!settingsMode && (!draft.file || !draft.units.length)) return <Navigate to="/attachExcelFile" replace />

  return (
    <main className="set-address-page">
      {settingsMode && <WorkspaceSettingsBackButton screen="backAdressesModalWeb" />}
      <AddressForm addresses={addresses} settingsMode={settingsMode} unitsFromSpreadsheet={!settingsMode} onComplete={units => {
        if (settingsMode) setConfirming(true)
        else {
          updateDraft({ units })
          navigate('/loadingScreen?context=registration')
        }
      }} />
      <HelpLink />
      {confirming && <WorkspaceSettingsSaveModal onCancel={() => setConfirming(false)} section="addresses" />}
    </main>
  )
}

export default SetAddressPage
