import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useAuthentication } from './useAuthentication'
import { createForm, getForm, getFormOptions, getFormRecipients, publishForm, updateForm } from '../services/forms'
import { emptyFormValues, formHasResponses, formValues } from '../utils/formApi'
import { validateAndSanitizeFormForOptions } from '../utils/formEditorValidation'
import type { CreateFormValues, FormDetailsResponse, FormEditorOptions } from '../types/forms'

interface EditorState { key: string; detail: FormDetailsResponse | null; options: FormEditorOptions; error: string }
interface FormEditorResult {
  values: CreateFormValues; setValues: Dispatch<SetStateAction<CreateFormValues>>
  detail: FormDetailsResponse | null; options: FormEditorOptions
  loading: boolean; error: string; saving: boolean; locked: boolean
  retry: () => void; retryManagers: () => void; save: (draft?: boolean, publish?: boolean) => Promise<FormDetailsResponse>
}
const emptyOptions: FormEditorOptions = { managers: [], nrs: [], units: [], currentManagerId: null, managersError: '' }
export function useFormEditor(id?: string): FormEditorResult {
  const { user } = useAuthentication()
  const uid = user?.uid, accountType = user?.accountType
  const [attempt, setAttempt] = useState(0)
  const key = JSON.stringify([uid, accountType, id, attempt])
  const [state, setState] = useState<EditorState>({ key: '', detail: null, options: emptyOptions, error: '' })
  const [values, setValues] = useState<CreateFormValues>(emptyFormValues)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const mutation = useRef<AbortController | null>(null)
  const managersRequest = useRef<AbortController | null>(null)
  useEffect(() => () => {
    mutation.current?.abort(); mutation.current = null
    managersRequest.current?.abort(); managersRequest.current = null
  }, [key])
  useEffect(() => {
    const controller = new AbortController()
    if (!uid || !accountType) return () => controller.abort()
    void Promise.all([getFormOptions(controller.signal), id === undefined ? Promise.resolve(null) : getForm(id, controller.signal)]).then(([options, detail]) => {
      if (controller.signal.aborted) return
      setValues(detail ? formValues(detail) : emptyFormValues)
      setState({ key, detail, options, error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ key, detail: null, options: emptyOptions, error: error instanceof Error ? error.message : 'Não foi possível carregar o formulário.' })
    })
    return () => controller.abort()
  }, [uid, accountType, id, key])
  const loading = state.key !== key
  const locked = !loading && !!state.detail && formHasResponses(state.detail)
  return { values: loading || state.error ? emptyFormValues : values, setValues, detail: loading ? null : state.detail, options: loading ? emptyOptions : state.options,
    loading, error: loading ? '' : state.error, saving: savingKey === key, locked,
    retry: () => setAttempt(value => value + 1),
    retryManagers: () => {
      if (loading || managersRequest.current) return
      const controller = new AbortController()
      managersRequest.current = controller
      setState(current => ({ ...current, options: { ...current.options, managersLoading: true } }))
      void getFormRecipients(controller.signal).then(recipients => {
        if (!controller.signal.aborted) setState(current => ({ ...current, options: { ...current.options, ...recipients, managersLoading: false } }))
      }).catch(() => {
        if (!controller.signal.aborted) setState(current => ({ ...current, options: { ...current.options, managersError: 'Não foi possível carregar os gestores destinatários. Tente novamente.', managersLoading: false } }))
      }).finally(() => { if (managersRequest.current === controller) managersRequest.current = null })
    },
    save: async (draft = false, publish = false) => {
      if (loading || state.error || locked) throw new Error('Carregue um formulário editável antes de salvar.')
      if (mutation.current) throw new Error('Aguarde a gravação em andamento.')
      const savingDraft = !publish && (state.detail ? state.detail.status === 'RASCUNHO' : draft)
      const validation = validateAndSanitizeFormForOptions(values, state.options, savingDraft)
      const validationError = Object.values(validation.errors)[0]
      if (validationError) throw new Error(validationError)
      const controller = new AbortController()
      mutation.current = controller
      setSavingKey(key)
      try {
        let saved = id !== undefined && state.detail ? await updateForm(id, validation.values, state.detail, controller.signal) : await createForm(validation.values, draft, controller.signal)
        controller.signal.throwIfAborted()
        // Mantém os IDs persistidos mesmo se a publicação seguinte falhar.
        setState(current => ({ ...current, detail: saved }))
        setValues(formValues(saved))
        if (publish) {
          saved = await publishForm(saved.id, controller.signal)
          controller.signal.throwIfAborted()
          setState(current => ({ ...current, detail: saved }))
        }
        return saved
      } finally {
        if (mutation.current === controller) { mutation.current = null; if (!controller.signal.aborted) setSavingKey(null) }
      }
    },
  }
}
