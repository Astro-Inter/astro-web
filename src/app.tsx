import AppRoutes from './routes'
import { useLocation } from 'react-router-dom'
import AstroChat from './components/astroChat'
import { useAuthentication } from './hooks/useAuthentication'

const chatRoutes = new Set([
  '/mainHomeScreen',
  '/mainDashboardsScreen',
  '/mainManagerScreen',
  '/mainEmployeerScreen',
  '/mainPositionScreen',
  '/mainFormScreen',
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
  const { user, status } = useAuthentication()
  const location = useLocation()
  const chatVisible = chatRoutes.has(location.pathname)
    || (settingsFormRoutes.has(location.pathname) && new URLSearchParams(location.search).get('context') === 'settings')

  return (
    <>
      <AppRoutes />
      {status === 'ready' && user && <div hidden={!chatVisible}>
        <AstroChat key={user.uid} />
      </div>}
    </>
  )
}

export default App
