import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AttachExcelFileForm, HelpLink } from '../../components'
import WorkspaceSettingsSaveModal from '../../components/workspaceSettingsSaveModal'
import WorkspaceSettingsBackButton from '../../components/workspaceSettingsBackButton'

function AttachExcelFilePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const settingsMode = searchParams.get('context') === 'settings'
  const [confirming, setConfirming] = useState(false)

  return (
    <main className="attach-excel-page">
      {settingsMode && <WorkspaceSettingsBackButton screen="backExcelModalWeb" />}
      <AttachExcelFileForm settingsMode={settingsMode} onContinue={() => {
        if (settingsMode) setConfirming(true)
        else navigate('/setAddress')
      }} />
      <HelpLink />
      {confirming && <WorkspaceSettingsSaveModal onCancel={() => setConfirming(false)} section="spreadsheet" />}
    </main>
  )
}

export default AttachExcelFilePage
