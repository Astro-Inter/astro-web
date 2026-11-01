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
import { useActionFeedback } from '../../hooks/useActionFeedback'

function WorkspaceSpreadsheetSettingsPage() {
  const spreadsheet = useWorkspaceImport()
  const navigate = useNavigate()
  const notify = useActionFeedback()
  const [confirmation, setConfirmation] = useState<WorkspaceUnitAddress[] | null>(null)
  return <><main data-track-page={true} className="attach-excel-page workspace-spreadsheet-settings" aria-busy={spreadsheet.reading} inert={spreadsheet.reading}>
    <WorkspaceSettingsBackButton screen="backExcelModalWeb" hasChanges={Boolean(spreadsheet.file && !spreadsheet.result)} />
    {!spreadsheet.result && <>
      <AttachExcelFileForm settingsMode reading={spreadsheet.reading} readingError={spreadsheet.error} onValidateFile={async file => { const valid = await spreadsheet.prepare(file); if (valid) notify('Planilha validada com sucesso.'); return valid }} onSelectionChange={file => { spreadsheet.reset(file); setConfirmation(null) }} onContinue={async file => {
        if ((spreadsheet.file === file && spreadsheet.units !== null && !spreadsheet.error) || await spreadsheet.prepare(file)) setConfirmation([])
      }} />
      {confirmation && spreadsheet.units && spreadsheet.units.length > 0 && <>
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
