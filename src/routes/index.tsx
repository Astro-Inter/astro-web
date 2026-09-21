import { Route, Routes } from 'react-router-dom'
import { AccessKeyVerifiedPage, CreatePasswordPage, CreateWorkspacePage, IncludeCompanyInformationPage, LoginPage, PaymentMethodPage } from '../pages'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/paymentMethod" element={<PaymentMethodPage />} />
      <Route path="/createWorkspace" element={<CreateWorkspacePage />} />
      <Route path="/accessKeyVerified" element={<AccessKeyVerifiedPage />} />
      <Route path="/createPassword" element={<CreatePasswordPage />} />
      <Route path="/includeCompanyInformation" element={<IncludeCompanyInformationPage />} />
    </Routes>
  )
}

export default AppRoutes
