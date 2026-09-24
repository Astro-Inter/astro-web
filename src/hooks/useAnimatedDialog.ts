import { useCallback, useEffect, useRef, type MouseEvent, type RefObject, type SyntheticEvent } from 'react'
import { useAnimatedClose } from './useAnimatedClose'

interface AnimatedDialogOptions {
  initialFocusRef?: RefObject<HTMLElement | null>
  onClose: () => void
  open: boolean
}

export function useAnimatedDialog({ initialFocusRef, onClose, open }: AnimatedDialogOptions) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { closing, requestClose } = useAnimatedClose()

  const dismiss = useCallback(() => {
    requestClose(() => dialogRef.current?.close())
  }, [requestClose])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      if (!dialog.open) {
        dialog.showModal()
        dialog.scrollTop = 0
      }
      initialFocusRef?.current?.focus({ preventScroll: true })
    } else if (dialog.open) {
      dismiss()
    }
  }, [dismiss, initialFocusRef, open])

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const outside = event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom
    if (outside) dismiss()
  }

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    dismiss()
  }

  return { closing, dialogRef, dismiss, handleBackdropClick, handleCancel, handleClose: onClose }
}
