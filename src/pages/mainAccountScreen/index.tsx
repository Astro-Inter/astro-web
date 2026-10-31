import { useAuthentication } from '../../hooks/useAuthentication'
import AccountScreen from '../accountScreen'

function MainAccountScreenPage() {
  const { user } = useAuthentication()
  return <AccountScreen key={user?.uid ?? 'signed-out'} />
}

export default MainAccountScreenPage
