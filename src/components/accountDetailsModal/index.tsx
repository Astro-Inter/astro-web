import { DIALOG_NAMES } from '../../gtm/dialogs'
import { BUTTONS } from '../../gtm/buttons'
import type { AccountProfile } from '../../types/account'
import AccountProfileHeader from '../accountProfileHeader'
import AppModal from '../appModal'
import FormField from '../formField'

interface AccountDetailsModalProps {
  profile: AccountProfile
  onCancel: () => void
}

function AccountDetailsModal({ profile, onCancel }: AccountDetailsModalProps) {
  return (
    <AppModal trackingName={DIALOG_NAMES.informacoes_conta} className="account-details-modal" onClose={onCancel} preservePageScroll title="Veja suas informações">
      {dismiss => <div className="account-details-form">
        <AccountProfileHeader profile={profile} />
        <div className="account-details-grid">
          <FormField id="account-detail-name" label="Nome" readOnly value={profile.name} />
          <FormField id="account-detail-cpf" label="CPF" readOnly value="" />
          <FormField id="account-detail-email" label="E-mail" readOnly type="email" value={profile.email} />
          <FormField id="account-detail-units" label="Unidade" readOnly value={profile.units || 'Não informada'} />
          <FormField id="account-detail-position" label="Cargo" readOnly value={profile.position || 'Não informado'} />
          <FormField id="account-detail-modality" label="Modalidade" readOnly value={profile.modality || 'Não informada'} />
        </div>
        <div className="astro-modal-actions">
          <button data-track-action={BUTTONS.comuns.voltar} className="astro-modal-cancel" onClick={dismiss} type="button">Voltar</button>
        </div>
      </div>}
    </AppModal>
  )
}

export default AccountDetailsModal
