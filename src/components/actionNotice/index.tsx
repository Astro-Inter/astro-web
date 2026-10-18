import { useEffect, useRef } from 'react'
import { notifyAction } from '../../utils/actionFeedback'

interface ActionNoticeProps { message?: string }
function ActionNotice({ message }: ActionNoticeProps) {
  const announced = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (message && message !== announced.current) notifyAction(message)
    announced.current = message
  }, [message])
  return null
}
export default ActionNotice
