import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AttachExcelFileForm, HelpLink } from '../../components'
import { useWorkspaceRegistration } from '../../hooks/useWorkspaceRegistration'
import { useSpreadsheetUnits } from '../../hooks/useSpreadsheetUnits'
import LoginLoadingOverlay from '../../components/loginLoadingOverlay'
import SpreadsheetEmailMissingModal from '../../components/spreadsheetEmailMissingModal'
import WorkspaceSpreadsheetSettingsPage from '../workspaceSpreadsheetSettings'
import { useActionFeedback } from '../../hooks/useActionFeedback'

function AttachExcelFilePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const settingsMode = searchParams.get('context') === 'settings'
  const { draft, updateDraft } = useWorkspaceRegistration()
  const spreadsheet = useSpreadsheetUnits()
  const notify = useActionFeedback()
  if (settingsMode) return <WorkspaceSpreadsheetSettingsPage />
  if (!draft.company.name) return <Navigate to="/includeCompanyInformation" replace />

  return (
    <>
    <main data-track-page={true} className="attach-excel-page" inert={spreadsheet.loading} aria-busy={spreadsheet.loading}>
      <AttachExcelFileForm initialFile={draft.file} reading={spreadsheet.loading} readingError={spreadsheet.error} onSelectionChange={async file => {
        spreadsheet.clearError()
        updateDraft({ file })
        if (!file) return
        const units = await spreadsheet.readUnits(file, draft.units, draft.email)
        if (!units) return
        updateDraft({ units })
        notify('Planilha validada com sucesso.', 'success')
      }} onContinue={async file => {
        if (file) {
          const units = await spreadsheet.readUnits(file, draft.units, draft.email)
          if (!units) return
          updateDraft({ file, units })
          navigate('/setAddress')
        }
      }} />
      <HelpLink />
    </main>
    {spreadsheet.loading && <LoginLoadingOverlay />}
    {spreadsheet.managerEmailMissing && <SpreadsheetEmailMissingModal onClose={spreadsheet.clearError} />}
    </>
  )
}

export default AttachExcelFilePage
