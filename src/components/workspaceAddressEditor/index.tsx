import { useState } from 'react'
import { AddressForm } from '../../components'
import WorkspaceSettingsBackButton from '../../components/workspaceSettingsBackButton'
import WorkspaceSettingsSaveModal from '../../components/workspaceSettingsSaveModal'
import { useWorkspaceUnitEditor } from '../../hooks/useWorkspaceUnitEditor'
import type { WorkspaceUnitAddress } from '../../types/address'

interface WorkspaceAddressEditorProps { units: WorkspaceUnitAddress[] }
function WorkspaceAddressEditor({ units }: WorkspaceAddressEditorProps) {
  const editor = useWorkspaceUnitEditor(units)
  const [confirming, setConfirming] = useState(false)
  return <>
    <WorkspaceSettingsBackButton screen="backAdressesModalWeb" hasChanges={editor.hasChanges} />
    <AddressForm settingsMode addresses={editor.addresses} onComplete={() => setConfirming(true)} />
    {editor.message && <p role="status">{editor.message}</p>}
    {confirming && <WorkspaceSettingsSaveModal section="addresses" onCancel={() => setConfirming(false)} onSave={editor.save} />}
  </>
}
export default WorkspaceAddressEditor
