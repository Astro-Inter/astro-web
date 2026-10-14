import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AstroBrand, CompanyInformationForm, HelpLink } from '../../components'
import WorkspaceSettingsSaveModal from '../../components/workspaceSettingsSaveModal'
import WorkspaceSettingsBackButton from '../../components/workspaceSettingsBackButton'
import { useWorkspaceRegistration } from '../../hooks/useWorkspaceRegistration'

function IncludeCompanyInformationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const settingsMode = searchParams.get('context') === 'settings'
  const [confirming, setConfirming] = useState(false)
  const { draft, updateDraft } = useWorkspaceRegistration()
  if (!settingsMode && !draft.password) return <Navigate to="/createPassword" replace />

  return (
    <main className="create-password-page include-company-page">
      {settingsMode && <WorkspaceSettingsBackButton screen="backCompanyModalWeb" />}
      <header className="create-password-header">
        <AstroBrand />
      </header>

      <section className="login-card create-password-card astro-scale-90" aria-labelledby="company-information-title">
        <CompanyInformationForm initialCompany={settingsMode ? undefined : draft.company} settingsMode={settingsMode} onChange={settingsMode ? undefined : company => updateDraft({ company })} onContinue={company => {
          if (settingsMode) setConfirming(true)
          else {
            updateDraft({ company })
            navigate('/attachExcelFile')
          }
        }} />
      </section>

      <HelpLink />
      {confirming && <WorkspaceSettingsSaveModal onCancel={() => setConfirming(false)} section="company" />}
    </main>
  )
}

export default IncludeCompanyInformationPage
