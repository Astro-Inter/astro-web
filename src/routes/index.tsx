import { Route, Routes } from 'react-router-dom'
import { AccessKeyVerifiedPage, AttachExcelFilePage, CreatePasswordPage, CreateWorkspacePage, IncludeCompanyInformationPage, LoadingScreenPage, LoginPage, NotFoundPage, PaymentMethodPage, SetAddressPage, WorkspaceCreatedPage } from '../pages'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/paymentMethod" element={<PaymentMethodPage />} />
      <Route path="/createWorkspace" element={<CreateWorkspacePage />} />
      <Route path="/accessKeyVerified" element={<AccessKeyVerifiedPage />} />
      <Route path="/createPassword" element={<CreatePasswordPage />} />
      <Route path="/includeCompanyInformation" element={<IncludeCompanyInformationPage />} />
      <Route path="/attachExcelFile" element={<AttachExcelFilePage />} />
      <Route path="/loadingScreen" element={<LoadingScreenPage />} />
      <Route path="/setAddress" element={<SetAddressPage />} />
      <Route path="/workspaceCreated" element={<WorkspaceCreatedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default AppRoutes
