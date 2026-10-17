import type { NavigationItem } from '../types/navigation'

export const navigationItems: readonly NavigationItem[] = [
  { label: 'Home', icon: 'home', path: '/mainHomeScreen' },
  { label: 'Gestores', icon: 'managers', path: '/mainManagerScreen' },
  { label: 'Colaboradores', icon: 'collaborators', path: '/mainEmployeerScreen' },
  { label: 'Conformidade', icon: 'compliance', path: '/mainConformityScreen' },
  { label: 'Unidades', icon: 'building', path: '/mainUnitScreen' },
  { label: 'Cargos', icon: 'position', path: '/mainPositionScreen' },
  { label: 'Formulários', icon: 'document', path: '/mainFormScreen' },
  { label: 'Eventos', icon: 'event-calendar', path: '/mainEventScreen' },
  { label: 'Configurações', icon: 'settings', path: '/mainWorkspaceSettingsScreen', alignBottom: true },
]
