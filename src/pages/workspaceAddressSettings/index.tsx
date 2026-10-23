import { useState } from 'react'
import { AddressForm, HelpLink } from '../../components'
import WorkspaceSettingsBackButton from '../../components/workspaceSettingsBackButton'
import WorkspaceSettingsSaveModal from '../../components/workspaceSettingsSaveModal'
import WorkspaceQueryFeedback from '../../components/workspaceQueryFeedback'
import { useWorkspaceQuery } from '../../hooks/useWorkspaceQuery'
import { useWorkspaceUnitEditor } from '../../hooks/useWorkspaceUnitEditor'
import { listUnitAddresses } from '../../services/units'
import type { WorkspaceUnitAddress } from '../../types/address'

interface WorkspaceAddressEditorProps { units: WorkspaceUnitAddress[] }

function WorkspaceAddressEditor({ units }: WorkspaceAddressEditorProps) {
  const editor = useWorkspaceUnitEditor(units)
  const [confirming, setConfirming] = useState(false)
  return <>
    <AddressForm settingsMode addresses={editor.addresses} onComplete={() => setConfirming(true)} />
    {editor.message && <p role="status">{editor.message}</p>}
    {confirming && <WorkspaceSettingsSaveModal section="addresses" onCancel={() => setConfirming(false)} onSave={editor.save} />}
  </>
}

function WorkspaceAddressSettingsPage() {
  const query = useWorkspaceQuery(listUnitAddresses)
  return <main data-track-page={true} className="set-address-page">
    <WorkspaceSettingsBackButton screen="backAdressesModalWeb" />
    <WorkspaceQueryFeedback loading={query.loading} error={query.error} onRetry={query.retry} />
    {query.data && <WorkspaceAddressEditor units={query.data} />}
    <HelpLink />
  </main>
}

export default WorkspaceAddressSettingsPage
