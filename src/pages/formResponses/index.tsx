import { useSearchParams } from 'react-router-dom'
import FormResponsesContent from '../formResponsesContent'
function FormResponsesPage() {
  const [params] = useSearchParams()
  return <FormResponsesContent key={params.toString()} />
}
export default FormResponsesPage
