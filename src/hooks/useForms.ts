import { useEffect, useRef, useState } from 'react'
import { useAuthentication } from './useAuthentication'
import { deleteForm, listForms } from '../services/forms'
import { formSummary } from '../utils/formApi'
import { validateAndSanitizeFormFilters } from '../utils/formFilters'
import { saveFormCardAppearance } from '../services/formCardAppearance'
import type { FormCardAppearance, FormQuestionFilters, FormStatus, FormSummary } from '../types/forms'

interface FormsState { key: string; rows: FormSummary[]; totalPages: number; totalElements: number; loading: boolean; error: string }
interface FormsResult extends Omit<FormsState, 'key'> { retry: () => void; remove: (id: string) => Promise<void>; saveAppearance: (id: string, appearance: FormCardAppearance) => Promise<void> }
export function useForms(search: string, status: FormStatus | '', page: number, size: number, quantities?: FormQuestionFilters): FormsResult {
  const { user } = useAuthentication()
  const uid = user?.uid
  const [attempt, setAttempt] = useState(0)
  const minimum = quantities?.minimum ?? '', maximum = quantities?.maximum ?? ''
  const key = JSON.stringify([uid, search, status, page, size, minimum, maximum, attempt])
  const [state, setState] = useState<FormsState>({ key: '', rows: [], totalPages: 0, totalElements: 0, loading: true, error: '' })
  const mutation = useRef<AbortController | null>(null)
  useEffect(() => () => { mutation.current?.abort(); mutation.current = null }, [uid])
  useEffect(() => {
    const controller = new AbortController()
    // A busca muda durante a digitação; cancela também o atraso anterior.
    const timer = window.setTimeout(() => {
      if (!uid) return
      const validation = validateAndSanitizeFormFilters({ search, status, page: page - 1, size })
      if (!validation.values) {
        setState({ key, rows: [], totalPages: 0, totalElements: 0, loading: false, error: Object.values(validation.errors)[0] || 'Confira os filtros de formulários.' })
        return
      }
      const filters = validation.values
      void listForms(filters.search, filters.status, filters.page, filters.size, controller.signal, { minimum, maximum }).then(data => {
        if (!controller.signal.aborted) setState({ key, rows: data.items.map(formSummary), totalPages: data.totalPages, totalElements: data.totalElements, loading: false, error: '' })
      }).catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ key, rows: [], totalPages: 0, totalElements: 0, loading: false, error: error instanceof Error ? error.message : 'Não foi possível carregar os formulários.' })
      })
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [uid, key, search, status, page, size, minimum, maximum])
  return {
    ...(state.key === key ? state : { rows: [], totalPages: 0, totalElements: 0, loading: true, error: '' }),
    retry: () => setAttempt(value => value + 1),
    saveAppearance: async (id, appearance) => {
      if (mutation.current) throw new Error('Aguarde a alteração em andamento.')
      const controller = new AbortController()
      mutation.current = controller
      try {
        const saved = await saveFormCardAppearance(id, appearance, controller.signal)
        controller.signal.throwIfAborted()
        setState(current => ({ ...current, rows: current.rows.map(row => row.id === id ? saved : row) }))
      } finally { if (mutation.current === controller) mutation.current = null }
    },
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
