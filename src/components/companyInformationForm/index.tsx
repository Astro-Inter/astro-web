import { useState } from 'react'
import type { CompanyInformation } from '../../types/company'
import { formatCnpj } from '../../utils/corporateTaxId'
import { handleMaskedInput } from '../../utils/inputFormatting'
import FormField from '../formField'
import PageHeading from '../pageHeading'
import PurpleButton from '../purpleButton'
import { validateRegistrationCompany } from '../../utils/workspaceRegistration'

interface CompanyInformationFormProps {
  onContinue: (company: CompanyInformation) => void
  initialCompany?: CompanyInformation
  settingsMode?: boolean
}

function CompanyInformationForm({ onContinue, settingsMode = false, initialCompany }: CompanyInformationFormProps) {
  const [company, setCompany] = useState<CompanyInformation>(initialCompany ?? { name: '', cnpj: '' })
  const [error, setError] = useState('')

  return (
    <>
      <PageHeading description={settingsMode ? 'Altere os dados da sua empresa.' : 'Preencha os dados para continuar.'} title="Dados da empresa" titleId="company-information-title" />

      <form className="company-information-form" noValidate onSubmit={(event) => {
        event.preventDefault()
        const message = settingsMode ? '' : validateRegistrationCompany(company)
        setError(message)
        if (!message) onContinue(company)
      }}>
        <FormField
            autoComplete="organization"
            id="company-name"
            label="Nome da empresa"
            maxLength={120}
            onChange={(event) => setCompany((current) => ({ ...current, name: event.target.value }))}
            placeholder="Digite o nome da empresa"
            type="text"
            value={company.name}
          />

        <FormField
            autoComplete="off"
            id="company-cnpj"
            label="CNPJ"
            inputMode="numeric"
            maxLength={18}
            onChange={(event) => handleMaskedInput(event, formatCnpj, (cnpj) => setCompany((current) => ({ ...current, cnpj })))}
            placeholder="00.000.000/0000-00"
            type="text"
            value={company.cnpj}
          />

        {error && <p className="login-field-error" role="alert">{error}</p>}
        <PurpleButton className="astro-form-action" type="submit">{settingsMode ? 'Salvar alterações' : 'Continuar'}</PurpleButton>
      </form>
    </>
  )
}

export default CompanyInformationForm
