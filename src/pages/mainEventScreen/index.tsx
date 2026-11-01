import { useAuthentication } from '../../hooks/useAuthentication'
import EventScreenContent from '../eventScreenContent'

function MainEventScreenPage() {
  const { user } = useAuthentication()
  return <EventScreenContent key={user?.uid ?? 'guest'} />
}

export default MainEventScreenPage
