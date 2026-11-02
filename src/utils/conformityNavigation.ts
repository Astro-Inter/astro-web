import type { ComplianceStatus } from '../types/home'
import type { ConformityListFilters } from '../types/conformity'
import { conformityStatusLabels, emptyConformityFilters, isConformityDate, isConformityOrigin } from './conformity'

export function homeConformityPath(status: ComplianceStatus, referenceDate: string): string {
  const params = new URLSearchParams()
  if (status === 'expired') params.set('validity', 'expired')
  else if (status === 'pending') params.set('validity', 'no-expiry')
  else if (isConformityDate(referenceDate)) {
    const limit = new Date(`${referenceDate}T12:00:00Z`)
    limit.setUTCDate(limit.getUTCDate() + (status === 'compliant' ? 31 : 30))
    params.set('validity', 'valid')
    params.set('from', status === 'compliant' ? limit.toISOString().slice(0, 10) : referenceDate)
    if (status === 'expiring') params.set('to', limit.toISOString().slice(0, 10))
  }
  return `/mainConformityScreen${params.size ? `?${params}` : ''}`
}

export function readConformityListFilters(params: URLSearchParams): ConformityListFilters {
  const filters: ConformityListFilters = { ...emptyConformityFilters, search: params.get('search') ?? '' }
  const validity = params.get('validity') ?? ''
  if (Object.hasOwn(conformityStatusLabels, validity)) filters.validity = validity as ConformityListFilters['validity']
  const origin = params.get('origin') ?? ''
  if (isConformityOrigin(origin)) filters.origin = origin
  const nr = params.get('nr') ?? ''
  if (/^NR [1-9]\d*$/.test(nr)) filters.nr = nr
  for (const key of ['from', 'to'] as const) {
    const value = params.get(key) ?? ''
    if (isConformityDate(value)) filters[key] = value
  }
  if (filters.from && filters.to && filters.from > filters.to) { filters.from = ''; filters.to = '' }
  return filters
}
