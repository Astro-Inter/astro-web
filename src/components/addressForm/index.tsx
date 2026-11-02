import { BUTTONS } from '../../gtm/buttons'
import type { useWorkspaceAddresses } from '../../hooks/useWorkspaceAddresses'
import { formatCep, formatState, handleMaskedInput } from '../../utils/inputFormatting'
import AstroIcon from '../astroIcon'
import PurpleButton from '../purpleButton'
import type { WorkspaceUnitAddress } from '../../types/address'
import FormField from '../formField'
import { postalCodeFieldError } from '../../utils/postalCodeFeedback'
import ActionLoading from '../actionLoading'
import { useAddressForm } from '../../hooks/useAddressForm'

interface AddressFormProps {
  onComplete: (units: WorkspaceUnitAddress[]) => void
  settingsMode?: boolean
  unitsFromSpreadsheet?: boolean
  addresses: ReturnType<typeof useWorkspaceAddresses>
}

function AddressForm({ onComplete, settingsMode = false, unitsFromSpreadsheet = false, addresses }: AddressFormProps) {
  const { address, activeIndex, activeUnit, addUnit, removeUnit, moveUnit, postalCode } = addresses
  const { formRef, errors, hasChangedUnit, changeUnit, updateField, submit } = useAddressForm({ addresses, settingsMode, onComplete })
  const importedUnit = activeUnit.source === 'spreadsheet'

  return (
    <section className="set-address-content astro-scale-90" aria-labelledby="set-address-title">
      <header className="login-heading set-address-heading">
        <h1 id="set-address-title">{settingsMode ? 'Altere o endereço das unidades' : 'Defina o endereço das unidades'}</h1>
        <p>Informe o endereço de cada unidade para que<br className="set-address-desktop-break" /> possamos identificar sua localização.</p>
      </header>

      <ActionLoading active={addresses.validatingPostalCodes} />
      <form aria-busy={addresses.validatingPostalCodes} inert={addresses.validatingPostalCodes} data-track-submit={settingsMode ? BUTTONS.comuns.salvar_alteracoes : BUTTONS.comuns.finalizar_workspace} ref={formRef} className="set-address-form" noValidate onSubmit={submit}>
        <div className="set-address-carousel">
          <button data-track-action={BUTTONS.comuns.sede_anterior}
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
                    <h2>{unitsFromSpreadsheet && importedUnit ? activeUnit.name : `Sede ${activeIndex + 1}`}</h2>
                    <p>{importedUnit ? 'Unidade importada da planilha' : 'Informe os dados da unidade'}</p>
                  </div>
                </div>
                  {!importedUnit && !activeUnit.persistedId && <PurpleButton data-track-action={BUTTONS.comuns.remover_rede} aria-label="Remover sede" auto className="set-address-remove" onClick={() => {
                    changeUnit(removeUnit)
                    requestAnimationFrame(() => formRef.current?.querySelector<HTMLButtonElement>('.set-address-add')?.focus())
                  }} variant="danger">
                  <AstroIcon name="trash" strokeScale={0.9} />
                  <span className="set-address-remove-label">Remover sede</span>
                </PurpleButton>}
              </div>

              <div className="set-address-fields">
                <div className="set-address-row set-address-row--first">
                  <div className="field-group"><label htmlFor="unit-name">Nome da sede</label><input id="unit-name" aria-invalid={Boolean(errors.name)} aria-describedby={[errors.name ? 'unit-name-error' : '', importedUnit ? 'unit-name-source' : ''].filter(Boolean).join(' ') || undefined} maxLength={settingsMode ? 255 : 80} readOnly={importedUnit} onChange={(event) => updateField('name', event.target.value)} placeholder="Ex: Matriz São Paulo" value={activeUnit.name} />{errors.name && <p className="login-field-error" id="unit-name-error" role="alert">{errors.name}</p>}{importedUnit && <span className="sr-only" id="unit-name-source">Nome identificado na planilha.</span>}</div>
                  <FormField id="unit-cep" label="CEP" autoComplete="postal-code" maxLength={9} inputMode="numeric" error={errors.cep || (postalCode.status === 'error' ? postalCodeFieldError(postalCode.message) : '')} aria-describedby={postalCode.message && postalCode.status !== 'error' ? 'unit-cep-feedback' : undefined} onChange={event => handleMaskedInput(event, formatCep, cep => updateField('cep', cep))} placeholder="00000-000" value={formatCep(activeUnit.cep)} />
                  <FormField id="unit-state" label="Estado" autoComplete="address-level1" maxLength={2} error={errors.state} onChange={event => updateField('state', formatState(event.target.value))} placeholder="SP" value={activeUnit.state} />
                </div>
                {postalCode.message && postalCode.status !== 'error' && <p className="set-address-cep-feedback" id="unit-cep-feedback" role="status">{postalCode.message}</p>}
                <div className="set-address-row set-address-row--middle">
                  <FormField id="unit-city" label="Cidade" autoComplete="address-level2" maxLength={settingsMode ? 255 : 80} error={errors.city} onChange={event => updateField('city', event.target.value)} placeholder="Ex: São Paulo" value={activeUnit.city} />
                  <FormField id="unit-neighborhood" label="Bairro" maxLength={settingsMode ? 255 : 80} error={errors.neighborhood} onChange={event => updateField('neighborhood', event.target.value)} placeholder="Ex: Centro" value={activeUnit.neighborhood} />
                  <FormField id="unit-street" label="Rua" autoComplete="address-line1" maxLength={settingsMode ? 255 : 120} error={errors.street} onChange={event => updateField('street', event.target.value)} placeholder="Ex: Avenida Paulista" value={activeUnit.street} />
                </div>
                <div className="set-address-row set-address-row--last">
                  <FormField id="unit-number" label="Número" maxLength={settingsMode ? 30 : 12} error={errors.number} onChange={event => updateField('number', event.target.value)} placeholder="000" value={activeUnit.number} />
                  <FormField id="unit-complement" label="Complemento (opcional)" autoComplete="address-line2" maxLength={settingsMode ? 255 : 120} error={errors.complement} onChange={event => updateField('complement', event.target.value)} placeholder="Ex: Sala 402" value={activeUnit.complement} />
                </div>
              </div>
            </div>
          </div>

          <span className="set-address-position" aria-live="polite">Sede {activeIndex + 1} de {address.units.length}</span>
          <button data-track-action={BUTTONS.comuns.proxima_sede}
            aria-label="Próxima sede"
            className="set-address-arrow set-address-arrow--next"
            disabled={activeIndex === address.units.length - 1}
            onClick={() => changeUnit(() => moveUnit(1))}
            type="button"
          >
            <AstroIcon name="forward" />
          </button>
        </div>

        <PurpleButton data-track-action={BUTTONS.comuns.adicionar_sede} className="set-address-add" onClick={() => {
          changeUnit(addUnit)
          requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>('#unit-name')?.focus())
        }} variant="outline">
          <AstroIcon name="plus" />
          Adicionar outra sede
        </PurpleButton>
        <PurpleButton data-track-action={settingsMode ? BUTTONS.comuns.salvar_alteracoes : BUTTONS.comuns.finalizar_workspace} className="set-address-finish" disabled={postalCode.status === 'loading' || addresses.validatingPostalCodes} type="submit">{settingsMode ? 'Salvar alterações' : 'Finalizar workspace'}</PurpleButton>
      </form>
    </section>
  )
}

export default AddressForm
