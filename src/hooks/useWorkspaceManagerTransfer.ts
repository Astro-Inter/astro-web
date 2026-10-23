import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listManagers } from '../services/managers'
import { transferWorkspaceManager } from '../services/workspaceSettings'
import { useWorkspaceQuery } from './useWorkspaceQuery'
import { useAuthentication } from './useAuthentication'
import { notifyAction } from '../utils/actionFeedback'

export function useWorkspaceManagerTransfer() {
  const query = useWorkspaceQuery(listManagers)
  const [selectedId, setSelectedId] = useState('')
  const [submission, setSubmission] = useState({ pending: false, error: '' })
  const busy = useRef(false)
  const { retryAuthentication } = useAuthentication()
  const navigate = useNavigate()
  const managers = query.data?.filter(manager => manager.status === 'ATIVO') ?? []
  async function save(id: string): Promise<string | null> {
    if (busy.current) return 'Aguarde a transferência em andamento.'
    if (!managers.some(manager => manager.id === id)) return 'Selecione outro gestor ativo.'
    busy.current = true
    setSelectedId(id)
    setSubmission({ pending: true, error: '' })
    try {
      await transferWorkspaceManager(id)
      complete()
      return null
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Não foi possível transferir a responsabilidade.'
      setSubmission({ pending: false, error: message })
      return message
    } finally { busy.current = false }
  }
  function complete() {
    // Revalidating authentication unmounts private routes and their administrative data.
    // The new route reloads account details and authorization from the API.
    retryAuthentication()
    navigate('/mainHomeScreen', { replace: true })
    notifyAction('Responsabilidade transferida. Atualizando seu perfil e suas permissões.')
  }
  return { ...query, managers, selectedId, submission, save, editSelection: () => setSubmission({ pending: false, error: '' }) }
}
