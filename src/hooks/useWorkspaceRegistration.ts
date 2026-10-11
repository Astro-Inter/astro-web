import { useContext } from 'react'
import { WorkspaceRegistrationContext } from '../contexts/workspaceRegistration'

export function useWorkspaceRegistration() {
  const context = useContext(WorkspaceRegistrationContext)
  if (!context) throw new Error('Use WorkspaceRegistrationProvider para acessar o cadastro.')
  return context
}
