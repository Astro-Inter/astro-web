import { useEffect, useState } from 'react'
import { useAuthentication } from './useAuthentication'
import { listCollaborators } from '../services/collaborators'
import type { EventCollaborator } from '../types/eventCreation'

interface CollaboratorPhoto { profilePhotoUrl: string | null; avatarInitials: string | null }
interface PhotosState { uid: string; profiles: Record<string, CollaboratorPhoto> }

export function useEventCollaboratorPhotos(people: readonly EventCollaborator[]): EventCollaborator[] {
  const { user } = useAuthentication()
  const uid = user?.uid
  const [state, setState] = useState<PhotosState>({ uid: '', profiles: {} })
  useEffect(() => {
    const controller = new AbortController()
    if (!uid) return () => controller.abort()
    // Uma leitura por abertura do fluxo, sem requisitar um perfil por linha ou filtro.
    listCollaborators(controller.signal).then(rows => {
      if (!controller.signal.aborted) setState({ uid, profiles: Object.fromEntries(rows.map(person => [person.id,
        { profilePhotoUrl: person.profilePhotoUrl, avatarInitials: person.avatarInitials }])) })
    }).catch(() => {
      // Fotos são opcionais: uma falha não deve impedir a seleção ou expor dados de outra sessão.
      if (!controller.signal.aborted) setState({ uid, profiles: {} })
    })
    return () => controller.abort()
  }, [uid])
  return people.map(person => {
    const profile = state.uid === uid ? state.profiles[person.id] : undefined
    return profile ? { ...person, ...profile } : person
  })
}
