import { useState } from 'react'
import type { useWorkspaceAddresses } from '../../hooks/useWorkspaceAddresses'
import { formatCep, formatState, handleMaskedInput } from '../../utils/inputFormatting'
import AstroIcon from '../astroIcon'
import PurpleButton from '../purpleButton'
import { validateRegistrationUnitFields } from '../../utils/workspaceRegistration'
import type { WorkspaceAddressField, WorkspaceUnitAddress } from '../../types/address'
import FormField from '../formField'

interface AddressFormProps {
  onComplete: (units: WorkspaceUnitAddress[]) => void
  settingsMode?: boolean
  unitsFromSpreadsheet?: boolean
  addresses: ReturnType<typeof useWorkspaceAddresses>
}

function AddressForm({ onComplete, settingsMode = false, unitsFromSpreadsheet = false, addresses }: AddressFormProps) {
  const { address, activeIndex, activeUnit, changeField, addUnit, removeUnit, moveUnit, postalCode, retryPostalCode } = addresses
  const [unitErrors, setUnitErrors] = useState<Record<number, Partial<Record<WorkspaceAddressField, string>>>>({})
  const errors = unitErrors[activeUnit.id] ?? {}
  const [hasChangedUnit, setHasChangedUnit] = useState(false)

  function changeUnit(action: () => void) {
    setHasChangedUnit(true)
    action()
  }

  function updateField(field: WorkspaceAddressField, value: string) {
    changeField(field, value)
    setUnitErrors(current => ({ ...current, [activeUnit.id]: { ...current[activeUnit.id], [field]: undefined } }))
  }

  return (
    <section className="set-address-content astro-scale-90" aria-labelledby="set-address-title">
      <header className="login-heading set-address-heading">
        <h1 id="set-address-title">{settingsMode ? 'Altere o endereço das unidades' : 'Defina o endereço das unidades'}</h1>
        <p>Informe o endereço de cada unidade para que<br className="set-address-desktop-break" /> possamos identificar sua localização.</p>
        {unitsFromSpreadsheet && <p className="set-address-import-note">{address.units.length} {address.units.length === 1 ? 'unidade identificada' : 'unidades identificadas'} na planilha. Preencha o endereço de cada uma.</p>}
      </header>

      <form className="set-address-form" noValidate onSubmit={(event) => {
        event.preventDefault()
        if (postalCode.status === 'loading') return
        const nextErrors: typeof unitErrors = {}
        const names = new Set<string>()
        if (!settingsMode) for (const unit of address.units) {
          nextErrors[unit.id] = validateRegistrationUnitFields(unit)
          const name = unit.name.trim().toLowerCase()
          if (names.has(name)) nextErrors[unit.id].name = 'O nome da unidade já foi usado. Escolha um nome diferente.'
          names.add(name)
        }
        setUnitErrors(nextErrors)
        const invalidUnit = address.units.find(unit => Object.keys(nextErrors[unit.id] ?? {}).length)
        if (invalidUnit) {
          changeUnit(() => addresses.selectUnit(invalidUnit.id))
          return
        }
        onComplete(address.units)
      }}>
        <div className="set-address-carousel">
          <button
            aria-label="Sede anterior"
            className="set-address-arrow set-address-arrow--previous"
            disabled={activeIndex === 0}
            onClick={() => changeUnit(() => moveUnit(-1))}
            type="button"
          >
            <AstroIcon name="back" />
          </button>

          <div
            className={`set-address-card${!settingsMode || hasChangedUnit ? ' is-switching' : ''}`}
            aria-label={`Sede ${activeIndex + 1} de ${address.units.length}`}
            key={address.activeId}
          >
            <div className="set-address-card-body">
              <div className="set-address-card-header">
                <div className="set-address-card-identification">
                  <span className="set-address-building" aria-hidden="true">
                    <AstroIcon name="building" strokeScale={0.9} />
                  </span>
                  <div aria-live="polite">
                    <h2>{unitsFromSpreadsheet ? activeUnit.name : `Sede ${activeIndex + 1}`}</h2>
                    <p>Informe os dados da unidade</p>
                  </div>
                </div>
                  {!unitsFromSpreadsheet && <PurpleButton aria-label="Remover sede" auto className="set-address-remove" onClick={() => changeUnit(removeUnit)} variant="danger">
                  <AstroIcon name="trash" strokeScale={0.9} />
                  <span className="set-address-remove-label">Remover sede</span>
                </PurpleButton>}
              </div>

              <div className="set-address-fields">
                <div className="set-address-row set-address-row--first">
                  <div className="field-group"><label htmlFor="unit-name">Nome da sede</label><input id="unit-name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'unit-name-error' : unitsFromSpreadsheet ? 'unit-name-source' : undefined} maxLength={80} readOnly={unitsFromSpreadsheet} onChange={(event) => updateField('name', event.target.value)} placeholder="Ex: Matriz São Paulo" value={activeUnit.name} />{errors.name && <p className="login-field-error" id="unit-name-error" role="alert">{errors.name}</p>}{unitsFromSpreadsheet && <span className="set-address-field-help" id="unit-name-source">Nome identificado na planilha.</span>}</div>
                  <FormField id="unit-cep" label="CEP" autoComplete="postal-code" maxLength={9} inputMode="numeric" error={errors.cep || (postalCode.status === 'error' ? postalCode.message : '')} onChange={event => handleMaskedInput(event, formatCep, cep => updateField('cep', cep))} placeholder="00000-000" value={activeUnit.cep} />
                  <FormField id="unit-state" label="Estado" autoComplete="address-level1" maxLength={2} error={errors.state} onChange={event => updateField('state', formatState(event.target.value))} placeholder="SP" value={activeUnit.state} />
                </div>
                <div className="set-address-row set-address-row--middle">
                  <FormField id="unit-city" label="Cidade" autoComplete="address-level2" maxLength={80} error={errors.city} onChange={event => updateField('city', event.target.value)} placeholder="Ex: São Paulo" value={activeUnit.city} />
                  <FormField id="unit-neighborhood" label="Bairro" maxLength={80} error={errors.neighborhood} onChange={event => updateField('neighborhood', event.target.value)} placeholder="Ex: Centro" value={activeUnit.neighborhood} />
                  <FormField id="unit-street" label="Rua" autoComplete="address-line1" maxLength={120} error={errors.street} onChange={event => updateField('street', event.target.value)} placeholder="Ex: Avenida Paulista" value={activeUnit.street} />
                </div>
                <div className="set-address-row set-address-row--last">
                  <FormField id="unit-number" label="Número" maxLength={12} error={errors.number} onChange={event => updateField('number', event.target.value)} placeholder="000" value={activeUnit.number} />
                  <FormField id="unit-complement" label="Complemento (opcional)" autoComplete="address-line2" maxLength={120} error={errors.complement} onChange={event => updateField('complement', event.target.value)} placeholder="Ex: Sala 402" value={activeUnit.complement} />
                </div>
              </div>
              {postalCode.message && postalCode.status !== 'error' && <p className="set-address-cep-feedback" id="unit-cep-feedback" role="status">{postalCode.message}</p>}
              {postalCode.status === 'error' && <PurpleButton auto variant="outline" className="set-address-cep-retry" onClick={retryPostalCode}>Consultar CEP novamente</PurpleButton>}
            </div>
          </div>

          <span className="set-address-position" aria-live="polite">Sede {activeIndex + 1} de {address.units.length}</span>
          <button
            aria-label="Próxima sede"
            className="set-address-arrow set-address-arrow--next"
            disabled={activeIndex === address.units.length - 1}
            onClick={() => changeUnit(() => moveUnit(1))}
            type="button"
          >
            <AstroIcon name="forward" />
          </button>
        </div>

        {!unitsFromSpreadsheet && <PurpleButton className="set-address-add" onClick={() => changeUnit(addUnit)} variant="outline">
          <AstroIcon name="plus" />
          Adicionar outra sede
        </PurpleButton>}
        <PurpleButton className="set-address-finish" disabled={postalCode.status === 'loading'} type="submit">{settingsMode ? 'Salvar alterações' : 'Finalizar workspace'}</PurpleButton>
      </form>
    </section>
  )
}

export default AddressForm
