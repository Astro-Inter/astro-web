import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLogout } from '../../hooks/useLogout'
import AstroBrand from '../astroBrand'
import AstroIcon from '../astroIcon'
import ConfirmationModal from '../confirmationModal'

export default function AdminHeader() {
  const logout = useLogout()
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  return <>
    <header className="nr-admin-header astro-scale-90">
      <div className="nr-admin-header-content">
        <Link to="/admin/nrs/pending" className="nr-admin-brand" aria-label="Astro — revisão de NRs"><AstroBrand /></Link>
        <button type="button" className="nr-admin-account" aria-haspopup="dialog" aria-expanded={confirmingLogout} onClick={() => setConfirmingLogout(true)}>
          <AstroIcon name="logout" />
          <span>Sair da conta</span>
        </button>
      </div>
    </header>
    {confirmingLogout && <ConfirmationModal title="Tem certeza que deseja sair da conta?" confirmLabel="Sair" backdrop="dimmed" onCancel={() => setConfirmingLogout(false)} onConfirm={async () => { await logout.submit(); return null }} onConfirmed={() => setConfirmingLogout(false)} />}
    {logout.error && <p className="nr-admin-session-error" role="alert">{logout.error}</p>}
  </>
}
