import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AddressForm, AttachExcelFileForm, HelpLink, PurpleButton } from '../../components'
import WorkspaceSettingsBackButton from '../../components/workspaceSettingsBackButton'
import WorkspaceSettingsSaveModal from '../../components/workspaceSettingsSaveModal'
import WorkspaceImportSummary from '../../components/workspaceImportSummary'
import { useWorkspaceImport } from '../../hooks/useWorkspaceImport'
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

function WorkspaceSpreadsheetSettingsPage() {
  const spreadsheet = useWorkspaceImport()
  const navigate = useNavigate()
  const [confirmation, setConfirmation] = useState<WorkspaceUnitAddress[] | null>(null)
  return <main data-track-page={true} className="attach-excel-page workspace-spreadsheet-settings">
    <WorkspaceSettingsBackButton screen="backExcelModalWeb" />
    {!spreadsheet.result && <>
      <AttachExcelFileForm settingsMode reading={spreadsheet.reading} readingError={spreadsheet.error} onSelectionChange={spreadsheet.reset} onContinue={async file => {
        if (await spreadsheet.prepare(file)) setConfirmation([])
      }} />
      {spreadsheet.units && spreadsheet.units.length > 0 && <>
        <p role="status">Informe o endereço das unidades novas antes de importar. Os endereços das unidades existentes serão mantidos.</p>
        <ImportAddressEditor key={spreadsheet.file?.name} units={spreadsheet.units} onComplete={setConfirmation} />
      </>}
    </>}
    <WorkspaceImportSummary result={spreadsheet.result} rows={spreadsheet.rows} />
    {spreadsheet.result && <PurpleButton type="button" onClick={() => navigate('/mainWorkspaceSettingsScreen', { state: { savedSection: 'spreadsheet' } })}>Voltar às configurações</PurpleButton>}
    <HelpLink />
    {confirmation && (!spreadsheet.units?.length || confirmation.length > 0) && <WorkspaceSettingsSaveModal section="spreadsheet" onCancel={() => setConfirmation(null)} onSave={() => spreadsheet.save(confirmation)} onSaved={() => setConfirmation(null)} />}
  </main>
}

export default WorkspaceSpreadsheetSettingsPage
