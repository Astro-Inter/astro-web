import { useState } from 'react'
import type { AccountProfile } from '../../types/account'
import { getInitials } from '../../utils/manager'

interface AccountProfileHeaderProps {
  profile: AccountProfile
}

function AccountProfileHeader({ profile }: AccountProfileHeaderProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  return (
    <div className="account-profile-header">
      <div className="account-profile-photo">
        {profile.photoUrl && profile.photoUrl !== failedUrl
          ? <img alt={`Foto de ${profile.name}`} height={96} onError={() => setFailedUrl(profile.photoUrl ?? null)} src={profile.photoUrl} width={96} />
          : <span aria-hidden="true" className="account-profile-initials">{getInitials(profile.name)}</span>}
      </div>
      <div className="account-profile-identity"><h3>{profile.name}</h3><p>{profile.email}</p></div>
    </div>
  )
}

export default AccountProfileHeader
