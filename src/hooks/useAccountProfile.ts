import { notifyAction } from '../utils/actionFeedback'
import { useEffect, useRef, useState } from 'react'
import { useAuthentication } from './useAuthentication'
import { getAccountProfile, updateAccountPhoto } from '../services/account'
import type { AccountPhotoUpdate, AccountProfile } from '../types/account'

interface AccountProfileState {
  key: string
  data: AccountProfile | null
  loading: boolean
  error: string
}

interface AccountProfileResult extends Omit<AccountProfileState, 'key'> {
  applyProfile: (profile: AccountProfile) => void
  retry: () => void
  photoUpdate: AccountPhotoUpdate
  uploadPhoto: (file: File) => Promise<void>
  refreshPhoto: () => Promise<void>
}

const idlePhotoUpdate: AccountPhotoUpdate = { pending: false, error: '', message: '', needsRefresh: false }

export function useAccountProfile(): AccountProfileResult {
  const { user } = useAuthentication()
  const uid = user?.uid
  const [attempt, setAttempt] = useState(0)
  const key = `${uid ?? ''}/${attempt}`
  const [state, setState] = useState<AccountProfileState>({ key: '', data: null, loading: true, error: '' })
  const [photoState, setPhotoState] = useState<AccountPhotoUpdate & { uid?: string }>({ ...idlePhotoUpdate })
  const photoRequestRef = useRef<AbortController | null>(null)

  useEffect(() => () => {
    photoRequestRef.current?.abort()
    photoRequestRef.current = null
  }, [uid])

  useEffect(() => {
    const controller = new AbortController()
    if (!uid) return () => controller.abort()
    getAccountProfile(controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ key, data, loading: false, error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ key, data: null, loading: false,
        error: error instanceof Error ? error.message : 'Não foi possível carregar sua conta. Tente novamente.' })
    })
    return () => controller.abort()
  }, [uid, key])

  async function savePhoto(file?: File): Promise<void> {
    if (!uid || photoRequestRef.current) return
    const controller = new AbortController()
    photoRequestRef.current = controller
    setPhotoState({ uid, ...idlePhotoUpdate, pending: true })
    let uploaded = !file
    try {
      if (file) {
        await updateAccountPhoto(file, controller.signal)
        uploaded = true
      }
      controller.signal.throwIfAborted()
      const data = await getAccountProfile(AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]))
      if (!controller.signal.aborted) {
        setState({ key, data, loading: false, error: '' })
        setPhotoState({ uid, ...idlePhotoUpdate, message: 'Foto de perfil atualizada.' })
        notifyAction('Foto de perfil atualizada.')
      }
    } catch (error: unknown) {
      if (!controller.signal.aborted) {
        const message = uploaded ? 'Sua foto foi salva, mas não conseguimos atualizar a visualização. Use “Atualizar foto” para tentar novamente.'
          : error instanceof Error ? error.message : 'Não foi possível salvar sua foto. Tente novamente.'
        setPhotoState({ uid, ...idlePhotoUpdate, needsRefresh: uploaded, error: message })
        notifyAction(message, 'error')
      }
    } finally {
      if (photoRequestRef.current === controller) photoRequestRef.current = null
    }
  }

  return {
    applyProfile: data => setState({ key, data: { name: data.name, email: data.email, photoUrl: data.photoUrl, position: '', units: '', modality: '' }, loading: false, error: '' }),
    data: state.key === key ? state.data : null,
    loading: state.key !== key || state.loading,
    error: state.key === key ? state.error : '',
    retry: () => setAttempt(current => current + 1),
    photoUpdate: photoState.uid === uid ? photoState : idlePhotoUpdate,
    uploadPhoto: file => savePhoto(file),
    refreshPhoto: () => savePhoto(),
  }
}
