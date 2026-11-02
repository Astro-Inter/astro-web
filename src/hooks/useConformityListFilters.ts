import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ConformityListFilters } from '../types/conformity'
import { readConformityListFilters } from '../utils/conformityNavigation'

export function useConformityListFilters(): readonly [ConformityListFilters, Dispatch<SetStateAction<ConformityListFilters>>] {
  const [params, setParams] = useSearchParams()
  const setFilters = useCallback<Dispatch<SetStateAction<ConformityListFilters>>>(update => {
    setParams(current => {
      const filters = typeof update === 'function' ? update(readConformityListFilters(current)) : update
      const next = new URLSearchParams(current)
      for (const key of ['validity', 'nr', 'origin', 'from', 'to', 'search'] as const) {
        if (filters[key]) next.set(key, filters[key]); else next.delete(key)
      }
      return next
    }, { replace: true })
  }, [setParams])
  return [readConformityListFilters(params), setFilters]
}
