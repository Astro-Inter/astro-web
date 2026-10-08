import type { CSSProperties, RefObject } from 'react'
import OptionsPopup from '../optionsPopup'
import type { CalendarEvent } from '../../types/events'

interface EventOptionsModalProps {
  closing: boolean
  event: CalendarEvent
  onClose: () => void
  onInactivate: () => void
  canEdit: boolean
  onEdit: () => void
  panelRef: RefObject<HTMLDivElement | null>
  style: CSSProperties
}

function EventOptionsModal({ closing, event, onClose, onInactivate, onEdit, canEdit, panelRef, style }: EventOptionsModalProps) {
  return <OptionsPopup
    ariaLabel={`Opções para ${event.title}`}
    closing={closing}
    id={`event-options-${event.id}`}
    items={[
      { id: 'cancel', label: 'Cancelar', tone: 'muted', separatorAfter: true, onSelect: onClose },
      { id: 'edit', label: 'Editar', disabled: !canEdit, separatorAfter: true, onSelect: onEdit },
      { id: 'inactivate', label: event.inactive ? 'Inativo' : 'Inativar', disabled: event.inactive, tone: 'danger', onSelect: onInactivate },
    ]}
    onClose={onClose}
    panelRef={panelRef}
    style={style}
  />
}

export default EventOptionsModal
