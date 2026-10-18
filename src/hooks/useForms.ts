import { useEffect, useRef, useState } from 'react'
import { useAuthentication } from './useAuthentication'
import { deleteForm, listForms } from '../services/forms'
import { formSummary } from '../utils/formApi'
import type { FormStatus, FormSummary } from '../types/forms'

interface FormsState { key: string; rows: FormSummary[]; totalPages: number; totalElements: number; loading: boolean; error: string }
interface FormsResult extends Omit<FormsState, 'key'> { retry: () => void; remove: (id: string) => Promise<void> }
export function useForms(search: string, status: FormStatus | '', page: number, size: number): FormsResult {
  const { user } = useAuthentication()
  const uid = user?.uid
  const [attempt, setAttempt] = useState(0)
  const key = JSON.stringify([uid, search, status, page, size, attempt])
  const [state, setState] = useState<FormsState>({ key: '', rows: [], totalPages: 0, totalElements: 0, loading: true, error: '' })
  const mutation = useRef<AbortController | null>(null)
  useEffect(() => () => { mutation.current?.abort(); mutation.current = null }, [uid])
  useEffect(() => {
    const controller = new AbortController()
    // A busca muda durante a digitação; cancela também o atraso anterior.
    const timer = window.setTimeout(() => {
      if (!uid) return
      void listForms(search, status, page - 1, size, controller.signal).then(data => {
        if (!controller.signal.aborted) setState({ key, rows: data.items.map(formSummary), totalPages: data.totalPages, totalElements: data.totalElements, loading: false, error: '' })
      }).catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ key, rows: [], totalPages: 0, totalElements: 0, loading: false, error: error instanceof Error ? error.message : 'Não foi possível carregar os formulários.' })
      })
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [uid, key, search, status, page, size])
  return {
    ...(state.key === key ? state : { rows: [], totalPages: 0, totalElements: 0, loading: true, error: '' }),
    retry: () => setAttempt(value => value + 1),
    remove: async id => {
      if (mutation.current) throw new Error('Aguarde a exclusão em andamento.')
      const controller = new AbortController()
      mutation.current = controller
      try {
        await deleteForm(id, controller.signal)
        controller.signal.throwIfAborted()
        setAttempt(value => value + 1)
      } finally { if (mutation.current === controller) mutation.current = null }
    },
  }
}
