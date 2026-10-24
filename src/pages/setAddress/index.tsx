import { useEffect } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { HelpLink, AddressForm } from '../../components'
import { useWorkspaceRegistration } from '../../hooks/useWorkspaceRegistration'
import { useWorkspaceAddresses } from '../../hooks/useWorkspaceAddresses'
import LoginLoadingOverlay from '../../components/loginLoadingOverlay'
import WorkspaceAddressSettingsPage from '../workspaceAddressSettings'

function SetAddressPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const settingsMode = searchParams.get('context') === 'settings'
  const { draft, updateDraft } = useWorkspaceRegistration()
  const addresses = useWorkspaceAddresses(settingsMode ? undefined : draft.units, !settingsMode)
  const lookingUpPostalCode = addresses.postalCode.status === 'loading'
  useEffect(() => {
    if (!settingsMode && draft.file && addresses.address.units !== draft.units) updateDraft({ units: addresses.address.units })
  }, [settingsMode, draft.file, draft.units, addresses.address.units, updateDraft])
  if (settingsMode) return <WorkspaceAddressSettingsPage />
  if (!settingsMode && (!draft.file || !draft.units.length)) return <Navigate to="/attachExcelFile" replace />

  return (
    <>
    <main data-track-page={true} className="set-address-page" aria-busy={lookingUpPostalCode} inert={lookingUpPostalCode}>
      <AddressForm addresses={addresses} unitsFromSpreadsheet onComplete={units => {
        updateDraft({ units })
        navigate('/loadingScreen?context=registration')
      }} />
      <HelpLink />
    </main>
    {lookingUpPostalCode && <LoginLoadingOverlay />}
    </>
  )
}

export default SetAddressPage
