import { Link, useNavigate } from 'react-router-dom'
import AstroIcon from '../AstroIcon'

const features = [
  { label: 'Mapeamento de NRs', icon: 'mapping' },
  { label: 'Alertas de vencimento', icon: 'expiry' },
  { label: 'Relatórios de conformidade', icon: 'report' },
] as const

function PaymentSummary() {
  const navigate = useNavigate()

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

        <button className="finish-payment-button" onClick={() => navigate('/createWorkspace')} type="button">
          Finalizar compra
        </button>

        <p className="workspace-key-link">
          Já tem uma chave do workspace? <Link to="/createWorkspace">Verificar</Link>
        </p>
      </div>
    </aside>
  )
}

export default PaymentSummary
