import { Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'

const workspaceScreens = new Set(['/mainHomeScreen', '/mainManagerScreen', '/mainEmployeerScreen', '/mainUnitScreen', '/mainConformityScreen', '/mainPositionScreen', '/mainFormScreen', '/mainEventScreen', '/mainWorkspaceSettingsScreen', '/mainAccountScreen', '/admin/nrs/catalog', '/admin/nrs/pending'])

function RouteContent() {
  const location = useLocation()
  const [arrivingFromLogout] = useState(() => document.documentElement.classList.contains('logout-transition'))
  const state: unknown = location.state
  const logoutTransition = arrivingFromLogout && location.pathname === '/' && typeof state === 'object' && state !== null && 'logoutTransition' in state && state.logoutTransition === true
  const planet = location.pathname === '/loadingScreen' && new URLSearchParams(location.search).get('context') !== 'registration'
  const workspace = workspaceScreens.has(location.pathname) || location.pathname.startsWith('/admin/nrs/pending/')
  return <div className={`astro-route-content${workspace ? ' astro-route-content--workspace' : ''}${logoutTransition ? ' astro-route-content--logout' : ''}${planet ? ' astro-route-content--planet' : ''}`}><Outlet /></div>
}

export default RouteContent
