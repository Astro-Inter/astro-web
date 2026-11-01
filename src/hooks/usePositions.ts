import { validateNrSelection } from '../utils/nrSelection'
import { useEffect, useRef, useState } from 'react'
import { useAuthentication } from './useAuthentication'
import { createRole, listRoles, listRoleNrs, listRoleNrOptions, updateRole, toggleRoleStatus, updateRoleNrs } from '../services/roles'
import type { Position, PositionFormValues } from '../types/position'
import type { NrsRow } from '../types/regulatoryStandards'
import type { RoleNrOptionResponse } from '../types/role'

interface PositionsState {
  key: string
  positions: Position[]
  loading: boolean
  error: string
  saving: boolean
}
interface NrsState {
  key: string
  rows: NrsRow[]
  options: RoleNrOptionResponse[]
  loading: boolean
  error: string
}
function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação. Tente novamente.'
}
interface PositionsResult extends Omit<PositionsState, 'key'> {
  nrs: NrsState
  save: (values: PositionFormValues, id?: string) => Promise<string | null>
  toggle: (id: string) => Promise<string | null>
  saveNrs: (id: string, enabledIds: string[]) => Promise<string | null>
  retry: () => void
  retryNrs: () => void
}

export function usePositions(roleId?: string): PositionsResult {
  const { user } = useAuthentication()
  const uid = user?.uid
  const [state, setState] = useState<PositionsState>({ key: '', positions: [], loading: true, error: '', saving: false })
  const [storedNrs, setNrs] = useState<NrsState>({ key: '', rows: [], options: [], loading: true, error: '' })
  const [retries, setRetries] = useState({ roles: 0, nrs: 0 })
  const rolesKey = `${uid ?? ''}/${retries.roles}`
  const nrsKey = `${uid ?? ''}/${roleId ?? ''}/${retries.nrs}`
  const nrs: NrsState = storedNrs.key === nrsKey ? storedNrs : { key: nrsKey, rows: [], options: [], loading: true, error: '' }
  const busy = useRef(false)
  const mounted = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  useEffect(() => {
    const controller = new AbortController()
    if (!uid) return () => controller.abort()
    listRoles(controller.signal).then((positions) => {
      if (!controller.signal.aborted) setState((current) => ({ ...current, key: rolesKey, positions, loading: false, error: '' }))
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState((current) => ({ ...current, key: rolesKey, positions: [], loading: false, error: message(error) }))
    })
    return () => controller.abort()
  }, [uid, rolesKey])

  useEffect(() => {
    const controller = new AbortController()
    if (!roleId || !uid) return () => controller.abort()
    Promise.all([listRoleNrs(roleId, controller.signal), listRoleNrOptions(roleId, controller.signal)]).then(([linked, options]) => {
      if (!controller.signal.aborted) setNrs({
        key: nrsKey,
        rows: linked.map((row) => ({ id: String(row.nrCode), code: `NR ${row.nrCode}`, description: row.description })),
        options, loading: false, error: '',
      })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setNrs({ key: nrsKey, rows: [], options: [], loading: false, error: message(error) })
    })
    return () => controller.abort()
  }, [roleId, uid, nrsKey])

  async function mutate(operation: () => Promise<void>): Promise<string | null> {
    if (busy.current) return 'Aguarde a operação em andamento.'
    busy.current = true
    setState((current) => ({ ...current, saving: true }))
    try {
      await operation()
      return null
    } catch (error: unknown) {
      return message(error)
    } finally {
      busy.current = false
      if (mounted.current) setState((current) => ({ ...current, saving: false }))
    }
  }

  async function save(values: PositionFormValues, id?: string): Promise<string | null> {
    return mutate(async () => {
      if (id) {
        const position = await updateRole(id, values)
        if (mounted.current) setState((current) => ({ ...current, positions: current.positions.map((row) => row.id === id ? position : row) }))
      } else {
        await createRole(values)
        // A criação retorna void; uma falha na recarga não deve permitir criar o cargo duas vezes.
        try {
          const positions = await listRoles()
          if (mounted.current) setState((current) => ({ ...current, positions, error: '' }))
        } catch (error: unknown) {
          if (mounted.current) setState((current) => ({ ...current, error: `Cargo criado. Não foi possível atualizar a lista: ${message(error)}` }))
        }
      }
    })
  }

  async function toggle(id: string): Promise<string | null> {
    return mutate(async () => {
      const active = await toggleRoleStatus(id)
      if (mounted.current) setState((current) => ({ ...current, positions: current.positions.map((row) => row.id === id ? { ...row, active } : row) }))
    })
  }

  async function saveNrs(id: string, enabledIds: string[]): Promise<string | null> {
    return mutate(async () => {
      const enabled = new Set(enabledIds)
      const options = nrs.options.map((row) => ({ ...row, active: enabled.has(String(row.nr)) }))
      const selection = options.map(({ nr, active }) => ({ nr, active }))
      const validationError = validateNrSelection(selection)
      if (validationError) throw new Error(validationError)
      await updateRoleNrs(id, selection)
      if (mounted.current) setNrs((current) => ({ ...current, options, rows: options.filter((row) => row.active).map((row) => ({ id: String(row.nr), code: `NR ${row.nr}`, description: row.description })) }))
    })
  }

  return { ...state, positions: state.key === rolesKey ? state.positions : [], loading: state.key !== rolesKey || state.loading, error: state.key === rolesKey ? state.error : '', nrs, save, toggle, saveNrs,
    retry: () => setRetries((current) => ({ ...current, roles: current.roles + 1 })),
    retryNrs: () => setRetries((current) => ({ ...current, nrs: current.nrs + 1 })),
  }
}
