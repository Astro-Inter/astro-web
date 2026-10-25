import { useEffect, useRef, useState } from 'react'
import { getWorkspace, updateWorkspace } from '../services/workspaceSettings'
import { useWorkspaceQuery } from './useWorkspaceQuery'
import type { CompanyInformation } from '../types/company'

export function useWorkspaceCompany() {
  const query = useWorkspaceQuery(getWorkspace)
  const [company, setCompany] = useState<CompanyInformation | null>(null)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  async function save(): Promise<string | null> {
    if (!company) return 'Preencha as informações da empresa.'
    if (request.current) return 'Aguarde a gravação em andamento.'
    const controller = new AbortController()
    request.current = controller
    try {
      const saved = await updateWorkspace(company, controller.signal)
      controller.signal.throwIfAborted()
      setCompany(saved)
      return null
    } catch (error: unknown) { return error instanceof Error ? error.message : 'Não foi possível salvar a empresa.' }
    finally { if (request.current === controller) request.current = null }
  }
  const hasChanges = Boolean(company && query.data && (
    company.name.trim() !== query.data.name.trim()
    || company.cnpj.replace(/\D/g, '') !== query.data.cnpj.replace(/\D/g, '')
  ))
  return { ...query, company: company ?? query.data, hasChanges, setCompany, save }
}
