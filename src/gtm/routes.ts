import { SCREENS } from './screens'
import type { TrackingScreen } from './track'

const screen = (nome_tela: string, contexto_tela: string): TrackingScreen => ({ nome_tela, contexto_tela })
export const ROUTE_SCREENS: Record<string, TrackingScreen | null> = {
  '/': screen(SCREENS.cadastro.name, SCREENS.cadastro.context.principal),
  '/paymentMethod': screen(SCREENS.cadastro.name, SCREENS.cadastro.context.pagamento),
  '/createWorkspace': screen(SCREENS.cadastro.name, SCREENS.cadastro.context.codigo),
  '/accessKeyVerified': screen(SCREENS.cadastro.name, SCREENS.cadastro.context.sucesso),
  '/createPassword': screen(SCREENS.workspace.name, SCREENS.workspace.context.principal),
  '/includeCompanyInformation': screen(SCREENS.workspace.name, SCREENS.workspace.context.dados),
  '/attachExcelFile': screen(SCREENS.workspace.name, SCREENS.workspace.context.documento),
  '/setAddress': screen(SCREENS.workspace.name, SCREENS.workspace.context.endereco),
  '/workspaceCreated': screen(SCREENS.workspace.name, SCREENS.workspace.context.resumo),
  '/mainHomeScreen': screen(SCREENS.home.name, SCREENS.home.context.home),
  '/mainDashboardsScreen': screen(SCREENS.home.name, SCREENS.home.context.dashboard),
  '/mainManagerScreen': screen(SCREENS.gestores.name, SCREENS.gestores.context.gestor),
  '/mainEmployeerScreen': screen(SCREENS.colaboradores.name, SCREENS.colaboradores.context),
  '/mainConformityScreen': screen(SCREENS.conformidade.name, SCREENS.conformidade.context),
  '/mainUnitScreen': screen(SCREENS.unidade.name, SCREENS.unidade.context),
  '/mainPositionScreen': screen(SCREENS.cargo.name, SCREENS.cargo.context),
  '/mainFormScreen': screen(SCREENS.formulario.name, SCREENS.formulario.context.principal),
  '/createForms': screen(SCREENS.formulario.name, SCREENS.formulario.context.criar),
  '/editForms': screen(SCREENS.formulario.name, SCREENS.formulario.context.editar),
  '/mainEventScreen': screen(SCREENS.evento.name, SCREENS.evento.context.calendario),
  '/mainWorkspaceSettingsScreen': screen(SCREENS.configuracoes.name, SCREENS.configuracoes.context.principal),
  '/mainAccountScreen': screen(SCREENS.configuracoes.name, SCREENS.configuracoes.context.context),
  '/inactiveScreenLayout': screen(SCREENS.erros.name, SCREENS.erros.context.inativo),
  '/erroScreenLayout': screen(SCREENS.erros.name, SCREENS.erros.context.encontro),
  // Estados transitórios não são uma tela do catálogo.
  '/loadingScreen': null,
}
const SETTINGS_CONTEXTS: Record<string, string> = {
  '/includeCompanyInformation': SCREENS.configuracoes.context.dados,
  '/attachExcelFile': SCREENS.configuracoes.context.documento,
  '/setAddress': SCREENS.configuracoes.context.endereco,
  '/paymentMethod': SCREENS.cadastro.context.pagamento,
}

export function resolveScreen(pathname: string, search = ''): TrackingScreen | null {
  if (pathname === '/loadingScreen' && new URLSearchParams(search).get('context') === 'registration') {
    return screen(SCREENS.erros.name, SCREENS.erros.context.cadastro)
  }
  if (new URLSearchParams(search).get('context') === 'settings' && SETTINGS_CONTEXTS[pathname]) {
    return screen(SCREENS.configuracoes.name, SETTINGS_CONTEXTS[pathname])
  }
  return Object.hasOwn(ROUTE_SCREENS, pathname) ? ROUTE_SCREENS[pathname] : screen(SCREENS.erros.name, SCREENS.erros.context.encontro)
}
