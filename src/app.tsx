import ActionFeedbackHost from './components/actionFeedbackHost'
import Tracking from './gtm/Tracking'
import AppRoutes from './routes'
import { useLocation } from 'react-router-dom'
import AstroChat from './components/astroChat'
import { useAuthentication } from './hooks/useAuthentication'
import { canAccessPage } from './utils/accessControl'
import { usePageTitle } from './hooks/usePageTitle'

const chatRoutes = new Set([
  '/mainHomeScreen',
  '/mainDashboardsScreen',
  '/mainManagerScreen',
  '/mainEmployeerScreen',
  '/mainPositionScreen',
  '/mainFormScreen',
  '/mainFormScreen/responses',
  '/mainEventScreen',
  '/mainWorkspaceSettingsScreen',
  '/mainAccountScreen',
  '/createForms',
  '/editForms',
])

const settingsFormRoutes = new Set([
  '/includeCompanyInformation',
  '/attachExcelFile',
  '/setAddress',
  '/paymentMethod',
])

function App() {
  usePageTitle()
  const { user, status } = useAuthentication()
  const location = useLocation()
  const settingsForm = settingsFormRoutes.has(location.pathname)
    && new URLSearchParams(location.search).get('context') === 'settings'
  const settingsPage = ['/mainWorkspaceSettingsScreen', '/mainAccountScreen'].includes(location.pathname) || settingsForm
  const chatVisible = chatRoutes.has(location.pathname) || settingsForm

  return (
    <>
      <Tracking />
      <ActionFeedbackHost />
      <AppRoutes />
      {status === 'ready' && user && <div className={settingsPage ? 'settings-chat-dock' : undefined} hidden={!chatVisible || !canAccessPage(user.accountType, location.pathname, location.search)}>
        <AstroChat key={user.uid} />
      </div>}
    </>
  )
}

export default App
