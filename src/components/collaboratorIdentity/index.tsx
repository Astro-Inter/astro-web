import { useState } from 'react'
import { getInitials } from '../../utils/manager'
import TruncatedText from '../truncatedText'

interface CollaboratorIdentityProps {
  name: string
  photoUrl: string | null
  initials: string | null
  large?: boolean
}

function CollaboratorIdentity({ name, photoUrl, initials, large = false }: CollaboratorIdentityProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  return <span className={`manager-identity collaborator-identity${large ? ' collaborator-identity--large' : ''}`}>
    <span aria-hidden="true" className={`manager-avatar${large ? ' manager-avatar--large' : ''}`}>
      {photoUrl && photoUrl !== failedUrl
        ? <img alt="" onError={() => setFailedUrl(photoUrl)} src={photoUrl} />
        : initials || getInitials(name)}
    </span>
    {!large && <TruncatedText>{name}</TruncatedText>}
  </span>
}

export default CollaboratorIdentity
