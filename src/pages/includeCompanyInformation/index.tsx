import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AstroBrand, CompanyInformationForm, HelpLink } from '../../components'
import { useWorkspaceRegistration } from '../../hooks/useWorkspaceRegistration'
import WorkspaceCompanySettingsPage from '../workspaceCompanySettings'

function IncludeCompanyInformationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const settingsMode = searchParams.get('context') === 'settings'
  const { draft, updateDraft } = useWorkspaceRegistration()
  if (settingsMode) return <WorkspaceCompanySettingsPage />
  if (!draft.password) return <Navigate to="/createPassword" replace />

  return (
    <main data-track-page={true} className="create-password-page include-company-page">
      <header className="create-password-header">
        <AstroBrand />
      </header>

      <section className="login-card create-password-card astro-scale-90" aria-labelledby="company-information-title">
        <CompanyInformationForm initialCompany={draft.company} onChange={company => updateDraft({ company })} onContinue={company => {
          updateDraft({ company })
          navigate('/attachExcelFile')
        }} />
      </section>

      <HelpLink />
    </main>
  )
}

export default IncludeCompanyInformationPage
