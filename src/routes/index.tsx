import { Route, Routes, useLocation, type Location } from 'react-router-dom'
import { lazy, Suspense, useEffect, useRef, useState, useTransition } from 'react'
import { flushSync } from 'react-dom'

const AccessKeyVerifiedPage = lazy(() => import('../pages/AccessKeyVerified'))
const loadAttachExcelFile = () => import('../pages/AttachExcelFile')
const AttachExcelFilePage = lazy(loadAttachExcelFile)
const CreateFormsPage = lazy(() => import('../pages/CreateForms'))
const CreatePasswordPage = lazy(() => import('../pages/CreatePassword'))
const CreateWorkspacePage = lazy(() => import('../pages/CreateWorkspace'))
const EditFormsPage = lazy(() => import('../pages/EditForms'))
const loadCompanyInformation = () => import('../pages/IncludeCompanyInformation')
const IncludeCompanyInformationPage = lazy(loadCompanyInformation)
const LoadingScreenPage = lazy(() => import('../pages/LoadingScreen'))
const LoginPage = lazy(() => import('../pages/Login'))
const loadPositions = () => import('../pages/MainPositionScreen')
const loadForms = () => import('../pages/MainFormScreen')
const loadEvents = () => import('../pages/MainEventScreen')
const loadWorkspaceSettings = () => import('../pages/MainWorkspaceSettingsScreen')
const loadAccountSettings = () => import('../pages/MainAccountScreen')
const MainPositionScreenPage = lazy(loadPositions)
const MainFormScreenPage = lazy(loadForms)
const MainEventScreenPage = lazy(loadEvents)
const MainWorkspaceSettingsScreenPage = lazy(loadWorkspaceSettings)
const MainAccountScreenPage = lazy(loadAccountSettings)
const NotFoundPage = lazy(() => import('../pages/NotFound'))
const loadPaymentMethod = () => import('../pages/PaymentMethod')
const loadSetAddress = () => import('../pages/SetAddress')
const PaymentMethodPage = lazy(loadPaymentMethod)
const SetAddressPage = lazy(loadSetAddress)
const WorkspaceCreatedPage = lazy(() => import('../pages/WorkspaceCreated'))

const settingsRouteLoaders: Record<string, () => Promise<unknown>> = {
  '/mainWorkspaceSettingsScreen': loadWorkspaceSettings,
  '/mainAccountScreen': loadAccountSettings,
  '/': () => import('../pages/Login'),
  '/includeCompanyInformation': loadCompanyInformation,
  '/attachExcelFile': loadAttachExcelFile,
  '/setAddress': loadSetAddress,
  '/paymentMethod': loadPaymentMethod,
  '/mainPositionScreen': loadPositions,
  '/mainFormScreen': loadForms,
  '/mainEventScreen': loadEvents,
}

function isSettingsLocation(location: Location): boolean {
  return ['/mainWorkspaceSettingsScreen', '/mainAccountScreen'].includes(location.pathname)
    || (['/includeCompanyInformation', '/attachExcelFile', '/setAddress', '/paymentMethod'].includes(location.pathname)
      && new URLSearchParams(location.search).get('context') === 'settings')
}

function AppRoutes() {
  const location = useLocation()
  const [displayedLocation, setDisplayedLocation] = useState(location)
  const [leavingKey, setLeavingKey] = useState<string | null>(null)
  const exiting = location.key !== displayedLocation.key
  const [, startTransition] = useTransition()
  const routeRef = useRef<HTMLDivElement>(null)
  const tabChangeRef = useRef(false)
  const [tabChange, setTabChange] = useState(false)
  const tabScrollRef = useRef(0)

  useEffect(() => {
    if (location.key === displayedLocation.key) return
    if (!isSettingsLocation(location) && !isSettingsLocation(displayedLocation)) {
      startTransition(() => setDisplayedLocation(location))
      return
    }

    let cancelled = false
    const isTabChange = ['/mainWorkspaceSettingsScreen', '/mainAccountScreen'].includes(location.pathname)
      && ['/mainWorkspaceSettingsScreen', '/mainAccountScreen'].includes(displayedLocation.pathname)
    if (isTabChange) {
      const scrollTop = window.scrollY
      void (settingsRouteLoaders[location.pathname]?.() ?? Promise.resolve()).then(() => {
        if (cancelled) return
        const update = () => {
          tabChangeRef.current = true
          tabScrollRef.current = scrollTop
          flushSync(() => { setTabChange(true); setDisplayedLocation(location) })
          window.scrollTo({ top: scrollTop, behavior: 'instant' })
        }
        if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          update()
          return
        }
        document.documentElement.classList.add('settings-tab-transition')
        const transition = document.startViewTransition(update)
        void transition.ready.catch(() => undefined)
        void transition.finished.finally(() => document.documentElement.classList.remove('settings-tab-transition'))
      })
      return () => { cancelled = true }
    }
    tabChangeRef.current = false
    // Carrega a próxima tela enquanto a atual ainda está visível.
    // A saída só começa quando o destino está pronto para evitar piscadas.
    const ready = settingsRouteLoaders[location.pathname]?.() ?? Promise.resolve()
    const beginExit = () => {
      if (!cancelled) { setTabChange(false); setLeavingKey(location.key) }
    }
    void ready.then(beginExit, beginExit)
    return () => { cancelled = true }
  }, [location, displayedLocation, startTransition])

  useEffect(() => {
    if (leavingKey !== location.key || !exiting) return
    let cancelled = false
    const scene = routeRef.current
    const animations = [
      ...(scene?.getAnimations() ?? []),
      ...Array.from(scene?.querySelectorAll('dialog[open]') ?? []).flatMap(dialog => dialog.getAnimations()),
    ]
    // Usa a duração real do CSS, inclusive quando o movimento está reduzido.
    void Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (cancelled) return
      startTransition(() => {
        setLeavingKey(null)
        setDisplayedLocation(location)
      })
    })
    return () => { cancelled = true }
  }, [displayedLocation.key, exiting, leavingKey, location, startTransition])

  useEffect(() => {
    window.scrollTo({ top: tabChangeRef.current ? tabScrollRef.current : 0, behavior: 'instant' })
    const heading = routeRef.current?.querySelector('h1')
    if (heading) {
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    }
  }, [displayedLocation.key])

  return (
    <Suspense fallback={null}>
    <div className={`astro-route-transition${tabChange ? ' astro-route-transition--tab-change' : ''}${isSettingsLocation(displayedLocation) ? ' astro-route-transition--settings-page' : ''}${exiting ? ' astro-route-transition--exiting' : ''}${exiting && leavingKey === location.key ? ' astro-route-transition--settings-leaving' : ''}`} key={displayedLocation.key} ref={routeRef}>
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
        <Route path="/mainEventScreen" element={<MainEventScreenPage />} />
        <Route path="/mainWorkspaceSettingsScreen" element={<MainWorkspaceSettingsScreenPage />} />
        <Route path="/mainAccountScreen" element={<MainAccountScreenPage />} />
        <Route path="/createForms" element={<CreateFormsPage />} />
        <Route path="/editForms" element={<EditFormsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
    </Suspense>
  )
}

export default AppRoutes
