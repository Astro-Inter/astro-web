import AppRoutes from './routes'
import { useLocation } from 'react-router-dom'
import AstroChat from './components/astroChat'

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
  const location = useLocation()
  const chatVisible = chatRoutes.has(location.pathname)
    || (settingsFormRoutes.has(location.pathname) && new URLSearchParams(location.search).get('context') === 'settings')

  return (
    <>
      <AppRoutes />
      <div hidden={!chatVisible}>
        <AstroChat />
      </div>
    </>
  )
}

export default App
