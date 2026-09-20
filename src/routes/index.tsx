import { Route, Routes } from 'react-router-dom'
import { LoginPage, PaymentMethodPage } from '../pages'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/paymentMethod" element={<PaymentMethodPage />} />
    </Routes>
  )
}

export default AppRoutes
