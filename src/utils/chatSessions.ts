import type { ChatSessionGroup, ChatSessionSummary } from '../types/chat'

function calendarDay(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
}

function sessionGroupLabel(value: string, now: Date): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sem data'

  const daysAgo = (calendarDay(now) - calendarDay(date)) / 86_400_000
  if (daysAgo === 0) return 'Hoje'
  if (daysAgo === 1) return 'Ontem'
  if (daysAgo > 1 && daysAgo < 7) return 'Últimos 7 dias'
  if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) return 'Neste mês'

  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
}

export function groupChatSessions(sessions: readonly ChatSessionSummary[], now = new Date()): ChatSessionGroup[] {
  const groups = new Map<string, ChatSessionGroup>()
  for (const session of sessions) {
    const label = sessionGroupLabel(session.updated_at, now)
    const group = groups.get(label)
    if (group) group.sessions.push(session)
    else groups.set(label, { label, sessions: [session] })
  }
  return [...groups.values()]
}

export function formatChatSessionDate(value: string): { label: string; full: string } | null {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return {
    label: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date),
    full: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(date),
  }
}
