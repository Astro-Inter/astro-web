import { useCallback, useLayoutEffect, useRef, type MouseEvent, type RefObject, type SyntheticEvent } from 'react'
import { useAnimatedClose } from './useAnimatedClose'
import { restoreFocus } from '../utils/restoreFocus'
import { containDialogTab } from '../utils/dialogFocus'

interface AnimatedDialogOptions {
  initialFocusRef?: RefObject<HTMLElement | null>
  onDismissRequest?: () => void
  onClose: () => void
  open: boolean
}

export function useAnimatedDialog({ initialFocusRef, onClose, onDismissRequest, open }: AnimatedDialogOptions) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRequestedRef = useRef(false)
  const previousOpenRef = useRef(open)
  const openerRef = useRef<HTMLElement | null>(null)
  const { closing, requestClose } = useAnimatedClose('modal')

  const dismiss = useCallback(() => {
    if (closeRequestedRef.current) return
    closeRequestedRef.current = true
    onDismissRequest?.()
    requestClose(() => dialogRef.current?.close())
  }, [onDismissRequest, requestClose])

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !previousOpenRef.current) closeRequestedRef.current = false
    previousOpenRef.current = open

    if (open) {
      if (closeRequestedRef.current) return
      if (!dialog.open) {
        openerRef.current = document.activeElement instanceof window.HTMLElement ? document.activeElement : null
        const pageScroll = { left: window.scrollX, top: window.scrollY }
        dialog.showModal()
        dialog.scrollTop = 0
        initialFocusRef?.current?.focus({ preventScroll: true })
        requestAnimationFrame(() => window.scrollTo(pageScroll.left, pageScroll.top))
        return
      }
    } else if (dialog.open) {
      dismiss()
    }
  }, [dismiss, initialFocusRef, open])

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    const handleTab = (event: KeyboardEvent) => {
      if (dialog) containDialogTab(event, dialog, initialFocusRef?.current ?? dialog)
    }
    dialog?.addEventListener('keydown', handleTab)
    return () => {
      dialog?.removeEventListener('keydown', handleTab)
      const opener = openerRef.current
      queueMicrotask(() => {
        if (!dialog?.isConnected) restoreFocus(opener, dialog)
      })
    }
  }, [initialFocusRef])

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

  function handleClose() {
    const opener = openerRef.current
    const dialog = dialogRef.current
    onClose()
    queueMicrotask(() => restoreFocus(opener, dialog))
  }

  return { closing, dialogRef, dismiss, handleBackdropClick, handleCancel, handleClose }
}
