import PrivateRoute from '../privateRoute'
import { isNrReviewDemo } from '../../data/nrReviewMode'

// Local preview of mock screens. Authentication stays required in all builds.
export default function NrReviewRoute() {
  return <PrivateRoute nrDevelopmentPreview={isNrReviewDemo} />
}
