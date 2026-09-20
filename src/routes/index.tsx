import { Route, Routes } from 'react-router-dom'
import { CreateWorkspacePage, LoginPage, PaymentMethodPage } from '../pages'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/paymentMethod" element={<PaymentMethodPage />} />
      <Route path="/createWorkspace" element={<CreateWorkspacePage />} />
    </Routes>
  )
}

export default AppRoutes
