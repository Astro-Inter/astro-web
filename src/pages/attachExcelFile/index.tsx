import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AttachExcelFileForm, HelpLink } from '../../components'
import WorkspaceSettingsSaveModal from '../../components/workspaceSettingsSaveModal'
import WorkspaceSettingsBackButton from '../../components/workspaceSettingsBackButton'
import { useWorkspaceRegistration } from '../../hooks/useWorkspaceRegistration'
import { useSpreadsheetUnits } from '../../hooks/useSpreadsheetUnits'
import LoginLoadingOverlay from '../../components/loginLoadingOverlay'

function AttachExcelFilePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const settingsMode = searchParams.get('context') === 'settings'
  const [confirming, setConfirming] = useState(false)
  const { draft, updateDraft } = useWorkspaceRegistration()
  const spreadsheet = useSpreadsheetUnits()
  if (!settingsMode && !draft.company.name) return <Navigate to="/includeCompanyInformation" replace />

  return (
    <>
    <main className="attach-excel-page" inert={spreadsheet.loading} aria-busy={spreadsheet.loading}>
      {settingsMode && <WorkspaceSettingsBackButton screen="backExcelModalWeb" />}
      <AttachExcelFileForm initialFile={settingsMode ? null : draft.file} settingsMode={settingsMode} reading={spreadsheet.loading} readingError={spreadsheet.error} onSelectionChange={spreadsheet.clearError} onContinue={async file => {
        if (settingsMode) setConfirming(true)
        else if (file) {
          const units = await spreadsheet.readUnits(file, draft.units, draft.email)
          if (!units) return
          updateDraft({ file, units })
          navigate('/setAddress')
        }
      }} />
      <HelpLink />
      {confirming && <WorkspaceSettingsSaveModal onCancel={() => setConfirming(false)} section="spreadsheet" />}
    </main>
    {spreadsheet.loading && <LoginLoadingOverlay />}
    </>
  )
}

export default AttachExcelFilePage
