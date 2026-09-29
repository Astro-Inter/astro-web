import { Route, Routes, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect, useRef, useState, useTransition } from 'react'
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
const MainFormScreenPage = lazy(() => import('../pages/MainFormScreen'))
const NotFoundPage = lazy(() => import('../pages/NotFound'))
const PaymentMethodPage = lazy(() => import('../pages/PaymentMethod'))
const SetAddressPage = lazy(() => import('../pages/SetAddress'))
const WorkspaceCreatedPage = lazy(() => import('../pages/WorkspaceCreated'))

function AppRoutes() {
  const location = useLocation()
  const [displayedLocation, setDisplayedLocation] = useState(location)
  const exiting = location.key !== displayedLocation.key
  const [, startTransition] = useTransition()
  const routeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (location.key === displayedLocation.key) return
    startTransition(() => {
      setDisplayedLocation(location)
    })
  }, [location, displayedLocation.key, startTransition])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    const heading = routeRef.current?.querySelector('h1')
    if (heading) {
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    }
  }, [displayedLocation.key])

  return (
    <Suspense fallback={<RouteLoading />}>
    <div className={`astro-route-transition${exiting ? ' astro-route-transition--exiting' : ''}`} key={displayedLocation.key} ref={routeRef}>
      <Routes location={displayedLocation}>
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
        <Route path="/mainFormScreen" element={<MainFormScreenPage />} />
        <Route path="/createForms" element={<CreateFormsPage />} />
        <Route path="/editForms" element={<EditFormsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
    </Suspense>
  )
}

export default AppRoutes
