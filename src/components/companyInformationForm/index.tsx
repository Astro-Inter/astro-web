import { BUTTONS } from '../../gtm/buttons'
import { useState } from 'react'
import type { CompanyInformation } from '../../types/company'
import { formatCnpj } from '../../utils/corporateTaxId'
import { handleMaskedInput } from '../../utils/inputFormatting'
import FormField from '../formField'
import PageHeading from '../pageHeading'
import PurpleButton from '../purpleButton'
import { validateRegistrationCompanyFields } from '../../utils/workspaceRegistration'
import { validateWorkspaceCompany } from '../../utils/workspaceSettings'

interface CompanyInformationFormProps {
  onContinue: (company: CompanyInformation) => void
  initialCompany?: CompanyInformation
  settingsMode?: boolean
  onChange?: (company: CompanyInformation) => void
}

function CompanyInformationForm({ onContinue, settingsMode = false, initialCompany, onChange }: CompanyInformationFormProps) {
  const [company, setCompany] = useState<CompanyInformation>(initialCompany ?? { name: '', cnpj: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof CompanyInformation, string>>>({})

  function changeField(field: keyof CompanyInformation, value: string) {
    const next = { ...company, [field]: value }
    setCompany(next)
    setErrors(current => ({ ...current, [field]: undefined }))
    onChange?.(next)
  }

  return (
    <>
      <PageHeading description={settingsMode ? 'Altere os dados da sua empresa.' : 'Preencha os dados para continuar.'} title="Dados da empresa" titleId="company-information-title" />

      <form data-track-submit={settingsMode ? BUTTONS.comuns.salvar_alteracoes : BUTTONS.comuns.continuar} className="company-information-form" noValidate onSubmit={(event) => {
        event.preventDefault()
        const nextErrors = settingsMode ? validateWorkspaceCompany(company) : validateRegistrationCompanyFields(company)
        setErrors(nextErrors)
        if (!Object.keys(nextErrors).length) onContinue(company)
      }}>
        <FormField
            autoComplete="organization"
            id="company-name"
            label="Nome da empresa"
            error={errors.name}
            maxLength={settingsMode ? 255 : 120}
            onChange={(event) => changeField('name', event.target.value)}
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
            onChange={(event) => handleMaskedInput(event, formatCnpj, cnpj => changeField('cnpj', cnpj))}
            placeholder="00.000.000/0000-00"
            type="text"
            value={formatCnpj(company.cnpj)}
          />

        <PurpleButton data-track-action={settingsMode ? BUTTONS.comuns.salvar_alteracoes : BUTTONS.comuns.continuar} className="astro-form-action" type="submit">{settingsMode ? 'Salvar alterações' : 'Continuar'}</PurpleButton>
      </form>
    </>
  )
}

export default CompanyInformationForm
