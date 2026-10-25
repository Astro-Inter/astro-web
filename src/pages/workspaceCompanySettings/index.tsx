import { useState } from 'react'
import { AstroBrand, CompanyInformationForm, HelpLink } from '../../components'
import WorkspaceSettingsBackButton from '../../components/workspaceSettingsBackButton'
import WorkspaceSettingsSaveModal from '../../components/workspaceSettingsSaveModal'
import WorkspaceQueryFeedback from '../../components/workspaceQueryFeedback'
import { useWorkspaceCompany } from '../../hooks/useWorkspaceCompany'

function WorkspaceCompanySettingsPage() {
  const company = useWorkspaceCompany()
  const [confirming, setConfirming] = useState(false)
  return <main data-track-page={true} className="create-password-page include-company-page">
    <WorkspaceSettingsBackButton screen="backCompanyModalWeb" hasChanges={company.hasChanges} />
    <header className="create-password-header"><AstroBrand /></header>
    <section className="login-card create-password-card astro-scale-90" aria-labelledby="company-information-title">
      <WorkspaceQueryFeedback loading={company.loading} error={company.error} onRetry={company.retry} />
      {!company.loading && !company.error && company.company && <CompanyInformationForm initialCompany={company.company} settingsMode onChange={company.setCompany} onContinue={values => {
        company.setCompany(values)
        setConfirming(true)
      }} />}
    </section>
    <HelpLink />
    {confirming && <WorkspaceSettingsSaveModal onCancel={() => setConfirming(false)} section="company" onSave={company.save} />}
  </main>
}

export default WorkspaceCompanySettingsPage
