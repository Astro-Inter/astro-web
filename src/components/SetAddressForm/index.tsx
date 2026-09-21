import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { WorkspaceUnitAddress } from '../../types/address'

interface AddressState {
  units: WorkspaceUnitAddress[]
  activeId: number
  nextId: number
}

type AddressField = Exclude<keyof WorkspaceUnitAddress, 'id'>

function emptyUnit(id: number): WorkspaceUnitAddress {
  return { id, name: '', cep: '', state: '', city: '', neighborhood: '', street: '', number: '', complement: '' }
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

function SetAddressForm() {
  const navigate = useNavigate()
  // O protótipo já mostra a navegação para uma segunda sede a partir da primeira.
  const [address, setAddress] = useState<AddressState>({ units: [emptyUnit(1), emptyUnit(2)], activeId: 1, nextId: 3 })
  const activeIndex = address.units.findIndex((unit) => unit.id === address.activeId)
  const activeUnit = address.units[activeIndex]

  function changeField(field: AddressField, value: string) {
    setAddress((current) => ({
      ...current,
      units: current.units.map((unit) => unit.id === current.activeId ? { ...unit, [field]: value } : unit),
    }))
  }

  function addUnit() {
    setAddress((current) => ({
      units: [...current.units, emptyUnit(current.nextId)],
      activeId: current.nextId,
      nextId: current.nextId + 1,
    }))
  }

  function removeUnit() {
    setAddress((current) => {
      if (current.units.length === 1) {
        return { ...current, units: [emptyUnit(current.activeId)] }
      }

      const currentIndex = current.units.findIndex((unit) => unit.id === current.activeId)
      const remaining = current.units.filter((unit) => unit.id !== current.activeId)
      return {
        ...current,
        units: remaining,
        activeId: remaining[Math.min(currentIndex, remaining.length - 1)].id,
      }
    })
  }

  function moveUnit(direction: -1 | 1) {
    const next = address.units[activeIndex + direction]
    if (next) setAddress((current) => ({ ...current, activeId: next.id }))
  }

  return (
    <section className="set-address-content" aria-labelledby="set-address-title">
      <header className="login-heading set-address-heading">
        <h1 id="set-address-title">Defina o endereço das unidades</h1>
        <p>Informe o endereço de cada unidade para que<br className="set-address-desktop-break" /> possamos identificar sua localização.</p>
      </header>

      <form className="set-address-form" noValidate onSubmit={(event) => { event.preventDefault(); navigate('/loadingScreen') }}>
        <div className="set-address-carousel">
          <button
            aria-label="Sede anterior"
            className="set-address-arrow set-address-arrow--previous"
            disabled={activeIndex === 0}
            onClick={() => moveUnit(-1)}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m14.5 5-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>

          <div className="set-address-card" aria-label={`Sede ${activeIndex + 1} de ${address.units.length}`}>
            <div className="set-address-card-header">
              <div className="set-address-card-identification">
                <span className="set-address-building" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 10h2a2 2 0 0 1 2 2v9M2 21h20M8 7h4M8 11h4M8 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <div aria-live="polite">
                  <h2>Sede {activeIndex + 1}</h2>
                  <p>Informe os dados da unidade</p>
                </div>
              </div>
              <button className="set-address-remove" onClick={removeUnit} type="button">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v6m4-6v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Remover sede
              </button>
            </div>

            <div className="set-address-fields">
              <div className="set-address-row set-address-row--first">
                <div className="field-group"><label htmlFor="unit-name">Nome da sede</label><input id="unit-name" maxLength={80} onChange={(event) => changeField('name', event.target.value)} placeholder="Ex: Matriz São Paulo" value={activeUnit.name} /></div>
                <div className="field-group"><label htmlFor="unit-cep">CEP</label><input autoComplete="postal-code" id="unit-cep" inputMode="numeric" maxLength={9} onChange={(event) => changeField('cep', formatCep(event.target.value))} placeholder="00000-000" value={activeUnit.cep} /></div>
                <div className="field-group"><label htmlFor="unit-state">Estado</label><input autoComplete="address-level1" id="unit-state" maxLength={2} onChange={(event) => changeField('state', event.target.value.toUpperCase().slice(0, 2))} placeholder="SP" value={activeUnit.state} /></div>
              </div>
              <div className="set-address-row set-address-row--middle">
                <div className="field-group"><label htmlFor="unit-city">Cidade</label><input autoComplete="address-level2" id="unit-city" maxLength={80} onChange={(event) => changeField('city', event.target.value)} placeholder="Ex: São Paulo" value={activeUnit.city} /></div>
                <div className="field-group"><label htmlFor="unit-neighborhood">Bairro</label><input id="unit-neighborhood" maxLength={80} onChange={(event) => changeField('neighborhood', event.target.value)} placeholder="Ex: Centro" value={activeUnit.neighborhood} /></div>
                <div className="field-group"><label htmlFor="unit-street">Rua</label><input autoComplete="address-line1" id="unit-street" maxLength={120} onChange={(event) => changeField('street', event.target.value)} placeholder="Ex: Avenida Paulista" value={activeUnit.street} /></div>
              </div>
              <div className="set-address-row set-address-row--last">
                <div className="field-group"><label htmlFor="unit-number">Número</label><input id="unit-number" inputMode="numeric" maxLength={12} onChange={(event) => changeField('number', event.target.value)} placeholder="000" value={activeUnit.number} /></div>
                <div className="field-group"><label htmlFor="unit-complement">Complemento (opcional)</label><input autoComplete="address-line2" id="unit-complement" maxLength={120} onChange={(event) => changeField('complement', event.target.value)} placeholder="Ex: Sala 402" value={activeUnit.complement} /></div>
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
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m9.5 5 7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>

        <button className="set-address-add" onClick={addUnit} type="button">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          Adicionar outra sede
        </button>
        <button className="set-address-finish" type="submit">Finalizar workspace</button>
      </form>
    </section>
  )
}

export default SetAddressForm
