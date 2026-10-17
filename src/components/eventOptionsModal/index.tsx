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
  canEdit: boolean
  canCancel?: boolean
  informationReady?: boolean
  loading?: boolean
  error?: string
  onRetry?: () => void
  onEdit: () => void
  onViewInformation: () => void
  panelRef: RefObject<HTMLDivElement | null>
  style: CSSProperties
}

function EventOptionsModal({ closing, event, onClose, onInactivate, onEdit, onViewInformation, canEdit, canCancel = false, informationReady = false, loading = false, error = '', onRetry, panelRef, style }: EventOptionsModalProps) {
  return <OptionsPopup trackingName={DIALOG_NAMES.acoes_evento}
    ariaLabel={`Opções para ${event.title}`}
    closing={closing}
    id={`event-options-${event.id}`}
    items={[
      { trackingAction: BUTTONS.comuns.cancelar, id: 'cancel', label: 'Cancelar', tone: 'muted', separatorAfter: true, onSelect: onClose },
      ...(error && onRetry ? [{ id: 'retry', label: 'Tentar novamente', onSelect: onRetry }] : []),
      { trackingAction: BUTTONS.comuns.informacoes, id: 'information', label: loading ? 'Carregando...' : 'Ver informações', disabled: !informationReady, separatorAfter: true, onSelect: onViewInformation },
      { trackingAction: BUTTONS.comuns.editar, id: 'edit', label: 'Editar', disabled: !canEdit, separatorAfter: true, onSelect: onEdit },
      { trackingAction: BUTTONS.comuns.inativar, id: 'inactivate', label: event.inactive ? 'Inativo' : 'Inativar', disabled: !canCancel, tone: 'danger', onSelect: onInactivate },
    ]}
    onClose={onClose}
    panelRef={panelRef}
    style={style}
  />
}

export default EventOptionsModal
