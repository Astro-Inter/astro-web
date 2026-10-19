import ActionLoading from '../actionLoading'
import AccountProfileSkeleton from '../accountProfileSkeleton'
import { DIALOG_NAMES } from '../../gtm/dialogs'
import { BUTTONS } from '../../gtm/buttons'
import type { AccountPhotoUpdate, AccountProfile } from '../../types/account'
import { useAccountDetails } from '../../hooks/useAccountDetails'
import AccountProfileHeader from '../accountProfileHeader'
import AccountDetailsForm from '../accountDetailsForm'
import AppModal from '../appModal'
import PurpleButton from '../purpleButton'

interface AccountDetailsModalProps {
  profile: AccountProfile
  onCancel: () => void
  editable?: boolean
  canChangeLinks?: boolean
  onSaved?: (profile: AccountProfile) => void
  onPhotoSelected?: (file: File) => void
  photoUpdate?: AccountPhotoUpdate
  onRefreshPhoto?: () => void
}

function AccountDetailsModal({ profile, onCancel, editable = false, canChangeLinks = false, onSaved, onPhotoSelected, photoUpdate, onRefreshPhoto }: AccountDetailsModalProps) {
  const details = useAccountDetails(editable, canChangeLinks)
  const locked = details.submission.pending || Boolean(photoUpdate?.pending)
  return (
    <AppModal trackingName={editable ? DIALOG_NAMES.editar_conta : DIALOG_NAMES.informacoes_conta} className="account-details-modal" dismissible={!locked} onClose={onCancel} preservePageScroll title={editable ? 'Altere suas informações' : 'Veja suas informações'}>
      {dismiss => <div className="account-details-content">
        {details.loading && !details.data && <AccountProfileSkeleton details editable={editable} canChangeLinks={canChangeLinks} onCancel={dismiss} />}
        {details.error && <><p role="alert">{details.error}</p><PurpleButton onClick={details.retry}>Tentar novamente</PurpleButton><button className="astro-modal-cancel" data-track-action={BUTTONS.comuns.voltar} onClick={dismiss} type="button">Voltar</button></>}
        {details.data && <div className="api-content-ready">
          <AccountProfileHeader disabled={locked} onPhotoSelected={onPhotoSelected} onRefreshPhoto={onRefreshPhoto} photoUpdate={photoUpdate} profile={{ ...details.data, photoUrl: profile.photoUrl }} />
          <ActionLoading active={details.submission.pending} />
          {details.submission.emailChanged && <PurpleButton disabled={locked} onClick={() => { void details.verifyEmail() }}>Enviar confirmação de e-mail</PurpleButton>}
          <AccountDetailsForm canChangeLinks={canChangeLinks} editable={editable} onCancel={dismiss} onSave={async values => {
            const saved = await details.save(values)
            if (saved) {
              onSaved?.(saved)
              dismiss()
            }
          }} pending={locked} profile={details.data} roles={details.roles} units={details.units} />
        </div>}
      </div>}
    </AppModal>
  )
}

export default AccountDetailsModal
