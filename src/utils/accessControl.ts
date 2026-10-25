import { administrativeNavigationItems, navigationItems } from '../data/navigation'
import type { WebAccountType } from '../types/authentication'
import type { NavigationItem } from '../types/navigation'

const sharedPaths = new Set([
  '/mainHomeScreen', '/mainDashboardsScreen', '/mainEmployeerScreen', '/mainConformityScreen',
  '/mainUnitScreen', '/mainPositionScreen', '/mainFormScreen', '/mainEventScreen',
  '/mainFormScreen/responses', '/mainAccountScreen', '/mainWorkspaceSettingsScreen', '/createForms', '/editForms', '/loadingScreen',
].map(path => path.toLowerCase()))

const workspacePaths = new Set(['/mainManagerScreen'].map(path => path.toLowerCase()))
const workspaceFormPaths = new Set(['/includeCompanyInformation', '/attachExcelFile', '/setAddress', '/paymentMethod'].map(path => path.toLowerCase()))

export function hasWorkspaceAccess(accountType: WebAccountType | null | undefined): boolean {
  return accountType === 'GESTOR_WORKSPACE'
}

export function getDefaultAuthenticatedPath(accountType: WebAccountType): string {
  return accountType === 'ADMIN' ? '/admin/nrs/pending' : '/mainHomeScreen'
}

export function canAccessPage(accountType: WebAccountType | null | undefined, pathname: string, search = '', nrDevelopmentPreview = false): boolean {
  const path = pathname.replace(/\/+$/, '').toLowerCase()
  if (/^\/admin\/nrs\/(pending|catalog)(\/[^/]+)?$/.test(path)) {
    return accountType === 'ADMIN' || (nrDevelopmentPreview && (accountType === 'GESTOR' || accountType === 'GESTOR_WORKSPACE'))
  }
  if (accountType === 'ADMIN') return path === '/loadingscreen'
  if (accountType !== 'GESTOR' && accountType !== 'GESTOR_WORKSPACE') return false
  if (workspacePaths.has(path)) return hasWorkspaceAccess(accountType)
  if (workspaceFormPaths.has(path)) {
    return hasWorkspaceAccess(accountType) && new URLSearchParams(search).get('context') === 'settings'
  }
  return sharedPaths.has(path)
}

export function getNavigationItems(accountType: WebAccountType | null | undefined, items?: readonly NavigationItem[]): NavigationItem[] {
  if (accountType !== 'GESTOR' && accountType !== 'GESTOR_WORKSPACE' && accountType !== 'ADMIN') return []
  return (items ?? (accountType === 'ADMIN' ? administrativeNavigationItems : navigationItems))
    .filter(item => !item.path || canAccessPage(accountType, item.path))
}
