import { useState } from 'react'
import type { CompanyInformation } from '../../types/company'
import { formatCnpj } from '../../utils/corporateTaxId'
import { handleMaskedInput } from '../../utils/inputFormatting'
import FormField from '../formField'
import PageHeading from '../pageHeading'
import PurpleButton from '../purpleButton'
import { validateRegistrationCompanyFields } from '../../utils/workspaceRegistration'

interface CompanyInformationFormProps {
  onContinue: (company: CompanyInformation) => void
  initialCompany?: CompanyInformation
  settingsMode?: boolean
}

function CompanyInformationForm({ onContinue, settingsMode = false, initialCompany }: CompanyInformationFormProps) {
  const [company, setCompany] = useState<CompanyInformation>(initialCompany ?? { name: '', cnpj: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof CompanyInformation, string>>>({})

  return (
    <>
      <PageHeading description={settingsMode ? 'Altere os dados da sua empresa.' : 'Preencha os dados para continuar.'} title="Dados da empresa" titleId="company-information-title" />

      <form className="company-information-form" noValidate onSubmit={(event) => {
        event.preventDefault()
        const nextErrors = settingsMode ? {} : validateRegistrationCompanyFields(company)
        setErrors(nextErrors)
        if (!Object.keys(nextErrors).length) onContinue(company)
      }}>
        <FormField
            autoComplete="organization"
            id="company-name"
            label="Nome da empresa"
            error={errors.name}
            maxLength={120}
            onChange={(event) => { setCompany((current) => ({ ...current, name: event.target.value })); setErrors(current => ({ ...current, name: undefined })) }}
            placeholder="Digite o nome da empresa"
            type="text"
            value={company.name}
          />

        <FormField
            autoComplete="off"
            id="company-cnpj"
            label="CNPJ"
            error={errors.cnpj}
            inputMode="numeric"
            maxLength={18}
            onChange={(event) => handleMaskedInput(event, formatCnpj, (cnpj) => { setCompany((current) => ({ ...current, cnpj })); setErrors(current => ({ ...current, cnpj: undefined })) })}
            placeholder="00.000.000/0000-00"
            type="text"
            value={company.cnpj}
          />

        <PurpleButton className="astro-form-action" type="submit">{settingsMode ? 'Salvar alterações' : 'Continuar'}</PurpleButton>
      </form>
    </>
  )
}

export default CompanyInformationForm
