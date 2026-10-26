import { DIALOG_NAMES } from '../../gtm/dialogs'
import { BUTTONS } from '../../gtm/buttons'
import type { CSSProperties, RefObject } from 'react'
import OptionsPopup from '../optionsPopup'
import type { CalendarEvent } from '../../types/events'

interface EventOptionsModalProps {
  closing: boolean
  event: CalendarEvent
  onClose: () => void
  onInactivate: () => void
  onEdit: () => void
  onViewInformation: () => void
  panelRef: RefObject<HTMLDivElement | null>
  style: CSSProperties
}

function EventOptionsModal({ closing, event, onClose, onInactivate, onEdit, onViewInformation, panelRef, style }: EventOptionsModalProps) {
  return <OptionsPopup trackingName={DIALOG_NAMES.acoes_evento}
    ariaLabel={`Opções para ${event.title}`}
    closing={closing}
    id={`event-options-${event.id}`}
    items={[
      { trackingAction: BUTTONS.comuns.cancelar, id: 'cancel', label: 'Cancelar', tone: 'muted', separatorAfter: true, onSelect: onClose },
      { trackingAction: BUTTONS.comuns.informacoes, id: 'information', label: 'Ver informações', separatorAfter: true, onSelect: onViewInformation },
      { trackingAction: BUTTONS.comuns.editar, id: 'edit', label: 'Editar', separatorAfter: true, onSelect: onEdit },
      { trackingAction: BUTTONS.comuns.inativar, id: 'inactivate', label: event.inactive ? 'Inativo' : 'Inativar', disabled: event.inactive, tone: 'danger', onSelect: onInactivate },
    ]}
    onClose={onClose}
    panelRef={panelRef}
    style={style}
  />
}

export default EventOptionsModal
