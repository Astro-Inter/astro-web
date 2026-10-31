import { useEffect, useState } from 'react'
import AnalyticsPageLayout from '../../components/analyticsPageLayout'
import DashboardGallery from '../../components/dashboardGallery'
import PurpleButton from '../../components/purpleButton'
import { useAuthentication } from '../../hooks/useAuthentication'
import { loadDashboardEntry } from '../../services/dashboardEntry'
import type { AnalyticsIdentity, SavedDashboard } from '../../types/dashboard'

import WorkspaceDashboards from '../workspaceDashboards'

export default function MainDashboardsScreenPage() {
  const { user } = useAuthentication()
  const uid = user?.uid || ''
  const [attempt, setAttempt] = useState(0)
  const key = `${uid}/${attempt}`
  const [access, setAccess] = useState<{ key: string; identity?: AnalyticsIdentity; saved?: SavedDashboard[]; error?: string }>({ key: '' })
  useEffect(() => {
    const controller = new AbortController()
    if (uid) loadDashboardEntry(uid, controller.signal).then(entry => { if (!controller.signal.aborted) setAccess({ key, identity: entry.identity, saved: entry.saved }) }).catch((error: unknown) => { if (!controller.signal.aborted) setAccess({ key, error: error instanceof Error ? error.message : 'Não foi possível abrir seus dashboards.' }) })
    return () => controller.abort()
  }, [uid, key])
  const identity = access.key === key ? access.identity : undefined, error = access.key === key ? access.error : undefined
  if (!identity && !error) return <AnalyticsPageLayout>
    <header className="analytics-heading"><div><h1 id="dashboards-title">Dashboards</h1></div></header>
    <DashboardGallery items={[]} loading busy onOpen={() => {}} onCreate={() => {}} onDelete={() => {}} onCustomize={() => {}} />
  </AnalyticsPageLayout>
  if (identity) return <WorkspaceDashboards key={`${uid}/${identity.userId}/${identity.workspaceId}`} identity={identity} initialSaved={access.saved} />
  return <AnalyticsPageLayout>
    <header className="analytics-heading"><div><h1 id="dashboards-title">Dashboards</h1><p>Indicadores e visões da sua equipe.</p></div></header>
    <section className="create-forms-card analytics-feedback"><h2>Não foi possível abrir o dashboard</h2><p role="alert">{error}</p><PurpleButton type="button" onClick={() => setAttempt(n => n + 1)}>Tentar novamente</PurpleButton></section>
  </AnalyticsPageLayout>
}
