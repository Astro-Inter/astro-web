import AppModal from '../appModal'
import ApiContentSkeleton from '../apiContentSkeleton'
import PurpleButton from '../purpleButton'
import { BUTTONS } from '../../gtm/buttons'
import { DIALOG_NAMES } from '../../gtm/dialogs'

export type EventAction = 'information' | 'edit' | 'inactivate'

interface EventActionPendingModalProps {
  action: EventAction
  loading: boolean
  exiting?: boolean
  error: string
  onClose: () => void
  onRetry?: () => void
}

const titles = { information: 'Informações do evento', edit: 'Editar evento', inactivate: 'Tem certeza de que deseja inativar este evento?' }

function EventActionPendingModal({ action, loading, exiting = false, error, onClose, onRetry }: EventActionPendingModalProps) {
  const information = action === 'information'
  return <AppModal trackingName={action === 'inactivate' ? DIALOG_NAMES.confirmar_inativacao_evento : DIALOG_NAMES.informacoes_evento} className={`event-create-modal event-action-loading-modal${information ? ' event-create-modal--review event-information-modal' : ' event-create-modal--details'}${action === 'inactivate' ? ' event-deactivation-modal' : ''}`} title={titles[action]} onClose={onClose}>
    {dismiss => <>
      {information && <div className="event-information-heading"><p>Consulte os dados e a programação de todas as turmas deste evento.</p></div>}
      {loading ? information ? <><span className="sr-only" role="status">Carregando informações do evento...</span>
        <div aria-busy="true" className={`event-create-review-grid event-information-grid${exiting ? ' event-loading-exit' : ''}`}>
        {['Informações', 'Grupos', 'Configurações'].map((heading, index) => <section className="event-create-summary-card event-information-panel" key={heading}>
          <h3>{heading}</h3>
          <dl aria-hidden="true">{Array.from({ length: index === 0 ? 5 : 4 }, (_, row) => <div key={row}><dt><span className="api-skeleton api-skeleton-text" /></dt><dd><span className="api-skeleton api-skeleton-text" /></dd></div>)}</dl>
        </section>)}
      </div></> : <ApiContentSkeleton className={`event-create-fields-skeleton${exiting ? ' event-loading-exit' : ''}`} label="Carregando dados do evento..." fields={action === 'edit' ? 4 : 1} columns={1} actions={0} /> : <div role="alert" className="event-action-load-error">
        <p>{error}</p>
        {onRetry && <button data-track-action={BUTTONS.comuns.tentar_novamente} className="astro-modal-cancel" onClick={onRetry} type="button">Tentar novamente</button>}
      </div>}
      <div className="astro-modal-actions">
        <button data-track-action={information ? BUTTONS.comuns.voltar : BUTTONS.comuns.cancelar} className="astro-modal-cancel" onClick={dismiss} type="button">{information ? 'Voltar' : 'Cancelar'}</button>
        {!information && <PurpleButton data-track-action={action === 'edit' ? BUTTONS.comuns.continuar : BUTTONS.comuns.inativar} disabled type="button">{action === 'edit' ? 'Continuar' : 'Inativar'}</PurpleButton>}
      </div>
    </>}
  </AppModal>
}

export default EventActionPendingModal
