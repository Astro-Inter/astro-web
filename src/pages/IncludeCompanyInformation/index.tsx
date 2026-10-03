import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AstroBrand, CompanyInformationForm, HelpLink } from '../../components'
import WorkspaceSettingsSaveModal from '../../components/WorkspaceSettingsSaveModal'
import WorkspaceSettingsBackButton from '../../components/WorkspaceSettingsBackButton'

function IncludeCompanyInformationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const settingsMode = searchParams.get('context') === 'settings'
  const [confirming, setConfirming] = useState(false)

  return (
    <main className="create-password-page include-company-page">
      {settingsMode && <WorkspaceSettingsBackButton screen="backCompanyModalWeb" />}
      <header className="create-password-header">
        <AstroBrand />
      </header>

      <section className="login-card create-password-card astro-scale-90" aria-labelledby="company-information-title">
        <CompanyInformationForm settingsMode={settingsMode} onContinue={() => {
          if (settingsMode) setConfirming(true)
          else navigate('/attachExcelFile')
        }} />
      </section>

      <HelpLink />
      {confirming && <WorkspaceSettingsSaveModal onCancel={() => setConfirming(false)} section="company" />}
    </main>
  )
}

export default IncludeCompanyInformationPage
