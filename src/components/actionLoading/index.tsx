import { useEffect } from 'react'
import { beginActionLoading } from '../../utils/actionFeedback'

interface ActionLoadingProps { active?: boolean }
function ActionLoading({ active = true }: ActionLoadingProps) {
  useEffect(() => active ? beginActionLoading() : undefined, [active])
  return null
}
export default ActionLoading
