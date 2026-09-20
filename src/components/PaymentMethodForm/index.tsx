import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import AstroIcon from '../AstroIcon'
import ChargeExplanationModal from '../ChargeExplanationModal'
import type { PaymentFormState, PaymentMethod } from '../../types'

function PaymentMethodForm() {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card')
  const [isExplanationOpen, setIsExplanationOpen] = useState(false)
  const explanationTrigger = useRef<HTMLButtonElement>(null)
  const [formState, setFormState] = useState<PaymentFormState>({
    email: '',
    cardNumber: '',
    expiry: '',
    securityCode: '',
    taxId: '',
    fullName: '',
  })

  function updateField(field: keyof PaymentFormState, value: string) {
    setFormState((currentState) => ({ ...currentState, [field]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  function closeExplanation() {
    setIsExplanationOpen(false)
    explanationTrigger.current?.focus()
  }

  return (
    <>
      <form className="payment-form" onSubmit={handleSubmit}>
        <div className="payment-field payment-email-field">
          <label htmlFor="payment-email">E-mail</label>
          <input
            autoComplete="email"
            id="payment-email"
            name="email"
            onChange={(event) => updateField('email', event.target.value)}
            placeholder="seu.email@exemplo.com"
            type="email"
            value={formState.email}
          />
        </div>

        <div className="payment-divider" />

        <fieldset className="payment-method-options">
          <legend className="sr-only">Método de pagamento</legend>
          <button
            aria-pressed={selectedMethod === 'card'}
            className={`payment-method-option${selectedMethod === 'card' ? ' is-selected' : ''}`}
            onClick={() => setSelectedMethod('card')}
            type="button"
          >
            <AstroIcon className="card-symbol" name="card" />
            Cartão
          </button>
          <button
            aria-pressed={selectedMethod === 'pix'}
            className={`payment-method-option${selectedMethod === 'pix' ? ' is-selected' : ''}`}
            onClick={() => setSelectedMethod('pix')}
            type="button"
          >
            <AstroIcon className="pix-symbol" name="pix" />
            Pix
          </button>
        </fieldset>

        {selectedMethod === 'card' ? (
          <div className="card-fields">
            <div className="payment-field">
              <label htmlFor="card-number">Número do cartão</label>
              <input
                autoComplete="cc-number"
                id="card-number"
                inputMode="numeric"
                name="card-number"
                onChange={(event) => updateField('cardNumber', event.target.value)}
                placeholder="0000 0000 0000 0000"
                value={formState.cardNumber}
              />
            </div>

            <div className="card-details-row">
              <div className="payment-field">
                <label htmlFor="card-expiry">Data de validade</label>
                <input
                  autoComplete="cc-exp"
                  id="card-expiry"
                  inputMode="numeric"
                  name="card-expiry"
                  onChange={(event) => updateField('expiry', event.target.value)}
                  placeholder="MM / AA"
                  value={formState.expiry}
                />
              </div>
              <div className="payment-field security-field">
                <label htmlFor="card-security">Código de segurança</label>
                <div className="security-input-wrap">
                  <input
                    autoComplete="cc-csc"
                    id="card-security"
                    inputMode="numeric"
                    name="card-security"
                    onChange={(event) => updateField('securityCode', event.target.value)}
                    placeholder="CVV"
                    value={formState.securityCode}
                  />
                  <AstroIcon className="security-icon" name="security" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="pix-fields">
            <div className="payment-field">
              <label htmlFor="pix-tax-id">CPF ou CNPJ</label>
              <input
                autoComplete="off"
                id="pix-tax-id"
                inputMode="numeric"
                name="tax-id"
                onChange={(event) => updateField('taxId', event.target.value)}
                placeholder="0000 0000 0000 0000"
                value={formState.taxId}
              />
            </div>

            <div className="payment-field">
              <label htmlFor="pix-full-name">Nome completo</label>
              <input
                autoComplete="name"
                id="pix-full-name"
                name="full-name"
                onChange={(event) => updateField('fullName', event.target.value)}
                placeholder="Digite seu nome completo"
                value={formState.fullName}
              />
            </div>
          </div>
        )}

        <button
          className="payment-info-link"
          onClick={() => setIsExplanationOpen(true)}
          ref={explanationTrigger}
          type="button"
        >
          Entenda como funciona o nosso pagamento
        </button>
      </form>
      <ChargeExplanationModal onDismiss={closeExplanation} open={isExplanationOpen} />
    </>
  )
}

export default PaymentMethodForm
