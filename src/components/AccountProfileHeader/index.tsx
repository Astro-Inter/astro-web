import type { AccountProfile } from '../../types/account'
import AstroIcon from '../AstroIcon'

interface AccountProfileHeaderProps {
  profile: AccountProfile
  editable?: boolean
  onEditPhoto?: () => void
}

function AccountProfileHeader({ profile, editable = false, onEditPhoto }: AccountProfileHeaderProps) {
  return (
    <div className="account-profile-header">
      <div className="account-profile-photo">
        <img alt={`Foto de ${profile.name}`} height={96} src={profile.photoUrl ?? `${import.meta.env.BASE_URL}kirk-image.png`} width={96} />
        {editable && <button aria-label="Alterar foto do perfil" onClick={onEditPhoto} type="button"><AstroIcon name="pencil" /></button>}
      </div>
      <div className="account-profile-identity"><h3>{profile.name}</h3><p>{profile.email}</p></div>
    </div>
  )
}

export default AccountProfileHeader
