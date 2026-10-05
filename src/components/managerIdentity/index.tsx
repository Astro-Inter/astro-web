import { getInitials } from '../../utils/manager'
import TruncatedText from '../truncatedText'

interface ManagerIdentityProps {
  name: string
}

function ManagerIdentity({ name }: ManagerIdentityProps) {
  return (
    <span className="manager-identity">
      <span aria-hidden="true" className="manager-avatar">{getInitials(name)}</span>
      <TruncatedText>{name}</TruncatedText>
    </span>
  )
}

export default ManagerIdentity
