import { AddressForm } from '../../components'
import { useWorkspaceAddresses } from '../../hooks/useWorkspaceAddresses'
import type { WorkspaceUnitAddress } from '../../types/address'

interface ImportAddressEditorProps {
  units: WorkspaceUnitAddress[]
  onComplete: (units: WorkspaceUnitAddress[]) => void
}
function ImportAddressEditor({ units, onComplete }: ImportAddressEditorProps) {
  const addresses = useWorkspaceAddresses(units, true)
  return <AddressForm settingsMode unitsFromSpreadsheet addresses={addresses} onComplete={onComplete} />
}
export default ImportAddressEditor
