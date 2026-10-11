import { useState } from 'react'
import type { useWorkspaceAddresses } from '../../hooks/useWorkspaceAddresses'
import { formatCep, formatState, handleMaskedInput } from '../../utils/inputFormatting'
import AstroIcon from '../astroIcon'
import PurpleButton from '../purpleButton'
import { validateRegistrationUnits } from '../../utils/workspaceRegistration'
import type { WorkspaceUnitAddress } from '../../types/address'

interface AddressFormProps {
  onComplete: (units: WorkspaceUnitAddress[]) => void
  settingsMode?: boolean
  unitsFromSpreadsheet?: boolean
  addresses: ReturnType<typeof useWorkspaceAddresses>
}

function AddressForm({ onComplete, settingsMode = false, unitsFromSpreadsheet = false, addresses }: AddressFormProps) {
  const { address, activeIndex, activeUnit, changeField, addUnit, removeUnit, moveUnit, postalCode, retryPostalCode } = addresses
  const [error, setError] = useState('')
  const [hasChangedUnit, setHasChangedUnit] = useState(false)

  function changeUnit(action: () => void) {
    setHasChangedUnit(true)
    action()
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
        const message = settingsMode ? '' : validateRegistrationUnits(address.units)
        setError(message)
        if (!message) onComplete(address.units)
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
                  <div className="field-group"><label htmlFor="unit-name">Nome da sede</label><input id="unit-name" maxLength={80} readOnly={unitsFromSpreadsheet} aria-describedby={unitsFromSpreadsheet ? 'unit-name-source' : undefined} onChange={(event) => changeField('name', event.target.value)} placeholder="Ex: Matriz São Paulo" value={activeUnit.name} />{unitsFromSpreadsheet && <span className="set-address-field-help" id="unit-name-source">Nome identificado na planilha.</span>}</div>
                  <div className="field-group"><label htmlFor="unit-cep">CEP</label><input autoComplete="postal-code" id="unit-cep" inputMode="numeric" maxLength={9} aria-describedby={postalCode.message ? 'unit-cep-feedback' : undefined} onChange={(event) => handleMaskedInput(event, formatCep, (cep) => changeField('cep', cep))} placeholder="00000-000" value={activeUnit.cep} /></div>
                  <div className="field-group"><label htmlFor="unit-state">Estado</label><input autoComplete="address-level1" id="unit-state" maxLength={2} onChange={(event) => changeField('state', formatState(event.target.value))} placeholder="SP" value={activeUnit.state} /></div>
                </div>
                <div className="set-address-row set-address-row--middle">
                  <div className="field-group"><label htmlFor="unit-city">Cidade</label><input autoComplete="address-level2" id="unit-city" maxLength={80} onChange={(event) => changeField('city', event.target.value)} placeholder="Ex: São Paulo" value={activeUnit.city} /></div>
                  <div className="field-group"><label htmlFor="unit-neighborhood">Bairro</label><input id="unit-neighborhood" maxLength={80} onChange={(event) => changeField('neighborhood', event.target.value)} placeholder="Ex: Centro" value={activeUnit.neighborhood} /></div>
                  <div className="field-group"><label htmlFor="unit-street">Rua</label><input autoComplete="address-line1" id="unit-street" maxLength={120} onChange={(event) => changeField('street', event.target.value)} placeholder="Ex: Avenida Paulista" value={activeUnit.street} /></div>
                </div>
                <div className="set-address-row set-address-row--last">
                  <div className="field-group"><label htmlFor="unit-number">Número</label><input id="unit-number" maxLength={12} onChange={(event) => changeField('number', event.target.value)} placeholder="000" value={activeUnit.number} /></div>
                  <div className="field-group"><label htmlFor="unit-complement">Complemento (opcional)</label><input autoComplete="address-line2" id="unit-complement" maxLength={120} onChange={(event) => changeField('complement', event.target.value)} placeholder="Ex: Sala 402" value={activeUnit.complement} /></div>
                </div>
              </div>
              {postalCode.message && <p className={`set-address-cep-feedback${postalCode.status === 'error' ? ' is-error' : ''}`} id="unit-cep-feedback" role={postalCode.status === 'error' ? 'alert' : 'status'}>{postalCode.message}</p>}
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
        {error && <p className="login-field-error" role="alert">{error}</p>}
        <PurpleButton className="set-address-finish" disabled={postalCode.status === 'loading'} type="submit">{settingsMode ? 'Salvar alterações' : 'Finalizar workspace'}</PurpleButton>
      </form>
    </section>
  )
}

export default AddressForm
