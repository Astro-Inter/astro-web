import { useAuthentication } from '../../hooks/useAuthentication'
import AstroChatView from '../astroChatView'

function AstroChat() {
  const { user } = useAuthentication()
  return <AstroChatView key={user?.uid ?? 'guest'} />
}

export default AstroChat
