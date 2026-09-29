import { useId, useRef, type ReactNode, type RefObject } from 'react'
import { useAnimatedDialog } from '../../hooks/useAnimatedDialog'

interface AppModalProps {
  children: ReactNode | ((dismiss: () => void) => ReactNode)
  className?: string
  backdrop?: 'dimmed' | 'transparent'
  preservePageScroll?: boolean
  dimmed?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
  onClose: () => void
  onDismissRequest?: () => void
  open?: boolean
  title: ReactNode
}

function AppModal({ children, className = '', backdrop = 'dimmed', preservePageScroll = false, dimmed = false, initialFocusRef, onClose, onDismissRequest, open = true, title }: AppModalProps) {
  const titleId = useId()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const { closing, dialogRef, dismiss, handleBackdropClick, handleCancel, handleClose } = useAnimatedDialog({ initialFocusRef: initialFocusRef ?? titleRef, onClose, onDismissRequest, open })

  return (
    <dialog
      aria-labelledby={titleId}
      data-backdrop={backdrop}
      data-page-scroll={preservePageScroll ? 'preserve' : 'lock'}
      className={`astro-modal astro-scale-100${closing ? ' astro-dialog--closing' : ''}${dimmed ? ' astro-modal--dimmed' : ''}${className ? ` ${className}` : ''}`}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      onClose={handleClose}
      ref={dialogRef}
    >
      <h2 className="astro-modal-title" id={titleId} ref={titleRef} tabIndex={-1}>{title}</h2>
      {typeof children === 'function' ? children(dismiss) : children}
    </dialog>
  )
}

export default AppModal
