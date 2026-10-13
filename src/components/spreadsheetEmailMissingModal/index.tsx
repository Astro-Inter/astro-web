import AppModal from '../appModal'
import PurpleButton from '../purpleButton'

function SpreadsheetEmailMissingModal({ onClose }: { onClose: () => void }) {
  return <AppModal className="spreadsheet-email-missing-modal" onClose={onClose} title="Seu e-mail não está nesta planilha">
    {dismiss => <>
      <img className="spreadsheet-email-missing-image" src={import.meta.env.BASE_URL + 'emailImage.png'} alt="" width="285" height="184" />
      <p className="astro-modal-description">O e-mail da sua conta precisa constar no arquivo.<br />Atualize a planilha com seus dados e envie novamente.</p>
      <div className="astro-modal-actions"><PurpleButton onClick={dismiss}>Entendi</PurpleButton></div>
    </>}
  </AppModal>
}

export default SpreadsheetEmailMissingModal
