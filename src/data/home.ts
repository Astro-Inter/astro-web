import type { ComplianceOverview, QuickAction, SummaryStat } from '../types/home'

export const mockUserName = 'Kirk Hammett'

export const mockComplianceOverview: ComplianceOverview = {
  overallPercentage: 92,
  slices: [
    { status: 'compliant', label: 'Conformes', percentage: 88.5 },
    { status: 'expiring', label: 'Próximos do vencimento', percentage: 8.5 },
    { status: 'expired', label: 'Vencidos', percentage: 3 },
  ],
}

export const mockSummaryStats: SummaryStat[] = [
  { id: 'units', label: 'Unidades', value: 4, icon: 'building' },
  { id: 'collaborators', label: 'Colaboradores', value: 248, icon: 'collaborators' },
]

export const quickActions: QuickAction[] = [
  { id: 'add-collaborator', title: 'Adicionar colaborador', description: 'Cadastre um novo colaborador.', actionLabel: 'Adicionar colaborador', icon: 'person-plus', color: 'pink' },
  { id: 'add-form', title: 'Adicionar formulário', description: 'Crie um novo formulário de inspeção.', actionLabel: 'Adicionar formulário', icon: 'document-lines', color: 'green', path: '/createForms' },
  { id: 'add-event', title: 'Adicionar evento', description: 'Crie um novo evento no calendário.', actionLabel: 'Adicionar evento', icon: 'event-calendar', color: 'blue' },
]
