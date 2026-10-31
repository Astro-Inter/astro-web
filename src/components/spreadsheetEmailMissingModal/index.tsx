import { DIALOG_NAMES } from '../../gtm/dialogs'
import { BUTTONS } from '../../gtm/buttons'
import AppModal from '../appModal'
import PurpleButton from '../purpleButton'

interface SpreadsheetEmailMissingModalProps { onClose: () => void }

function SpreadsheetEmailMissingModal({ onClose }: SpreadsheetEmailMissingModalProps) {
  return <AppModal trackingName={DIALOG_NAMES.email_ausente_planilha} className="spreadsheet-email-missing-modal" onClose={onClose} title="Seu e-mail não está nesta planilha">
    {dismiss => <>
      <img className="spreadsheet-email-missing-image" src={import.meta.env.BASE_URL + 'emailImage.png'} alt="" width="285" height="184" />
      <p className="astro-modal-description">O e-mail da sua conta precisa constar no arquivo.<br />Atualize a planilha com seus dados e envie novamente.</p>
      <div className="astro-modal-actions"><PurpleButton data-track-action={BUTTONS.comuns.entendi} onClick={dismiss}>Entendi</PurpleButton></div>
    </>}
  </AppModal>
}

export default SpreadsheetEmailMissingModal
