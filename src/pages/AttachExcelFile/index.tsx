import { useNavigate } from 'react-router-dom'
import { AttachExcelFileForm, HelpLink } from '../../components'

function AttachExcelFilePage() {
  const navigate = useNavigate()

  return (
    <main className="attach-excel-page">
      <AttachExcelFileForm onContinue={() => navigate('/setAddress')} />
      <HelpLink />
    </main>
  )
}

export default AttachExcelFilePage
