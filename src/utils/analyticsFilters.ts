import type { AnalyticsFilters } from '../types/dashboard'

export function validAnalyticsFilters(filters: AnalyticsFilters): boolean {
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
  const days = (Date.parse(filters.end) - Date.parse(filters.start)) / 86_400_000 + 1
  return validDate(filters.start) && validDate(filters.end) && days >= 1 && days <= 366
}
