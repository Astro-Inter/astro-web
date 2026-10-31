import { HelpLink } from '../../components'
import WorkspaceQueryFeedback from '../../components/workspaceQueryFeedback'
import WorkspaceSettingsBackButton from '../../components/workspaceSettingsBackButton'
import { useWorkspaceQuery } from '../../hooks/useWorkspaceQuery'
import { listUnitAddresses } from '../../services/units'
import WorkspaceAddressEditor from '../../components/workspaceAddressEditor'

function WorkspaceAddressSettingsPage() {
  const query = useWorkspaceQuery(listUnitAddresses)
  return <main data-track-page={true} className="set-address-page" aria-busy={query.loading} inert={query.loading}>
    {!query.data && <WorkspaceSettingsBackButton screen="backAdressesModalWeb" />}
    <WorkspaceQueryFeedback loading={query.loading} error={query.error} onRetry={query.retry} />
    {query.data && <WorkspaceAddressEditor units={query.data} />}
    <HelpLink />
  </main>
}

export default WorkspaceAddressSettingsPage
