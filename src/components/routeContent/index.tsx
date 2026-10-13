import { Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'

function RouteContent() {
  const location = useLocation()
  const [arrivingFromLogout] = useState(() => document.documentElement.classList.contains('logout-transition'))
  const state: unknown = location.state
  const logoutTransition = arrivingFromLogout && location.pathname === '/' && typeof state === 'object' && state !== null && 'logoutTransition' in state && state.logoutTransition === true
  return <div className={`astro-route-content${logoutTransition ? ' astro-route-content--logout' : ''}`}><Outlet /></div>
}

export default RouteContent
