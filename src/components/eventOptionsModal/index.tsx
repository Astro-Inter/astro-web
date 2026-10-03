import type { CSSProperties, RefObject } from 'react'
import OptionsPopup from '../optionsPopup'
import type { CalendarEvent } from '../../types/events'

interface EventOptionsModalProps {
  closing: boolean
  event: CalendarEvent
  onClose: () => void
  onDelete: () => void
  onEdit: () => void
  panelRef: RefObject<HTMLDivElement | null>
  style: CSSProperties
}

function EventOptionsModal({ closing, event, onClose, onDelete, onEdit, panelRef, style }: EventOptionsModalProps) {
  return <OptionsPopup
    ariaLabel={`Opções para ${event.title}`}
    closing={closing}
    id={`event-options-${event.id}`}
    items={[
      { id: 'cancel', label: 'Cancelar', tone: 'muted', separatorAfter: true, onSelect: onClose },
      { id: 'edit', label: 'Editar', separatorAfter: true, onSelect: onEdit },
      { id: 'delete', label: 'Excluir', tone: 'danger', onSelect: onDelete },
    ]}
    onClose={onClose}
    panelRef={panelRef}
    style={style}
  />
}

export default EventOptionsModal
