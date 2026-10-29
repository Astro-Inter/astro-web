import { loadAnalyticsIdentity } from './dashboards'
import { loadSavedDashboards } from './dashboardStorage'
import type { AnalyticsIdentity, SavedDashboard } from '../types/dashboard'

export interface DashboardEntry { uid: string; identity: AnalyticsIdentity; saved: SavedDashboard[] }

export async function loadDashboardEntry(uid: string, signal: AbortSignal): Promise<DashboardEntry> {
  const identity = await loadAnalyticsIdentity(signal)
  const saved = await loadSavedDashboards(identity, signal)
  return { uid, identity, saved }
}
