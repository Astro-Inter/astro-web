import { useId, useRef, useState } from 'react'
import type { AccountPhotoUpdate, AccountProfile } from '../../types/account'
import { getInitials } from '../../utils/manager'
import { BUTTONS } from '../../gtm/buttons'
import AstroIcon from '../astroIcon'

interface AccountProfileHeaderProps {
  profile: AccountProfile
  onPhotoSelected?: (file: File) => void
  photoUpdate?: AccountPhotoUpdate
  onRefreshPhoto?: () => void
}

function AccountProfileHeader({ profile, onPhotoSelected, photoUpdate, onRefreshPhoto }: AccountProfileHeaderProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const photoInputId = useId()
  return (
    <div className="account-profile-header">
      <div className="account-profile-photo">
        {profile.photoUrl && profile.photoUrl !== failedUrl
          ? <img alt={`Foto de ${profile.name}`} height={96} onError={() => setFailedUrl(profile.photoUrl ?? null)} src={profile.photoUrl} width={96} />
          : <span aria-hidden="true" className="account-profile-initials">{getInitials(profile.name)}</span>}
        {onPhotoSelected && <>
          <button aria-describedby={`${photoInputId}-hint`} aria-label="Alterar foto do perfil" data-track-action={BUTTONS.comuns.alterar_foto} disabled={photoUpdate?.pending} onClick={() => photoInputRef.current?.click()} type="button"><AstroIcon name="pencil" /></button>
          <label hidden htmlFor={photoInputId}>Selecionar foto do perfil</label>
          <input accept="image/jpeg,image/png,image/webp" className="account-photo-input" disabled={photoUpdate?.pending} id={photoInputId} onChange={event => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (file) onPhotoSelected(file)
          }} ref={photoInputRef} type="file" />
        </>}
      </div>
      <div aria-busy={photoUpdate?.pending} className="account-profile-identity">
        <h3>{profile.name}</h3><p>{profile.email}</p>
        {onPhotoSelected && <p className="account-photo-hint" id={`${photoInputId}-hint`}>JPEG, PNG ou WebP, até 5 MB.</p>}
        {photoUpdate?.pending && <p role="status">Atualizando foto…</p>}
        {photoUpdate?.error && <p role="alert">{photoUpdate.error}</p>}
        {photoUpdate?.message && <p role="status">{photoUpdate.message}</p>}
        {photoUpdate?.needsRefresh && onRefreshPhoto && <button className="account-photo-refresh" disabled={photoUpdate.pending} onClick={onRefreshPhoto} type="button">Atualizar foto</button>}
      </div>
    </div>
  )
}

export default AccountProfileHeader
