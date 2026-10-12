import { useEffect, useRef, useState } from 'react'
import { useAuthentication } from './useAuthentication'
import { listUnits, listUnitNrs, listUnitNrOptions, toggleUnitStatus, updateUnitNrs } from '../services/units'
import type { Unit } from '../types/unit'
import type { NrsRow } from '../types/regulatoryStandards'
import type { UnitNrOptionResponse } from '../types/unit'

interface UnitsState {
  key: string
  units: Unit[]
  loading: boolean
  error: string
  saving: boolean
}
interface NrsState {
  key: string
  rows: NrsRow[]
  options: UnitNrOptionResponse[]
  loading: boolean
  error: string
}
function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação. Tente novamente.'
}
interface UnitsResult extends Omit<UnitsState, 'key'> {
  nrs: NrsState
  toggle: (id: string) => Promise<string | null>
  saveNrs: (id: string, enabledIds: string[]) => Promise<string | null>
  retry: () => void
  retryNrs: () => void
}

export function useUnits(unitId?: string): UnitsResult {
  const { user } = useAuthentication()
  const uid = user?.uid
  const [state, setState] = useState<UnitsState>({ key: '', units: [], loading: true, error: '', saving: false })
  const [storedNrs, setNrs] = useState<NrsState>({ key: '', rows: [], options: [], loading: true, error: '' })
  const [retries, setRetries] = useState({ units: 0, nrs: 0 })
  const unitsKey = `${uid ?? ''}/${retries.units}`
  const nrsKey = `${uid ?? ''}/${unitId ?? ''}/${retries.nrs}`
  const nrs: NrsState = storedNrs.key === nrsKey ? storedNrs : { key: nrsKey, rows: [], options: [], loading: true, error: '' }
  const busy = useRef(false)
  const mounted = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  useEffect(() => {
    const controller = new AbortController()
    if (!uid) return () => controller.abort()
    listUnits(controller.signal).then((units) => {
      if (!controller.signal.aborted) setState((current) => ({ ...current, key: unitsKey, units, loading: false, error: '' }))
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState((current) => ({ ...current, key: unitsKey, units: [], loading: false, error: message(error) }))
    })
    return () => controller.abort()
  }, [uid, unitsKey])

  useEffect(() => {
    const controller = new AbortController()
    if (!unitId || !uid) return () => controller.abort()
    Promise.all([listUnitNrs(unitId, controller.signal), listUnitNrOptions(unitId, controller.signal)]).then(([linked, options]) => {
      if (!controller.signal.aborted) setNrs({
        key: nrsKey,
        rows: linked.map((row) => ({ id: String(row.nr), code: `NR ${row.nr}`, description: row.descricao })),
        options, loading: false, error: '',
      })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setNrs({ key: nrsKey, rows: [], options: [], loading: false, error: message(error) })
    })
    return () => controller.abort()
  }, [unitId, uid, nrsKey])

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

  async function toggle(id: string): Promise<string | null> {
    return mutate(async () => {
      const active = await toggleUnitStatus(id)
      if (mounted.current) setState((current) => current.key === unitsKey ? { ...current, units: current.units.map((row) => row.id === id ? { ...row, active } : row) } : current)
    })
  }

  async function saveNrs(id: string, enabledIds: string[]): Promise<string | null> {
    if (nrs.loading || nrs.error || id !== unitId) return 'Carregue as NRs desta unidade antes de salvar.'
    if (enabledIds.some((nr) => !nrs.options.some((row) => String(row.nr) === nr))) return 'Seleção de NRs inválida.'
    return mutate(async () => {
      const enabled = new Set(enabledIds)
      const options = nrs.options.map((row) => ({ ...row, ativo: enabled.has(String(row.nr)) }))
      await updateUnitNrs(id, options.map(({ nr, ativo }) => ({ nr, ativo })))
      if (mounted.current) setNrs((current) => current.key === nrsKey ? { ...current, options, rows: options.filter((row) => row.ativo).map((row) => ({ id: String(row.nr), code: `NR ${row.nr}`, description: row.descricao })) } : current)
    })
  }

  return { ...state, units: state.key === unitsKey ? state.units : [], loading: state.key !== unitsKey || state.loading, error: state.key === unitsKey ? state.error : '', nrs, toggle, saveNrs,
    retry: () => setRetries((current) => ({ ...current, units: current.units + 1 })),
    retryNrs: () => setRetries((current) => ({ ...current, nrs: current.nrs + 1 })),
  }
}
