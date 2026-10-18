import { Route, Routes, useLocation, type Location } from 'react-router-dom'
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, useTransition } from 'react'
import PrivateRoute from '../components/privateRoute'
import GuestRoute from '../components/guestRoute'
import { useAuthentication } from '../hooks/useAuthentication'

const MainHomeScreenPage = lazy(() => import('../pages/mainHomeScreen'))
const MainDashboardsScreenPage = lazy(() => import('../pages/mainDashboardsScreen'))
const AccessKeyVerifiedPage = lazy(() => import('../pages/accessKeyVerified'))
const loadAttachExcelFile = () => import('../pages/attachExcelFile')
const AttachExcelFilePage = lazy(loadAttachExcelFile)
const CreateFormPage = lazy(() => import('../pages/createForm'))
const CreatePasswordPage = lazy(() => import('../pages/createPassword'))
const CreateWorkspacePage = lazy(() => import('../pages/createWorkspace'))
const EditFormPage = lazy(() => import('../pages/editForm'))
const loadCompanyInformation = () => import('../pages/includeCompanyInformation')
const IncludeCompanyInformationPage = lazy(loadCompanyInformation)
const LoadingScreenPage = lazy(() => import('../pages/loadingScreen'))
const RegisterWorkspaceLoadingPage = lazy(() => import('../pages/registerWorkspaceLoading'))
const LoginPage = lazy(() => import('../pages/login'))
const loadManagers = () => import('../pages/mainManagerScreen')
const loadEmployees = () => import('../pages/mainEmployeerScreen')
const loadUnits = () => import('../pages/mainUnitScreen')
const loadConformities = () => import('../pages/mainConformityScreen')
const loadPositions = () => import('../pages/mainPositionScreen')
const loadForms = () => import('../pages/mainFormScreen')
const loadEvents = () => import('../pages/mainEventScreen')
const loadWorkspaceSettings = () => import('../pages/mainWorkspaceSettingsScreen')
const loadAccountSettings = () => import('../pages/mainAccountScreen')
const MainManagerScreenPage = lazy(loadManagers)
const MainEmployeerScreenPage = lazy(loadEmployees)
const MainUnitScreenPage = lazy(loadUnits)
const MainConformityScreenPage = lazy(loadConformities)
const MainPositionScreenPage = lazy(loadPositions)
const MainFormScreenPage = lazy(loadForms)
const MainEventScreenPage = lazy(loadEvents)
const MainWorkspaceSettingsScreenPage = lazy(loadWorkspaceSettings)
const MainAccountScreenPage = lazy(loadAccountSettings)
const NotFoundPage = lazy(() => import('../pages/notFound'))
const ErrorScreenLayoutPage = lazy(() => import('../pages/errorScreenLayout'))
const InactiveScreenLayoutPage = lazy(() => import('../pages/inactiveScreenLayout'))
const loadPaymentMethod = () => import('../pages/paymentMethod')
const loadSetAddress = () => import('../pages/setAddress')
const PaymentMethodPage = lazy(loadPaymentMethod)
const SetAddressPage = lazy(loadSetAddress)
const WorkspaceCreatedPage = lazy(() => import('../pages/workspaceCreated'))

const settingsRouteLoaders: Record<string, () => Promise<unknown>> = {
  '/mainWorkspaceSettingsScreen': loadWorkspaceSettings,
  '/mainAccountScreen': loadAccountSettings,
  '/': () => import('../pages/login'),
  '/includeCompanyInformation': loadCompanyInformation,
  '/attachExcelFile': loadAttachExcelFile,
  '/setAddress': loadSetAddress,
  '/paymentMethod': loadPaymentMethod,
  '/mainManagerScreen': loadManagers,
  '/mainEmployeerScreen': loadEmployees,
  '/mainUnitScreen': loadUnits,
  '/mainConformityScreen': loadConformities,
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
  const { user, status } = useAuthentication()
  const [displayedLocation, setDisplayedLocation] = useState(location)
  // O snapshot do logout precisa capturar o login já montado, sem esperar outro efeito.
  const renderedLocation = location.pathname === '/' && status === 'ready' && !user ? location : displayedLocation
  const [leavingKey, setLeavingKey] = useState<string | null>(null)
  const exiting = location.key !== displayedLocation.key
  const [, startTransition] = useTransition()
  const routeRef = useRef<HTMLDivElement>(null)
  const tabChangeRef = useRef(false)
  const [tabChange, setTabChange] = useState(false)
  const [tabFallback, setTabFallback] = useState(false)
  const tabScrollRef = useRef(0)
  const tabViewTransitionRef = useRef<ViewTransition | null>(null)
  const tabCommitRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (location.key === displayedLocation.key) return
    // Após sair, a rota privada já ocultou o conteúdo: não há tela para animar na saída.
    if (location.pathname === '/' && status === 'ready' && !user) {
      tabChangeRef.current = false
      startTransition(() => {
        setTabChange(false)
        setLeavingKey(null)
        setDisplayedLocation(location)
      })
      return
    }
    if (!isSettingsLocation(location) && !isSettingsLocation(displayedLocation)) {
      startTransition(() => setDisplayedLocation(location))
      return
    }

    let cancelled = false
    const isTabChange = ['/mainWorkspaceSettingsScreen', '/mainAccountScreen'].includes(location.pathname)
      && ['/mainWorkspaceSettingsScreen', '/mainAccountScreen'].includes(displayedLocation.pathname)
    if (isTabChange) {
      const scrollTop = window.scrollY
      const useSnapshots = Boolean(document.startViewTransition) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.dataset.astroReducedMotion !== 'true'
      void (settingsRouteLoaders[location.pathname]?.() ?? Promise.resolve()).then(() => {
        if (cancelled) return
        const update = () => new Promise<void>(resolve => {
          tabChangeRef.current = true
          tabScrollRef.current = scrollTop
          tabCommitRef.current?.()
          tabCommitRef.current = resolve
          // Na primeira visita, React.lazy ainda pode suspender após o preload.
          // A transition mantém a tela anterior e o snapshot aguarda o commit real.
          startTransition(() => { setTabChange(true); setTabFallback(!useSnapshots); setDisplayedLocation(location) })
        })
        if (!useSnapshots) {
          void update()
          return
        }
        tabViewTransitionRef.current?.skipTransition()
        document.documentElement.classList.add('settings-tab-transition')
        const transition = document.startViewTransition(update)
        tabViewTransitionRef.current = transition
        void transition.ready.catch(() => undefined)
        const finish = () => {
          if (tabViewTransitionRef.current !== transition) return
          tabViewTransitionRef.current = null
          document.documentElement.classList.remove('settings-tab-transition')
        }
        void transition.finished.then(finish, finish)
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
  }, [location, displayedLocation, startTransition, status, user])

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

  useLayoutEffect(() => {
    window.scrollTo({ top: tabChangeRef.current ? tabScrollRef.current : 0, behavior: 'instant' })
    const heading = routeRef.current?.querySelector('h1')
    if (heading) {
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    }
    const committed = tabCommitRef.current
    tabCommitRef.current = null
    committed?.()
  }, [displayedLocation.key])

  return (
    <Suspense fallback={null}>
    <div data-track-route={renderedLocation.pathname} data-track-search={renderedLocation.search} data-track-visit={renderedLocation.key} className={`astro-route-transition${tabChange ? ' astro-route-transition--tab-change' : ''}${tabChange && tabFallback ? ' astro-route-transition--tab-fallback' : ''}${isSettingsLocation(renderedLocation) ? ' astro-route-transition--settings-page' : ''}${exiting ? ' astro-route-transition--exiting' : ''}${exiting && leavingKey === location.key ? ' astro-route-transition--settings-leaving' : ''}`} key={renderedLocation.key} ref={routeRef}>
      <Routes location={renderedLocation}>
        <Route element={<GuestRoute />}>
          <Route path="/" element={<LoginPage />} />
          <Route path="/createWorkspace" element={<CreateWorkspacePage />} />
          <Route path="/accessKeyVerified" element={<AccessKeyVerifiedPage />} />
          <Route path="/createPassword" element={<CreatePasswordPage />} />
          <Route path="/workspaceCreated" element={<WorkspaceCreatedPage />} />
        </Route>
        <Route element={<PrivateRoute required={new URLSearchParams(displayedLocation.search).get('context') === 'settings'} />}>
          <Route element={<GuestRoute enabled={new URLSearchParams(displayedLocation.search).get('context') !== 'settings'} />}>
            <Route path="/includeCompanyInformation" element={<IncludeCompanyInformationPage />} />
            <Route path="/attachExcelFile" element={<AttachExcelFilePage />} />
            <Route path="/setAddress" element={<SetAddressPage />} />
            <Route path="/paymentMethod" element={<PaymentMethodPage />} />
          </Route>
        </Route>
        <Route element={<PrivateRoute />}>
          <Route path="/mainHomeScreen" element={<MainHomeScreenPage />} />
          <Route path="/mainDashboardsScreen" element={<MainDashboardsScreenPage />} />
          <Route path="/mainManagerScreen" element={<MainManagerScreenPage />} />
          <Route path="/mainEmployeerScreen" element={<MainEmployeerScreenPage />} />
          <Route path="/mainUnitScreen" element={<MainUnitScreenPage />} />
          <Route path="/mainConformityScreen" element={<MainConformityScreenPage />} />
          <Route path="/mainPositionScreen" element={<MainPositionScreenPage />} />
          <Route path="/mainFormScreen" element={<MainFormScreenPage />} />
          <Route path="/mainEventScreen" element={<MainEventScreenPage />} />
          <Route path="/mainWorkspaceSettingsScreen" element={<MainWorkspaceSettingsScreenPage />} />
          <Route path="/mainAccountScreen" element={<MainAccountScreenPage />} />
          <Route path="/createForms" element={<CreateFormPage />} />
          <Route path="/editForms" element={<EditFormPage />} />
        </Route>
        <Route element={<PrivateRoute required={new URLSearchParams(displayedLocation.search).get('context') !== 'registration'} />}>
          <Route element={<GuestRoute enabled={new URLSearchParams(displayedLocation.search).get('context') === 'registration'} />}>
            <Route path="/loadingScreen" element={new URLSearchParams(displayedLocation.search).get('context') === 'registration' ? <RegisterWorkspaceLoadingPage /> : <LoadingScreenPage />} />
          </Route>
        </Route>
        <Route path="/erroScreenLayout" element={<ErrorScreenLayoutPage />} />
        <Route path="/inactiveScreenLayout" element={<InactiveScreenLayoutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
    </Suspense>
  )
}

export default AppRoutes
