import { AstroBrand, CompanyInformationForm, HelpLink } from '../../components'

function IncludeCompanyInformationPage() {
  return (
    <main className="create-password-page include-company-page">
      <header className="create-password-header">
        <AstroBrand />
      </header>

      <section className="login-card create-password-card" aria-labelledby="company-information-title">
        <CompanyInformationForm />
      </section>

      <HelpLink />
    </main>
  )
}

export default IncludeCompanyInformationPage
