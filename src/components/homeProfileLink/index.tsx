import { Link } from 'react-router-dom'
import { BUTTONS } from '../../gtm/buttons'
import CollaboratorIdentity from '../collaboratorIdentity'
import AstroIcon from '../astroIcon'

interface HomeProfileLinkProps {
  name: string
  photoUrl?: string | null
  loading: boolean
  error?: string
}

function HomeProfileLink({ name, photoUrl, loading, error = '' }: HomeProfileLinkProps) {
  return <div className="home-profile-access"><Link aria-label="Minha conta" aria-busy={loading} className="home-profile-link" data-track-action={BUTTONS.home.conta} to="/mainAccountScreen" title={name ? 'Minha conta — ' + name : 'Minha conta'}>
    {loading ? <span aria-hidden="true" className="api-skeleton home-profile-skeleton" />
      : name ? <CollaboratorIdentity key={name} large name={name} photoUrl={photoUrl ?? null} initials={null} />
        : <AstroIcon name="account" />}
  </Link>
  {error && <span className="home-profile-error" role="status">Foto indisponível</span>}
  </div>
}

export default HomeProfileLink
