import { useLayoutEffect } from 'react'
import { beginActionLoading } from '../../utils/actionFeedback'

interface ActionLoadingProps { active?: boolean }
function ActionLoading({ active = true }: ActionLoadingProps) {
  useLayoutEffect(() => active ? beginActionLoading() : undefined, [active])
  return null
}
export default ActionLoading
