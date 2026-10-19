import { navigationItems } from '../data/navigation'
import type { WebAccountType } from '../types/authentication'
import type { NavigationItem } from '../types/navigation'

const sharedPaths = new Set([
  '/mainHomeScreen', '/mainDashboardsScreen', '/mainEmployeerScreen', '/mainConformityScreen',
  '/mainUnitScreen', '/mainPositionScreen', '/mainFormScreen', '/mainEventScreen',
  '/mainAccountScreen', '/mainWorkspaceSettingsScreen', '/createForms', '/editForms', '/loadingScreen',
].map(path => path.toLowerCase()))

const workspacePaths = new Set(['/mainManagerScreen'].map(path => path.toLowerCase()))
const workspaceFormPaths = new Set(['/includeCompanyInformation', '/attachExcelFile', '/setAddress', '/paymentMethod'].map(path => path.toLowerCase()))

export function hasWorkspaceAccess(accountType: WebAccountType | null | undefined): boolean {
  return accountType === 'GESTOR_WORKSPACE'
}

export function canAccessPage(accountType: WebAccountType | null | undefined, pathname: string, search = ''): boolean {
  if (accountType !== 'GESTOR' && accountType !== 'GESTOR_WORKSPACE') return false
  const path = pathname.replace(/\/+$/, '').toLowerCase()
  if (workspacePaths.has(path)) return hasWorkspaceAccess(accountType)
  if (workspaceFormPaths.has(path)) {
    return hasWorkspaceAccess(accountType) && new URLSearchParams(search).get('context') === 'settings'
  }
  return sharedPaths.has(path)
}

export function getNavigationItems(accountType: WebAccountType | null | undefined, items = navigationItems): NavigationItem[] {
  if (accountType !== 'GESTOR' && accountType !== 'GESTOR_WORKSPACE') return []
  return items.filter(item => !item.path || canAccessPage(accountType, item.path))
}
