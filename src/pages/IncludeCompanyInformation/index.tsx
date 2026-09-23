import { useNavigate } from 'react-router-dom'
import { AstroBrand, CompanyInformationForm, HelpLink } from '../../components'

function IncludeCompanyInformationPage() {
  const navigate = useNavigate()

  return (
    <main className="create-password-page include-company-page">
      <header className="create-password-header">
        <AstroBrand />
      </header>

      <section className="login-card create-password-card astro-scale-90" aria-labelledby="company-information-title">
        <CompanyInformationForm onContinue={() => navigate('/attachExcelFile')} />
      </section>

      <HelpLink />
    </main>
  )
}

export default IncludeCompanyInformationPage
