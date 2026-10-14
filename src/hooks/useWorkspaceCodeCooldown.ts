import { useEffect, useState } from 'react'
import { getWorkspaceCodeWait, subscribeWorkspaceCodeWait } from '../utils/workspaceCodeCooldown'

export function useWorkspaceCodeCooldown(email: string): number {
  const [seconds, setSeconds] = useState(() => getWorkspaceCodeWait(email))
  useEffect(() => {
    const update = () => setSeconds(getWorkspaceCodeWait(email))
    update()
    const unsubscribe = subscribeWorkspaceCodeWait(update)
    const timer = window.setInterval(update, 1000)
    return () => { unsubscribe(); window.clearInterval(timer) }
  }, [email])
  return seconds
}
