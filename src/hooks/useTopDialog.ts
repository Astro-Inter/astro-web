import { useEffect, useState } from 'react'

export function useTopDialog(): HTMLDialogElement | null {
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null)
  useEffect(() => {
    let frame: number | null = null
    const update = () => {
      const dialogs = Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]'))
      setDialog(dialogs.at(-1) ?? null)
    }
    const schedule = () => {
      if (frame !== null) return
      frame = requestAnimationFrame(() => { frame = null; update() })
    }
    const observer = new MutationObserver(records => {
      const affectsDialog = records.some(record => record.type === 'attributes' && record.target instanceof HTMLDialogElement || record.type === 'childList' && [...record.addedNodes, ...record.removedNodes].some(node => node instanceof Element && (node.matches('dialog') || node.querySelector('dialog'))))
      if (affectsDialog) schedule()
    })
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] })
    document.addEventListener('close', update, true)
    document.addEventListener('toggle', update, true)
    update()
    return () => { observer.disconnect(); if (frame !== null) cancelAnimationFrame(frame); document.removeEventListener('close', update, true); document.removeEventListener('toggle', update, true) }
  }, [])
  return dialog
}
