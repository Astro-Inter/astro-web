import AstroIcon from '../AstroIcon'

const features = [
  { label: 'Mapeamento de NRs', icon: 'mapping' },
  { label: 'Alertas de vencimento', icon: 'expiry' },
  { label: 'Relatórios de conformidade', icon: 'report' },
] as const

function PaymentSummary() {
  return (
    <aside className="payment-summary" aria-label="Resumo da assinatura">
      <h2>Principais funcionalidades</h2>

      <ul className="feature-list">
        {features.map((feature) => (
          <li key={feature.label}>
            <AstroIcon className="feature-icon" name={feature.icon} />
            {feature.label}
          </li>
        ))}
      </ul>

      <div className="summary-divider" />

      <div className="payment-checkout">
        <div className="payment-total">
          <span>Pagamento inicial</span>
          <strong>R$ 10 reais</strong>
        </div>

        <button className="finish-payment-button" type="button">
          Finalizar compra
        </button>

        <p className="workspace-key-link">
          Já tem uma chave do workspace? <a href="#verify-workspace">Verificar</a>
        </p>
      </div>
    </aside>
  )
}

export default PaymentSummary
