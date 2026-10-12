import type { QuickAction } from '../types/home'

export const quickActions: QuickAction[] = [
  { id: 'add-collaborator', title: 'Adicionar colaborador', description: 'Cadastre um novo colaborador.', actionLabel: 'Adicionar colaborador', icon: 'person-plus', color: 'pink', path: '/mainEmployeerScreen' },
  { id: 'add-form', title: 'Adicionar formulário', description: 'Crie um novo formulário de inspeção.', actionLabel: 'Adicionar formulário', icon: 'document-lines', color: 'green', path: '/createForms' },
  { id: 'add-event', title: 'Adicionar evento', description: 'Crie um novo evento no calendário.', actionLabel: 'Adicionar evento', icon: 'event-calendar', color: 'blue', path: '/mainEventScreen' },
]
