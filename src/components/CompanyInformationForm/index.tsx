import { useState } from 'react'
import type { CompanyInformation } from '../../types/company'
import { formatCnpj } from '../../utils/cnpj'
import { handleMaskedInput } from '../../utils/inputFormatting'
import FormField from '../FormField'
import PageHeading from '../PageHeading'
import PurpleButton from '../PurpleButton'

interface CompanyInformationFormProps {
  onContinue: () => void
}

function CompanyInformationForm({ onContinue }: CompanyInformationFormProps) {
  const [company, setCompany] = useState<CompanyInformation>({ name: '', cnpj: '' })

  return (
    <>
      <PageHeading description="Preencha os dados para continuar." title="Dados da empresa" titleId="company-information-title" />

      <form className="company-information-form" noValidate onSubmit={(event) => { event.preventDefault(); onContinue() }}>
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

        <PurpleButton className="astro-form-action" type="submit">Continuar</PurpleButton>
      </form>
    </>
  )
}

export default CompanyInformationForm
