const pageNames: Record<string, string> = {
  '/': 'Login',
  '/forgotPassword': 'Esqueci minha senha',
  '/passwordRecoverySent': 'E-mail enviado',
  '/replacePassword': 'Alterar senha',
  '/passwordChanged': 'Senha alterada',
  '/createWorkspace': 'Criar workspace',
  '/accessKeyVerified': 'Chave de acesso verificada',
  '/createPassword': 'Criar senha',
  '/includeCompanyInformation': 'Dados da empresa',
  '/attachExcelFile': 'Importar colaboradores',
  '/setAddress': 'Endereço da empresa',
  '/paymentMethod': 'Pagamento',
  '/workspaceCreated': 'Workspace criado',
  '/loadingScreen': 'Carregando',
  '/mainHomeScreen': 'Início',
  '/mainDashboardsScreen': 'Indicadores',
  '/mainManagerScreen': 'Gestores',
  '/mainEmployeerScreen': 'Colaboradores',
  '/mainUnitScreen': 'Unidades',
  '/mainConformityScreen': 'Conformidades',
  '/mainPositionScreen': 'Cargos',
  '/mainFormScreen': 'Formulários',
  '/mainFormScreen/responses': 'Respostas do formulário',
  '/mainEventScreen': 'Eventos',
  '/mainWorkspaceSettingsScreen': 'Configurações do workspace',
  '/mainAccountScreen': 'Minha conta',
  '/createForms': 'Criar formulário',
  '/editForms': 'Editar formulário',
  '/erroScreenLayout': 'Não foi possível acessar sua conta',
  '/inactiveScreenLayout': 'Usuário inativado',
}

export function getPageTitle(pathname: string, search: string): string {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/admin/nrs/pending') return 'Revisão de NRs'
  if (path === '/admin/nrs/catalog') return 'Catálogo atual de NRs'
  if (path.startsWith('/admin/nrs/pending/')) return 'Revisão individual de NR'
  const name = path === '/loadingScreen' && new URLSearchParams(search).get('context') === 'registration'
    ? 'Criando workspace'
    : pageNames[path] ?? 'Página não encontrada'
  return name
}
