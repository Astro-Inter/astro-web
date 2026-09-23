import { useWorkspaceAddresses } from '../../hooks/useWorkspaceAddresses'
import { digitsOnly, formatCep, formatState, handleMaskedInput } from '../../utils/inputFormatting'
import AstroIcon from '../AstroIcon'
import PurpleButton from '../PurpleButton'

interface SetAddressFormProps {
  onComplete: () => void
}

function SetAddressForm({ onComplete }: SetAddressFormProps) {
  const { address, activeIndex, activeUnit, changeField, addUnit, removeUnit, moveUnit } = useWorkspaceAddresses()

  return (
    <section className="set-address-content astro-scale-90" aria-labelledby="set-address-title">
      <header className="login-heading set-address-heading">
        <h1 id="set-address-title">Defina o endereço das unidades</h1>
        <p>Informe o endereço de cada unidade para que<br className="set-address-desktop-break" /> possamos identificar sua localização.</p>
      </header>

      <form className="set-address-form" noValidate onSubmit={(event) => { event.preventDefault(); onComplete() }}>
        <div className="set-address-carousel">
          <button
            aria-label="Sede anterior"
            className="set-address-arrow set-address-arrow--previous"
            disabled={activeIndex === 0}
            onClick={() => moveUnit(-1)}
            type="button"
          >
            <AstroIcon name="back" />
          </button>

          <div
            className="set-address-card is-switching"
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
                    <h2>Sede {activeIndex + 1}</h2>
                    <p>Informe os dados da unidade</p>
                  </div>
                </div>
                <PurpleButton auto className="set-address-remove" onClick={removeUnit} variant="danger">
                  <AstroIcon name="trash" strokeScale={0.9} />
                  Remover sede
                </PurpleButton>
              </div>

              <div className="set-address-fields">
                <div className="set-address-row set-address-row--first">
                  <div className="field-group"><label htmlFor="unit-name">Nome da sede</label><input id="unit-name" maxLength={80} onChange={(event) => changeField('name', event.target.value)} placeholder="Ex: Matriz São Paulo" value={activeUnit.name} /></div>
                  <div className="field-group"><label htmlFor="unit-cep">CEP</label><input autoComplete="postal-code" id="unit-cep" inputMode="numeric" maxLength={9} onChange={(event) => handleMaskedInput(event, formatCep, (cep) => changeField('cep', cep))} placeholder="00000-000" value={activeUnit.cep} /></div>
                  <div className="field-group"><label htmlFor="unit-state">Estado</label><input autoComplete="address-level1" id="unit-state" maxLength={2} onChange={(event) => changeField('state', formatState(event.target.value))} placeholder="SP" value={activeUnit.state} /></div>
                </div>
                <div className="set-address-row set-address-row--middle">
                  <div className="field-group"><label htmlFor="unit-city">Cidade</label><input autoComplete="address-level2" id="unit-city" maxLength={80} onChange={(event) => changeField('city', event.target.value)} placeholder="Ex: São Paulo" value={activeUnit.city} /></div>
                  <div className="field-group"><label htmlFor="unit-neighborhood">Bairro</label><input id="unit-neighborhood" maxLength={80} onChange={(event) => changeField('neighborhood', event.target.value)} placeholder="Ex: Centro" value={activeUnit.neighborhood} /></div>
                  <div className="field-group"><label htmlFor="unit-street">Rua</label><input autoComplete="address-line1" id="unit-street" maxLength={120} onChange={(event) => changeField('street', event.target.value)} placeholder="Ex: Avenida Paulista" value={activeUnit.street} /></div>
                </div>
                <div className="set-address-row set-address-row--last">
                  <div className="field-group"><label htmlFor="unit-number">Número</label><input id="unit-number" inputMode="numeric" maxLength={12} onChange={(event) => changeField('number', digitsOnly(event.target.value, 12))} placeholder="000" value={activeUnit.number} /></div>
                  <div className="field-group"><label htmlFor="unit-complement">Complemento (opcional)</label><input autoComplete="address-line2" id="unit-complement" maxLength={120} onChange={(event) => changeField('complement', event.target.value)} placeholder="Ex: Sala 402" value={activeUnit.complement} /></div>
                </div>
              </div>
            </div>
          </div>

          <button
            aria-label="Próxima sede"
            className="set-address-arrow set-address-arrow--next"
            disabled={activeIndex === address.units.length - 1}
            onClick={() => moveUnit(1)}
            type="button"
          >
            <AstroIcon name="forward" />
          </button>
        </div>

        <PurpleButton className="set-address-add" onClick={addUnit} variant="outline">
          <AstroIcon name="plus" />
          Adicionar outra sede
        </PurpleButton>
        <PurpleButton className="set-address-finish" type="submit">Finalizar workspace</PurpleButton>
      </form>
    </section>
  )
}

export default SetAddressForm
