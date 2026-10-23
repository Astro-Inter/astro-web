import { useState } from 'react'
import { getInitials } from '../../utils/manager'

interface EventCollaboratorAvatarProps {
  name: string
  photoUrl?: string | null
  initials?: string | null
}

function EventCollaboratorAvatar({ name, photoUrl, initials }: EventCollaboratorAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const safeUrl = photoUrl && /^https?:\/\//i.test(photoUrl) ? photoUrl : null
  return <span aria-hidden="true" className="event-create-avatar">
    {safeUrl && safeUrl !== failedUrl
      ? <img alt="" decoding="async" draggable={false} height={40} loading="lazy" onError={() => setFailedUrl(safeUrl)} src={safeUrl} width={40} />
      : <span>{initials || getInitials(name)}</span>}
  </span>
}

export default EventCollaboratorAvatar
