import { useSearchParams } from 'react-router-dom'
import PaymentMethodPage from '../paymentMethodRegistration'
import WorkspacePaymentSettingsPage from '../workspacePaymentSettings'

function PaymentMethodRoute() {
  const [searchParams] = useSearchParams()
  return searchParams.get('context') === 'settings' ? <WorkspacePaymentSettingsPage /> : <PaymentMethodPage />
}

export default PaymentMethodRoute
