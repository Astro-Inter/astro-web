import { Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import RouteLoading from '../components/RouteLoading'

const AccessKeyVerifiedPage = lazy(() => import('../pages/AccessKeyVerified'))
const AttachExcelFilePage = lazy(() => import('../pages/AttachExcelFile'))
const CreateFormsPage = lazy(() => import('../pages/CreateForms'))
const CreatePasswordPage = lazy(() => import('../pages/CreatePassword'))
const CreateWorkspacePage = lazy(() => import('../pages/CreateWorkspace'))
const EditFormsPage = lazy(() => import('../pages/EditForms'))
const IncludeCompanyInformationPage = lazy(() => import('../pages/IncludeCompanyInformation'))
const LoadingScreenPage = lazy(() => import('../pages/LoadingScreen'))
const LoginPage = lazy(() => import('../pages/Login'))
const MainPositionScreenPage = lazy(() => import('../pages/MainPositionScreen'))
const NotFoundPage = lazy(() => import('../pages/NotFound'))
const PaymentMethodPage = lazy(() => import('../pages/PaymentMethod'))
const SetAddressPage = lazy(() => import('../pages/SetAddress'))
const WorkspaceCreatedPage = lazy(() => import('../pages/WorkspaceCreated'))

function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoading />}>
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
        <Route path="/mainPositionScreen" element={<MainPositionScreenPage />} />
        <Route path="/createForms" element={<CreateFormsPage />} />
        <Route path="/editForms" element={<EditFormsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
