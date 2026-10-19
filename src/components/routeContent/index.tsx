import { Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'

function RouteContent() {
  const location = useLocation()
  const [arrivingFromLogout] = useState(() => document.documentElement.classList.contains('logout-transition'))
  const state: unknown = location.state
  const logoutTransition = arrivingFromLogout && location.pathname === '/' && typeof state === 'object' && state !== null && 'logoutTransition' in state && state.logoutTransition === true
  const planet = location.pathname === '/loadingScreen' && new URLSearchParams(location.search).get('context') !== 'registration'
  return <div className={`astro-route-content${logoutTransition ? ' astro-route-content--logout' : ''}${planet ? ' astro-route-content--planet' : ''}`}><Outlet /></div>
}

export default RouteContent
