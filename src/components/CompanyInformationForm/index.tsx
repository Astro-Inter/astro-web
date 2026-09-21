import { useState } from 'react'
import type { CompanyInformation } from '../../types/company'
import { formatCnpj } from '../../utils/cnpj'

function CompanyInformationForm() {
  const [company, setCompany] = useState<CompanyInformation>({ name: '', cnpj: '' })

  return (
    <>
      <header className="login-heading">
        <h1 id="company-information-title">Dados da empresa</h1>
        <p>Preencha os dados para continuar.</p>
      </header>

      <form className="company-information-form" noValidate onSubmit={(event) => event.preventDefault()}>
        <div className="field-group">
          <label htmlFor="company-name">Nome da empresa</label>
          <input
            autoComplete="organization"
            id="company-name"
            maxLength={120}
            onChange={(event) => setCompany((current) => ({ ...current, name: event.target.value }))}
            placeholder="Digite o nome da empresa"
            type="text"
            value={company.name}
          />
        </div>

        <div className="field-group">
          <label htmlFor="company-cnpj">CNPJ</label>
          <input
            autoComplete="off"
            id="company-cnpj"
            inputMode="numeric"
            maxLength={18}
            onChange={(event) => setCompany((current) => ({ ...current, cnpj: formatCnpj(event.target.value) }))}
            placeholder="00.000.000/0000-00"
            type="text"
            value={company.cnpj}
          />
        </div>

        <button type="submit">Continuar</button>
      </form>
    </>
  )
}

export default CompanyInformationForm
