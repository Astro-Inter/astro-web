import { createContext } from 'react'
import type { WorkspaceRegistrationContextValue } from '../types/workspaceRegistration'

export const WorkspaceRegistrationContext = createContext<WorkspaceRegistrationContextValue | null>(null)
