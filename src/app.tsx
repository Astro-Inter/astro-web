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
  '/mainManagerScreen',
  '/mainEmployeerScreen',
  '/mainPositionScreen',
  '/mainFormScreen',
  '/mainEventScreen',
  '/mainUnitScreen',
  '/mainConformityScreen',
])

function App() {
  usePageTitle()
  const { user, status } = useAuthentication()
  const location = useLocation()
  const chatVisible = chatRoutes.has(location.pathname)

  return (
    <>
      <Tracking />
      <ActionFeedbackHost />
      <AppRoutes />
      {status === 'ready' && user && <div hidden={!chatVisible || !canAccessPage(user.accountType, location.pathname, location.search)}>
        <AstroChat key={user.uid} />
      </div>}
    </>
  )
}

export default App
