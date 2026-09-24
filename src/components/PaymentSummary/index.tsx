import { Link } from 'react-router-dom'
import AstroIcon from '../AstroIcon'
import PurpleButton from '../PurpleButton'

const features = [
  { label: 'Mapeamento de NRs', icon: 'mapping' },
  { label: 'Alertas de vencimento', icon: 'expiry' },
  { label: 'Relatórios de conformidade', icon: 'report' },
] as const

interface PaymentSummaryProps {
  onCompletePurchase: () => void
}

function PaymentSummary({ onCompletePurchase }: PaymentSummaryProps) {

  return (
    <aside className="payment-summary" aria-label="Resumo da assinatura">
      <h2>Principais funcionalidades</h2>

      <ul className="feature-list">
        {features.map((feature) => (
          <li key={feature.label}>
            <span className="feature-icon-slot">
              <AstroIcon className="feature-icon" name={feature.icon} />
            </span>
            <span className="feature-label">{feature.label}</span>
          </li>
        ))}
      </ul>

      <div className="summary-divider" />

      <div className="payment-checkout">
        <div className="payment-total">
          <span>Pagamento inicial</span>
          <strong>R$ 10 reais</strong>
        </div>

        <PurpleButton className="finish-payment-button" onClick={onCompletePurchase}>
          Finalizar compra
        </PurpleButton>

        <p className="workspace-key-link">
          Já tem uma chave do workspace? <Link to="/createWorkspace">Verificar</Link>
        </p>
      </div>
    </aside>
  )
}

export default PaymentSummary
