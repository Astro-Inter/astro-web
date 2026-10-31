import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AttachExcelFileForm, HelpLink, PurpleButton } from '../../components'
import ActionLoading from '../../components/actionLoading'
import WorkspaceImportSummary from '../../components/workspaceImportSummary'
import WorkspaceSettingsBackButton from '../../components/workspaceSettingsBackButton'
import WorkspaceSettingsSaveModal from '../../components/workspaceSettingsSaveModal'
import { useWorkspaceImport } from '../../hooks/useWorkspaceImport'
import type { WorkspaceUnitAddress } from '../../types/address'
import ImportAddressEditor from '../../components/importAddressEditor'

function WorkspaceSpreadsheetSettingsPage() {
  const spreadsheet = useWorkspaceImport()
  const navigate = useNavigate()
  const [confirmation, setConfirmation] = useState<WorkspaceUnitAddress[] | null>(null)
  return <><main data-track-page={true} className="attach-excel-page workspace-spreadsheet-settings" aria-busy={spreadsheet.reading} inert={spreadsheet.reading}>
    <WorkspaceSettingsBackButton screen="backExcelModalWeb" hasChanges={Boolean(spreadsheet.file && !spreadsheet.result)} />
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
    <ActionLoading active={spreadsheet.reading} />
  </>
}

export default WorkspaceSpreadsheetSettingsPage
